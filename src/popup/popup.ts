import { getColorForHost, setColorForHost, removeColorForHost } from '../lib/storage.js';

const COLORS = [
  '#fef3c7', // amber-100
  '#fde68a', // amber-200
  '#bbf7d0', // green-200
  '#a7f3d0', // teal-200
  '#bfdbfe', // blue-200
  '#c7d2fe', // indigo-200
  '#fbcfe8', // pink-200
  '#fecaca', // red-200
];

function createColorEl(color: string, selected: boolean) {
  const btn = document.createElement('button');
  btn.className = 'color' + (selected ? ' selected' : '');
  btn.setAttribute('data-color', color);
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = color;
  btn.appendChild(swatch);
  return btn;
}

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

function sendApplyToTab(tabId: number, color: string) {
  chrome.tabs.sendMessage(tabId, { type: 'APPLY_COLOR', color });
}

function sendClearToTab(tabId: number) {
  chrome.tabs.sendMessage(tabId, { type: 'CLEAR_COLOR' });
}

function markSelected(paletteEl: HTMLElement, color?: string) {
  paletteEl.querySelectorAll('.color').forEach((el) => el.classList.remove('selected'));
  if (!color) return;
  const el = paletteEl.querySelector(`.color[data-color="${CSS.escape(color)}"]`);
  if (el) el.classList.add('selected');
}

async function init() {
  const hostEl = document.getElementById('host')!;
  const paletteEl = document.getElementById('palette')!;
  const resetBtn = document.getElementById('reset')! as HTMLButtonElement;

  const tab = await getActiveTab();
  const host = getHostFromUrl(tab?.url);

  if (!host) {
    hostEl.textContent = '无法识别当前站点';
    paletteEl.innerHTML = '<small>请在普通网页标签页中打开弹窗。</small>';
    resetBtn.disabled = true;
    return;
  }

  hostEl.textContent = `当前站点：${host}`;

  const current = (await getColorForHost(host)) || undefined;

  COLORS.forEach((c) => {
    const el = createColorEl(c, current === c);
    el.addEventListener('click', async () => {
      try {
        await setColorForHost(host, c);
        markSelected(paletteEl, c);
        if (tab?.id != null) sendApplyToTab(tab.id, c);
      } catch (e) {
        // ignore
      }
    });
    paletteEl.appendChild(el);
  });

  resetBtn.addEventListener('click', async () => {
    try {
      await removeColorForHost(host);
      markSelected(paletteEl, undefined);
      if (tab?.id != null) sendClearToTab(tab.id);
    } catch (e) {
      // ignore
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
