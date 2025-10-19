// Background service worker for Colorful Background Extension

chrome.runtime.onInstalled.addListener(() => {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'toggle-colorful-bg',
        title: 'Toggle Colorful Background',
        contexts: ['all'],
      });
    });
  } catch (e) {
    // ignore
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'toggle-colorful-bg' && tab?.id) {
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'toggle-color' });
    } catch (e) {
      // If content script not yet injected, try injecting it then send the message
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js'],
        });
        await chrome.tabs.sendMessage(tab.id, { type: 'toggle-color' });
      } catch (err) {
        // ignore
      }
    }
  }
});
