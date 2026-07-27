// src/hooks/useDashboardTour.ts
//
// Production-grade tour hook.
// - Reads tour-seen flag from ui_session cookie (written at login)
// - Waits for the first data-tour DOM element before starting
// - Updates cookie immediately on finish/skip (no flicker on re-visit)
// - Persists to DB via PATCH /users/me/tour-seen (fire and forget)

import { useEffect, useCallback, useRef } from 'react';
import { profileApi } from '../api/employee/profile.api';
import { getUiSession, updateUiSession } from '../utils/uiSession';
import type { UiSession } from '../utils/uiSession';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourRole = 'employee' | 'hr' | 'attorney' | 'admin';

const TOUR_FLAG_MAP: Record<TourRole, keyof UiSession> = {
  employee: 'tour_employee_seen',
  hr:       'tour_hr_seen',
  attorney: 'tour_attorney_seen',
  admin:    'tour_admin_seen',
};

// First data-tour element per role — used to detect when DOM is ready
const FIRST_STEP_ID: Record<TourRole, string> = {
  employee: 'kpi',
  hr:       'hr-kpi',
  attorney: 'attorney-kpi',
  admin:    'admin-kpi',
};

// ── Wait for DOM element (polling — more reliable than MutationObserver) ──────

function waitForElement(selector: string, timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already in DOM
    if (document.querySelector(selector)) {
      resolve();
      return;
    }
    // Poll every 100ms
    const interval = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(interval);
        clearTimeout(timeout);
        resolve();
      }
    }, 100);
    // Give up after timeoutMs
    const timeout = setTimeout(() => {
      clearInterval(interval);
      reject(new Error(`[Tour] Element "${selector}" not found after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useDashboardTour(role: TourRole, startTour: () => void) {
  const fired        = useRef(false);
  const startTourRef = useRef(startTour);

  // Keep ref pointing at latest startTour to avoid stale closures
  useEffect(() => {
    startTourRef.current = startTour;
  }, [startTour]);

  useEffect(() => {
    if (fired.current) return;

    const session = getUiSession();
    if (!session) return;

    const flag = TOUR_FLAG_MAP[role];

    // Tour already seen — do nothing
    if (session[flag]) return;

    // Mark as fired so strict-mode double-invoke doesn't start tour twice
    fired.current = true;

    const selector = `[data-tour="${FIRST_STEP_ID[role]}"]`;

    waitForElement(selector)
      .then(() => {
        startTourRef.current();
      })
      .catch((err) => {
        console.warn(err.message);
        // Reset so it can try again on next render if needed
        fired.current = false;
      });
  }, [role]);  // startTour intentionally omitted — we use the ref

  const markSeen = useCallback(() => {
    // 1. Update cookie immediately — tour won't re-show this session
    updateUiSession({ [TOUR_FLAG_MAP[role]]: true });

    // 2. Persist to DB — fire and forget
    profileApi.markTourSeen(role).catch(() => {
      // Non-critical: if API fails, tour shows again on next login (acceptable)
    });
  }, [role]);

  return { markSeen };
}