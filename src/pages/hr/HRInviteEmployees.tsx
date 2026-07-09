
// src/pages/hr/HRInviteEmployees.tsx

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  // UserPlus,
  Mail, Link2, KeyRound, Bell, Search, Send, RefreshCw, Copy, Share2,
  Check, RotateCw, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, Inbox,
  Eye, AlertTriangle, Info, CheckCircle2, XCircle,
} from 'lucide-react';

import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useMyInvitations, useSendEmailInvite, useGenerateCode } from '../../hooks/hr/useInvitations';
import { invitationApi } from '../../api/hr/invitation.api';
import type { InvitationResponse, InviteMethod, InviteStatus } from '../../types/hr/invitation.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';
const PAGE_SIZE = 8;
const ROLE_OPTIONS = ['Employee (Standard)', 'Team Lead', 'Department Head', 'Viewer Only'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type ToastItem = {
  id: string;
  title: string;
  message?: string;
  tone: ToastTone;
};

type ConfirmAction =
  | { type: 'resend'; invitation: InvitationResponse }
  | { type: 'revoke'; invitation: InvitationResponse }
  | { type: 'regenerate_link' }
  | { type: 'generate_code' }
  | null;

// ── Formatters ────────────────────────────────────────────────────────────────
function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function nameFromEmail(email?: string): string {
  if (!email) return 'Invitation';
  const local = email.split('@')[0];
  return (
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .map(w => w[0].toUpperCase() + w.slice(1))
      .join(' ') || email
  );
}

function initials(label: string): string {
  return label
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
function avatarColor(seed: string): string {
  const i = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ── Tokens ────────────────────────────────────────────────────────────────────
function methodToken(m: InviteMethod): { icon: ReactNode; bg: string; text: string; label: string } {
  switch (m) {
    case 'email':
      return { icon: <Mail size={13} />, bg: '#eef2ff', text: '#4338ca', label: 'Email' };
    case 'link':
      return { icon: <Link2 size={13} />, bg: '#ecfeff', text: '#0e7490', label: 'Link' };
    case 'code':
      return { icon: <KeyRound size={13} />, bg: '#faf5ff', text: '#7e22ce', label: 'Code' };
  }
}

function statusToken(s: InviteStatus): { bg: string; text: string; dot: string; label: string } {
  switch (s) {
    case 'pending':
      return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Pending' };
    case 'accepted':
      return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Accepted' };
    case 'expired':
      return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Expired' };
    case 'revoked':
      return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Revoked' };
  }
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function useCopied() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      //
    }
  };

  return { copied, copy };
}

function pageWindow(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | 'ellipsis')[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push('ellipsis');
  for (let p = left; p <= right; p++) out.push(p);
  if (right < total - 1) out.push('ellipsis');
  out.push(total);
  return out;
}

function inviteDisplayValue(inv: InvitationResponse) {
  if (inv.invite_method === 'email') return inv.invited_email ?? '—';
  if (inv.invite_method === 'code') return inv.invite_code ?? '—';
  return inv.invite_token ? `https://app.Vyflo.io/invite/${inv.invite_token}` : '—';
}

function inferredUses(inv: InvitationResponse): string {
  const used = inv.used_count ?? 0;
  const max = inv.max_uses;
  return max != null ? `${used} / ${max}` : `${used} / ∞`;
}

function getEmptyTitle(tab: 'all' | InviteStatus, search: string) {
  if (search.trim()) return 'No invitations match your search';
  if (tab === 'all') return 'No invitations yet';
  if (tab === 'pending') return 'No pending invitations';
  if (tab === 'accepted') return 'No accepted invitations';
  if (tab === 'expired') return 'No expired invitations';
  return 'No revoked invitations';
}

function getEmptyDesc(tab: 'all' | InviteStatus, search: string) {
  if (search.trim()) return 'Try another email, code, or token search.';
  if (tab === 'all') return 'Send your first invitation using email, link, or code.';
  return 'There is nothing in this section right now.';
}

// ── Reusable UI ───────────────────────────────────────────────────────────────
function StatCard({
  value,
  label,
  sublabel,
  dot,
}: {
  value: number;
  label: string;
  sublabel: string;
  dot: string;
}) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] flex flex-col items-center text-center gap-[6px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <p className="text-[28px] font-bold text-[#0f172a] tracking-[-0.5px] leading-[32px]">
        {value.toLocaleString()}
      </p>
      <span className="inline-flex items-center gap-[6px] text-[12px] font-medium text-[#334155] tracking-[-0.5px]">
        <span className="size-[7px] rounded-full" style={{ backgroundColor: dot }} />
        {label}
      </span>
      <span className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">{sublabel}</span>
    </div>
  );
}

function CardHead({
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
}: {
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-[12px]">
      <div
        className="size-[40px] rounded-[10px] flex items-center justify-center shrink-0"
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-[16px] font-semibold text-[#0f172a] tracking-[-0.5px] leading-[20px]">
          {title}
        </h3>
        <p className="text-[12px] text-[#64748b] tracking-[-0.5px] mt-[1px] truncate">{subtitle}</p>
      </div>
    </div>
  );
}

const sectionLabel = 'text-[11px] font-semibold uppercase tracking-[0.04em] text-[#64748b]';
// const LEDGER_GRID = 'grid-cols-[1.8fr_0.9fr_1fr_1fr_1fr_1.1fr_auto]';
const LEDGER_GRID_STYLE: React.CSSProperties = {
  gridTemplateColumns: '1.8fr 0.9fr 1fr 1fr 1fr 1.1fr 120px',
};

function InfoRow({
  left,
  right,
  rightTone,
}: {
  left: string;
  right: string;
  rightTone: 'good' | 'muted';
}) {
  return (
    <div className="flex items-center justify-between bg-[#f8fafc] rounded-[10px] px-[12px] py-[9px]">
      <span className="text-[12px] text-[#475569] tracking-[-0.5px]">{left}</span>
      <span
        className="text-[12px] font-medium tracking-[-0.5px] inline-flex items-center gap-[5px]"
        style={{ color: rightTone === 'good' ? '#16a34a' : '#94a3b8' }}
      >
        {rightTone === 'good' && <span className="size-[6px] rounded-full bg-[#22c55e]" />}
        {right}
      </span>
    </div>
  );
}

function IconAction({
  active,
  busy,
  label,
  onClick,
  children,
}: {
  active: boolean;
  busy?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={active && !busy ? onClick : undefined}
      disabled={!active || busy}
      aria-label={label}
      className={`size-[32px] rounded-[8px] flex items-center justify-center transition ${
        active
          ? 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#334155]'
          : 'text-[#cbd5e1] cursor-not-allowed'
      }`}
    >
      {children}
    </button>
  );
}
function LedgerRow({
  inv,
  busy,
  onView,
  onResend,
  onCopy,
  onRevoke,
}: {
  inv: InvitationResponse;
  busy: boolean;
  onView: (i: InvitationResponse) => void;
  onResend: (i: InvitationResponse) => void;
  onCopy: (i: InvitationResponse) => void;
  onRevoke: (i: InvitationResponse) => void;
}) {
  const m = methodToken(inv.invite_method);
  const s = statusToken(inv.status);
  const recipient =
    inv.invited_email ??
    (inv.invite_method === 'code' ? 'Company code' : 'Shareable link');

  const name = inv.invited_email
    ? nameFromEmail(inv.invited_email)
    : `${m.label} invite`;

  const canResend = inv.status === 'pending';
  const canCopy =
    inv.invite_method !== 'email' &&
    (!!inv.invite_code || !!inv.invite_token);
  const canRevoke = inv.status !== 'revoked';

  return (
    <div
      style={LEDGER_GRID_STYLE}
      className="grid items-center gap-[12px] px-[24px] py-[14px] border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#fafbfc] transition"
    >
      <div className="flex items-center gap-[10px] min-w-0">
        <div
          className="size-[36px] rounded-full flex items-center justify-center text-white text-[12px] font-semibold shrink-0"
          style={{ backgroundColor: avatarColor(recipient) }}
        >
          {initials(name)}
        </div>

        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-[#0f172a] tracking-[-0.5px] truncate">
            {name}
          </p>
          <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px] truncate">
            {recipient}
          </p>
        </div>
      </div>

      <span
        className="justify-self-start inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-medium tracking-[-0.3px] whitespace-nowrap"
        style={{ backgroundColor: m.bg, color: m.text }}
      >
        {m.icon}
        {m.label}
      </span>

      <span className="text-[13px] text-[#64748b] tracking-[-0.5px] truncate">
        Employee
      </span>

      <span className="text-[13px] text-[#475569] tracking-[-0.5px]">
        {fmtDate(inv.created_at)}
      </span>

      <span
        className="text-[13px] tracking-[-0.5px]"
        style={{ color: inv.status === 'expired' ? '#dc2626' : '#475569' }}
      >
        {fmtDate(inv.expires_at)}
      </span>

      <span
        className="justify-self-start inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-medium tracking-[-0.3px] whitespace-nowrap"
        style={{ backgroundColor: s.bg, color: s.text }}
      >
        <span
          className="size-[6px] rounded-full"
          style={{ backgroundColor: s.dot }}
        />
        {s.label}
      </span>

      {/* <div className="w-[120px] flex items-center justify-end gap-[2px]"> */}
      <div className="w-[120px] flex items-center justify-end gap-[2px] pr-[8px]">
        <IconAction
          active={true}
          busy={busy}
          onClick={() => onView(inv)}
          label="View invitation"
        >
          <Eye size={15} />
        </IconAction>

        <IconAction
          active={canResend}
          busy={busy}
          onClick={() => onResend(inv)}
          label="Resend invitation"
        >
          <RotateCw size={15} />
        </IconAction>

        <IconAction
          active={canCopy}
          busy={busy}
          onClick={() => onCopy(inv)}
          label="Copy invite"
        >
          <Copy size={15} />
        </IconAction>

        <IconAction
          active={canRevoke}
          busy={busy}
          onClick={() => onRevoke(inv)}
          label="Revoke invitation"
        >
          <Trash2 size={15} />
        </IconAction>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-[56px] text-center">
      <div className="size-[48px] rounded-full bg-[#f1f5f9] flex items-center justify-center mb-[12px]">
        <Inbox size={22} className="text-[#94a3b8]" />
      </div>
      <p className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.5px]">{title}</p>
      <p className="text-[13px] text-[#64748b] tracking-[-0.5px] mt-[2px]">{description}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-[14px] h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold"
          style={{ backgroundImage: PRIMARY_GRADIENT }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function LoadingLedger() {
  return (
    <div className="p-[24px] flex flex-col gap-[12px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-[58px] rounded-[12px] bg-[#f8fafc] animate-pulse border border-[#f1f5f9]" />
      ))}
    </div>
  );
}

function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white border-l border-[#e2e8f0] shadow-2xl z-50 flex flex-col">
        <div className="h-[64px] px-[20px] border-b border-[#f1f5f9] flex items-center justify-between">
          <h3 className="text-[18px] font-semibold text-[#0f172a]">{title}</h3>
          <button
            onClick={onClose}
            className="size-[34px] rounded-[10px] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-[20px]">{children}</div>
      </div>
    </>
  );
}

function ConfirmModal({
  open,
  tone,
  title,
  message,
  confirmLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  tone: 'danger' | 'primary';
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[460px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-start gap-[12px]">
            <div
              className={`size-[42px] rounded-full flex items-center justify-center shrink-0 ${
                tone === 'danger' ? 'bg-[#fef2f2] text-[#dc2626]' : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {tone === 'danger' ? <AlertTriangle size={18} /> : <Info size={18} />}
            </div>
            <div>
              <h3 className="text-[18px] font-semibold text-[#0f172a]">{title}</h3>
              <p className="text-[14px] text-[#64748b] mt-[4px]">{message}</p>
            </div>
          </div>

          <div className="mt-[24px] flex items-center justify-end gap-[10px]">
            <button
              onClick={onCancel}
              className="h-[40px] px-[16px] rounded-[10px] border border-[#e2e8f0] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className={`h-[40px] px-[16px] rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-60 ${
                tone === 'danger' ? 'bg-[#ef4444] hover:bg-[#dc2626]' : ''
              }`}
              style={tone === 'primary' ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
            >
              {busy ? 'Please wait...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function ToastStack({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const toneMap: Record<
    ToastTone,
    { icon: ReactNode; box: string; iconBg: string; iconColor: string }
  > = {
    success: {
      icon: <CheckCircle2 size={16} />,
      box: 'border-[#bbf7d0] bg-[#f0fdf4]',
      iconBg: 'bg-[#dcfce7]',
      iconColor: 'text-[#15803d]',
    },
    error: {
      icon: <XCircle size={16} />,
      box: 'border-[#fecaca] bg-[#fef2f2]',
      iconBg: 'bg-[#fee2e2]',
      iconColor: 'text-[#dc2626]',
    },
    warning: {
      icon: <AlertTriangle size={16} />,
      box: 'border-[#fde68a] bg-[#fffbeb]',
      iconBg: 'bg-[#fef3c7]',
      iconColor: 'text-[#c2410c]',
    },
    info: {
      icon: <Info size={16} />,
      box: 'border-indigo-200 bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-800',
    },
  };

  return (
    <div className="fixed right-[16px] top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const meta = toneMap[t.tone];
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
export default function HRInviteEmployees() {
  const navigate = useNavigate();
  const { invitations, total, loading, error, refetch, revoke, resend } = useMyInvitations();
  const emailInvite = useSendEmailInvite();
  const codeGen = useGenerateCode();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [emailErr, setEmailErr] = useState<string | null>(null);

  const [tab, setTab] = useState<'all' | InviteStatus>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);

  const [selectedInvite, setSelectedInvite] = useState<InvitationResponse | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction>(null);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  const latest = (method: InviteMethod) =>
    invitations
      .filter(i => i.invite_method === method && i.status !== 'revoked' && i.status !== 'expired')
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null;

  const linkInv = useMemo(() => latest('link'), [invitations]);
  // const codeInv = useMemo(() => latest('code'), [invitations]);

  const linkUrl = linkInv?.invite_token ? `https://app.Vyuflo.io/invite/${linkInv.invite_token}` : null;
  const linkCopy = useCopied();
  const codeCopy = useCopied();

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, expired: 0, revoked: 0 };
    for (const i of invitations) c[i.status] += 1;
    return c;
  }, [invitations]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invitations.filter(i => {
      if (tab !== 'all' && i.status !== tab) return false;
      if (q && !(`${i.invited_email ?? ''} ${i.invite_code ?? ''} ${i.invite_token ?? ''}`.toLowerCase().includes(q))) {
        return false;
      }
      return true;
    });
  }, [invitations, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const TABS: { key: 'all' | InviteStatus; label: string; badge?: number }[] = [
    { key: 'all', label: 'All', badge: total || invitations.length },
    { key: 'pending', label: 'Pending' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'expired', label: 'Expired' },
    { key: 'revoked', label: 'Revoked' },
  ];

  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems(prev => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => {
      setToastItems(prev => prev.filter(x => x.id !== id));
    }, 3200);
  };

  const dismissToast = (id: string) => {
    setToastItems(prev => prev.filter(x => x.id !== id));
  };

  const setTabAndReset = (t: 'all' | InviteStatus) => {
    setTab(t);
    setPage(1);
  };

  const setSearchAndReset = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const addEmail = (raw: string) => {
    const e = raw.trim().replace(/,$/, '');
    if (!e) return;
    if (!EMAIL_RE.test(e)) {
      setEmailErr(`"${e}" isn't a valid email.`);
      return;
    }
    if (emails.includes(e)) {
      setEmailErr(`"${e}" is already added.`);
      setEmailInput('');
      return;
    }
    setEmails(prev => [...prev, e]);
    setEmailInput('');
    setEmailErr(null);
  };

  const onEmailKey = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === 'Enter' || ev.key === ',') {
      ev.preventDefault();
      addEmail(emailInput);
    } else if (ev.key === 'Backspace' && !emailInput && emails.length) {
      setEmails(prev => prev.slice(0, -1));
    }
  };

  const sendInvites = async () => {
    const list = emailInput ? [...emails, emailInput.trim()] : emails;
    const clean = list.filter(e => EMAIL_RE.test(e));

    if (!clean.length) {
      setEmailErr('Add at least one valid email.');
      return;
    }

    try {
      for (const email of clean) {
        await emailInvite.send({ email });
      }
      setEmails([]);
      setEmailInput('');
      emailInvite.reset();
      await refetch();
      pushToast('success', 'Invitation sent successfully!', `${clean.length} email invitation(s) have been sent.`);
    } catch {
      pushToast('error', 'Failed to send invitation', 'Please check the email addresses and try again.');
    }
  };

  const shareLink = async () => {
    if (!linkUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ url: linkUrl, title: 'Join us on Vyuflo' });
      } catch {
        //
      }
    } else {
      await linkCopy.copy(linkUrl);
      pushToast('success', 'Link copied to clipboard!', 'Invite link has been copied.');
    }
  };

  const onCopyRow = async (i: InvitationResponse) => {
    try {
      if (i.invite_code) {
        await navigator.clipboard?.writeText(i.invite_code);
        pushToast('success', 'Code copied to clipboard!', 'Invite code has been copied.');
      } else if (i.invite_token) {
        await navigator.clipboard?.writeText(`https://app.Vyuflo.io/invite/${i.invite_token}`);
        pushToast('success', 'Link copied to clipboard!', 'Invite link has been copied.');
      }
    } catch {
      pushToast('error', 'Copy failed', 'Clipboard copy is not available here.');
    }
  };

  const withBusy = async (id: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirm = async () => {
    if (!confirm) return;

    try {
      if (confirm.type === 'resend') {
        await withBusy(confirm.invitation.id, () => resend(confirm.invitation.id));
        await refetch();
        pushToast('success', 'Invitation resent', 'A fresh invite has been sent to the recipient.');
      }

      if (confirm.type === 'revoke') {
        await withBusy(confirm.invitation.id, () => revoke(confirm.invitation.id));
        await refetch();
        pushToast('warning', 'Invitation revoked', 'The invitation has been revoked successfully.');
        if (selectedInvite?.id === confirm.invitation.id) {
          setSelectedInvite({ ...confirm.invitation, status: 'revoked' });
        }
      }

      if (confirm.type === 'regenerate_link') {
        setLinkBusy(true);
        await invitationApi.inviteByLink({ expires_days: 7 });
        await refetch();
        pushToast('success', 'New invite link generated', 'Previous link has been replaced.');
      }

      if (confirm.type === 'generate_code') {
        await codeGen.generate({});
        await refetch();
        pushToast('success', 'New invite code generated', 'A fresh company code is now active.');
      }
    } catch {
      pushToast('error', 'Something went wrong', 'Please try again.');
    } finally {
      setLinkBusy(false);
      setConfirm(null);
    }
  };

  useEffect(() => {
    if (linkCopy.copied) pushToast('success', 'Link copied to clipboard!', 'Invite link has been copied.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkCopy.copied]);

  useEffect(() => {
    if (codeCopy.copied) pushToast('success', 'Code copied to clipboard!', 'Invite code has been copied.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeCopy.copied]);

  const headerActions = (
    <>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => navigate('/employer/notifications')}
        className="bg-white border border-[#e2e8f0] rounded-[10px] flex items-center justify-center size-[40px] relative hover:bg-[#f8fafc] transition shrink-0"
      >
        <Bell size={16} className="text-[#64748b]" />
        <span className="absolute top-[9px] right-[10px] size-[7px] rounded-full bg-[#ef4444] border border-white" />
      </button>
{/* 
      <button
        onClick={() => emailInputRef.current?.focus()}
        className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}
      >
        <UserPlus size={16} /> Invite Employee
      </button> */}
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toastItems} onDismiss={dismissToast} />

      <PageHeader
        title="Invite Employees"
        subtitle="Onboard new employees by sending invitations via email, link, or code."
        showSearch={false}
        showBell={false}
        actions={headerActions}
      />

      <PageContent>
        {loading && !invitations.length ? (
          <div className="flex items-center justify-center py-[80px]">
            <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error && !invitations.length ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <p className="text-[#ef4444] text-[16px] font-medium mb-[4px]">Failed to load invitations</p>
            <p className="text-[#64748b] text-[14px] mb-[16px]">{error}</p>
            <button onClick={() => void refetch()} className="text-indigo-600 text-[14px] font-medium hover:underline">
              Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[20px] sm:gap-[24px]">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
              <StatCard value={counts.pending} label="Pending" sublabel="Awaiting acceptance" dot="#f97316" />
              <StatCard value={counts.accepted} label="Accepted" sublabel="Successfully onboarded" dot="#22c55e" />
              <StatCard value={counts.expired} label="Expired" sublabel="Need to be resent" dot="#94a3b8" />
              <StatCard value={counts.revoked} label="Revoked" sublabel="Access removed" dot="#ef4444" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] sm:gap-[20px] items-start">
              {/* Email Invite */}
              <div className="relative overflow-hidden bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] sm:p-[24px] flex flex-col gap-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                <div className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundImage: PRIMARY_GRADIENT }} />
                <CardHead
                  icon={<Mail size={18} />}
                  iconBg="#eef2ff"
                  iconColor="#4f46e5"
                  title="Email Invite"
                  subtitle="Send direct invitations to employees"
                />

                <div className="flex flex-col gap-[8px]">
                  <span className={sectionLabel}>Recipient Emails</span>
                  <div className="min-h-[44px] border border-[#e2e8f0] rounded-[10px] px-[10px] py-[8px] flex flex-wrap gap-[6px] focus-within:ring-2 focus-within:ring-[#c7d2fe] focus-within:border-[#a5b4fc] transition">
                    {emails.map(e => (
                      <span
                        key={e}
                        className="inline-flex items-center gap-[6px] h-[26px] pl-[10px] pr-[6px] rounded-[8px] bg-indigo-50 text-indigo-800 text-[12px] font-medium tracking-[-0.3px]"
                      >
                        {e}
                        <button
                          onClick={() => setEmails(prev => prev.filter(x => x !== e))}
                          aria-label={`Remove ${e}`}
                          className="hover:text-[#312e81]"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                    <input
                      ref={emailInputRef}
                      value={emailInput}
                      onChange={ev => {
                        setEmailInput(ev.target.value);
                        setEmailErr(null);
                      }}
                      onKeyDown={onEmailKey}
                      onBlur={() => emailInput && addEmail(emailInput)}
                      placeholder={emails.length ? '' : 'Add email, press Enter…'}
                      className="flex-1 min-w-[120px] h-[26px] bg-transparent text-[13px] text-[#0f172a] tracking-[-0.5px] placeholder:text-[#94a3b8] focus:outline-none"
                    />
                  </div>

                  <p className="text-[11px] tracking-[-0.5px]" style={{ color: emailErr ? '#dc2626' : '#94a3b8' }}>
                    {emailErr ?? 'Press Enter or , after each email to add.'}
                  </p>
                </div>

                <div className="flex flex-col gap-[8px]">
                  <span className={sectionLabel}>Assign Role</span>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value)}
                      className="appearance-none w-full h-[42px] bg-white border border-[#e2e8f0] rounded-[10px] pl-[14px] pr-[34px] text-[13px] text-[#334155] tracking-[-0.5px] cursor-pointer hover:bg-[#f8fafc] focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] transition"
                    >
                      {ROLE_OPTIONS.map(o => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={16}
                      className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"
                    />
                  </div>
                </div>

                {emailInvite.error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{emailInvite.error}</p>}

                <button
                  onClick={() => void sendInvites()}
                  disabled={emailInvite.loading}
                  className="h-[44px] rounded-[10px] text-white text-[14px] font-semibold tracking-[-0.5px] flex items-center justify-center gap-[8px] hover:opacity-90 active:scale-[0.99] transition disabled:opacity-60"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}
                >
                  {emailInvite.loading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <Send size={15} />
                  )}
                  Send Invite
                </button>
              </div>

              {/* Invite Link */}
              <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] sm:p-[24px] flex flex-col gap-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                <CardHead
                  icon={<Link2 size={18} />}
                  iconBg="#ecfeff"
                  iconColor="#0e7490"
                  title="Invite Link"
                  subtitle="Share a link for self-registration"
                />

                <div className="flex flex-col gap-[8px]">
                  <span className={sectionLabel}>Shareable URL</span>
                  {linkUrl ? (
                    <div className="flex items-center gap-[8px] h-[42px] border border-[#e2e8f0] rounded-[10px] pl-[12px] pr-[6px]">
                      <Link2 size={14} className="text-[#94a3b8] shrink-0" />
                      <span className="flex-1 text-[12px] text-[#475569] tracking-[-0.5px] truncate">{linkUrl}</span>
                      <button
                        onClick={() => void linkCopy.copy(linkUrl)}
                        aria-label="Copy link"
                        className="size-[30px] rounded-[8px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] transition"
                      >
                        {linkCopy.copied ? <Check size={15} className="text-[#16a34a]" /> : <Copy size={15} />}
                      </button>
                    </div>
                  ) : (
                    <div className="h-[42px] border border-dashed border-[#e2e8f0] rounded-[10px] flex items-center px-[12px] text-[12px] text-[#94a3b8] tracking-[-0.5px]">
                      No active link yet — generate one below.
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-[8px]">
                  <InfoRow
                    left={linkInv ? `Expires in ${Math.max(0, daysUntil(linkInv.expires_at) ?? 0)} days` : 'No expiry set'}
                    right={linkInv ? 'Active' : '—'}
                    rightTone={linkInv ? 'good' : 'muted'}
                  />
                  <InfoRow
                    left={`${linkInv?.used_count ?? 0} uses so far`}
                    right={linkInv?.max_uses != null ? `${linkInv.max_uses} max` : 'No usage limit'}
                    rightTone="muted"
                  />
                </div>

                <div className="flex items-center justify-between pt-[4px] mt-auto">
                  <button
                    onClick={() => setConfirm({ type: 'regenerate_link' })}
                    disabled={linkBusy}
                    className="inline-flex items-center gap-[6px] text-[13px] font-medium text-indigo-600 tracking-[-0.5px] hover:underline disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={linkBusy ? 'animate-spin' : ''} /> Regenerate Link
                  </button>

                  <button
                    onClick={() => void shareLink()}
                    disabled={!linkUrl}
                    className="inline-flex items-center gap-[6px] text-[13px] font-medium text-[#334155] tracking-[-0.5px] hover:text-[#0f172a] disabled:opacity-40"
                  >
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>

              {/* Invite Code */}
              {/* <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] sm:p-[24px] flex flex-col gap-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                <CardHead
                  icon={<KeyRound size={18} />}
                  iconBg="#faf5ff"
                  iconColor="#7e22ce"
                  title="Invite Code"
                  subtitle="Distribute a unique access code"
                />

                <button
                  onClick={() => codeInv?.invite_code && void codeCopy.copy(codeInv.invite_code)}
                  disabled={!codeInv?.invite_code}
                  className="rounded-[14px] py-[20px] px-[16px] flex flex-col items-center gap-[6px] text-white transition disabled:cursor-default"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">Your Invite Code</span>
                  <span className="text-[24px] font-bold tracking-[0.18em]">{codeInv?.invite_code ?? '— — — —'}</span>
                  <span className="text-[11px] text-white/75 tracking-[-0.3px] inline-flex items-center gap-[4px]">
                    {codeCopy.copied ? (
                      <>
                        <Check size={12} /> Copied!
                      </>
                    ) : (
                      'Click to select and copy'
                    )}
                  </span>
                </button>

                <div className="flex flex-col gap-[8px]">
                  <InfoRow
                    left={codeInv ? `Expires ${fmtDate(codeInv.expires_at)}` : 'No active code'}
                    right={codeInv ? 'Active' : '—'}
                    rightTone={codeInv ? 'good' : 'muted'}
                  />

                  <div className="flex flex-col gap-[6px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-[#64748b] tracking-[-0.5px]">
                        {codeInv?.used_count ?? 0}
                        {codeInv?.max_uses != null ? ` / ${codeInv.max_uses}` : ''} uses
                      </span>
                    </div>

                    {codeInv?.max_uses != null && (
                      <div className="h-[6px] rounded-full bg-[#f1f5f9] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              ((codeInv.used_count ?? 0) / Math.max(1, codeInv.max_uses)) * 100
                            )}%`,
                            backgroundImage: PRIMARY_GRADIENT,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-[4px] mt-auto">
                  <button
                    onClick={() => setConfirm({ type: 'generate_code' })}
                    disabled={codeGen.loading}
                    className="inline-flex items-center gap-[6px] text-[13px] font-medium text-indigo-600 tracking-[-0.5px] hover:underline disabled:opacity-60"
                  >
                    <RefreshCw size={14} className={codeGen.loading ? 'animate-spin' : ''} /> Generate New Code
                  </button>

                  <button
                    onClick={() => codeInv?.invite_code && void codeCopy.copy(codeInv.invite_code)}
                    disabled={!codeInv?.invite_code}
                    className="inline-flex items-center gap-[6px] text-[13px] font-medium text-[#334155] tracking-[-0.5px] hover:text-[#0f172a] disabled:opacity-40"
                  >
                    <Copy size={14} /> Copy Code
                  </button>
                </div>
              </div> */}
            </div>

            {/* Ledger */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-[14px] p-[20px] sm:p-[24px] border-b border-[#f1f5f9]">
                <div>
                  <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#0f172a] tracking-[-0.5px] leading-[24px]">
                    Invitation Ledger
                  </h3>
                  <p className="text-[12px] text-[#64748b] tracking-[-0.5px] mt-[2px]">Track and manage all sent invitations</p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-[12px]">
                  <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[10px] p-[4px] overflow-x-auto">
                    {TABS.map(t => (
                      <button
                        key={t.key}
                        onClick={() => setTabAndReset(t.key)}
                        className={`h-[30px] px-[12px] rounded-[8px] text-[12px] font-medium tracking-[-0.5px] transition inline-flex items-center gap-[6px] ${
                          tab === t.key
                            ? 'bg-white text-[#0f172a] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]'
                            : 'text-[#64748b] hover:text-[#334155]'
                        }`}
                      >
                        {t.label}
                        {t.badge != null && <span className="text-[11px] font-semibold text-[#94a3b8]">{t.badge}</span>}
                      </button>
                    ))}
                  </div>

                  <div className="relative w-full sm:w-[220px]">
                    <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                    <input
                      value={search}
                      onChange={e => setSearchAndReset(e.target.value)}
                      placeholder="Search invitations..."
                      className="w-full h-[36px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] pl-[34px] pr-[12px] text-[13px] text-[#0f172a] tracking-[-0.5px] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] focus:border-[#a5b4fc] transition"
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <div className="min-w-[980px]">
                  <div
                    style={LEDGER_GRID_STYLE}
                    className="grid items-center gap-[12px] px-[24px] py-[12px] border-b border-[#f1f5f9]" >
                    {['Recipient', 'Method', 'Role', 'Sent On', 'Expires', 'Status', 'Actions'].map((h, i) => (
                      <span
                        key={h}
                        className={`text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] ${
                          i === 6 ? 'w-[120px] justify-self-end text-right pr-[8px]' : ''
                        }`}>
                        {h}
                      </span>
                    ))}

                  </div>

                  {loading ? (
                    <LoadingLedger />
                  ) : pageRows.length > 0 ? (
                    pageRows.map(inv => (
                      <LedgerRow
                        key={inv.id}
                        inv={inv}
                        busy={busyId === inv.id}
                        onView={setSelectedInvite}
                        onResend={i => setConfirm({ type: 'resend', invitation: i })}
                        onCopy={onCopyRow}
                        onRevoke={i => setConfirm({ type: 'revoke', invitation: i })}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title={getEmptyTitle(tab, search)}
                      description={getEmptyDesc(tab, search)}
                      actionLabel={tab === 'all' && !search.trim() ? 'Send an Invitation' : undefined}
                      onAction={tab === 'all' && !search.trim() ? () => emailInputRef.current?.focus() : undefined}
                    />
                  )}
                </div>
              </div>

              {filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] px-[24px] py-[16px] border-t border-[#f1f5f9]">
                  <p className="text-[13px] text-[#64748b] tracking-[-0.5px]">
                    Showing <span className="font-medium text-[#0f172a]">{(safePage - 1) * PAGE_SIZE + 1}</span>–
                    <span className="font-medium text-[#0f172a]">{Math.min(safePage * PAGE_SIZE, filtered.length)}</span> of{' '}
                    <span className="font-medium text-[#0f172a]">{filtered.length}</span> invitations
                  </p>

                  <div className="flex items-center gap-[8px]">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage <= 1}
                      className="size-[32px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={15} />
                    </button>

                    {pageWindow(safePage, totalPages).map((p, i) =>
                      p === 'ellipsis' ? (
                        <span key={`e${i}`} className="size-[32px] flex items-center justify-center text-[#9ca3af]">
                          …
                        </span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`size-[32px] rounded-[8px] text-[13px] font-medium tracking-[-0.5px] transition ${
                            p === safePage ? 'bg-indigo-50 text-indigo-600' : 'text-[#64748b] hover:bg-[#f8fafc]'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage >= totalPages}
                      className="size-[32px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContent>

      {/* Details Drawer */}
      <Drawer open={!!selectedInvite} title="Invitation Details" onClose={() => setSelectedInvite(null)}>
        {selectedInvite && (
          <div className="flex flex-col gap-[16px]">
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-[6px] px-[10px] py-[6px] rounded-[999px] text-[12px] font-medium"
                style={{
                  backgroundColor: methodToken(selectedInvite.invite_method).bg,
                  color: methodToken(selectedInvite.invite_method).text,
                }}
              >
                {methodToken(selectedInvite.invite_method).icon}
                {methodToken(selectedInvite.invite_method).label} Invite
              </span>

              <span
                className="inline-flex items-center gap-[5px] px-[10px] py-[6px] rounded-[999px] text-[12px] font-medium"
                style={{
                  backgroundColor: statusToken(selectedInvite.status).bg,
                  color: statusToken(selectedInvite.status).text,
                }}
              >
                <span className="size-[6px] rounded-full" style={{ backgroundColor: statusToken(selectedInvite.status).dot }} />
                {statusToken(selectedInvite.status).label}
              </span>
            </div>

            <DetailItem label="Recipient" value={selectedInvite.invited_email ?? '—'} />
            <DetailItem label="Invite Value" value={inviteDisplayValue(selectedInvite)} mono />
            <DetailItem label="Created By" value="HR Manager" />
            <DetailItem label="Sent On" value={fmtDateTime(selectedInvite.created_at)} />
            <DetailItem label="Expires On" value={fmtDateTime(selectedInvite.expires_at)} />
            <DetailItem label="Uses" value={inferredUses(selectedInvite)} />
            <DetailItem label="Role / Access" value="Employee (Standard)" />
            <DetailItem label="Personal Message" value="—" />

            <div className="pt-[8px] flex gap-[10px]">
              {selectedInvite.status === 'pending' && (
                <button
                  onClick={() => setConfirm({ type: 'resend', invitation: selectedInvite })}
                  className="flex-1 h-[40px] rounded-[10px] border border-indigo-200 text-indigo-600 text-[13px] font-semibold hover:bg-indigo-50"
                >
                  Resend
                </button>
              )}

              {selectedInvite.status !== 'revoked' && (
                <button
                  onClick={() => setConfirm({ type: 'revoke', invitation: selectedInvite })}
                  className="flex-1 h-[40px] rounded-[10px] bg-[#ef4444] text-white text-[13px] font-semibold hover:bg-[#dc2626]"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirm}
        tone={confirm?.type === 'revoke' ? 'danger' : 'primary'}
        title={
          confirm?.type === 'resend'
            ? 'Resend invitation'
            : confirm?.type === 'revoke'
            ? 'Revoke invitation'
            : confirm?.type === 'regenerate_link'
            ? 'Generate new link'
            : 'Generate new code'
        }
        message={
          confirm?.type === 'resend'
            ? 'This will send a fresh invitation to the recipient.'
            : confirm?.type === 'revoke'
            ? 'This invitation will no longer work once revoked.'
            : confirm?.type === 'regenerate_link'
            ? 'This will deactivate the current link and create a new one.'
            : 'This will generate a fresh company code for onboarding.'
        }
        confirmLabel={
          confirm?.type === 'resend'
            ? 'Resend'
            : confirm?.type === 'revoke'
            ? 'Revoke'
            : confirm?.type === 'regenerate_link'
            ? 'Generate Link'
            : 'Generate Code'
        }
        busy={busyId != null || linkBusy || codeGen.loading}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void handleConfirm()}
      />
    </div>
  );
}

function DetailItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[12px] border border-[#f1f5f9] bg-[#fafbfc] px-[14px] py-[12px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">{label}</p>
      <p className={`text-[13px] text-[#0f172a] break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}