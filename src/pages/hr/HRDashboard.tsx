
// src/pages/hr/HRDashboard.tsx
//
// HR Compliance Dashboard (/employer/dashboard).
// Renders inside DashboardLayout — owns only PageHeader + PageContent.
// Same production patterns as HRInviteEmployees: ToastStack, ConfirmModal,
// Drawer, EmptyState, LoadingLedger, IconAction, DetailItem.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ShieldCheck, AlertTriangle, History, UserPlus, Upload, RefreshCw,
  CalendarPlus, FileDown, Megaphone, Bell, ArrowUpRight, ArrowDownRight,
  TrendingUp, ChevronRight, FileCheck2, FileText, UserPlus2, CalendarClock,
  XCircle, ArrowRight, Search, Info, CheckCircle2, X, Inbox,BriefcaseBusiness,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useHRDashboard } from '../../hooks/hr/useDashboard';
import type {
  ExpiringVisa, ExpiryUrgency, RenewalStatus, ActivityItem, ActivityType,
} from '../../types/hr/dashboard.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: string; title: string; message?: string; tone: ToastTone };

type ConfirmAction =
  | { type: 'renew'; visa: ExpiringVisa }
  | { type: 'review'; visa: ExpiringVisa }
  | null;

type DrawerKind = 'expiring' | 'activity' | null;

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - +new Date(iso)) / 60_000);
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) {
    const h = Math.round(mins / 60);
    return `${h} hour${h === 1 ? '' : 's'} ago`;
  }
  const days = Math.round(mins / 1440);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

const initials = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
const avatarColor = (s: string) =>
  AVATAR_COLORS[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────

function urgencyToken(u: ExpiryUrgency) {
  switch (u) {
    case 'critical': return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Critical' };
    case 'warning':  return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Warning' };
    case 'upcoming': return { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'Upcoming' };
  }
}

function statusToken(s: RenewalStatus) {
  switch (s) {
    case 'renewal_pending': return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Renewal Pending' };
    case 'docs_needed':     return { bg: '#fefce8', text: '#a16207', dot: '#eab308', label: 'Docs Needed' };
    case 'in_progress':     return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'In Progress' };
    case 'active':          return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Active' };
  }
}

function visaToken(code: string) {
  const map: Record<string, { bg: string; text: string }> = {
    'H-1B': { bg: '#eff6ff', text: '#1d4ed8' },
    'L-1':  { bg: '#faf5ff', text: '#7e22ce' },
    'O-1':  { bg: '#fdf4ff', text: '#a21caf' },
    'TN':   { bg: '#f0fdfa', text: '#0f766e' },
    'E-3':  { bg: '#fdf2f8', text: '#be185d' },
  };
  return map[code] ?? { bg: '#eef2ff', text: '#4338ca' };
}

function activityIcon(t: ActivityType) {
  switch (t) {
    case 'visa_approved':       return { icon: <FileCheck2 size={14} />,    bg: '#dcfce7', color: '#15803d' };
    case 'expiry_alert':        return { icon: <AlertTriangle size={14} />, bg: '#fee2e2', color: '#dc2626' };
    case 'documents_uploaded':  return { icon: <FileText size={14} />,      bg: '#dbeafe', color: '#1d4ed8' };
    case 'renewal_initiated':   return { icon: <RefreshCw size={14} />,     bg: '#fff7ed', color: '#c2410c' };
    case 'employee_added':      return { icon: <UserPlus2 size={14} />,     bg: '#ede9fe', color: '#6d28d9' };
    case 'interview_scheduled': return { icon: <CalendarClock size={14} />, bg: '#fef9c3', color: '#a16207' };
    case 'application_rejected':return { icon: <XCircle size={14} />,       bg: '#fee2e2', color: '#dc2626' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE UI (matches the HRInviteEmployees standard — to be extracted next pass)
// ─────────────────────────────────────────────────────────────────────────────

// Stat card with icon-on-right + delta trend (dashboard-specific shape)
function StatCard({ label, value, delta, deltaSuffix, icon, iconBg, iconColor }: {
  label: string; value: number; delta: number; deltaSuffix: string;
  icon: ReactNode; iconBg: string; iconColor: string;
}) {
  const positive = delta > 0;
  const neutral = delta === 0;
  const trendColor = neutral ? '#94a3b8' : positive ? '#16a34a' : '#dc2626';
  const TrendIcon = neutral ? TrendingUp : positive ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-[12px]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">{label}</span>
        <div className="size-[36px] rounded-[10px] flex items-center justify-center shrink-0"
             style={{ backgroundColor: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <p className="text-[28px] font-bold text-[#0f172a] tracking-[-0.5px] leading-[36px] mt-[8px]">
        {value.toLocaleString()}
      </p>
      <p className="text-[12px] tracking-[-0.5px] mt-[2px] inline-flex items-center gap-[4px]" style={{ color: trendColor }}>
        <TrendIcon size={13} />
        <span className="font-medium">{neutral ? '0.0%' : `${positive ? '+' : ''}${delta.toFixed(1)}%`}</span>
        <span className="text-[#94a3b8] font-normal">{deltaSuffix}</span>
      </p>
    </div>
  );
}

function QuickAction({ icon, label, primary, disabled, onClick }: {
  icon: ReactNode; label: string; primary?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={disabled ? 'Coming soon' : undefined}
      className={`h-[40px] px-[14px] rounded-[10px] inline-flex items-center gap-[8px]
                  text-[13px] font-medium tracking-[-0.5px] transition whitespace-nowrap ${
                    disabled
                      ? 'bg-[#f8fafc] border border-[#e2e8f0] text-[#94a3b8] cursor-not-allowed'
                      : primary
                      ? 'text-white hover:opacity-90 active:scale-[0.98]'
                      : 'bg-white border border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                  }`}
      style={!disabled && primary ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
      {icon}{label}
      {disabled && (
        <span className="text-[9px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] bg-[#f1f5f9] rounded-[4px] px-[5px] py-[1px] ml-[2px]">
          Soon
        </span>
      )}
    </button>
  );
}

function ComplianceDonut({ score }: { score: number }) {
  const size = 96, stroke = 10, radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#22c55e" strokeWidth={stroke}
              strokeLinecap="round" strokeDasharray={`${dash} ${circumference}`} />
      <text x={size / 2} y={size / 2} dy={5} textAnchor="middle"
            transform={`rotate(90 ${size / 2} ${size / 2})`}
            fill="#0f172a" fontSize={22} fontWeight={700} style={{ letterSpacing: '-0.5px' }}>
        {score}%
      </text>
    </svg>
  );
}

// Single expiring-visa row — used in both the main table and the drawer
function ExpiringRow({ row, dense, onAction }: {
  row: ExpiringVisa; dense?: boolean; onAction: (r: ExpiringVisa) => void;
}) {
  const u = urgencyToken(row.urgency);
  const s = statusToken(row.status);
  const v = visaToken(row.visa_code);
  const isRenew = row.action === 'renew';

  if (dense) {
    // Compact row used in the drawer (no separate columns; vertical block)
    return (
      <div className="bg-white border border-[#f1f5f9] rounded-[12px] p-[14px] flex flex-col gap-[10px]">
        <div className="flex items-center gap-[10px]">
          <div className="size-[34px] rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
               style={{ backgroundColor: avatarColor(row.employee_name) }}>
            {initials(row.employee_name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-[#0f172a] tracking-[-0.5px] truncate">{row.employee_name}</p>
            <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] truncate">{row.department} · #{row.employee_code}</p>
          </div>
          <span className="inline-block px-[8px] py-[3px] rounded-[6px] text-[11px] font-semibold tracking-[-0.3px]"
                style={{ backgroundColor: v.bg, color: v.text }}>{row.visa_code}</span>
        </div>
        <div className="flex items-center justify-between gap-[8px]">
          <div>
            <p className="text-[12px] text-[#0f172a] tracking-[-0.5px]">{fmtDate(row.expiry_date)}</p>
            <p className="text-[11px] tracking-[-0.5px]" style={{ color: row.urgency === 'critical' ? '#dc2626' : '#94a3b8' }}>
              {row.days_left} days left
            </p>
          </div>
          <button onClick={() => onAction(row)}
            className={`h-[30px] px-[12px] rounded-[8px] text-[12px] font-semibold tracking-[-0.5px] transition whitespace-nowrap ${
              isRenew ? 'text-white' : 'bg-white border border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]'
            }`}
            style={isRenew ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
            {row.action === 'renew' ? 'Renew Now' : row.action === 'review' ? 'Review' : 'Monitor'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[1.8fr_1fr_0.8fr_1fr_0.9fr_1.1fr_110px] items-center gap-[16px]
                    px-[20px] py-[14px] border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#fafbfc] transition">
      <div className="flex items-center gap-[10px] min-w-0">
        <div className="size-[34px] rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
             style={{ backgroundColor: avatarColor(row.employee_name) }}>
          {initials(row.employee_name)}
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#0f172a] tracking-[-0.5px] truncate">{row.employee_name}</p>
          <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] truncate">#{row.employee_code}</p>
        </div>
      </div>

      <span className="text-[13px] text-[#475569] tracking-[-0.5px] truncate">{row.department ?? '—'}</span>

      <div className="flex flex-col items-center gap-[2px]">
        <span className="inline-block px-[10px] py-[3px] rounded-[6px] text-[11px] font-semibold tracking-[-0.3px]"
              style={{ backgroundColor: v.bg, color: v.text }}>{row.visa_code}</span>
        {row.visa_label && <span className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">{row.visa_label}</span>}
      </div>

      <div className="min-w-0">
        <p className="text-[13px] text-[#0f172a] tracking-[-0.5px] whitespace-nowrap">{fmtDate(row.expiry_date)}</p>
        <p className="text-[11px] tracking-[-0.5px] mt-[1px]" style={{ color: row.urgency === 'critical' ? '#dc2626' : '#94a3b8' }}>
          {row.days_left} days left
        </p>
      </div>

      <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[6px] text-[11px] font-medium tracking-[-0.3px] w-fit whitespace-nowrap"
            style={{ backgroundColor: u.bg, color: u.text }}>
        <span className="size-[6px] rounded-full" style={{ backgroundColor: u.dot }} />
        {u.label}
      </span>

      <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-[6px] text-[11px] font-medium tracking-[-0.3px] w-fit whitespace-nowrap"
            style={{ backgroundColor: s.bg, color: s.text }}>
        <span className="size-[6px] rounded-full" style={{ backgroundColor: s.dot }} />
        {s.label}
      </span>

      <button onClick={() => onAction(row)}
        className={`h-[32px] min-w-[96px] px-[14px] rounded-[8px] text-[12px] font-semibold tracking-[-0.5px] transition whitespace-nowrap justify-self-end ${
          isRenew ? 'text-white hover:opacity-90 active:scale-[0.98]' : 'bg-white border border-[#e2e8f0] text-[#334155] hover:bg-[#f8fafc]'
        }`}
        style={isRenew ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
        {row.action === 'renew' ? 'Renew Now' : row.action === 'review' ? 'Review' : 'Monitor'}
      </button>
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const a = activityIcon(item.type);
  return (
    <div className="flex items-start gap-[10px] py-[10px]">
      <div className="size-[28px] rounded-full flex items-center justify-center shrink-0 mt-[2px]"
           style={{ backgroundColor: a.bg, color: a.color }}>{a.icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[#0f172a] tracking-[-0.5px]">{item.title}</p>
        <p className="text-[12px] text-[#64748b] tracking-[-0.5px] leading-[17px] mt-[1px]">{item.description}</p>
        <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] mt-[3px]">{timeAgo(item.created_at)}</p>
      </div>
    </div>
  );
}

type UrgencyFilter = 'all' | ExpiryUrgency;
const FILTER_TABS: { key: UrgencyFilter; label: string }[] = [
  { key: 'all',      label: 'All' },
  { key: 'critical', label: 'Critical (<30d)' },
  { key: 'warning',  label: 'Warning (30–60d)' },
  { key: 'upcoming', label: 'Upcoming (60–90d)' },
];

function LoadingRows({ count = 5, height = 64 }: { count?: number; height?: number }) {
  return (
    <div className="p-[20px] flex flex-col gap-[10px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[10px] bg-[#f8fafc] animate-pulse border border-[#f1f5f9]" style={{ height }} />
      ))}
    </div>
  );
}

function SkeletonCard({ height }: { height: number }) {
  return <div className="bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" style={{ height }} />;
}

function EmptyState({ title, description, actionLabel, onAction }: {
  title: string; description: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-[56px] text-center">
      <div className="size-[48px] rounded-full bg-[#f1f5f9] flex items-center justify-center mb-[12px]">
        <Inbox size={22} className="text-[#94a3b8]" />
      </div>
      <p className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.5px]">{title}</p>
      <p className="text-[13px] text-[#64748b] tracking-[-0.5px] mt-[2px]">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction}
          className="mt-[14px] h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function Drawer({ open, title, subtitle, onClose, children }: {
  open: boolean; title: string; subtitle?: string; onClose: () => void; children: ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white border-l border-[#e2e8f0] shadow-2xl z-50 flex flex-col">
        <div className="px-[20px] py-[16px] border-b border-[#f1f5f9] flex items-start justify-between gap-[12px]">
          <div className="min-w-0">
            <h3 className="text-[17px] font-semibold text-[#0f172a] tracking-[-0.5px]">{title}</h3>
            {subtitle && <p className="text-[12px] text-[#64748b] tracking-[-0.5px] mt-[2px]">{subtitle}</p>}
          </div>
          <button onClick={onClose}
            className="size-[34px] rounded-[10px] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] shrink-0">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[20px]">{children}</div>
      </div>
    </>
  );
}

function ConfirmModal({ open, tone, title, message, confirmLabel, busy, onCancel, onConfirm }: {
  open: boolean; tone: 'danger' | 'primary'; title: string; message: string;
  confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[460px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-start gap-[12px]">
            <div className={`size-[42px] rounded-full flex items-center justify-center shrink-0 ${
              tone === 'danger' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {tone === 'danger' ? <AlertTriangle size={18} /> : <Info size={18} />}
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[#0f172a]">{title}</h3>
              <p className="text-[14px] text-[#64748b] mt-[4px]">{message}</p>
            </div>
          </div>
          <div className="mt-[24px] flex items-center justify-end gap-[10px]">
            <button onClick={onCancel}
              className="h-[40px] px-[16px] rounded-[10px] border border-[#e2e8f0] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={busy}
              className={`h-[40px] px-[16px] rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-60 ${
                tone === 'danger' ? 'bg-[#ef4444] hover:bg-[#dc2626]' : ''
              }`}
              style={tone === 'primary' ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
              {busy ? 'Please wait...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const tone: Record<ToastTone, { icon: ReactNode; box: string; iconBg: string; iconColor: string }> = {
    success: { icon: <CheckCircle2 size={16} />, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iconBg: 'bg-[#dcfce7]', iconColor: 'text-[#15803d]' },
    error:   { icon: <XCircle size={16} />,      box: 'border-[#fecaca] bg-[#fef2f2]', iconBg: 'bg-[#fee2e2]', iconColor: 'text-[#dc2626]' },
    warning: { icon: <AlertTriangle size={16} />,box: 'border-[#fde68a] bg-[#fffbeb]', iconBg: 'bg-[#fef3c7]', iconColor: 'text-[#c2410c]' },
    info:    { icon: <Info size={16} />,         box: 'border-indigo-200 bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-800' },
  };
  return (
    <div className="fixed right-[16px] top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const meta = tone[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${meta.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconColor}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
                {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
              </div>
              <button onClick={() => onDismiss(t.id)} className="text-[#94a3b8] hover:text-[#475569]">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HRDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useHRDashboard();

  const [filter, setFilter] = useState<UrgencyFilter>('all');
  const [search, setSearch] = useState('');
  const [drawer, setDrawer] = useState<DrawerKind>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems(prev => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => setToastItems(prev => prev.filter(x => x.id !== id)), 3200);
  };
  const dismissToast = (id: string) => setToastItems(prev => prev.filter(x => x.id !== id));

  // Auto-toast if the dashboard reloads silently with a new error
  useEffect(() => {
    if (error && data) pushToast('error', 'Refresh failed', error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // ── Filtered expiring rows ─────────────────────────────────────────────────
  const expiring = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.expiring.filter(e => {
      if (filter !== 'all' && e.urgency !== filter) return false;
      if (q && !`${e.employee_name} ${e.employee_code} ${e.department ?? ''} ${e.visa_code}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, filter, search]);

  // ── Header actions ─────────────────────────────────────────────────────────
  const headerActions = (
    <>
      <button type="button" aria-label="Notifications" onClick={() => navigate('/employer/notifications')}
        className="bg-white border border-[#e2e8f0] rounded-[10px] flex items-center justify-center size-[40px] relative hover:bg-[#f8fafc] transition shrink-0">
        <Bell size={16} className="text-[#64748b]" />
        <span className="absolute top-[9px] right-[10px] size-[7px] rounded-full bg-[#ef4444] border border-white" />
      </button>
      {/* <button onClick={() => navigate('/employer/invite')}
        className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}>
        <UserPlus size={16} /> Invite Employee
      </button>
      <button
        onClick={() => navigate('/employer/cases/new')}
        className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}
      >
        <BriefcaseBusiness size={16} /> Create Case
      </button> */}
    </>
  );

  // ── Row action handler ─────────────────────────────────────────────────────
  const onRowAction = (r: ExpiringVisa) => {
    if (r.action === 'renew')   setConfirm({ type: 'renew',  visa: r });
    else if (r.action === 'review') setConfirm({ type: 'review', visa: r });
    else navigate(`/employer/employees/${r.employee_id}`);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    const v = confirm.visa;
    if (confirm.type === 'renew') {
      pushToast('success', 'Renewal initiated', `Renewal workflow started for ${v.employee_name}.`);
      navigate(`/employer/employees/${v.employee_id}?action=renew`);
    } else {
      pushToast('info', 'Opening case', `Opening ${v.employee_name}'s case for review.`);
      navigate(`/employer/employees/${v.employee_id}?action=review`);
    }
    setConfirm(null);
  };

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toastItems} onDismiss={dismissToast} />

      <PageHeader
        title="HR Compliance Dashboard"
        subtitle="Monitor employee visa status, expirations, and compliance actions."
        showSearch={false}
        showBell={false}
        actions={headerActions}
      />

      <PageContent>
        {error && !data ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <p className="text-[#ef4444] text-[16px] font-medium mb-[4px]">Failed to load dashboard</p>
            <p className="text-[#64748b] text-[14px] mb-[16px]">{error}</p>
            <button onClick={() => void refetch()}
              className="text-indigo-600 text-[14px] font-medium hover:underline">Try again</button>
          </div>
        ) : (
          <div className="flex flex-col gap-[20px] sm:gap-[24px]">

            {/* ── Stats row ── */}
            {isLoading && !data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
                {[0, 1, 2, 3].map(i => <SkeletonCard key={i} height={120} />)}
              </div>
            ) : data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
                <StatCard label="Total Employees" value={data.stats.total_employees}
                          delta={data.stats.total_employees_delta ?? 0} deltaSuffix="vs last quarter"
                          icon={<Users size={18} />}         iconBg="#eef2ff" iconColor="#4f46e5" />
                <StatCard label="Active Visas" value={data.stats.active_visas}
                          delta={data.stats.active_visas_delta ?? 0} deltaSuffix="vs last quarter"
                          icon={<ShieldCheck size={18} />}   iconBg="#f0fdf4" iconColor="#16a34a" />
                <StatCard label="Expiring Soon" value={data.stats.expiring_soon}
                          delta={data.stats.expiring_soon_delta ?? 0} deltaSuffix="needs attention"
                          icon={<AlertTriangle size={18} />} iconBg="#fef2f2" iconColor="#dc2626" />
                <StatCard label="Pending Renewals" value={data.stats.pending_renewals}
                          delta={data.stats.pending_renewals_delta ?? 0} deltaSuffix="in progress"
                          icon={<History size={18} />}       iconBg="#fff7ed" iconColor="#ea580c" />
              </div>
            )}

            {/* ── Quick Actions ── */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[16px] sm:p-[20px]
                            shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-wrap items-center gap-[12px]">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b] mr-[4px]">
                Quick Actions
              </span>
              <QuickAction primary icon={<BriefcaseBusiness size={15} />} label="New Case"
                onClick={() => navigate('/employer/cases/new')} />
              <QuickAction primary icon={<UserPlus size={15} />}     label="Invite Employee"
                onClick={() => navigate('/employer/invite')} />
              <QuickAction         icon={<Upload size={15} />}       label="Upload Documents"   
              onClick={() => navigate(`/employer/cases`)} />
              <QuickAction         icon={<RefreshCw size={15} />}    label="Start Renewal"      disabled onClick={() => {}} />
              <QuickAction         icon={<CalendarPlus size={15} />} label="Schedule Interview" disabled onClick={() => {}} />
              <QuickAction         icon={<FileDown size={15} />}     label="Export Report"      disabled onClick={() => {}} />
              <QuickAction         icon={<Megaphone size={15} />}    label="Bulk Notify"        disabled onClick={() => {}} />
            </div>

            {/* ── Main grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-[20px]">

              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-[20px] min-w-0">

                {/* Visas Expiring Soon */}
                <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                  <div className="px-[20px] pt-[20px] pb-[14px] flex flex-col sm:flex-row sm:items-start justify-between gap-[12px]">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#0f172a] tracking-[-0.5px]">Visas Expiring Soon</h3>
                      <p className="text-[12px] text-[#64748b] tracking-[-0.5px] mt-[2px]">Employees requiring immediate renewal action</p>
                    </div>
                    {data && (
                      <div className="flex items-center gap-[12px] shrink-0">
                        <span className="inline-flex items-center gap-[5px] text-[12px] font-medium text-[#dc2626] tracking-[-0.5px]">
                          <AlertTriangle size={13} /> {data.compliance.needs_action_count} require action
                        </span>
                        <button onClick={() => setDrawer('expiring')}
                          className="text-[12px] font-medium text-indigo-600 tracking-[-0.5px] hover:underline inline-flex items-center gap-[3px]">
                          View All <ArrowRight size={12} />
                        </button>
                      </div>
                    )}
                  </div>

                  {data && (
                    <div className="px-[20px] pb-[12px] flex items-center gap-[12px] flex-wrap justify-between">
                      <div className="flex items-center gap-[6px] flex-wrap">
                        {FILTER_TABS.map(t => (
                          <button key={t.key} onClick={() => setFilter(t.key)}
                            className={`h-[28px] px-[12px] rounded-[8px] text-[12px] font-medium tracking-[-0.5px] transition ${
                              filter === t.key
                                ? 'text-white shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                                : 'bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]'
                            }`}
                            style={filter === t.key ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative w-full sm:w-[240px]">
                        <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
                        <input
                          value={search} onChange={e => setSearch(e.target.value)}
                          placeholder="Search employees..."
                          className="w-full h-[32px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] pl-[30px] pr-[10px]
                                     text-[12px] text-[#0f172a] tracking-[-0.5px] placeholder:text-[#94a3b8]
                                     focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] focus:border-[#a5b4fc] transition" />
                      </div>
                    </div>
                  )}

                  {data && (
                    <div className="grid grid-cols-[1.8fr_1fr_0.8fr_1fr_0.9fr_1.1fr_110px] gap-[16px]
                                    px-[20px] py-[10px] border-y border-[#f1f5f9] bg-[#f9fafb]">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Employee</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Department</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] text-center">Visa Type</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Expiry Date</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Urgency</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">Status</span>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8] text-right">Actions</span>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {isLoading && !data ? (
                        <LoadingRows count={5} height={64} />
                      ) : expiring.length > 0 ? (
                        expiring.map(row => <ExpiringRow key={row.id} row={row} onAction={onRowAction} />)
                      ) : (
                        <EmptyState
                          title={search ? 'No employees match your search' : 'No employees in this category'}
                          description={search ? 'Try a different name, code, or visa type.' : 'Adjust the filter above to see other urgency buckets.'}
                          actionLabel={search ? 'Clear search' : undefined}
                          onAction={search ? () => setSearch('') : undefined}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                {isLoading && !data ? <SkeletonCard height={320} /> : data && (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                    <h3 className="text-[16px] font-semibold text-[#0f172a] tracking-[-0.5px]">Visa Expiration Timeline</h3>
                    <p className="text-[12px] text-[#64748b] tracking-[-0.5px] mt-[2px] mb-[16px]">
                      Expirations by month — next 6 months
                    </p>
                    <div style={{ width: '100%', height: 260 }}>
                      <ResponsiveContainer>
                        <BarChart data={data.timeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{
                            backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
                            fontSize: 12, fontFamily: 'Inter, sans-serif',
                          }} cursor={{ fill: '#f8fafc' }} />
                          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                          <Bar dataKey="upcoming" stackId="a" fill="#3b82f6" name="Upcoming (60–90d)" />
                          <Bar dataKey="warning"  stackId="a" fill="#f97316" name="Warning (30–60d)" />
                          <Bar dataKey="critical" stackId="a" fill="#ef4444" name="Critical (<30d)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-[20px] min-w-0">

                {/* Compliance */}
                {isLoading && !data ? <SkeletonCard height={260} /> : data && (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                    <div className="flex items-start justify-between mb-[12px]">
                      <h3 className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.5px]">Compliance Score</h3>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#94a3b8]">
                        {data.compliance.period}
                      </span>
                    </div>
                    <div className="flex items-center gap-[14px]">
                      <ComplianceDonut score={data.compliance.score} />
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-[#15803d] tracking-[-0.5px]">{data.compliance.label}</p>
                        <p className="text-[12px] text-[#64748b] tracking-[-0.5px] leading-[17px] mt-[2px]">
                          {data.compliance.needs_action_count} employees need action to maintain full compliance.
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-[#f1f5f9] mt-[16px] pt-[12px] flex flex-col gap-[8px]">
                      <div className="flex items-center justify-between text-[12px] tracking-[-0.5px]">
                        <span className="text-[#64748b]">Active &amp; Compliant</span>
                        <span className="font-semibold text-[#15803d]">{data.compliance.active_compliant}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px] tracking-[-0.5px]">
                        <span className="text-[#64748b]">Expiring &lt;30 days</span>
                        <span className="font-semibold text-[#dc2626]">{data.compliance.expiring_under_30}</span>
                      </div>
                      <div className="flex items-center justify-between text-[12px] tracking-[-0.5px]">
                        <span className="text-[#64748b]">Expiring 30–90 days</span>
                        <span className="font-semibold text-[#c2410c]">{data.compliance.expiring_30_90}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                {isLoading && !data ? <SkeletonCard height={500} /> : data && (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-between mb-[8px]">
                      <h3 className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.5px]">Recent Activity</h3>
                      <button onClick={() => setDrawer('activity')}
                        className="text-[12px] font-medium text-indigo-600 tracking-[-0.5px] hover:underline inline-flex items-center gap-[3px]">
                        See all <ChevronRight size={12} />
                      </button>
                    </div>
                    <div className="divide-y divide-[#f1f5f9]">
                      {data.activity.length > 0 ? (
                        data.activity.slice(0, 7).map(item => <ActivityRow key={item.id} item={item} />)
                      ) : (
                        <p className="text-[13px] text-[#94a3b8] tracking-[-0.5px] py-[16px] text-center">
                          No recent activity.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </PageContent>

      {/* Expiring drawer */}
      <Drawer
        open={drawer === 'expiring'}
        title="All Expiring Visas"
        subtitle={data ? `${data.expiring.length} employees with visas expiring in the next 90 days` : undefined}
        onClose={() => setDrawer(null)}>
        <div className="flex flex-col gap-[10px]">
          {data?.expiring.map(row => (
            <ExpiringRow key={row.id} row={row} dense onAction={onRowAction} />
          ))}
        </div>
        {data && (
          <button
            onClick={() => { setDrawer(null); navigate('/employer/deadlines'); }}
            className="mt-[16px] w-full h-[40px] rounded-[10px] border border-indigo-200 text-indigo-600 text-[13px] font-semibold hover:bg-indigo-50">
            Open full Deadlines page
          </button>
        )}
      </Drawer>

      {/* Activity drawer */}
      <Drawer
        open={drawer === 'activity'}
        title="Recent Activity"
        subtitle="Newest events across your company"
        onClose={() => setDrawer(null)}>
        <div className="divide-y divide-[#f1f5f9]">
          {data?.activity.map(item => (
            <div key={item.id} className="py-[2px]"><ActivityRow item={item} /></div>
          ))}
        </div>
        <button
          onClick={() => { setDrawer(null); navigate('/employer/notifications'); }}
          className="mt-[16px] w-full h-[40px] rounded-[10px] border border-indigo-200 text-indigo-600 text-[13px] font-semibold hover:bg-indigo-50">
          Open full Notifications page
        </button>
      </Drawer>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        tone="primary"
        title={confirm?.type === 'renew' ? 'Start renewal' : 'Open case for review'}
        message={
          confirm?.type === 'renew'
            ? `Initiate the renewal workflow for ${confirm.visa.employee_name}'s ${confirm.visa.visa_code} visa? You'll be taken to the case page to continue.`
            : confirm?.type === 'review'
            ? `Open ${confirm.visa.employee_name}'s case to review status and documents?`
            : ''
        }
        confirmLabel={confirm?.type === 'renew' ? 'Start Renewal' : 'Open Case'}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}