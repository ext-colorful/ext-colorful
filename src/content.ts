// Content script: dynamic, contrast-aware background adjustment inspired by Dark Reader
import { DynamicBackgroundApplier } from './lib/dynamic-bg.js';

(function () {
  let applier: DynamicBackgroundApplier | null = null;

  function applyColor(color: string): void {
    if (!applier) {
      applier = new DynamicBackgroundApplier(color, {
        // Tune defaults if needed
        brightThreshold: 0.62,
        maxBlend: 0.9,
        minContrast: 3.5,
        minElementArea: 1600,
      });
      applier.start();
    } else {
      applier.updateTarget(color);
      applier.start();
    }
  }

  function clearColor(): void {
    if (applier) {
      applier.stop();
      applier = null;
    }
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
        clearColor();
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
      clearColor();
    }
  });

  void init();
})();
