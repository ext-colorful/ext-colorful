/// <reference types="chrome" />

// Persist a default color in chrome.storage under `defaultColor`

function $(id: string) { return document.getElementById(id)!; }

function parseHex(input: string): string | null {
  if (!input) return null;
  let v = input.trim();
  if (!v.startsWith('#')) v = '#' + v;
  const short = /^#([0-9a-fA-F]{3})$/;
  const long = /^#([0-9a-fA-F]{6})$/;
  if (short.test(v)) {
    const m = v.slice(1);
    return `#${m[0]}${m[0]}${m[1]}${m[1]}${m[2]}${m[2]}`.toUpperCase();
  }
  if (long.test(v)) return v.toUpperCase();
  return null;
}

const DEFAULT_KEY = 'defaultColor';

function getDefaultColor(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get([DEFAULT_KEY], (res) => resolve(res?.[DEFAULT_KEY] || '#FFFFFF'));
  });
}

function setDefaultColor(color: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [DEFAULT_KEY]: color }, () => resolve());
  });
}

async function main() {
  const input = $("defaultColor") as HTMLInputElement;
  const save = $("save");
  const status = $("status");

  input.value = await getDefaultColor();

  save.addEventListener('click', async () => {
    const parsed = parseHex(input.value);
    if (!parsed) {
      status.textContent = 'Please enter a valid hex color like #AABBCC';
      return;
    }
    await setDefaultColor(parsed);
    status.textContent = 'Saved';
    setTimeout(() => (status.textContent = ''), 1200);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
