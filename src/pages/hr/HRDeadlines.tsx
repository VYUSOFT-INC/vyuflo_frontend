// src/pages/hr/HRDeadlines.tsx
// Route: /employer/deadlines   Figma: node 0:8419

import { useEffect, useState, useCallback, type ReactNode, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Clock, CheckCircle2, RefreshCw, Download,
  Plus, Search, ChevronDown, User, Building2, Scale, Upload,
  Bell, X, Info, XCircle, Calendar, TrendingUp, Check,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useHRDeadlines } from '../../hooks/hr/useHRDeadlines';
import type { HRDeadlineItem, HRExtensionRequest } from '../../types/hr/deadlines.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

function urgencyToken(days: number) {
  if (days < 0)   return { bg: '#fef2f2', border: '#fecaca', badge: '#fee2e2', badgeText: '#dc2626', label: 'OVERDUE',  bar: '#ef4444', text: '#dc2626' };
  if (days <= 7)  return { bg: '#fff7ed', border: '#fed7aa', badge: '#ffedd5', badgeText: '#c2410c', label: 'URGENT',   bar: '#f97316', text: '#c2410c' };
  if (days <= 30) return { bg: '#fffbeb', border: '#fde68a', badge: '#fef9c3', badgeText: '#a16207', label: 'WARNING',  bar: '#f59e0b', text: '#a16207' };
  return           { bg: '#f0fdf4', border: '#bbf7d0', badge: '#dcfce7', badgeText: '#15803d', label: 'ON TRACK', bar: '#22c55e', text: '#15803d' };
}

// ─── Toast ───────────────────────────────────────────────────────────────────

type ToastTone = 'success' | 'error' | 'info' | 'warning';
type Toast = { id: string; tone: ToastTone; title: string; message?: string };

function ToastStack({ items, onDismiss }: { items: Toast[]; onDismiss: (id: string) => void }) {
  const m: Record<ToastTone, { icon: ReactNode; box: string; iBg: string; iCol: string }> = {
    success: { icon: <CheckCircle2 size={16}/>, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iBg: 'bg-[#dcfce7]', iCol: 'text-[#15803d]' },
    error:   { icon: <XCircle size={16}/>,      box: 'border-[#fecaca] bg-[#fef2f2]', iBg: 'bg-[#fee2e2]', iCol: 'text-[#dc2626]' },
    warning: { icon: <AlertTriangle size={16}/>,box: 'border-[#fde68a] bg-[#fffbeb]', iBg: 'bg-[#fef3c7]', iCol: 'text-[#c2410c]' },
    info:    { icon: <Info size={16}/>,          box: 'border-[#c7d2fe] bg-[#eef2ff]', iBg: 'bg-[#e0e7ff]', iCol: 'text-[#4338ca]' },
  };
  return (
    <div className="fixed right-4 top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const meta = m[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${meta.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${meta.iBg} ${meta.iCol}`}>{meta.icon}</div>
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

// ─── Request Extension Modal ─────────────────────────────────────────────────

function RequestExtensionModal({ open, deadline, onClose, onSubmit }: {
  open: boolean;
  deadline: HRDeadlineItem | null;
  onClose: () => void;
  onSubmit: (applicationId: string, days: number, reason: string) => Promise<void>;
}) {
  const [days,   setDays]   = useState(14);
  const [reason, setReason] = useState('');
  const [busy,   setBusy]   = useState(false);

  if (!open || !deadline) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose}/>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="w-full max-w-[520px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-semibold text-[#0f172a]">Request Extension</h3>
            <button onClick={onClose}><X size={18} className="text-[#94a3b8]"/></button>
          </div>
          <div className="bg-[#f8fafc] rounded-[10px] p-[14px] mb-[16px]">
            <p className="text-[13px] font-semibold text-[#0f172a]">{deadline.title}</p>
            <p className="text-[12px] text-[#64748b] mt-[2px]">Case #{deadline.case_number} · Due {fmtDate(deadline.due_date)}</p>
          </div>
          <div className="flex flex-col gap-[14px]">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">Extension Duration</label>
              <div className="flex items-center gap-[8px]">
                {[7, 14, 21, 30].map(d => (
                  <button key={d} onClick={() => setDays(d)}
                    className={`h-[38px] px-[14px] rounded-[8px] border text-[13px] font-medium transition ${days === d ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-[#e5e7eb] text-[#374151] hover:bg-[#f8fafc]'}`}>
                    +{d} days
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">Reason *</label>
              <textarea value={reason} onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                placeholder="Explain why an extension is needed..." rows={3}
                className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"/>
            </div>
          </div>
          <div className="flex justify-end gap-[10px] mt-[20px]">
            <button onClick={onClose} className="h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">Cancel</button>
            <button onClick={async () => { if (!reason.trim()) return; setBusy(true); await onSubmit(deadline.application_id, days, reason); setReason(''); setBusy(false); }}
              disabled={busy || !reason.trim()}
              className="h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-60"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              {busy ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Urgent Card ─────────────────────────────────────────────────────────────

function UrgentCard({ d, onUpload, onExtension, navigate }: {
  d: HRDeadlineItem;
  onUpload: () => void;
  onExtension: () => void;
  navigate: (to: string) => void;
}) {
  const tok = urgencyToken(d.days_remaining);
  const AV = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
  return (
    <div className="bg-white border rounded-[16px] overflow-hidden shadow-[0px_1px_3px_rgba(0,0,0,0.08)]" style={{ borderColor: tok.border }}>
      <div className="h-[4px]" style={{ backgroundColor: tok.bar }}/>
      <div className="p-[24px] flex items-start gap-[24px]">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[8px] mb-[10px] flex-wrap">
            <span className="px-[10px] py-[3px] rounded-full text-[11px] font-bold uppercase tracking-[0.05em]"
                  style={{ backgroundColor: tok.badge, color: tok.badgeText }}>{tok.label}</span>
            <span className="px-[10px] py-[3px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">{d.visa_type}</span>
            <span className="text-[12px] text-[#94a3b8]">Case #{d.case_number}</span>
          </div>
          <h3 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px] mb-[8px]">{d.title}</h3>
          <p className="text-[14px] text-[#64748b] mb-[14px] leading-relaxed">{d.description}</p>
          <div className="flex items-center flex-wrap gap-[16px] mb-[16px]">
            <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><User size={13} className="text-[#94a3b8]"/>{d.employee_name}</span>
            <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><Building2 size={13} className="text-[#94a3b8]"/>{d.employer_name}</span>
            {d.attorney_name && <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><Scale size={13} className="text-[#94a3b8]"/>{d.attorney_name}</span>}
          </div>
          <div className="flex items-center justify-between gap-[12px] flex-wrap">
            <div className="flex items-center gap-[8px]">
              {Array.from({ length: Math.min(d.assigned_count, 3) }).map((_, i) => (
                <div key={i} className="size-[30px] rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white -ml-[6px] first:ml-0"
                     style={{ backgroundColor: AV[i % AV.length] }}>{String.fromCharCode(65 + i)}</div>
              ))}
              {d.assigned_count > 0 && <span className="text-[12px] text-[#64748b] ml-[4px]">{d.assigned_count} assigned</span>}
            </div>
            <div className="flex items-center gap-[8px]">
              <button onClick={() => navigate(`/employer/cases/${d.application_id}`)}
                className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">View Case</button>
              <button onClick={onUpload}
                className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] flex items-center gap-[6px]">
                <Upload size={13}/> Upload Response
              </button>
              <button onClick={onExtension}
                className="h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold flex items-center gap-[6px]"
                style={{ backgroundImage: PRIMARY_GRADIENT }}>
                <RefreshCw size={13}/> Request Extension
              </button>
            </div>
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-center w-[100px]">
          <div className="w-full rounded-[12px] p-[16px] text-center mb-[8px]" style={{ backgroundColor: tok.badge }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] mb-[4px]" style={{ color: tok.badgeText }}>
              {d.days_remaining < 0 ? 'OVERDUE' : 'DUE IN'}
            </p>
            <p className="text-[36px] font-black leading-none" style={{ color: tok.badgeText }}>{Math.abs(d.days_remaining)}</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] mt-[2px]" style={{ color: tok.badgeText }}>
              {Math.abs(d.days_remaining) === 1 ? 'DAY' : 'DAYS'}
            </p>
          </div>
          <p className="text-[11px] text-[#94a3b8]">Due Date</p>
          <p className="text-[12px] font-semibold text-[#374151] text-center">{fmtDate(d.due_date)}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Upcoming Card ────────────────────────────────────────────────────────────

function UpcomingCard({ d, onViewDetails }: { d: HRDeadlineItem; onViewDetails: () => void }) {
  const tok = urgencyToken(d.days_remaining);
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex flex-col">
      <div className="p-[20px] flex-1">
        <div className="flex items-center gap-[6px] mb-[10px] flex-wrap">
          <span className="px-[8px] py-[2px] rounded-full text-[11px] font-bold uppercase tracking-[0.04em]"
                style={{ backgroundColor: tok.badge, color: tok.badgeText }}>{tok.label}</span>
          <span className="px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">{d.visa_type}</span>
          <span className="text-[11px] text-[#94a3b8]">#{d.case_number}</span>
        </div>
        <div className="flex items-center gap-[10px] mb-[8px]">
          <div className="text-[32px] font-black leading-none" style={{ color: tok.text }}>{d.days_remaining}</div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em]" style={{ color: tok.text }}>days</p>
            <p className="text-[11px] text-[#94a3b8]">remaining</p>
          </div>
        </div>
        <h3 className="text-[15px] font-bold text-[#0f172a] mb-[6px]">{d.title}</h3>
        <p className="text-[12px] text-[#64748b] mb-[12px] line-clamp-2">{d.description}</p>
        <div className="flex flex-col gap-[4px]">
          <span className="flex items-center gap-[5px] text-[12px] text-[#475569]"><User size={11} className="text-[#94a3b8]"/>{d.employee_name}</span>
          {d.employer_name && <span className="flex items-center gap-[5px] text-[12px] text-[#475569]"><Building2 size={11} className="text-[#94a3b8]"/>{d.employer_name}</span>}
        </div>
      </div>
      <div className="px-[20px] pb-[16px] flex items-center justify-between border-t border-[#f8fafc] pt-[12px]">
        <span className="text-[12px] text-[#94a3b8]">Due: {fmtDate(d.due_date)}</span>
        <button onClick={onViewDetails} className="h-[34px] px-[12px] rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#334155] hover:bg-[#f8fafc]">View Details</button>
      </div>
    </div>
  );
}

// ─── Extension Card ──────────────────────────────────────────────────────────

function ExtensionCard({ ext, onApprove, onDeny }: {
  ext: HRExtensionRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const statusMap = {
    pending:  { bg: '#fff7ed', text: '#c2410c', label: 'PENDING APPROVAL' },
    approved: { bg: '#dcfce7', text: '#15803d', label: 'APPROVED' },
    denied:   { bg: '#fee2e2', text: '#dc2626', label: 'DENIED' },
  };
  const s = statusMap[ext.status] ?? statusMap.pending;
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] p-[24px] flex items-start gap-[24px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[12px] flex-wrap">
          <span className="px-[10px] py-[3px] rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold uppercase tracking-[0.05em]">EXTENSION REQUEST</span>
          <span className="px-[10px] py-[3px] rounded-full text-[11px] font-bold uppercase tracking-[0.05em]"
                style={{ backgroundColor: s.bg, color: s.text }}>{s.label}</span>
          <span className="text-[12px] text-[#94a3b8]">{ext.request_number}</span>
        </div>
        <h3 className="text-[18px] font-bold text-[#0f172a] mb-[6px]">{ext.title}</h3>
        <p className="text-[13px] text-[#64748b] mb-[16px]">{ext.description}</p>
        <div className="grid grid-cols-2 gap-[12px] mb-[14px]">
          {[
            { label: 'Related Case',         value: `Case #${ext.case_number}` },
            { label: 'Original Deadline',     value: fmtDate(ext.original_deadline) },
            { label: 'Requested Extension',   value: `+${ext.extension_days} Days` },
            { label: 'New Proposed Deadline', value: fmtDate(ext.proposed_deadline) },
          ].map(item => (
            <div key={item.label}>
              <p className="text-[12px] text-[#94a3b8] mb-[2px]">{item.label}</p>
              <p className="text-[14px] font-semibold text-[#111827]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-[16px] text-[12px] text-[#64748b]">
          <span className="flex items-center gap-[4px]"><User size={11}/>
            {ext.status === 'approved' ? `Approved by: ${ext.reviewed_by ?? '—'}` : `Requested by: ${ext.requested_by}`}
          </span>
          <span className="flex items-center gap-[4px]"><Clock size={11}/>
            {ext.status === 'approved' ? `Approved: ${fmtDate(ext.reviewed_at)}` : `Submitted: ${fmtDate(ext.submitted_at)}`}
          </span>
        </div>
      </div>
      <div className="shrink-0 w-[120px] flex flex-col items-center gap-[10px]">
        {ext.status === 'pending' && (
          <>
            <div className="w-full bg-[#fff7ed] rounded-[12px] p-[12px] text-center">
              <p className="text-[11px] font-semibold uppercase text-[#c2410c] mb-[2px]">PENDING</p>
              <p className="text-[28px] font-black text-[#c2410c] leading-none">{ext.days_until_original}</p>
              <p className="text-[10px] font-semibold uppercase text-[#c2410c]">{ext.days_until_original === 1 ? 'DAY' : 'DAYS'}</p>
            </div>
            <button onClick={onApprove}
              className="w-full h-[36px] rounded-[8px] text-[13px] font-semibold text-white flex items-center justify-center gap-[5px]"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              <Check size={13}/> Approve
            </button>
            <button onClick={onDeny}
              className="w-full h-[36px] rounded-[8px] text-[13px] font-medium text-[#dc2626] border border-[#fecaca] hover:bg-[#fef2f2] flex items-center justify-center gap-[5px]">
              <X size={13}/> Deny
            </button>
          </>
        )}
        {ext.status === 'approved' && (
          <div className="w-full bg-[#dcfce7] rounded-[12px] p-[12px] text-center">
            <CheckCircle2 size={24} className="text-[#15803d] mx-auto mb-[4px]"/>
            <p className="text-[11px] font-bold uppercase text-[#15803d]">APPROVED</p>
          </div>
        )}
        {ext.status === 'denied' && (
          <div className="w-full bg-[#fee2e2] rounded-[12px] p-[12px] text-center">
            <XCircle size={24} className="text-[#dc2626] mx-auto mb-[4px]"/>
            <p className="text-[11px] font-bold uppercase text-[#dc2626]">DENIED</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Deadline Calendar ───────────────────────────────────────────────────────

function DeadlineCalendar({ deadlines }: { deadlines: HRDeadlineItem[] }) {
  const [current, setCurrent] = useState(new Date());
  const year  = current.getFullYear();
  const month = current.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();
  const today     = new Date();
  const dayMap: Record<number, string> = {};
  deadlines.forEach(d => {
    const dt = new Date(d.due_date);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      dayMap[day] = d.days_remaining <= 7 ? 'urgent' : d.days_remaining <= 30 ? 'warning' : 'normal';
    }
  });
  const dotColor: Record<string, string> = { urgent: '#ef4444', warning: '#f59e0b', normal: '#22c55e' };
  const DAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const cells = Array.from({ length: 42 }).map((_, i) => {
    const dayNum = i - firstDay + 1;
    return dayNum >= 1 && dayNum <= daysCount ? dayNum : null;
  });
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="px-[24px] py-[18px] border-b border-[#f8fafc] flex items-center justify-between">
        <div className="flex items-center gap-[10px]">
          <div className="size-[36px] rounded-[10px] bg-indigo-50 flex items-center justify-center">
            <Calendar size={16} className="text-indigo-600"/>
          </div>
          <div>
            <h2 className="text-[16px] font-bold text-[#0f172a]">Deadline Calendar</h2>
            <p className="text-[12px] text-[#64748b]">Visual timeline of upcoming deadlines</p>
          </div>
        </div>
        <div className="flex items-center gap-[8px]">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="size-[32px] rounded-[8px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]">
            <ChevronLeft size={14}/>
          </button>
          <span className="text-[14px] font-semibold text-[#374151] min-w-[130px] text-center">
            {current.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="size-[32px] rounded-[8px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]">
            <ChevronRight size={14}/>
          </button>
        </div>
      </div>
      <div className="p-[20px]">
        <div className="grid grid-cols-7 mb-[8px]">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] py-[6px]">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[2px]">
          {cells.map((day, i) => {
            if (!day) return <div key={i}/>;
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const urgency = dayMap[day];
            return (
              <div key={i} className={`relative min-h-[52px] rounded-[8px] p-[6px] cursor-pointer transition ${isToday ? 'bg-indigo-600 text-white' : urgency ? 'bg-[#f8fafc] hover:bg-[#f1f5f9]' : 'hover:bg-[#f8fafc]'}`}>
                <p className={`text-[13px] font-semibold ${isToday ? 'text-white' : 'text-[#374151]'}`}>{day}</p>
                {urgency && !isToday && (
                  <div className="absolute bottom-[6px] left-[6px] size-[7px] rounded-full" style={{ backgroundColor: dotColor[urgency] }}/>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-[16px] mt-[14px] justify-center flex-wrap">
          {[{ color: '#ef4444', label: 'Urgent (≤7 days)' },{ color: '#f59e0b', label: 'Warning (8–30 days)' },{ color: '#22c55e', label: 'Normal (31+ days)' },{ color: '#4f46e5', label: 'Today' }].map(l => (
            <span key={l.label} className="flex items-center gap-[5px] text-[11px] text-[#64748b]">
              <span className="size-[8px] rounded-full shrink-0" style={{ backgroundColor: l.color }}/>{l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Insights ────────────────────────────────────────────────────────────────

import type { HRDeadlineInsights } from '../../types/hr/deadlines.types';

function InsightsSection({ insights }: { insights: HRDeadlineInsights }) {
  return (
    <div>
      <div className="flex items-center gap-[10px] mb-[16px]">
        <div className="size-[36px] rounded-[10px] bg-indigo-50 flex items-center justify-center">
          <TrendingUp size={16} className="text-indigo-600"/>
        </div>
        <div>
          <h2 className="text-[18px] font-bold text-[#0f172a]">Deadline Insights & Analytics</h2>
          <p className="text-[13px] text-[#64748b]">Track performance and identify trends</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
        <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[24px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className="text-[14px] font-bold text-[#0f172a]">On-Time Completion Rate</h3>
            <TrendingUp size={18} className="text-[#16a34a]"/>
          </div>
          <p className="text-[40px] font-black text-indigo-600 tracking-[-1px] mb-[4px]">{insights.completion_rate.toFixed(1)}%</p>
          <p className="text-[12px] text-[#94a3b8] mb-[14px]">Last 90 days</p>
          <div className="flex flex-col gap-[6px]">
            {[{ label: 'Completed on time', value: `${insights.completed_on_time} cases`, color: '#15803d' },{ label: 'Late completions', value: `${insights.late_completions} cases`, color: '#dc2626' },{ label: 'With extensions', value: `${insights.with_extensions} cases`, color: '#c2410c' }].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748b]">{r.label}</span>
                <span className="text-[12px] font-semibold" style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[24px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className="text-[14px] font-bold text-[#0f172a]">Average Response Time</h3>
            <Clock size={18} className="text-[#2563eb]"/>
          </div>
          <div className="flex items-baseline gap-[4px] mb-[4px]">
            <p className="text-[40px] font-black text-indigo-600 tracking-[-1px]">{insights.avg_response_days.toFixed(1)}</p>
            <p className="text-[16px] font-semibold text-[#64748b]">days</p>
          </div>
          <p className="text-[12px] text-[#94a3b8] mb-[14px]">Before deadline</p>
          <div className="flex flex-col gap-[6px]">
            {[{ label: 'Fastest response', value: `${insights.fastest_hours} hours` },{ label: 'Slowest response', value: `${insights.slowest_days} days` },{ label: 'Trend', value: '↗ Improving', color: '#15803d' }].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748b]">{r.label}</span>
                <span className="text-[12px] font-semibold" style={{ color: (r as any).color ?? '#374151' }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[24px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className="text-[14px] font-bold text-[#0f172a]">Risk Assessment</h3>
            <AlertTriangle size={18} className="text-[#f59e0b]"/>
          </div>
          <p className="text-[40px] font-black tracking-[-1px] mb-[4px]"
             style={{ color: insights.high_risk > 5 ? '#dc2626' : insights.high_risk > 2 ? '#f59e0b' : '#15803d' }}>
            {insights.high_risk > 5 ? 'High' : insights.high_risk > 2 ? 'Medium' : 'Low'}
          </p>
          <p className="text-[12px] text-[#94a3b8] mb-[14px]">Overall deadline risk</p>
          <div className="flex flex-col gap-[6px]">
            {[{ label: 'High risk cases', value: `${insights.high_risk} cases`, color: '#dc2626' },{ label: 'Medium risk cases', value: `${insights.medium_risk} cases`, color: '#c2410c' },{ label: 'Low risk cases', value: `${insights.low_risk} cases`, color: '#15803d' }].map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <span className="text-[12px] text-[#64748b]">{r.label}</span>
                <span className="text-[12px] font-semibold" style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HRDeadlines() {
  const navigate = useNavigate();
  const [toasts,     setToasts]    = useState<Toast[]>([]);
  const [extModal,   setExtModal]  = useState<{ open: boolean; deadline: HRDeadlineItem | null }>({ open: false, deadline: null });

  const {
    deadlines, extensions, stats, insights, isLoading, error,
    urgentItems, upcomingItems,
    load, requestExtension, approveExtension, denyExtension,
    search, setSearch, urgencyFilter, setUrgency, typeFilter, setType,
  } = useHRDeadlines();

  useEffect(() => { void load(); }, [load]);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(p => [...p, { id, tone, title, message }]);
    setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3200);
  }, []);

  const handleExtensionSubmit = async (applicationId: string, days: number, reason: string) => {
    try {
      await requestExtension(applicationId, { extension_days: days, reason });
      pushToast('success', 'Extension requested', 'Your request has been submitted for review.');
      setExtModal({ open: false, deadline: null });
    } catch { pushToast('error', 'Request failed', 'Please try again.'); }
  };

  const handleApproveExt = async (extId: string) => {
    try {
      await approveExtension(extId);
      pushToast('success', 'Extension approved');
    } catch { pushToast('error', 'Action failed'); }
  };

  const handleDenyExt = async (extId: string) => {
    try {
      await denyExtension(extId);
      pushToast('warning', 'Extension denied');
    } catch { pushToast('error', 'Action failed'); }
  };

  const statCards = [
    { label: 'Urgent',     sub: 'Due in 7 Days or Less',        value: stats.urgent,     icon: <AlertTriangle size={20}/>, bg: '#fef2f2', color: '#dc2626', badge: 'URGENT' },
    { label: 'Warning',    sub: 'Due in 8-30 Days',             value: stats.warning,    icon: <Clock size={20}/>,         bg: '#fff7ed', color: '#c2410c', badge: 'WARNING' },
    { label: 'On Track',   sub: 'Due in 31+ Days',              value: stats.on_track,   icon: <CheckCircle2 size={20}/>,  bg: '#f0fdf4', color: '#15803d', badge: 'ON TRACK' },
    { label: 'Extensions', sub: 'Extension Requests Pending',   value: stats.extensions, icon: <RefreshCw size={20}/>,    bg: '#eef2ff', color: '#4f46e5', badge: 'ACTIVE' },
  ];

  const headerActions = (
    <>
      <button onClick={() => navigate('/employer/notifications')}
        className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
        <Bell size={16}/>
        <span className="absolute top-[9px] right-[9px] size-[6px] rounded-full bg-[#ef4444] border border-white"/>
      </button>
      <button onClick={() => pushToast('info', 'Export coming soon')}
        className="flex items-center gap-[6px] h-[40px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
        <Download size={14}/> Export Report
      </button>
      <button onClick={() => pushToast('info', 'Select a case first', 'Open a case to request an extension.')}
        className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold"
        style={{ backgroundImage: PRIMARY_GRADIENT }}>
        <Plus size={14}/> Request Extension
      </button>
    </>
  );

  if (isLoading) return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <PageHeader title="Deadlines & Extensions" subtitle="Track important deadlines and manage extension requests."
        showSearch={false} showBell={false} actions={headerActions}/>
      <PageContent>
        <div className="flex flex-col gap-[20px]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
            {[0,1,2,3].map(i => <div key={i} className="h-[140px] bg-white rounded-[16px] border border-[#f1f5f9] animate-pulse"/>)}
          </div>
          {[0,1,2].map(i => <div key={i} className="h-[200px] bg-white rounded-[16px] border border-[#f1f5f9] animate-pulse"/>)}
        </div>
      </PageContent>
    </div>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))}/>
      <PageHeader title="Deadlines & Extensions"
        subtitle="Track important deadlines and manage extension requests for all your cases."
        showSearch={false} showBell={false} actions={headerActions}/>
      <PageContent>
        <div className="flex flex-col gap-[28px]">

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
            {statCards.map(s => (
              <div key={s.label} className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between mb-[12px]">
                  <div className="size-[44px] rounded-[12px] flex items-center justify-center" style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                  <span className="px-[8px] py-[3px] rounded-full text-[10px] font-bold uppercase tracking-[0.05em]" style={{ backgroundColor: s.bg, color: s.color }}>{s.badge}</span>
                </div>
                <p className="text-[32px] font-black text-[#0f172a] tracking-[-1px] leading-none mb-[4px]">{s.value}</p>
                <p className="text-[13px] font-semibold text-[#334151]">{s.label}</p>
                <p className="text-[11px] text-[#94a3b8]">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[14px] flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
            <div className="relative w-full sm:w-[280px]">
              <Search size={14} className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deadlines..."
                className="w-full h-[42px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[32px] pr-[10px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition"/>
            </div>
            {[
              { value: urgencyFilter, onChange: setUrgency, options: [{ v:'all', l:'All Urgency Levels' },{ v:'urgent', l:'Urgent (≤7 days)' },{ v:'warning', l:'Warning (8–30 days)' },{ v:'on_track', l:'On Track (31+ days)' }] },
              { value: typeFilter,    onChange: setType,    options: [{ v:'all', l:'All Deadline Types' },{ v:'lca_response', l:'LCA Response' },{ v:'rfe_response', l:'RFE Response' },{ v:'document_submission', l:'Document Submission' },{ v:'payment', l:'Payment' }] },
            ].map((sel, i) => (
              <div key={i} className="relative">
                <select value={sel.value} onChange={e => sel.onChange(e.target.value)}
                  className="appearance-none h-[42px] min-w-[180px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[10px] pr-[28px] text-[13px] text-[#374151] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-200 transition">
                  {sel.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-[8px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none"/>
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-[#fef2f2] border border-[#fecaca] rounded-[12px] p-[14px] text-[13px] text-[#dc2626]">
              {error} — showing cached data
            </div>
          )}

          {/* Urgent */}
          {urgentItems.length > 0 && (
            <div>
              <div className="flex items-center gap-[10px] mb-[16px]">
                <div className="size-[36px] rounded-[10px] bg-[#fef2f2] flex items-center justify-center"><AlertTriangle size={16} className="text-[#dc2626]"/></div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#0f172a]">Urgent Deadlines</h2>
                  <p className="text-[13px] text-[#64748b]">Due within 7 days — Immediate action required</p>
                </div>
                <span className="ml-auto px-[12px] py-[5px] rounded-full bg-[#fef2f2] text-[#dc2626] text-[13px] font-semibold">{urgentItems.length} Items</span>
              </div>
              <div className="flex flex-col gap-[12px]">
                {urgentItems.map(d => (
                  <UrgentCard key={d.id} d={d}
                    onUpload={() => navigate(`/employer/cases/${d.application_id}`)}
                    onExtension={() => setExtModal({ open: true, deadline: d })}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {upcomingItems.length > 0 && (
            <div>
              <div className="flex items-center gap-[10px] mb-[16px]">
                <div className="size-[36px] rounded-[10px] bg-[#fff7ed] flex items-center justify-center"><Clock size={16} className="text-[#c2410c]"/></div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#0f172a]">Upcoming Deadlines</h2>
                  <p className="text-[13px] text-[#64748b]">Due within 8–30 days — Plan ahead</p>
                </div>
                <span className="ml-auto px-[12px] py-[5px] rounded-full bg-[#fff7ed] text-[#c2410c] text-[13px] font-semibold">{upcomingItems.length} Items</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                {upcomingItems.map(d => (
                  <UpcomingCard key={d.id} d={d} onViewDetails={() => navigate(`/employer/cases/${d.application_id}`)}/>
                ))}
              </div>
            </div>
          )}

          {/* Extensions */}
          {extensions.length > 0 && (
            <div>
              <div className="flex items-center gap-[10px] mb-[16px]">
                <div className="size-[36px] rounded-[10px] bg-indigo-50 flex items-center justify-center"><RefreshCw size={16} className="text-indigo-600"/></div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#0f172a]">Active Extension Requests</h2>
                  <p className="text-[13px] text-[#64748b]">Pending deadline extension requests</p>
                </div>
                <span className="ml-auto px-[12px] py-[5px] rounded-full bg-indigo-50 text-indigo-700 text-[13px] font-semibold">
                  {extensions.filter(e => e.status === 'pending').length} Pending
                </span>
              </div>
              <div className="flex flex-col gap-[12px]">
                {extensions.map(ext => (
                  <ExtensionCard key={ext.id} ext={ext}
                    onApprove={() => void handleApproveExt(ext.id)}
                    onDeny={() => void handleDenyExt(ext.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Calendar */}
          <DeadlineCalendar deadlines={deadlines}/>

          {/* Insights */}
          <InsightsSection insights={insights}/>

          {/* Empty */}
          {deadlines.length === 0 && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-[60px] text-center bg-white border border-[#f1f5f9] rounded-[16px]">
              <div className="size-[52px] rounded-full bg-[#f0fdf4] flex items-center justify-center mb-[12px]">
                <CheckCircle2 size={22} className="text-[#15803d]"/>
              </div>
              <p className="text-[16px] font-semibold text-[#0f172a] mb-[4px]">No upcoming deadlines!</p>
              <p className="text-[13px] text-[#64748b]">All your cases are on track. Great work!</p>
            </div>
          )}

        </div>
      </PageContent>

      <RequestExtensionModal
        open={extModal.open} deadline={extModal.deadline}
        onClose={() => setExtModal({ open: false, deadline: null })}
        onSubmit={handleExtensionSubmit}
      />
    </div>
  );
}