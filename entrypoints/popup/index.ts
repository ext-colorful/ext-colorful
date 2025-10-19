const colorSelect = document.getElementById('color') as HTMLSelectElement;
const applyBtn = document.getElementById('apply') as HTMLButtonElement;

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.id;
}

applyBtn.addEventListener('click', async () => {
  const tabId = await getActiveTabId();
  if (!tabId) return;

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'apply-color', color: colorSelect.value });
  } catch (e) {
    // Inject the content script then retry
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content-scripts/content.js'] });
      await chrome.tabs.sendMessage(tabId, { type: 'apply-color', color: colorSelect.value });
    } catch (err) {
      // ignore
    }
  }
});

// Load saved color
chrome.storage.local.get('cbe:color').then(({ ['cbe:color']: color }) => {
  if (typeof color === 'string') {
    colorSelect.value = color;
  }
});
