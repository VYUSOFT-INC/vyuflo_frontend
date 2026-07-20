// // src/utils/uiSession.ts

// export interface UiSession {
//   user_id:    string;
//   first_name: string;
//   last_name:  string;
//   email:      string;
//   profile:    string | null;
//   roles:      string[];
//   theme_color: string;
//   tour_employee_seen: boolean;
//   tour_hr_seen:       boolean;
//   tour_attorney_seen: boolean;
//   tour_admin_seen:    boolean;
// }

// // ── Read ─────────────────────────────────────────────────────────────────────

// export function getUiSession(): UiSession | null {
//   const match = document.cookie
//     .split('; ')
//     .find(row => row.startsWith('ui_session='));
//   if (!match) return null;
//   try {
//     let raw = match.split('=').slice(1).join('=');
//     raw = decodeURIComponent(raw);
//     if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
//     const decoded = atob(raw);
//     const parsed = JSON.parse(decoded) as UiSession;

//     if (!parsed.user_id)    parsed.user_id    = '';
//     if (!parsed.theme_color) parsed.theme_color = '#4f46e5';

//     // Backfill tour flags for cookies set before these fields existed
//     parsed.tour_employee_seen = parsed.tour_employee_seen ?? false;
//     parsed.tour_hr_seen       = parsed.tour_hr_seen       ?? false;
//     parsed.tour_attorney_seen = parsed.tour_attorney_seen ?? false;
//     parsed.tour_admin_seen    = parsed.tour_admin_seen    ?? false;

//     return parsed;
//   } catch {
//     return null;
//   }
// }

// // ── Write (full replace) ──────────────────────────────────────────────────────

// function writeCookie(session: UiSession): void {
//   const maxAge = 60 * 60 * 24 * 7; // 7 days
//   const encoded = btoa(JSON.stringify(session));
//   document.cookie = `ui_session=${encoded}; path=/; max-age=${maxAge}; samesite=lax`;
//   window.dispatchEvent(new Event('ui-session-updated'));
// }

// // ── Partial update (merge any fields) ────────────────────────────────────────

// export function updateUiSession(partial: Partial<UiSession>): void {
//   const session = getUiSession();
//   if (!session) return;
//   const merged = { ...session, ...partial };
//   writeCookie(merged);
// }

// // ── Profile picture shorthand ─────────────────────────────────────────────────

// export function updateUiSessionProfile(newProfilePath: string): void {
//   updateUiSession({ profile: newProfilePath });
// }
// src/utils/uiSession.ts

export interface UiSession {
  user_id:            string;
  first_name:         string;
  last_name:          string;
  email:              string;
  profile:            string | null;
  roles:              string[];
  theme_color:        string;
  tour_employee_seen: boolean;
  tour_hr_seen:       boolean;
  tour_attorney_seen: boolean;
  tour_admin_seen:    boolean;
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function getUiSession(): UiSession | null {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('ui_session='));
  if (!match) return null;
  try {
    let raw = match.split('=').slice(1).join('=');
    raw = decodeURIComponent(raw);
    if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
    const decoded = atob(raw);
    const parsed  = JSON.parse(decoded) as UiSession;

    // Backfill missing fields for cookies written before these existed
    if (!parsed.user_id)     parsed.user_id     = '';
    if (!parsed.theme_color) parsed.theme_color = '#4f46e5';
    parsed.tour_employee_seen = parsed.tour_employee_seen ?? false;
    parsed.tour_hr_seen       = parsed.tour_hr_seen       ?? false;
    parsed.tour_attorney_seen = parsed.tour_attorney_seen ?? false;
    parsed.tour_admin_seen    = parsed.tour_admin_seen    ?? false;

    return parsed;
  } catch {
    return null;
  }
}

// ── Internal writer ───────────────────────────────────────────────────────────

function writeCookie(session: UiSession): void {
  const maxAge  = 60 * 60 * 24 * 7; // 7 days
  const encoded = btoa(JSON.stringify(session));
  document.cookie = `ui_session=${encoded}; path=/; max-age=${maxAge}; samesite=lax`;
  window.dispatchEvent(new Event('ui-session-updated'));
}

// ── Write from scratch — use after login/SSO ──────────────────────────────────
// Builds the full cookie from the login API response.
// Does NOT read an existing cookie — avoids race condition.

export function writeUiSessionFromLogin(data: {
  user:               { id: string; first_name: string; last_name: string; email: string };
  profile:            string | null;
  roles:              string[];
  theme_color:        string | null;
  tour_employee_seen: boolean;
  tour_hr_seen:       boolean;
  tour_attorney_seen: boolean;
  tour_admin_seen:    boolean;
}): void {
  writeCookie({
    user_id:            data.user.id,
    first_name:         data.user.first_name,
    last_name:          data.user.last_name,
    email:              data.user.email,
    profile:            data.profile,
    roles:              data.roles,
    theme_color:        data.theme_color ?? '#4f46e5',
    tour_employee_seen: data.tour_employee_seen ?? false,
    tour_hr_seen:       data.tour_hr_seen       ?? false,
    tour_attorney_seen: data.tour_attorney_seen ?? false,
    tour_admin_seen:    data.tour_admin_seen    ?? false,
  });
}

// ── Partial update — use for theme changes, tour flags, profile pic ───────────

export function updateUiSession(partial: Partial<UiSession>): void {
  const session = getUiSession();
  if (!session) return;
  writeCookie({ ...session, ...partial });
}

// ── Shorthand ─────────────────────────────────────────────────────────────────

export function updateUiSessionProfile(newProfilePath: string): void {
  updateUiSession({ profile: newProfilePath });
}