// Content script: dynamic, contrast-aware background adjustment inspired by Dark Reader
type DynamicBackgroundApplier = import('./lib/dynamic-bg.js').DynamicBackgroundApplier;

(function () {
  let applier: DynamicBackgroundApplier | null = null;

  type DynamicBgModule = typeof import('./lib/dynamic-bg.js');
  let applierCtorPromise: Promise<DynamicBgModule['DynamicBackgroundApplier']> | null = null;
  async function getApplierCtor(): Promise<DynamicBgModule['DynamicBackgroundApplier']> {
    if (!applierCtorPromise) {
      applierCtorPromise = import(chrome.runtime.getURL('lib/dynamic-bg.js')).then((m) => m.DynamicBackgroundApplier);
    }
    return applierCtorPromise;
  }

  async function applyColor(color: string): Promise<void> {
    if (!applier) {
      const ApplierCtor = await getApplierCtor();
      applier = new ApplierCtor(color, {
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
        void applyColor(color);
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
      void applyColor(msg['color']);
    } else if (type === 'CLEAR_COLOR') {
      clearColor();
    }
  });

  void init();
})();
