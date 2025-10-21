// Content script: advanced configurable theming (background color/gradient/image + typography)
// Keeps dynamic, contrast-aware blending for color mode and injects CSS for gradient/image/text.

type DynamicBackgroundApplier = import('./lib/dynamic-bg.js').DynamicBackgroundApplier;

(function () {
  // ---- Types (duplicated here to avoid static imports in content script) ----
  type BackgroundMode = 'color' | 'gradient' | 'image';
  interface GradientConfig {
    type: 'linear' | 'radial';
    angle: number; // for linear
    colors: [string, string];
  }
  interface ImageConfig {
    url: string;
    size: 'cover' | 'contain' | 'auto';
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    position: string;
    attachment: 'scroll' | 'fixed' | 'local';
  }
  interface TypographyConfig {
    textColor: string;
    linkColor?: string;
    textBgEnabled: boolean;
    textBackgroundColor: string;
  }
  interface SiteConfig {
    enabled: boolean;
    mode: BackgroundMode;
    color: string;
    gradient: GradientConfig;
    image: ImageConfig;
    typography: TypographyConfig;
  }

  function defaultConfig(): SiteConfig {
    return {
      enabled: true,
      mode: 'color',
      color: '#fef3c7',
      gradient: { type: 'linear', angle: 135, colors: ['#f4f4f5', '#e5e7eb'] },
      image: { url: '', size: 'cover', repeat: 'no-repeat', position: 'center center', attachment: 'fixed' },
      typography: { textColor: '#111111', linkColor: '#2563eb', textBgEnabled: false, textBackgroundColor: '#00000000' },
    };
  }

  // ---- Dynamic blending support for color mode ----
  let applier: DynamicBackgroundApplier | null = null;
  type DynamicBgModule = typeof import('./lib/dynamic-bg.js');
  let applierCtorPromise: Promise<DynamicBgModule['DynamicBackgroundApplier']> | null = null;
  async function getApplierCtor(): Promise<DynamicBgModule['DynamicBackgroundApplier']> {
    if (!applierCtorPromise) {
      applierCtorPromise = import(chrome.runtime.getURL('lib/dynamic-bg.js')).then((m) => m.DynamicBackgroundApplier);
    }
    return applierCtorPromise;
  }

  async function startColorBlend(color: string): Promise<void> {
    if (!applier) {
      const ApplierCtor = await getApplierCtor();
      applier = new ApplierCtor(color, {
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

  function stopColorBlend(): void {
    if (applier) {
      applier.stop();
      applier = null;
    }
  }

  // ---- Style injection ----
  let styleEl: HTMLStyleElement | null = null;
  function getStyleEl(): HTMLStyleElement {
    if (styleEl && styleEl.isConnected) return styleEl;
    styleEl = document.createElement('style');
    styleEl.id = 'cbx-style';
    (document.head || document.documentElement).appendChild(styleEl);
    return styleEl;
  }
  function removeStyleEl(): void {
    if (styleEl && styleEl.isConnected) styleEl.remove();
    styleEl = null;
  }

  function esc(s: string): string {
    return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  function buildCss(cfg: SiteConfig): string {
    const t = cfg.typography || defaultConfig().typography;
    const lines: string[] = [];
    lines.push(':root{');
    lines.push(`--cbx-text:${t.textColor};`);
    if (t.linkColor) lines.push(`--cbx-link:${t.linkColor};`);
    lines.push(`--cbx-text-bg:${t.textBackgroundColor};`);
    lines.push('}');

    // Background for html/body
    if (cfg.mode === 'color') {
      const col = cfg.color || defaultConfig().color;
      lines.push(`html,body{background:${col} !important;}`);
    } else if (cfg.mode === 'gradient') {
      const g = cfg.gradient || defaultConfig().gradient;
      const gradientStr = g.type === 'radial'
        ? `radial-gradient(circle at center, ${g.colors[0]}, ${g.colors[1]})`
        : `linear-gradient(${Math.round(g.angle)}deg, ${g.colors[0]}, ${g.colors[1]})`;
      lines.push(`html,body{background:${gradientStr} !important;}`);
    } else if (cfg.mode === 'image') {
      const img = cfg.image || defaultConfig().image;
      if (img.url && img.url.trim().length > 0) {
        const url = `url("${esc(img.url)}")`;
        lines.push(
          `html,body{background-image:${url} !important;background-size:${img.size} !important;background-repeat:${img.repeat} !important;background-position:${img.position} !important;background-attachment:${img.attachment} !important;}`,
        );
      }
    }

    // Typography: apply color to common text elements (avoid form controls)
    const textSelectors = [
      'body',
      'p',
      'span',
      'li',
      'a',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'small',
      'em',
      'strong',
      'code',
      'pre',
      'blockquote',
      'label',
      'th',
      'td',
      'dt',
      'dd'
    ].join(',');

    lines.push(`${textSelectors}{color:var(--cbx-text) !important;}`);
    if (t.linkColor) lines.push(`a,a:visited{color:var(--cbx-link) !important;}`);

    if (t.textBgEnabled) {
      lines.push(`${textSelectors}{background-color:var(--cbx-text-bg) !important;}`);
    }

    return lines.join('');
  }

  function applyCss(cfg: SiteConfig): void {
    const el = getStyleEl();
    el.textContent = buildCss(cfg);
  }

  function clearCss(): void {
    removeStyleEl();
  }

  async function applyConfig(cfg: SiteConfig): Promise<void> {
    if (!cfg || cfg.enabled === false) {
      stopColorBlend();
      clearCss();
      return;
    }

    if (cfg.mode === 'color') {
      await startColorBlend(cfg.color);
      applyCss(cfg); // also set base backgrounds + typography
    } else {
      stopColorBlend();
      applyCss(cfg);
    }
  }

  function getHost(): string {
    return location.hostname;
  }

  function isRecord(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
  }

  async function getConfigFromStorage(): Promise<SiteConfig | undefined> {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['siteConfigs', 'siteColors'], (data) => {
        const host = getHost();
        const cfgs = (data as Record<string, unknown>)['siteConfigs'] as Record<string, unknown> | undefined;
        if (cfgs && typeof cfgs === 'object' && isRecord(cfgs)) {
          const raw = (cfgs as Record<string, unknown>)[host] as Record<string, unknown> | undefined;
          if (raw && isRecord(raw)) {
            const d = defaultConfig();
            const merged: SiteConfig = {
              ...d,
              ...(raw as unknown as Partial<SiteConfig>),
              gradient: { ...d.gradient, ...(raw['gradient'] as Partial<GradientConfig> | undefined) },
              image: { ...d.image, ...(raw['image'] as Partial<ImageConfig> | undefined) },
              typography: { ...d.typography, ...(raw['typography'] as Partial<TypographyConfig> | undefined) },
            };
            resolve(merged);
            return;
          }
        }
        // fallback legacy
        const legacy = (data as Record<string, unknown>)['siteColors'] as Record<string, string> | undefined;
        const color = legacy && typeof legacy === 'object' ? (legacy as Record<string, string>)[host] : undefined;
        if (typeof color === 'string') {
          const d = defaultConfig();
          d.color = color;
          resolve(d);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  async function init(): Promise<void> {
    try {
      const cfg = await getConfigFromStorage();
      if (cfg) await applyConfig(cfg);
      else {
        stopColorBlend();
        clearCss();
      }
    } catch {
      // noop
    }
  }

  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if (!isRecord(msg)) return;
    const type = msg['type'];
    if (type === 'APPLY_CONFIG' && isRecord(msg['config'])) {
      void applyConfig((msg['config'] as unknown) as SiteConfig);
    } else if (type === 'CLEAR_ALL') {
      stopColorBlend();
      clearCss();
    }
    // Back-compat with previous popup
    else if (type === 'APPLY_COLOR' && typeof msg['color'] === 'string') {
      void applyConfig({ ...defaultConfig(), mode: 'color', color: msg['color'] as string });
    } else if (type === 'CLEAR_COLOR') {
      stopColorBlend();
    }
  });

  void init();
})();
