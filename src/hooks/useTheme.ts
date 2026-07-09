// src/hooks/useTheme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Shared hook for updating the theme color.
// Lives at hooks/ root (not hooks/employee/) because all roles use it.
//
// Handles: live preview → API persist → cookie sync → revert on failure
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import type { AxiosError } from "axios";
import { useTheme } from "../theme";
import { updateThemeColor } from "../api/employee/profile.api";
import { getUiSession, updateUiSession } from "../utils/uiSession";

function extractMessage(e: unknown): string {
  const err = e as AxiosError<{ detail: string }>;
  return (
    err.response?.data?.detail ??
    (e instanceof Error ? e.message : "Something went wrong.")
  );
}

export function useUpdateTheme() {
  const { setThemeColor: applyTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const save = useCallback(async (hex: string) => {
    // 1. Live preview immediately (no wait for API)
    applyTheme(hex);

    // 2. Persist to backend via PATCH /users/me/profile
    setSaving(true);
    setError(null);
    try {
      await updateThemeColor(hex);

      // 3. Sync to ui_session cookie so it survives page refresh
      updateUiSession({ theme_color: hex });
    } catch (e) {
      setError(extractMessage(e));

      // Revert preview on failure
      const fallback = getUiSession()?.theme_color ?? "#4f46e5";
      applyTheme(fallback);
    } finally {
      setSaving(false);
    }
  }, [applyTheme]);

  return { save, saving, error };
}