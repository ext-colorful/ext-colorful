// Content script: apply per-domain background color and respond to messages
(function () {
  const STYLE_ID = 'colorful-bg-ext-style';

  function applyColor(color: string): void {
    removeStyle();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
:root { --cbg-ext-color: ${color}; }
html, body {
  background-color: var(--cbg-ext-color) !important;
}
`;
    document.documentElement.appendChild(style);
  }

  function removeStyle(): void {
    const prev = document.getElementById(STYLE_ID);
    if (prev && prev.parentNode) prev.parentNode.removeChild(prev);
  }

  function isStringRecord(obj: unknown): obj is Record<string, string> {
    if (typeof obj !== 'object' || obj === null) return false;
    return Object.values(obj).every((v) => typeof v === 'string');
  }

  async function getAllSiteColors(): Promise<Record<string, string>> {
    return new Promise((resolve) => {
      chrome.storage.sync.get('siteColors', (data) => {
        const map = (data as Record<string, unknown>)?.['siteColors'];
        if (isStringRecord(map)) resolve(map);
        else resolve({});
      });
    });
  }

  function getHost(): string {
    return location.hostname;
  }

  async function init(): Promise<void> {
    try {
      const map = await getAllSiteColors();
      const color = map[getHost()];
      if (color) {
        applyColor(color);
      } else {
        removeStyle();
      }
    } catch {
      // noop
    }
  }

  function isRecord(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
  }

  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!isRecord(msg)) return;
    const type = msg['type'];
    if (type === 'APPLY_COLOR' && typeof msg['color'] === 'string') {
      applyColor(msg['color']);
    } else if (type === 'CLEAR_COLOR') {
      removeStyle();
    }
  });

  void init();
})();
