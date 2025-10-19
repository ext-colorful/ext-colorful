import { getDomainSettings, setDomainSettings, removeRule, type DomainSettings } from '../lib/storage';

// Declare chrome to avoid needing @types/chrome here
declare const chrome: any;

type ApplyPayload = { enabled: boolean; color: string };

const MSG = {
  GET_ACTIVE_DOMAIN: 'GET_ACTIVE_DOMAIN',
  APPLY_SETTINGS: 'APPLY_SETTINGS',
};

const PRESET_COLORS = [
  '#ffffff', // White
  '#f8fafc', // Slate-50
  '#fef3c7', // Amber-100
  '#dcfce7', // Green-100
  '#e0f2fe', // Sky-100
  '#e9d5ff', // Purple-200
  '#fee2e2', // Red-200
  '#d1fae5', // Emerald-200
  '#fde68a', // Amber-300
  '#bfdbfe', // Blue-200
];

function $(id: string) {
  return document.getElementById(id)!;
}

function parseHex(input: string): string | null {
  if (!input) return null;
  let v = input.trim();
  if (!v.startsWith('#')) v = '#' + v;
  const short = /^#([0-9a-fA-F]{3})$/;
  const long = /^#([0-9a-fA-F]{6})$/;
  if (short.test(v)) {
    const m = v.slice(1);
    const expanded = `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`;
    return expanded.toUpperCase();
  }
  if (long.test(v)) return v.toUpperCase();
  return null;
}

function setPreview(color: string) {
  const preview = $("preview") as HTMLDivElement;
  preview.style.background = color;
}

function setEnabledLabel(enabled: boolean) {
  const el = $("enabledLabel");
  el.textContent = enabled ? 'On' : 'Off';
}

function setToggleUI(checked: boolean) {
  const t = $("toggle");
  if (checked) {
    t.classList.add('checked');
    t.setAttribute('aria-checked', 'true');
  } else {
    t.classList.remove('checked');
    t.setAttribute('aria-checked', 'false');
  }
}

function updateError(msg: string | null) {
  const el = $("error");
  el.textContent = msg || '';
}

function focusInput() { (document.getElementById('customInput') as HTMLInputElement)?.focus(); }

async function requestActiveDomain(): Promise<string> {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ type: MSG.GET_ACTIVE_DOMAIN }, (res: any) => {
        resolve((res && res.domain) || '');
      });
    } catch (e) {
      resolve('');
    }
  });
}

function applyToActiveTab(payload: ApplyPayload): Promise<void> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: MSG.APPLY_SETTINGS, payload }, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}

function buildPalette(onSelect: (color: string) => void) {
  const root = $("palette");
  root.innerHTML = '';
  PRESET_COLORS.forEach((color) => {
    const div = document.createElement('div');
    div.className = 'swatch';
    div.style.background = color;
    div.title = color;
    div.dataset.color = color.toUpperCase();
    div.addEventListener('click', () => onSelect(color));
    const check = document.createElement('div');
    check.className = 'check';
    check.textContent = '✓';
    div.appendChild(check);
    root.appendChild(div);
  });
  return root.querySelectorAll<HTMLDivElement>('.swatch');
}

function highlightSelected(color: string) {
  const target = (color || '').toUpperCase();
  const swatches = document.querySelectorAll<HTMLDivElement>('.swatch');
  swatches.forEach((el) => {
    const matches = (el.dataset.color || '') === target;
    if (matches) el.classList.add('selected'); else el.classList.remove('selected');
  });
}

async function main() {
  const domainLabel = $("domainLabel");
  const toggle = $("toggle");
  const input = $("customInput") as HTMLInputElement;
  const saveBtn = $("saveBtn");
  const applyBtn = $("applyBtn");
  const resetBtn = $("resetBtn");

  const domain = await requestActiveDomain();
  domainLabel.textContent = domain || 'Unknown domain';

  let current: DomainSettings = await getDomainSettings(domain);
  let selectedColor = current.color || '#FFFFFF';

  setEnabledLabel(current.enabled);
  setToggleUI(current.enabled);
  input.value = current.color || '';
  setPreview(selectedColor);

  const swatches = buildPalette((color) => {
    selectedColor = color;
    input.value = color;
    setPreview(color);
    highlightSelected(color);
    // Enable and apply immediately when a color is picked
    current = { ...current, color, enabled: true };
    setToggleUI(true);
    setEnabledLabel(true);
    setDomainSettings(domain, current).then(() => {
      applyToActiveTab({ enabled: true, color });
    });
    updateError(null);
  });
  highlightSelected(selectedColor);

  // Toggle logic
  const toggleHandler = () => {
    const enabled = !toggle.classList.contains('checked');
    setToggleUI(enabled);
    setEnabledLabel(enabled);
    current = { ...current, enabled };
    setDomainSettings(domain, current).then(() => {
      if (enabled) applyToActiveTab({ enabled: true, color: selectedColor });
      else applyToActiveTab({ enabled: false, color: selectedColor });
    });
  };
  toggle.addEventListener('click', toggleHandler);
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); }
  });

  // Custom input
  input.addEventListener('input', () => {
    const parsed = parseHex(input.value);
    if (!parsed) {
      updateError('Enter a valid hex color like #AABBCC');
      setPreview('#ffffff');
      highlightSelected('');
      return;
    }
    updateError(null);
    selectedColor = parsed;
    setPreview(parsed);
    highlightSelected(parsed);
    // Enable when a valid color is entered and apply immediately
    current = { ...current, color: parsed, enabled: true };
    setToggleUI(true);
    setEnabledLabel(true);
    setDomainSettings(domain, current).then(() => {
      applyToActiveTab({ enabled: true, color: parsed });
    });
  });

  saveBtn.addEventListener('click', async () => {
    const parsed = parseHex(input.value);
    if (!parsed) { updateError('Enter a valid hex color like #AABBCC'); focusInput(); return; }
    selectedColor = parsed;
    current = { ...current, color: parsed };
    await setDomainSettings(domain, current);
    updateError('Saved');
    setTimeout(() => updateError(null), 1200);
  });

  applyBtn.addEventListener('click', async () => {
    const parsed = parseHex(input.value);
    if (!parsed) { updateError('Enter a valid hex color like #AABBCC'); focusInput(); return; }
    selectedColor = parsed;
    current = { ...current, color: parsed };
    await setDomainSettings(domain, current);
    await applyToActiveTab({ enabled: current.enabled, color: parsed });
  });

  // Reset for current site
  resetBtn.addEventListener('click', async () => {
    await removeRule(domain);
    // Reload current to reflect default
    current = await getDomainSettings(domain);
    selectedColor = current.color || '#FFFFFF';

    // Update UI
    setEnabledLabel(false);
    setToggleUI(false);
    input.value = '';
    setPreview('#ffffff');
    highlightSelected('');
    updateError('Reset');
    setTimeout(() => updateError(null), 1200);

    // Remove styles immediately
    await applyToActiveTab({ enabled: false, color: selectedColor });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
