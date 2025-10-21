export type ColorHex = string;
export type SiteColors = Record<string, ColorHex>; // Legacy mapping (host -> color)

const LEGACY_COLORS_KEY = 'siteColors';
const CONFIGS_KEY = 'siteConfigs';

export type BackgroundMode = 'color' | 'gradient' | 'image';

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle: number; // for linear
  colors: [ColorHex, ColorHex];
}

export interface ImageConfig {
  url: string;
  size: 'cover' | 'contain' | 'auto';
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  position: string; // e.g. 'center center'
  attachment: 'scroll' | 'fixed' | 'local';
}

export interface TypographyConfig {
  textColor: ColorHex;
  linkColor?: ColorHex;
  textBgEnabled: boolean;
  textBackgroundColor: ColorHex;
}

export interface SiteConfig {
  enabled: boolean;
  mode: BackgroundMode;
  color: ColorHex; // target color for dynamic blending mode
  gradient: GradientConfig;
  image: ImageConfig;
  typography: TypographyConfig;
}

export function defaultSiteConfig(): SiteConfig {
  return {
    enabled: true,
    mode: 'color',
    color: '#fef3c7',
    gradient: {
      type: 'linear',
      angle: 135,
      colors: ['#f4f4f5', '#e5e7eb'],
    },
    image: {
      url: '',
      size: 'cover',
      repeat: 'no-repeat',
      position: 'center center',
      attachment: 'fixed',
    },
    typography: {
      textColor: '#111111',
      linkColor: '#2563eb',
      textBgEnabled: false,
      textBackgroundColor: '#00000000',
    },
  };
}

function ensureSiteColors(obj: unknown): SiteColors {
  if (obj && typeof obj === 'object') return obj as SiteColors;
  return {};
}

function ensureSiteConfigs(obj: unknown): Record<string, SiteConfig> {
  if (obj && typeof obj === 'object') return obj as Record<string, SiteConfig>;
  return {};
}

// ----- New APIs (SiteConfig) -----
export async function getAllSiteConfigs(): Promise<Record<string, SiteConfig>> {
  const data = await chrome.storage.sync.get(CONFIGS_KEY);
  return ensureSiteConfigs((data as Record<string, unknown>)[CONFIGS_KEY]);
}

export async function getConfigForHost(host: string): Promise<SiteConfig | undefined> {
  const configs = await getAllSiteConfigs();
  const found = configs[host];
  if (found) return { ...defaultSiteConfig(), ...found };

  // Fallback to legacy color map for backward compatibility
  const legacy = await getAllSiteColors();
  const legacyColor = legacy[host];
  if (legacyColor) {
    const cfg = defaultSiteConfig();
    cfg.color = legacyColor;
    return cfg;
  }
  return undefined;
}

export async function setConfigForHost(host: string, cfg: Partial<SiteConfig>): Promise<void> {
  const all = await getAllSiteConfigs();
  const prev = all[host] || defaultSiteConfig();
  const next: SiteConfig = {
    ...defaultSiteConfig(),
    ...prev,
    ...cfg,
    gradient: { ...defaultSiteConfig().gradient, ...(prev.gradient || {}), ...(cfg.gradient || {}) },
    image: { ...defaultSiteConfig().image, ...(prev.image || {}), ...(cfg.image || {}) },
    typography: { ...defaultSiteConfig().typography, ...(prev.typography || {}), ...(cfg.typography || {}) },
  };
  all[host] = next;
  await chrome.storage.sync.set({ [CONFIGS_KEY]: all });

  // Clean up legacy store for this host if exists
  const legacy = await getAllSiteColors();
  if (legacy[host]) {
    delete legacy[host];
    await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: legacy });
  }
}

export async function removeConfigForHost(host: string): Promise<void> {
  const all = await getAllSiteConfigs();
  if (host in all) {
    delete all[host];
    await chrome.storage.sync.set({ [CONFIGS_KEY]: all });
  }
  // Also remove legacy
  const legacy = await getAllSiteColors();
  if (host in legacy) {
    delete legacy[host];
    await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: legacy });
  }
}

export async function clearAllConfigs(): Promise<void> {
  await chrome.storage.sync.set({ [CONFIGS_KEY]: {} });
  await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: {} });
}

// ----- Legacy APIs (kept for compatibility) -----
export async function getAllSiteColors(): Promise<SiteColors> {
  const data = await chrome.storage.sync.get(LEGACY_COLORS_KEY);
  return ensureSiteColors((data as Record<string, unknown>)[LEGACY_COLORS_KEY]);
}

export async function getColorForHost(host: string): Promise<ColorHex | undefined> {
  const map = await getAllSiteColors();
  return map[host];
}

export async function setColorForHost(host: string, color: ColorHex): Promise<void> {
  const map = await getAllSiteColors();
  map[host] = color;
  await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: map });
}

export async function removeColorForHost(host: string): Promise<void> {
  const map = await getAllSiteColors();
  if (host in map) {
    delete map[host];
    await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: map });
  }
}

export async function clearAllColors(): Promise<void> {
  await chrome.storage.sync.set({ [LEGACY_COLORS_KEY]: {} });
}
