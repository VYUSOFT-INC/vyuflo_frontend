// src/pages/lawyer/clients/ClientProfilePage.tsx
//
// Client Profile — shows ONLY fields that actually come from the backend.
//
// Route: /lawyer/clients/:clientId
//
// Data sources (aggregated by clients.api.ts):
//   • GET /lawyer/applications      → HR-assigned scope (security boundary)
//   • GET /users/{user_id}/profile  → user profile row
//   • GET /documents?application_id → per-case document list
//
// SECURITY: 403 if the client is not in the lawyer's HR-assigned list →
// no mock fallback, explicit "access restricted" card.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { clientsApi } from '../../../api/lawyer/clients.api';
import { intakeApi }  from '../../../api/lawyer/intake.api';
import { documentsApi } from '../../../api/lawyer/documents.api';
import type { ClientProfileResponse } from '../../../types/lawyer/clients.types';
import type { AssignedApplication } from '../../../types/lawyer/intake.types';
import type { Document } from '../../../types/lawyer/documents.types';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { readLocalCases, seedToAssignedApp } from '../../../lib/lawyerLocalCases';

/** True when this profile came from a locally-created wizard seed (not backend). */
function isLocalProfile(profile: ClientProfileResponse): boolean {
  return readLocalCases().some(
    (c) => c.client_user_id === profile.client_id || c.id === profile.client_id,
  );
}

/** Build a minimal ClientProfileResponse from a local (wizard-created) case
 *  so lawyers can still open "View Profile" for cases they created
 *  themselves — even though those clients aren't in the HR-assigned list
 *  yet. */
function buildLocalProfile(clientId: string): ClientProfileResponse | null {
  const seeds = readLocalCases().filter(
    (c) => c.client_user_id === clientId || c.id === clientId,
  );
  if (seeds.length === 0) return null;

  // Newest seed drives the hero. Older ones show as extra cases in the tab.
  const primary = seeds[0];
  const firstName = (primary.client_name.split(' ')[0] || '').trim();
  const lastName  = (primary.client_name.split(' ').slice(1).join(' ') || '').trim();
  const initials  = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?';

  return {
    client_id:              primary.client_user_id,
    full_name:              primary.client_name,
    initials,
    email:                  primary.client_email,
    phone:                  null,
    nationality:            null,
    country_of_residence:   null,
    date_of_birth:          null,
    gender:                 null,
    timezone:               null,
    preferred_language:     null,
    profile_picture_url:    null,
    current_visa_status:    primary.visa_type_code ?? null,
    onboarding_completed:   null,
    onboarding_step:        null,
    client_since:           primary.created_at,
    updated_at:             primary.created_at,
    total_cases:            seeds.length,
    active_cases:           seeds.length,
    active_case: {
      application_id:  primary.id,
      case_number:     primary.case_reference,
      visa_type_code:  primary.visa_type_code,
      visa_type_name:  primary.visa_type_label,
      status:          'in_progress',
      current_stage:   'Intake — you created this case',
      progress_percent: 10,
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

type Tab = 'overview' | 'cases' | 'documents' | 'messages' | 'notes';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview'  },
  { id: 'cases',     label: 'Cases'     },
  { id: 'documents', label: 'Documents' },
  { id: 'messages',  label: 'Messages'  },
  { id: 'notes',     label: 'Notes'     },
];

/* ════════════════════════════════════════════════════════════════════════ */
export default function ClientProfilePage() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ClientProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<Tab>('overview');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!clientId) { setError('Missing client ID.'); setLoading(false); return; }
      setLoading(true); setError(null);

      // Fast path — client from a locally-created case (New Case wizard).
      // Backend doesn't know about these yet, so `/lawyer/applications`
      // returns 403. Serve a minimal profile from localStorage instead.
      const localProfile = buildLocalProfile(clientId);
      if (localProfile) {
        if (!cancelled) { setProfile(localProfile); setLoading(false); }
        return;
      }

      try {
        const data = await clientsApi.getClientProfile(clientId);
        if (!cancelled) setProfile(data);
      } catch (e: unknown) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ax = e as any;
        const status = ax?.response?.status;
        if (status === 403) {
          if (!cancelled) {
            setError(
              'This client is not in your HR-assigned cases. ' +
              'Ask HR to assign the client to you before viewing their profile.',
            );
          }
        } else if (status === 404) {
          if (!cancelled) setError('Client profile not found.');
        } else if (status === 401) {
          if (!cancelled) setError('Session expired. Please log in again.');
        } else {
          if (!cancelled) {
            setError(
              e instanceof Error
                ? `Could not load profile: ${e.message}`
                : 'Could not load profile.',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) return <div className="p-8 text-sm text-gray-500">Loading client profile…</div>;

  if (error || !profile) {
    return (
      <div className="p-8">
      <LawyerBackButton />
        <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="text-sm font-semibold text-amber-900">Access restricted</h2>
          <p className="mt-1 text-sm text-amber-800">
            {error || 'Profile unavailable.'}
          </p>
          <button
            onClick={() => navigate('/lawyer/intake')}
            className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          >
            ← Back to assigned clients
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="mx-auto max-w-[1200px] px-4 pt-6 pb-24 sm:px-6 sm:pt-8 lg:px-8">

        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <button onClick={() => navigate('/lawyer/intake')} className="hover:text-indigo-600">Clients</button>
          <span>/</span>
          <span className="font-semibold text-gray-900">{profile.full_name}</span>
        </nav>

        {/* Hero card */}
        <HeroCard profile={profile} />

        {/* Quick stats */}
        <QuickStats profile={profile} />

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <div className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`relative shrink-0 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === t.id ? 'text-indigo-600' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {t.label}
                {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-indigo-600" />}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {tab === 'overview'  && <OverviewTab profile={profile} />}
          {tab === 'cases'     && <CasesTab profile={profile} />}
          {tab === 'documents' && <DocumentsTab profile={profile} />}
          {tab === 'messages'  && <MessagesTab profile={profile} />}
          {tab === 'notes'     && <NotesTab />}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * HERO CARD
 * ════════════════════════════════════════════════════════════════════ */
function HeroCard({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  const hasPic = Boolean(profile.profile_picture_url);

  const openMessageThread = () => {
    // Same deep-link contract as the Case Detail "Message client" button.
    // SecureMessaging reads userId (with clientId fallback) and name (last
    // resort match if participant_id is missing).
    const params = new URLSearchParams({
      userId: profile.client_id,
      name:   profile.full_name || '',
    });
    navigate(`/lawyer/messages?${params.toString()}`);
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        {hasPic ? (
          <img
            src={profile.profile_picture_url!}
            alt={profile.full_name}
            className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-indigo-200"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white">
            {profile.initials || profile.full_name?.[0] || '?'}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">
              {profile.full_name}
            </h1>
            {profile.current_visa_status && (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                {profile.current_visa_status}
              </span>
            )}
            {profile.onboarding_completed === true && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                ✓ Onboarded
              </span>
            )}
            {profile.onboarding_completed === false && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                Onboarding {profile.onboarding_step != null ? `· Step ${profile.onboarding_step}` : ''}
              </span>
            )}
          </div>
          {profile.country_of_residence && (
            <p className="mt-1 text-sm text-gray-600">
              📍 {profile.country_of_residence}
            </p>
          )}
          {profile.client_since && (
            <p className="mt-0.5 text-xs text-gray-400">
              Client since {new Date(profile.client_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <button
            onClick={openMessageThread}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
          >
            ✉ Send Message
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * QUICK STATS — only the metrics we actually have
 * ════════════════════════════════════════════════════════════════════ */
function QuickStats({ profile }: { profile: ClientProfileResponse }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200 sm:grid-cols-3">
      <Stat
        label="Total Cases"
        value={profile.total_cases.toString()}
        color="text-gray-900"
      />
      <Stat
        label="Active Cases"
        value={profile.active_cases.toString()}
        color="text-indigo-600"
      />
      <Stat
        label="Onboarding"
        value={profile.onboarding_completed ? 'Complete' : `Step ${profile.onboarding_step ?? '—'}`}
        color={profile.onboarding_completed ? 'text-emerald-600' : 'text-amber-600'}
      />
    </div>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white p-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * OVERVIEW TAB
 * ════════════════════════════════════════════════════════════════════ */
function OverviewTab({ profile }: { profile: ClientProfileResponse }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* LEFT — 2 cols */}
      <div className="space-y-4 lg:col-span-2">
        <ActiveCaseCard profile={profile} />
        <PersonalInfoCard profile={profile} />
      </div>

      {/* RIGHT — 1 col */}
      <div className="space-y-4">
        <ContactCard profile={profile} />
        <AccountInfoCard profile={profile} />
      </div>
    </div>
  );
}

/* ── Active Case (from assigned application) ────────────────────────── */
function ActiveCaseCard({ profile }: { profile: ClientProfileResponse }) {
  const c = profile.active_case;
  if (!c) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 text-center text-sm text-gray-500">
        No active case.
      </div>
    );
  }
  const pct = Math.max(0, Math.min(100, c.progress_percent || 0));
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">{c.visa_type_name || 'Active Case'}</h3>
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
              {c.status || 'Pending'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">Case ID: {c.case_number}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-700">{c.current_stage || 'In progress'}</span>
          <span className="font-semibold text-gray-900">{pct}%</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ── Personal Info — only fields from /users/{id}/profile ───────────── */
function PersonalInfoCard({ profile }: { profile: ClientProfileResponse }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900">Personal Information</h3>
      <p className="mt-0.5 text-[11px] text-gray-400">From client's profile</p>

      <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full legal name"     value={profile.full_name} />
        <Field label="Nationality"         value={profile.nationality} />
        <Field label="Country of residence" value={profile.country_of_residence} />
        <Field
          label="Date of birth"
          value={profile.date_of_birth
            ? new Date(profile.date_of_birth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            : null}
        />
        <Field label="Gender" value={profile.gender} />
      </dl>
    </div>
  );
}

/* ── Contact Card ────────────────────────────────────────────────────── */
function ContactCard({ profile }: { profile: ClientProfileResponse }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Contact</h3>
      <dl className="mt-3 space-y-3">
        <FieldInline icon="✉" label="Email" value={profile.email} />
        <FieldInline icon="☎" label="Phone" value={profile.phone} />
        <FieldInline icon="🌐" label="Timezone" value={profile.timezone} />
        <FieldInline icon="🗣" label="Language" value={profile.preferred_language?.toUpperCase() ?? null} />
      </dl>
    </div>
  );
}

/* ── Account Info Card ───────────────────────────────────────────────── */
function AccountInfoCard({ profile }: { profile: ClientProfileResponse }) {
  const formatDt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }) : null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Account</h3>
      <dl className="mt-3 space-y-3">
        <FieldInline
          icon="✅"
          label="Onboarding"
          value={
            profile.onboarding_completed
              ? 'Complete'
              : profile.onboarding_step != null
                ? `In progress — step ${profile.onboarding_step}`
                : null
          }
        />
        <FieldInline icon="📅" label="Joined"       value={formatDt(profile.client_since)} />
        <FieldInline icon="✏" label="Last update"  value={formatDt(profile.updated_at)} />
        <FieldInline icon="🆔" label="Client ID"    value={profile.client_id.slice(0, 12) + '…'} />
      </dl>
    </div>
  );
}

/* ── Field components ────────────────────────────────────────────────── */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className={`mt-0.5 text-sm font-medium ${value ? 'text-gray-900' : 'italic text-gray-400'}`}>
        {value || 'Not provided'}
      </dd>
    </div>
  );
}

function FieldInline({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-gray-400">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
        <p className={`text-sm font-medium truncate ${value ? 'text-gray-900' : 'italic text-gray-400'}`}>
          {value || 'Not provided'}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * CASES TAB — all cases for this client (multi-visa support)
 * ════════════════════════════════════════════════════════════════════ */

/** Same match logic used in clients.api.ts buildProfile */
function matchesClient(a: AssignedApplication, profile: ClientProfileResponse): boolean {
  if (a.client_id && profile.client_id && a.client_id === profile.client_id) return true;
  if (a.user_id && profile.client_id && a.user_id === profile.client_id) return true;
  if (a.client_email && profile.email && a.client_email.toLowerCase() === profile.email.toLowerCase()) return true;
  if (a.client_name && profile.full_name && a.client_name.trim().toLowerCase() === profile.full_name.trim().toLowerCase()) return true;
  return false;
}

const STATUS_BADGE: Record<string, string> = {
  pending_intake:     'bg-amber-50 text-amber-700',
  intake_in_progress: 'bg-blue-50 text-blue-700',
  intake_completed:   'bg-emerald-50 text-emerald-700',
};

function humanStatus(s: string): string {
  return s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function CasesTab({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AssignedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);

      // For locally-created profiles (New Case wizard), scope strictly to
      // the seeds matching this client_user_id — don't hit the HR-assigned
      // worklist (which would leak other clients' cases via name match).
      if (isLocalProfile(profile)) {
        const seedsForThisClient = readLocalCases().filter(
          (c) => c.client_user_id === profile.client_id,
        );
        if (!cancelled) {
          setApps(seedsForThisClient.map(seedToAssignedApp));
          setLoading(false);
        }
        return;
      }

      try {
        const all = await intakeApi.listAssignedApplications();
        const mine = all.filter((a) => matchesClient(a, profile));
        if (!cancelled) setApps(mine);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load cases.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.client_id]);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Loading cases…</div>;
  }
  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }
  if (apps.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-base font-semibold text-gray-900">No cases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Once HR assigns a case for {profile.full_name}, it will show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apps.map((a) => {
        const pct = a.status === 'intake_completed' ? 100
          : a.status === 'intake_in_progress' ? Math.min(90, (a.intake_step ?? 2) * 20)
          : 10;
        return (
          <div
            key={a.application_id}
            onClick={() => navigate(`/lawyer/cases/${a.application_id}`)}
            className="cursor-pointer rounded-xl border border-gray-200 bg-white p-5 transition hover:border-indigo-300 hover:shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {a.visa_type_label || a.visa_type || 'Case'}
                  </h3>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    STATUS_BADGE[a.status] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {humanStatus(a.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500 font-mono">
                  #{a.application_id.slice(0, 8).toUpperCase()}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Assigned {new Date(a.assigned_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); navigate(`/lawyer/cases/${a.application_id}`); }}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                Open case →
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-gray-700">Progress</span>
                <span className="font-semibold text-gray-900">{pct}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * DOCUMENTS TAB — grouped by case (accordion)
 * ════════════════════════════════════════════════════════════════════ */

interface CaseDocGroup {
  app: AssignedApplication;
  docs: Document[];
  loading: boolean;
  error: string | null;
}

function DocumentsTab({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<CaseDocGroup[]>([]);
  const [initLoading, setInitLoading] = useState(true);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  // Which case is the lawyer currently uploading to? holds application_id or null
  const [uploadFor, setUploadFor] = useState<AssignedApplication | null>(null);

  /** Refetch a single case's documents (used after upload). */
  const refetchCaseDocs = async (applicationId: string) => {
    try {
      const res = await documentsApi.filterDocuments({ application_id: applicationId });
      const items = res.items ?? [];
      setGroups((prev) => prev.map((g) =>
        g.app.application_id === applicationId
          ? { ...g, docs: items, loading: false, error: null }
          : g,
      ));
    } catch (e) {
      // silent — user can retry from the queue
      console.warn('[ClientProfile] refetchCaseDocs failed', e);
    }
  };

  const handleLawyerUpload = async (payload: {
    file: File;
    document_type: string;
    category: string;
  }) => {
    if (!uploadFor) return;
    try {
      await documentsApi.uploadDocument({
        file:           payload.file,
        application_id: uploadFor.application_id,
        document_type:  payload.document_type,
        category:       payload.category,
      });
      await refetchCaseDocs(uploadFor.application_id);
      // Make sure the case group is expanded so user sees their new doc
      setOpenIds((prev) => {
        const next = new Set(prev);
        next.add(uploadFor.application_id);
        return next;
      });
      setUploadFor(null);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const msg = ax?.response?.data?.detail || ax?.message || 'Upload failed.';
      alert(`Could not upload document: ${msg}`);
    }
  };

  // Load the client's cases first, then hydrate each with its docs.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setInitLoading(true);

      // Locally-created profile → strictly scope to wizard-seeded cases
      // and skip the doc fetch (no docs uploaded yet for these cases).
      if (isLocalProfile(profile)) {
        const seedsForThisClient = readLocalCases().filter(
          (c) => c.client_user_id === profile.client_id,
        );
        const localApps = seedsForThisClient.map(seedToAssignedApp);
        if (!cancelled) {
          setOpenIds(new Set(localApps.slice(0, 1).map((a) => a.application_id)));
          setGroups(localApps.map((a) => ({ app: a, docs: [], loading: false, error: null })));
          setInitLoading(false);
        }
        return;
      }

      try {
        const all = await intakeApi.listAssignedApplications();
        const mine = all.filter((a) => matchesClient(a, profile));
        if (cancelled) return;

        // First case starts expanded so the user sees documents immediately.
        setOpenIds(new Set(mine.slice(0, 1).map((a) => a.application_id)));
        setGroups(mine.map((a) => ({ app: a, docs: [], loading: true, error: null })));

        // Kick off document fetch per case in parallel.
        await Promise.all(mine.map(async (a) => {
          try {
            const res = await documentsApi.filterDocuments({ application_id: a.application_id });
            const items = res.items ?? [];
            if (cancelled) return;
            setGroups((prev) => prev.map((g) =>
              g.app.application_id === a.application_id
                ? { ...g, docs: items, loading: false, error: null }
                : g,
            ));
          } catch (e) {
            if (cancelled) return;
            setGroups((prev) => prev.map((g) =>
              g.app.application_id === a.application_id
                ? { ...g, docs: [], loading: false, error: e instanceof Error ? e.message : 'Failed to load' }
                : g,
            ));
          }
        }));
      } catch (e) {
        if (cancelled) return;
        setGroups([]);
      } finally {
        if (!cancelled) setInitLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [profile.client_id]);

  const totalDocs = useMemo(
    () => groups.reduce((sum, g) => sum + g.docs.length, 0),
    [groups],
  );

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (initLoading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-sm text-gray-500">Loading documents…</div>;
  }
  if (groups.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
        <p className="text-base font-semibold text-gray-900">No cases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Documents appear here once {profile.full_name} has an assigned case with uploaded files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header bar */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">All documents</p>
          <p className="text-xs text-gray-500">
            {totalDocs} document{totalDocs === 1 ? '' : 's'} across {groups.length} case{groups.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/lawyer/documents/queue?client=${encodeURIComponent(profile.full_name)}`)}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Open in Queue →
        </button>
      </div>

      {/* Case accordions */}
      {groups.map((g) => {
        const isOpen = openIds.has(g.app.application_id);
        return (
          <div key={g.app.application_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => toggle(g.app.application_id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {g.app.visa_type_label || g.app.visa_type || 'Case'}
                  </p>
                  <span className="font-mono text-[11px] text-gray-500">
                    #{g.app.application_id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    STATUS_BADGE[g.app.status] || 'bg-gray-100 text-gray-700'
                  }`}>
                    {humanStatus(g.app.status)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-500">
                  {g.loading ? 'Loading documents…' : `${g.docs.length} document${g.docs.length === 1 ? '' : 's'}`}
                </p>
              </div>
              <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 bg-slate-50/40">
                {g.loading ? (
                  <div className="p-4 text-xs text-gray-500">Loading…</div>
                ) : g.error ? (
                  <div className="p-4 text-xs text-rose-600">{g.error}</div>
                ) : g.docs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-gray-500">
                    No documents uploaded for this case yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {g.docs.map((doc) => (
                      <li
                        key={doc.id}
                        onClick={() =>
                          navigate(`/lawyer/documents/${doc.id}/review?application_id=${g.app.application_id}`)
                        }
                        className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 hover:bg-white"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {doc.document_type || doc.category || '—'}
                            {doc.uploaded_at && (
                              <> · {new Date(doc.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</>
                            )}
                          </p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${docStatusBadge(doc.status)}`}>
                          {doc.status?.replace(/_/g, ' ') || 'Pending'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Per-case upload button — always at the bottom of each case */}
                <div className="flex justify-end border-t border-gray-100 bg-white px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setUploadFor(g.app)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 cursor-pointer"
                    title="Upload a lawyer document to this case"
                  >
                    ⬆ Upload Document
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Upload modal — lawyer uploads a document to a specific case */}
      {uploadFor && (
        <LawyerUploadModal
          clientName={profile.full_name}
          caseLabel={uploadFor.visa_type_label || uploadFor.visa_type || 'Case'}
          onClose={() => setUploadFor(null)}
          onSubmit={handleLawyerUpload}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * LAWYER UPLOAD MODAL — attorney uploads their own doc to a case
 * (mirrors the modal on DocumentReviewPage — same backend contract)
 * ════════════════════════════════════════════════════════════════════ */
function LawyerUploadModal({
  clientName,
  caseLabel,
  onClose,
  onSubmit,
}: {
  clientName?: string;
  caseLabel?:  string;
  onClose:  () => void;
  onSubmit: (payload: { file: File; document_type: string; category: string }) => Promise<void> | void;
}) {
  const [file,       setFile]       = useState<File | null>(null);
  const [docType,    setDocType]    = useState('');
  // Backend enforces category ∈ {education, employment, identity, legal, other, personal}.
  const [category,   setCategory]   = useState('legal');
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const fileValid = file !== null;
  const typeValid = docType.trim().length >= 2;
  const canSubmit = fileValid && typeValid && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) { setShowErrors(true); return; }
    setSubmitting(true);
    try {
      await onSubmit({
        file:          file!,
        document_type: docType.trim(),
        category,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 tracking-[-0.3px]">
              Upload Document
            </h3>
            {(clientName || caseLabel) && (
              <p className="text-[12px] text-slate-500 mt-0.5">
                For <span className="font-medium text-slate-700">{clientName}</span>
                {caseLabel && <> · <span className="font-medium text-slate-700">{caseLabel}</span></>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-slate-400 hover:bg-slate-100" aria-label="Close">✕</button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* File */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-purple-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-purple-700 hover:file:bg-purple-100"
            />
            {file && (
              <p className="mt-1 text-[11px] text-slate-500">
                {file.name} · {(file.size / 1024).toFixed(1)} KB
              </p>
            )}
            {showErrors && !fileValid && (
              <p className="mt-1 text-[11px] text-red-600">Please choose a file to upload.</p>
            )}
          </div>

          {/* Document type / title */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">
              Document Name / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              placeholder="e.g. Drafted Petition, Cover Letter, Legal Memo"
              className="w-full min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
            {showErrors && !typeValid && (
              <p className="mt-1 text-[11px] text-red-600">Please enter a document name (at least 2 characters).</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-[12px] font-semibold text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            >
              <option value="legal">Legal (memo, petition, cover letter, filing)</option>
              <option value="employment">Employment</option>
              <option value="identity">Identity</option>
              <option value="education">Education</option>
              <option value="personal">Personal</option>
              <option value="other">Other (evidence, correspondence, misc.)</option>
            </select>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            This file will be attached to the case and visible in Case Documents + Document Queue.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg px-6 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 sm:border sm:border-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:font-medium"
          >
            {submitting ? 'Uploading…' : '⬆ Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}

function docStatusBadge(status: string | null | undefined): string {
  switch (status) {
    case 'approved':        return 'bg-emerald-50 text-emerald-700';
    case 'rejected':        return 'bg-rose-50 text-rose-700';
    case 'in_progress':     return 'bg-blue-50 text-blue-700';
    case 'action_required': return 'bg-amber-50 text-amber-700';
    default:                return 'bg-gray-100 text-gray-600';
  }
}

/* ════════════════════════════════════════════════════════════════════
 * MESSAGES + NOTES placeholders (unchanged phase)
 * ════════════════════════════════════════════════════════════════════ */
function MessagesTab({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
      <p className="text-base font-semibold text-gray-900">Messages</p>
      <p className="mt-1 text-sm text-gray-500">Chat with {profile.full_name} lives in the Messages workspace.</p>
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams({ userId: profile.client_id, name: profile.full_name });
          navigate(`/lawyer/messages?${params.toString()}`);
        }}
        className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Open message thread →
      </button>
    </div>
  );
}
function NotesTab() {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <p className="text-base font-semibold text-gray-900">Notes</p>
      <p className="mt-1 text-sm text-gray-500">This tab is part of the next build phase.</p>
    </div>
  );
}
