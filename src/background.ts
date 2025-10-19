/// <reference types="chrome" />

// Background service worker for the Colorful Background Extension

type ApplyPayload = { enabled: boolean; color: string };

const MSG = {
  GET_ACTIVE_DOMAIN: 'GET_ACTIVE_DOMAIN',
  APPLY_SETTINGS: 'APPLY_SETTINGS',
} as const;

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getActiveDomain(): Promise<string> {
  const tab = await getActiveTab();
  try {
    const url = new URL(tab?.url || '');
    return url.hostname || '';
  } catch {
    return '';
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return; // ignore

  if (message.type === MSG.GET_ACTIVE_DOMAIN) {
    (async () => {
      const domain = await getActiveDomain();
      sendResponse({ domain });
    })();
    return true; // keep port open
  }

  if (message.type === MSG.APPLY_SETTINGS) {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) return sendResponse({ ok: false });
      try {
        await chrome.tabs.sendMessage(tab.id, { type: MSG.APPLY_SETTINGS, payload: message.payload as ApplyPayload });
        sendResponse({ ok: true });
      } catch (e) {
        // Content script is declared in the manifest and should already be present on all pages
        sendResponse({ ok: false, error: String((e as any)?.message ?? e) });
      }
    })();
    return true;
  }
});
