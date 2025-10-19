// Simple storage helpers for per-domain settings (runtime JS)
const STORAGE_KEY = 'domainSettings';

export function getAllDomainSettings() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get([STORAGE_KEY], (res) => {
        resolve((res && res[STORAGE_KEY]) || {});
      });
    } catch (e) {
      resolve({});
    }
  });
}

export async function getDomainSettings(domain) {
  const all = await getAllDomainSettings();
  return all[domain] || { enabled: false, color: '#ffffff' };
}

export async function setDomainSettings(domain, settings) {
  const all = await getAllDomainSettings();
  const next = { ...all, [domain]: settings };
  return new Promise((resolve) => {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: next }, () => resolve());
    } catch (e) {
      resolve();
    }
  });
}
