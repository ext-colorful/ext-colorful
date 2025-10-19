/// <reference types="chrome" />

import { getDomainSettings } from '../lib/storage';

const STYLE_ID = 'colorful-bg-style';
const MSG = {
  APPLY_SETTINGS: 'APPLY_SETTINGS',
} as const;

type ApplyPayload = { enabled: boolean; color: string };

function ensureStyleEl(): HTMLStyleElement {
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style;
}

function applyColor(color: string) {
  const style = ensureStyleEl();
  const safe = typeof color === 'string' ? color : '#ffffff';
  style.textContent = `
    html, body, main, #content, .content, .container, .main, .app, #app, #root, .root {
      background-color: ${safe} !important;
      transition: background-color 0.2s ease;
    }
  `;
}

function clearColor() {
  const style = document.getElementById(STYLE_ID);
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

async function applyFromStorage() {
  try {
    const domain = location.hostname;
    const rule = await getDomainSettings(domain);
    if (rule.enabled && rule.color) applyColor(rule.color);
    else clearColor();
  } catch {
    // ignore
  }
}

// Apply on initial load
applyFromStorage();

// React to messages from popup/background
chrome.runtime.onMessage.addListener((message: any) => {
  if (!message || message.type !== MSG.APPLY_SETTINGS) return;
  const payload = (message.payload || {}) as ApplyPayload;
  if (payload.enabled && payload.color) {
    applyColor(payload.color);
  } else {
    clearColor();
  }
});

// React to storage changes (sync/local) affecting rules
chrome.storage.onChanged.addListener((_changes, _areaName) => {
  // Our storage library stores everything under a single key `state_v1`,
  // but we simply re-apply from storage for robustness.
  applyFromStorage();
});
