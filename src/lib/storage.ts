/**
 * Typed storage layer for extension settings with sync/local fallback and migration hooks.
 *
 * Schema (v1):
 * - settings: {
 *     defaultColor?: string;
 *     rules: Record<string, { enabled: boolean; color: string }>;
 *   }
 *
 * We prefer chrome.storage.sync when available and the payload fits within
 * QUOTA_BYTES_PER_ITEM for sync. Otherwise we transparently fall back to
 * chrome.storage.local. All operations are batched to a single read + single write.
 *
 * JSDoc example:
 *
 * const settings = await getSettings();
 * await updateRule('example.com', { enabled: true, color: '#FFEEAA' });
 * await removeRule('another.com');
 */

export type Rule = { enabled: boolean; color: string };
export type DomainSettings = Rule; // Back-compat alias used by popup code
export type Settings = {
  defaultColor?: string;
  rules: Record<string, Rule>;
};

export type StateV1 = {
  version: 1;
  settings: Settings;
};

type AnyState = StateV1;

const CURRENT_VERSION = 1 as const;
const STATE_KEY = 'state_v1';
const DEFAULT_COLOR = '#FFFFFF';
const SYNC_QUOTA_BYTES_PER_ITEM = 8192; // chrome.storage.sync QUOTA_BYTES_PER_ITEM

// In-memory fallback for tests or non-extension environments
const memoryStore = new Map<string, unknown>();

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isRule(v: unknown): v is Rule {
  return isObject(v) && typeof v.enabled === 'boolean' && typeof v.color === 'string';
}

function sanitizeHex(color: unknown): string {
  if (typeof color !== 'string') return DEFAULT_COLOR;
  let c = color.trim();
  if (!c.startsWith('#')) c = '#' + c;
  const short = /^#([0-9a-fA-F]{3})$/;
  const long = /^#([0-9a-fA-F]{6})$/;
  if (short.test(c)) {
    const m = c.slice(1);
    c = `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
  }
  if (long.test(c)) return c.toUpperCase();
  return DEFAULT_COLOR;
}

function sanitizeSettings(input: unknown): Settings {
  const out: Settings = { defaultColor: DEFAULT_COLOR, rules: {} };
  const obj = isObject(input) ? input : {};
  const dc = (obj as any).defaultColor;
  if (typeof dc === 'string') out.defaultColor = sanitizeHex(dc);
  const rules = (obj as any).rules;
  if (isObject(rules)) {
    for (const [k, v] of Object.entries(rules)) {
      if (!isRule(v)) continue;
      out.rules[k] = { enabled: !!v.enabled, color: sanitizeHex(v.color) };
    }
  }
  return out;
}

function defaultSettings(): Settings {
  return { defaultColor: DEFAULT_COLOR, rules: {} };
}

function toState(settings: Settings): StateV1 {
  return { version: CURRENT_VERSION, settings: sanitizeSettings(settings) };
}

// --- Migration utilities ---
function migrateToLatest(state: unknown): StateV1 {
  // Basic migration hook. Currently only v1 exists, so we coerce anything into v1.
  if (!isObject(state)) return toState(defaultSettings());
  const v = (state as any).version;
  if (v === 1 && isObject((state as any).settings)) {
    return { version: 1, settings: sanitizeSettings((state as any).settings) };
  }
  // Unknown shape -> coerce to v1 default
  return toState(defaultSettings());
}

// --- Low level storage helpers with sync -> local -> memory fallback ---
function hasChrome(): boolean {
  return typeof chrome !== 'undefined' && !!chrome?.storage;
}

function textSizeBytes(value: unknown): number {
  try {
    const json = JSON.stringify(value);
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).length : json.length;
  } catch {
    return 0;
  }
}

async function areaGet(area: 'sync' | 'local', key: string): Promise<unknown | undefined> {
  if (!hasChrome()) return memoryStore.get(`${area}:${key}`);
  const storageArea = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  return new Promise((resolve) => {
    try {
      storageArea.get([key], (res: Record<string, unknown>) => {
        if (chrome.runtime?.lastError) return resolve(undefined);
        resolve(res?.[key]);
      });
    } catch {
      resolve(undefined);
    }
  });
}

async function areaSet(area: 'sync' | 'local', key: string, value: unknown): Promise<boolean> {
  if (!hasChrome()) { memoryStore.set(`${area}:${key}`, value); return true; }
  const storageArea = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  return new Promise((resolve) => {
    try {
      storageArea.set({ [key]: value }, () => {
        if (chrome.runtime?.lastError) return resolve(false);
        resolve(true);
      });
    } catch {
      resolve(false);
    }
  });
}

async function areaRemove(area: 'sync' | 'local', key: string): Promise<void> {
  if (!hasChrome()) { memoryStore.delete(`${area}:${key}`); return; }
  const storageArea = area === 'sync' ? chrome.storage.sync : chrome.storage.local;
  return new Promise((resolve) => {
    try {
      storageArea.remove(key, () => resolve());
    } catch {
      resolve();
    }
  });
}

function choosePreferredAreaForValue(value: unknown): 'sync' | 'local' {
  // Prefer sync when available and the item size fits within per-item quota
  if (!hasChrome() || !chrome.storage?.sync) return 'local';
  const size = textSizeBytes(value);
  // Keep a small buffer to account for metadata
  const fits = size > 0 && size <= (SYNC_QUOTA_BYTES_PER_ITEM - 128);
  return fits ? 'sync' : 'local';
}

// Reads from sync first, then local, then memory
async function readState(): Promise<StateV1> {
  const fromSync = await areaGet('sync', STATE_KEY);
  if (fromSync) return migrateToLatest(fromSync);
  const fromLocal = await areaGet('local', STATE_KEY);
  if (fromLocal) return migrateToLatest(fromLocal);
  return toState(defaultSettings());
}

// Writes to preferred area based on size. If write to sync fails, fall back to local.
async function writeState(state: StateV1): Promise<void> {
  const preferred = choosePreferredAreaForValue(state);
  if (preferred === 'sync') {
    const ok = await areaSet('sync', STATE_KEY, state);
    if (ok) {
      // Clean up any local copy to free space
      await areaRemove('local', STATE_KEY);
      return;
    }
    // Fallback to local
  }
  await areaSet('local', STATE_KEY, state);
}

// --- Public API ---
/**
 * Get current settings (migrated to the latest schema).
 */
export async function getSettings(): Promise<Settings> {
  const state = await readState();
  return migrateToLatest(state).settings;
}

/**
 * Overwrite settings. Validates and migrates to latest version.
 */
export async function setSettings(next: Settings): Promise<Settings> {
  const state = toState(next);
  await writeState(state);
  return state.settings;
}

/**
 * Upsert a rule for a domain.
 */
export async function updateRule(domain: string, rule: Rule): Promise<Settings> {
  const current = await getSettings();
  const sanitized: Rule = { enabled: !!rule.enabled, color: sanitizeHex(rule.color) };
  const next: Settings = { ...current, rules: { ...current.rules, [domain]: sanitized } };
  return setSettings(next);
}

/**
 * Remove a rule for a domain, if present.
 */
export async function removeRule(domain: string): Promise<Settings> {
  const current = await getSettings();
  if (!(domain in current.rules)) return current;
  const { [domain]: _removed, ...rest } = current.rules;
  const next: Settings = { ...current, rules: rest };
  return setSettings(next);
}

// --- Back-compat helpers used by existing popup code ---
/**
 * Returns the rule for a given domain or a default rule when absent.
 */
export async function getDomainSettings(domain: string): Promise<DomainSettings> {
  const settings = await getSettings();
  return settings.rules[domain] || { enabled: false, color: settings.defaultColor ?? DEFAULT_COLOR };
}

/**
 * Set the rule for a given domain.
 */
export async function setDomainSettings(domain: string, settings: DomainSettings): Promise<void> {
  await updateRule(domain, settings);
}
