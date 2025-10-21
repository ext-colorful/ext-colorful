import { getAllSiteConfigs, getAllSiteColors, removeConfigForHost, clearAllConfigs, defaultSiteConfig, type SiteConfig } from '../lib/storage.js';

function makeGradientCss(cfg: SiteConfig): string {
  const g = cfg.gradient;
  return g.type === 'radial'
    ? `radial-gradient(circle at center, ${g.colors[0]}, ${g.colors[1]})`
    : `linear-gradient(${Math.round(g.angle)}deg, ${g.colors[0]}, ${g.colors[1]})`;
}

function renderList(listEl: HTMLElement, map: Record<string, SiteConfig>) {
  listEl.innerHTML = '';
  const entries = Object.entries(map);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无站点设置';
    listEl.appendChild(empty);
    return;
  }

  for (const [host, cfg] of entries.sort((a, b) => a[0].localeCompare(b[0]))) {
    const row = document.createElement('div');
    row.className = 'item';

    const sw = document.createElement('span');
    sw.className = 'swatch';
    if (cfg.mode === 'color') {
      sw.style.background = cfg.color;
    } else if (cfg.mode === 'gradient') {
      sw.style.background = makeGradientCss(cfg);
    } else if (cfg.mode === 'image') {
      if (cfg.image.url) {
        sw.style.backgroundImage = `url(${cfg.image.url})`;
      }
    }

    const label = document.createElement('div');
    label.className = 'label';
    const title = document.createElement('div');
    const modeName = cfg.mode === 'color' ? '纯色' : cfg.mode === 'gradient' ? '渐变' : '图片';
    title.textContent = `${host}  ·  ${modeName}`;
    const small = document.createElement('small');
    const textSumm = `字体 ${cfg.typography.textColor}${cfg.typography.textBgEnabled ? ` · 字体背景 ${cfg.typography.textBackgroundColor}` : ''}`;
    if (cfg.mode === 'color') {
      small.textContent = `背景 ${cfg.color}  ·  ${textSumm}`;
    } else if (cfg.mode === 'gradient') {
      small.textContent = `背景 ${cfg.gradient.type} ${cfg.gradient.colors[0]}→${cfg.gradient.colors[1]}  ·  ${textSumm}`;
    } else {
      small.textContent = `背景图片 ${cfg.image.url || ''}  ·  ${textSumm}`;
    }
    label.appendChild(title);
    label.appendChild(small);

    const btn = document.createElement('button');
    btn.textContent = '删除';
    btn.addEventListener('click', async () => {
      await removeConfigForHost(host);
      await refresh();
    });

    row.appendChild(sw);
    row.appendChild(label);
    row.appendChild(btn);
    listEl.appendChild(row);
  }
}

async function refresh() {
  const listEl = document.getElementById('list')!;
  // Merge new configs with legacy color map (legacy as color mode)
  const configs = await getAllSiteConfigs();
  const legacy = await getAllSiteColors();

  const merged: Record<string, SiteConfig> = {};
  for (const [h, c] of Object.entries(configs)) merged[h] = { ...defaultSiteConfig(), ...c };
  for (const [h, color] of Object.entries(legacy)) {
    if (!merged[h]) merged[h] = { ...defaultSiteConfig(), color, mode: 'color' };
  }

  renderList(listEl, merged);
}

async function init() {
  await refresh();

  const clearAllBtn = document.getElementById('clearAll')! as HTMLButtonElement;
  clearAllBtn.addEventListener('click', async () => {
    if (confirm('确认清空全部站点设置？')) {
      await clearAllConfigs();
      await refresh();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && (changes['siteConfigs'] || changes['siteColors'])) {
      void refresh();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
