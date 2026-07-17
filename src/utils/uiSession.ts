// src/utils/uiSession.ts
// ─────────────────────────────────────────────────────────────────────────────
// WHAT CHANGED:
//   1. Added `theme_color` to UiSession interface
//   2. Added general `updateUiSession(partial)` that merges any fields
//   3. Kept existing `updateUiSessionProfile()` unchanged (still works)
// ─────────────────────────────────────────────────────────────────────────────

export interface UiSession {
  user_id:     string; 
  first_name:  string;
  last_name:   string;
  email:       string;
  profile:     string | null;
  roles:       string[];
  theme_color: string;           // ← NEW — defaults to "#4f46e5"
}

// ── Read ────────────────────────────────────────────────────────────────────

export function getUiSession(): UiSession | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('ui_session='));
  if (!match) return null;
  
  try {
    let raw = match.split('=').slice(1).join('=');
    raw = decodeURIComponent(raw);
    if (raw.startsWith('"') && raw.endsWith('"')) {
      raw = raw.slice(1, -1);
    }
    const decoded = atob(raw);
    const parsed = JSON.parse(decoded) as UiSession;
    if (!parsed.user_id) parsed.user_id = "";
    // Backfill theme_color for cookies set before this field existed
    if (!parsed.theme_color) {
      parsed.theme_color = "#4f46e5";
    }

    return parsed;
  } catch {
    return null;
  }
}

// ── Write (full replace) ────────────────────────────────────────────────────

function writeCookie(session: UiSession): void {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const encoded = btoa(JSON.stringify(session));
  document.cookie = `ui_session=${encoded}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new Event('ui-session-updated'));
}

// ── Partial update (merge any fields) ───────────────────────────────────────
// Used by useUpdateTheme, profile save, login, etc.
//
//   updateUiSession({ theme_color: "#dc2626" });
//   updateUiSession({ first_name: "Sai", profile: "/uploads/pic.jpg" });

export function updateUiSession(partial: Partial<UiSession>): void {
  const session = getUiSession();
  if (!session) return;
  const merged = { ...session, ...partial };
  writeCookie(merged);
}

// ── Profile picture shorthand (existing — unchanged) ────────────────────────

export function updateUiSessionProfile(newProfilePath: string): void {
  updateUiSession({ profile: newProfilePath });
}