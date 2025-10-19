import { getDomainSettings, setDomainSettings } from '../lib/storage.js';

const MSG = {
  GET_ACTIVE_DOMAIN: 'GET_ACTIVE_DOMAIN',
  APPLY_SETTINGS: 'APPLY_SETTINGS',
};

const PRESET_COLORS = [
  '#ffffff',
  '#f8fafc',
  '#fef3c7',
  '#dcfce7',
  '#e0f2fe',
  '#e9d5ff',
  '#fee2e2',
  '#d1fae5',
  '#fde68a',
  '#bfdbfe',
];

function $(id) { return document.getElementById(id); }

function parseHex(input) {
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

function setPreview(color) { const preview = $("preview"); preview.style.background = color; }
function setEnabledLabel(enabled) { const el = $("enabledLabel"); el.textContent = enabled ? 'On' : 'Off'; }
function setToggleUI(checked) {
  const t = $("toggle");
  if (checked) { t.classList.add('checked'); t.setAttribute('aria-checked', 'true'); }
  else { t.classList.remove('checked'); t.setAttribute('aria-checked', 'false'); }
}
function updateError(msg) { const el = $("error"); el.textContent = msg || ''; }
function focusInput() { const i = document.getElementById('customInput'); if (i) i.focus(); }

function requestActiveDomain() {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ type: MSG.GET_ACTIVE_DOMAIN }, (res) => {
        resolve((res && res.domain) || '');
      });
    } catch (e) { resolve(''); }
  });
}

function applyToActiveTab(payload) {
  return new Promise((resolve) => {
    try { chrome.runtime.sendMessage({ type: MSG.APPLY_SETTINGS, payload }, () => resolve()); }
    catch (e) { resolve(); }
  });
}

function buildPalette(onSelect) {
  const root = $("palette");
  root.innerHTML = '';
  PRESET_COLORS.forEach((color) => {
    const div = document.createElement('div');
    div.className = 'swatch';
    div.style.background = color;
    div.title = color;
    div.addEventListener('click', () => onSelect(color));
    const check = document.createElement('div');
    check.className = 'check';
    check.textContent = '✓';
    div.appendChild(check);
    root.appendChild(div);
  });
  return root.querySelectorAll('.swatch');
}

function highlightSelected(color) {
  const swatches = document.querySelectorAll('.swatch');
  swatches.forEach((el) => {
    const matches = el.style.background?.toLowerCase() === color.toLowerCase();
    if (matches) el.classList.add('selected'); else el.classList.remove('selected');
  });
}

async function main() {
  const domainLabel = $("domainLabel");
  const toggle = $("toggle");
  const input = $("customInput");
  const saveBtn = $("saveBtn");
  const applyBtn = $("applyBtn");

  const domain = await requestActiveDomain();
  domainLabel.textContent = domain || 'Unknown domain';

  let current = await getDomainSettings(domain);
  let selectedColor = current.color || '#FFFFFF';

  setEnabledLabel(current.enabled);
  setToggleUI(current.enabled);
  input.value = current.color || '';
  setPreview(selectedColor);

  buildPalette((color) => {
    selectedColor = color;
    input.value = color;
    setPreview(color);
    highlightSelected(color);
    current = { ...current, color };
    setDomainSettings(domain, current).then(() => {
      if (current.enabled) applyToActiveTab({ enabled: true, color });
    });
    updateError(null);
  });
  highlightSelected(selectedColor);

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
  toggle.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHandler(); } });

  input.addEventListener('input', () => {
    const parsed = parseHex(input.value);
    if (!parsed) { updateError('Enter a valid hex color like #AABBCC'); setPreview('#ffffff'); highlightSelected(''); return; }
    updateError(null);
    selectedColor = parsed;
    setPreview(parsed);
    highlightSelected(parsed);
    current = { ...current, color: parsed };
    setDomainSettings(domain, current).then(() => { if (current.enabled) applyToActiveTab({ enabled: true, color: parsed }); });
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
}

if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', main); } else { main(); }
