// src/pages/lawyer/clients/ClientProfilePage.tsx
//
// Client Profile — shows ONLY fields that actually come from the backend.
//
// Route: /lawyer/clients/:clientId
//
// Data sources (aggregated by clients.api.ts):
//   • GET /lawyer/applications      → HR-assigned scope (security boundary)
//   • GET /users/{user_id}/profile  → user profile row
//
// SECURITY: 403 if the client is not in the lawyer's HR-assigned list →
// no mock fallback, explicit "access restricted" card.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { clientsApi } from '../../../api/lawyer/clients.api';
import type { ClientProfileResponse } from '../../../types/lawyer/clients.types';

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
          {tab === 'overview' && <OverviewTab profile={profile} />}
          {tab !== 'overview' && (
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