// src/theme/colors.ts
// Pure math — no dependencies. Generates a full UI palette from one hex.

export interface ThemePalette {
  primary:     string;   // base color
  primaryRgb:  string;   // "r, g, b" for rgba() usage
  light:       string;   // very light background ~95% lightness
  border:      string;   // subtle border ~82% lightness
  dark:        string;   // darker variant for text on light bg
  hover:       string;   // hover state (slightly darker)
  gradientEnd: string;   // gradient end — hue shifted ~25° toward purple
  foreground:  string;   // white or dark depending on contrast
  tint:        string;   // ultra-subtle card background ~97% lightness
  ring:        string;   // focus ring color ~90% lightness
}

// ── Conversions ───────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [clamp(r), clamp(g), clamp(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if      (h < 60)  [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else              [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hslToHex(h: number, s: number, l: number): string {
  return rgbToHex(...hslToRgb(h, s, l));
}

function relativeLuminance(r: number, g: number, b: number): number {
  const s = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
}

// ── Palette generator ─────────────────────────────────────────────────────────

export function generatePalette(hex: string): ThemePalette {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);
  const lum = relativeLuminance(r, g, b);

  return {
    primary:     hex,
    primaryRgb:  `${r}, ${g}, ${b}`,
    light:       hslToHex(h, Math.min(s, 80), 95),
    border:      hslToHex(h, Math.min(s, 70), 82),
    dark:        hslToHex(h, Math.min(s + 5, 95), Math.max(l - 12, 20)),
    hover:       hslToHex(h, s, Math.max(l - 6, 15)),
    gradientEnd: hslToHex(h + 25, Math.min(s + 15, 100), Math.min(l + 3, 60)),
    foreground:  lum > 0.35 ? '#111827' : '#ffffff',
    tint:        hslToHex(h, Math.min(s, 60), 97),
    ring:        hslToHex(h, Math.min(s, 70), 90),
  };
}

export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}

// ── Apply palette to DOM (synchronous — call before React hydrates) ───────────
// This is the key production pattern: apply CSS vars synchronously so
// there is zero flash of default color on page load.

export function applyPaletteToRoot(p: ThemePalette): void {
  const root = document.documentElement;

  // Theme vars — used directly in components
  root.style.setProperty('--theme-primary',      p.primary);
  root.style.setProperty('--theme-primary-rgb',  p.primaryRgb);
  root.style.setProperty('--theme-light',        p.light);
  root.style.setProperty('--theme-border',       p.border);
  root.style.setProperty('--theme-dark',         p.dark);
  root.style.setProperty('--theme-hover',        p.hover);
  root.style.setProperty('--theme-gradient-end', p.gradientEnd);
  root.style.setProperty('--theme-foreground',   p.foreground);
  root.style.setProperty('--theme-tint',         p.tint);
  root.style.setProperty('--theme-ring',         p.ring);

  // Tailwind v4 indigo overrides — all bg-indigo-*, text-indigo-*, etc.
  // follow the theme automatically across the entire app
  root.style.setProperty('--color-indigo-50',  p.light);
  root.style.setProperty('--color-indigo-100', p.ring);
  root.style.setProperty('--color-indigo-200', p.border);
  root.style.setProperty('--color-indigo-300', p.border);
  root.style.setProperty('--color-indigo-400', p.primary);
  root.style.setProperty('--color-indigo-500', p.primary);
  root.style.setProperty('--color-indigo-600', p.primary);
  root.style.setProperty('--color-indigo-700', p.hover);
  root.style.setProperty('--color-indigo-800', p.dark);
  root.style.setProperty('--color-indigo-900', p.dark);
}