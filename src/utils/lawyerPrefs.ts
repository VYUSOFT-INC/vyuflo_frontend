// src/utils/lawyerPrefs.ts
//
// Local-storage fallback for the Notification + AI Extraction settings tabs.
// Backend endpoints for these don't exist yet — once they do, swap the read
// path to the API and seed localStorage from the server response. The UI
// shape stays the same so component code won't need to change.

/* ─── Types ─────────────────────────────────────────────────────── */

export interface NotificationPrefRow {
  id:     string;       // 'pending_reviews' | 'action_required' | 'new_messages'
  title:  string;
  hint:   string;
  in_app: boolean;
  email:  boolean;
}

export interface NotificationPrefs {
  rows: NotificationPrefRow[];
}

export interface AIExtractionPrefs {
  auto_highlight_key_terms: boolean;
  pre_fill_review_forms:    boolean;
  smart_doc_summaries:      boolean;
}

/* ─── Defaults (used when nothing is in localStorage yet) ───────── */

export const DEFAULT_NOTIF_PREFS: NotificationPrefs = {
  rows: [
    {
      id:     'pending_reviews',
      title:  'Pending Reviews',
      hint:   'Notify me when new documents are assigned to my queue.',
      in_app: true,
      email:  true,
    },
    {
      id:     'action_required',
      title:  'Action Required Alerts',
      hint:   'Notify me when a client re-uploads a rejected document.',
      in_app: true,
      email:  true,
    },
    {
      id:     'new_messages',
      title:  'New Messages',
      hint:   'Notify me when a client sends a direct message.',
      in_app: true,
      email:  false,
    },
  ],
};

export const DEFAULT_AI_PREFS: AIExtractionPrefs = {
  auto_highlight_key_terms: true,
  pre_fill_review_forms:    true,
  smart_doc_summaries:      false,
};

/* ─── Read / write helpers ──────────────────────────────────────── */

const NOTIF_KEY = 'Vyuflo.lawyer.notif_prefs.v1';
const AI_KEY    = 'Vyuflo.lawyer.ai_prefs.v1';

function safeReadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed as T : fallback;
  } catch { return fallback; }
}

function safeWriteJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* quota / private-mode — ignore */ }
}

/** Reads stored notification prefs, falling back to DEFAULTS while
 *  preserving the canonical row order/titles in case the user has a
 *  stale shape from an earlier version. */
export function readNotifPrefs(): NotificationPrefs {
  const stored = safeReadJSON<NotificationPrefs>(NOTIF_KEY, DEFAULT_NOTIF_PREFS);
  const byId = new Map<string, NotificationPrefRow>();
  (stored.rows || []).forEach((r) => byId.set(r.id, r));
  return {
    rows: DEFAULT_NOTIF_PREFS.rows.map((d) => {
      const found = byId.get(d.id);
      return found ? { ...d, in_app: !!found.in_app, email: !!found.email } : d;
    }),
  };
}

export function writeNotifPrefs(prefs: NotificationPrefs): void {
  safeWriteJSON(NOTIF_KEY, prefs);
}

export function readAIPrefs(): AIExtractionPrefs {
  return safeReadJSON<AIExtractionPrefs>(AI_KEY, DEFAULT_AI_PREFS);
}

export function writeAIPrefs(prefs: AIExtractionPrefs): void {
  safeWriteJSON(AI_KEY, prefs);
}