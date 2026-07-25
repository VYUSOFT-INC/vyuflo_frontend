// src/hooks/useDashboardTour.ts
//
// Shared hook used by all 4 dashboard tour components.
// Persists "tour seen" in localStorage so closing/skipping/finishing
// prevents the tour from auto-starting on the next dashboard visit.
// Also best-effort PATCHes /users/me/tour-seen when the API supports it.

import { useEffect, useCallback, useRef } from 'react';
import { profileApi } from '../api/employee/profile.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourRole = 'employee' | 'hr' | 'attorney' | 'admin';

const TOUR_FLAG_MAP: Record<TourRole, keyof TourUser> = {
  employee: 'tour_employee_seen',
  hr:       'tour_hr_seen',
  attorney: 'tour_attorney_seen',
  admin:    'tour_admin_seen',
};

const storageKey = (role: TourRole) => `vyuflo:tour-seen:${role}`;

function readLocalSeen(role: TourRole): boolean {
  try {
    return localStorage.getItem(storageKey(role)) === '1';
  } catch {
    return false;
  }
}

function persistSeen(role: TourRole) {
  try {
    localStorage.setItem(storageKey(role), '1');
  } catch {
    // ignore quota / private-mode failures
  }
}

export interface TourUser {
  tour_employee_seen?: boolean;
  tour_hr_seen?:       boolean;
  tour_attorney_seen?: boolean;
  tour_admin_seen?:    boolean;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardTour(
  role:      TourRole,
  user:      TourUser | undefined | null,
  startTour: () => void,
) {
  // Guard against double-firing when parent re-renders
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;

    // Already dismissed on this device — never auto-start
    if (readLocalSeen(role)) return;

    // Wait for profile so we can honor DB flags on first visit
    if (!user) return;

    const flag = TOUR_FLAG_MAP[role];
    if (user[flag]) {
      persistSeen(role);
      return;
    }

    fired.current = true;
    const t = setTimeout(startTour, 900);
    return () => clearTimeout(t);
  }, [user, role, startTour]);

  // Call when user finishes or skips
  const markSeen = useCallback(() => {
    persistSeen(role);
    profileApi.markTourSeen(role).catch(() => {
      // Non-critical: localStorage already covers this device
    });
  }, [role]);

  return { markSeen };
}
