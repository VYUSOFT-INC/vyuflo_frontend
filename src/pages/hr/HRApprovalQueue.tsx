// src/pages/hr/HRApprovalQueue.tsx
// Route: /employer/approvals   Figma: node 0:5573

import { useEffect, useState, useCallback, type ReactNode, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Download, CheckSquare, Clock, CheckCircle2,
  FileText, AlertCircle, ArrowRight, X, Info, XCircle,
  AlertTriangle, ChevronDown, Eye, History, 
  Star, Zap, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { PageContent } from '../../components/layout/Pageheader';
import { useHRApprovalQueue } from '../../hooks/hr/useHRApprovalQueue';
import type {
  HRApprovalItem, ApprovalItemPriority, ApprovalItemDocType,
} from '../../types/hr/approval.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PRIORITY_TOKENS: Record<ApprovalItemPriority, { bg: string; text: string; label: string }> = {
  critical: { bg: '#fee2e2', text: '#dc2626', label: 'Critical Priority' },
  high:     { bg: '#ffedd5', text: '#c2410c', label: 'High Priority' },
  medium:   { bg: '#fef9c3', text: '#a16207', label: 'Medium Priority' },
  low:      { bg: '#dcfce7', text: '#15803d', label: 'Low Priority' },
};

const TYPE_TOKENS: Record<ApprovalItemDocType, { bg: string; text: string; label: string }> = {
  letter:      { bg: '#eef2ff', text: '#4338ca', label: 'Letter' },
  form:        { bg: '#f0fdf4', text: '#15803d', label: 'Form' },
  document:    { bg: '#faf5ff', text: '#7c3aed', label: 'Document' },
  certificate: { bg: '#fff7ed', text: '#c2410c', label: 'Certificate' },
};

function confidenceColor(score: number) {
  if (score >= 90) return '#16a34a';
  if (score >= 70) return '#f59e0b';
  return '#dc2626';
}

// ─── Toast ───────────────────────────────────────────────────────────────────

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

// ─── Request Edits Modal ──────────────────────────────────────────────────────

function RequestEditsModal({ open, item, onClose, onSubmit }: {
  open: boolean;
  item: HRApprovalItem | null;
  onClose: () => void;
  onSubmit: (id: string, note: string) => Promise<void>;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open || !item) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}/>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-semibold text-[#0f172a]">Request Edits</h3>
            <button onClick={onClose}><X size={18} className="text-[#94a3b8]"/></button>
          </div>
          <div className="bg-[#f8fafc] rounded-[10px] p-[12px] mb-[14px]">
            <p className="text-[13px] font-semibold text-[#0f172a]">{item.title}</p>
            <p className="text-[12px] text-[#64748b]">{item.employee_name} · Case #{item.case_number}</p>
          </div>
          <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">Edit Instructions *</label>
          <textarea value={note} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNote(e.target.value)}
            placeholder="Describe what needs to be changed..." rows={4}
            className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
          <div className="flex justify-end gap-[10px] mt-[16px]">
            <button onClick={onClose} className="h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">Cancel</button>
            <button onClick={async () => { if (!note.trim()) return; setBusy(true); await onSubmit(item.id, note); setNote(''); setBusy(false); }}
              disabled={busy || !note.trim()}
              className="h-[40px] px-[16px] rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-60 bg-[#f59e0b] hover:bg-[#d97706]">
              {busy ? 'Sending...' : 'Send Edit Request'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Approval Card ────────────────────────────────────────────────────────────

function ApprovalCard({ item, isChecked, onCheck, onApprove, onRequestEdits, onToast }: {
  item: HRApprovalItem;
  isChecked: boolean;
  onCheck: (id: string) => void;
  onApprove: (id: string) => Promise<void>;
  onRequestEdits: (item: HRApprovalItem) => void;
  onToast: (tone: ToastTone, title: string, msg?: string) => void;
  navigate: (to: string) => void;
}) {
  const pri  = PRIORITY_TOKENS[item.priority];
  const type = TYPE_TOKENS[item.doc_type];

  const borderClass: Record<string, string> = {
    pending:         'border-[#f1f5f9]',
    approved:        'border-[#bbf7d0]',
    edits_requested: 'border-[#fde68a]',
  };

  return (
    <div className={`bg-white border rounded-[16px] shadow-[0px_1px_3px_rgba(0,0,0,0.06)] overflow-hidden ${borderClass[item.status] ?? 'border-[#f1f5f9]'}`}>
      <div className="p-[24px] flex items-start gap-[16px]">
        {/* Checkbox */}
        <button onClick={() => onCheck(item.id)}
          className={`size-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[6px] transition ${isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-[#d1d5db] hover:border-indigo-400'}`}>
          {isChecked && <Check size={11} className="text-white"/>}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + badges */}
          <div className="flex items-center gap-[8px] mb-[8px] flex-wrap">
            <h3 className="text-[17px] font-bold text-[#0f172a]">{item.title}</h3>
            <span className="inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: pri.bg, color: pri.text }}>{pri.label}</span>
            <span className="inline-flex items-center px-[8px] py-[2px] rounded-full text-[11px] font-semibold"
                  style={{ backgroundColor: type.bg, color: type.text }}>{type.label}</span>
            {item.status === 'edits_requested' && (
              <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-[#fef9c3] text-[#a16207]">Has Edits</span>
            )}
            {item.status === 'approved' && (
              <span className="inline-flex items-center gap-[4px] px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d]">
                <CheckCircle2 size={10}/> Approved
              </span>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center flex-wrap gap-[14px] mb-[10px]">
            <span className="flex items-center gap-[5px] text-[13px] text-[#64748b]"><FileText size={12} className="text-[#94a3b8]"/>{item.visa_type}</span>
            <span className="flex items-center gap-[5px] text-[13px] text-[#64748b]"><span className="size-[6px] rounded-full bg-[#94a3b8] inline-block"/>{item.employee_name}</span>
            <span className="flex items-center gap-[5px] text-[13px] text-[#64748b]">Case #{item.case_number}</span>
            <span className="flex items-center gap-[5px] text-[12px] text-[#94a3b8]"><Clock size={11}/> Submitted {item.submitted_ago}</span>
          </div>

          <p className="text-[14px] text-[#475569] mb-[12px] leading-relaxed">{item.description}</p>

          {/* Action note */}
          {item.action_note && (
            <div className={`rounded-[8px] p-[12px] mb-[12px] flex items-start gap-[10px] ${item.action_note.type === 'edit' ? 'bg-[#fff7ed] border border-[#fed7aa]' : 'bg-[#eff6ff] border border-[#bfdbfe]'}`}>
              {item.action_note.type === 'edit' ? <AlertCircle size={14} className="text-[#c2410c] shrink-0 mt-[2px]"/> : <Info size={14} className="text-[#2563eb] shrink-0 mt-[2px]"/>}
              <div>
                <p className={`text-[13px] font-semibold mb-[2px] ${item.action_note.type === 'edit' ? 'text-[#c2410c]' : 'text-[#1d4ed8]'}`}>{item.action_note.title}</p>
                <p className="text-[12px] text-[#475569]">{item.action_note.body}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center flex-wrap gap-[8px]">
            <button onClick={() => onToast('info', 'Opening document viewer...', item.title)}
              className="h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[6px] transition">
              <Eye size={13}/> Review Document
            </button>
            <button onClick={() => onToast('info', 'Loading case history...', `Case #${item.case_number}`)}
              className="h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[6px] transition">
              <History size={13}/>
              {item.comment_count ? `Comments (${item.comment_count})` : 'View History'}
            </button>
            {item.revisions && (
              <button onClick={() => onToast('info', 'Comparing versions...', item.title)}
                className="h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[6px] transition">
                <ArrowRight size={13}/> Compare Versions
              </button>
            )}
            <button onClick={() => onToast('success', 'Downloading...', `${item.title}.pdf`)}
              className="h-[38px] px-[14px] rounded-[8px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] flex items-center gap-[6px] transition">
              <Download size={13}/> Download
            </button>
          </div>
        </div>

        {/* Approve / Request Edits */}
        <div className="shrink-0 flex flex-col gap-[8px] ml-[8px]">
          {item.status !== 'approved' && (
            <button onClick={() => void onApprove(item.id)}
              className="h-[42px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold flex items-center gap-[6px] transition"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              <CheckCircle2 size={13}/> Approve
            </button>
          )}
          {item.status === 'approved' && (
            <div className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[10px] bg-[#dcfce7] text-[#15803d]">
              <CheckCircle2 size={14}/> <span className="text-[13px] font-semibold">Approved</span>
            </div>
          )}
          {item.status !== 'approved' && (
            <button onClick={() => onRequestEdits(item)}
              className="h-[42px] px-[14px] rounded-[10px] border border-[#fde68a] text-[#a16207] text-[13px] font-medium hover:bg-[#fef9c3] flex items-center gap-[6px] transition">
              <AlertCircle size={13}/>
              {item.revisions ? 'More Edits' : 'Request Edits'}
            </button>
          )}
        </div>
      </div>

      {/* AI Confidence */}
      {item.ai_confidence > 0 && (
        <div className="mx-[24px] mb-[16px] bg-[#f8fafc] rounded-[10px] p-[14px] border border-[#f1f5f9]">
          <div className="flex items-center justify-between mb-[8px]">
            <span className="flex items-center gap-[6px] text-[13px] font-semibold text-[#374151]">
              <Zap size={14} className="text-indigo-500"/> AI Confidence Score
            </span>
            <span className="text-[14px] font-bold" style={{ color: confidenceColor(item.ai_confidence) }}>{item.ai_confidence}%</span>
          </div>
          <div className="h-[6px] bg-[#e5e7eb] rounded-full overflow-hidden mb-[6px]">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{ width: `${item.ai_confidence}%`, backgroundColor: confidenceColor(item.ai_confidence) }}/>
          </div>
          <p className="text-[12px] text-[#64748b]">{item.ai_note}</p>
        </div>
      )}

      {/* Extracted Fields */}
      {item.extracted_fields.length > 0 && (
        <div className="mx-[24px] mb-[20px] border border-[#f1f5f9] rounded-[10px] p-[14px]">
          {item.extracted_label && <p className="text-[13px] font-semibold text-[#374151] mb-[10px]">{item.extracted_label}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px]">
            {item.extracted_fields.map(f => (
              <div key={f.label}>
                <p className="text-[11px] text-[#94a3b8] font-medium mb-[2px]">{f.label}</p>
                <p className="text-[13px] font-semibold text-[#111827]">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      {item.comments && item.comments.length > 0 && (
        <div className="mx-[24px] mb-[20px]">
          <p className="text-[13px] font-semibold text-[#374151] mb-[10px]">Recent Comments:</p>
          <div className="flex flex-col gap-[12px]">
            {item.comments.map((c, i) => (
              <div key={i} className="flex items-start gap-[10px]">
                <div className="size-[32px] rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                  {c.author.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-[6px] mb-[3px]">
                    <span className="text-[13px] font-semibold text-[#111827]">{c.author}</span>
                    <span className="text-[11px] text-[#94a3b8]">{c.role}</span>
                    <span className="text-[11px] text-[#94a3b8]">· {c.time}</span>
                  </div>
                  <p className="text-[13px] text-[#475569]">{c.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revision history */}
      {item.revisions && item.revisions.length > 0 && (
        <div className="mx-[24px] mb-[20px]">
          <p className="text-[13px] font-semibold text-[#374151] mb-[10px]">Revision History:</p>
          <div className="flex flex-col gap-[4px]">
            {item.revisions.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-[10px] border-b border-[#f8fafc] last:border-b-0">
                <div className="flex items-center gap-[10px]">
                  <div className="size-[30px] rounded-[6px] bg-indigo-50 flex items-center justify-center text-indigo-700 text-[11px] font-bold">{r.version}</div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{r.label}</p>
                    <p className="text-[11px] text-[#94a3b8]">{r.author} · {r.time}</p>
                  </div>
                </div>
                <button className="text-[13px] font-medium text-indigo-600 hover:underline">View</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HRApprovalQueue() {
  const navigate = useNavigate();
  const [toasts,     setToasts]    = useState<Toast[]>([]);
  const [editsModal, setEditsModal] = useState<{ open: boolean; item: HRApprovalItem | null }>({ open: false, item: null });

  const {
    items, stats, isLoading, error,
    checked, toggleCheck, toggleAll,
    load, approve, requestEdits, bulkApprove,
    showFilter, setShowFilter, priFilter, setPriFilter,
    typeFilter, setTypeFilter, dateFilter, setDateFilter,
    clearFilters,
    //  search, setSearch,
  } = useHRApprovalQueue();

  useEffect(() => { void load(); }, [load]);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(p => [...p, { id, tone, title, message }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3200);
  }, []);

  const handleApprove = useCallback(async (id: string) => {
    try {
      await approve(id);
      pushToast('success', 'Document approved', 'Notification sent to attorney.');
    } catch { pushToast('error', 'Approval failed', 'Please try again.'); }
  }, [approve]);

  const handleRequestEdits = useCallback(async (id: string, note: string) => {
    try {
      await requestEdits(id, { note });
      setEditsModal({ open: false, item: null });
      pushToast('warning', 'Edits requested', 'Author will be notified.');
    } catch { pushToast('error', 'Action failed', 'Please try again.'); }
  }, [requestEdits]);

  const handleBulkApprove = useCallback(async () => {
    try {
      const result = await bulkApprove();
      pushToast('success', `Approved ${result.approved} items`, result.failed > 0 ? `${result.failed} failed` : undefined);
    } catch { pushToast('error', 'Bulk approve failed'); }
  }, [bulkApprove]);

  // const navItems = [
  //   { label: 'Dashboard',    count: 0,            active: false, onClick: () => navigate('/employer') },
  //   { label: 'My Cases',     count: 12,           active: false, onClick: () => navigate('/employer/cases') },
  //   { label: 'Approvals',    count: stats.pending, active: true,  onClick: () => {} },
  //   { label: 'Documents',    count: 0,            active: false, onClick: () => navigate('/employer/cases') },
  //   { label: 'E-Signatures', count: 2,            active: false, onClick: () => {} },
  //   { label: 'Deadlines',    count: 0,            active: false, onClick: () => navigate('/employer/deadlines') },
  // ];

  const SHORTCUTS = [
    { label: 'Approve Selected', key: 'A',  desc: 'Approve all selected items in bulk' },
    { label: 'Request Edits',    key: 'R',  desc: 'Open comment box to request changes' },
    { label: 'Next Item',        key: '→',  desc: 'Navigate to next approval item' },
    { label: 'Previous Item',    key: '←',  desc: 'Navigate to previous approval item' },
    { label: 'View Document',    key: 'V',  desc: 'Open document in viewer' },
    { label: 'Add Comment',      key: 'C',  desc: 'Add a comment to the item' },
  ];

  const BEST_PRACTICES = [
    'Review AI Confidence Scores: Higher scores indicate better accuracy, but always verify critical information manually.',
    'Check Revision History: For documents with edits, review previous versions to understand changes made.',
    'Be Specific with Edit Requests: When requesting changes, provide clear, actionable feedback with specific sections to modify.',
    'Use Comments for Collaboration: Tag team members in comments to request their input or notify them of approvals.',
    'Prioritize High-Priority Items: Focus on urgent documents first, especially those with approaching deadlines.',
  ];

  const statCards = [
    { label: 'Pending Review',    value: String(stats.pending),           icon: <Clock size={20}/>,         bg: '#fff7ed', color: '#c2410c' },
    { label: 'Approved Today',    value: String(stats.approved_today),    icon: <CheckCircle2 size={20}/>,  bg: '#dcfce7', color: '#15803d' },
    { label: 'Edits Requested',   value: String(stats.edits_requested),   icon: <AlertCircle size={20}/>,   bg: '#fef9c3', color: '#a16207' },
    { label: 'Avg Response Time', value: `${stats.avg_response_hours}h`,  icon: <Zap size={20}/>,           bg: '#eef2ff', color: '#4338ca' },
  ];

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))}/>

      {/* Sidebar
      <div className="hidden lg:flex flex-col w-[256px] shrink-0 bg-white border-r border-[#f1f5f9] h-full overflow-y-auto">
        <div className="p-[16px]">
          <div className="relative">
            <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..."
              className="w-full h-[40px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[30px] pr-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
          </div>
        </div>
        <nav className="flex-1 px-[16px]">
          {navItems.map(item => (
            <button key={item.label} onClick={item.onClick}
              className={`w-full flex items-center justify-between px-[12px] py-[12px] rounded-[10px] mb-[2px] text-[13px] font-medium transition ${item.active ? 'bg-indigo-50 text-indigo-700' : 'text-[#374151] hover:bg-[#f8fafc]'}`}>
              <span>{item.label}</span>
              {item.count > 0 && (
                <span className={`px-[7px] py-[1px] rounded-full text-[11px] font-semibold ${item.active ? 'bg-indigo-600 text-white' : 'bg-[#f1f5f9] text-[#64748b]'}`}>{item.count}</span>
              )}
            </button>
          ))}
          <div className="mt-[16px] mb-[6px] px-[12px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">Quick Actions</p>
          </div>
          {[{ label: 'New Case', onClick: () => navigate('/employer/cases/new') },{ label: 'Upload Document', onClick: () => pushToast('info', 'Go to a case to upload') },{ label: 'Invite Team Member', onClick: () => navigate('/employer/invite') }].map(a => (
            <button key={a.label} onClick={a.onClick}
              className="w-full flex items-center px-[12px] py-[10px] rounded-[10px] mb-[2px] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition">
              {a.label}
            </button>
          ))}
        </nav>
        <div className="m-[16px] bg-indigo-50 rounded-[12px] p-[14px]">
          <div className="flex items-center gap-[6px] mb-[6px]">
            <Lightbulb size={14} className="text-indigo-600"/>
            <span className="text-[12px] font-semibold text-indigo-700">Pro Tip</span>
          </div>
          <p className="text-[12px] text-indigo-600 leading-relaxed">Use keyboard shortcuts to approve faster. Press 'A' to approve, 'R' to request edits.</p>
        </div>
      </div> */}

      {/* Main */}
      <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
        <PageContent>
          <div className="flex flex-col gap-[20px]">

            {/* Header */}
            <div className="flex items-start justify-between gap-[16px]">
              <div>
                <h1 className="text-[26px] font-bold text-[#0f172a] tracking-[-0.5px]">Approval Queue</h1>
                <p className="text-[14px] text-[#64748b] mt-[4px]">Review and approve documents and letters awaiting your action</p>
              </div>
              <div className="flex items-center gap-[8px] shrink-0">
                <button onClick={() => pushToast('info', 'Filter options')}
                  className="h-[40px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] flex items-center gap-[6px]">
                  <Filter size={13}/> Filter
                </button>
                <button onClick={() => pushToast('info', 'Exporting...')}
                  className="h-[40px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] flex items-center gap-[6px]">
                  <Download size={13}/> Export
                </button>
                <button onClick={() => void handleBulkApprove()}
                  className="h-[40px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold flex items-center gap-[6px]"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}>
                  <CheckSquare size={13}/> Bulk Approve
                  {checked.size > 0 && <span className="ml-[2px] bg-white/20 rounded-full px-[6px] text-[11px]">{checked.size}</span>}
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[12px]">
              {statCards.map(s => (
                <div key={s.label} className="bg-white border border-[#f1f5f9] rounded-[14px] p-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-[8px]">
                    <p className="text-[12px] font-medium text-[#64748b]">{s.label}</p>
                    <div className="size-[36px] rounded-[10px] flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                  </div>
                  <p className="text-[28px] font-black text-[#0f172a] tracking-[-1px]">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Filter bar */}
            <div className="bg-white border border-[#f1f5f9] rounded-[14px] px-[16px] py-[12px] flex items-center flex-wrap gap-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
              {[
                { label: 'Show:', value: showFilter, onChange: setShowFilter, options: [{ v: 'all', l: 'All Items' },{ v: 'pending', l: 'Pending' },{ v: 'edits', l: 'Edits Requested' },{ v: 'approved', l: 'Approved' }] },
                { label: 'Priority:', value: priFilter, onChange: setPriFilter, options: [{ v: 'all', l: 'All Priorities' },{ v: 'critical', l: 'Critical' },{ v: 'high', l: 'High' },{ v: 'medium', l: 'Medium' },{ v: 'low', l: 'Low' }] },
                { label: 'Case Type:', value: typeFilter, onChange: setTypeFilter, options: [{ v: 'all', l: 'All Visa Types' },{ v: 'letter', l: 'Letters' },{ v: 'form', l: 'Forms' },{ v: 'document', l: 'Documents' }] },
                { label: 'Date Range:', value: dateFilter, onChange: setDateFilter, options: [{ v: '7days', l: 'Last 7 Days' },{ v: '30days', l: 'Last 30 Days' },{ v: '90days', l: 'Last 90 Days' }] },
              ].map(sel => (
                <div key={sel.label} className="flex items-center gap-[8px]">
                  <span className="text-[13px] text-[#64748b] font-medium whitespace-nowrap">{sel.label}</span>
                  <div className="relative">
                    <select value={sel.value} onChange={e => sel.onChange(e.target.value)}
                      className="appearance-none h-[34px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[10px] pr-[24px] text-[13px] text-[#374151] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200">
                      {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-[7px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
                  </div>
                </div>
              ))}
              <button onClick={clearFilters} className="text-[13px] font-medium text-indigo-600 hover:underline ml-auto">Clear Filters</button>
              {items.length > 0 && (
                <button onClick={toggleAll}
                  className={`size-[20px] rounded-[4px] border-2 flex items-center justify-center transition ${checked.size === items.length && items.length > 0 ? 'bg-indigo-600 border-indigo-600' : 'border-[#d1d5db] hover:border-indigo-400'}`}>
                  {checked.size === items.length && items.length > 0 && <Check size={11} className="text-white"/>}
                </button>
              )}
            </div>

            {error && <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] p-[14px] text-[13px] text-[#dc2626]">{error}</div>}

            {/* Items */}
            {isLoading ? (
              <div className="flex flex-col gap-[12px]">
                {[0,1,2].map(i => <div key={i} className="h-[200px] bg-white rounded-[16px] border border-[#f1f5f9] animate-pulse"/>)}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[60px] bg-white border border-[#f1f5f9] rounded-[16px] text-center">
                <CheckCircle2 size={36} className="text-[#22c55e] mb-[12px]"/>
                <p className="text-[16px] font-semibold text-[#0f172a] mb-[4px]">All caught up!</p>
                <p className="text-[13px] text-[#64748b]">No items match your current filters.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-[12px]">
                {items.map(item => (
                  <ApprovalCard key={item.id} item={item}
                    isChecked={checked.has(item.id)}
                    onCheck={toggleCheck}
                    onApprove={handleApprove}
                    onRequestEdits={i => setEditsModal({ open: true, item: i })}
                    onToast={pushToast}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {items.length > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-[13px] text-[#64748b]">Showing {items.length} items</p>
                <div className="flex items-center gap-[4px]">
                  <button className="size-[36px] rounded-[8px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]"><ChevronLeft size={14}/></button>
                  <button className="size-[36px] rounded-[8px] bg-indigo-600 text-white text-[13px] font-semibold flex items-center justify-center">1</button>
                  <button className="size-[36px] rounded-[8px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]"><ChevronRight size={14}/></button>
                </div>
              </div>
            )}

            {/* Keyboard shortcuts */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[24px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
              <h3 className="text-[18px] font-bold text-[#0f172a] mb-[16px]">Quick Actions & Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-[12px]">
                {SHORTCUTS.map(s => (
                  <div key={s.key} className="bg-[#f8fafc] rounded-[10px] p-[14px] flex items-start justify-between gap-[10px]">
                    <div>
                      <p className="text-[13px] font-semibold text-[#0f172a] mb-[3px]">{s.label}</p>
                      <p className="text-[12px] text-[#64748b]">{s.desc}</p>
                    </div>
                    <kbd className="shrink-0 px-[8px] py-[3px] rounded-[6px] bg-white border border-[#e5e7eb] text-[12px] font-mono font-semibold text-[#374151] shadow-sm">{s.key}</kbd>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Practices */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[24px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-[10px] mb-[16px]">
                <div className="size-[36px] rounded-[10px] bg-indigo-50 flex items-center justify-center"><Star size={16} className="text-indigo-600"/></div>
                <h3 className="text-[18px] font-bold text-[#0f172a]">Best Practices for Document Approval</h3>
              </div>
              <ul className="flex flex-col gap-[10px]">
                {BEST_PRACTICES.map((tip, i) => (
                  <li key={i} className="flex items-start gap-[10px]">
                    <CheckCircle2 size={15} className="text-indigo-400 shrink-0 mt-[2px]"/>
                    <p className="text-[13px] text-[#475569] leading-relaxed">{tip}</p>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </PageContent>
      </div>

      <RequestEditsModal open={editsModal.open} item={editsModal.item}
        onClose={() => setEditsModal({ open: false, item: null })}
        onSubmit={handleRequestEdits}/>
    </div>
  );
}