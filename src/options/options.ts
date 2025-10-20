import { getAllSiteColors, removeColorForHost, clearAllColors } from '../lib/storage.js';

function renderList(listEl: HTMLElement, map: Record<string, string>) {
  listEl.innerHTML = '';
  const entries = Object.entries(map);
  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '暂无站点设置';
    listEl.appendChild(empty);
    return;
  }

  for (const [host, color] of entries.sort((a, b) => a[0].localeCompare(b[0]))) {
    const row = document.createElement('div');
    row.className = 'item';

    const sw = document.createElement('span');
    sw.className = 'swatch';
    sw.style.background = color;

    const label = document.createElement('div');
    label.textContent = `${host} → ${color}`;

    const btn = document.createElement('button');
    btn.textContent = '删除';
    btn.addEventListener('click', async () => {
      await removeColorForHost(host);
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
  const map = await getAllSiteColors();
  renderList(listEl, map);
}

async function init() {
  await refresh();

  const clearAllBtn = document.getElementById('clearAll')! as HTMLButtonElement;
  clearAllBtn.addEventListener('click', async () => {
    if (confirm('确认清空全部站点设置？')) {
      await clearAllColors();
      await refresh();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes['siteColors']) {
      refresh();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
