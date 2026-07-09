// src/pages/hr/HREmployeeDetail.tsx
//
// HR — Employee Profile Detail (Screen 21)
// Route: /employer/employees/:employeeLinkId
// Reached by clicking the Eye icon on the HREmployees roster.
//
// Layout (matches Figma screenshot):
//   ┌─ Breadcrumb header ─────────────────────────────────────────────────┐
//   │ Vyuflo > Employee Roster > David Chen          [Search] [🔔] [👤] │
//   ├─ Profile hero card ──────────────────────────────────────────────────┤
//   │ [Avatar] Name  Title · ID          [Edit] [+Add Case] [⋯]           │
//   │          ● Visa badge  🏢 Company  📍 Location                      │
//   ├─ Tabs: Overview | Cases 3 | Documents 12 | Timeline | Notes ─────────┤
//   ├─ LEFT (7/12): Active Case card + Employee Info ──────────────────────┤
//   │  Right (5/12): Stats cards + Documents panel + Recent Activity       │
//   └──────────────────────────────────────────────────────────────────────┘

import { useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    // Edit2,Plus
  ChevronRight, MoreHorizontal, MapPin, Building2,
  Briefcase, FileText, Clock, AlertCircle, 
  Upload, ArrowLeft, RefreshCw,
} from 'lucide-react';
import { PageContent } from '../../components/layout/Pageheader';
import { useEmployeeDetail } from '../../hooks/hr/useEmployeeDetail';
import type {
  ApplicationSummary, ApplicationStatus, DocumentStatus, DocumentSummary,
} from '../../types/hr/employeeDetail.types';
import { getFileUrl } from '../../utils/fileUrl';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// FORMATTERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelativeTime(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7)  return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return fmtDate(iso);
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
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────

function appStatusToken(s: ApplicationStatus): { bg: string; text: string; label: string } {
  switch (s) {
    case 'approved':      return { bg: '#dcfce7', text: '#15803d', label: 'Approved' };
    case 'in_progress':   return { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' };
    case 'action_needed': return { bg: '#fef9c3', text: '#a16207', label: 'Action Needed' };
    case 'submitted':     return { bg: '#e0e7ff', text: '#4338ca', label: 'Submitted' };
    case 'rfe_response':  return { bg: '#ffedd5', text: '#c2410c', label: 'RFE Received' };
    case 'rejected':      return { bg: '#fee2e2', text: '#dc2626', label: 'Rejected' };
    case 'withdrawn':     return { bg: '#f1f5f9', text: '#475569', label: 'Withdrawn' };
    default:              return { bg: '#f1f5f9', text: '#475569', label: 'Draft' };
  }
}

function docStatusToken(s: DocumentStatus): { bg: string; text: string; label: string } {
  switch (s) {
    case 'verified':       return { bg: '#dcfce7', text: '#15803d', label: 'Verified' };
    case 'pending_review': return { bg: '#fef9c3', text: '#a16207', label: 'Pending Review' };
    case 'missing':        return { bg: '#fee2e2', text: '#dc2626', label: 'Missing' };
    case 'rejected':       return { bg: '#fef2f2', text: '#dc2626', label: 'Rejected' };
    default:               return { bg: '#eff6ff', text: '#1d4ed8', label: 'Uploaded' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function InfoPill({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-[5px] px-[10px] py-[4px] rounded-full bg-[#f8fafc] border border-[#e2e8f0] text-[12px] text-[#475569] tracking-[-0.3px]">
      {icon}
      {label}
    </span>
  );
}

function VisaPill({ code, label }: { code: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-[6px] px-[10px] py-[4px] rounded-full bg-[#eef2ff] border border-[#c7d2fe] text-[12px] font-medium text-[#4f46e5]">
      <span className="size-[6px] rounded-full bg-[#4f46e5] shrink-0" />
      {code} {label}
    </span>
  );
}

function TabButton({ active, label, count, onClick }: {
  active: boolean; label: string; count?: number; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-[6px] px-[4px] pb-[10px] text-[14px] font-medium tracking-[-0.3px] border-b-[2px] transition ${
        active
          ? 'border-indigo-600 text-indigo-600'
          : 'border-transparent text-[#64748b] hover:text-[#334155]'
      }`}>
      {label}
      {count != null && (
        <span className={`px-[7px] py-[1px] rounded-full text-[11px] font-semibold ${
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-[#f1f5f9] text-[#64748b]'
        }`}>{count}</span>
      )}
    </button>
  );
}

function StatMiniCard({ label, value, sub, urgent }: {
  label: string; value: string | number; sub?: string; urgent?: boolean;
}) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[16px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748b] mb-[4px]">{label}</p>
      <p className={`text-[22px] font-bold tracking-[-0.5px] leading-none ${urgent ? 'text-[#ea580c]' : 'text-[#0f172a]'}`}>
        {value}
      </p>
      {sub && <p className={`text-[11px] mt-[3px] ${urgent ? 'text-[#ea580c]' : 'text-[#64748b]'}`}>{sub}</p>}
    </div>
  );
}

function SectionHead({ title, action, onAction }: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-[14px]">
      <p className="text-[14px] font-semibold text-[#0f172a] tracking-[-0.3px]">{title}</p>
      {action && onAction && (
        <button onClick={onAction} className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700">
          {action}
        </button>
      )}
    </div>
  );
}

function DocIcon({ format }: { format: string | null }) {
  const color = format === 'pdf' ? '#ef4444'
              : format === 'docx' ? '#2563eb'
              : '#6366f1';
  return (
    <div className="size-[34px] rounded-[8px] flex items-center justify-center shrink-0"
         style={{ backgroundColor: `${color}18` }}>
      <FileText size={15} style={{ color }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON LOADER
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonBlock({ h = 20, w = '100%', rounded = 8 }: { h?: number; w?: string | number; rounded?: number }) {
  return (
    <div className="bg-[#f1f5f9] animate-pulse"
         style={{ height: h, width: w, borderRadius: rounded }} />
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-[24px] p-[24px]">
      <div className="bg-white border border-[#f1f5f9] rounded-[18px] p-[24px] flex flex-col gap-[16px]">
        <div className="flex items-center gap-[16px]">
          <SkeletonBlock h={72} w={72} rounded={36} />
          <div className="flex flex-col gap-[8px] flex-1">
            <SkeletonBlock h={22} w="40%" />
            <SkeletonBlock h={14} w="60%" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {[0,1,2,3].map(i => <SkeletonBlock key={i} h={80} rounded={14} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE CASE CARD
// ─────────────────────────────────────────────────────────────────────────────

function ActiveCaseCard({ app, onOpenFull }: {
  app: ApplicationSummary;
  onOpenFull: () => void;
}) {
  const tok = appStatusToken(app.status);
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between mb-[14px]">
        <div>
          <div className="flex items-center gap-[8px] mb-[4px]">
            <div className="size-[32px] rounded-[8px] bg-indigo-50 flex items-center justify-center">
              <Briefcase size={15} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#0f172a] tracking-[-0.3px]">{app.visa_type_name}</p>
              <p className="text-[11px] text-[#94a3b8]">Case #{app.application_number}</p>
            </div>
          </div>
        </div>
        <span className="px-[10px] py-[4px] rounded-full text-[11px] font-semibold uppercase tracking-[0.04em]"
              style={{ backgroundColor: tok.bg, color: tok.text }}>
          {tok.label}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-[16px]">
        <div className="flex items-center justify-between mb-[6px]">
          <p className="text-[12px] text-[#64748b]">Overall Progress</p>
          <p className="text-[13px] font-semibold text-[#0f172a]">{app.progress_percent}%</p>
        </div>
        <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
               style={{ width: `${app.progress_percent}%`, backgroundImage: PRIMARY_GRADIENT }} />
        </div>
      </div>

      {/* Next milestone + Attorney */}
      <div className="grid grid-cols-2 gap-[12px] mb-[16px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[3px]">Next Milestone</p>
          <p className="text-[13px] font-medium text-[#0f172a]">{app.next_milestone || '—'}</p>
          {app.due_date && (
            <p className="text-[11px] text-[#ea580c] flex items-center gap-[3px] mt-[2px]">
              <AlertCircle size={10} /> Due {fmtDate(app.due_date)}
            </p>
          )}
        </div>
        {app.assigned_attorney_name && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[3px]">Assigned Attorney</p>
            <div className="flex items-center gap-[6px]">
              {app.assigned_attorney_avatar ? (
                <img src={getFileUrl(app.assigned_attorney_avatar) ?? undefined} alt=""
                     className="size-[22px] rounded-full object-cover border border-[#e5e7eb]" />
              ) : (
                <div className="size-[22px] rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-600">
                  {initials(app.assigned_attorney_name)}
                </div>
              )}
              <p className="text-[13px] font-medium text-[#0f172a]">{app.assigned_attorney_name}</p>
            </div>
          </div>
        )}
      </div>

      <button onClick={onOpenFull}
        className="w-full h-[38px] rounded-[10px] border border-[#e2e8f0] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc] flex items-center justify-center gap-[6px] transition">
        View Full Case Details
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CASES LIST (tab content)
// ─────────────────────────────────────────────────────────────────────────────

function CasesTab({ cases, onOpenCase }: {
  cases: ApplicationSummary[];
  onOpenCase: (id: string) => void;
}) {
  if (!cases.length) return (
    <div className="py-[40px] text-center text-[#64748b] text-[14px]">No cases found.</div>
  );
  return (
    <div className="flex flex-col gap-[10px]">
      {cases.map(app => {
        const tok = appStatusToken(app.status);
        return (
          <div key={app.id}
               className="bg-white border border-[#f1f5f9] rounded-[14px] p-[16px] flex items-center justify-between gap-[12px] hover:bg-[#fafbfc] transition cursor-pointer"
               onClick={() => onOpenCase(app.id)}>
            <div className="flex items-center gap-[12px] min-w-0">
              <div className="size-[36px] rounded-[8px] bg-indigo-50 flex items-center justify-center shrink-0">
                <Briefcase size={14} className="text-indigo-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#0f172a] truncate">{app.visa_type_name}</p>
                <p className="text-[11px] text-[#94a3b8]">#{app.application_number}</p>
              </div>
            </div>
            <div className="flex items-center gap-[12px] shrink-0">
              {app.start_date && <p className="text-[12px] text-[#64748b]">{fmtDate(app.start_date)}</p>}
              <span className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                {tok.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsTab({ documents }: { documents: DocumentSummary[] }) {
  if (!documents.length) return (
    <div className="py-[40px] text-center text-[#64748b] text-[14px]">No documents uploaded yet.</div>
  );
  return (
    <div className="flex flex-col gap-[8px]">
      {documents.map(doc => {
        const tok = docStatusToken(doc.status);
        return (
          <div key={doc.id}
               className="flex items-center gap-[12px] px-[4px] py-[10px] border-b border-[#f1f5f9] last:border-b-0 hover:bg-[#fafbfc] rounded-[8px] transition">
            <DocIcon format={doc.file_format} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#0f172a] truncate">{doc.name}</p>
              <p className="text-[11px] text-[#94a3b8]">Updated {fmtRelativeTime(doc.updated_at)}</p>
            </div>
            <span className="px-[10px] py-[3px] rounded-full text-[11px] font-semibold shrink-0"
                  style={{ backgroundColor: tok.bg, color: tok.text }}>
              {tok.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE INFO CARD (bottom-left, Overview tab)
// ─────────────────────────────────────────────────────────────────────────────

function EmployeeInfoCard({ profile }: {
  profile: {
    work_email: string | null;
    job_title: string | null;
    department: string | null;
    start_date: string | null;
  }
}) {
  const fields = [
    { icon: <span className="text-[14px]">📧</span>, label: 'Email Address',  value: profile.work_email },
    { icon: <span className="text-[14px]">📅</span>, label: 'Start Date',     value: fmtDate(profile.start_date) },
    { icon: <span className="text-[14px]">💼</span>, label: 'Job Title',      value: profile.job_title },
    { icon: <Building2 size={14} className="text-[#64748b]" />, label: 'Department', value: profile.department },
  ];
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-[8px] mb-[16px]">
        <div className="size-[28px] rounded-[8px] bg-[#f1f5f9] flex items-center justify-center">
          <Building2 size={14} className="text-[#64748b]" />
        </div>
        <p className="text-[14px] font-semibold text-[#0f172a] tracking-[-0.3px]">Employee Information</p>
      </div>
      <div className="grid grid-cols-2 gap-x-[24px] gap-y-[14px]">
        {fields.map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[3px]">{f.label}</p>
            <div className="flex items-center gap-[5px]">
              {f.icon}
              <p className="text-[13px] text-[#1f2937] truncate">{f.value || '—'}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTS PANEL (right column, Overview tab)
// ─────────────────────────────────────────────────────────────────────────────

function DocumentsPanel({ documents, total, onViewAll, onUpload }: {
  documents: DocumentSummary[];
  total: number;
  onViewAll: () => void;
  onUpload: () => void;
}) {
  const preview = documents.slice(0, 4);
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
      <div className="px-[18px] pt-[16px] pb-[12px] flex items-center justify-between border-b border-[#f8fafc]">
        <div className="flex items-center gap-[6px]">
          <FileText size={14} className="text-[#64748b]" />
          <p className="text-[14px] font-semibold text-[#0f172a]">Documents</p>
          <span className="px-[7px] py-[1px] rounded-full bg-[#f1f5f9] text-[11px] font-medium text-[#64748b]">{total}</span>
        </div>
        <button onClick={onViewAll} className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700">View All</button>
      </div>
      <div className="px-[18px] py-[10px] flex flex-col gap-[2px]">
        {preview.map(doc => {
          const tok = docStatusToken(doc.status);
          return (
            <div key={doc.id} className="flex items-center gap-[10px] py-[8px] border-b border-[#f8fafc] last:border-b-0">
              <DocIcon format={doc.file_format} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[#0f172a] truncate">{doc.name}</p>
                <p className="text-[10px] text-[#94a3b8]">Updated {fmtRelativeTime(doc.updated_at)}</p>
              </div>
              <span className="px-[8px] py-[2px] rounded-full text-[10px] font-semibold shrink-0"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                {tok.label.toUpperCase()}
              </span>
            </div>
          );
        })}
      </div>
      <div className="px-[18px] pb-[16px]">
        <button onClick={onUpload}
          className="w-full h-[36px] rounded-[10px] border border-[#e2e8f0] text-[12px] font-medium text-[#334155] flex items-center justify-center gap-[6px] hover:bg-[#f8fafc] transition">
          <Upload size={13} /> Upload Document
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECENT ACTIVITY PANEL
// ─────────────────────────────────────────────────────────────────────────────

const DOT_COLORS: Record<string, string> = {
  green:  '#22c55e',
  blue:   '#3b82f6',
  orange: '#f97316',
  gray:   '#94a3b8',
};

function ActivityPanel({ items }: { items: Array<{ id: string; title: string; actor: string; occurred_at: string; dot_color: string }> }) {
  return (
    <div className="bg-[#0f172a] rounded-[16px] p-[18px]">
      <div className="flex items-center gap-[6px] mb-[14px]">
        <Clock size={14} className="text-[#94a3b8]" />
        <p className="text-[13px] font-semibold text-white">Recent Activity</p>
      </div>
      <div className="flex flex-col gap-[0px]">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-start gap-[10px] py-[10px] ${i < items.length - 1 ? 'border-b border-[#1e293b]' : ''}`}>
            <div className="mt-[4px] size-[8px] rounded-full shrink-0"
                 style={{ backgroundColor: DOT_COLORS[item.dot_color] ?? '#94a3b8' }} />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium text-white truncate">{item.title}</p>
              <p className="text-[11px] text-[#64748b] mt-[1px]">
                {fmtDate(item.occurred_at)} · {item.actor}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'cases' | 'documents' | 'timeline' | 'notes';

export default function HREmployeeDetail() {
  const navigate = useNavigate();
  const { employeeLinkId } = useParams<{ employeeLinkId: string }>();
  const { data, isLoading, error, refetch } = useEmployeeDetail(employeeLinkId);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  if (isLoading) return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <PageSkeleton />
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col h-full items-center justify-center gap-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <p className="text-[#ef4444] text-[16px] font-medium">{error ?? 'Employee not found'}</p>
      <button onClick={() => void refetch()} className="text-indigo-600 text-[14px] hover:underline flex items-center gap-[4px]">
        <RefreshCw size={13} /> Try again
      </button>
      <button onClick={() => navigate('/employer/employees')}
        className="text-[#64748b] text-[13px] hover:underline flex items-center gap-[4px]">
        <ArrowLeft size={13} /> Back to Roster
      </button>
    </div>
  );

  const { profile, stats, active_case, all_cases, documents, activity } = data;
  const avatarSrc = getFileUrl(profile.profile_picture_url);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'cases',      label: 'Cases',     count: stats.total_cases },
    { id: 'documents',  label: 'Documents', count: stats.documents_total },
    { id: 'timeline',   label: 'Timeline' },
    { id: 'notes',      label: 'Notes' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* ── Top sticky nav bar ── */}
      <div className="bg-white border-b border-[#f1f5f9] px-[24px] h-[56px] flex items-center justify-between shrink-0 sticky top-0 z-20">
        {/* Left: logo + breadcrumb */}
        <div className="flex items-center gap-[12px]">
          <div className="size-[32px] rounded-[8px] bg-indigo-600 flex items-center justify-center text-white font-bold text-[13px]">V</div>
          <span className="text-[13px] font-semibold text-[#0f172a]">Vyuflo</span>
          <ChevronRight size={14} className="text-[#cbd5e1]" />
          <button onClick={() => navigate('/employer/employees')}
            className="text-[13px] text-[#64748b] hover:text-[#334155]">Employee Roster</button>
          <ChevronRight size={14} className="text-[#cbd5e1]" />
          <span className="text-[13px] text-[#0f172a] font-medium">{profile.full_name}</span>
        </div>
        {/* Right: search + bell + avatar */}
        <div className="flex items-center gap-[10px]">
          <div className="relative hidden sm:block">
            <input placeholder="Search..." className="h-[34px] w-[180px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] pl-[10px] pr-[10px] text-[13px] text-[#334155] focus:outline-none focus:ring-2 focus:ring-indigo-200" />
          </div>
          <button className="size-[34px] rounded-[8px] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
            <span className="text-[18px]">🔔</span>
            <span className="absolute top-[7px] right-[7px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
          </button>
          <div className="size-[34px] rounded-full bg-indigo-100 flex items-center justify-center text-[12px] font-bold text-indigo-700">HR</div>
        </div>
      </div>

      <PageContent>
        <div className="flex flex-col gap-[20px]">

          {/* ── Profile Hero Card ── */}
          <div className="bg-white border border-[#f1f5f9] rounded-[18px] shadow-[0px_1px_3px_rgba(0,0,0,0.06)]">
            <div className="px-[24px] py-[20px] flex flex-col sm:flex-row sm:items-start gap-[16px]">
              {/* Avatar */}
              <div className="shrink-0">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={profile.full_name}
                       className="size-[72px] rounded-full object-cover border-[3px] border-white shadow-md" />
                ) : (
                  <div className="size-[72px] rounded-full flex items-center justify-center text-white text-[22px] font-bold border-[3px] border-white shadow-md"
                       style={{ backgroundColor: avatarColor(profile.full_name) }}>
                    {initials(profile.full_name)}
                  </div>
                )}
              </div>

              {/* Name + meta */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-[12px]">
                  <div>
                    <h1 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">{profile.full_name}</h1>
                    <div className="flex flex-wrap items-center gap-[8px] mt-[3px]">
                      <p className="text-[13px] text-[#64748b]">{profile.job_title || 'No title'}</p>
                      {profile.job_title && <span className="text-[#cbd5e1]">·</span>}
                      <p className="text-[13px] text-[#64748b]">ID: VF-{profile.user_id.slice(0, 6).toUpperCase()}</p>
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div className="flex items-center gap-[8px] shrink-0">
                    {/* <button onClick={() => navigate(`/employer/employees/${employeeLinkId}/edit`)}
                      className="flex items-center gap-[6px] h-[34px] px-[12px] rounded-[8px] border border-[#e2e8f0] text-[12px] font-medium text-[#334155] hover:bg-[#f8fafc] transition">
                      <Edit2 size={13} /> Edit Profile
                    </button> */}
                    {/* <button
                      onClick={() => navigate('/employer/cases/new', {
                        state: { employeeLinkId: profile.employee_link_id, employeeName: profile.full_name }
                      })}
                      className="flex items-center gap-[6px] h-[34px] px-[12px] rounded-[8px] text-white text-[12px] font-semibold hover:opacity-90 transition"
                      style={{ backgroundImage: PRIMARY_GRADIENT }}>
                      <Plus size={13} /> Add Case
                    </button> */}
                    <button className="size-[34px] rounded-[8px] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
                      <MoreHorizontal size={15} />
                    </button>
                  </div>
                </div>

                {/* Info pills row */}
                <div className="flex flex-wrap items-center gap-[8px] mt-[12px]">
                  {profile.visa_code && (
                    <VisaPill code={profile.visa_code} label={profile.visa_status_label ?? 'Active'} />
                  )}
                  {profile.company_name && (
                    <InfoPill icon={<Building2 size={11} />} label={profile.company_name} />
                  )}
                  {profile.company_location && (
                    <InfoPill icon={<MapPin size={11} />} label={profile.company_location} />
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="px-[24px] flex items-center gap-[24px] border-t border-[#f1f5f9] overflow-x-auto">
              {tabs.map(t => (
                <TabButton key={t.id} active={activeTab === t.id} label={t.label}
                  count={t.count} onClick={() => setActiveTab(t.id)} />
              ))}
            </div>
          </div>

          {/* ── Stats row (always visible) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
            <StatMiniCard
              label="Active Cases"
              value={stats.active_cases}
              sub="In Progress"
            />
            <StatMiniCard
              label="Total Cases"
              value={stats.total_cases}
              sub="Historical"
            />
            <StatMiniCard
              label="Documents"
              value={stats.documents_total}
              sub={`${stats.documents_verified} Verified`}
            />
            <StatMiniCard
              label="Next Deadline"
              value={stats.next_deadline_days != null ? `${stats.next_deadline_days}` : '—'}
              sub={stats.next_deadline_days != null ? 'days' : 'No deadlines'}
              urgent={stats.next_deadline_days != null && stats.next_deadline_days <= 30}
            />
          </div>

          {/* ── Tab content ── */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-[20px]">
              {/* Left col */}
              <div className="flex flex-col gap-[20px]">
                {active_case ? (
                  <ActiveCaseCard
                    app={active_case}
                    onOpenFull={() => navigate(`/employer/applications/${active_case.id}`)}
                  />
                ) : (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[32px] text-center">
                    <p className="text-[14px] text-[#64748b]">No active case</p>
                    <button
                      onClick={() => navigate('/employer/cases/new', {
                        state: { employeeLinkId: profile.employee_link_id, employeeName: profile.full_name }
                      })}
                      className="mt-[12px] h-[36px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold"
                      style={{ backgroundImage: PRIMARY_GRADIENT }}>
                      Start New Case
                    </button>
                  </div>
                )}
                <EmployeeInfoCard profile={profile} />
              </div>

              {/* Right col */}
              <div className="flex flex-col gap-[20px]">
                <DocumentsPanel
                  documents={documents}
                  total={stats.documents_total}
                  onViewAll={() => setActiveTab('documents')}
                  onUpload={() => {/* TODO: open upload modal */}}
                />
                {activity.length > 0 && <ActivityPanel items={activity} />}
              </div>
            </div>
          )}

          {activeTab === 'cases' && (
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <SectionHead title="All Cases" />
              <CasesTab
                cases={all_cases}
                onOpenCase={(id) => navigate(`/employer/applications/${id}`)}
              />
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <SectionHead
                title={`Documents (${stats.documents_total})`}
                action="Upload"
                onAction={() => {/* TODO */}}
              />
              <DocumentsTab documents={documents} />
            </div>
          )}

          {(activeTab === 'timeline' || activeTab === 'notes') && (
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[32px] text-center shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
              <p className="text-[14px] text-[#64748b]">
                {activeTab === 'timeline' ? 'Timeline view coming soon.' : 'Notes coming soon.'}
              </p>
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}