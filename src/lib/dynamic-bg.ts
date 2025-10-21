import { RGBA, clamp01, contrastRatio, ensureOpaque, hexToRGBA, isTransparent, mix, parseColor, relativeLuminance, rgbaToString } from './color.js';

interface ChangeRecord {
  prevInlineBg: string | null; // previous inline style value
  originalComputedBg: RGBA | null; // snapshot before our change
}

interface Settings {
  brightThreshold: number; // luminance above which we start blending (0..1)
  maxBlend: number; // cap the blending strength (0..1)
  minContrast: number; // try to keep at least this contrast ratio with text color
  minElementArea: number; // px^2 minimum area to consider changing
}

const DEFAULT_SETTINGS: Settings = {
  brightThreshold: 0.65,
  maxBlend: 0.9,
  minContrast: 3.5,
  minElementArea: 2000,
};

function isElementVisible(el: Element): boolean {
  const rect = (el as HTMLElement).getBoundingClientRect?.();
  if (!rect) return true;
  if (rect.width <= 0 || rect.height <= 0) return false;
  return true;
}

function hasBackgroundImage(style: CSSStyleDeclaration): boolean {
  const bg = style.backgroundImage;
  return !!bg && bg !== 'none';
}

function getComputedBg(el: Element): RGBA | null {
  const style = getComputedStyle(el as Element);
  if (hasBackgroundImage(style)) return null;
  const bg = parseColor(style.backgroundColor);
  return bg;
}

function getComputedText(el: Element): RGBA | null {
  const style = getComputedStyle(el as Element);
  return parseColor(style.color);
}

function scheduleIdle(cb: () => void, timeout = 200): void {
  const w = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  if (typeof w.requestIdleCallback === 'function') {
    w.requestIdleCallback(cb, { timeout });
  } else {
    setTimeout(cb, Math.min(timeout, 200));
  }
}

/**
 * Compute blending weight based on how bright original background is.
 *  - If luminance <= threshold: weight = 0
 *  - If luminance >= 1: weight = maxBlend
 *  - Else: normalized to [0, maxBlend]
 */
function computeBlendWeight(lum: number, settings: Settings): number {
  if (lum <= settings.brightThreshold) return 0;
  const t = (lum - settings.brightThreshold) / (1 - settings.brightThreshold);
  return clamp01(t) * settings.maxBlend;
}

export class DynamicBackgroundApplier {
  private target: RGBA;
  private settings: Settings;
  private active = false;
  private observer: MutationObserver | null = null;
  private changes = new Map<Element, ChangeRecord>();
  private rescanScheduled = false;

  constructor(targetHex: string, settings?: Partial<Settings>) {
    const c = hexToRGBA(targetHex);
    this.target = ensureOpaque(c || { r: 255, g: 255, b: 255, a: 1 });
    this.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  }

  updateTarget(targetHex: string): void {
    const c = hexToRGBA(targetHex);
    this.target = ensureOpaque(c || { r: 255, g: 255, b: 255, a: 1 });
    if (this.active) this.rescanSoon();
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.observe();
    this.rescanSoon();
  }

  stop(): void {
    if (!this.active) return;
    this.active = false;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.revertAll();
  }

  private observe(): void {
    this.observer = new MutationObserver((mutations) => {
      if (!this.active) return;
      let shouldRescan = false;
      for (const m of mutations) {
        if (m.type === 'childList') {
          shouldRescan = true;
          break;
        }
        if (m.type === 'attributes') {
          const name = m.attributeName || '';
          if (name === 'style' || name === 'class') {
            shouldRescan = true;
            break;
          }
        }
      }
      if (shouldRescan) this.rescanSoon();
    });
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
  }

  private rescanSoon(): void {
    if (this.rescanScheduled) return;
    this.rescanScheduled = true;
    scheduleIdle(() => {
      this.rescanScheduled = false;
      this.scanAll();
    }, 500);
  }

  private scanAll(): void {
    if (!this.active) return;
    const root = document.documentElement;
    if (!root) return;

    // Always consider <html> and <body>
    this.tryApplyToElement(document.documentElement);
    if (document.body) this.tryApplyToElement(document.body);

    // Chunked iteration over elements to avoid jank
    const walker = document.createTreeWalker(document.body || root, NodeFilter.SHOW_ELEMENT);
    let count = 0;
    const processChunk = () => {
      let node: Node | null = walker.currentNode;
      while (node) {
        const el = node as Element;
        this.tryApplyToElement(el);
        count++;
        if (count % 300 === 0) {
          // schedule next chunk
          node = walker.nextNode();
          scheduleIdle(processChunk, 200);
          return;
        }
        node = walker.nextNode();
      }
    };
    processChunk();
  }

  private tryApplyToElement(el: Element): void {
    if (!(el instanceof HTMLElement)) return;

    // Skip common elements we shouldn't override
    const tag = el.tagName.toLowerCase();
    if (tag === 'img' || tag === 'canvas' || tag === 'video' || tag === 'svg' || tag === 'picture') return;

    // Skip very small or invisible elements
    if (!isElementVisible(el)) return;
    const area = el.offsetWidth * el.offsetHeight;
    if (el !== document.body && area < this.settings.minElementArea) return;

    const style = getComputedStyle(el);
    if (hasBackgroundImage(style)) return;

    const bg = getComputedBg(el);
    if (!bg) return;
    if (isTransparent(bg)) return;

    const lum = relativeLuminance(bg);
    const w0 = computeBlendWeight(lum, this.settings);
    if (w0 <= 0.0001) {
      this.maybeRevert(el);
      return;
    }

    // Blend towards target
    let w = w0;
    let blended = mix(bg, this.target, w);

    // Try to respect text contrast
    const text = getComputedText(el) || { r: 0, g: 0, b: 0, a: 1 };
    const ratio = contrastRatio(text, blended);
    if (ratio < this.settings.minContrast) {
      // Reduce blending strength to keep contrast
      const steps = 6;
      for (let i = 0; i < steps; i++) {
        w *= 0.7; // decay
        blended = mix(bg, this.target, w);
        if (contrastRatio(text, blended) >= this.settings.minContrast) break;
      }
      if (w < 0.02) {
        // too risky to change this element
        this.maybeRevert(el);
        return;
      }
    }

    // Apply and remember
    const rec = this.changes.get(el);
    if (!rec) {
      this.changes.set(el, {
        prevInlineBg: el.style.backgroundColor || null,
        originalComputedBg: bg,
      });
    } else {
      // Update original bg if page changed it significantly
      rec.originalComputedBg = rec.originalComputedBg || bg;
    }

    el.style.backgroundColor = rgbaToString(blended);
  }

  private maybeRevert(el: Element): void {
    const rec = this.changes.get(el);
    if (!rec) return;
    const prev = rec.prevInlineBg;
    if (prev === null || prev === '') (el as HTMLElement).style.backgroundColor = '';
    else (el as HTMLElement).style.backgroundColor = prev;
    this.changes.delete(el);
  }

  private revertAll(): void {
    for (const [el, rec] of this.changes.entries()) {
      const prev = rec.prevInlineBg;
      if (prev === null || prev === '') (el as HTMLElement).style.backgroundColor = '';
      else (el as HTMLElement).style.backgroundColor = prev;
    }
    this.changes.clear();
  }
}
