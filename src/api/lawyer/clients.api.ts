// src/api/lawyer/clients.api.ts
//
// Client profile aggregator for the Lawyer scope.
//
// Strategy (works without backend changes):
//   1. The URL param can be EITHER application_id OR client_id (user_id).
//      We look it up against the lawyer's HR-assigned applications list.
//   2. If found → use the application data as the base profile
//      (client_name, client_email, visa_type, status — all already there).
//   3. If app.client_id (user_id) is present, ALSO fetch /users/{id}/profile
//      and merge those richer personal-info fields in.
//   4. If client_id is NOT present yet (backend gap), we still render the
//      profile with whatever the assigned application has.
//
// SECURITY: Lawyer can ONLY view profiles whose application is in their
// HR-assigned list. Otherwise 403.

import axios from '../axios';
import { intakeApi } from './intake.api';
import type {
  ClientProfileResponse,
  ActiveCaseSnapshot,
} from '../../types/lawyer/clients.types';
import type { AssignedApplication } from '../../types/lawyer/intake.types';

/* ── Shape returned by GET /users/{user_id}/profile ─────────────────── */
interface UserProfileApiResponse {
  id:                   string;
  user_id:              string;
  full_legal_name:      string | null;
  nationality:          string | null;
  country_of_residence: string | null;
  date_of_birth:        string | null;
  gender:               string | null;
  profile_picture_url:  string | null;
  timezone:             string | null;
  preferred_language:   string | null;
  onboarding_step:      number;
  onboarding_completed: boolean;
  created_at:           string;
  updated_at:           string;
  phone_number:         string | null;
  country_code:         string | null;
}

/* ════════════════════════════════════════════════════════════════════
 * Main entrypoint
 *
 * `idParam` can be EITHER an application_id OR a user_id (client_id).
 * We try both — assigned applications list is the source of truth.
 * ════════════════════════════════════════════════════════════════════ */
export async function getClientProfile(
  idParam: string,
): Promise<ClientProfileResponse> {
  // ── Step 1: Fetch HR-assigned applications (security boundary) ────
  const assigned = await intakeApi.listAssignedApplications();

  // Match by application_id first (always present), then fall back to
  // client_id (may not be shipped yet by backend).
  const app: AssignedApplication | undefined =
    assigned.find((a) => a.application_id === idParam) ||
    assigned.find((a) => a.client_id === idParam);

  if (!app) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err: any = new Error('Client is not in your HR-assigned cases.');
    err.response = { status: 403 };
    throw err;
  }

  // ── Step 2: Try multiple endpoints to discover user_id ───────────
  // Backend hasn't shipped user_id in /lawyer/applications response yet.
  // Try every possible path that might expose it.
  let userId: string | null = extractUserId(app);
  // eslint-disable-next-line no-console
  console.log('[clients.api] user_id from app:', userId, 'app object:', app);

  // 2a. Try lawyer-scoped application detail endpoint
  if (!userId) {
    const candidatePaths = [
      `/lawyer/applications/${app.application_id}`,
      `/lawyer/applications/${app.application_id}/detail`,
      `/lawyer/clients/${app.application_id}`,
    ];
    for (const path of candidatePaths) {
      try {
        const res = await axios.get(path);
        userId = extractUserId(res.data as AssignedApplication);
        if (userId) {
          // eslint-disable-next-line no-console
          console.log('[clients.api] user_id from', path, ':', userId);
          break;
        }
      } catch {
        /* endpoint may not exist — try next */
      }
    }
  }

  // ── Step 2d: First profile fetch attempt with directly extracted ─
  let userProfile: UserProfileApiResponse | null = null;
  if (userId) {
    try {
      const res = await axios.get<UserProfileApiResponse>(
        `/users/${userId}/profile`,
      );
      userProfile = res.data;
      // eslint-disable-next-line no-console
      console.log('[clients.api] profile fetched (early):', userProfile);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Profile fetch (early) failed — will try other sources', e);
    }
  }

  // ── Step 2b: Try intake session for user_id discovery ────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let intakeData: any = null;
  if (app.intake_session_id) {
    try {
      const session = await intakeApi.getIntakeSession(app.intake_session_id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as any;
      intakeData = s?.intake_data || null;
      // eslint-disable-next-line no-console
      console.log('[clients.api] intake session response:', s);

      // Look for user_id deep in the session response
      if (!userId) {
        userId =
          s?.user_id ||
          s?.application?.user_id ||
          s?.application?.client_id ||
          s?.applicant_id ||
          intakeData?.user_id ||
          null;
        if (userId) {
          // eslint-disable-next-line no-console
          console.log('[clients.api] user_id from session:', userId);
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Intake session fetch failed', e);
    }
  }

  // ── Step 2c: With user_id (from any source) → fetch profile ──────
  if (userId && !userProfile) {
    try {
      const res = await axios.get<UserProfileApiResponse>(
        `/users/${userId}/profile`,
      );
      userProfile = res.data;
      // eslint-disable-next-line no-console
      console.log('[clients.api] profile fetched:', userProfile);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Profile fetch with discovered user_id failed', e);
    }
  }

  // ── Step 3: Build the response (profile > intake_data > app data)
  return buildProfile(app, userProfile, intakeData, assigned);
}

/* ── User-id discovery — try every reasonable field name ───────────── */
function extractUserId(app: AssignedApplication): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const a = app as any;
  const candidates = [
    a.user_id,
    a.client_id,
    a.applicant_id,
    a.employee_id,
    a.client_user_id,
    a.applicant?.id,
    a.user?.id,
    a.client?.id,
    a.employee?.id,
  ];
  // Pick the first one that looks like a UUID
  for (const c of candidates) {
    if (typeof c === 'string' && /^[0-9a-f-]{32,36}$/i.test(c)) return c;
  }
  return null;
}

/* ── Builder ─────────────────────────────────────────────────────────── */
function buildProfile(
  app: AssignedApplication,
  profile: UserProfileApiResponse | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intakeData: any,
  allApps: AssignedApplication[],
): ClientProfileResponse {
  // Combine first + last name from intake_data if profile not available
  const intakeFullName =
    intakeData && (intakeData.first_name || intakeData.last_name)
      ? `${intakeData.first_name || ''} ${intakeData.last_name || ''}`.trim()
      : null;

  const fullName =
    profile?.full_legal_name ||
    intakeFullName ||
    app.client_name ||
    app.client_email ||
    'Unnamed Client';

  // Phone is only in user_profiles — intake_data does NOT have it.
  const phone =
    profile?.phone_number
      ? `${profile.country_code || ''} ${profile.phone_number}`.trim()
      : null;

  // Cases scope = all assigned apps for THIS client (matched by email,
  // since client_id may not be present everywhere yet).
  const clientApps = allApps.filter(
    (a) =>
      (a.client_id && app.client_id && a.client_id === app.client_id) ||
      a.client_email === app.client_email,
  );

  const activeCase: ActiveCaseSnapshot = {
    case_id:          app.application_id,
    case_number:      formatCaseNumber(app.application_id, app.visa_type),
    visa_type_name:   app.visa_type_label || app.visa_type || null,
    status:           humanizeStatus(app.status),
    progress_percent: estimateProgress(app.status, app.intake_step),
    current_stage:    stageFromStatus(app.status),
    due_date:         null,
  };

  return {
    // Identity — fall back to application_id if no user_id available yet
    client_id:            app.client_id || app.application_id,
    full_name:            fullName,
    initials:             initialsOf(fullName),
    profile_picture_url:  profile?.profile_picture_url ?? null,

    // Contact
    email:                app.client_email || intakeData?.email || null,
    phone,

    // Personal info — prefer profile, fallback to intake_data
    nationality:          profile?.nationality          ?? intakeData?.nationality   ?? null,
    country_of_residence: profile?.country_of_residence ?? null,
    date_of_birth:        profile?.date_of_birth        ?? intakeData?.date_of_birth ?? null,
    gender:               profile?.gender               ?? intakeData?.gender        ?? null,

    // Preferences
    timezone:             profile?.timezone           ?? null,
    preferred_language:   profile?.preferred_language ?? null,

    // Onboarding
    onboarding_step:      profile?.onboarding_step      ?? null,
    onboarding_completed: profile?.onboarding_completed ?? null,

    // Timestamps — fall back to assigned_at from app if no profile
    client_since:         profile?.created_at || app.assigned_at || null,
    updated_at:           profile?.updated_at || null,

    // Case context — derived from all assigned apps for this client
    current_visa_status:  app.visa_type,
    total_cases:          clientApps.length,
    active_cases:         clientApps.filter((a) => a.status !== 'intake_completed').length,
    active_case:          activeCase,
  };
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function humanizeStatus(s: string): string {
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function estimateProgress(status: string, intakeStep: number | null): number {
  if (status === 'intake_completed') return 100;
  if (intakeStep && intakeStep > 0) return Math.min(100, intakeStep * 20);
  if (status === 'intake_in_progress') return 40;
  if (status === 'pending_intake')     return 10;
  return 0;
}

function stageFromStatus(status: string): string | null {
  switch (status) {
    case 'pending_intake':     return 'Awaiting intake';
    case 'intake_in_progress': return 'Intake in progress';
    case 'intake_completed':   return 'Intake complete — case active';
    default:                   return null;
  }
}

function formatCaseNumber(applicationId: string, visaType: string | null): string {
  const short = applicationId.slice(0, 8).toUpperCase();
  return visaType ? `#${visaType}-${short}` : `#VF-${short}`;
}

export const clientsApi = {
  getClientProfile,
};