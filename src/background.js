// Background service worker for the Colorful Background Extension

const MSG = {
  GET_ACTIVE_DOMAIN: 'GET_ACTIVE_DOMAIN',
  APPLY_SETTINGS: 'APPLY_SETTINGS',
};

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function getActiveDomain() {
  const tab = await getActiveTab();
  try {
    const url = new URL(tab.url || '');
    return url.hostname || '';
  } catch (e) {
    return '';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
      try {
        await chrome.tabs.sendMessage(tab.id, { type: MSG.APPLY_SETTINGS, payload: message.payload });
        sendResponse({ ok: true });
      } catch (e) {
        // If content script not ready, try injecting it
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['src/content.js'],
          });
          await chrome.tabs.sendMessage(tab.id, { type: MSG.APPLY_SETTINGS, payload: message.payload });
          sendResponse({ ok: true });
        } catch (e2) {
          sendResponse({ ok: false, error: String(e2 && e2.message || e2) });
        }
      }
    })();
    return true;
  }
});
