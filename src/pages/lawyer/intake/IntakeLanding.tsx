// src/pages/lawyer/intake/IntakeLanding.tsx
//
// Lawyer's Client Intake landing page.
//
// Shows a list of applications ASSIGNED to the logged-in lawyer
// (forwarded by HR after employee submitted them).
//
// Lawyer clicks "Start Intake" on a card →
//   - If session already exists → navigate to wizard at saved step
//   - Else POST /intake/sessions for that app_id → wizard opens at Step 3
//
// API: GET  /lawyer/applications       — assigned worklist
//      POST /intake/sessions           — create session for an application

import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { intakeApi } from '../../../api/lawyer/intake.api';
import type { AssignedApplication, IntakeStatus } from '../../../types/lawyer/intake.types';
// Note: "View Profile" button is added to each card. It navigates to
// /lawyer/clients/{client_id}. Until backend includes `client_id` in the
// /lawyer/applications response, the button is shown but disabled with a
// tooltip. Backend change required: add `client_id = app.user_id` to
// AssignedApplicationResponse (2 lines — schema + service).

/* ── Status display config ──────────────────────────────────────────── */
const statusConfig: Record<IntakeStatus, { label: string; bg: string; text: string; action: string }> = {
  pending_intake:     { label: 'Pending Intake', bg: 'bg-amber-50',   text: 'text-amber-700',   action: 'Start Intake'    },
  intake_in_progress: { label: 'In Progress',    bg: 'bg-blue-50',    text: 'text-blue-700',    action: 'Continue Intake' },
  intake_completed:   { label: 'Completed',      bg: 'bg-emerald-50', text: 'text-emerald-700', action: 'View Submission' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

/* ════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function IntakeLanding() {
  const navigate = useNavigate();
  const [apps, setApps] = useState<AssignedApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | IntakeStatus>('all');
  const [startingId, setStartingId] = useState<string | null>(null);

  /* ── Load assigned applications from real API ──────────────────────── */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await intakeApi.listAssignedApplications();
      setApps(res);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      let msg = 'Failed to load assigned applications.';
      if (status === 401)     msg = 'Session expired. Please log in again.';
      else if (status === 403) msg = 'You do not have permission to view assigned applications.';
      else if (e instanceof Error) msg = e.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* ── Filter + search (client-side over the already-fetched list) ──── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return apps.filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.client_name.toLowerCase().includes(q) ||
        (a.client_email || '').toLowerCase().includes(q) ||
        (a.visa_type || '').toLowerCase().includes(q) ||
        (a.visa_type_label || '').toLowerCase().includes(q)
      );
    });
  }, [apps, search, filter]);

  /* ── Counts for filter pills ─────────────────────────────────────── */
  const counts = useMemo(() => ({
    all:                apps.length,
    pending_intake:     apps.filter((a) => a.status === 'pending_intake').length,
    intake_in_progress: apps.filter((a) => a.status === 'intake_in_progress').length,
    intake_completed:   apps.filter((a) => a.status === 'intake_completed').length,
  }), [apps]);

  /* ── Action — start OR continue intake ───────────────────────────── */
  const handleAction = async (app: AssignedApplication) => {
    // If a session already exists for this application → navigate to wizard
    if (app.intake_session_id) {
      const step = app.status === 'intake_completed' ? 5 : (app.intake_step ?? 3);
      navigate(`/lawyer/intake/${app.intake_session_id}?step=${step}`);
      return;
    }

    // Else create a new session via POST /intake/sessions
    setStartingId(app.application_id);
    try {
      const session = await intakeApi.createIntakeSession({
        application_id: app.application_id,
        generate_link:  false,
      });
      navigate(`/lawyer/intake/${session.id}?step=3`);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      const detail = ax?.response?.data?.detail;
      let msg = 'Could not start intake.';
      if (status === 400)      msg = `Invalid application ID. ${detail || ''}`;
      else if (status === 403) msg = 'You are not assigned to this application.';
      else if (status === 404) msg = 'Application not found.';
      else if (status === 409) {
        // Session already exists — reload to get the latest state then retry navigation
        msg = 'A session already exists. Refreshing list…';
        await load();
      }
      else if (e instanceof Error) msg = e.message;
      alert(msg);
    } finally {
      setStartingId(null);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-[1240px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* Back navigation — top-left, above the page header (desktop + mobile). */}
        <LawyerBackButton className="!mb-0" />

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Client Intake</h1>
            <p className="mt-1 text-sm text-gray-500">
              Applications assigned to you by HR. Click <span className="font-semibold text-indigo-600">Start Intake</span> to begin the 5-step intake process.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex shrink-0 items-center gap-2 self-start rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* Filter + search bar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <FilterPill label="All"          count={counts.all}                active={filter === 'all'}                onClick={() => setFilter('all')} />
            <FilterPill label="Pending"      count={counts.pending_intake}     active={filter === 'pending_intake'}     onClick={() => setFilter('pending_intake')} />
            <FilterPill label="In Progress"  count={counts.intake_in_progress} active={filter === 'intake_in_progress'} onClick={() => setFilter('intake_in_progress')} />
            <FilterPill label="Completed"    count={counts.intake_completed}   active={filter === 'intake_completed'}   onClick={() => setFilter('intake_completed')} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or visa type…"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-72"
          />
        </div>

        {/* List */}
        <div className="mt-6">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {error}{' '}
              <button onClick={load} className="ml-2 font-semibold underline">Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState hasFilter={filter !== 'all' || search.length > 0} />
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filtered.map((app) => (
                <ApplicationCard
                  key={app.application_id}
                  app={app}
                  starting={startingId === app.application_id}
                  onAction={() => handleAction(app)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ── Application card ───────────────────────────────────────────────── */
function ApplicationCard({
  app,
  starting,
  onAction,
}: {
  app: AssignedApplication;
  starting: boolean;
  onAction: () => void;
}) {
  const cfg = statusConfig[app.status];
  const navigate = useNavigate();

  // Use the application_id we ALREADY have — no pre-fetch needed.
  // The profile page looks this up in the assigned-applications list
  // (its own security boundary) and aggregates the data from there.
  const handleViewProfile = () => {
    navigate(`/lawyer/clients/${app.client_id || app.application_id}`);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:flex-row sm:items-start">
      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-sm font-semibold text-indigo-700">
        {initials(app.client_name)}
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{app.client_name || 'Unknown client'}</p>
            <p className="truncate text-xs text-gray-500">{app.client_email || '—'}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
            {cfg.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
          {app.visa_type && (
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono font-semibold text-indigo-700">{app.visa_type}</span>
          )}
          {app.visa_type_label && <span className="text-gray-600">{app.visa_type_label}</span>}
        </div>

        <div className="mt-2 text-[11px] text-gray-400">
          Assigned {formatDate(app.assigned_at)}
          {app.hr_reviewed_by && ` · by ${app.hr_reviewed_by}`}
        </div>
        <div className="mt-1 text-[11px] font-mono text-gray-300">App: {app.application_id.slice(0, 18)}…</div>

        {app.status === 'intake_in_progress' && app.intake_step != null && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] font-medium">
              <span className="text-gray-600">Step {app.intake_step} of 5</span>
              <span className="text-indigo-600">{Math.round((app.intake_step / 5) * 100)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(app.intake_step / 5) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Action buttons row — primary + View Profile */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={onAction}
            disabled={starting}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity ${
              app.status === 'intake_completed'
                ? 'bg-emerald-600 hover:bg-emerald-700'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {starting ? 'Starting…' : cfg.action}
            {!starting && <span>→</span>}
          </button>

          {/* View Profile — uses client_id if available, else application_id */}
          <button
            onClick={handleViewProfile}
            title="View full client profile"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <span>👤</span>
            View Profile
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Filter pill ────────────────────────────────────────────────────── */
function FilterPill({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-gray-100 text-gray-600'}`}>
        {count}
      </span>
    </button>
  );
}

/* ── Skeleton ───────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex gap-4">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
          <div className="h-3 w-2/3 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────── */
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
        <span className="text-2xl">📋</span>
      </div>
      <h2 className="text-base font-semibold text-gray-900">
        {hasFilter ? 'No matching applications' : 'No applications assigned yet'}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {hasFilter
          ? 'Try adjusting filters or clearing the search.'
          : 'HR will forward applications to you here. Check back soon.'}
      </p>
    </div>
  );
}
