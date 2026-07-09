// src/pages/hr/HRDocumentManagement.tsx
// Route: /employer/cases/:applicationId  → Documents tab
// Also standalone: /employer/documents/:applicationId
//
// Fixes applied:
//   1. Preview  — hrDocumentApi.getFile (blob + cookies) replaces bare <a href>
//   2. Download — same blob pattern, triggers file download
//   3. Stats    — reads from useHRDocuments live stats (verified/pending/missing)
//   4. Upload   — sends correct document_type name from existing doc entry
//   5. Status filter dropdown — wired (was display-only before)
//   6. Add Participant — navigates to case detail instead of doing nothing
//   7. Duplicate fileInputRef removed

import { useEffect, useRef, useState, type ReactNode, type ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText, Upload, Download, Eye, Trash2, CheckCircle2,
  AlertCircle, Clock, Plus, Search, Grid,
  List as ListIcon, ChevronDown, X, Info, AlertTriangle,
  XCircle, Users, Shield, ExternalLink, File, CheckSquare,
} from 'lucide-react';
import { useHRDocuments } from '../../hooks/hr/useHRDocuments';
import { hrDocumentApi } from '../../api/hr/hrDocument.api';
import type { HRDocumentUIEntry, HRDocumentStatus } from '../../types/hr/document.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const AV = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
const avatarBg = (s: string) => AV[s.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];
const initials  = (n: string) => n.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

const STATUS_TOKENS: Record<HRDocumentStatus, { bg: string; text: string; icon: ReactNode; label: string }> = {
  verified:       { bg: '#dcfce7', text: '#15803d', icon: <CheckCircle2 size={12}/>, label: 'Verified' },
  pending_review: { bg: '#fef9c3', text: '#a16207', icon: <Clock size={12}/>,        label: 'Pending Review' },
  uploaded:       { bg: '#eef2ff', text: '#4338ca', icon: <File size={12}/>,          label: 'Uploaded' },
  missing:        { bg: '#fee2e2', text: '#dc2626', icon: <AlertCircle size={12}/>,  label: 'Missing' },
  rejected:       { bg: '#fee2e2', text: '#dc2626', icon: <XCircle size={12}/>,      label: 'Rejected' },
  required:       { bg: '#f1f5f9', text: '#475569', icon: <AlertCircle size={12}/>,  label: 'Required' },
};

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; tone: ToastTone; title: string; message?: string };

function ToastStack({ items, onDismiss }: { items: Toast[]; onDismiss: (id: string) => void }) {
  const meta: Record<ToastTone, { icon: ReactNode; box: string; iBg: string; iCol: string }> = {
    success: { icon: <CheckCircle2 size={16}/>, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iBg: 'bg-[#dcfce7]', iCol: 'text-[#15803d]' },
    error:   { icon: <XCircle size={16}/>,      box: 'border-[#fecaca] bg-[#fef2f2]', iBg: 'bg-[#fee2e2]', iCol: 'text-[#dc2626]' },
    warning: { icon: <AlertTriangle size={16}/>,box: 'border-[#fde68a] bg-[#fffbeb]', iBg: 'bg-[#fef3c7]', iCol: 'text-[#c2410c]' },
    info:    { icon: <Info size={16}/>,          box: 'border-[#c7d2fe] bg-[#eef2ff]', iBg: 'bg-[#e0e7ff]', iCol: 'text-[#4338ca]' },
  };
  return (
    <div className="fixed right-4 top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const m = meta[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${m.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${m.iBg} ${m.iCol}`}>{m.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
                {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
              </div>
              <button onClick={() => onDismiss(t.id)}><X size={14} className="text-[#94a3b8]"/></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({ open, doc, onClose, onReject }: {
  open: boolean;
  doc: HRDocumentUIEntry | null;
  onClose: () => void;
  onReject: (id: string, reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [busy,   setBusy]   = useState(false);
  if (!open || !doc) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}/>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-[480px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-semibold text-[#0f172a]">Reject Document</h3>
            <button onClick={onClose}><X size={18} className="text-[#94a3b8]"/></button>
          </div>
          <div className="bg-[#f8fafc] rounded-[10px] p-[12px] mb-[14px]">
            <p className="text-[13px] font-semibold text-[#0f172a]">{doc.document_type ?? doc.name}</p>
          </div>
          <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">
            Rejection Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
            placeholder="Explain why this document was rejected so the employee can re-upload correctly..."
            rows={3}
            className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex justify-end gap-[10px] mt-[16px]">
            <button onClick={onClose}
              className="h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
              Cancel
            </button>
            <button
              onClick={async () => {
                if (!reason.trim()) return;
                setBusy(true);
                await onReject(doc.id, reason);
                setReason('');
                setBusy(false);
              }}
              disabled={busy || !reason.trim()}
              className="h-[40px] px-[16px] rounded-[10px] text-[13px] font-semibold text-white bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-60">
              {busy ? 'Rejecting...' : 'Reject Document'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD ZONE
// ─────────────────────────────────────────────────────────────────────────────

function UploadZone({ docId, onUpload }: { docId: string; onUpload: (id: string, file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault(); setDragOver(false);
        const f = e.dataTransfer.files[0]; if (f) onUpload(docId, f);
      }}
      className={`border-2 border-dashed rounded-[10px] p-[20px] text-center transition cursor-pointer ${
        dragOver ? 'border-indigo-400 bg-indigo-50' : 'border-[#d1d5db] hover:border-indigo-300 hover:bg-[#f8fafc]'
      }`}
      onClick={() => inputRef.current?.click()}>
      <Upload size={20} className="text-[#9ca3af] mx-auto mb-[6px]"/>
      <p className="text-[13px] font-medium text-[#374151]">Drop file here or <span className="text-indigo-600">browse</span></p>
      <p className="text-[11px] text-[#94a3b8] mt-[2px]">PDF, DOC, JPG, PNG up to 20MB</p>
      <input ref={inputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(docId, f); }}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT CARD
// FIX 1: onPreview — blob fetch via hrDocumentApi.getFile (not <a href>)
// ─────────────────────────────────────────────────────────────────────────────

function DocumentCard({ doc, onUpload, onDownload, onDelete, onVerify, onReject, onRequest, onPreview }: {
  doc:        HRDocumentUIEntry;
  onUpload:   (id: string, file: File) => void;
  onDownload: (doc: HRDocumentUIEntry) => void;
  onDelete:   (id: string) => void;
  onVerify:   (id: string) => void;
  onReject:   (doc: HRDocumentUIEntry) => void;
  onRequest:  (id: string) => void;
  onPreview:  (doc: HRDocumentUIEntry) => void;
}) {
  const [showUpload, setShowUpload] = useState(false);
  const tok    = STATUS_TOKENS[doc.status] ?? STATUS_TOKENS.missing;
  const hasFile = doc.status !== 'missing' && doc.status !== 'required';

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="p-[18px]">
        <div className="flex items-start gap-[12px]">

          {/* Icon */}
          <div className={`size-[40px] rounded-[10px] flex items-center justify-center shrink-0 ${
            !hasFile
              ? 'bg-[#f8fafc] border-2 border-dashed border-[#d1d5db]'
              : doc.file_type === 'pdf' ? 'bg-[#fee2e2]' : 'bg-indigo-50'
          }`}>
            <FileText size={18} className={doc.file_type === 'pdf' ? 'text-[#dc2626]' : 'text-indigo-600'}/>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-[8px]">
              <div className="min-w-0">
                <h4 className="text-[14px] font-semibold text-[#0f172a] truncate">{doc.document_type ?? doc.name}</h4>
                {doc.category && <span className="text-[10px] text-[#94a3b8] capitalize">{doc.category}</span>}
              </div>
              <span className="inline-flex items-center gap-[4px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold shrink-0"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                {tok.icon} {tok.label}
              </span>
            </div>

            {/* File metadata */}
            {hasFile && doc.name && (
              <div className="flex flex-wrap items-center gap-[10px] mt-[6px]">
                <span className="text-[12px] text-[#64748b] truncate max-w-[160px]">{doc.name}</span>
                {doc.file_size_label && <span className="text-[11px] text-[#94a3b8]">{doc.file_size_label}</span>}
                {doc.uploaded_ago    && <span className="text-[11px] text-[#94a3b8]">{doc.uploaded_ago}</span>}
              </div>
            )}

            {/* Rejection reason */}
            {doc.rejection_reason && (
              <p className="text-[12px] text-[#dc2626] mt-[4px]">Rejected: {doc.rejection_reason}</p>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-[6px] mt-[10px]">

              {/* FIX 1 — Preview uses blob, not bare href */}
              {hasFile && (
                <button onClick={() => onPreview(doc)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[4px]">
                  <Eye size={11}/> Preview
                </button>
              )}

              <button onClick={() => setShowUpload(v => !v)}
                className="h-[30px] px-[10px] rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[4px]">
                <Upload size={11}/> {hasFile ? 'Replace' : 'Upload'}
              </button>

              {hasFile && (
                <button onClick={() => onDownload(doc)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[4px]">
                  <Download size={11}/> Download
                </button>
              )}

              {doc.can_request && (
                <button onClick={() => onRequest(doc.id)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#fde68a] text-[12px] font-medium text-[#a16207] hover:bg-[#fef9c3] flex items-center gap-[4px]">
                  <AlertCircle size={11}/> Request
                </button>
              )}

              {doc.can_verify && (
                <button onClick={() => onVerify(doc.id)}
                  className="h-[30px] px-[10px] rounded-[6px] text-[12px] font-semibold text-white flex items-center gap-[4px]"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}>
                  <CheckCircle2 size={11}/> Verify
                </button>
              )}

              {doc.can_reject && (
                <button onClick={() => onReject(doc)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#fecaca] text-[12px] font-medium text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-[4px]">
                  <XCircle size={11}/> Reject
                </button>
              )}

              {doc.can_delete && hasFile && (
                <button onClick={() => onDelete(doc.id)}
                  className="h-[30px] px-[10px] rounded-[6px] border border-[#fecaca] text-[12px] font-medium text-[#dc2626] hover:bg-[#fef2f2] flex items-center gap-[4px]">
                  <Trash2 size={11}/> Delete
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inline upload zone */}
        {showUpload && (
          <div className="mt-[12px]">
            <UploadZone docId={doc.id}
              onUpload={(id, file) => { onUpload(id, file); setShowUpload(false); }}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS OVERVIEW — FIX 2: live stats from useHRDocuments
// ─────────────────────────────────────────────────────────────────────────────

interface DocStats {
  total: number; verified: number; pending: number; missing: number; pct_complete: number;
}

function ProgressOverview({ stats }: { stats: DocStats }) {
  const bars = [
    { label: 'Verified', count: stats.verified, color: '#22c55e', bg: '#dcfce7' },
    { label: 'Pending',  count: stats.pending,  color: '#f59e0b', bg: '#fef9c3' },
    { label: 'Missing',  count: stats.missing,  color: '#ef4444', bg: '#fee2e2' },
  ];
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-[14px]">
        <h3 className="text-[16px] font-bold text-[#0f172a]">Document Progress</h3>
        <span className="text-[14px] font-bold text-indigo-600">{stats.pct_complete}% Complete</span>
      </div>
      <div className="h-[10px] bg-[#f1f5f9] rounded-full overflow-hidden mb-[14px]">
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${stats.pct_complete}%`, backgroundImage: PRIMARY_GRADIENT }}/>
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
              {stats.total > 0 ? Math.round((b.count / stats.total) * 100) : 0}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT GUIDE PANEL
// FIX 6: Add Participant navigates to case detail
// ─────────────────────────────────────────────────────────────────────────────

function DocumentGuidePanel({ visaType, participants, appId, onNavigate }: {
  visaType:     string;
  participants: Array<{ name: string; role: string }>;
  appId:        string;
  onNavigate:   (path: string) => void;
}) {
  return (
    <div className="flex flex-col gap-[14px]">

      {/* Requirements */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-[8px] mb-[12px]">
          <div className="size-[32px] rounded-[8px] bg-indigo-50 flex items-center justify-center">
            <CheckSquare size={15} className="text-indigo-600"/>
          </div>
          <h3 className="text-[14px] font-bold text-[#0f172a]">Document Requirements</h3>
        </div>
        <p className="text-[12px] text-[#64748b] mb-[8px]">For {visaType} petition</p>
        <ul className="flex flex-col gap-[6px]">
          {[
            'All documents must be in English or certified translation',
            'PDFs preferred; high-quality scans accepted',
            'Ensure all pages are visible and legible',
            'Signatures must match official government records',
          ].map((tip, i) => (
            <li key={i} className="flex items-start gap-[6px]">
              <CheckCircle2 size={11} className="text-indigo-400 shrink-0 mt-[2px]"/>
              <span className="text-[12px] text-[#475569]">{tip}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Helpful Resources */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-[8px] mb-[12px]">
          <div className="size-[32px] rounded-[8px] bg-[#f0fdf4] flex items-center justify-center">
            <ExternalLink size={15} className="text-[#15803d]"/>
          </div>
          <h3 className="text-[14px] font-bold text-[#0f172a]">Helpful Resources</h3>
        </div>
        <div className="flex flex-col gap-[6px]">
          {[
            { label: 'USCIS H-1B Guide',   href: 'https://www.uscis.gov/h-1b' },
            { label: 'DOL LCA Filing',      href: 'https://www.dol.gov/agencies/eta/foreign-labor' },
            { label: 'Download Form I-129', href: 'https://www.uscis.gov/i-129' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              className="flex items-center justify-between p-[8px] rounded-[8px] hover:bg-[#f8fafc] transition">
              <span className="text-[12px] font-medium text-indigo-600">{l.label}</span>
              <ExternalLink size={10} className="text-indigo-400"/>
            </a>
          ))}
        </div>
      </div>

      {/* Case Participants */}
      {participants.length > 0 && (
        <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[18px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-[8px] mb-[12px]">
            <div className="size-[32px] rounded-[8px] bg-[#fff7ed] flex items-center justify-center">
              <Users size={15} className="text-[#c2410c]"/>
            </div>
            <h3 className="text-[14px] font-bold text-[#0f172a]">Case Participants</h3>
          </div>
          <div className="flex flex-col gap-[10px]">
            {participants.map((p, i) => (
              <div key={i} className="flex items-center gap-[10px]">
                <div className="size-[32px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                     style={{ backgroundColor: avatarBg(p.name) }}>
                  {initials(p.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#64748b]">{p.role}</p>
                </div>
                <div className="size-[7px] rounded-full bg-[#22c55e] shrink-0 ml-auto"/>
              </div>
            ))}
            {/* FIX 6: Add Participant — navigates to case detail instead of no-op */}
            <button
              onClick={() => onNavigate(`/employer/cases/${appId}`)}
              className="flex items-center gap-[6px] text-[12px] font-medium text-indigo-600 hover:underline mt-[2px]">
              <Plus size={11}/> Add Participant
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

interface HRDocumentManagementProps {
  applicationId?: string;
  caseName?:      string;
  visaType?:      string;
  participants?:  Array<{ name: string; role: string }>;
  embedded?:      boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HRDocumentManagement({
  applicationId:  propId,
  caseName      = 'Case Documents',
  visaType      = 'H-1B Specialty Occupation',
  participants  = [{ name: 'HR Manager', role: 'HR Manager' }],
  embedded      = false,
}: HRDocumentManagementProps) {
  const navigate = useNavigate();
  const { applicationId: paramId } = useParams<{ applicationId: string }>();
  const appId = propId ?? paramId ?? '';

  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const [search,       setSearch]       = useState('');
  const [viewMode,     setViewMode]     = useState<'grid' | 'list'>('grid');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectModal,  setRejectModal]  = useState<{ open: boolean; doc: HRDocumentUIEntry | null }>({ open: false, doc: null });

  // FIX 7: single fileInputRef (was declared twice before)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    documents, stats, isLoading, error,
    load, upload, verify, reject, requestDoc, requestMissing, deleteDoc,
  } = useHRDocuments();

  useEffect(() => {
    if (appId) void load(appId);
  }, [appId, load]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(p => [...p, { id, tone, title, message }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3200);
  };

  // ── FIX 1: Preview — blob fetch keeps auth cookies ────────────────────────

  const handlePreview = async (doc: HRDocumentUIEntry) => {
    pushToast('info', 'Loading preview...');
    try {
      const { blob } = await hrDocumentApi.getFile(doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      pushToast('error', 'Preview failed', 'Could not load document.');
    }
  };

  // ── FIX 2: Download — same blob pattern but triggers download ─────────────

  const handleDownload = async (doc: HRDocumentUIEntry) => {
    try {
      const { blob, fileName } = await hrDocumentApi.getFile(doc.id);
      const url = URL.createObjectURL(blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: fileName });
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast('success', 'Download started', fileName);
    } catch {
      pushToast('error', 'Download failed');
    }
  };

  // ── FIX 4: Upload — uses correct document_type name ───────────────────────

  const handleUpload = async (docId: string, file: File) => {
    pushToast('info', `Uploading ${file.name}...`);
    try {
      // Find the existing doc entry to get its correct document_type name
      const existingDoc = documents.find(d => d.id === docId);
      const docTypeName = existingDoc?.document_type
        ?? file.name.replace(/\.[^/.]+$/, '');

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      type Cat = 'identity' | 'employment' | 'education' | 'legal' | 'personal' | 'other';
      const autoCategory: Cat = ['jpg','jpeg','png','gif','webp'].includes(ext)
        ? 'identity' : ext === 'pdf' ? 'legal' : 'other';

      await upload(file, {
        document_type:  docTypeName,
        category:       (existingDoc?.category as Cat) ?? autoCategory,
        application_id: appId || undefined,
      });
      pushToast('success', 'Upload complete', `${file.name} is now pending review.`);
    } catch {
      pushToast('error', 'Upload failed', 'Please try again.');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await verify(id);
      pushToast('success', 'Document verified');
    } catch { pushToast('error', 'Verification failed'); }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      await reject(id, { rejection_reason: reason });
      setRejectModal({ open: false, doc: null });
      pushToast('warning', 'Document rejected', 'Employee has been notified.');
    } catch { pushToast('error', 'Rejection failed'); }
  };

  const handleRequest = async (id: string) => {
    try {
      await requestDoc(id);
      pushToast('info', 'Request sent', 'Employee will be notified to upload this document.');
    } catch { pushToast('error', 'Request failed'); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(id);
      pushToast('success', 'Document removed');
    } catch { pushToast('error', 'Delete failed'); }
  };

  const handleRequestMissing = async () => {
    if (!appId) return;
    try {
      const n = await requestMissing(appId, 'HR has requested all missing documents for your case.');
      pushToast('info', `Requested ${n} missing documents`, 'Employee will be notified.');
    } catch { pushToast('error', 'Request failed'); }
  };

  // ── FIX 5: Status filter — wired ─────────────────────────────────────────

  const filtered = documents.filter(d => {
    const q = search.toLowerCase();
    const matchSearch  = !search || (d.document_type ?? d.name).toLowerCase().includes(q);
    const matchStatus  = statusFilter === 'all' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Split required vs additional by category
  const REQUIRED_CATS = new Set(['identity', 'employment', 'legal', 'education']);
  const requiredDocs   = filtered.filter(d => REQUIRED_CATS.has(d.category ?? ''));
  const additionalDocs = filtered.filter(d => !REQUIRED_CATS.has(d.category ?? ''));

  // Shared card props builder
  const cardProps = (doc: HRDocumentUIEntry) => ({
    doc,
    onUpload:   handleUpload,
    onDownload: handleDownload,
    onDelete:   handleDelete,
    onVerify:   handleVerify,
    onReject:   (d: HRDocumentUIEntry) => setRejectModal({ open: true, doc: d }),
    onRequest:  handleRequest,
    onPreview:  handlePreview,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  const Content = (
    <div className="flex flex-col gap-[20px]">
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))}/>

      {/* Standalone page header */}
      {!embedded && (
        <div className="flex items-start justify-between gap-[16px]">
          <div>
            <div className="flex items-center gap-[6px] mb-[8px] text-[13px] text-[#64748b]">
              <button onClick={() => navigate('/employer/cases')} className="hover:text-indigo-600">Cases</button>
              <span className="text-[#d1d5db]">/</span>
              <button onClick={() => navigate(`/employer/cases/${appId}`)} className="hover:text-indigo-600">
                {caseName}
              </button>
              <span className="text-[#d1d5db]">/</span>
              <span className="text-[#374151]">Documents</span>
            </div>
            <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">Document Management</h1>
            <p className="text-[13px] text-[#64748b] mt-[3px]">{visaType} · {stats.pct_complete}% complete</p>
          </div>
          <div className="flex items-center gap-[8px]">
            <button onClick={handleRequestMissing}
              className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
              Send Reminders
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold flex items-center gap-[6px]"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              <Upload size={13}/> Upload Document
            </button>
          </div>
        </div>
      )}

      {/* FIX 2: Progress — live stats */}
      {isLoading
        ? <div className="h-[140px] bg-white rounded-[16px] border border-[#f1f5f9] animate-pulse"/>
        : <ProgressOverview stats={stats}/>
      }

      {/* Filter bar */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[14px] flex items-center gap-[10px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)] flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..."
            className="w-full h-[40px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[30px] pr-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
        </div>
        {/* FIX 5: Status filter wired */}
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none h-[40px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[10px] pr-[26px] text-[13px] text-[#374151] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200">
            <option value="all">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending_review">Pending Review</option>
            <option value="uploaded">Uploaded</option>
            <option value="missing">Missing</option>
            <option value="rejected">Rejected</option>
          </select>
          <ChevronDown size={12} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
        </div>
        <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[8px] p-[3px]">
          <button onClick={() => setViewMode('grid')}
            className={`size-[32px] rounded-[6px] flex items-center justify-center transition ${
              viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'
            }`}><Grid size={14}/></button>
          <button onClick={() => setViewMode('list')}
            className={`size-[32px] rounded-[6px] flex items-center justify-center transition ${
              viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'
            }`}><ListIcon size={14}/></button>
        </div>
      </div>

      {error && (
        <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] p-[14px] text-[13px] text-[#dc2626]">
          {error}
        </div>
      )}

      {/* Docs + Sidebar */}
      <div className="flex flex-col lg:flex-row gap-[20px] items-start">
        <div className="flex-1 min-w-0 flex flex-col gap-[20px]">

          {/* Required Documents */}
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <div className="flex items-center gap-[8px]">
                <div className="size-[32px] rounded-[8px] bg-[#fef2f2] flex items-center justify-center">
                  <Shield size={14} className="text-[#dc2626]"/>
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a]">Required Documents</h2>
                  <p className="text-[12px] text-[#64748b]">
                    {requiredDocs.filter(d => d.status === 'verified').length}/{requiredDocs.length} verified
                  </p>
                </div>
              </div>
              <button
                onClick={() => pushToast('info', 'Preparing download...', 'Only verified documents will be included.')}
                className="h-[32px] px-[12px] rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[5px]">
                <Download size={11}/> Download All
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                {[0,1,2,3].map(i => (
                  <div key={i} className="h-[140px] bg-white rounded-[14px] border border-[#f1f5f9] animate-pulse"/>
                ))}
              </div>
            ) : requiredDocs.length === 0 ? (
              <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[24px] text-center text-[#64748b] text-[13px]">
                {search || statusFilter !== 'all'
                  ? 'No required documents match your filters.'
                  : 'No required documents found for this case.'}
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-[10px]'
                : 'flex flex-col gap-[8px]'}>
                {requiredDocs.map(doc => <DocumentCard key={doc.id} {...cardProps(doc)}/>)}
              </div>
            )}
          </div>

          {/* Additional Documents */}
          <div>
            <div className="flex items-center justify-between mb-[12px]">
              <div className="flex items-center gap-[8px]">
                <div className="size-[32px] rounded-[8px] bg-[#eef2ff] flex items-center justify-center">
                  <Plus size={14} className="text-indigo-600"/>
                </div>
                <div>
                  <h2 className="text-[16px] font-bold text-[#0f172a]">Additional Documents</h2>
                  <p className="text-[12px] text-[#64748b]">Supporting materials to strengthen your case</p>
                </div>
              </div>
              <button onClick={() => fileInputRef.current?.click()}
                className="h-[32px] px-[12px] rounded-[8px] text-[12px] font-semibold text-white flex items-center gap-[5px]"
                style={{ backgroundImage: PRIMARY_GRADIENT }}>
                <Plus size={11}/> Add Document
              </button>
            </div>

            {additionalDocs.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-[#e5e7eb] rounded-[14px] p-[32px] text-center">
                <Upload size={20} className="text-[#9ca3af] mx-auto mb-[6px]"/>
                <p className="text-[13px] font-medium text-[#374151] mb-[2px]">No additional documents yet</p>
                <p className="text-[12px] text-[#94a3b8]">Upload supporting materials to strengthen this case</p>
              </div>
            ) : (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 gap-[10px]'
                : 'flex flex-col gap-[8px]'}>
                {additionalDocs.map(doc => <DocumentCard key={doc.id} {...cardProps(doc)}/>)}
              </div>
            )}
          </div>
        </div>

        {/* FIX 6: Sidebar — passes appId and navigate to DocumentGuidePanel */}
        <div className="w-full lg:w-[280px] shrink-0">
          <DocumentGuidePanel
            visaType={visaType}
            participants={participants}
            appId={appId}
            onNavigate={navigate}
          />
        </div>
      </div>

      {/* FIX 7: Single hidden file input */}
      <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.png"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleUpload('custom', f); }}/>
    </div>
  );

  if (embedded) return Content;

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex-1 overflow-y-auto p-[24px]">{Content}</div>
      <RejectModal
        open={rejectModal.open}
        doc={rejectModal.doc}
        onClose={() => setRejectModal({ open: false, doc: null })}
        onReject={handleReject}
      />
    </div>
  );
}