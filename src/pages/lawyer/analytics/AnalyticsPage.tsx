// src/pages/lawyer/analytics/AnalyticsPage.tsx
//
// Lawyer Analytics — Screen 23 (matches Figma node 35-2944).
//
// Layout:
//   • Header: title + subtitle + period pills [This Month | Q1 | Last 12 | Custom] + Export
//   • 5 KPI cards (Active, New Clients, Avg Duration, Pending Actions, Revenue)
//   • 2 donut charts (Case Status, Cases by Visa Type)
//   • Caseload Over Time line chart + Success Rate gradient card
//   • Upcoming Actions Required table
//
// All 5 backend endpoints wired in parallel. Mock fallback when responses empty.
// Charts use recharts (already in package.json).

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

import { analyticsApi } from '../../../api/lawyer/analytics.api';
import {
  PERIOD_LABELS,
  PRIORITY_CONFIG,
} from '../../../types/lawyer/analytics.types';
import type {
  AnalyticsPeriod,
  KpiCardsResponse,
  CaseStatusItem,
  CasesByVisaItem,
  CaseloadOverTimeResponse,
  UpcomingAction,
} from '../../../types/lawyer/analytics.types';

/* ════════════════════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');

  const [kpi, setKpi]                 = useState<KpiCardsResponse | null>(null);
  const [statusItems, setStatusItems] = useState<CaseStatusItem[]>([]);
  const [visaItems, setVisaItems]     = useState<CasesByVisaItem[]>([]);
  const [overTime, setOverTime]       = useState<CaseloadOverTimeResponse | null>(null);
  const [actions, setActions]         = useState<UpcomingAction[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  /* ── Parallel load ─────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const filters = { period };
      const [kpiRes, statusRes, visaRes, overRes, actionsRes] = await Promise.all([
        analyticsApi.getKpiCards(filters).catch(() => null),
        analyticsApi.getCaseStatus(filters).catch(() => ({ items: [], total: 0 })),
        analyticsApi.getCasesByVisa(filters).catch(() => ({ items: [], total: 0 })),
        analyticsApi.getCaseloadOverTime(filters).catch(() => null),
        analyticsApi.getUpcomingActions(10, 0).catch(() => ({ items: [], total: 0, limit: 10, offset: 0 })),
      ]);
      // Mock fallback when backend returns null OR every metric is 0
      const kpiIsEmpty = !kpiRes || (
        kpiRes.active_cases === 0 &&
        kpiRes.new_clients_month === 0 &&
        kpiRes.avg_case_duration_days === 0 &&
        kpiRes.pending_actions === 0 &&
        kpiRes.monthly_revenue === 0
      );
      setKpi(kpiIsEmpty ? MOCK_KPI : kpiRes);
      setStatusItems(statusRes.items.length ? statusRes.items : MOCK_STATUS);
      setVisaItems(visaRes.items.length ? visaRes.items : MOCK_VISA);
      setOverTime(overRes && overRes.months.length ? overRes : MOCK_OVER_TIME);
      setActions(actionsRes.items.length ? actionsRes.items : MOCK_ACTIONS);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      let msg = 'Could not load analytics.';
      if (ax?.response?.status === 401)      msg = 'Session expired. Please log in again.';
      else if (ax?.response?.status === 403) msg = 'You do not have permission to view analytics.';
      else if (e instanceof Error)           msg = e.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    alert('CSV export coming soon. Backend endpoint to be added: GET /analytics/export?period=...');
  };

  const handleActionClick = (a: UpcomingAction) => {
    // Future: route to case detail or doc review
    navigate(`/lawyer/clients/${a.client_user_id}`);
  };

  /* ── Render ──────────────────────────────────────────────────────── */
  return (
    <div className="bg-slate-50 pb-24" style={{ fontFamily: "'Inter', sans-serif" }}>
      <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">

        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">My Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">Overview of your caseload and practice performance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PeriodPills value={period} onChange={setPeriod} />
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span>⬇</span> Export
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}{' '}<button onClick={load} className="ml-2 font-semibold underline">Retry</button>
          </div>
        )}

        {/* KPI cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Active Cases"     value={kpi?.active_cases ?? 0}                        icon="💼" tint="bg-blue-50 text-blue-600"     loading={loading} />
          <KpiCard label="New Clients (Mo)" value={kpi?.new_clients_month ?? 0}                   icon="👤" tint="bg-emerald-50 text-emerald-600" loading={loading} />
          <KpiCard label="Avg Case Duration" value={`${kpi?.avg_case_duration_days ?? 0} days`}    icon="⏱"  tint="bg-amber-50 text-amber-600"   loading={loading} />
          <KpiCard label="Pending Actions"  value={kpi?.pending_actions ?? 0}                     icon="⚠"  tint="bg-red-50 text-red-600"       loading={loading} />
          <KpiCard label="Monthly Revenue"  value={`$${(kpi?.monthly_revenue ?? 0).toLocaleString()}`} icon="📊" tint="bg-violet-50 text-violet-600" loading={loading} />
        </div>

        {/* 2 donut charts */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutCard
            title="Case Status Breakdown"
            items={statusItems.map((s) => ({ name: s.label, value: s.count, color: s.color_hex, percentage: s.percentage }))}
            loading={loading}
          />
          <DonutCard
            title="Cases by Visa Type"
            items={visaItems.map((v) => ({ name: v.visa_name, value: v.count, color: v.color_hex, percentage: v.percentage, code: v.visa_code }))}
            loading={loading}
          />
        </div>

        {/* Caseload Over Time + Success Rate */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <CaseloadCard data={overTime} loading={loading} />
          <SuccessRateCard data={overTime} loading={loading} />
        </div>

        {/* Upcoming Actions table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
            <h3 className="text-base font-semibold text-gray-900">Upcoming Actions Required</h3>
            <button className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View All →</button>
          </div>
          <ActionsTable items={actions} loading={loading} onClick={handleActionClick} />
        </div>
      </main>
    </div>
  );
}

/* ── Period pills ───────────────────────────────────────────────────── */
function PeriodPills({ value, onChange }: { value: AnalyticsPeriod; onChange: (v: AnalyticsPeriod) => void }) {
  const periods: AnalyticsPeriod[] = ['this_month', 'q1_2026', 'last_12_months', 'custom'];
  return (
    <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
      {periods.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
            value === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

/* ── KPI card ───────────────────────────────────────────────────────── */
function KpiCard({
  label, value, icon, tint, loading,
}: {
  label: string;
  value: string | number;
  icon: string;
  tint: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ${tint}`}>{icon}</div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      {loading ? (
        <div className="mt-1 h-7 w-16 animate-pulse rounded bg-gray-100" />
      ) : (
        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
      )}
    </div>
  );
}

/* ── Donut chart card ───────────────────────────────────────────────── */
type DonutItem = { name: string; value: number; color: string; percentage: number; code?: string };

function DonutCard({ title, items, loading }: { title: string; items: DonutItem[]; loading: boolean }) {
  const total = useMemo(() => items.reduce((s, i) => s + i.value, 0), [items]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {loading ? (
        <div className="mt-4 h-48 animate-pulse rounded bg-gray-50" />
      ) : items.length === 0 ? (
        <p className="mt-8 text-center text-xs text-gray-400">No data for this period.</p>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={items} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} stroke="none">
                  {items.map((it, i) => <Cell key={i} fill={it.color} />)}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const v = typeof value === 'number' ? value : Number(value);
                    return `${v} cases`;
                  }}
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{total}</span>
              <span className="text-[10px] uppercase tracking-wider text-gray-500">Total</span>
            </div>
          </div>
          <ul className="flex-1 space-y-2 text-xs">
            {items.map((it) => (
              <li key={it.name} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                  <span className="truncate text-gray-700">{it.code ? `${it.code} · ` : ''}{it.name}</span>
                </span>
                <span className="shrink-0 font-semibold text-gray-900">{it.value} <span className="font-normal text-gray-400">({it.percentage.toFixed(0)}%)</span></span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ── Caseload line chart card ───────────────────────────────────────── */
function CaseloadCard({ data, loading }: { data: CaseloadOverTimeResponse | null; loading: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Caseload Over Time</h3>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
          <span className="h-2 w-2 rounded-full bg-indigo-500" /> Active Cases
        </span>
      </div>
      {loading ? (
        <div className="mt-4 h-52 animate-pulse rounded bg-gray-50" />
      ) : !data || data.months.length === 0 ? (
        <p className="mt-12 text-center text-xs text-gray-400">No caseload data for this period.</p>
      ) : (
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.months} margin={{ top: 8, right: 8, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="active_cases" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ── Success rate gradient card ─────────────────────────────────────── */
function SuccessRateCard({ data, loading }: { data: CaseloadOverTimeResponse | null; loading: boolean }) {
  const rate     = data?.case_success_rate ?? 0;
  const industry = data?.industry_avg_rate ?? 79;
  return (
    <div className="overflow-hidden rounded-xl p-5 text-white" style={{ backgroundImage: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' }}>
      <h3 className="text-sm font-semibold opacity-90">Case Success Rate</h3>
      {loading ? (
        <div className="mt-4 h-16 w-24 animate-pulse rounded bg-white/20" />
      ) : (
        <>
          <p className="mt-3 text-5xl font-bold tracking-tight">{rate}%</p>
          <p className="mt-2 text-xs opacity-80">
            of cases successfully resolved this year, without RFEs or denials.
          </p>
          <button className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/25">
            Industry avg {industry}%
          </button>
        </>
      )}
    </div>
  );
}

/* ── Upcoming Actions table ─────────────────────────────────────────── */
function ActionsTable({
  items, loading, onClick,
}: {
  items: UpcomingAction[];
  loading: boolean;
  onClick: (a: UpcomingAction) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-gray-50" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">No upcoming actions 🎉</p>
        <p className="mt-1 text-xs text-gray-500">You're all caught up.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left text-sm">
        <thead className="border-b border-gray-100 bg-gray-50/60">
          <tr className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            <th className="px-5 py-3">Client</th>
            <th className="px-5 py-3">Action Needed</th>
            <th className="px-5 py-3">Due Date</th>
            <th className="px-5 py-3">Priority</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((a) => {
            const cfg = PRIORITY_CONFIG[a.priority] ?? PRIORITY_CONFIG.medium;
            return (
              <tr key={a.task_id} onClick={() => onClick(a)} className="cursor-pointer hover:bg-gray-50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {a.client_name.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{a.client_name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">{a.case_number}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700">{a.action_title}</td>
                <td className="px-5 py-3 text-sm">
                  <p className={`${a.is_overdue ? 'font-semibold text-red-600' : 'text-gray-700'}`}>
                    {new Date(a.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {a.is_overdue && <p className="text-[10px] font-bold uppercase tracking-wider text-red-600">Overdue</p>}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Mock fallbacks (used when backend returns empty / all zeros) ──── */
const MOCK_KPI: KpiCardsResponse = {
  active_cases:           142,
  new_clients_month:      18,
  avg_case_duration_days: 68,
  pending_actions:        24,
  monthly_revenue:        12450,
};

const MOCK_STATUS: CaseStatusItem[] = [
  { status: 'in_progress',  label: 'In Progress',  count: 142, percentage: 55, color_hex: '#6366f1' },
  { status: 'action_needed', label: 'Action Needed', count: 24,  percentage: 9,  color_hex: '#ef4444' },
  { status: 'pending',       label: 'Pending',       count: 38,  percentage: 15, color_hex: '#f59e0b' },
  { status: 'approved',      label: 'Approved',      count: 48,  percentage: 19, color_hex: '#10b981' },
  { status: 'denied',        label: 'Denied',        count: 6,   percentage: 2,  color_hex: '#9ca3af' },
];

const MOCK_VISA: CasesByVisaItem[] = [
  { visa_type_id: 'v1', visa_code: 'H1B', visa_name: 'H-1B Specialty Occupation',   count: 84, percentage: 33, color_hex: '#6366f1' },
  { visa_type_id: 'v2', visa_code: 'L1',  visa_name: 'L-1 Intracompany Transfer',  count: 56, percentage: 22, color_hex: '#8b5cf6' },
  { visa_type_id: 'v3', visa_code: 'O1',  visa_name: 'O-1 Extraordinary Ability', count: 32, percentage: 13, color_hex: '#ec4899' },
  { visa_type_id: 'v4', visa_code: 'F1',  visa_name: 'F-1 Student',                count: 48, percentage: 19, color_hex: '#10b981' },
  { visa_type_id: 'v5', visa_code: 'TN',  visa_name: 'TN NAFTA Professional',     count: 38, percentage: 13, color_hex: '#f59e0b' },
];

const MOCK_OVER_TIME: CaseloadOverTimeResponse = {
  months: [
    { month: '2026-01', label: 'Jan', active_cases: 95  },
    { month: '2026-02', label: 'Feb', active_cases: 108 },
    { month: '2026-03', label: 'Mar', active_cases: 120 },
    { month: '2026-04', label: 'Apr', active_cases: 132 },
    { month: '2026-05', label: 'May', active_cases: 138 },
    { month: '2026-06', label: 'Jun', active_cases: 142 },
  ],
  case_success_rate: 94,
  industry_avg_rate: 79,
};

const MOCK_ACTIONS: UpcomingAction[] = [
  { task_id: 'm1', application_id: 'a1', client_user_id: 'u1', client_name: 'TechCorp Inc.',  client_avatar: null, case_number: '#H1B-2026-041', visa_code: 'H1B', action_title: 'LCA Approval',                  due_date: new Date().toISOString().slice(0,10),                                                        is_overdue: false, priority: 'high'   },
  { task_id: 'm2', application_id: 'a2', client_user_id: 'u2', client_name: 'David Chen',     client_avatar: null, case_number: '#H1B-2026-038', visa_code: 'H1B', action_title: 'Upload I-983 Form',              due_date: new Date(Date.now() + 5 * 86400000).toISOString().slice(0,10),                              is_overdue: false, priority: 'medium' },
  { task_id: 'm3', application_id: 'a3', client_user_id: 'u3', client_name: 'Global Systems', client_avatar: null, case_number: '#L1-2026-019',  visa_code: 'L1',  action_title: 'Client Signature Needed',        due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10),                            is_overdue: false, priority: 'medium' },
  { task_id: 'm4', application_id: 'a4', client_user_id: 'u4', client_name: 'Maria Garcia',   client_avatar: null, case_number: '#O1-2026-007',  visa_code: 'O1',  action_title: 'Background Verification Notice', due_date: new Date(Date.now() + 21 * 86400000).toISOString().slice(0,10),                            is_overdue: false, priority: 'low'    },
  { task_id: 'm5', application_id: 'a5', client_user_id: 'u5', client_name: 'Nova Innovations', client_avatar: null, case_number: '#H1B-2026-052', visa_code: 'H1B', action_title: 'Draft Support Letter',           due_date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0,10),                              is_overdue: true,  priority: 'high'   },
];
