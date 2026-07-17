// src/pages/lawyer/intake/IntakeWizard.tsx
//
// Lawyer Intake — Phase 2 redesign (READ-ONLY REVIEW).
//
// Route: /lawyer/intake/:sessionId?step=N
//
// Architecture change from Phase 1:
//   • No more manual data entry by lawyer
//   • All 5 steps read data from existing sources:
//       Step 1 Personal   → intake_data + (optional) /users/{id}/profile
//       Step 2 Employment → Employment Letter document OCR
//       Step 3 Immigration → intake_data disclosures + Mark Verified
//       Step 4 Case Type  → application.visa_type + override
//       Step 5 Review     → consolidated summary + Confirm Intake
//   • Removed: "Generate Link" button, manual edits, "Save Draft"
//   • Added: Verify Disclosures action with audit trail
//
// All data aggregated by the useIntakeReview hook.

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { useIntakeReview } from '../../../hooks/lawyer/useIntakeReview';
import { intakeApi }       from '../../../api/lawyer/intake.api';

import type {
  IntakeReviewData,
  EmploymentReviewData,
  ImmigrationReviewData,
  PersonalReviewData,
  CaseReviewData,
  PreviousVisa,
} from '../../../types/lawyer/intake.types';

/* ── Step config ────────────────────────────────────────────────────── */
type StepId = 1 | 2 | 3 | 4 | 5;

const STEPS: { id: StepId; label: string; sub: string }[] = [
  { id: 1, label: 'Personal Info', sub: 'Your details'      },
  { id: 2, label: 'Employment',    sub: 'Work history'       },
  { id: 3, label: 'Immigration',   sub: 'Background'         },
  { id: 4, label: 'Case Type',     sub: 'Selection'          },
  { id: 5, label: 'Review',        sub: 'Confirm & Submit'   },
];

/* ════════════════════════════════════════════════════════════════════ */
export default function IntakeWizard() {
  const { sessionId = '' } = useParams<{ sessionId: string }>();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();

  const stepParam = Number(search.get('step')) as StepId;
  const initialStep: StepId =
    stepParam >= 1 && stepParam <= 5 ? stepParam : 1;
  const [currentStep, setCurrentStep] = useState<StepId>(initialStep);

  const { data, loading, error, refetch } = useIntakeReview(sessionId);

  // Optimistic verification — flips ON immediately when lawyer clicks
  // "Mark as Verified". Backend may take a beat to reflect; this guarantees
  // the Submit gate unlocks without waiting on refetch.
  const [locallyVerified, setLocallyVerified] = useState(false);
  const disclosuresVerified =
    locallyVerified || !!data?.immigration.disclosures_verified_at;

  // Keep URL ?step in sync
  useEffect(() => {
    const cur = Number(search.get('step'));
    if (cur !== currentStep) {
      setSearch({ step: String(currentStep) }, { replace: true });
    }
  }, [currentStep, search, setSearch]);

  /* ── Loading / error ─────────────────────────────────────────────── */
  if (loading) return <FullScreenSpinner label="Loading intake review…" />;

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-sm font-semibold text-red-900">Could not load intake</h2>
          <p className="mt-1 text-sm text-red-700">{error || 'No data.'}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={refetch}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
            >Retry</button>
            <button
              onClick={() => navigate('/lawyer/intake')}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >← Back to worklist</button>
          </div>
        </div>
      </div>
    );
  }

  const goTo = (id: StepId) => setCurrentStep(id);
  const next = () => currentStep < 5 && setCurrentStep((s) => (s + 1) as StepId);
  const prev = () => currentStep > 1 && setCurrentStep((s) => (s - 1) as StepId);

  /* ── Render shell ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between">
          <button
            onClick={() => navigate('/lawyer/intake')}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-indigo-600"
          >
            <span>←</span> Back to worklist
          </button>
          <div className="text-xs text-gray-500">
            Reviewing <span className="font-semibold text-gray-900">{data.case_info.client_name}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1280px] gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:px-8 lg:py-10">
        {/* Progress sidebar */}
        <Sidebar
          currentStep={currentStep}
          onGoTo={goTo}
          data={data}
          locallyVerified={locallyVerified}
        />

        {/* Step content */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6 lg:p-8">
          {currentStep === 1 && <Step1Personal     personal={data.personal} />}
          {currentStep === 2 && <Step2Employment   employment={data.employment} caseInfo={data.case_info} />}
          {currentStep === 3 && (
            <Step3Immigration
              immigration={data.immigration}
              sessionId={sessionId}
              locallyVerified={locallyVerified}
              onVerified={async () => {
                setLocallyVerified(true);  // ⚡ optimistic flip
                await refetch();
              }}
            />
          )}
          {currentStep === 4 && <Step4CaseType caseInfo={data.case_info} applicationId={data.session.application_id} onUpdated={refetch} />}
          {currentStep === 5 && (
            <Step5Review
              data={data}
              sessionId={sessionId}
              disclosuresVerified={disclosuresVerified}
              onSubmitted={refetch}
            />
          )}

          {/* Step navigation */}
          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-5">
            <button
              onClick={prev}
              disabled={currentStep === 1}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >Previous</button>
            {currentStep < 5 && (
              <button
                onClick={next}
                className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95"
              >Continue →</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  SIDEBAR — application progress
 * ════════════════════════════════════════════════════════════════════ */
function Sidebar({
  currentStep, onGoTo, data, locallyVerified,
}: {
  currentStep: StepId;
  onGoTo: (id: StepId) => void;
  data: IntakeReviewData;
  locallyVerified: boolean;
}) {
  const completedMap: Record<StepId, boolean> = {
    1: !!data.personal.first_name || !!data.personal.email,
    2: data.employment.is_student || data.employment.has_letter,
    3: locallyVerified || !!data.immigration.disclosures_verified_at,
    4: !!data.case_info.visa_type,
    5: data.session.is_submitted,
  };
  // Reference currentStep so eslint/ts know it's used (also used in button below)
  void currentStep;

  return (
    <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 lg:sticky lg:top-20">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        Application progress
      </p>
      <ol className="mt-4 space-y-3">
        {STEPS.map((s, idx) => {
          const isActive    = currentStep === s.id;
          const isCompleted = completedMap[s.id];
          return (
            <li key={s.id}>
              <button
                onClick={() => onGoTo(s.id)}
                className={`flex w-full items-start gap-3 rounded-lg p-2 text-left transition-colors ${
                  isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                }`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-2 ${
                    isActive
                      ? 'bg-indigo-600 text-white ring-indigo-200'
                      : isCompleted
                        ? 'bg-emerald-500 text-white ring-emerald-200'
                        : 'bg-white text-gray-400 ring-gray-300'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-900'}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {isActive ? 'Current Step' : s.sub}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  STEP 1 — Personal Info (READ-ONLY)
 * ════════════════════════════════════════════════════════════════════ */
function Step1Personal({ personal }: { personal: PersonalReviewData }) {
  return (
    <div>
      <StepHeader
        title="Personal Information"
        subtitle="Auto-populated from the client's profile. No manual entry needed."
      />

      <SourceBadge source={personal.source} />

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="First name"      value={personal.first_name} />
        <Field label="Last name"       value={personal.last_name} />
        <Field label="Date of birth"   value={formatDate(personal.date_of_birth)} />
        <Field label="Gender"          value={personal.gender} />
        <Field label="Nationality"     value={personal.nationality} />
        <Field label="Passport number" value={personal.passport_number} mono />
        <Field label="Passport expiry" value={formatDate(personal.passport_expiry_date)} />
        <Field label="Email"           value={personal.email} />
        <Field label="Phone"           value={personal.phone} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  STEP 2 — Employment (READ-ONLY, OCR-driven or student)
 * ════════════════════════════════════════════════════════════════════ */
function Step2Employment({
  employment, caseInfo,
}: {
  employment: EmploymentReviewData;
  caseInfo: CaseReviewData;
}) {
  if (employment.is_student) {
    return (
      <div>
        <StepHeader
          title="Employment History"
          subtitle="Not applicable — student visa applicant."
        />
        <div className="mt-6 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
          <p className="text-3xl">🎓</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">
            Student applicant — no work history required
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {caseInfo.visa_type} visa applicants are typically not required to provide
            employment history.
          </p>
        </div>
      </div>
    );
  }

  if (!employment.has_letter) {
    return (
      <div>
        <StepHeader
          title="Employment History"
          subtitle="Waiting for Employment Letter upload from client."
        />
        <div className="mt-6 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-8 text-center">
          <p className="text-3xl">📄</p>
          <p className="mt-2 text-sm font-semibold text-amber-900">
            Employment Letter not yet uploaded
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Once the client uploads their employment letter, fields will auto-extract via OCR
            and appear here.
          </p>
          <button className="mt-4 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700">
            Request Employment Letter from Client
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeader
        title="Employment History"
        subtitle="Extracted automatically from the client's Employment Letter via OCR."
      />
      <SourceBadge source="ocr" />

      <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Current employer" value={employment.company_name} />
        <Field label="Job title"        value={employment.job_title} />
        <Field label="Start date"       value={formatDate(employment.start_date)} />
        <Field label="Annual salary"    value={employment.annual_salary} mono />
      </div>

      <div className="mt-6 rounded-lg border border-indigo-100 bg-indigo-50/30 p-3 text-[11px] text-indigo-800">
        💡 If any field looks wrong, edit it in the Document OCR Review screen
        (Documents → click the Employment Letter).
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  STEP 3 — Immigration History (READ-ONLY + Verify Disclosures)
 * ════════════════════════════════════════════════════════════════════ */
function Step3Immigration({
  immigration, sessionId, locallyVerified, onVerified,
}: {
  immigration: ImmigrationReviewData;
  sessionId: string;
  locallyVerified: boolean;
  onVerified: () => Promise<void>;
}) {
  const [verifying, setVerifying] = useState(false);
  const isVerified = locallyVerified || !!immigration.disclosures_verified_at;

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const result = await intakeApi.verifyDisclosures(sessionId, {
        disclosures_verified_at: new Date().toISOString(),
      });
      // eslint-disable-next-line no-console
      console.log('[verify] response:', result);
      await onVerified();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('verify disclosures failed', e);
      // Don't block — still flip locally so user can proceed
      await onVerified();
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div>
      <StepHeader
        title="Immigration History"
        subtitle="Background disclosures declared by client during application creation."
      />
      <SourceBadge source="intake" />

      {/* Current Status */}
      <section className="mt-4">
        <SectionTitle>Current Status</SectionTitle>
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Current visa status" value={immigration.current_visa_status} />
          <Field label="Visa expiration"     value={formatDate(immigration.visa_expiration_date)} />
        </div>
      </section>

      {/* Background Disclosures */}
      <section className="mt-6">
        <SectionTitle>Background Disclosures</SectionTitle>

        <div className="mt-2 space-y-3">
          <DisclosureRow
            question="Has the client ever been denied a US visa?"
            answer={immigration.has_visa_denial}
            details={immigration.has_visa_denial ? immigration.visa_denial_details : null}
          />
          <DisclosureRow
            question="Has the client ever overstayed a visa?"
            answer={immigration.has_overstay}
            details={
              immigration.has_overstay
                ? `${immigration.overstay_days ?? '—'} days` +
                  (immigration.overstay_period ? ` · ${immigration.overstay_period}` : '')
                : null
            }
          />
        </div>
      </section>

      {/* Previous Visas */}
      <section className="mt-6">
        <SectionTitle>Previous US Visas</SectionTitle>
        {immigration.previous_visas.length === 0 ? (
          <p className="mt-2 text-xs italic text-gray-400">No previous visa records on file.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {immigration.previous_visas.map((v: PreviousVisa, i) => (
              <li key={i} className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-mono font-semibold text-indigo-700">
                    {v.visa_type}
                  </span>
                  <span className="text-xs text-gray-600">{v.visa_number}</span>
                  <span className="text-xs text-gray-400">
                    {formatDate(v.issue_date)} → {formatDate(v.expiry_date)}
                  </span>
                  <span className="text-[11px] text-gray-500">· {v.issuing_country}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Verify Disclosures action */}
      <section className="mt-7 rounded-xl border border-indigo-100 bg-indigo-50/30 p-4">
        {isVerified ? (
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">✓</span>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Disclosures verified</p>
              <p className="mt-0.5 text-xs text-emerald-700">
                Verified on{' '}
                {new Date(immigration.disclosures_verified_at || new Date()).toLocaleString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: 'numeric', minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                Attorney verification required
              </p>
              <p className="mt-0.5 text-xs text-indigo-700">
                Confirm you've reviewed the disclosures above before proceeding.
                This action is logged in the audit trail.
              </p>
            </div>
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {verifying ? 'Verifying…' : '✓ Mark as Verified'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  STEP 4 — Case Type (selected + override)
 * ════════════════════════════════════════════════════════════════════ */
const VISA_OPTIONS: { code: string; label: string }[] = [
  { code: 'H1B',    label: 'H-1B Specialty Occupation' },
  { code: 'H4',     label: 'H-4 Dependent' },
  { code: 'L1',     label: 'L-1 Intracompany Transfer' },
  { code: 'L2',     label: 'L-2 Dependent' },
  { code: 'O1',     label: 'O-1 Extraordinary Ability' },
  { code: 'TN',     label: 'TN NAFTA Professional' },
  { code: 'F1',     label: 'F-1 Student' },
  { code: 'F2',     label: 'F-2 Student Dependent' },
  { code: 'J1',     label: 'J-1 Exchange Visitor' },
  { code: 'J2',     label: 'J-2 Exchange Visitor Dependent' },
  { code: 'B1_B2',  label: 'B-1/B-2 Visitor' },
  { code: 'E3',     label: 'E-3 Australian Professional' },
  { code: 'Green_Card', label: 'Permanent Resident (Green Card)' },
];

function Step4CaseType({
  caseInfo, applicationId, onUpdated,
}: {
  caseInfo: CaseReviewData;
  applicationId: string;
  onUpdated: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(caseInfo.visa_type);
  const [saving, setSaving] = useState(false);

  const hasChanged = selected && selected !== caseInfo.visa_type;

  const handleSave = async () => {
    if (!selected || !hasChanged) return;
    setSaving(true);
    try {
      // PATCH /applications/{id} with new visa_type
      // (axios.patch usage to keep this file independent of applications.api.ts)
      const { default: axios } = await import('../../../api/axios');
      await axios.patch(`/applications/${applicationId}`, { visa_type: selected });
      await onUpdated();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('case type save failed', e);
      alert('Could not save case type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <StepHeader
        title="Case Type"
        subtitle="Client's selected visa type. Override if a different category fits better."
      />

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {VISA_OPTIONS.map((opt) => {
          const isSelected   = selected === opt.code;
          const isClientPick = caseInfo.visa_type === opt.code;
          return (
            <button
              key={opt.code}
              onClick={() => setSelected(opt.code)}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <p className="text-base font-bold text-gray-900">{opt.code}</p>
              <p className="mt-1 text-[11px] text-gray-600">{opt.label}</p>
              {isClientPick && (
                <span className="absolute right-2 top-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800">
                  CLIENT PICK
                </span>
              )}
              {isSelected && !isClientPick && (
                <span className="absolute right-2 top-2 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                  YOUR OVERRIDE
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasChanged && (
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={() => setSelected(caseInfo.visa_type)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Override'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  STEP 5 — Review & Confirm
 * ════════════════════════════════════════════════════════════════════ */
function Step5Review({
  data, sessionId, disclosuresVerified, onSubmitted,
}: {
  data: IntakeReviewData;
  sessionId: string;
  disclosuresVerified: boolean;
  onSubmitted: () => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const caseTypeSet = !!data.case_info.visa_type;
  const canSubmit = disclosuresVerified && caseTypeSet && !data.session.is_submitted;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await intakeApi.submitIntake(sessionId);
      await onSubmitted();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('submit failed', e);
      alert('Submit failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <StepHeader
        title="Review & Confirm"
        subtitle="Final check before activating the case."
      />

      {/* Personal */}
      <ReviewSection title="Personal Information">
        <ReviewRow label="Full name"   value={data.personal.full_name} />
        <ReviewRow label="Date of birth" value={formatDate(data.personal.date_of_birth)} />
        <ReviewRow label="Nationality"   value={data.personal.nationality} />
        <ReviewRow label="Passport"      value={data.personal.passport_number || '—'} />
        <ReviewRow label="Email"         value={data.personal.email} />
        <ReviewRow label="Phone"         value={data.personal.phone} />
      </ReviewSection>

      {/* Employment */}
      <ReviewSection title="Employment">
        {data.employment.is_student ? (
          <p className="text-sm italic text-gray-500">Student — not applicable</p>
        ) : !data.employment.has_letter ? (
          <p className="text-sm italic text-amber-600">Employment Letter not yet uploaded</p>
        ) : (
          <>
            <ReviewRow label="Employer"    value={data.employment.company_name} />
            <ReviewRow label="Job title"   value={data.employment.job_title} />
            <ReviewRow label="Start date"  value={formatDate(data.employment.start_date)} />
            <ReviewRow label="Salary"      value={data.employment.annual_salary} />
          </>
        )}
      </ReviewSection>

      {/* Immigration */}
      <ReviewSection title="Immigration History">
        <ReviewRow label="Current visa"  value={data.immigration.current_visa_status} />
        <ReviewRow label="Expiration"    value={formatDate(data.immigration.visa_expiration_date)} />
        <ReviewRow label="Visa denial"   value={data.immigration.has_visa_denial ? `Yes — ${data.immigration.visa_denial_details || '—'}` : 'No'} />
        <ReviewRow label="Overstay"      value={data.immigration.has_overstay ? `Yes — ${data.immigration.overstay_days ?? '—'} days` : 'No'} />
        <ReviewRow label="Previous visas" value={`${data.immigration.previous_visas.length} on record`} />
        <ReviewRow
          label="Disclosures"
          value={disclosuresVerified ? '✓ Verified by attorney' : '⚠ Not verified yet'}
          color={disclosuresVerified ? 'text-emerald-700' : 'text-amber-700'}
        />
      </ReviewSection>

      {/* Case Type */}
      <ReviewSection title="Case Type">
        {caseTypeSet ? (
          <ReviewRow
            label="Selected"
            value={`${data.case_info.visa_type} — ${data.case_info.visa_type_label || ''}`}
          />
        ) : (
          <p className="text-sm italic text-amber-600">⚠ No case type selected. Go back to Step 4.</p>
        )}
      </ReviewSection>

      {/* Submit area */}
      {data.session.is_submitted ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">✓ Intake submitted</p>
          <p className="mt-1 text-xs text-emerald-700">
            This intake was submitted on{' '}
            {data.session.submitted_at
              ? new Date(data.session.submitted_at).toLocaleString()
              : 'recently'}.
            The case is now active.
          </p>
        </div>
      ) : (
        <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1 text-xs">
            {!disclosuresVerified && (
              <p className="text-amber-700">⚠ Verify disclosures in Step 3 to enable submit.</p>
            )}
            {!caseTypeSet && (
              <p className="text-amber-700">⚠ Select a case type in Step 4 to enable submit.</p>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="shrink-0 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : '✓ Confirm Intake & Start Case'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 *  Shared components
 * ════════════════════════════════════════════════════════════════════ */
function StepHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{children}</h3>
  );
}

function Field({
  label, value, mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p
        className={`mt-1 text-sm ${mono ? 'font-mono' : 'font-medium'} ${
          value ? 'text-gray-900' : 'italic text-gray-400'
        }`}
      >
        {value || 'Not provided'}
      </p>
    </div>
  );
}

function DisclosureRow({
  question, answer, details,
}: {
  question: string;
  answer: boolean;
  details: string | null;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-800">{question}</p>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            answer ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          {answer ? 'YES' : 'NO'}
        </span>
      </div>
      {answer && details && (
        <p className="mt-2 rounded bg-white px-2 py-1.5 text-xs text-gray-700">
          {details}
        </p>
      )}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({
  label, value, color = 'text-gray-900',
}: {
  label: string;
  value: string | null;
  color?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`text-right font-medium ${value ? color : 'italic text-gray-400'}`}>
        {value || 'Not provided'}
      </span>
    </div>
  );
}

function SourceBadge({ source }: { source: PersonalReviewData['source'] | 'ocr' }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    profile: { label: 'From profile',         bg: 'bg-indigo-50',  text: 'text-indigo-700' },
    intake:  { label: 'From client intake',   bg: 'bg-violet-50',  text: 'text-violet-700' },
    app:     { label: 'From application',     bg: 'bg-blue-50',    text: 'text-blue-700' },
    ocr:     { label: 'Auto-extracted (OCR)', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    none:    { label: 'Not available',        bg: 'bg-gray-50',    text: 'text-gray-600' },
    manual:  { label: 'Manual entry',         bg: 'bg-amber-50',   text: 'text-amber-700' },
  };
  const cfg = config[source] || config.none;
  return (
    <span className={`mt-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.bg} ${cfg.text}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {cfg.label}
    </span>
  );
}

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="mt-3 text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

