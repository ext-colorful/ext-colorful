// Simple storage helpers for per-domain settings
// Using chrome.storage.local under the hood

export type DomainSettings = {
  enabled: boolean;
  color: string; // hex color, e.g. #AABBCC
};

// In this repository we don't depend on @types/chrome - declare chrome as any
// so the TS file compiles in isolation.
declare const chrome: any;

const STORAGE_KEY = 'domainSettings';

export async function getAllDomainSettings(): Promise<Record<string, DomainSettings>> {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get([STORAGE_KEY], (res: any) => {
        resolve((res && res[STORAGE_KEY]) || {});
      });
    } catch (e) {
      resolve({});
    }
  });
}

export async function getDomainSettings(domain: string): Promise<DomainSettings> {
  const all = await getAllDomainSettings();
  const settings = all[domain];
  return settings || { enabled: false, color: '#ffffff' };
}

export async function setDomainSettings(domain: string, settings: DomainSettings): Promise<void> {
  const all = await getAllDomainSettings();
  const next = { ...all, [domain]: settings };
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: next }, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}
