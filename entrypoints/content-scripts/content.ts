// Content script for Colorful Background Extension

const KEY = 'cbe:enabled';
const COLOR_KEY = 'cbe:color';

async function getEnabled(): Promise<boolean> {
  const { [KEY]: enabled } = await chrome.storage.local.get(KEY);
  return Boolean(enabled);
}

async function getColor(): Promise<string> {
  const { [COLOR_KEY]: color } = await chrome.storage.local.get(COLOR_KEY);
  return color || '#ffefd5';
}

async function applyColorIfEnabled() {
  const enabled = await getEnabled();
  const color = await getColor();
  if (enabled) {
    document.documentElement.style.setProperty('background-color', color, 'important');
    document.body && (document.body.style.backgroundColor = color);
  } else {
    // reset
    document.documentElement.style.removeProperty('background-color');
    document.body && (document.body.style.backgroundColor = '');
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === 'apply-color' && typeof msg.color === 'string') {
      await chrome.storage.local.set({ [COLOR_KEY]: msg.color, [KEY]: true });
      await applyColorIfEnabled();
      sendResponse({ ok: true });
    } else if (msg?.type === 'toggle-color') {
      const enabled = await getEnabled();
      await chrome.storage.local.set({ [KEY]: !enabled });
      await applyColorIfEnabled();
      sendResponse({ ok: true, enabled: !enabled });
    }
  })();
  return true;
});

// apply on load
applyColorIfEnabled().catch(() => {});
