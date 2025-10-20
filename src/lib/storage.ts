export type ColorHex = string;
export type SiteColors = Record<string, ColorHex>;

const STORAGE_KEY = 'siteColors';

function ensureSiteColors(obj: unknown): SiteColors {
  if (obj && typeof obj === 'object') {
    return obj as SiteColors;
  }
  return {};
}

export async function getAllSiteColors(): Promise<SiteColors> {
  const data = await chrome.storage.sync.get(STORAGE_KEY);
  return ensureSiteColors(data[STORAGE_KEY]);
}

export async function getColorForHost(host: string): Promise<ColorHex | undefined> {
  const map = await getAllSiteColors();
  return map[host];
}

export async function setColorForHost(host: string, color: ColorHex): Promise<void> {
  const map = await getAllSiteColors();
  map[host] = color;
  await chrome.storage.sync.set({ [STORAGE_KEY]: map });
}

export async function removeColorForHost(host: string): Promise<void> {
  const map = await getAllSiteColors();
  if (host in map) {
    delete map[host];
    await chrome.storage.sync.set({ [STORAGE_KEY]: map });
  }
}

export async function clearAllColors(): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEY]: {} });
}
