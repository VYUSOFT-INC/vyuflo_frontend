// src/pages/employee/ApplicationDetail.tsx
//
// CHANGED: Added expired-document re-upload support to TaskRow. A completed
// task whose linked document has status "expired" now shows an "Expired"
// badge and a Re-upload button instead of View/Delete — re-upload calls
// documentsApi.reupload() (POST /documents/{id}/reupload) which preserves
// the old document as history (parent_document_id chain) rather than
// deleting it, per the "keep both, chain via parent_document_id" design.
//
// CHANGED: Case Team panel (Sidebar) now resolves real avatars for the
// Attorney/HR Manager entries via UserAvatar + assigned_attorney_id /
// assigned_hr_id, instead of always showing initials. This depends on the
// backend now populating attorney_name/hr_name on ApplicationResponse
// (see application_router.py's get_application()) — previously those name
// fields didn't exist on the response at all, so this section could never
// render an Attorney/HR row, only the Sponsoring Employer (a plain string
// field, always available).
//
// REQUIRES (not shown here, please add if missing):
//   1. Task type (types/employee/application.types.ts) needs a
//      `document_status?: string` field, mirroring the backend's
//      Document.status enum (so "expired" can be read on the frontend).
//   2. documents.api.ts needs a `reupload` method:
//        reupload: async (oldDocId: string, file: File): Promise<Document> => {
//          const form = new FormData();
//          form.append("file", file);
//          const res = await axios.post(`/documents/${oldDocId}/reupload`, form, {
//            headers: { "Content-Type": "multipart/form-data" },
//          });
//          return res.data;
//        },
//      matching the backend endpoint from reupload_expired_document().

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Download, Share2, Bell,
  FileText, CheckCircle2, Clock, AlertCircle, AlertTriangle,
  Users, Calendar, Briefcase, MessageSquare, Upload,
  Activity, ArrowRight, Circle, XCircle,
  Info, X, Lightbulb, CheckSquare, CircleDot,
  CalendarClock, MoreHorizontal, Eye, Search, Image as ImageIcon, File as FileIcon,
  Trash2, RefreshCw, Pencil,
} from 'lucide-react';
import { useApplication, useApplicationTasks } from '../../hooks/employee/useApplications';
import messageApi from '../../api/employee/message.api';
import documentsApi from '../../api/employee/documents.api';
import type { Document } from '../../types/employee/document.types';
import type { Task, ApplicationStage } from '../../types/employee/application.types';
import { PageContent } from '../../components/layout/Pageheader';
import { UserAvatar } from '../../components/ui/UserAvatar';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';
const PRIMARY = 'var(--theme-primary)';

const DOCUMENT_CATEGORY_MAP: Record<string, string> = {
  "Passport Copy": "identity", "Birth Certificate": "identity",
  "Two Passport Photos": "identity", "Copy of Current Visa": "identity",
  "Current Immigration Status Evidence": "identity",
  "Offer Letter": "employment", "Resume / CV": "employment",
  "Pay Stubs (Last 3 Months)": "employment", "Employment Verification Letter": "employment",
  "Organizational Chart": "employment", "Contracts or Itinerary": "employment",
  "Employer Attestation": "employment", "Enrollment Verification": "employment",
  "Educational Transcripts": "education", "STEM Degree Transcript": "education",
  "Acceptance Letter": "education", "Professional License (if applicable)": "education",
};

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtRelative(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return fmtDate(iso);
}
function fmtFileSize(bytes?: number): string {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
function avatarColor(seed: string): string {
  return AVATAR_COLORS[seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
}

function exportApplicationCSV(app: Record<string, unknown>) {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Application #', (app.application_number as string) ?? ''],
    ['Visa Type',     ((app.visa_type as { name?: string })?.name) ?? ''],
    ['Status',        (app.status as string) ?? ''],
    ['Sponsor',       (app.sponsor_employer as string) ?? ''],
    ['Progress %',    String(app.progress_percent ?? 0)],
    ['Start Date',    (app.start_date as string) ?? ''],
    ['Due Date',      (app.due_date as string) ?? ''],
    ['Created',       (app.created_at as string) ?? ''],
  ];
  const csv  = rows.map(r => r.map(v => esc(v)).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `application-${(app.application_number as string) ?? 'export'}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function statusToken(s: string): { bg: string; text: string; dot: string; label: string; bar: string } {
  switch (s) {
    case 'in_progress':
    case 'submitted':
      return { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'In Progress',   bar: '#3b82f6' };
    case 'action_needed':
    case 'rfe_response':
      return { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'Action Needed', bar: '#f97316' };
    case 'approved':
      return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved',      bar: '#22c55e' };
    case 'rejected':
      return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Rejected',      bar: '#ef4444' };
    default:
      return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft',         bar: '#94a3b8' };
  }
}

type ToastTone = 'success' | 'error' | 'info' | 'warning';
type ToastItem = { id: string; tone: ToastTone; title: string; message?: string };

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const meta: Record<ToastTone, { icon: ReactNode; box: string; iconBg: string; iconColor: string }> = {
    success: { icon: <CheckCircle2 size={16} />, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iconBg: 'bg-[#dcfce7]', iconColor: 'text-[#15803d]' },
    error:   { icon: <XCircle size={16} />,      box: 'border-[#fecaca] bg-[#fef2f2]', iconBg: 'bg-[#fee2e2]', iconColor: 'text-[#dc2626]' },
    warning: { icon: <AlertTriangle size={16} />,box: 'border-[#fde68a] bg-[#fffbeb]', iconBg: 'bg-[#fef3c7]', iconColor: 'text-[#c2410c]' },
    info:    { icon: <Info size={16} />,          box: 'border-[#c7d2fe] bg-[#eef2ff]', iconBg: 'bg-[#e0e7ff]', iconColor: 'text-[#4338ca]' },
  };
  return (
    <div className="fixed right-[16px] top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const m = meta[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${m.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${m.iconBg} ${m.iconColor}`}>{m.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
                {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
              </div>
              <button onClick={() => onDismiss(t.id)}><X size={14} className="text-[#94a3b8]" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDeleteModal({ open, docName, deleting, onConfirm, onCancel }: {
  open: boolean; docName: string; deleting: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={deleting ? undefined : onCancel} />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[400px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-start gap-[14px]">
            <div className="size-[44px] rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0">
              <Trash2 size={20} className="text-[#dc2626]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-[#0f172a]">Delete this document?</h3>
              <p className="text-[13px] text-[#64748b] mt-[4px] leading-[19px]">
                <span className="font-medium text-[#374151]">{docName}</span> will be permanently
                deleted from your account and storage. This will also reset the linked task to
                pending so you can upload a replacement.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-[10px] mt-[4px]">
            <button onClick={onCancel} disabled={deleting}
              className="h-[38px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={deleting}
              className="h-[38px] px-[16px] rounded-[10px] bg-[#dc2626] text-white text-[13px] font-semibold hover:bg-[#b91c1c] transition disabled:opacity-60 flex items-center gap-[6px]">
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting…
                </>
              ) : "Yes, Delete"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

interface DropdownItem { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void; }

function Dropdown({ trigger, items }: { trigger: ReactNode; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <div onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>{trigger}</div>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-white border border-[#e5e7eb] rounded-[10px] shadow-xl w-[200px] py-[4px] overflow-hidden">
          {items.map((item, i) => (
            <button key={i} onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[13px] font-medium text-left hover:bg-[#f8fafc] transition ${item.danger ? 'text-[#dc2626] hover:bg-[#fef2f2]' : 'text-[#374151]'}`}>
              {item.icon && <span className="shrink-0">{item.icon}</span>}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentPreviewModal({ docId, onClose }: { docId: string; onClose: () => void }) {
  const [blobUrl,  setBlobUrl]  = useState<string | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | 'other'>('image');
  const [fileName, setFileName] = useState('');

  useEffect(() => { document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = ''; }; }, []);
  useEffect(() => {
    let url: string | null = null;
    (async () => {
      try {
        const r = await documentsApi.getFile(docId);
        url = URL.createObjectURL(r.blob);
        setBlobUrl(url); setFileName(r.fileName);
        setFileType(r.contentType.startsWith('image/') ? 'image' : r.contentType.includes('pdf') ? 'pdf' : 'other');
      } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load file.'); }
      finally { setLoading(false); }
    })();
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [docId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-[16px]"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
      <div className="relative bg-[#1e293b] rounded-[16px] overflow-hidden flex flex-col w-full max-w-[720px] max-h-[90vh] shadow-2xl"
          onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-[20px] py-[14px] border-b border-white/10 shrink-0">
          <p className="text-white text-[14px] font-medium truncate pr-[16px]">{fileName || 'Document Preview'}</p>
          <div className="flex items-center gap-[8px] shrink-0">
            {blobUrl && (
              <a href={blobUrl} download={fileName}
                className="bg-white/10 hover:bg-white/20 text-white rounded-[8px] px-[10px] py-[6px] text-[12px] font-medium transition flex items-center gap-[6px]">
                <Download size={12} /> Download
              </a>
            )}
            <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white rounded-[8px] p-[6px] transition">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0f172a] min-h-[250px] p-[24px]">
          {loading && <div className="flex flex-col items-center gap-[12px]"><div className="w-8 h-8 animate-spin rounded-full border-4 border-white/20 border-t-white" /><p className="text-white/40 text-[13px]">Loading…</p></div>}
          {error && <p className="text-[#ef4444] text-[14px]">{error}</p>}
          {blobUrl && fileType === 'image' && <img src={blobUrl} alt={fileName} className="max-w-full max-h-[70vh] object-contain rounded-[8px]" />}
          {blobUrl && fileType === 'pdf'   && <iframe src={blobUrl} title={fileName} className="w-full rounded-[4px]" style={{ height: '65vh', border: 'none', background: 'white' }} />}
          {blobUrl && fileType === 'other' && <div className="text-center"><p className="text-white/60 text-[14px] mb-[16px]">Cannot preview this file type.</p><a href={blobUrl} download={fileName} className="bg-indigo-600 text-white px-[20px] py-[10px] rounded-[10px] text-[14px]">Download to view</a></div>}
        </div>
      </div>
    </div>
  );
}

type TabId = 'overview' | 'documents' | 'tasks' | 'timeline' | 'activity';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview',  label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'tasks',     label: 'Required Tasks' },
  { id: 'timeline',  label: 'Timeline' },
  { id: 'activity',  label: 'Activity' },
];

function SectionCard({ title, icon, action, children }: {
  title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="px-[24px] py-[16px] border-b border-[#f8fafc] flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-[#0f172a] flex items-center gap-[8px]">{icon}{title}</h2>
        {action}
      </div>
      <div className="px-[24px] py-[20px]">{children}</div>
    </div>
  );
}

function InfoPair({ label, value, badge }: { label: string; value?: string; badge?: ReactNode }) {
  return (
    <div className="flex items-start gap-[8px] mb-[10px]">
      <span className="text-[13px] text-[#64748b] w-[140px] shrink-0">{label}</span>
      {badge ?? <span className="text-[13px] font-medium text-[#111827]">{value ?? '—'}</span>}
    </div>
  );
}

const STAGES: { key: ApplicationStage; label: string; note: string }[] = [
  { key: 'profile_eligibility', label: 'Profile & Eligibility', note: 'Initial case setup and eligibility verification' },
  { key: 'documentation',       label: 'Documentation',         note: 'Collecting and verifying required documents' },
  { key: 'lca_filing',          label: 'LCA Filing',            note: 'Labor Condition Application filed with DOL' },
  { key: 'uscis_submission',    label: 'USCIS Submission',       note: 'Petition submitted to USCIS for review' },
];

function ApplicationStageTracker({ currentStage, progressPct }: {
  currentStage?: string | null;
  progressPct: number;
}) {
  const stageKeys  = STAGES.map(s => s.key);
  const currentIdx = stageKeys.indexOf((currentStage ?? '') as ApplicationStage);

  return (
    <div className="px-[20px] pt-[18px] pb-[16px] border-t border-[#f1f5f9]">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[13px] font-semibold text-[#0f172a] tracking-[-0.5px]">Application Stage</span>
        <span className="text-[12px] font-semibold tracking-[-0.5px]" style={{ color: PRIMARY }}>
          {progressPct}% complete
        </span>
      </div>
      <div className="flex items-start overflow-x-auto py-[4px]">
        {STAGES.map((st, i) => {
          const completed = currentIdx > i;
          const active    = currentIdx === i;
          const isLast    = i === STAGES.length - 1;
          const isCurrent = active;
          const stageStatus = completed ? 'completed' : active ? 'active' : 'upcoming';
          const statusLabel = completed ? 'Completed' : active ? 'In Progress' : 'Pending';
          const circleColor =
            stageStatus === 'completed' ? '#22c55e' :
            stageStatus === 'active'    ? 'var(--theme-primary)' : '#fff';
          const borderColor =
            stageStatus === 'completed' ? '#22c55e' :
            stageStatus === 'active'    ? 'var(--theme-primary)' : '#cbd5e1';
          const labelColor =
            stageStatus === 'completed' ? '#16a34a' :
            stageStatus === 'active'    ? 'var(--theme-primary)' : '#94a3b8';
          const lineColor = !isLast ? (currentIdx > i ? '#c7d2fe' : '#e2e8f0') : 'transparent';

          return (
            <div key={st.key} className="flex items-start flex-1 min-w-0" style={{ minWidth: 72 }}>
              <div className="flex flex-col items-center w-full">
                <div className="flex items-center w-full">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className="flex items-center justify-center rounded-full shrink-0 size-[24px] transition-all"
                      style={{
                        backgroundColor: circleColor,
                        border: `2px solid ${borderColor}`,
                        boxShadow: isCurrent ? '0 0 0 4px #e0e7ff' : 'none',
                      }}
                    >
                      {stageStatus === 'completed' && <CheckCircle2 size={12} className="text-white" />}
                      {stageStatus === 'active'    && <div className="size-[6px] rounded-full bg-white" />}
                    </div>
                  </div>
                  {!isLast && <div className="h-[2px] flex-1" style={{ backgroundColor: lineColor }} />}
                </div>
                <span className="text-[9px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mt-[5px] text-center">
                  Step {i + 1}
                </span>
                <span className="text-[10px] font-semibold tracking-[-0.3px] text-center leading-[13px] mt-[2px] px-[4px]" style={{ color: labelColor }}>
                  {st.label}
                </span>
                <span className="text-[10px] font-medium tracking-[-0.3px] mt-[2px]" style={{ color: labelColor }}>
                  {statusLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Sidebar({ app, tasksArr, onMessage, onUpload }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app: any;
  tasksArr: Task[];
  onMessage: () => void;
  onUpload: () => void;
}) {
  const completedTasks = tasksArr.filter(t => t.is_completed).length;
  const totalTasks     = tasksArr.length;
  const progressPct    = app.progress_percent ?? 0;
  const deadline       = daysUntil(app.due_date);
  const deadlineUrgent = deadline != null && deadline <= 14;

  const team: Array<{ name: string; role: string; userId?: string | null }> = [];
  if (app.attorney_name)    team.push({ name: app.attorney_name,    role: 'Attorney',   userId: app.assigned_attorney_id });
  if (app.hr_name)          team.push({ name: app.hr_name,          role: 'HR Manager', userId: app.assigned_hr_id });
  if (app.sponsor_employer) team.push({ name: app.sponsor_employer, role: 'Sponsoring Employer' });

  return (
    <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-[14px]">
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h3 className="text-[11px] font-bold text-[#94a3b8] mb-[12px] uppercase tracking-[0.06em]">Quick Actions</h3>
        <div className="flex flex-col gap-[8px]">
          <button onClick={onMessage}
            className="flex items-center gap-[10px] h-[40px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] transition text-left">
            <MessageSquare size={14} className="text-indigo-500 shrink-0" /> Message My Attorney
          </button>
          <button onClick={onUpload}
            className="flex items-center gap-[10px] h-[40px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] transition text-left">
            <Upload size={14} className="text-green-500 shrink-0" /> Upload Documents
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h3 className="text-[11px] font-bold text-[#94a3b8] mb-[14px] uppercase tracking-[0.06em]">Progress</h3>
        <div className="flex flex-col gap-[14px]">
          <div>
            <div className="flex justify-between mb-[5px]">
              <span className="text-[13px] text-[#374151]">Overall</span>
              <span className="text-[13px] font-semibold text-[#111827]">{progressPct}%</span>
            </div>
            <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, backgroundImage: PRIMARY_GRADIENT }} />
            </div>
          </div>
          {totalTasks > 0 && (
            <div>
              <div className="flex justify-between mb-[5px]">
                <span className="text-[13px] text-[#374151]">Tasks</span>
                <span className="text-[13px] font-semibold text-[#111827]">{completedTasks}/{totalTasks}</span>
              </div>
              <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#22c55e] transition-all duration-500"
                    style={{ width: `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {app.due_date && (
        <div className={`rounded-[14px] p-[18px] border shadow-[0px_1px_1px_rgba(0,0,0,0.04)] ${deadlineUrgent ? 'bg-[#fff7ed] border-[#fed7aa]' : 'bg-white border-[#f1f5f9]'}`}>
          <h3 className="text-[11px] font-bold text-[#94a3b8] mb-[10px] uppercase tracking-[0.06em]">Deadline</h3>
          <div className="flex items-start gap-[10px]">
            <Clock size={14} className={`mt-[3px] shrink-0 ${deadlineUrgent ? 'text-[#ea580c]' : 'text-[#94a3b8]'}`} />
            <div>
              <p className="text-[13px] font-semibold text-[#111827]">{fmtDate(app.due_date)}</p>
              <p className={`text-[12px] mt-[2px] ${deadlineUrgent ? 'text-[#ea580c] font-semibold' : 'text-[#64748b]'}`}>
                {deadline != null ? (deadline <= 0 ? 'Overdue!' : `${deadline} day${deadline !== 1 ? 's' : ''} remaining`) : '—'}
              </p>
            </div>
          </div>
        </div>
      )}

      {team.length > 0 && (
        <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
          <h3 className="text-[11px] font-bold text-[#94a3b8] mb-[12px] uppercase tracking-[0.06em] flex items-center gap-[6px]">
            <Users size={12} /> Case Team
          </h3>
          <div className="flex flex-col gap-[12px]">
            {team.map((p, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                {p.userId ? (
                  <UserAvatar userId={p.userId} name={p.name} size={34} className="shrink-0" />
                ) : (
                  <div className="size-[34px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: avatarColor(p.name) }}>
                    {initials(p.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#64748b]">{p.role}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onMessage}
            className="mt-[12px] w-full h-[34px] rounded-[8px] border border-indigo-200 text-indigo-600 text-[12px] font-semibold hover:bg-indigo-50 transition">
            Send a Message
          </button>
        </div>
      )}
    </div>
  );
}

function fileTypeBadge(fileType: string): { icon: ReactNode; bg: string; iconColor: string } {
  const t = (fileType ?? "").toLowerCase();
  if (t === "pdf") {
    return { icon: <FileText size={16} />, bg: "bg-[#fee2e2]", iconColor: "text-[#dc2626]" };
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(t)) {
    return { icon: <ImageIcon size={16} />, bg: "bg-indigo-50", iconColor: "text-indigo-600" };
  }
  if (["doc", "docx"].includes(t)) {
    return { icon: <FileIcon size={16} />, bg: "bg-[#dbeafe]", iconColor: "text-[#1d4ed8]" };
  }
  return { icon: <FileText size={16} />, bg: "bg-[#f1f5f9]", iconColor: "text-[#64748b]" };
}

function fmtHubDate(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)   return `${diff} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function HubPicker({ onSelect }: { onSelect: (documentId: string) => void }) {
  const [docs,    setDocs]    = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    documentsApi.listHub()
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border border-[#e5e7eb] rounded-[14px] bg-white w-full mt-[10px] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-[14px] py-[10px] bg-[#f8fafc] border-b border-[#f1f5f9]">
        <span className="text-[12px] font-bold text-[#0f172a] tracking-[-0.2px]">
          Your Document Hub
        </span>
        {!loading && (
          <span className="text-[11px] text-[#94a3b8] font-medium">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="p-[12px]">
        <div className="relative mb-[10px]">
          <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search your documents…"
            className="w-full h-[36px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[9px] pl-[32px] pr-[10px] text-[12px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dbeafe] focus:border-indigo-300 transition" />
        </div>

        <div className="max-h-[220px] overflow-y-auto flex flex-col gap-[4px]">
          {loading ? (
            [0, 1].map(i => (
              <div key={i} className="h-[52px] rounded-[10px] bg-[#f8fafc] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-[6px] py-[24px] text-center">
              <div className="size-[36px] rounded-full bg-[#f1f5f9] flex items-center justify-center">
                <FileText size={16} className="text-[#cbd5e1]" />
              </div>
              <p className="text-[12px] font-medium text-[#64748b]">
                {search ? "No matching documents" : "Your Document Hub is empty"}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {search ? "Try a different search term." : "Upload a file once — reuse it across every case."}
              </p>
            </div>
          ) : filtered.map(d => {
            const badge = fileTypeBadge(d.file_type);
            const isPicking = picking === d.id;
            return (
              <button key={d.id} type="button" disabled={isPicking}
                onClick={async () => { setPicking(d.id); await onSelect(d.id); setPicking(null); }}
                className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-[10px] border border-transparent hover:border-[#e5e7eb] hover:bg-[#f8fafc] text-left transition disabled:opacity-60 group">
                <div className={`size-[36px] rounded-[9px] ${badge.bg} ${badge.iconColor} flex items-center justify-center shrink-0`}>
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[#111827] truncate">{d.name}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-[1px]">
                    {fmtHubDate(d.uploaded_at)}
                    {d.file_size_bytes ? ` · ${(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold shrink-0 px-[10px] py-[6px] rounded-[8px] transition ${
                    isPicking
                      ? "text-white"
                      : "text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white"
                  }`}
                  style={isPicking ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
                >
                  {isPicking ? "Linking…" : "Use this"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onView, onEdit, onUpload, onReuse, onDelete, onReupload }: {
  task: Task;
  onView?: (docId: string) => void;
  onEdit?: (docId: string) => void;
  onUpload?: (taskId: string, file: File) => void;
  onReuse?: (taskId: string, documentId: string) => void;
  onDelete?: (docId: string, docName: string) => void;
  onReupload?: (docId: string, file: File) => void;
}) {
  const done       = task.is_completed;
  const hasDoc     = done && !!task.document_name;
  const isExpired  = hasDoc && task.document_status === 'expired';
  const canReplace = hasDoc && !!task.document_id;
  const inputRef   = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  const [pickerTab, setPickerTab] = useState<"upload" | "hub" | null>(null);

  const [versions, setVersions] = useState<
    { id: string; file_name: string; version: number; status: string; uploaded_at: string }[]
  >([]);
  const [versionsLoaded, setVersionsLoaded] = useState(false);

  useEffect(() => {
    if (!hasDoc || !task.document_id || versionsLoaded) return;
    documentsApi.getVersions(task.document_id)
      .then(setVersions)
      .catch(() => setVersions([]))
      .finally(() => setVersionsLoaded(true));
  }, [hasDoc, task.document_id, versionsLoaded]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUpload?.(task.id, file);
    e.target.value = '';
    setPickerTab(null);
  }

  function handleReuploadFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && task.document_id) onReupload?.(task.document_id, file);
    e.target.value = '';
  }

  async function handleReuseSelect(documentId: string) {
    await onReuse?.(task.id, documentId);
    setPickerTab(null);
  }

  return (
    <div className={`flex flex-col gap-[8px] p-[14px] rounded-[12px] border transition ${
      isExpired ? 'bg-[#fff7ed] border-[#fed7aa]'
      : done ? 'bg-[rgba(236,253,245,0.4)] border-[#d1fae5]'
      : 'bg-[#f8fafc] border-[#f1f5f9]'
    }`}>
      <div className="flex items-start gap-[12px]">
        <div className="shrink-0 mt-[2px]">
          {isExpired ? (
            <div className="size-[22px] rounded-full bg-[#ffedd5] flex items-center justify-center">
              <AlertTriangle size={13} className="text-[#c2410c]" />
            </div>
          ) : done ? (
            <div className="size-[22px] rounded-full bg-[#d1fae5] flex items-center justify-center">
              <CheckCircle2 size={13} className="text-[#15803d]" />
            </div>
          ) : (
            <div className="size-[22px] rounded-[6px] border-2 border-[#cbd5e1] bg-white" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#0f172a] leading-[20px]">
            {task.name}
          </p>
          {hasDoc ? (
            <div className="flex items-center gap-[6px] mt-[3px]">
              <FileText size={11} className="text-[#94a3b8] shrink-0" />
              <span className="text-[11px] text-[#64748b] truncate">{task.document_name}</span>
              {task.document_size_bytes && (
                <span className="text-[10px] text-[#94a3b8]">· {fmtFileSize(task.document_size_bytes)}</span>
              )}
              {isExpired && (
                <span className="inline-flex items-center gap-[4px] px-[6px] py-[1px] rounded-full bg-[#ffedd5] text-[10px] font-semibold text-[#c2410c] shrink-0">
                  Expired
                </span>
              )}
            </div>
          ) : (
            <p className={`text-[12px] mt-[2px] ${done ? 'text-[#15803d] font-medium' : 'text-[#94a3b8]'}`}>
              {done ? '✓ Completed' : (task.description ?? 'Upload a file or reuse one from your Document Hub')}
            </p>
          )}
          {isExpired && (
            <p className="text-[11px] text-[#c2410c] mt-[3px]">
              This document has expired — please re-upload a current version.
            </p>
          )}
        </div>
        <div className="shrink-0 ml-[8px] flex items-center gap-[6px]">
          {canReplace ? (
            <>
              <input
                ref={reuploadRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleReuploadFileChange}
              />
              <button onClick={() => onView?.(task.document_id!)}
                className="h-[28px] px-[10px] rounded-[8px] border border-[#e2e8f0] text-[#64748b] text-[12px] font-medium hover:bg-[#f8fafc] transition">
                {isExpired ? 'View old' : 'View'}
              </button>
              {!isExpired && (
                <button onClick={() => onEdit?.(task.document_id!)}
                  className="h-[28px] px-[10px] rounded-[8px] border border-[#e2e8f0] text-[#64748b] text-[12px] font-medium hover:bg-[#f8fafc] transition"
                  title="Edit the extracted details on this document">
                  Edit
                </button>
              )}
              <button
                onClick={() => reuploadRef.current?.click()}
                className={`h-[28px] px-[10px] rounded-[8px] text-[12px] font-medium transition flex items-center gap-[4px] ${
                  isExpired
                    ? 'text-white hover:opacity-90'
                    : 'border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]'
                }`}
                style={isExpired ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
                title={isExpired ? 'Re-upload a renewed version' : 'Replace with a newer version'}>
                <RefreshCw size={11} /> {isExpired ? 'Re-upload' : 'Replace'}
              </button>
              {!isExpired && (
                <button onClick={() => onDelete?.(task.document_id!, task.document_name ?? 'this document')}
                  className="size-[28px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:bg-[#fee2e2] hover:text-[#dc2626] transition"
                  title="Delete document">
                  <Trash2 size={13} />
                </button>
              )}
            </>
          ) : !done ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => { setPickerTab(null); inputRef.current?.click(); }}
                className="h-[28px] px-[10px] rounded-[8px] text-white text-[12px] font-medium hover:opacity-90 transition flex items-center gap-[4px]"
                style={{ backgroundImage: PRIMARY_GRADIENT }}>
                <Upload size={11} /> Upload
              </button>
              <button
                onClick={() => setPickerTab(t => t === "hub" ? null : "hub")}
                className={`h-[28px] px-[10px] rounded-[8px] border text-[12px] font-medium transition ${
                  pickerTab === "hub"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc]"
                }`}>
                From Hub
              </button>
            </>
          ) : null}
        </div>
      </div>

      {hasDoc && versions.length > 0 && (
        <div className="pl-[34px] pt-[8px] mt-[4px] border-t border-[#f1f5f9]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] flex items-center gap-[5px] mb-[8px]">
            <RefreshCw size={10} /> Revision History
          </p>
          <div className="flex flex-col gap-[6px]">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-[10px]">
                <span className="size-[20px] rounded-[6px] bg-indigo-50 text-indigo-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                  v{v.version}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-[#374151] truncate">{v.file_name}</p>
                  <p className="text-[10px] text-[#94a3b8]">{fmtDate(v.uploaded_at)}</p>
                </div>
                <button onClick={() => onView?.(v.id)}
                  className="text-[11px] font-medium text-indigo-600 hover:underline shrink-0">
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {pickerTab === "hub" && (
        <div className="pl-[34px]">
          <HubPicker onSelect={handleReuseSelect} />
        </div>
      )}
    </div>
  );
}

function MilestoneTimeline({ currentStage }: { currentStage?: string | null }) {
  const stageKeys  = STAGES.map(s => s.key);
  const currentIdx = stageKeys.indexOf((currentStage ?? '') as ApplicationStage);

  return (
    <div className="relative flex flex-col">
      <div className="absolute left-[15px] top-[20px] bottom-[20px] w-[2px] bg-[#e5e7eb]" />
      {STAGES.map((s, i) => {
        const completed = currentIdx > i;
        const active    = currentIdx === i;
        return (
          <div key={s.key} className={`flex items-start gap-[14px] py-[14px] ${i < STAGES.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
            <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
              completed ? 'bg-[#dcfce7] border-[#22c55e] text-[#15803d]'
              : active   ? 'bg-indigo-50 border-indigo-600 text-indigo-600'
              : 'bg-white border-[#d1d5db] text-[#9ca3af]'
            }`}>
              {completed ? <CheckCircle2 size={14} /> : active ? <CircleDot size={12} /> : <Circle size={10} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-[8px]">
                <p className={`text-[14px] font-semibold ${completed || active ? 'text-[#111827]' : 'text-[#9ca3af]'}`}>{s.label}</p>
                <span className={`text-[11px] font-medium shrink-0 ${completed ? 'text-[#15803d]' : active ? 'text-indigo-600' : 'text-[#9ca3af]'}`}>
                  {completed ? 'Completed' : active ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
              <p className={`text-[12px] mt-[2px] ${completed || active ? 'text-[#64748b]' : 'text-[#c4cdd8]'}`}>{s.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type InsightItem = { icon: ReactNode; title: string; body: string };

function AIInsightsCard({ app, tasksArr }: { app: Record<string, unknown>; tasksArr: Task[] }) {
  const pendingTasks = tasksArr.filter(t => !t.is_completed).length;
  const dueIn        = daysUntil(app.due_date as string | null);

  const insights: InsightItem[] = [];
  if (pendingTasks > 0) {
    insights.push({
      icon: <AlertCircle size={13} className="text-[#ea580c]" />,
      title: 'Action Required',
      body: `You have ${pendingTasks} pending task${pendingTasks > 1 ? 's' : ''} to complete. Upload your documents early to avoid delays.`,
    });
  }
  if (dueIn != null && dueIn <= 30) {
    insights.push({
      icon: <Clock size={13} className="text-[#f59e0b]" />,
      title: 'Deadline Approaching',
      body: `Your application deadline is in ${dueIn} days (${fmtDate(app.due_date as string)}). Make sure all documents are submitted.`,
    });
  }
  insights.push({
    icon: <Lightbulb size={13} className="text-[#16a34a]" />,
    title: 'Tip',
    body: 'Keep your documents up to date and respond promptly to any requests from your attorney or HR manager.',
  });

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[14px] p-[20px]">
      <div className="flex items-center gap-[10px] mb-[14px]">
        <div className="size-[34px] rounded-[10px] flex items-center justify-center shrink-0" style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <Lightbulb size={15} className="text-white" />
        </div>
        <h2 className="text-[15px] font-bold text-[#0f172a]">AI Tips & Reminders</h2>
      </div>
      <div className="flex flex-col gap-[8px]">
        {insights.map((ins, i) => (
          <div key={i} className="bg-white rounded-[10px] p-[12px] border border-white/80 flex items-start gap-[10px]">
            {ins.icon}
            <div>
              <p className="text-[13px] font-semibold text-[#111827]">{ins.title}</p>
              <p className="text-[12px] text-[#374151] mt-[2px]">{ins.body}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ app, tasksArr, onViewAllTasks, onViewTimeline, onUpload, onReuse, onView, onDelete, onReupload }: {
  app: Record<string, unknown>;
  tasksArr: Task[];
  onViewAllTasks: () => void;
  onViewTimeline: () => void;
  onUpload: (taskId: string, file: File) => void;
  onReuse: (taskId: string, documentId: string) => void;
  onView: (docId: string) => void;
  onDelete: (docId: string, docName: string) => void;
  onReupload: (docId: string, file: File) => void;
}) {
  const tok          = statusToken(app.status as string);
  const pendingTasks = tasksArr.filter(t => !t.is_completed);

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-[24px] py-[20px] border-b border-[#f8fafc]">
          <h2 className="text-[15px] font-bold text-[#0f172a] mb-[16px]">Application Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Details</p>
              <InfoPair label="Application #:" value={app.application_number as string} />
              <InfoPair label="Visa Type:"     value={(app.visa_type as { name?: string })?.name} />
              <InfoPair label="Status:"
                badge={
                  <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold" style={{ backgroundColor: tok.bg, color: tok.text }}>
                    {tok.label}
                  </span>
                }
              />
              <InfoPair label="Sponsor:"      value={app.sponsor_employer as string} />
              <InfoPair label="Submitted:"    value={fmtDate((app.submission_date as string) ?? (app.created_at as string))} />
              <InfoPair label="Last Updated:" value={fmtRelative(app.updated_at as string)} />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Timeline</p>
              <InfoPair label="Start Date:"    value={fmtDate((app.start_date as string) ?? (app.created_at as string))} />
              <InfoPair label="Deadline:"      value={fmtDate(app.due_date as string)} />
              <InfoPair label="Current Stage:" value={(app.current_stage as string)?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} />
              <InfoPair label="Progress:"
                badge={
                  <div className="flex items-center gap-[8px] flex-1">
                    <div className="flex-1 h-[5px] bg-[#f1f5f9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(app.progress_percent as number) ?? 0}%`, backgroundImage: PRIMARY_GRADIENT }} />
                    </div>
                    <span className="text-[12px] font-semibold" style={{ color: PRIMARY }}>{(app.progress_percent as number) ?? 0}%</span>
                  </div>
                }
              />
            </div>
          </div>
        </div>

        {pendingTasks.length > 0 && (
          <div className="px-[24px] py-[20px] border-b border-[#f8fafc]">
            <div className="flex items-center justify-between mb-[14px]">
              <h2 className="text-[15px] font-bold text-[#0f172a] flex items-center gap-[8px]">
                <AlertCircle size={14} className="text-[#ea580c]" /> Action Required
              </h2>
              <button onClick={onViewAllTasks} className="text-[12px] font-medium text-indigo-600 hover:underline flex items-center gap-[3px]">
                All tasks <ArrowRight size={11} />
              </button>
            </div>
            <div className="flex flex-col gap-[8px]">
              {pendingTasks.slice(0, 3).map(task => (
                <TaskRow key={task.id} task={task} onView={onView} onUpload={onUpload} onReuse={onReuse} onDelete={onDelete} onReupload={onReupload} />
              ))}
              {pendingTasks.length > 3 && (
                <button onClick={onViewAllTasks}
                  className="text-[13px] font-medium text-indigo-600 hover:underline flex items-center gap-[3px] mt-[4px]">
                  View {pendingTasks.length - 3} more tasks <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        <div className="border-b border-[#f8fafc]">
          <div className="px-[24px] pt-[20px] pb-[4px] flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#0f172a] flex items-center gap-[8px]">
              <Activity size={14} className="text-[#64748b]" /> Application Stage
            </h2>
            <button onClick={onViewTimeline} className="text-[12px] font-medium text-indigo-600 hover:underline flex items-center gap-[3px]">
              Full timeline <ArrowRight size={11} />
            </button>
          </div>
          <ApplicationStageTracker
            currentStage={app.current_stage as string}
            progressPct={(app.progress_percent as number) ?? 0}
          />
        </div>

        <div className="px-[24px] py-[20px]">
          <AIInsightsCard app={app} tasksArr={tasksArr} />
        </div>
      </div>
    </div>
  );
}

function TasksTab({ tasksArr, onView, onEdit, onUpload, onReuse, onDelete, onReupload }: {
  tasksArr: Task[];
  onView: (docId: string) => void;
  onEdit: (docId: string) => void;
  onUpload: (taskId: string, file: File) => void;
  onReuse: (taskId: string, documentId: string) => void;
  onDelete: (docId: string, docName: string) => void;
  onReupload: (docId: string, file: File) => void;
}) {
  const completed = tasksArr.filter(t => t.is_completed);
  const pending   = tasksArr.filter(t => !t.is_completed);
  return (
    <div className="flex flex-col gap-[16px]">
      {pending.length > 0 && (
        <SectionCard title={`Pending Tasks (${pending.length})`} icon={<AlertCircle size={14} className="text-[#ea580c]" />}>
          <div className="flex flex-col gap-[8px]">
            {pending.map(t => <TaskRow key={t.id} task={t} onView={onView} onEdit={onEdit} onUpload={onUpload} onReuse={onReuse} onDelete={onDelete} onReupload={onReupload} />)}
          </div>
        </SectionCard>
      )}
      {completed.length > 0 && (
        <SectionCard title={`Completed Tasks (${completed.length})`} icon={<CheckSquare size={14} className="text-[#15803d]" />}>
          <div className="flex flex-col gap-[8px]">
            {completed.map(t => <TaskRow key={t.id} task={t} onView={onView} onEdit={onEdit} onUpload={onUpload} onReuse={onReuse} onDelete={onDelete} onReupload={onReupload} />)}
          </div>
        </SectionCard>
      )}
      {tasksArr.length === 0 && (
        <div className="py-[40px] text-center text-[#64748b] text-[14px]">No tasks found.</div>
      )}
    </div>
  );
}

function DocumentsTab({ tasksArr, onView, onEdit, onGoToTasks, onDelete }: {
  tasksArr: Task[];
  onView: (docId: string) => void;
  onEdit: (docId: string) => void;
  onGoToTasks: () => void;
  onDelete: (docId: string, docName: string) => void;
}) {
  const uploaded = tasksArr.filter(t => t.is_completed && t.document_name);
  return (
    <SectionCard title="Documents" icon={<FileText size={14} />}
      action={
        <button onClick={onGoToTasks}
          className="flex items-center gap-[6px] h-[32px] px-[12px] rounded-[8px] text-white text-[12px] font-semibold hover:opacity-90 transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <Upload size={12} /> Upload
        </button>
      }>
      {uploaded.length === 0 ? (
        <div className="py-[32px] text-center">
          <FileText size={32} className="text-[#cbd5e1] mx-auto mb-[10px]" />
          <p className="text-[14px] font-semibold text-[#0f172a]">No documents uploaded yet</p>
          <p className="text-[12px] text-[#64748b] mt-[4px] mb-[14px]">Upload your documents to proceed</p>
          <button onClick={onGoToTasks}
            className="h-[36px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            Upload Documents
          </button>
        </div>
      ) : (
        <div className="flex flex-col">
          {uploaded.map((t, i) => (
            <div key={t.id} className={`flex items-center gap-[12px] py-[12px] ${i < uploaded.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
              <div className="size-[36px] rounded-[8px] bg-[#f8fafc] border border-[#f1f5f9] flex items-center justify-center shrink-0">
                <FileText size={16} className="text-[#64748b]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#0f172a] truncate">{t.document_name}</p>
                <p className="text-[11px] text-[#94a3b8]">
                  {t.name}
                  {t.document_size_bytes ? ` · ${fmtFileSize(t.document_size_bytes)}` : ''}
                  {t.document_uploaded_at ? ` · ${fmtDate(t.document_uploaded_at)}` : ''}
                </p>
              </div>
              <span className="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-[6px] bg-[#f0fdf4] text-[11px] font-medium text-[#15803d] shrink-0">
                <CheckCircle2 size={10} /> Uploaded
              </span>
              {t.document_id && (
                <>
                  <button onClick={() => onView(t.document_id!)}
                    className="size-[30px] rounded-[7px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] shrink-0">
                    <Eye size={13} />
                  </button>
                  <button onClick={() => onEdit(t.document_id!)}
                    className="size-[30px] rounded-[7px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] shrink-0"
                    title="Edit extracted details">
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => onDelete(t.document_id!, t.document_name ?? 'this document')}
                    className="size-[30px] rounded-[7px] border border-[#e2e8f0] flex items-center justify-center text-[#94a3b8] hover:bg-[#fee2e2] hover:border-[#fecaca] hover:text-[#dc2626] shrink-0 transition"
                    title="Delete document">
                    <Trash2 size={13} />
                  </button>
                </>
              )}
            </div>
          ))}
          <div className="pt-[14px] border-t border-[#f8fafc] mt-[4px]">
            <button onClick={onGoToTasks}
              className="w-full h-[36px] rounded-[10px] border-2 border-dashed border-indigo-200 text-indigo-600 text-[13px] font-medium hover:bg-indigo-50 transition flex items-center justify-center gap-[6px]">
              <Upload size={13} /> Upload More Documents
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

type EventItem = { title: string; desc: string; time: string; icon: ReactNode; bg: string; color: string };

function ActivityTab({ app, tasksArr }: { app: Record<string, unknown>; tasksArr: Task[] }) {
  const events: EventItem[] = [
    {
      title: 'Application created',
      desc:  'Your application was initiated',
      time:  app.created_at as string,
      icon:  <Briefcase size={14} /> as ReactNode,
      bg:    '#e0e7ff',
      color: '#4338ca',
    },
    ...tasksArr
      .filter(t => t.is_completed && t.document_uploaded_at)
      .map<EventItem>(t => ({
        title: `${t.name} uploaded`,
        desc:  t.document_name ?? 'Document uploaded',
        time:  t.document_uploaded_at!,
        icon:  <Upload size={14} /> as ReactNode,
        bg:    '#dbeafe',
        color: '#1d4ed8',
      })),
    ...(app.updated_at && app.updated_at !== app.created_at
      ? ([{
          title: 'Application updated',
          desc:  `Status: ${statusToken(app.status as string).label}`,
          time:  app.updated_at as string,
          icon:  <Activity size={14} /> as ReactNode,
          bg:    '#ede9fe',
          color: '#6d28d9',
        }] as EventItem[])
      : []),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  if (!events.length) return <div className="py-[40px] text-center text-[#64748b] text-[14px]">No activity yet.</div>;

  return (
    <SectionCard title="Activity Log" icon={<Activity size={14} />}>
      <div className="flex flex-col">
        {events.map((ev, i) => (
          <div key={i} className={`flex items-start gap-[12px] py-[12px] ${i < events.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
            <div className="size-[34px] rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: ev.bg, color: ev.color }}>{ev.icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-[#111827]">{ev.title}</p>
              <p className="text-[12px] text-[#64748b] mt-[1px]">{ev.desc}</p>
              <p className="text-[11px] text-[#94a3b8] mt-[2px]">{fmtDateTime(ev.time)}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export default function ApplicationDetail() {
  const { id }         = useParams<{ id: string }>();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const { data: app,   isLoading: appLoading,   error: appError } = useApplication(id);
  const {
    data: tasks, isLoading: tasksLoading,
    refetch: refetchTasks,
  } = useApplicationTasks(id);

  const initialTab = searchParams.get('tab') as TabId | null;
  const [activeTab,    setTab]         = useState<TabId>(
    initialTab && TABS.some(t => t.id === initialTab) ? initialTab : 'overview'
  );
  const [previewDocId, setPreviewDocId] = useState<string | null>(null);
  const [toasts,       setToasts]       = useState<ToastItem[]>([]);
  const [docToDelete,  setDocToDelete]  = useState<{ id: string; name: string } | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const tid = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id: tid, tone, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== tid)), 3200);
  }, []);

  const tasksArr = tasks ?? [];

  async function handleUpload(taskId: string, file: File) {
    try {
      const task     = tasksArr.find(t => t.id === taskId);
      const taskName = task?.name ?? '';
      const category = DOCUMENT_CATEGORY_MAP[taskName] ?? 'other';

      pushToast('info', 'Uploading…', file.name);

      const uploadedDoc = await documentsApi.upload({
        application_id: id!,
        document_type:  taskName || taskId,
        category,
        file,
      });

      pushToast('success', 'Uploaded!', 'Reviewing extracted data…');

      const returnUrl = encodeURIComponent(`/applications/${id}?tab=tasks`);
      navigate(`/documents/viewer?doc_id=${uploadedDoc.id}&application_id=${id}&return_url=${returnUrl}`);
    } catch {
      pushToast('error', 'Upload failed', 'Please try again.');
    }
  }

  async function handleReuse(taskId: string, sourceDocumentId: string) {
    try {
      pushToast('info', 'Linking document…');
      const reusedDoc = await documentsApi.reuse(sourceDocumentId, id!);

      pushToast('success', 'Linked!', 'Reused from your Document Hub — opening for review…');

      const returnUrl = encodeURIComponent(`/applications/${id}?tab=tasks`);
      navigate(`/documents/viewer?doc_id=${reusedDoc.id}&application_id=${id}&return_url=${returnUrl}`);
    } catch {
      pushToast('error', 'Could not link document', 'Please try uploading it fresh instead.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    void taskId;
  }

  async function handleReupload(oldDocId: string, file: File) {
    try {
      pushToast('info', 'Uploading new version…', file.name);
      const newDoc = await documentsApi.reupload(oldDocId, file);

      pushToast('success', 'Uploaded!', 'Reviewing extracted data…');
      await refetchTasks?.();

      const returnUrl = encodeURIComponent(`/applications/${id}?tab=tasks`);
      navigate(`/documents/viewer?doc_id=${newDoc.id}&application_id=${id}&return_url=${returnUrl}`);
    } catch {
      pushToast('error', 'Re-upload failed', 'Please try again.');
    }
  }

  function handleGoToTasks() {
    setTab('tasks');
  }

  function handleEditDocument(docId: string) {
    const returnUrl = encodeURIComponent(`/applications/${id}?tab=tasks`);
    navigate(`/documents/viewer?doc_id=${docId}&application_id=${id}&return_url=${returnUrl}`);
  }

  function handleDeleteClick(docId: string, docName: string) {
    setDocToDelete({ id: docId, name: docName });
  }

  async function handleConfirmDelete() {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await documentsApi.delete(docToDelete.id);
      pushToast('success', 'Deleted', `${docToDelete.name} has been removed.`);
      setDocToDelete(null);
      await refetchTasks?.();
    } catch (e) {
      pushToast('error', 'Delete failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  async function handleMessage() {
    try {
      const appAny   = app as unknown as Record<string, string | undefined>;
      const hrUserId = appAny.assigned_hr_id ?? appAny.created_by;
      if (!hrUserId) { navigate('/messages'); return; }
      const thread = await messageApi.createConversation({
        thread_type:     'direct',
        participant_ids: [hrUserId],
        application_id:  app!.id,
        initial_message: `Hi, I have a question about my ${(app!.visa_type as { code?: string })?.code ?? 'visa'} application.`,
      });
      navigate(`/messages?thread_id=${thread.id}`);
    } catch { navigate('/messages'); }
  }

  if (appLoading || tasksLoading) {
    return (
      <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex flex-col gap-[16px] p-[24px]">
          {[100, 60, 400].map((h, i) => (
            <div key={i} className="bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" style={{ height: h }} />
          ))}
        </div>
      </div>
    );
  }

  if (appError || !app) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
        <p className="text-[#ef4444] text-[16px] font-medium">{appError ?? 'Application not found'}</p>
        <button onClick={() => navigate('/applications/list')}
          className="text-indigo-600 text-[14px] hover:underline flex items-center gap-[4px]">
          <ChevronLeft size={13} /> Back to Applications
        </button>
      </div>
    );
  }

  const appObj         = app as unknown as Record<string, unknown>;
  const tok            = statusToken(app.status);
  const completedTasks = tasksArr.filter(t => t.is_completed).length;

  const menuItems: DropdownItem[] = [
    { label: 'View Overview',   icon: <Eye size={14} />,          onClick: () => setTab('overview') },
    { label: 'View Documents',  icon: <FileText size={14} />,     onClick: () => setTab('documents') },
    { label: 'View Tasks',      icon: <CheckSquare size={14} />,  onClick: () => setTab('tasks') },
    { label: 'Message Support', icon: <MessageSquare size={14} />,onClick: handleMessage },
    { label: 'Download CSV',    icon: <Download size={14} />,     onClick: () => { exportApplicationCSV(appObj); pushToast('success', 'Exported', 'Application data saved to CSV'); } },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={tid => setToasts(p => p.filter(x => x.id !== tid))} />
      <ConfirmDeleteModal
        open={!!docToDelete}
        docName={docToDelete?.name ?? ''}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      <PageContent>
        <div className="flex flex-col gap-[0px]">

          <div className="bg-white border border-[#f1f5f9] rounded-[16px] mb-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <div className="px-[24px] pt-[20px] pb-[16px]">
              <div className="flex items-center gap-[6px] mb-[12px]">
                <button onClick={() => navigate('/applications/list')}
                  className="flex items-center gap-[4px] text-[13px] text-[#64748b] hover:text-indigo-600 transition">
                  <ChevronLeft size={14} /> My Applications
                </button>
                <span className="text-[#d1d5db]">/</span>
                <span className="text-[13px] text-[#374151] truncate max-w-[200px]">
                  {app.visa_type?.name ?? 'Application'}
                </span>
              </div>

              <div className="flex items-start justify-between gap-[16px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-[12px] flex-wrap mb-[6px]">
                    <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">
                      {app.visa_type?.name ?? 'Visa Application'}
                    </h1>
                    <span className="inline-flex items-center gap-[6px] px-[12px] py-[4px] rounded-full text-[13px] font-semibold"
                          style={{ backgroundColor: tok.bg, color: tok.text }}>
                      <span className="size-[6px] rounded-full" style={{ backgroundColor: tok.dot }} />
                      {tok.label}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#64748b]">
                    #{app.application_number ?? '—'} · Started {fmtDate(app.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-[8px] shrink-0">
                  <button onClick={() => navigate('/notifications')}
                    className="size-[38px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
                    <Bell size={15} />
                  </button>
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href); pushToast('success', 'Link copied'); }}
                    className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
                    <Share2 size={13} /> Share
                  </button>
                  <button onClick={() => { exportApplicationCSV(appObj); pushToast('success', 'Exported'); }}
                    className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
                    <Download size={13} /> Export
                  </button>
                  <Dropdown
                    trigger={
                      <button className="size-[38px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]">
                        <MoreHorizontal size={15} />
                      </button>
                    }
                    items={menuItems}
                  />
                </div>
              </div>

              <div className="flex items-center flex-wrap gap-[20px] mt-[12px]">
                {app.sponsor_employer && (
                  <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
                    <Briefcase size={13} className="text-[#94a3b8]" /> {app.sponsor_employer}
                  </span>
                )}
                {app.due_date && (
                  <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
                    <Calendar size={13} className="text-[#94a3b8]" /> Deadline: {fmtDate(app.due_date)}
                  </span>
                )}
                {tasksArr.length > 0 && (
                  <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
                    <CheckSquare size={13} className="text-[#94a3b8]" /> {completedTasks}/{tasksArr.length} tasks done
                  </span>
                )}
              </div>
            </div>

            {(app.status === 'action_needed' || app.status === 'rfe_response') && (
              <div className="mx-[24px] mb-[14px] bg-[#fff7ed] border border-[#fed7aa] rounded-[8px] px-[12px] py-[8px] flex items-center gap-[6px]">
                <AlertCircle size={13} className="text-[#c2410c] shrink-0" />
                <p className="text-[12px] text-[#c2410c] font-medium">
                  Your action is required — please check your pending tasks
                </p>
              </div>
            )}

            <div className="flex items-center px-[24px] border-t border-[#f8fafc] overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-[16px] py-[14px] text-[13px] font-medium whitespace-nowrap border-b-2 transition ${
                    activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[#64748b] hover:text-[#334155]'
                  }`}>
                  {t.label}
                  {t.id === 'tasks' && tasksArr.filter(t2 => !t2.is_completed).length > 0 && (
                    <span className="ml-[5px] px-[6px] py-[1px] rounded-full bg-[#fff7ed] text-[#c2410c] text-[10px] font-semibold">
                      {tasksArr.filter(t2 => !t2.is_completed).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-[20px] items-start">
            <Sidebar
              app={appObj}
              tasksArr={tasksArr}
              onMessage={handleMessage}
              onUpload={handleGoToTasks}
            />

            <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
              {activeTab === 'overview' && (
                <OverviewTab
                  app={appObj}
                  tasksArr={tasksArr}
                  onViewAllTasks={() => setTab('tasks')}
                  onViewTimeline={() => setTab('timeline')}
                  onUpload={handleUpload}
                  onReuse={handleReuse}
                  onView={setPreviewDocId}
                  onDelete={handleDeleteClick}
                  onReupload={handleReupload}
                />
              )}
              {activeTab === 'documents' && (
                <DocumentsTab
                  tasksArr={tasksArr}
                  onView={setPreviewDocId}
                  onEdit={handleEditDocument}
                  onGoToTasks={handleGoToTasks}
                  onDelete={handleDeleteClick}
                />
              )}
              {activeTab === 'tasks' && (
                <TasksTab
                  tasksArr={tasksArr}
                  onView={setPreviewDocId}
                  onEdit={handleEditDocument}
                  onUpload={handleUpload}
                  onReuse={handleReuse}
                  onDelete={handleDeleteClick}
                  onReupload={handleReupload}
                />
              )}
              {activeTab === 'timeline' && (
                <SectionCard title="Application Timeline" icon={<CalendarClock size={14} />}>
                  <MilestoneTimeline currentStage={app.current_stage} />
                </SectionCard>
              )}
              {activeTab === 'activity' && (
                <ActivityTab app={appObj} tasksArr={tasksArr} />
              )}
            </div>
          </div>

        </div>
      </PageContent>

      {previewDocId && (
        <DocumentPreviewModal docId={previewDocId} onClose={() => setPreviewDocId(null)} />
      )}
    </div>
  );
}