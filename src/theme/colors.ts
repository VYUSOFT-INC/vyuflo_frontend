// src/theme/colors.ts
// ────────────────────────────────────────────────────────────────────────────
// Generates a full UI palette from a single hex color.
// No dependencies — pure math.
// ────────────────────────────────────────────────────────────────────────────

export interface ThemePalette {
  /** The base color as-is, e.g. #4f46e5 */
  primary: string;
  /** RGB triplet for rgba() usage, e.g. "79, 70, 229" */
  primaryRgb: string;
  /** Very light tinted background, e.g. #eef2ff */
  light: string;
  /** Subtle border / chip-selected border, e.g. #c7d2fe */
  border: string;
  /** Darker shade for text-on-light-bg, e.g. #4338ca */
  dark: string;
  /** Hover state (slightly darker than primary) */
  hover: string;
  /** Gradient end — hue shifted ~25° toward purple */
  gradientEnd: string;
  /** Best foreground on the primary bg (white or dark) */
  foreground: string;
  /** Ultra-subtle tint for selected cards, ~5% opacity feel */
  tint: string;
  /** Ring / focus color at ~30% opacity */
  ring: string;
}

// ── Hex ↔ RGB ↔ HSL conversions ─────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    "#" +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
  );
}

function rgbToHsl(
  r: number,
  g: number,
  b: number
): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToRgb(
  h: number,
  s: number,
  l: number
): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function hslToHex(h: number, s: number, l: number): string {
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// ── Luminance for contrast calculation ──────────────────────────────────────

function relativeLuminance(r: number, g: number, b: number): number {
  const srgb = [r, g, b].map((c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

// ── Main palette generator ──────────────────────────────────────────────────

export function generatePalette(hex: string): ThemePalette {
  const [r, g, b] = hexToRgb(hex);
  const [h, s, l] = rgbToHsl(r, g, b);

  // Foreground: white on dark primaries, near-black on light ones
  const lum = relativeLuminance(r, g, b);
  const foreground = lum > 0.35 ? "#111827" : "#ffffff";

  return {
    primary: hex,
    primaryRgb: `${r}, ${g}, ${b}`,

    // Very light background — high lightness, reduced saturation
    light: hslToHex(h, Math.min(s, 80), 95),

    // Border shade — medium lightness
    border: hslToHex(h, Math.min(s, 70), 82),

    // Darker variant for text on light backgrounds
    dark: hslToHex(h, Math.min(s + 5, 95), Math.max(l - 12, 20)),

    // Hover — slightly darker than primary
    hover: hslToHex(h, s, Math.max(l - 6, 15)),

    // Gradient end — shift hue 25° toward purple, bump saturation
    gradientEnd: hslToHex(
      h + 25,
      Math.min(s + 15, 100),
      Math.min(l + 3, 60)
    ),

    foreground,

    // Ultra-subtle tint for card backgrounds
    tint: hslToHex(h, Math.min(s, 60), 97),

    // Ring color (used via rgba with the RGB triplet)
    ring: hslToHex(h, Math.min(s, 70), 90),
  };
}

/** Quick check — is this a valid 6-digit hex? */
export function isValidHex(hex: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(hex);
}