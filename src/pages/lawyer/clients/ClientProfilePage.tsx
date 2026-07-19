// src/pages/lawyer/clients/ClientProfilePage.tsx
//
// Client Profile — shows ONLY fields that actually come from the backend.
//
// Route: /lawyer/clients/:clientId
//
// Data sources (aggregated by clients.api.ts):
//   • GET /lawyer/applications      → HR-assigned scope (security boundary)
//   • GET /users/{user_id}/profile  → user profile row
//   • GET /documents/filter         → per-case documents (Documents tab)
//
// SECURITY: 403 if the client is not in the lawyer's HR-assigned list →
// no mock fallback, explicit "access restricted" card.
//
// TABS
//   overview   — profile fields + active case snapshot (as before)
//   cases      — ALL HR-assigned applications for this client. Supports
//                the multi-visa scenario (one client, multiple applications).
//   documents  — every document uploaded across every case, grouped by
//                case with an accordion header so multi-case clients stay
//                readable. Each row deep-links into DocumentReviewPage.
//   messages   — placeholder (next build phase).
//   notes      — placeholder (next build phase).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { clientsApi } from '../../../api/lawyer/clients.api';
import { intakeApi }  from '../../../api/lawyer/intake.api';
import { documentsApi } from '../../../api/lawyer/documents.api';
import type { ClientProfileResponse } from '../../../types/lawyer/clients.types';
import type { AssignedApplication } from '../../../types/lawyer/intake.types';
import type { Document, DocumentStatus } from '../../../types/lawyer/documents.types';

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

        {/* Back navigation — top-left, above the breadcrumb (desktop + mobile). */}
        <LawyerBackButton />

        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-1 text-xs text-gray-500">
          <button onClick={() => navigate('/lawyer/intake')} className="hover:text-indigo-600">Clients</button>
          <span>/</span>
          <span className="font-semibold text-gray-900">{profile.full_name}</span>
        </nav>

        {/* Hero card */}
        <HeroCard profile={profile} clientUserId={clientId} />

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
          {tab === 'overview'  && <OverviewTab  profile={profile} />}
          {tab === 'cases'     && <CasesTab     profile={profile} />}
          {tab === 'documents' && <DocumentsTab profile={profile} />}
          {(tab === 'messages' || tab === 'notes') && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
              <p className="text-base font-semibold text-gray-900">{TABS.find((t) => t.id === tab)?.label}</p>
              <p className="mt-1 text-sm text-gray-500">This tab is part of the next build phase.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * HERO CARD
 * ════════════════════════════════════════════════════════════════════ */
function HeroCard({ profile, clientUserId }: { profile: ClientProfileResponse; clientUserId: string }) {
  const navigate = useNavigate();
  const hasPic = Boolean(profile.profile_picture_url);

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
            onClick={() => {
              // Deep-link to Messages with this client's user_id → SecureMessaging
              // auto-opens the existing thread (or creates one if not found).
              const params = new URLSearchParams({
                userId: clientUserId,
                name:   profile.full_name || '',
              });
              navigate(`/lawyer/messages?${params.toString()}`);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
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

/* ════════════════════════════════════════════════════════════════════
 * CASES TAB — every HR-assigned application for THIS client.
 *
 * A single client can have multiple visa applications running in parallel
 * (e.g. H-1B extension + O-1A pending). We fetch the full assigned-apps
 * list once and filter by client_id (preferred) with an email fallback,
 * matching the same rule clients.api uses internally so counts stay
 * consistent with the "Total Cases" tile.
 * ════════════════════════════════════════════════════════════════════ */
function CasesTab({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  const [apps, setApps]       = useState<AssignedApplication[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await intakeApi.listAssignedApplications();
        if (cancelled) return;
        const mine = all.filter((a) => matchesClient(a, profile));
        setApps(mine);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load cases.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.client_id, profile.email]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        Loading cases…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error}
      </div>
    );
  }
  if (!apps || apps.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-gray-900">No cases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          This client doesn't have any HR-assigned applications on your worklist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{apps.length}</span>
          {' '}case{apps.length === 1 ? '' : 's'} for {profile.full_name}
        </p>
        <span className="text-[11px] text-gray-400">Sorted by most recently assigned</span>
      </div>

      <ul className="space-y-3">
        {[...apps]
          .sort(
            (a, b) =>
              new Date(b.assigned_at || 0).getTime() -
              new Date(a.assigned_at || 0).getTime(),
          )
          .map((a) => (
          <li
            key={a.application_id}
            className="rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-indigo-200"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-gray-900">
                    {a.visa_type_label || a.visa_type || 'Untitled Case'}
                  </h3>
                  <StatusChip status={a.status} />
                  {a.visa_type && (
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                      {a.visa_type}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Case ID:{' '}
                  <span className="font-mono text-gray-700">
                    #{(a.visa_type || 'VF').toUpperCase()}-{a.application_id.slice(0, 8).toUpperCase()}
                  </span>
                </p>
                {a.assigned_at && (
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Assigned{' '}
                    {new Date(a.assigned_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}

                {/* Progress bar mirrors the Overview snapshot logic. */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>{stageFromStatus(a.status)}</span>
                    <span className="font-semibold text-gray-700">
                      {estimateProgress(a.status, a.intake_step)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all"
                      style={{ width: `${estimateProgress(a.status, a.intake_step)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/lawyer/cases/${a.application_id}`)}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Open case
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/lawyer/documents/queue?client=${encodeURIComponent(
                        profile.full_name || '',
                      )}`,
                    )
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Docs
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * DOCUMENTS TAB — every document uploaded across every case.
 *
 * For each matched application we call /documents/filter?application_id=…
 * once, then group the flat results back by case. Groups render as
 * expandable accordions — open by default when the client has just one
 * case, only the first case expanded when multi-case so the screen stays
 * scannable.
 *
 * Each row deep-links into DocumentReviewPage with both doc_id and
 * app_id in the URL, matching the queue's contract.
 * ════════════════════════════════════════════════════════════════════ */
function DocumentsTab({ profile }: { profile: ClientProfileResponse }) {
  const navigate = useNavigate();
  const [apps, setApps]       = useState<AssignedApplication[] | null>(null);
  const [docsByApp, setDocsByApp] = useState<Record<string, Document[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const all = await intakeApi.listAssignedApplications();
        if (cancelled) return;
        const mine = all.filter((a) => matchesClient(a, profile));
        setApps(mine);

        // Fan out one /documents/filter call per application.  We keep
        // per-case buckets so the UI can group by case; a single API-side
        // failure for one case does not break the others.
        const buckets: Record<string, Document[]> = {};
        await Promise.all(
          mine.map(async (a) => {
            try {
              const res = await documentsApi.filterDocuments({
                application_id: a.application_id,
              });
              const deleted = documentsApi.getLocallyDeletedIds();
              buckets[a.application_id] = (res.items || []).filter(
                (d) => !deleted.has(d.id),
              );
            } catch {
              buckets[a.application_id] = [];
            }
          }),
        );
        if (cancelled) return;
        setDocsByApp(buckets);

        // Auto-expand: single case → open; multi-case → only first open.
        const initial: Record<string, boolean> = {};
        mine.forEach((a, i) => { initial[a.application_id] = mine.length === 1 || i === 0; });
        setExpanded(initial);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Could not load documents.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.client_id, profile.email]);

  const totalDocs = useMemo(
    () => Object.values(docsByApp).reduce((n, list) => n + list.length, 0),
    [docsByApp],
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        Loading documents…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
        {error}
      </div>
    );
  }
  if (!apps || apps.length === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-gray-900">No cases yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Documents will appear here once the client is assigned to a case.
        </p>
      </div>
    );
  }
  if (totalDocs === 0) {
    return (
      <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-base font-semibold text-gray-900">No documents uploaded yet</p>
        <p className="mt-1 text-sm text-gray-500">
          Any file this client uploads to their case will show up here.
        </p>
      </div>
    );
  }

  const toggle = (appId: string) =>
    setExpanded((prev) => ({ ...prev, [appId]: !prev[appId] }));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-4 py-2.5 border border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{totalDocs}</span>
          {' '}document{totalDocs === 1 ? '' : 's'} across{' '}
          <span className="font-semibold text-gray-900">{apps.length}</span>
          {' '}case{apps.length === 1 ? '' : 's'}
        </p>
        <span className="text-[11px] text-gray-400">Grouped by case</span>
      </div>

      <ul className="space-y-3">
        {apps.map((a) => {
          const docs = (docsByApp[a.application_id] || [])
            .slice()
            .sort(
              (x, y) =>
                new Date(y.uploaded_at || 0).getTime() -
                new Date(x.uploaded_at || 0).getTime(),
            );
          const isOpen = expanded[a.application_id] ?? false;
          return (
            <li key={a.application_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {/* Group header — click to toggle */}
              <button
                type="button"
                onClick={() => toggle(a.application_id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {a.visa_type_label || a.visa_type || 'Case'}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-700">
                      {a.visa_type || 'VF'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      {docs.length} doc{docs.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 font-mono">
                    #{(a.visa_type || 'VF').toUpperCase()}-{a.application_id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <svg
                  className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Group body */}
              {isOpen && (
                docs.length === 0 ? (
                  <div className="border-t border-gray-100 px-5 py-6 text-center text-sm text-gray-500">
                    No documents uploaded for this case yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <FileIcon fileType={d.file_type} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-gray-900" title={d.name}>
                              {d.name || 'Untitled document'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-gray-500">
                              {(d.document_type || 'Document')}
                              {d.category && ` · ${humanize(d.category)}`}
                              {d.uploaded_at && ` · ${new Date(d.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                              {typeof d.file_size_bytes === 'number' && d.file_size_bytes > 0 && ` · ${formatBytes(d.file_size_bytes)}`}
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <DocStatusChip status={d.status} />
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/lawyer/documents/review/${d.id}?app_id=${a.application_id}`,
                              )
                            }
                            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
                          >
                            Review
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
 * Helpers shared by the new tabs
 * ════════════════════════════════════════════════════════════════════ */

/** Same rule clients.api uses: prefer client_id, fall back to email. */
function matchesClient(a: AssignedApplication, profile: ClientProfileResponse): boolean {
  const byId    = !!a.client_id && !!profile.client_id && a.client_id === profile.client_id;
  const byEmail = !!a.client_email && !!profile.email && a.client_email === profile.email;
  return byId || byEmail;
}

function stageFromStatus(status: string): string {
  switch (status) {
    case 'pending_intake':     return 'Awaiting intake';
    case 'intake_in_progress': return 'Intake in progress';
    case 'intake_completed':   return 'Intake complete';
    default:                   return humanize(status);
  }
}

function estimateProgress(status: string, intakeStep: number | null): number {
  if (status === 'intake_completed') return 100;
  if (intakeStep && intakeStep > 0) return Math.min(100, intakeStep * 20);
  if (status === 'intake_in_progress') return 40;
  if (status === 'pending_intake')     return 10;
  return 0;
}

function humanize(s: string): string {
  return s
    .split(/[_-]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* ── Status chips ────────────────────────────────────────────────────── */
function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending_intake:     'bg-slate-100 text-slate-700 ring-slate-200',
    intake_in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
    intake_completed:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
        map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {stageFromStatus(status)}
    </span>
  );
}

function DocStatusChip({ status }: { status: DocumentStatus }) {
  const map: Record<DocumentStatus, string> = {
    pending:         'bg-slate-100 text-slate-700 ring-slate-200',
    in_progress:     'bg-blue-50   text-blue-700   ring-blue-200',
    action_required: 'bg-amber-50  text-amber-700  ring-amber-200',
    approved:        'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected:        'bg-rose-50   text-rose-700   ring-rose-200',
    required:        'bg-indigo-50 text-indigo-700 ring-indigo-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${
        map[status] || 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {humanize(status)}
    </span>
  );
}

/* ── Tiny inline file-type badge (avoids adding a new asset). ────────── */
function FileIcon({ fileType }: { fileType: string }) {
  const ext = (fileType || '').toLowerCase();
  const bg =
    ext === 'pdf'                     ? 'bg-rose-100 text-rose-700' :
    ['jpg','jpeg','png','webp'].includes(ext) ? 'bg-blue-100 text-blue-700' :
    ['doc','docx'].includes(ext)      ? 'bg-indigo-100 text-indigo-700' :
                                        'bg-slate-100 text-slate-700';
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold uppercase ${bg}`}
      aria-hidden="true"
    >
      {ext || 'file'}
    </span>
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