// src/hooks/lawyer/useIntakeReview.ts
//
// Parallel data fetcher for the Phase 2 Lawyer Intake Review screens.
//
// Pulls from ALL existing endpoints in parallel, aggregates them, and
// returns a single IntakeReviewData shape that the IntakeWizard renders.
//
// Sources:
//   1. GET /intake/sessions/{session_id}          → session + intake_data
//   2. GET /lawyer/applications                    → find the app + visa_type
//   3. GET /documents/filter?application_id=...    → all uploaded docs
//   4. GET /documents/{id}/ocr-fields              → for Employment Letter
//   5. GET /users/{user_id}/profile (best-effort)  → phone, country, etc.
//
// Missing fields gracefully degrade (null / "Not provided"). No crashes.

import { useCallback, useEffect, useState } from 'react';

import axios from '../../api/axios';
import { intakeApi }    from '../../api/lawyer/intake.api';
import { documentsApi } from '../../api/lawyer/documents.api';

import type {
  IntakeReviewData,
  IntakeSession,
  AssignedApplication,
  EmploymentReviewData,
  ImmigrationReviewData,
  PersonalReviewData,
  CaseReviewData,
} from '../../types/lawyer/intake.types';
import type {
  Document,
  DocumentListResponse,
  OcrField,
} from '../../types/lawyer/documents.types';

/* ── User profile shape (subset we care about) ──────────────────────── */
interface UserProfile {
  full_legal_name:      string | null;
  nationality:          string | null;
  country_of_residence: string | null;
  date_of_birth:        string | null;
  gender:               string | null;
  phone_number:         string | null;
  country_code:         string | null;
}

/* ── Hook return shape ──────────────────────────────────────────────── */
export interface UseIntakeReviewResult {
  data:     IntakeReviewData | null;
  loading:  boolean;
  error:    string | null;
  refetch:  () => Promise<void>;
}

/* ════════════════════════════════════════════════════════════════════ */
export function useIntakeReview(sessionId: string): UseIntakeReviewResult {
  const [data, setData]       = useState<IntakeReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sessionId) {
      setError('Missing session ID.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // ── 1. Session (the spine — has application_id + intake_data) ──
      const session: IntakeSession = await intakeApi.getIntakeSession(sessionId);

      // ── 2. Assigned applications (find this app for context) ──────
      const assigned: AssignedApplication[] = await intakeApi
        .listAssignedApplications()
        .catch(() => []);
      const app = assigned.find((a) => a.application_id === session.application_id);

      // ── 3. Documents + OCR (parallel) ─────────────────────────────
      const docs: Document[] = await documentsApi
        .filterDocuments({ application_id: session.application_id })
        .then((r: DocumentListResponse) => r.items || [])
        .catch(() => [] as Document[]);

      // Find employment letter (best-effort match by document_type)
      const employmentLetter = docs.find((d) =>
        (d.document_type || '').toLowerCase().includes('employment') ||
        (d.document_type || '').toLowerCase().includes('offer'),
      );

      let employmentOcr: OcrField[] = [];
      if (employmentLetter) {
        employmentOcr = await documentsApi
          .getOcrFields(employmentLetter.id)
          .catch(() => []);
      }

      // ── 4. User profile (best-effort — needs user_id) ─────────────
      let profile: UserProfile | null = null;
      const userIdFromApp =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (app as any)?.user_id || app?.client_id;
      if (userIdFromApp) {
        try {
          const res = await axios.get<UserProfile>(`/users/${userIdFromApp}/profile`);
          profile = res.data;
        } catch {
          /* user_id may not be exposed yet — skip silently */
        }
      }

      // ── 5. Aggregate into IntakeReviewData ────────────────────────
      const result = aggregate(session, app, profile, employmentOcr);
      setData(result);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      if (status === 401)      setError('Session expired. Please log in again.');
      else if (status === 403) setError('You do not have permission to view this intake.');
      else if (status === 404) setError('Intake session not found.');
      else if (e instanceof Error) setError(e.message);
      else setError('Could not load intake data.');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refetch: load };
}

/* ════════════════════════════════════════════════════════════════════
 *  Aggregator — builds IntakeReviewData from raw responses
 * ════════════════════════════════════════════════════════════════════ */
function aggregate(
  session: IntakeSession,
  app: AssignedApplication | undefined,
  profile: UserProfile | null,
  employmentOcr: OcrField[],
): IntakeReviewData {
  const intake = session.intake_data;

  /* ── Personal info ─────────────────────────────────────────────── */
  const fullName =
    profile?.full_legal_name ||
    (intake && (intake.first_name || intake.last_name)
      ? `${intake.first_name || ''} ${intake.last_name || ''}`.trim()
      : null) ||
    app?.client_name ||
    'Unnamed Client';

  const phone =
    profile?.phone_number
      ? `${profile.country_code || ''} ${profile.phone_number}`.trim()
      : null;

  const personal: PersonalReviewData = {
    full_name:            fullName,
    first_name:           intake?.first_name || '',
    last_name:            intake?.last_name  || '',
    date_of_birth:        intake?.date_of_birth        || profile?.date_of_birth || null,
    gender:               intake?.gender               || profile?.gender        || null,
    nationality:          intake?.nationality          || profile?.nationality   || null,
    passport_number:      intake?.passport_number      || null,
    passport_expiry_date: intake?.passport_expiry_date || null,
    email:                intake?.email                || app?.client_email      || '',
    phone,
    source: profile ? 'profile' : intake ? 'intake' : 'app',
  };

  /* ── Employment ────────────────────────────────────────────────── */
  const isStudent =
    !!app?.visa_type && /^(f1|f2|j1|j2)$/i.test(app.visa_type);

  const findOcrValue = (...keywords: string[]): string | null => {
    for (const f of employmentOcr) {
      const name = (f.field_name || '').toLowerCase();
      if (keywords.some((k) => name.includes(k))) {
        return f.extracted_value || null;
      }
    }
    return null;
  };

  const hasLetter = employmentOcr.length > 0;
  const employment: EmploymentReviewData = {
    has_letter:    hasLetter,
    letter_doc_id: hasLetter ? employmentOcr[0].document_id : null,
    company_name:  findOcrValue('company', 'employer'),
    job_title:     findOcrValue('job', 'title', 'position', 'role'),
    start_date:    findOcrValue('start', 'date'),
    annual_salary: findOcrValue('salary', 'compensation', 'wage'),
    is_student:    isStudent,
    source:        hasLetter ? 'ocr' : (isStudent ? 'none' : 'manual'),
  };

  /* ── Immigration ───────────────────────────────────────────────── */
  const immigration: ImmigrationReviewData = {
    current_visa_status:                 intake?.current_visa_status  || app?.visa_type || null,
    visa_expiration_date:                intake?.visa_expiration_date || null,
    has_visa_denial:                     intake?.has_visa_denial      || false,
    visa_denial_details:                 intake?.visa_denial_details  || null,
    has_overstay:                        intake?.has_overstay         || false,
    overstay_days:                       intake?.overstay_days   ?? null,
    overstay_period:                     intake?.overstay_period ?? null,
    previous_visas:                      intake?.previous_visas  ?? [],
    disclosures_verified_at:             intake?.disclosures_verified_at             ?? null,
    disclosures_verified_by_attorney_id: intake?.disclosures_verified_by_attorney_id ?? null,
  };

  /* ── Case info ─────────────────────────────────────────────────── */
  const case_info: CaseReviewData = {
    application_id:  session.application_id,
    visa_type:       app?.visa_type       || null,
    visa_type_label: app?.visa_type_label || null,
    client_name:     app?.client_name     || fullName,
    client_email:    app?.client_email    || personal.email,
    status:          app?.status          || null,
  };

  return { session, personal, employment, immigration, case_info };
}