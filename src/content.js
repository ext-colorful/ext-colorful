// Content script to apply background colors on pages

const STYLE_ID = 'colorful-bg-style';
const MSG = {
  APPLY_SETTINGS: 'APPLY_SETTINGS',
};

function ensureStyleEl() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style;
}

function applyColor(color) {
  const style = ensureStyleEl();
  const safe = typeof color === 'string' ? color : '#ffffff';
  style.textContent = `
    html, body, main, #content, .content, .container, .main, .app, #app, #root, .root {
      background-color: ${safe} !important;
      transition: background-color 0.2s ease;
    }
  `;
}

function clearColor() {
  const style = document.getElementById(STYLE_ID);
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

function extractRule(state) {
  try {
    if (!state || typeof state !== 'object') return null;
    if (state.version !== 1 || !state.settings || !state.settings.rules) return null;
    const domain = location.hostname;
    const rule = state.settings.rules[domain];
    if (!rule || typeof rule !== 'object') return null;
    return { enabled: !!rule.enabled, color: String(rule.color || '#FFFFFF') };
  } catch (e) {
    return null;
  }
}

function applyFromStorageState(state) {
  const rule = extractRule(state);
  if (rule && rule.enabled && rule.color) applyColor(rule.color); else clearColor();
}

async function readStateAndApply() {
  try {
    const syncRes = await new Promise((resolve) => chrome.storage.sync.get(['state_v1'], resolve));
    if (syncRes && syncRes.state_v1) { applyFromStorageState(syncRes.state_v1); return; }
  } catch {}
  try {
    const localRes = await new Promise((resolve) => chrome.storage.local.get(['state_v1'], resolve));
    if (localRes && localRes.state_v1) { applyFromStorageState(localRes.state_v1); return; }
  } catch {}
  clearColor();
}

// Apply on initial load
readStateAndApply();

// React to messages from popup/background
chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== MSG.APPLY_SETTINGS) return;
  const payload = message.payload || {};
  if (payload.enabled && payload.color) {
    applyColor(payload.color);
  } else {
    clearColor();
  }
});

// React to storage changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (changes && changes.state_v1) {
    applyFromStorageState(changes.state_v1.newValue);
  } else {
    // Any change might be relevant, re-read
    readStateAndApply();
  }
});
