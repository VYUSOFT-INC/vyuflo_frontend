// src/pages/lawyer/dashboard/LawyerDashboardPage.tsx
//
// Attorney home screen — Figma node 97:2 ("25 - Lawyer Dashboard").
//
// Layout (desktop):
//   ┌──────────────────────────── Header (greeting + search) ───────────────────────────┐
//   │ Good morning, {firstName}!                                    [ Search cases... ] │
//   │ Tuesday, 14 April 2026                                                            │
//   ├───────────────────────────────────────────────────────────────────────────────────┤
//   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
//   │  │ Active   │  │ Unbilled │  │ Deadlines│  │ New      │  4 KPI stat cards        │
//   │  │ Cases    │  │ Hours    │  │ Today    │  │ Intakes  │  (polled every 60s)      │
//   │  └──────────┘  └──────────┘  └──────────┘  └──────────┘                          │
//   ├─────────────────────────────────────────┬─────────────────────────────────────────┤
//   │  Today's Schedule                       │  Critical Deadlines                     │
//   │  09:30 AM  Client Consultation          │  RFE Response: Rodriguez     Today      │
//   │  11:00 AM  Court Hearing Prep           │  LCA Filing: TechCorp        2 Days     │
//   │  02:00 PM  LCA Application Review       │  Prevailing Wage Request     4 Days     │
//   │  04:30 PM  Partner Sync                 │  [ View All Deadlines ]                 │
//   │  Recent Cases (5-row table + View All)  │                                         │
//   │                                         │  Monthly Billing                        │
//   │                                         │  $12,450  ↑ 8%                          │
//   │                                         │  Target: $15,000              83%       │
//   │                                         │  ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░                     │
//   │                                         │  Billed 35.5  ·  Unbilled 47.5          │
//   │                                         │  [ Go to Billing → ]                    │
//   └─────────────────────────────────────────┴─────────────────────────────────────────┘
//
// APIs (all authenticated, JWT via axios interceptor):
//   GET /lawyer-dashboard              — full mount payload
//   GET /lawyer-dashboard/kpi-cards    — polled every 60s
//   GET /lawyer-dashboard/recent-cases — pagination target for "View All"
//   GET /calendar/agenda               — Today's Schedule
//   GET /calendar/deadlines            — Critical Deadlines
//
// Production concerns handled:
//   ✅ Skeleton loaders per panel (no all-or-nothing blank state)
//   ✅ Empty states with friendly copy
//   ✅ Error state with retry (never blocks the whole page)
//   ✅ Auto-refresh KPI cards every 60s, pauses when tab hidden
//   ✅ Mobile responsive (single column stack below sm:)
//   ✅ Themed via CSS custom properties — --theme-primary etc.
//   ✅ Row clicks + View All buttons route to real detail pages

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Clock, AlertTriangle, UserPlus, Calendar, ArrowRight,
  ChevronRight, Search, TrendingUp, TrendingDown, DollarSign, CheckCircle2,
  Video, MapPin,
} from 'lucide-react';

import { dashboardApi } from '../../../api/lawyer/dashboard.api';
import type {
  LawyerDashboardResponse,
  AgendaItem,
  DeadlineItem,
  RecentCaseItem,
} from '../../../types/lawyer/dashboard.types';

/* ─────────────────────────────────────────────────────────────────────
   Formatters
   ───────────────────────────────────────────────────────────────────── */

function fmtDollarsFromCents(cents: number): string {
  const dollars = Math.round((cents ?? 0) / 100);
  return `$${dollars.toLocaleString('en-US')}`;
}

function fmtHours(h: number): string {
  return `${h.toFixed(1)} hrs`;
}

function fmtDateGreeting(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch { return iso; }
}

function fmtTime(iso: string): string {
  if (!iso) return '';
  // Accept both "HH:MM" and full ISO
  if (/^\d{2}:\d{2}/.test(iso)) {
    const [h, m] = iso.split(':').map(Number);
    const d = new Date(); d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  try {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch { return iso; }
}

const greetingByHour = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ─────────────────────────────────────────────────────────────────────
   Status token mapping — Recent Cases
   ───────────────────────────────────────────────────────────────────── */

function statusChip(status: string, label: string) {
  const s = status.toLowerCase();
  if (s === 'action_required' || s === 'action required')
    return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label };
  if (s === 'in_progress' || s === 'in progress')
    return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label };
  if (s === 'completed' || s === 'approved')
    return { bg: '#eef2ff', text: '#4338ca', dot: '#6366f1', label };
  return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label };
}

/* ─────────────────────────────────────────────────────────────────────
   Deadline urgency token
   ───────────────────────────────────────────────────────────────────── */

function urgencyChip(urgency: string, daysLeft: number): { bg: string; text: string; label: string } {
  const u = (urgency || '').toLowerCase();
  if (u === 'today' || daysLeft === 0)   return { bg: '#fef2f2', text: '#dc2626', label: 'Today'   };
  if (u === 'overdue' || daysLeft < 0)   return { bg: '#fef2f2', text: '#dc2626', label: `${Math.abs(daysLeft)}d overdue` };
  if (u === 'critical' || daysLeft <= 2) return { bg: '#fff7ed', text: '#c2410c', label: `${daysLeft} Day${daysLeft === 1 ? '' : 's'}` };
  if (u === 'soon' || daysLeft <= 7)     return { bg: '#fefce8', text: '#a16207', label: `${daysLeft} Days` };
  return { bg: '#f1f5f9', text: '#475569', label: `${daysLeft} Days` };
}

/* ─────────────────────────────────────────────────────────────────────
   Small primitives
   ───────────────────────────────────────────────────────────────────── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-[0px_1px_2px_rgba(0,0,0,0.04)] ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({
  title, subtitle, action,
}: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold text-slate-900 tracking-[-0.3px]">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Skeleton({ h, className = '' }: { h: number; className?: string }) {
  return (
    <div
      className={`bg-slate-100 rounded-xl animate-pulse ${className}`}
      style={{ height: h }}
    />
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-400">
        {icon}
      </div>
      <p className="text-[14px] font-semibold text-slate-900">{title}</p>
      <p className="text-[12px] text-slate-500 mt-0.5 max-w-[260px]">{desc}</p>
    </div>
  );
}

function Avatar({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
  const color = COLORS[(name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const sz = `${size}px`;
  return (
    <div className="relative shrink-0" style={{ width: sz, height: sz }}>
      {url && !failed ? (
        <img src={url} alt={name} onError={() => setFailed(true)}
          className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className="w-full h-full rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: color, fontSize: size * 0.4 }}>
          {initials}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   KPI Card
   ───────────────────────────────────────────────────────────────────── */

function KpiCard({
  label, value, sub, icon, iconBg, iconColor, trendTone,
}: {
  label:      string;
  value:      string;
  sub?:       React.ReactNode;
  icon:       React.ReactNode;
  iconBg:     string;
  iconColor:  string;
  trendTone?: 'up' | 'down' | 'neutral' | 'danger';
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">{label}</p>
        <p className="mt-1 text-[26px] font-bold text-slate-900 tracking-[-0.5px] leading-8">{value}</p>
        {sub && (
          <div
            className={`mt-1 text-[11px] font-medium flex items-center gap-1 ${
              trendTone === 'up'     ? 'text-emerald-600' :
              trendTone === 'down'   ? 'text-red-600'     :
              trendTone === 'danger' ? 'text-red-600'     :
                                       'text-slate-500'
            }`}
          >
            {sub}
          </div>
        )}
      </div>
    </Card>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Today's Schedule row
   ───────────────────────────────────────────────────────────────────── */

function AgendaRow({ item }: { item: AgendaItem }) {
  const type = (item.event_type || '').toLowerCase();
  const accent =
    item.accent_color ??
    (type === 'hearing'      ? '#a855f7' :   // purple
     type === 'consultation' ? '#3b82f6' :   // blue
     type === 'review'       ? '#f97316' :   // orange
     type === 'internal'     ? '#22c55e' :   // green
                               '#6366f1');   // fallback indigo

  const isZoom     = /zoom/i.test(item.location || '');
  const isInPerson = !isZoom && !!item.location;

  return (
    <div
      className="relative pl-4 pr-3 py-3 rounded-xl hover:bg-slate-50 transition-colors"
      style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-500">{fmtTime(item.start_time)}</p>
          <p className="mt-0.5 text-[13px] font-semibold text-slate-900 tracking-[-0.3px] truncate">
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 text-[12px] text-slate-500 line-clamp-2">{item.description}</p>
          )}
          {item.location && (
            <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {isZoom ? <Video size={11} /> : isInPerson ? <MapPin size={11} /> : null}
              {item.location}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Critical Deadline row
   ───────────────────────────────────────────────────────────────────── */

function DeadlineRow({ item }: { item: DeadlineItem }) {
  const chip = urgencyChip(item.urgency, item.days_left);
  const dotColor =
    chip.text === '#dc2626' ? '#ef4444' :
    chip.text === '#c2410c' ? '#f97316' :
    chip.text === '#a16207' ? '#eab308' :
                              '#94a3b8';

  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: dotColor }} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 tracking-[-0.3px] truncate">{item.title}</p>
          {item.subtitle && (
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">{item.subtitle}</p>
          )}
        </div>
      </div>
      <span
        className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap"
        style={{ backgroundColor: chip.bg, color: chip.text }}
      >
        {chip.label}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Recent Cases row (table)
   ───────────────────────────────────────────────────────────────────── */

function RecentCaseRow({ item, onOpen }: { item: RecentCaseItem; onOpen: (appId: string) => void }) {
  const chip = statusChip(item.status, item.status_label);
  return (
    <tr
      className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => onOpen(item.application_id)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={item.client_name} url={item.client_avatar_url} size={32} />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{item.client_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{item.application_number}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
          {item.visa_type_code}
        </span>
      </td>
      <td className="px-4 py-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
          style={{ backgroundColor: chip.bg, color: chip.text }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: chip.dot }} />
          {chip.label}
        </span>
      </td>
      <td className="px-4 py-3 text-[12px] text-slate-600 truncate max-w-[220px]">{item.next_action}</td>
    </tr>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════ */

export default function LawyerDashboardPage() {
  const navigate = useNavigate();

  const [data,      setData]      = useState<LawyerDashboardResponse | null>(null);
  const [agenda,    setAgenda]    = useState<AgendaItem[]>([]);
  const [deadlines, setDeadlines] = useState<DeadlineItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState('');

  // Ref used to make polling read the latest tab-visibility state
  const activeRef = useRef(true);

  // ── Initial fetch ─────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [dashRes, agendaRes, deadlinesRes] = await Promise.allSettled([
      dashboardApi.getDashboard(),
      dashboardApi.getTodaysAgenda(),
      dashboardApi.getCriticalDeadlines(),
    ]);

    if (dashRes.status === 'fulfilled') {
      setData(dashRes.value);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = dashRes.reason as any;
      const status = ax?.response?.status;
      if (status === 401)      setError('Session expired — please log in again.');
      else if (status === 403) setError('You don\'t have access to the attorney dashboard.');
      else                     setError(ax?.message || 'Could not load dashboard.');
    }

    if (agendaRes.status    === 'fulfilled') setAgenda(agendaRes.value);
    if (deadlinesRes.status === 'fulfilled') setDeadlines(deadlinesRes.value);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── KPI polling every 60s, paused when tab hidden ─────────────────────
  useEffect(() => {
    const onVisibility = () => { activeRef.current = document.visibilityState === 'visible'; };
    document.addEventListener('visibilitychange', onVisibility);

    const id = window.setInterval(async () => {
      if (!activeRef.current) return;
      try {
        const kpi = await dashboardApi.getKpiCards();
        setData((prev) => (prev ? { ...prev, kpi_cards: kpi } : prev));
      } catch { /* silent — next tick will retry */ }
    }, 60_000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(id);
    };
  }, []);

  // ── Derived greeting text ─────────────────────────────────────────────
  const greeting = useMemo(() => {
    const name = data?.attorney_first_name || 'Counselor';
    return `${greetingByHour()}, ${name}!`;
  }, [data]);

  const kpi = data?.kpi_cards;
  const mb  = data?.monthly_billing;

  const recentCases = data?.recent_cases?.items ?? [];

  return (
    <div className="min-h-full bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-[1280px] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-[-0.5px] leading-tight">
              {loading && !data ? 'Loading…' : greeting} 👋
            </h1>
            <p className="text-[13px] sm:text-[14px] text-slate-500 mt-0.5">
              {data?.greeting_date ? fmtDateGreeting(data.greeting_date) : new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="relative w-full sm:w-[320px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim()) {
                  navigate(`/lawyer/cases?q=${encodeURIComponent(search.trim())}`);
                }
              }}
              placeholder="Search cases, clients…"
              className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--theme-light,#eef2ff)] focus:border-[var(--theme-primary,#4f46e5)] transition"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-6">

        {/* ── ERROR BANNER (soft; content below still tries to render) ── */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
            <p className="text-[13px] text-red-700">⚠ {error}</p>
            <button
              onClick={load}
              className="text-[12px] font-semibold text-red-700 underline underline-offset-2 hover:text-red-900"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── KPI CARDS ─────────────────────────────────────────────── */}
        <section>
          {loading && !kpi ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={110} />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Active Cases"
                value={String(kpi?.active_cases ?? 0)}
                icon={<Briefcase size={20} />}
                iconBg="#eff6ff" iconColor="#2563eb"
                trendTone={(kpi?.active_cases_delta_week ?? 0) >= 0 ? 'up' : 'down'}
                sub={
                  <>
                    {(kpi?.active_cases_delta_week ?? 0) >= 0
                      ? <TrendingUp size={12} />
                      : <TrendingDown size={12} />}
                    <span>
                      {(kpi?.active_cases_delta_week ?? 0) >= 0 ? '+' : ''}
                      {kpi?.active_cases_delta_week ?? 0} this week
                    </span>
                  </>
                }
              />

              <KpiCard
                label="Unbilled Hours"
                value={fmtHours(kpi?.unbilled_hours ?? 0)}
                icon={<Clock size={20} />}
                iconBg="#fff7ed" iconColor="#ea580c"
                trendTone="neutral"
                sub={<span>{fmtDollarsFromCents(kpi?.unbilled_amount_cents ?? 0)} unbilled</span>}
              />

              <KpiCard
                label="Deadlines Today"
                value={String(kpi?.deadlines_today ?? 0)}
                icon={<AlertTriangle size={20} />}
                iconBg="#fef2f2" iconColor="#dc2626"
                trendTone={kpi?.requires_action ? 'danger' : 'neutral'}
                sub={
                  kpi?.requires_action
                    ? <><AlertTriangle size={12} /><span>Requires immediate action</span></>
                    : <><CheckCircle2 size={12} className="text-emerald-600" /><span className="text-emerald-600">All clear today</span></>
                }
              />

              <KpiCard
                label="New Client Intakes"
                value={String(kpi?.new_client_intakes ?? 0)}
                icon={<UserPlus size={20} />}
                iconBg="#f0fdf4" iconColor="#16a34a"
                trendTone="neutral"
                sub={<span>{kpi?.pending_review ?? 0} pending review</span>}
              />
            </div>
          )}
        </section>

        {/* ── MAIN 2-COLUMN GRID ────────────────────────────────────── */}
        <section className="grid grid-cols-1 xl:grid-cols-[5fr_3fr] gap-6">

          {/* ── LEFT COLUMN ───────────────────────────────────────── */}
          <div className="flex flex-col gap-6 min-w-0">

            {/* Today's Schedule */}
            <Card>
              <CardHeader
                title="Today's Schedule"
                subtitle="Your calendar for today"
                action={
                  <button
                    onClick={() => navigate('/lawyer/calendar')}
                    className="text-[12px] font-semibold text-[var(--theme-primary,#4f46e5)] hover:underline inline-flex items-center gap-1"
                  >
                    View Calendar <ChevronRight size={12} />
                  </button>
                }
              />
              <div className="px-3 pb-4">
                {loading && agenda.length === 0 ? (
                  <div className="space-y-2 px-2">
                    <Skeleton h={64} /><Skeleton h={64} /><Skeleton h={64} />
                  </div>
                ) : agenda.length === 0 ? (
                  <EmptyState
                    icon={<Calendar size={20} />}
                    title="Nothing scheduled today"
                    desc="When you have events on your calendar for today, they'll appear here."
                  />
                ) : (
                  <div className="flex flex-col gap-1">
                    {agenda.map((a) => <AgendaRow key={a.id} item={a} />)}
                  </div>
                )}
              </div>
            </Card>

            {/* Recent Cases */}
            <Card>
              <CardHeader
                title="Recent Cases"
                subtitle={`${data?.recent_cases?.total ?? recentCases.length} active applications`}
                action={
                  <button
                    onClick={() => navigate('/lawyer/cases')}
                    className="text-[12px] font-semibold text-[var(--theme-primary,#4f46e5)] hover:underline inline-flex items-center gap-1"
                  >
                    View All <ChevronRight size={12} />
                  </button>
                }
              />
              <div className="overflow-x-auto pb-2">
                {loading && recentCases.length === 0 ? (
                  <div className="px-5 pb-5 space-y-2"><Skeleton h={56} /><Skeleton h={56} /><Skeleton h={56} /></div>
                ) : recentCases.length === 0 ? (
                  <EmptyState
                    icon={<Briefcase size={20} />}
                    title="No recent cases"
                    desc="Cases assigned to you will show up here."
                  />
                ) : (
                  <table className="w-full text-left min-w-[560px]">
                    <thead>
                      <tr className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 bg-slate-50">
                        <th className="px-4 py-2.5">Client</th>
                        <th className="px-4 py-2.5">Case Type</th>
                        <th className="px-4 py-2.5">Status</th>
                        <th className="px-4 py-2.5">Next Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCases.slice(0, 5).map((item) => (
                        <RecentCaseRow
                          key={item.application_id}
                          item={item}
                          onOpen={(id) => navigate(`/lawyer/cases/${id}`)}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </div>

          {/* ── RIGHT COLUMN ──────────────────────────────────────── */}
          <div className="flex flex-col gap-6 min-w-0">

            {/* Critical Deadlines */}
            <Card>
              <CardHeader
                title="Critical Deadlines"
                subtitle="Upcoming filings and responses"
                action={
                  <button
                    onClick={() => navigate('/lawyer/calendar?tab=deadlines')}
                    className="text-[12px] font-semibold text-[var(--theme-primary,#4f46e5)] hover:underline inline-flex items-center gap-1"
                  >
                    View All <ChevronRight size={12} />
                  </button>
                }
              />
              <div className="px-5 pb-5">
                {loading && deadlines.length === 0 ? (
                  <div className="space-y-2"><Skeleton h={44} /><Skeleton h={44} /><Skeleton h={44} /></div>
                ) : deadlines.length === 0 ? (
                  <EmptyState
                    icon={<AlertTriangle size={20} />}
                    title="No critical deadlines"
                    desc="You're all caught up — no urgent filings on the horizon."
                  />
                ) : (
                  deadlines.slice(0, 5).map((d) => <DeadlineRow key={d.id} item={d} />)
                )}
              </div>
            </Card>

            {/* Monthly Billing */}
            <Card>
              <CardHeader title="Monthly Billing" subtitle="Current month at a glance" />
              <div className="px-5 pb-5">
                {loading && !mb ? (
                  <div className="space-y-3"><Skeleton h={40} /><Skeleton h={20} /><Skeleton h={40} /></div>
                ) : (
                  <>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-[26px] font-bold text-slate-900 tracking-[-0.5px]">
                        {fmtDollarsFromCents(mb?.monthly_billed_cents ?? 0)}
                      </p>
                      {mb && (
                        <span
                          className={`inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-0.5 rounded-md ${
                            mb.mom_positive ? 'text-emerald-700 bg-emerald-50' : 'text-red-700 bg-red-50'
                          }`}
                        >
                          {mb.mom_positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {mb.mom_positive ? '+' : ''}{mb.mom_change_pct}%
                        </span>
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                        <span>Target: {fmtDollarsFromCents(mb?.target_cents ?? 0)}</span>
                        <span className="font-semibold text-slate-700">{mb?.target_pct ?? 0}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, mb?.target_pct ?? 0))}%`,
                            backgroundImage:
                              'linear-gradient(90deg, var(--theme-primary,#4f46e5), var(--theme-gradient-end,#7c3aed))',
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">Billed Hours</p>
                        <p className="text-[16px] font-bold text-slate-900 mt-0.5">{(mb?.billed_hours ?? 0).toFixed(1)}</p>
                      </div>
                      <div className="rounded-xl bg-orange-50 border border-orange-100 px-3 py-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-orange-600">Unbilled</p>
                        <p className="text-[16px] font-bold text-orange-700 mt-0.5">{(mb?.unbilled_hours ?? 0).toFixed(1)}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate('/lawyer/billing')}
                      className="mt-4 w-full h-10 rounded-xl text-white text-[13px] font-semibold shadow-sm transition hover:opacity-90 inline-flex items-center justify-center gap-1.5"
                      style={{
                        backgroundImage:
                          'linear-gradient(135deg, var(--theme-primary,#4f46e5) 0%, var(--theme-gradient-end,#7c3aed) 100%)',
                      }}
                    >
                      <DollarSign size={14} /> Go to Billing <ArrowRight size={13} />
                    </button>
                  </>
                )}
              </div>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}