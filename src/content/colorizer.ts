/// <reference types="chrome" />

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
  style.textContent = `html, body { background-color: ${safe} !important; }`;
}

function clearColor() {
  const style = document.getElementById(STYLE_ID);
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

chrome.runtime.onMessage.addListener((message: any) => {
  if (!message || message.type !== MSG.APPLY_SETTINGS) return;
  const payload = (message.payload || {}) as ApplyPayload;
  if (payload.enabled && payload.color) {
    applyColor(payload.color);
  } else {
    clearColor();
  }
});
