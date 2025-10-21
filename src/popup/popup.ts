import {
  defaultSiteConfig,
  getConfigForHost,
  removeConfigForHost,
  setConfigForHost,
  type SiteConfig,
} from '../lib/storage.js';

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => resolve(tabs[0]));
  });
}

function getHostFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return undefined;
  }
}

function sendApplyToTab(tabId: number, config: SiteConfig) {
  chrome.tabs.sendMessage(tabId, { type: 'APPLY_CONFIG', config });
}

function sendClearToTab(tabId: number) {
  chrome.tabs.sendMessage(tabId, { type: 'CLEAR_ALL' });
}

function setGroupVisibility(mode: SiteConfig['mode']) {
  (document.getElementById('colorFields') as HTMLElement).hidden = mode !== 'color';
  (document.getElementById('gradientFields') as HTMLElement).hidden = mode !== 'gradient';
  (document.getElementById('imageFields') as HTMLElement).hidden = mode !== 'image';
  const angleRow = document.querySelector('.angle-row') as HTMLElement;
  const gradientType = (document.getElementById('gradientType') as HTMLSelectElement).value as 'linear' | 'radial';
  angleRow.hidden = !(mode === 'gradient' && gradientType === 'linear');
}

function bindEnableDisable(enabled: boolean) {
  const controls = document.querySelectorAll('select, input, button');
  controls.forEach((el) => {
    const id = (el as HTMLElement).id;
    if (id === 'enabled' || id === 'saveBtn' || id === 'resetBtn') return;
    (el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement).disabled = !enabled;
  });
}

function uiToConfig(cfg: SiteConfig): SiteConfig {
  const mode = (document.getElementById('mode') as HTMLSelectElement).value as SiteConfig['mode'];
  const enabled = (document.getElementById('enabled') as HTMLInputElement).checked;

  const color = (document.getElementById('colorInput') as HTMLInputElement).value || cfg.color;

  const gradientType = (document.getElementById('gradientType') as HTMLSelectElement).value as 'linear' | 'radial';
  const angle = parseInt((document.getElementById('angle') as HTMLInputElement).value || `${cfg.gradient.angle}`, 10);
  const gColor1 = (document.getElementById('gColor1') as HTMLInputElement).value || cfg.gradient.colors[0];
  const gColor2 = (document.getElementById('gColor2') as HTMLInputElement).value || cfg.gradient.colors[1];

  const imgUrl = (document.getElementById('imgUrl') as HTMLInputElement).value ?? cfg.image.url;
  const imgSize = (document.getElementById('imgSize') as HTMLSelectElement).value as SiteConfig['image']['size'];
  const imgRepeat = (document.getElementById('imgRepeat') as HTMLSelectElement).value as SiteConfig['image']['repeat'];
  const imgPosition = (document.getElementById('imgPosition') as HTMLSelectElement).value;
  const imgAttachment = (document.getElementById('imgAttachment') as HTMLSelectElement).value as SiteConfig['image']['attachment'];

  const textColor = (document.getElementById('textColor') as HTMLInputElement).value || cfg.typography.textColor;
  const linkColor = (document.getElementById('linkColor') as HTMLInputElement).value || cfg.typography.linkColor || '';
  const textBgEnabled = (document.getElementById('textBgEnabled') as HTMLInputElement).checked;
  const textBgColor = (document.getElementById('textBgColor') as HTMLInputElement).value || cfg.typography.textBackgroundColor;

  const next: SiteConfig = {
    ...cfg,
    enabled,
    mode,
    color,
    gradient: {
      type: gradientType,
      angle: isFinite(angle) ? angle : cfg.gradient.angle,
      colors: [gColor1 || cfg.gradient.colors[0], gColor2 || cfg.gradient.colors[1]],
    },
    image: {
      url: imgUrl || cfg.image.url,
      size: imgSize || cfg.image.size,
      repeat: imgRepeat || cfg.image.repeat,
      position: imgPosition || cfg.image.position,
      attachment: imgAttachment || cfg.image.attachment,
    },
    typography: {
      textColor: textColor || cfg.typography.textColor,
      linkColor: linkColor || cfg.typography.linkColor,
      textBgEnabled,
      textBackgroundColor: textBgColor || cfg.typography.textBackgroundColor,
    },
  };
  return next;
}

function configToUI(cfg: SiteConfig) {
  (document.getElementById('enabled') as HTMLInputElement).checked = cfg.enabled;
  (document.getElementById('mode') as HTMLSelectElement).value = cfg.mode;

  (document.getElementById('colorInput') as HTMLInputElement).value = cfg.color;

  (document.getElementById('gradientType') as HTMLSelectElement).value = cfg.gradient.type;
  (document.getElementById('angle') as HTMLInputElement).value = String(cfg.gradient.angle);
  (document.getElementById('gColor1') as HTMLInputElement).value = cfg.gradient.colors[0];
  (document.getElementById('gColor2') as HTMLInputElement).value = cfg.gradient.colors[1];

  (document.getElementById('imgUrl') as HTMLInputElement).value = cfg.image.url;
  (document.getElementById('imgSize') as HTMLSelectElement).value = cfg.image.size;
  (document.getElementById('imgRepeat') as HTMLSelectElement).value = cfg.image.repeat;
  (document.getElementById('imgPosition') as HTMLSelectElement).value = cfg.image.position;
  (document.getElementById('imgAttachment') as HTMLSelectElement).value = cfg.image.attachment;

  (document.getElementById('textColor') as HTMLInputElement).value = cfg.typography.textColor;
  (document.getElementById('linkColor') as HTMLInputElement).value = cfg.typography.linkColor || '#2563eb';
  (document.getElementById('textBgEnabled') as HTMLInputElement).checked = cfg.typography.textBgEnabled;
  (document.getElementById('textBgColor') as HTMLInputElement).value = cfg.typography.textBackgroundColor;

  (document.getElementById('textBgRow') as HTMLElement).hidden = !cfg.typography.textBgEnabled;

  setGroupVisibility(cfg.mode);
  bindEnableDisable(cfg.enabled);
}

async function init() {
  const hostEl = document.getElementById('host')!;
  const saveBtn = document.getElementById('saveBtn')! as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn')! as HTMLButtonElement;

  const tab = await getActiveTab();
  const host = getHostFromUrl(tab?.url);

  if (!host) {
    hostEl.textContent = '无法识别当前站点';
    saveBtn.disabled = true;
    resetBtn.disabled = true;
    return;
  }

  hostEl.textContent = `当前站点：${host}`;

  const initial = (await getConfigForHost(host)) || defaultSiteConfig();
  let current: SiteConfig = { ...defaultSiteConfig(), ...initial };

  configToUI(current);

  const onAnyChange = () => {
    current = uiToConfig(current);
    (document.getElementById('textBgRow') as HTMLElement).hidden = !current.typography.textBgEnabled;
    setGroupVisibility(current.mode);
    bindEnableDisable(current.enabled);
    if (tab?.id != null) sendApplyToTab(tab.id, current);
  };

  // Bind change handlers
  const ids = [
    'enabled',
    'mode',
    'colorInput',
    'gradientType',
    'angle',
    'gColor1',
    'gColor2',
    'imgUrl',
    'imgSize',
    'imgRepeat',
    'imgPosition',
    'imgAttachment',
    'textColor',
    'linkColor',
    'textBgEnabled',
    'textBgColor',
  ];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', onAnyChange);
    el.addEventListener('change', onAnyChange);
  });

  saveBtn.addEventListener('click', async () => {
    if (!host) return;
    try {
      await setConfigForHost(host, current);
    } catch {
      // ignore
    }
  });

  resetBtn.addEventListener('click', async () => {
    if (!host) return;
    try {
      await removeConfigForHost(host);
      current = defaultSiteConfig();
      configToUI(current);
      if (tab?.id != null) sendClearToTab(tab.id);
    } catch {
      // ignore
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
