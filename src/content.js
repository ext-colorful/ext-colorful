// Content script to apply background colors on pages

const STYLE_ID = 'colorful-bg-style';
const MSG = {
  APPLY_SETTINGS: 'APPLY_SETTINGS',
};

function ensureStyleEl() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.documentElement.appendChild(style);
  }
  return style;
}

function applyColor(color) {
  const style = ensureStyleEl();
  const safe = typeof color === 'string' ? color : '#ffffff';
  style.textContent = `html, body { background-color: ${safe} !important; }`;
}

function clearColor() {
  const style = document.getElementById(STYLE_ID);
  if (style && style.parentNode) style.parentNode.removeChild(style);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== MSG.APPLY_SETTINGS) return;
  const payload = message.payload || {};
  if (payload.enabled && payload.color) {
    applyColor(payload.color);
  } else {
    clearColor();
  }
});
