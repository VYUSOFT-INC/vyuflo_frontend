// src/pages/hr/HREmployees.tsx
//
// HR Employee Roster (/employer/employees).
// Uses real backend: GET list, PATCH update, DELETE remove.
// Table columns match actual backend response: name, email, job_title,
// department, active_applications, linked_at. No visa/status/expiry
// (those fields aren't on EmployerEmployee — they live on Application).

import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, BriefcaseBusiness, FolderOpen, UserX, Search, ChevronDown,
  RotateCcw, Download, Eye, Pencil, FileText, Trash2,
  ChevronLeft, ChevronRight, UserPlus, Bell, Inbox, X, Info,
  AlertTriangle, CheckCircle2, XCircle,
} from 'lucide-react';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useHREmployees } from '../../hooks/hr/useEmployees';
import { employeesApi } from '../../api/hr/employees.api';
import type { EmployeeLink, UpdateEmployeeRequest } from '../../types/hr/employees.types';
import { getFileUrl } from '../../utils/fileUrl';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: string; title: string; message?: string; tone: ToastTone };

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
function avatarColor(name: string): string {
  const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ─────────────────────────────────────────────────────────────────────────────
// REUSABLE UI
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, iconBg, iconColor }: {
  label: string; value: number; icon: ReactNode; iconBg: string; iconColor: string;
}) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] flex items-center gap-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="size-[48px] rounded-full flex items-center justify-center shrink-0"
           style={{ backgroundColor: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[#64748b] truncate">{label}</p>
        <p className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px] leading-[32px] mt-[2px]">
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}

function FilterSelect<T extends string>({ value, onChange, allLabel, options }: {
  value: T | 'all';
  onChange: (v: T | 'all') => void;
  allLabel: string;
  options: readonly T[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value as T | 'all')}
        className="appearance-none bg-[#f9fafb] border border-[#e2e8f0] rounded-[10px] h-[42px]
                   min-w-[140px] pl-[14px] pr-[34px] text-[13px] text-[#334155] tracking-[-0.5px]
                   cursor-pointer hover:bg-[#f1f5f9] focus:outline-none focus:ring-2
                   focus:ring-[#c7d2fe] focus:border-[#a5b4fc] transition">
        <option value="all">{allLabel}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={16} className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
    </div>
  );
}

function IconAction({ label, onClick, tone, children }: {
  label: string; onClick: () => void; tone?: 'default' | 'danger'; children: ReactNode;
}) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className={`size-[32px] rounded-[8px] flex items-center justify-center transition ${
        tone === 'danger'
          ? 'text-[#94a3b8] hover:bg-[#fef2f2] hover:text-[#dc2626]'
          : 'text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#334155]'
      }`}>
      {children}
    </button>
  );
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

function Pager({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] px-[24px] py-[16px] border-t border-[#f1f5f9]">
      <p className="text-[13px] text-[#64748b] tracking-[-0.5px]">
        Showing <span className="font-medium text-[#0f172a]">{from}</span> to{' '}
        <span className="font-medium text-[#0f172a]">{to}</span> of{' '}
        <span className="font-medium text-[#0f172a]">{total.toLocaleString()}</span> results
      </p>
      <div className="flex items-center gap-[8px]">
        <button onClick={() => onPage(page - 1)} disabled={page <= 1}
          className="size-[32px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronLeft size={15} />
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className="size-[32px] flex items-center justify-center text-[#9ca3af]">…</span>
          ) : (
            <button key={p} onClick={() => onPage(p)}
              className={`size-[32px] rounded-[8px] text-[13px] font-medium tracking-[-0.5px] transition ${
                p === page ? 'bg-[#eef2ff] text-[#4f46e5]' : 'text-[#64748b] hover:bg-[#f8fafc]'
              }`}>{p}</button>
          )
        )}
        <button onClick={() => onPage(page + 1)} disabled={page >= totalPages}
          className="size-[32px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition disabled:opacity-40 disabled:cursor-not-allowed">
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

function exportCsv(rows: EmployeeLink[]) {
  const head = ['Name', 'Email', 'Job Title', 'Department', 'Active Cases', 'Linked'];
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [
    head.join(','),
    ...rows.map(r => [
      r.full_name, r.email, r.job_title ?? '', r.department ?? '',
      String(r.active_applications), r.linked_at ?? '',
    ].map(esc).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `employee-roster-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Table grid: Employee | Job Title & Dept | Active Cases | Linked | Actions
const GRID = 'grid-cols-[2fr_1.8fr_0.8fr_1fr_auto]';


function RosterRow({ row, onView, onEdit, onDocuments, onRemove }: {
  row: EmployeeLink;
  onView: (r: EmployeeLink) => void;
  onEdit: (r: EmployeeLink) => void;
  onDocuments: (r: EmployeeLink) => void;
  onRemove: (r: EmployeeLink) => void;
}) {
  const profilePictureUrl = getFileUrl(row.profile_picture_url);
  return (
    <div className={`grid ${GRID} items-center gap-[16px] px-[24px] py-[16px] border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#fafbfc] transition`}>
      {/* Employee */}
      <div className="flex items-center gap-[12px] min-w-0">
        
        {/* {row.profile_picture_url ? (
          <img src={row.profile_picture_url} alt="" className="size-[40px] rounded-full object-cover shrink-0 border border-[#e5e7eb]" />
        ) : ( */}
        {profilePictureUrl ? (
          <img src={profilePictureUrl} alt="" className="size-[40px] rounded-full object-cover shrink-0 border border-[#e5e7eb]" />
        ) : (
          <div className="size-[40px] rounded-full flex items-center justify-center text-white text-[13px] font-semibold shrink-0"
               style={{ backgroundColor: avatarColor(row.full_name) }}>
            {initials(row.full_name)}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#0f172a] tracking-[-0.5px] truncate">{row.full_name}</p>
          <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px] truncate">{row.email}</p>
        </div>
      </div>

      {/* Job Title & Dept */}
      <div className="min-w-0">
        <p className="text-[14px] font-medium text-[#1f2937] tracking-[-0.5px] truncate">{row.job_title || '—'}</p>
        <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px] truncate">{row.department || '—'}</p>
      </div>

      {/* Active Cases */}
      <div className="justify-self-center">
        <span className={`inline-flex items-center justify-center px-[10px] py-[6px] rounded-full text-[12px] font-medium ${
          row.active_applications > 0
            ? 'bg-[#eff6ff] text-[#1d4ed8] border border-[#dbeafe]'
            : 'bg-[#f1f5f9] text-[#64748b]'
        }`}>
          {row.active_applications}
        </span>
      </div>

      {/* Linked date */}
      <div className="min-w-0">
        <p className="text-[13px] text-[#1f2937] tracking-[-0.5px]">{fmtDate(row.linked_at)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-[2px] justify-self-end">
        <IconAction label="View details" onClick={() => onView(row)}>
          <Eye size={15} />
        </IconAction>
        <IconAction label="Edit employee" onClick={() => onEdit(row)}>
          <Pencil size={15} />
        </IconAction>
        <IconAction label="View documents" onClick={() => onDocuments(row)}>
          <FileText size={15} />
        </IconAction>
        <IconAction tone="danger" label="Remove employee" onClick={() => onRemove(row)}>
          <Trash2 size={15} />
        </IconAction>
      </div>
    </div>
  );
}

function LoadingRows({ count = 6, height = 70 }: { count?: number; height?: number }) {
  return (
    <div className="p-[24px] flex flex-col gap-[10px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-[12px] bg-[#f8fafc] animate-pulse border border-[#f1f5f9]" style={{ height }} />
      ))}
    </div>
  );
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

function DetailItem({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[12px] border border-[#f1f5f9] bg-[#fafbfc] px-[14px] py-[12px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">{label}</p>
      <p className={`text-[13px] text-[#0f172a] break-all ${mono ? 'font-mono' : ''}`}>{value}</p>
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

function ConfirmModal({ open, title, message, confirmLabel, busy, onCancel, onConfirm }: {
  open: boolean; title: string; message: string;
  confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/35 z-50" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[460px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-start gap-[12px]">
            <div className="size-[42px] rounded-full flex items-center justify-center shrink-0 bg-[#fef2f2] text-[#dc2626]">
              <AlertTriangle size={18} />
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
              className="h-[40px] px-[16px] rounded-[10px] text-[13px] font-semibold text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60">
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
    info:    { icon: <Info size={16} />,         box: 'border-[#c7d2fe] bg-[#eef2ff]', iconBg: 'bg-[#e0e7ff]', iconColor: 'text-[#4338ca]' },
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
// EDIT EMPLOYEE DRAWER
// ─────────────────────────────────────────────────────────────────────────────

function EditField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[42px] bg-[#f9fafb] border border-[#e2e8f0] rounded-[10px] px-[14px] text-[13px] text-[#0f172a] tracking-[-0.5px]
                   placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] focus:border-[#a5b4fc] transition"
      />
    </div>
  );
}

function EditEmployeeDrawer({ employee, onClose, onSaved }: {
  employee: EmployeeLink;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const profilePictureUrl = getFileUrl(employee.profile_picture_url);
  const [jobTitle, setJobTitle]     = useState(employee.job_title || '');
  const [department, setDepartment] = useState(employee.department || '');
  const [workEmail, setWorkEmail]   = useState(employee.work_email || '');
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState<string | null>(null);
  

  const hasChanges =
    jobTitle !== (employee.job_title || '') ||
    department !== (employee.department || '') ||
    workEmail !== (employee.work_email || '');

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const body: UpdateEmployeeRequest = {};
      if (jobTitle !== (employee.job_title || ''))     body.job_title  = jobTitle;
      if (department !== (employee.department || ''))   body.department = department;
      if (workEmail !== (employee.work_email || ''))    body.work_email = workEmail;
      await employeesApi.update(employee.id, body);
      onSaved(`${employee.full_name}'s info updated.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Update failed';
      setErr(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open title="Edit Employee" subtitle={employee.full_name} onClose={onClose}>
      <div className="flex flex-col gap-[16px]">
        {/* Avatar + name header */}
        <div className="flex items-center gap-[14px] pb-[16px] border-b border-[#f1f5f9]">
          {/* {employee.profile_picture_url ? (
            <img src={employee.profile_picture_url} alt="" className="size-[48px] rounded-full object-cover border border-[#e5e7eb]" />
          ) : ( */}
          {profilePictureUrl ? (
            <img src={profilePictureUrl} alt="" className="size-[48px] rounded-full object-cover border border-[#e5e7eb]" />
          ) : (
            <div className="size-[48px] rounded-full flex items-center justify-center text-white text-[16px] font-semibold"
                 style={{ backgroundColor: avatarColor(employee.full_name) }}>
              {initials(employee.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.5px]">{employee.full_name}</p>
            <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px]">{employee.email}</p>
          </div>
        </div>

        <EditField label="Job Title"   value={jobTitle}   onChange={setJobTitle}   placeholder="e.g. Senior Software Engineer" />
        <EditField label="Department"  value={department}  onChange={setDepartment} placeholder="e.g. Engineering" />
        <EditField label="Work Email"  value={workEmail}   onChange={setWorkEmail}  placeholder="e.g. name@company.com" />

        {err && (
          <div className="rounded-[10px] border border-[#fecaca] bg-[#fef2f2] px-[14px] py-[10px]">
            <p className="text-[13px] text-[#dc2626]">{err}</p>
          </div>
        )}

        <div className="pt-[8px] flex gap-[10px]">
          <button onClick={onClose}
            className="flex-1 h-[40px] rounded-[10px] border border-[#e2e8f0] text-[#334155] text-[13px] font-medium hover:bg-[#f8fafc]">
            Cancel
          </button>
          <button onClick={() => void handleSave()} disabled={!hasChanges || saving}
            className="flex-1 h-[40px] rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-50"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HREmployees() {
  const navigate = useNavigate();
  const {
    data, isLoading, error, refetch,
    filters, searchInput, setSearchInput,
    setDepartment, setPage,
    reset, hasActiveFilters,
  } = useHREmployees();

  const [selected, setSelected]     = useState<EmployeeLink | null>(null);
  const [editing, setEditing]       = useState<EmployeeLink | null>(null);
  const [removing, setRemoving]     = useState<EmployeeLink | null>(null);
  const [busy, setBusy]             = useState(false);
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);

  const rows = useMemo(() => data?.employees ?? [], [data]);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems(prev => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => setToastItems(prev => prev.filter(x => x.id !== id)), 3200);
  };
  const dismissToast = (id: string) => setToastItems(prev => prev.filter(x => x.id !== id));

  // ── Row action handlers ───────────────────────────────────────────────────
  const onView = (r: EmployeeLink) => navigate(`/employer/employees/${r.id}`);
  const onEdit      = (r: EmployeeLink) => setEditing(r);
  const onDocuments = (_: EmployeeLink) => pushToast('info', 'Documents coming soon', 'The HR Documents screen is under construction.');
  const onRemove    = (r: EmployeeLink) => setRemoving(r);

  // ── Real DELETE via backend ───────────────────────────────────────────────
  const handleConfirmRemove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await employeesApi.remove(removing.id);
      pushToast('warning', 'Employee removed', `${removing.full_name} has been removed from your company.`);
      if (selected?.id === removing.id) setSelected(null);
      await refetch();
    } catch {
      pushToast('error', 'Something went wrong', 'Could not remove employee. Please try again.');
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  // ── Edit saved callback ───────────────────────────────────────────────────
  const handleEditSaved = (msg: string) => {
    setEditing(null);
    pushToast('success', 'Employee updated', msg);
    void refetch();
  };

  const handleExport = () => {
    if (!rows.length) {
      pushToast('warning', 'Nothing to export', 'There are no employees in the current view.');
      return;
    }
    exportCsv(rows);
    pushToast('success', 'Roster exported', `${rows.length} employees saved to CSV.`);
  };

  const handleReset = () => {
    reset();
    pushToast('info', 'Filters cleared', 'All filters have been reset.');
  };

  // ── Header actions ────────────────────────────────────────────────────────
  const headerActions = (
    <>
      <button type="button" aria-label="Notifications" onClick={() => navigate('/employer/notifications')}
        className="bg-white border border-[#e2e8f0] rounded-[10px] flex items-center justify-center size-[40px] relative hover:bg-[#f8fafc] transition shrink-0">
        <Bell size={16} className="text-[#64748b]" />
        <span className="absolute top-[9px] right-[10px] size-[7px] rounded-full bg-[#ef4444] border border-white" />
      </button>
      <button onClick={() => navigate('/employer/invite')}
        className="flex items-center gap-[8px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition whitespace-nowrap shrink-0"
        style={{ backgroundImage: PRIMARY_GRADIENT }}>
        <UserPlus size={16} /> Add Employee
      </button>
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toastItems} onDismiss={dismissToast} />

      <PageHeader
        title="Employee Roster"
        subtitle="Manage and track all sponsored employees."
        showSearch={false}
        showBell={false}
        actions={headerActions}
      />

      <PageContent>
        {error && !data ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <p className="text-[#ef4444] text-[16px] font-medium mb-[4px]">Failed to load employees</p>
            <p className="text-[#64748b] text-[14px] mb-[16px]">{error}</p>
            <button onClick={() => void refetch()}
              className="text-[#4f46e5] text-[14px] font-medium hover:underline">Try again</button>
          </div>
        ) : (
          <div className="flex flex-col gap-[20px] sm:gap-[24px]">

            {/* ── Stats overview ── */}
            {isLoading && !data ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="h-[100px] bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" />
                ))}
              </div>
            ) : data && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[16px] sm:gap-[20px]">
                <StatCard label="Total Employees"     value={data.stats.total_employees}
                          icon={<Users size={22} />}             iconBg="#eff6ff" iconColor="#2563eb" />
                <StatCard label="Active Cases"         value={data.stats.active_applications}
                          icon={<BriefcaseBusiness size={20} />} iconBg="#f0fdf4" iconColor="#16a34a" />
                <StatCard label="Pending Documents"    value={data.stats.pending_documents}
                          icon={<FolderOpen size={20} />}        iconBg="#fff7ed" iconColor="#ea580c" />
                <StatCard label="Inactive"             value={data.stats.inactive}
                          icon={<UserX size={20} />}             iconBg="#f1f5f9" iconColor="#64748b" />
              </div>
            )}

            {/* ── Filter controls ── */}
            {data && (
              <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[17px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex flex-col xl:flex-row xl:items-center justify-between gap-[16px]">
                <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-[12px]">
                  <div className="relative w-full sm:w-[320px]">
                    <Search size={16} className="absolute left-[14px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                    <input
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      placeholder="Search name, email, or title..."
                      className="w-full h-[42px] bg-[#f9fafb] border border-[#e2e8f0] rounded-[10px] pl-[40px] pr-[16px] text-[13px] text-[#0f172a] tracking-[-0.5px] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] focus:border-[#a5b4fc] transition"
                    />
                  </div>
                  {data.filters.departments.length > 0 && (
                    <FilterSelect allLabel="Department" value={filters.department}
                      options={data.filters.departments} onChange={setDepartment} />
                  )}
                </div>
                <div className="flex items-center gap-[12px] shrink-0">
                  <button onClick={handleReset} disabled={!hasActiveFilters}
                    className="h-[42px] px-[16px] rounded-[10px] bg-white border border-[#e2e8f0] text-[#334155] text-[13px] font-medium tracking-[-0.5px] flex items-center gap-[8px] hover:bg-[#f8fafc] transition disabled:opacity-50 disabled:cursor-not-allowed">
                    <RotateCcw size={14} /> Reset
                  </button>
                  <button onClick={handleExport}
                    className="h-[42px] px-[16px] rounded-[10px] bg-white border border-[#e2e8f0] text-[#334155] text-[13px] font-medium tracking-[-0.5px] flex items-center gap-[8px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)] hover:bg-[#f8fafc] transition">
                    <Download size={14} /> Export CSV
                  </button>
                </div>
              </div>
            )}

            {/* ── Roster table ── */}
            {/* <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className={`grid ${GRID} gap-[16px] px-[24px] py-[14px] bg-[#f9fafb] border-b border-[#f1f5f9]`}>
                    {[
                      { label: 'Employee',      align: 'start',  indent: 52 },
                      { label: 'Role & Dept',   align: 'start',  indent: 0 },
                      { label: 'Cases',         align: 'center', indent: 0 },
                      { label: 'Linked',        align: 'start',  indent: 0 },
                      { label: 'Actions',       align: 'end',    indent: 0 },
                    ].map(h => (
                      <span key={h.label}
                        style={h.indent ? { paddingLeft: h.indent } : undefined}
                        className={`text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b] ${
                          h.align === 'center' ? 'text-center'
                            : h.align === 'end' ? 'justify-self-end'
                            : ''
                        }`}>
                        {h.label}
                      </span>
                    ))}
                  </div>

                  {isLoading && !data ? (
                    <LoadingRows count={6} height={70} />
                  ) : rows.length > 0 ? (
                    rows.map(row => (
                      <RosterRow key={row.id} row={row}
                        onView={onView} onEdit={onEdit} onDocuments={onDocuments} onRemove={onRemove} />
                    ))
                  ) : (
                    <EmptyState
                      title={hasActiveFilters ? 'No employees match your filters' : 'No employees yet'}
                      description={hasActiveFilters ? 'Try clearing filters or searching for someone else.' : 'Invite your first employee to get started.'}
                      actionLabel={hasActiveFilters ? 'Clear filters' : 'Invite Employee'}
                      onAction={hasActiveFilters ? handleReset : () => navigate('/employer/invite')}
                    />
                  )}
                </div>
              </div>

              {data && rows.length > 0 && (
                <Pager
                  page={data.pagination.page}
                  totalPages={data.pagination.total_pages}
                  total={data.pagination.total}
                  pageSize={data.pagination.page_size}
                  onPage={setPage}
                />
              )}
            </div> */}

            {/* ── Roster table ── */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className={`grid ${GRID} items-center gap-[16px] px-[24px] py-[14px] bg-[#f9fafb] border-b border-[#f1f5f9]`}>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
                      Employee
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
                      Role &amp; Dept
                    </span>
                    <span className="justify-self-center text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
                      Cases
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
                      Linked
                    </span>
                    <span className="w-[140px] justify-self-end text-right text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
                      Actions
                    </span>
                  </div>

                  {isLoading && !data ? (
                    <LoadingRows count={6} height={70} />
                  ) : rows.length > 0 ? (
                    rows.map(row => (
                      <RosterRow
                        key={row.id}
                        row={row}
                        onView={onView}
                        onEdit={onEdit}
                        onDocuments={onDocuments}
                        onRemove={onRemove}
                      />
                    ))
                  ) : (
                    <EmptyState
                      title={hasActiveFilters ? 'No employees match your filters' : 'No employees yet'}
                      description={hasActiveFilters ? 'Try clearing filters or searching for someone else.' : 'Invite your first employee to get started.'}
                      actionLabel={hasActiveFilters ? 'Clear filters' : 'Invite Employee'}
                      onAction={hasActiveFilters ? handleReset : () => navigate('/employer/invite')}
                    />
                  )}
                </div>
              </div>

              {data && rows.length > 0 && (
                <Pager
                  page={data.pagination.page}
                  totalPages={data.pagination.total_pages}
                  total={data.pagination.total}
                  pageSize={data.pagination.page_size}
                  onPage={setPage}
                />
              )}
            </div>
          </div>
        )}
      </PageContent>

      {/* ── View details drawer ── */}
      <Drawer open={!!selected && !editing} title="Employee Details"
        subtitle={selected ? `${selected.job_title || 'No title'} · ${selected.department || 'No dept'}` : undefined}
        onClose={() => setSelected(null)}>
        {selected && (
          <div className="flex flex-col gap-[16px]">
            <div className="flex items-center gap-[14px] pb-[16px] border-b border-[#f1f5f9]">
              {selected.profile_picture_url ? (
                <img src={selected.profile_picture_url} alt="" className="size-[56px] rounded-full object-cover border border-[#e5e7eb]" />
              ) : (
                <div className="size-[56px] rounded-full flex items-center justify-center text-white text-[18px] font-semibold"
                     style={{ backgroundColor: avatarColor(selected.full_name) }}>
                  {initials(selected.full_name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold text-[#0f172a] tracking-[-0.5px]">{selected.full_name}</p>
                <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px] mt-[2px]">{selected.email}</p>
              </div>
            </div>

            <DetailItem label="Job Title"          value={selected.job_title || '—'} />
            <DetailItem label="Department"         value={selected.department || '—'} />
            <DetailItem label="Work Email"         value={selected.work_email || '—'} />
            <DetailItem label="Active Applications" value={String(selected.active_applications)} />
            <DetailItem label="Start Date"         value={fmtDate(selected.start_date)} />
            <DetailItem label="Linked"             value={fmtDate(selected.linked_at)} />
            <DetailItem label="Employee Link ID"   value={selected.id} mono />

            <div className="pt-[8px] flex gap-[10px]">
              <button onClick={() => { setSelected(null); setEditing(selected); }}
                className="flex-1 h-[40px] rounded-[10px] text-white text-[13px] font-semibold"
                style={{ backgroundImage: PRIMARY_GRADIENT }}>
                Edit Info
              </button>
              <button onClick={() => { setSelected(null); navigate(`/employer/employees/${selected.employee_id}`); }}
                className="flex-1 h-[40px] rounded-[10px] border border-[#c7d2fe] text-[#4f46e5] text-[13px] font-semibold hover:bg-[#eef2ff]">
                View Cases
              </button>
            </div>
            <button onClick={() => setRemoving(selected)}
              className="h-[40px] rounded-[10px] border border-[#fecaca] text-[#dc2626] text-[13px] font-semibold hover:bg-[#fef2f2]">
              Remove from Company
            </button>
          </div>
        )}
      </Drawer>

      {/* ── Edit employee drawer ── */}
      {editing && (
        <EditEmployeeDrawer
          employee={editing}
          onClose={() => setEditing(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* ── Confirm remove modal ── */}
      <ConfirmModal
        open={!!removing}
        title="Remove from company"
        message={
          removing
            ? `${removing.full_name} will lose access to your company workspace. Their account remains active. You can re-invite them later.`
            : ''
        }
        confirmLabel="Remove Employee"
        busy={busy}
        onCancel={() => setRemoving(null)}
        onConfirm={() => void handleConfirmRemove()}
      />
    </div>
  );
}