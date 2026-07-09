// src/theme/ThemeProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  generatePalette,
  isValidHex,
  type ThemePalette,
} from "./colors";

const DEFAULT_HEX = "#4f46e5";
const DEFAULT_PALETTE = generatePalette(DEFAULT_HEX);

interface ThemeContextValue {
  palette: ThemePalette;
  hex: string;
  setThemeColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  palette: DEFAULT_PALETTE,
  hex: DEFAULT_HEX,
  setThemeColor: () => {},
});

// ── CSS variable injection ──────────────────────────────────────────────────

function applyPaletteToRoot(p: ThemePalette) {
  const root = document.documentElement;

  // ── Theme variables (used by ThemeColorStrip, ThemedComponents, etc.) ──
  root.style.setProperty("--theme-primary", p.primary);
  root.style.setProperty("--theme-primary-rgb", p.primaryRgb);
  root.style.setProperty("--theme-light", p.light);
  root.style.setProperty("--theme-border", p.border);
  root.style.setProperty("--theme-dark", p.dark);
  root.style.setProperty("--theme-hover", p.hover);
  root.style.setProperty("--theme-gradient-end", p.gradientEnd);
  root.style.setProperty("--theme-foreground", p.foreground);
  root.style.setProperty("--theme-tint", p.tint);
  root.style.setProperty("--theme-ring", p.ring);

  // ── Tailwind v4 indigo overrides ──────────────────────────────────────
  // Tailwind v4 generates utilities like bg-indigo-600 that reference
  // --color-indigo-600. By setting these here, every existing Tailwind
  // class in the entire app (buttons, focus rings, badges, etc.)
  // automatically follows the theme — zero component changes needed.
  root.style.setProperty("--color-indigo-50", p.light);
  root.style.setProperty("--color-indigo-100", p.ring);
  root.style.setProperty("--color-indigo-200", p.border);
  root.style.setProperty("--color-indigo-300", p.border);
  root.style.setProperty("--color-indigo-400", p.primary);
  root.style.setProperty("--color-indigo-500", p.primary);
  root.style.setProperty("--color-indigo-600", p.primary);
  root.style.setProperty("--color-indigo-700", p.hover);
  root.style.setProperty("--color-indigo-800", p.dark);
  root.style.setProperty("--color-indigo-900", p.dark);
}

// ── Provider ────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  color?: string | null;
  children: ReactNode;
}

export function ThemeProvider({ color, children }: ThemeProviderProps) {
  const [hex, setHex] = useState(() =>
    color && isValidHex(color) ? color : DEFAULT_HEX
  );

  const palette = useMemo(() => generatePalette(hex), [hex]);

  useEffect(() => {
    applyPaletteToRoot(palette);
  }, [palette]);

  useEffect(() => {
    if (color && isValidHex(color) && color !== hex) {
      setHex(color);
    }
  }, [color]);

  const setThemeColor = (newHex: string) => {
    if (isValidHex(newHex)) setHex(newHex);
  };

  return (
    <ThemeContext.Provider value={{ palette, hex, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}