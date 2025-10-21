export interface RGBA {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export function clamp01(x: number): number {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

export function parseColor(input: string | null | undefined): RGBA | null {
  if (!input) return null;
  const str = input.trim().toLowerCase();
  if (str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  // rgb / rgba
  const rgbMatch = str.match(/^rgba?\(([^)]+)\)$/);
  if (rgbMatch) {
    const parts = rgbMatch[1]
      .split(',')
      .map((p) => p.trim())
      .map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    if (parts.length >= 3) {
      const r = Math.round(parts[0]);
      const g = Math.round(parts[1]);
      const b = Math.round(parts[2]);
      const a = parts.length >= 4 ? clamp01(parts[3] as number) : 1;
      return { r, g, b, a };
    }
  }

  // hex #RRGGBB or #RGB
  const hexMatch = str.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const h = hexMatch[1];
    if (h.length === 3) {
      const r = parseInt(h[0] + h[0], 16);
      const g = parseInt(h[1] + h[1], 16);
      const b = parseInt(h[2] + h[2], 16);
      return { r, g, b, a: 1 };
    } else if (h.length === 6) {
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return { r, g, b, a: 1 };
    }
  }

  return null;
}

export function rgbaToString(c: RGBA): string {
  const a = clamp01(c.a);
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`;
}

export function relativeLuminance(c: RGBA): number {
  // sRGB to linear
  function toLinear(u: number): number {
    const v = u / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  const R = toLinear(c.r);
  const G = toLinear(c.g);
  const B = toLinear(c.b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function contrastRatio(c1: RGBA, c2: RGBA): number {
  // If any are transparent, treat alpha by blending over white
  const a1 = clamp01(c1.a);
  const a2 = clamp01(c2.a);
  const blendOverWhite = (c: RGBA): RGBA => {
    const a = clamp01(c.a);
    const r = c.r * a + 255 * (1 - a);
    const g = c.g * a + 255 * (1 - a);
    const b = c.b * a + 255 * (1 - a);
    return { r, g, b, a: 1 };
  };
  const C1 = a1 < 1 ? blendOverWhite(c1) : c1;
  const C2 = a2 < 1 ? blendOverWhite(c2) : c2;

  const L1 = relativeLuminance(C1);
  const L2 = relativeLuminance(C2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const k = clamp01(t);
  return {
    r: a.r + (b.r - a.r) * k,
    g: a.g + (b.g - a.g) * k,
    b: a.b + (b.b - a.b) * k,
    a: a.a + (b.a - a.a) * k,
  };
}

export function isTransparent(c: RGBA): boolean {
  return c.a <= 0.01;
}

export function hexToRGBA(hex: string): RGBA | null {
  return parseColor(hex);
}

export function ensureOpaque(c: RGBA): RGBA {
  return { r: c.r, g: c.g, b: c.b, a: 1 };
}
