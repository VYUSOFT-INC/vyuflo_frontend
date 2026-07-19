// src/hooks/useDashboardTour.ts
//
// Shared hook used by all 4 dashboard tour components.
// Reads the tour-seen flag from the user profile (DB-backed, not localStorage).
// Calls PATCH /users/me/tour-seen via profileApi when the user finishes or skips.

import { useEffect, useCallback, useRef } from 'react';
import { profileApi } from '../api/employee/profile.api';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourRole = 'employee' | 'hr' | 'attorney' | 'admin';

const TOUR_FLAG_MAP: Record<TourRole, string> = {
  employee: 'tour_employee_seen',
  hr:       'tour_hr_seen',
  attorney: 'tour_attorney_seen',
  admin:    'tour_admin_seen',
};

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
    if (!user || fired.current) return;

    const flag = TOUR_FLAG_MAP[role] as keyof TourUser;

    // Treat any falsy value (undefined, false) as "tour not yet seen"
    if (!user[flag]) {
      fired.current = true;
      const t = setTimeout(startTour, 900);
      return () => clearTimeout(t);
    }
  }, [user, role, startTour]);

  // Call when user finishes or skips — fire and forget
  const markSeen = useCallback(() => {
    profileApi.markTourSeen(role).catch(() => {
      // Non-critical: if the request fails the tour just shows again
      // on next login, which is acceptable fallback behaviour
    });
  }, [role]);

  return { markSeen };
}