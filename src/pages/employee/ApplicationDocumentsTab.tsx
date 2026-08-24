// src/pages/employee/components/ApplicationDocumentsTab.tsx
//
// HR-styled Documents tab for the employee's Application Detail page.
// Extracted into its own file (was previously a plain inline `DocumentsTab`
// function inside ApplicationDetail.tsx) so that file doesn't keep growing,
// and restyled to match HRDocumentManagement.tsx's visual pattern —
// progress overview, status badges, Required/Additional sections, search +
// status filter toolbar — while staying TASK-DRIVEN (one card per required
// document type, matching the existing Task/TaskRow data model). No backend
// changes, no new API layer — reuses the same employee `documentsApi` that
// TaskRow already calls (upload / reuse / reupload / delete / getFile).
//
// Data note: a task's effective "document status" for badge purposes is:
//   - 'missing'          when !task.is_completed
//   - task.document_status (verified/pending_review/uploaded/rejected/expired)
//     when completed, falling back to 'uploaded' if that field is ever unset.

import { useRef, useState, type ReactNode } from 'react';
import {
  FileText, Upload, Eye, Trash2, CheckCircle2,
  AlertCircle, Clock, Search, Grid, List as ListIcon,
  ChevronDown, XCircle, AlertTriangle, Pencil, RefreshCw,
} from 'lucide-react';
import type { Task } from '../../types/employee/application.types';
import { DOCUMENT_CATEGORY_MAP } from './ApplicationDetail';
import { HubPicker } from './HubPicker';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';

// ── Helpers (kept local/self-contained rather than importing from
//    ApplicationDetail.tsx, so this file doesn't create a tangled
//    import-back-and-forth with the file it was extracted out of) ──────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtFileSize(bytes?: number): string {
  if (!bytes) return '';
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function fmtAgo(iso?: string | null): string {
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

type EffectiveStatus = 'verified' | 'pending_review' | 'uploaded' | 'rejected' | 'expired' | 'missing';

function effectiveStatus(t: Task): EffectiveStatus {
  if (!t.is_completed) return 'missing';
  const s = t.document_status;
  if (s === 'verified' || s === 'pending_review' || s === 'rejected' || s === 'expired') return s;
  return 'uploaded';
}

const STATUS_TOKENS: Record<EffectiveStatus, { bg: string; text: string; icon: ReactNode; label: string }> = {
  verified:       { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={12} />, label: 'Verified' },
  pending_review: { bg: '#fef9c3', text: '#a16207', icon: <Clock size={12} />,        label: 'Pending Review' },
  uploaded:       { bg: '#eef2ff', text: '#4338ca', icon: <FileText size={12} />,     label: 'Uploaded' },
  rejected:       { bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={12} />,      label: 'Rejected' },
  expired:        { bg: '#ffedd5', text: '#c2410c', icon: <AlertTriangle size={12} />,label: 'Expired' },
  missing:        { bg: '#fee2e2', text: '#dc2626', icon: <AlertCircle size={12} />,  label: 'Missing' },
};

const REQUIRED_CATS = new Set(['identity', 'employment', 'education']);

function categoryFor(taskName: string): string {
  return DOCUMENT_CATEGORY_MAP[taskName] ?? 'other';
}

// ── Progress overview — same visual pattern as HR's ProgressOverview ───────

function ProgressOverview({ tasksArr }: { tasksArr: Task[] }) {
  const total    = tasksArr.length;
  const verified = tasksArr.filter(t => effectiveStatus(t) === 'verified').length;
  const pending  = tasksArr.filter(t => ['uploaded', 'pending_review'].includes(effectiveStatus(t))).length;
  const missing  = tasksArr.filter(t => effectiveStatus(t) === 'missing').length;
  const pct      = total > 0 ? Math.round((verified / total) * 100) : 0;

  const bars = [
    { label: 'Verified', count: verified, color: '#22c55e', bg: '#dcfce7' },
    { label: 'Pending',  count: pending,  color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Missing',  count: missing,  color: '#ef4444', bg: '#fee2e2' },
  ];

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-[14px]">
        <h3 className="text-[16px] font-bold text-[#0f172a]">Document Progress</h3>
        <span className="text-[14px] font-bold" style={{ color: 'var(--theme-primary)' }}>{pct}% Complete</span>
      </div>
      <div className="h-[10px] bg-[#f1f5f9] rounded-full overflow-hidden mb-[14px]">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${pct}%`, backgroundImage: PRIMARY_GRADIENT }} />
      </div>
      <div className="grid grid-cols-3 gap-[10px]">
        {bars.map(b => (
          <div key={b.label} className="flex items-center justify-between p-[10px] rounded-[8px]"
               style={{ backgroundColor: b.bg }}>
            <div>
              <p className="text-[11px] font-semibold text-[#374151]">{b.label}</p>
              <p className="text-[18px] font-black" style={{ color: b.color }}>{b.count}</p>
            </div>
            <div className="text-[11px] font-medium" style={{ color: b.color }}>
              {total > 0 ? Math.round((b.count / total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Document card — HR DocumentCard's visual style, driven by Task ────────

function DocCard({ task, onView, onEdit, onUpload, onReuse, onDelete, onReupload }: {
  task: Task;
  onView: (docId: string) => void;
  onEdit: (docId: string) => void;
  onUpload: (taskId: string, file: File) => void;
  onReuse: (taskId: string, documentId: string) => void;
  onDelete: (docId: string, docName: string) => void;
  onReupload: (docId: string, file: File) => void;
}) {
  const status     = effectiveStatus(task);
  const tok        = STATUS_TOKENS[status];
  const hasFile    = status !== 'missing';
  const isExpired  = status === 'expired';
  const canReplace = hasFile && !!task.document_id;

  const [pickerOpen, setPickerOpen] = useState(false);
  const inputRef    = useRef<HTMLInputElement>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-[18px]">
        <div className="flex items-start gap-[12px]">
          <div className={`size-[40px] rounded-[10px] flex items-center justify-center shrink-0 ${
            !hasFile ? 'bg-[#f8fafc] border-2 border-dashed border-[#d1d5db]' : 'bg-indigo-50'
          }`}>
            <FileText size={18} className={hasFile ? 'text-indigo-600' : 'text-[#94a3b8]'} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-[8px]">
              <div className="min-w-0">
                <h4 className="text-[14px] font-semibold text-[#0f172a] truncate">{task.name}</h4>
                <span className="text-[10px] text-[#94a3b8] capitalize">{categoryFor(task.name)}</span>
              </div>
              <span className="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                {tok.icon} {tok.label}
              </span>
            </div>

            {hasFile && task.document_name && (
              <div className="flex flex-wrap items-center gap-[10px] mt-[6px]">
                <span className="text-[12px] text-[#64748b] truncate max-w-[160px]">{task.document_name}</span>
                {task.document_size_bytes && <span className="text-[11px] text-[#94a3b8]">{fmtFileSize(task.document_size_bytes)}</span>}
                {task.document_uploaded_at && <span className="text-[11px] text-[#94a3b8]">{fmtAgo(task.document_uploaded_at)}</span>}
              </div>
            )}

            {isExpired && (
              <p className="text-[11px] text-[#c2410c] mt-[4px]">
                This document has expired — please re-upload a current version.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-[6px] mt-[10px]">
              {hasFile && task.document_id && (
                <button onClick={() => onView(task.document_id!)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[4px]">
                  <Eye size={11} /> {isExpired ? 'View old' : 'Preview'}
                </button>
              )}

              {canReplace && (
                <>
                  <input ref={reuploadRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f && task.document_id) onReupload(task.document_id, f); e.target.value = ''; }} />
                  <button onClick={() => reuploadRef.current?.click()}
                    className={`h-[30px] px-[10px] rounded-[6px] text-[12px] font-medium flex items-center gap-[4px] transition ${
                      isExpired ? 'text-white hover:opacity-90' : 'border border-[#e5e7eb] text-[#374151] hover:bg-[#f8fafc]'
                    }`}
                    style={isExpired ? { backgroundImage: PRIMARY_GRADIENT } : undefined}>
                    <RefreshCw size={11} /> {isExpired ? 'Re-upload' : 'Replace'}
                  </button>
                </>
              )}

              {!hasFile && (
                <>
                  <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(task.id, f); e.target.value = ''; }} />
                  <button onClick={() => inputRef.current?.click()}
                    className="h-[30px] px-[10px] rounded-[6px] text-[12px] font-semibold text-white flex items-center gap-[4px]"
                    style={{ backgroundImage: PRIMARY_GRADIENT }}>
                    <Upload size={11} /> Upload
                  </button>
                  <button onClick={() => setPickerOpen(v => !v)}
                    className={`h-[30px] px-[10px] rounded-[6px] border text-[12px] font-medium transition ${
                      pickerOpen ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-[#e5e7eb] text-[#374151] hover:bg-[#f8fafc]'
                    }`}>
                    From Hub
                  </button>
                </>
              )}

              {hasFile && task.document_id && !isExpired && (
                <button onClick={() => onEdit(task.document_id!)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[4px]"
                  title="Edit extracted details">
                  <Pencil size={11} /> Edit
                </button>
              )}

              {hasFile && task.document_id && !isExpired && (
                <button onClick={() => onDelete(task.document_id!, task.document_name ?? 'this document')}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#fecaca] text-[12px] font-medium text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-[4px]">
                  <Trash2 size={11} /> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {pickerOpen && (
          <div className="mt-[12px]">
            <HubPicker onSelect={async (documentId) => { await onReuse(task.id, documentId); setPickerOpen(false); }} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

interface ApplicationDocumentsTabProps {
  tasksArr:   Task[];
  onView:     (docId: string) => void;
  onEdit:     (docId: string) => void;
  onUpload:   (taskId: string, file: File) => void;
  onReuse:    (taskId: string, documentId: string) => void;
  onDelete:   (docId: string, docName: string) => void;
  onReupload: (docId: string, file: File) => void;
}

export function ApplicationDocumentsTab({
  tasksArr, onView, onEdit, onUpload, onReuse, onDelete, onReupload,
}: ApplicationDocumentsTabProps) {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EffectiveStatus>('all');
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid');

  const filtered = tasksArr.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !search || t.name.toLowerCase().includes(q) || (t.document_name ?? '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || effectiveStatus(t) === statusFilter;
    return matchSearch && matchStatus;
  });

  const requiredDocs   = filtered.filter(t => REQUIRED_CATS.has(categoryFor(t.name)));
  const additionalDocs = filtered.filter(t => !REQUIRED_CATS.has(categoryFor(t.name)));

  const cardProps = (task: Task) => ({ task, onView, onEdit, onUpload, onReuse, onDelete, onReupload });

  return (
    <div className="flex flex-col gap-[20px]">

      <ProgressOverview tasksArr={tasksArr} />

      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[14px] flex items-center gap-[10px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
            className="w-full h-[40px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[30px] pr-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | EffectiveStatus)}
            className="appearance-none h-[40px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[10px] pr-[26px] text-[13px] text-[#374151] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending_review">Pending Review</option>
            <option value="uploaded">Uploaded</option>
            <option value="expired">Expired</option>
            <option value="rejected">Rejected</option>
            <option value="missing">Missing</option>
          </select>
          <ChevronDown size={12} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
        </div>
        <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[8px] p-[3px]">
          <button onClick={() => setViewMode('grid')}
            className={`size-[32px] rounded-[6px] flex items-center justify-center transition ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'
            }`}><Grid size={14} /></button>
          <button onClick={() => setViewMode('list')}
            className={`size-[32px] rounded-[6px] flex items-center justify-center transition ${
              viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'
            }`}><ListIcon size={14} /></button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-[12px]">
          <div>
            <h2 className="text-[16px] font-bold text-[#0f172a]">Required Documents</h2>
            <p className="text-[12px] text-[#64748b]">
              {requiredDocs.filter(t => effectiveStatus(t) === 'verified').length}/{requiredDocs.length} verified
            </p>
          </div>
        </div>
        {requiredDocs.length === 0 ? (
          <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[24px] text-center text-[#64748b] text-[13px]">
            {search || statusFilter !== 'all' ? 'No required documents match your filters.' : 'No required documents for this application.'}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-[10px]' : 'flex flex-col gap-[8px]'}>
            {requiredDocs.map(t => <DocCard key={t.id} {...cardProps(t)} />)}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-[12px]">
          <div>
            <h2 className="text-[16px] font-bold text-[#0f172a]">Additional Documents</h2>
            <p className="text-[12px] text-[#64748b]">Supporting materials for your case</p>
          </div>
        </div>
        {additionalDocs.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#e5e7eb] rounded-[14px] p-[32px] text-center">
            <Upload size={20} className="text-[#9ca3af] mx-auto mb-[6px]" />
            <p className="text-[13px] font-medium text-[#374151] mb-[2px]">No additional documents</p>
            <p className="text-[12px] text-[#94a3b8]">Nothing extra required for this application right now</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-[10px]' : 'flex flex-col gap-[8px]'}>
            {additionalDocs.map(t => <DocCard key={t.id} {...cardProps(t)} />)}
          </div>
        )}
      </div>
    </div>
  );
} 