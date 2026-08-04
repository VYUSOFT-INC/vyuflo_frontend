// src/theme/ThemeProvider.tsx
//
// Production pattern (same as Linear, Figma, Notion):
//   1. Read theme_color from ui_session cookie at boot — no flash
//   2. Apply CSS vars synchronously before React paint
//   3. React state stays in sync for live preview in settings
//   4. updateUiSession keeps cookie in sync when user changes theme

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { generatePalette, applyPaletteToRoot, isValidHex, type ThemePalette } from './colors';
import { getUiSession } from '../utils/uiSession';

const DEFAULT_HEX = '#4f46e5';

interface ThemeContextValue {
  palette:       ThemePalette;
  hex:           string;
  setThemeColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  palette:       generatePalette(DEFAULT_HEX),
  hex:           DEFAULT_HEX,
  setThemeColor: () => {},
});

// ── Boot-time synchronous apply (call this BEFORE React renders) ──────────────
// Put this in your main.tsx / index.tsx before ReactDOM.createRoot():
//
//   import { bootTheme } from './theme/ThemeProvider';
//   bootTheme();                          // ← synchronous, no flash
//   ReactDOM.createRoot(...).render(...)
//
// This is how Linear and Figma eliminate the "flash of wrong color".

export function bootTheme(): void {
  const session = getUiSession();
  const hex = session?.theme_color && isValidHex(session.theme_color)
    ? session.theme_color
    : DEFAULT_HEX;
  applyPaletteToRoot(generatePalette(hex));
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  color?:    string | null;   // from ui_session cookie (passed by App.tsx)
  children:  ReactNode;
}

export function ThemeProvider({ color, children }: ThemeProviderProps) {
  const [hex, setHex] = useState<string>(() => {
    // Priority: prop > cookie > default
    if (color && isValidHex(color)) return color;
    const session = getUiSession();
    if (session?.theme_color && isValidHex(session.theme_color)) return session.theme_color;
    return DEFAULT_HEX;
  });

  const palette = useMemo(() => generatePalette(hex), [hex]);

  // Apply CSS vars whenever palette changes
  useEffect(() => {
    applyPaletteToRoot(palette);
  }, [palette]);

  // Sync if the prop changes (e.g. user logs in with a different account)
  useEffect(() => {
    if (color && isValidHex(color) && color !== hex) {
      setHex(color);
    }
  }, [color]);

  // Listen for ui-session-updated event (fired by updateUiSession)
  // This keeps theme in sync when the cookie is updated from anywhere
  useEffect(() => {
    const handler = () => {
      const session = getUiSession();
      if (session?.theme_color && isValidHex(session.theme_color) && session.theme_color !== hex) {
        setHex(session.theme_color);
      }
    };
    window.addEventListener('ui-session-updated', handler);
    return () => window.removeEventListener('ui-session-updated', handler);
  }, [hex]);

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