// // src/pages/hr/HRCaseDetail.tsx
// //
// // HR — Case Detail (Screen 10)
// // Route: /employer/cases/:applicationId
// // Figma: 10 - Case Details (node 0:2313)
// //
// // Layout (from Figma):
// //   ┌─ Case header: title + status badge + breadcrumb + Share/Export/Save ───┐
// //   ├─ Meta row: Employee · Employer · Lawyer · Target Date ─────────────────┤
// //   ├─ Progress bar: Overall 68% + sub-stats ────────────────────────────────┤
// //   ├─ LEFT sidebar (290px): Quick Stats | Upcoming Deadlines | Participants ┤
// //   ├─ TABS: Overview | Documents | Missing Checklist | Letters | LCA | …   ┤
// //   │  Overview tab:                                                          │
// //   │   Case Summary (Basic Info + Employment Details)                        │
// //   │   Key Milestones (vertical timeline)                                    │
// //   │   Document Status + Approval Status (2 cols)                            │
// //   │   AI Insights                                                           │
// //   │   Recent Activity                                                       │
// //   │   Action Items (checklist)                                              │
// //   └─ Floating auto-save indicator ─────────────────────────────────────────┘

// import { useState, useEffect, useCallback, type ReactNode } from 'react';
// import { useNavigate, useParams } from 'react-router-dom';
// import {
//   ChevronLeft, Share2, Download, Save, User, Building2,
//   Scale, Calendar, FileText, CheckCircle2, Clock, AlertCircle,
//   Users, Plus, MoreHorizontal, CheckSquare, Lightbulb,
//   Activity, ArrowRight, Circle, XCircle, Bell,
//   X, Info, AlertTriangle,
// } from 'lucide-react';
// import { PageContent } from '../../components/layout/Pageheader';
// import { createCaseApi } from '../../api/hr/createCase.api';
// import type {
//   HRCaseResponse, HRCaseStatus, HRCaseHistoryItem, HRApprovalStatus,
// } from '../../types/hr/createCase.types';
// import { getFileUrl } from '../../utils/fileUrl';

// const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────

// function fmtDate(iso?: string | null): string {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// }

// function fmtDateTime(iso?: string | null): string {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleString('en-US', {
//     month: 'short', day: 'numeric', year: 'numeric',
//     hour: 'numeric', minute: '2-digit',
//   });
// }

// function fmtRelative(iso?: string | null): string {
//   if (!iso) return '';
//   const diff = Date.now() - new Date(iso).getTime();
//   const mins  = Math.floor(diff / 60000);
//   if (mins < 60)  return `${mins} min${mins !== 1 ? 's' : ''} ago`;
//   const hours = Math.floor(mins / 60);
//   if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
//   const days = Math.floor(hours / 24);
//   if (days < 7)   return `${days} day${days !== 1 ? 's' : ''} ago`;
//   return fmtDate(iso);
// }

// function daysUntil(iso?: string | null): number | null {
//   if (!iso) return null;
//   return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
// }

// function initials(name: string): string {
//   return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
// }

// const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];
// function avatarColor(seed: string): string {
//   const i = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
//   return AVATAR_COLORS[i];
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // TOKENS
// // ─────────────────────────────────────────────────────────────────────────────

// function statusToken(s: HRCaseStatus): { bg: string; text: string; dot: string; label: string } {
//   switch (s) {
//     case 'in_progress':   return { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'In Progress' };
//     case 'action_needed': return { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'Action Required' };
//     case 'rfe_response':  return { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'RFE Received' };
//     case 'submitted':     return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Submitted' };
//     case 'approved':      return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved' };
//     case 'rejected':      return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Rejected' };
//     default:              return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft' };
//   }
// }

// function approvalToken(s: HRApprovalStatus | null): { icon: ReactNode; color: string; label: string } {
//   switch (s) {
//     case 'approved':          return { icon: <CheckCircle2 size={16} />, color: '#16a34a', label: 'Approved' };
//     case 'rejected':          return { icon: <XCircle size={16} />,      color: '#dc2626', label: 'Rejected' };
//     case 'changes_requested': return { icon: <AlertCircle size={16} />,  color: '#c2410c', label: 'Changes Requested' };
//     default:                  return { icon: <Clock size={16} />,         color: '#94a3b8', label: 'Pending' };
//   }
// }

// type TabId = 'overview' | 'documents' | 'checklist' | 'letters' | 'lca' | 'deadlines' | 'history' | 'access';
// const TABS: Array<{ id: TabId; label: string }> = [
//   { id: 'overview',   label: 'Overview' },
//   { id: 'documents',  label: 'Documents' },
//   { id: 'checklist',  label: 'Missing Checklist' },
//   { id: 'letters',    label: 'Generated Letters' },
//   { id: 'lca',        label: 'LCA Tracking' },
//   { id: 'deadlines',  label: 'Deadlines' },
//   { id: 'history',    label: 'Case History' },
//   { id: 'access',     label: 'Access' },
// ];

// // ─────────────────────────────────────────────────────────────────────────────
// // TOAST
// // ─────────────────────────────────────────────────────────────────────────────

// type ToastTone = 'success' | 'error' | 'info' | 'warning';
// type ToastItem = { id: string; tone: ToastTone; title: string; message?: string };

// function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
//   const meta: Record<ToastTone, { icon: ReactNode; box: string; iconBg: string; iconColor: string }> = {
//     success: { icon: <CheckCircle2 size={16} />, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iconBg: 'bg-[#dcfce7]', iconColor: 'text-[#15803d]' },
//     error:   { icon: <XCircle size={16} />,      box: 'border-[#fecaca] bg-[#fef2f2]', iconBg: 'bg-[#fee2e2]', iconColor: 'text-[#dc2626]' },
//     warning: { icon: <AlertTriangle size={16} />,box: 'border-[#fde68a] bg-[#fffbeb]', iconBg: 'bg-[#fef3c7]', iconColor: 'text-[#c2410c]' },
//     info:    { icon: <Info size={16} />,          box: 'border-[#c7d2fe] bg-[#eef2ff]', iconBg: 'bg-[#e0e7ff]', iconColor: 'text-[#4338ca]' },
//   };
//   return (
//     <div className="fixed right-[16px] top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
//       {items.map(t => {
//         const m = meta[t.tone];
//         return (
//           <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${m.box}`}>
//             <div className="flex items-start gap-[10px]">
//               <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${m.iconBg} ${m.iconColor}`}>{m.icon}</div>
//               <div className="min-w-0 flex-1">
//                 <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
//                 {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
//               </div>
//               <button onClick={() => onDismiss(t.id)}><X size={14} className="text-[#94a3b8]" /></button>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // LEFT SIDEBAR
// // ─────────────────────────────────────────────────────────────────────────────

// function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
//   const pct = total > 0 ? Math.round((current / total) * 100) : 0;
//   return (
//     <div>
//       <div className="flex items-center justify-between mb-[5px]">
//         <span className="text-[13px] text-[#374151]">{label}</span>
//         <span className="text-[13px] font-semibold text-[#111827]">{current}/{total}</span>
//       </div>
//       <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
//         <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
//       </div>
//     </div>
//   );
// }

// function Sidebar({ c }: { c: HRCaseResponse }) {
//   const deadlines = [
//     c.due_date ? { label: 'Target Submission', days: daysUntil(c.due_date) } : null,
//   ].filter(Boolean) as Array<{ label: string; days: number | null }>;

//   const participants = [
//     c.employee ? { name: c.employee.full_name,  role: 'Employee',  pic: c.employee.profile_picture_url } : null,
//     c.attorney ? { name: c.attorney.full_name,   role: 'Attorney',  pic: null } : null,
//   ].filter(Boolean) as Array<{ name: string; role: string; pic?: string | null }>;

//   return (
//     <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-[16px]">

//       {/* Quick Stats */}
//       <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//         <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
//           <Activity size={14} /> Quick Stats
//         </h3>
//         <div className="flex flex-col gap-[14px]">
//           <ProgressBar label="Documents"  current={6}  total={8}  color="#4f46e5" />
//           <ProgressBar label="Approvals"  current={c.hr_approval_status === 'approved' ? 1 : 0} total={1} color="#16a34a" />
//           <ProgressBar label="Progress"   current={c.progress_percent} total={100} color="#f59e0b" />
//         </div>
//       </div>

//       {/* Upcoming Deadlines */}
//       {deadlines.length > 0 && (
//         <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//           <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
//             <Clock size={14} /> Upcoming Deadlines
//           </h3>
//           <div className="flex flex-col gap-[10px]">
//             {deadlines.map((d, i) => {
//               const urgent = d.days != null && d.days <= 7;
//               return (
//                 <div key={i} className={`flex items-start gap-[10px] p-[10px] rounded-[8px] ${urgent ? 'bg-[#fff7ed] border border-[#fed7aa]' : 'bg-[#f9fafb]'}`}>
//                   <Clock size={14} className={`mt-[3px] shrink-0 ${urgent ? 'text-[#ea580c]' : 'text-[#94a3b8]'}`} />
//                   <div>
//                     <p className="text-[13px] font-medium text-[#111827]">{d.label}</p>
//                     <p className={`text-[11px] ${urgent ? 'text-[#ea580c] font-semibold' : 'text-[#64748b]'}`}>
//                       {d.days != null ? (d.days <= 0 ? 'Overdue' : `Due in ${d.days} day${d.days !== 1 ? 's' : ''}`) : '—'}
//                     </p>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       )}

//       {/* Participants */}
//       <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//         <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
//           <Users size={14} /> Participants
//         </h3>
//         <div className="flex flex-col gap-[12px]">
//           {participants.map((p, i) => {
//             const avatarSrc = getFileUrl(p.pic ?? null);
//             return (
//               <div key={i} className="flex items-center gap-[10px]">
//                 {avatarSrc ? (
//                   <img src={avatarSrc} alt={p.name} className="size-[36px] rounded-full object-cover border border-[#e5e7eb] shrink-0" />
//                 ) : (
//                   <div className="size-[36px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
//                        style={{ backgroundColor: avatarColor(p.name) }}>
//                     {initials(p.name)}
//                   </div>
//                 )}
//                 <div className="min-w-0">
//                   <p className="text-[13px] font-semibold text-[#111827] truncate">{p.name}</p>
//                   <p className="text-[11px] text-[#64748b]">{p.role}</p>
//                 </div>
//                 <div className="size-[8px] rounded-full bg-[#22c55e] shrink-0 ml-auto" />
//               </div>
//             );
//           })}
//           <button className="flex items-center gap-[6px] text-[12px] font-medium text-indigo-600 hover:underline mt-[2px]">
//             <Plus size={12} /> Add Participant
//           </button>
//         </div>
//       </div>

//       {/* HR Approval */}
//       <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//         <h3 className="text-[14px] font-bold text-[#0f172a] mb-[12px]">HR Approval</h3>
//         {(() => {
//           const tok = approvalToken(c.hr_approval_status);
//           return (
//             <div className="flex items-center gap-[8px]" style={{ color: tok.color }}>
//               {tok.icon}
//               <span className="text-[13px] font-semibold">{tok.label}</span>
//             </div>
//           );
//         })()}
//         {c.hr_notes && <p className="text-[12px] text-[#64748b] mt-[6px]">{c.hr_notes}</p>}
//         {c.hr_approved_at && <p className="text-[11px] text-[#94a3b8] mt-[4px]">{fmtDate(c.hr_approved_at)}</p>}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // OVERVIEW TAB
// // ─────────────────────────────────────────────────────────────────────────────

// function SectionCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
//   return (
//     <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//       <div className="px-[24px] py-[18px] border-b border-[#f8fafc]">
//         <h2 className="text-[16px] font-bold text-[#0f172a] flex items-center gap-[8px]">
//           {icon}
//           {title}
//         </h2>
//       </div>
//       <div className="px-[24px] py-[20px]">{children}</div>
//     </div>
//   );
// }

// function InfoPair({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
//   return (
//     <div className="flex items-start gap-[8px]">
//       <span className="text-[13px] text-[#64748b] w-[140px] shrink-0">{label}</span>
//       {badge ?? <span className="text-[13px] font-medium text-[#111827]">{value}</span>}
//     </div>
//   );
// }

// const MILESTONE_STAGES = [
//   { key: 'profile_eligibility', label: 'Profile & Eligibility', note: 'Initial case setup and eligibility check' },
//   { key: 'documentation',       label: 'Documentation',         note: 'Document collection and verification' },
//   { key: 'lca_filing',          label: 'LCA Filing',            note: 'Labor Condition Application filed with DOL' },
//   { key: 'uscis_submission',    label: 'USCIS Submission',       note: 'Final petition submission to USCIS' },
// ];

// function MilestoneTimeline({ currentStage, history }: { currentStage: string | null; history: HRCaseHistoryItem[] }) {
//   return (
//     <div className="relative flex flex-col gap-[0px]">
//       {/* Vertical line */}
//       <div className="absolute left-[15px] top-[16px] bottom-[16px] w-[2px] bg-[#e5e7eb]" />
//       {MILESTONE_STAGES.map((ms, i) => {
//         const historyItem = history.find(h => h.stage === ms.key);
//         const isCompleted = historyItem && ['in_progress', 'submitted', 'approved'].includes(historyItem.status);
//         const isCurrent   = currentStage === ms.key && !isCompleted;
//         // const isPending   = !isCompleted && !isCurrent;
//         return (
//           <div key={ms.key} className={`flex items-start gap-[14px] py-[14px] ${i < MILESTONE_STAGES.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
//             <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
//               isCompleted ? 'bg-[#dcfce7] border-[#22c55e] text-[#15803d]'
//               : isCurrent  ? 'bg-indigo-50 border-indigo-600 text-indigo-600'
//               : 'bg-white border-[#d1d5db] text-[#9ca3af]'
//             }`}>
//               {isCompleted ? <CheckCircle2 size={14} /> : isCurrent ? <Circle size={10} className="fill-indigo-600" /> : <Circle size={10} />}
//             </div>
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center justify-between gap-[8px]">
//                 <p className={`text-[14px] font-semibold ${isCompleted || isCurrent ? 'text-[#111827]' : 'text-[#9ca3af]'}`}>
//                   {ms.label}
//                 </p>
//                 <span className={`text-[11px] font-medium shrink-0 ${
//                   isCompleted ? 'text-[#15803d]'
//                   : isCurrent  ? 'text-indigo-600'
//                   : 'text-[#9ca3af]'
//                 }`}>
//                   {isCompleted ? fmtDate(historyItem?.created_at) : isCurrent ? 'In Progress' : 'Upcoming'}
//                 </span>
//               </div>
//               <p className={`text-[12px] mt-[2px] ${isCompleted || isCurrent ? 'text-[#64748b]' : 'text-[#c4cdd8]'}`}>
//                 {ms.note}
//               </p>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// function DocumentStatusCard() {
//   // Mock document checklist based on visa type
//   const docs = [
//     { name: 'Passport Copy',       status: 'verified' },
//     { name: 'Degree Certificate',  status: 'verified' },
//     { name: 'Resume/CV',           status: 'verified' },
//     { name: 'Employment Letter',   status: 'pending_review' },
//     { name: 'I-129 Form',          status: 'missing' },
//     { name: 'LCA Approval',        status: 'missing' },
//   ];
//   const docStatusColor: Record<string, string> = {
//     verified:       '#16a34a',
//     pending_review: '#a16207',
//     missing:        '#dc2626',
//   };
//   const docStatusLabel: Record<string, string> = {
//     verified:       'Verified',
//     pending_review: 'Pending',
//     missing:        'Missing',
//   };
//   return (
//     <SectionCard title="Document Status" icon={<FileText size={15} />}>
//       <div className="flex flex-col gap-[2px]">
//         {docs.map((d, i) => (
//           <div key={i} className="flex items-center justify-between py-[10px] border-b border-[#f8fafc] last:border-b-0">
//             <div className="flex items-center gap-[10px]">
//               <FileText size={14} className="text-[#94a3b8] shrink-0" />
//               <span className="text-[13px] text-[#374151]">{d.name}</span>
//             </div>
//             <span className="text-[12px] font-semibold" style={{ color: docStatusColor[d.status] }}>
//               {docStatusLabel[d.status]}
//             </span>
//           </div>
//         ))}
//       </div>
//       <button className="mt-[14px] w-full text-[13px] font-medium text-indigo-600 hover:underline flex items-center justify-center gap-[4px]">
//         View All Documents <ArrowRight size={12} />
//       </button>
//     </SectionCard>
//   );
// }

// function ApprovalStatusCard({ c, onApprove }: { c: HRCaseResponse; onApprove: () => void }) {
//   const approvers = [
//     { name: c.employee?.full_name ?? 'Employee',    role: 'Employee',        status: 'approved' as const,  date: c.start_date },
//     { name: c.attorney?.full_name ?? 'Attorney',    role: 'Immigration Lawyer', status: c.hr_approval_status === 'approved' ? 'approved' as const : 'pending' as const, date: null },
//     { name: 'HR Manager',                           role: 'HR Director',      status: (c.hr_approval_status ?? 'pending') as 'approved' | 'pending' | 'rejected', date: c.hr_approved_at },
//   ];
//   return (
//     <SectionCard title="Approval Status" icon={<CheckSquare size={15} />}>
//       <div className="flex flex-col gap-[2px]">
//         {approvers.map((a, i) => {
//           const approved  = a.status === 'approved';
//           const rejected  = a.status === 'rejected';
//           return (
//             <div key={i} className="flex items-center justify-between py-[12px] border-b border-[#f8fafc] last:border-b-0">
//               <div className="flex items-center gap-[10px]">
//                 <div className="size-[36px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
//                      style={{ backgroundColor: avatarColor(a.name) }}>
//                   {initials(a.name)}
//                 </div>
//                 <div>
//                   <p className="text-[13px] font-medium text-[#111827]">{a.name}</p>
//                   <p className="text-[11px] text-[#64748b]">{a.role}</p>
//                   {a.date && <p className="text-[10px] text-[#94a3b8]">{fmtDate(a.date)}</p>}
//                 </div>
//               </div>
//               <div className={`size-[28px] rounded-full flex items-center justify-center ${
//                 approved ? 'bg-[#dcfce7] text-[#15803d]'
//                 : rejected ? 'bg-[#fee2e2] text-[#dc2626]'
//                 : 'bg-[#f1f5f9] text-[#9ca3af]'
//               }`}>
//                 {approved ? <CheckCircle2 size={14} /> : rejected ? <XCircle size={14} /> : <Clock size={14} />}
//               </div>
//             </div>
//           );
//         })}
//       </div>
//       <button onClick={onApprove}
//         className="mt-[14px] w-full text-[13px] font-semibold text-indigo-600 border border-indigo-200 h-[36px] rounded-[8px] hover:bg-indigo-50 flex items-center justify-center gap-[6px] transition">
//         {c.hr_approval_status === 'approved' ? 'Update Approval' : 'Review & Approve'} <ArrowRight size={12} />
//       </button>
//     </SectionCard>
//   );
// }

// function AIInsightsCard({ c }: { c: HRCaseResponse }) {
//   const insights = [
//     { type: 'suggestion', icon: <Lightbulb size={13} className="text-[#f59e0b]" />, title: 'Document Suggestion', body: `Based on the ${c.visa_type?.code ?? 'visa'} application, consider uploading all supporting documents early to avoid delays.` },
//     { type: 'warning',    icon: <AlertCircle size={13} className="text-[#ea580c]" />, title: 'Deadline Alert', body: `${c.due_date ? `Target submission date is ${fmtDate(c.due_date)}.` : 'No target date set.'} Ensure all documents are ready before proceeding.` },
//     { type: 'positive',   icon: <CheckCircle2 size={13} className="text-[#16a34a]" />, title: 'Case Strength', body: `Your case has a ${c.progress_percent >= 75 ? 'high' : c.progress_percent >= 50 ? 'moderate' : 'developing'} approval probability based on current documentation.` },
//   ];
//   return (
//     <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[14px] p-[20px]">
//       <div className="flex items-center gap-[10px] mb-[16px]">
//         <div className="size-[36px] rounded-[10px] bg-indigo-600 flex items-center justify-center">
//           <Lightbulb size={16} className="text-white" />
//         </div>
//         <h2 className="text-[16px] font-bold text-[#0f172a]">AI Insights & Recommendations</h2>
//       </div>
//       <div className="flex flex-col gap-[10px]">
//         {insights.map((ins, i) => (
//           <div key={i} className="bg-white rounded-[10px] p-[14px] border border-white/80">
//             <div className="flex items-start gap-[10px]">
//               {ins.icon}
//               <div>
//                 <p className="text-[13px] font-semibold text-[#111827]">{ins.title}</p>
//                 <p className="text-[12px] text-[#374151] mt-[3px]">{ins.body}</p>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }

// function RecentActivityCard({ history }: { history: HRCaseHistoryItem[] }) {
//   if (!history.length) return null;
//   const actTypeColor: Record<string, string> = {
//     approved: '#15803d', uploaded: '#2563eb', comment: '#64748b',
//     created: '#4f46e5', submitted: '#15803d',
//   };
//   return (
//     <SectionCard title="Recent Activity" icon={<Activity size={15} />}>
//       <div className="flex flex-col gap-[0px]">
//         {history.slice(0, 5).map((h, i) => (
//           <div key={h.id} className={`flex items-start gap-[12px] py-[12px] ${i < Math.min(history.length, 5) - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
//             <div className="size-[36px] rounded-full bg-[#f1f5f9] flex items-center justify-center shrink-0">
//               <Activity size={14} className="text-[#64748b]" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-[13px] text-[#111827]">
//                 Status changed to <strong>{h.status.replace('_', ' ')}</strong>
//                 {h.note ? ` — ${h.note}` : ''}
//               </p>
//               <p className="text-[11px] text-[#94a3b8] mt-[2px]">{fmtRelative(h.created_at)}</p>
//             </div>
//             <span className="text-[11px] font-medium px-[8px] py-[2px] rounded-full shrink-0"
//                   style={{ backgroundColor: '#f1f5f9', color: actTypeColor[h.status] ?? '#64748b' }}>
//               {h.status.replace('_', ' ')}
//             </span>
//           </div>
//         ))}
//       </div>
//       <button className="mt-[12px] w-full text-[13px] font-medium text-indigo-600 hover:underline flex items-center justify-center gap-[4px]">
//         View Complete History <ArrowRight size={12} />
//       </button>
//     </SectionCard>
//   );
// }

// // Action items are from the application_tasks list — showing mock for now
// function ActionItemsCard() {
//   const items = [
//     { title: 'Upload I-129 Form',              priority: 'critical', done: false, note: 'Required for petition filing. Download template from USCIS website.' },
//     { title: 'Review Employment Letter Draft', priority: 'high',     done: false, note: 'Review and approve the employment letter prepared by HR.' },
//     { title: 'Schedule Interview with Lawyer', priority: 'medium',   done: false, note: 'Discuss case strategy and timeline with the attorney.' },
//     { title: 'Upload Passport Copy',           priority: 'low',      done: true,  note: 'Valid passport biographical page uploaded and verified.' },
//   ];
//   const priorityColor: Record<string, string> = {
//     critical: '#dc2626', high: '#c2410c', medium: '#a16207', low: '#15803d',
//   };
//   const priorityBg: Record<string, string> = {
//     critical: '#fee2e2', high: '#ffedd5', medium: '#fef9c3', low: '#dcfce7',
//   };
//   return (
//     <SectionCard title="Action Items" icon={<CheckSquare size={15} />}>
//       <div className="flex flex-col gap-[0px]">
//         {items.map((item, i) => (
//           <div key={i} className={`flex items-start gap-[12px] py-[14px] ${i < items.length - 1 ? 'border-b border-[#f8fafc]' : ''} ${item.done ? 'opacity-60' : ''}`}>
//             <div className={`size-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[2px] ${
//               item.done ? 'bg-indigo-600 border-indigo-600' : 'border-[#d1d5db]'
//             }`}>
//               {item.done && <CheckCircle2 size={12} className="text-white" />}
//             </div>
//             <div className="flex-1 min-w-0">
//               <div className="flex items-center justify-between gap-[8px] mb-[3px]">
//                 <p className={`text-[14px] font-semibold ${item.done ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>
//                   {item.title}
//                 </p>
//                 {!item.done && (
//                   <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold shrink-0"
//                         style={{ backgroundColor: priorityBg[item.priority], color: priorityColor[item.priority] }}>
//                     {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
//                   </span>
//                 )}
//                 {item.done && <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d] shrink-0">Completed</span>}
//               </div>
//               <p className="text-[12px] text-[#64748b]">{item.note}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </SectionCard>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // HISTORY TAB
// // ─────────────────────────────────────────────────────────────────────────────

// function HistoryTab({ history }: { history: HRCaseHistoryItem[] }) {
//   if (!history.length) return (
//     <div className="py-[40px] text-center text-[#64748b] text-[14px]">No history yet.</div>
//   );
//   return (
//     <SectionCard title="Case Status History">
//       <div className="flex flex-col gap-[0px]">
//         {history.map((h, i) => (
//           <div key={h.id} className={`flex items-start gap-[12px] py-[14px] ${i < history.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
//             <div className="size-[36px] rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
//               <Activity size={14} className="text-indigo-600" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-[13px] font-semibold text-[#111827]">
//                 {h.stage.replace('_', ' ')} → {h.status.replace('_', ' ')}
//               </p>
//               {h.note && <p className="text-[12px] text-[#64748b] mt-[2px]">{h.note}</p>}
//               <p className="text-[11px] text-[#94a3b8] mt-[3px]">{fmtDateTime(h.created_at)}</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </SectionCard>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PAGE
// // ─────────────────────────────────────────────────────────────────────────────

// export default function HRCaseDetail() {
//   const navigate                = useNavigate();
//   const { applicationId }       = useParams<{ applicationId: string }>();
//   const [c, setCase]            = useState<HRCaseResponse | null>(null);
//   const [history, setHistory]   = useState<HRCaseHistoryItem[]>([]);
//   const [isLoading, setLoading] = useState(true);
//   const [error, setError]       = useState<string | null>(null);
//   const [activeTab, setTab]     = useState<TabId>('overview');
//   const [toasts, setToasts]     = useState<ToastItem[]>([]);

//   const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
//     const id = `${Date.now()}-${Math.random()}`;
//     setToasts(prev => [...prev, { id, tone, title, message }]);
//     setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3200);
//   }, []);

//   const load = useCallback(async () => {
//     if (!applicationId) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const [caseRes, histRes] = await Promise.all([
//         createCaseApi.getCase(applicationId),
//         createCaseApi.getCaseHistory(applicationId),
//       ]);
//       setCase(caseRes);
//       setHistory(histRes);
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : 'Failed to load case');
//     } finally {
//       setLoading(false);
//     }
//   }, [applicationId]);

//   useEffect(() => { void load(); }, [load]);

//   if (isLoading) return (
//     <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
//       <div className="flex flex-col gap-[16px] p-[24px]">
//         {[0,1,2].map(i => <div key={i} className={`bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse ${i === 0 ? 'h-[120px]' : i === 1 ? 'h-[60px]' : 'h-[400px]'}`} />)}
//       </div>
//     </div>
//   );

//   if (error || !c) return (
//     <div className="flex flex-col h-full items-center justify-center gap-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
//       <p className="text-[#ef4444] text-[16px] font-medium">{error ?? 'Case not found'}</p>
//       <button onClick={() => navigate('/employer/cases')} className="text-indigo-600 text-[14px] hover:underline flex items-center gap-[4px]">
//         <ChevronLeft size={13} /> Back to Cases
//       </button>
//     </div>
//   );

//   const tok = statusToken(c.status);

//   return (
//     <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
//       <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

//       <PageContent>
//         <div className="flex flex-col gap-[0px]">

//           {/* ── Case Header ── */}
//           <div className="bg-white border border-[#f1f5f9] rounded-[16px] mb-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
//             <div className="px-[24px] pt-[20px] pb-[16px]">
//               {/* Breadcrumb */}
//               <div className="flex items-center gap-[6px] mb-[12px]">
//                 <button onClick={() => navigate('/employer/cases')}
//                   className="flex items-center gap-[4px] text-[13px] text-[#64748b] hover:text-indigo-600 transition">
//                   <ChevronLeft size={14} /> Cases
//                 </button>
//                 <span className="text-[#d1d5db]">/</span>
//                 <span className="text-[13px] text-[#374151] truncate max-w-[200px]">{c.case_name}</span>
//               </div>

//               {/* Title row */}
//               <div className="flex items-start justify-between gap-[16px]">
//                 <div className="min-w-0">
//                   <div className="flex items-center gap-[12px] flex-wrap mb-[6px]">
//                     <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">{c.visa_type?.name ?? c.case_name}</h1>
//                     <span className="inline-flex items-center gap-[6px] px-[12px] py-[4px] rounded-full text-[13px] font-semibold"
//                           style={{ backgroundColor: tok.bg, color: tok.text }}>
//                       <span className="size-[6px] rounded-full" style={{ backgroundColor: tok.dot }} />
//                       {tok.label}
//                     </span>
//                   </div>
//                   <p className="text-[13px] text-[#64748b]">
//                     Case ID: {c.application_number} · Created {fmtDate(c.created_at)}
//                   </p>
//                 </div>
//                 <div className="flex items-center gap-[8px] shrink-0">
//                   <button onClick={() => navigate('/employer/notifications')}
//                     className="size-[38px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
//                     <Bell size={15} />
//                     <span className="absolute top-[8px] right-[8px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
//                   </button>
//                   <button onClick={() => pushToast('info', 'Share coming soon')}
//                     className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
//                     <Share2 size={13} /> Share
//                   </button>
//                   <button onClick={() => pushToast('info', 'Export coming soon')}
//                     className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
//                     <Download size={13} /> Export
//                   </button>
//                   <button className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90"
//                     style={{ backgroundImage: PRIMARY_GRADIENT }}>
//                     <Save size={13} /> Save Draft
//                   </button>
//                   <button className="size-[38px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc]">
//                     <MoreHorizontal size={15} />
//                   </button>
//                 </div>
//               </div>

//               {/* Meta row: Employee · Employer · Attorney · Target Date */}
//               <div className="flex items-center flex-wrap gap-[20px] mt-[12px]">
//                 {c.employee && (
//                   <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
//                     <User size={13} className="text-[#94a3b8]" /> Employee: {c.employee.full_name}
//                   </span>
//                 )}
//                 {c.sponsor_employer && (
//                   <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
//                     <Building2 size={13} className="text-[#94a3b8]" /> Employer: {c.sponsor_employer}
//                   </span>
//                 )}
//                 {c.attorney && (
//                   <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
//                     <Scale size={13} className="text-[#94a3b8]" /> Attorney: {c.attorney.full_name}
//                   </span>
//                 )}
//                 {c.due_date && (
//                   <span className="flex items-center gap-[6px] text-[13px] text-[#475569]">
//                     <Calendar size={13} className="text-[#94a3b8]" /> Target: {fmtDate(c.due_date)}
//                   </span>
//                 )}
//               </div>
//             </div>

//             {/* Progress bar */}
//             <div className="px-[24px] py-[14px] border-t border-[#f8fafc]">
//               <div className="flex items-center justify-between mb-[8px]">
//                 <span className="text-[13px] text-[#64748b]">Overall Case Progress</span>
//                 <span className="text-[14px] font-bold text-indigo-600">{c.progress_percent}%</span>
//               </div>
//               <div className="h-[10px] bg-[#f1f5f9] rounded-full overflow-hidden">
//                 <div className="h-full rounded-full transition-all duration-700"
//                      style={{ width: `${c.progress_percent}%`, backgroundImage: PRIMARY_GRADIENT }} />
//               </div>
//               <div className="flex items-center gap-[24px] mt-[8px]">
//                 <span className="text-[11px] text-[#64748b]">Stage: {c.current_stage?.replace('_', ' ') ?? 'Not started'}</span>
//                 {c.has_action_required && (
//                   <span className="text-[11px] text-[#c2410c] font-medium flex items-center gap-[3px]">
//                     <AlertCircle size={10} /> {c.action_required_note ?? 'Action required'}
//                   </span>
//                 )}
//               </div>
//             </div>

//             {/* Tabs */}
//             <div className="flex items-center gap-[0px] px-[24px] border-t border-[#f8fafc] overflow-x-auto">
//               {TABS.map(t => (
//                 <button key={t.id} onClick={() => setTab(t.id)}
//                   className={`px-[16px] py-[14px] text-[13px] font-medium whitespace-nowrap border-b-2 transition ${
//                     activeTab === t.id
//                       ? 'border-indigo-600 text-indigo-600'
//                       : 'border-transparent text-[#64748b] hover:text-[#334155]'
//                   }`}>
//                   {t.label}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* ── Main content: sidebar + tab area ── */}
//           <div className="flex flex-col lg:flex-row gap-[20px] items-start">
//             <Sidebar c={c} />

//             <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
//               {activeTab === 'overview' && (
//                 <>
//                   {/* Case Summary */}
//                   <SectionCard title="Case Summary">
//                     <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px]">
//                       <div>
//                         <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Basic Information</p>
//                         <div className="flex flex-col gap-[10px]">
//                           <InfoPair label="Visa Type:" value={c.visa_type?.name ?? '—'} />
//                           <InfoPair label="Case Status:" value={tok.label}
//                             badge={<span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold" style={{ backgroundColor: tok.bg, color: tok.text }}>{tok.label}</span>} />
//                           <InfoPair label="Priority:" value={c.priority} />
//                           <InfoPair label="Created:" value={fmtDate(c.created_at)} />
//                           <InfoPair label="Last Updated:" value={fmtRelative(c.updated_at)} />
//                         </div>
//                       </div>
//                       <div>
//                         <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Employment Details</p>
//                         <div className="flex flex-col gap-[10px]">
//                           <InfoPair label="Job Title:"    value={c.employee?.job_title ?? '—'} />
//                           <InfoPair label="Department:"   value={c.employee?.department ?? '—'} />
//                           <InfoPair label="Start Date:"   value={fmtDate(c.start_date)} />
//                           <InfoPair label="Target Date:"  value={fmtDate(c.due_date)} />
//                           <InfoPair label="Sponsor:"      value={c.sponsor_employer ?? '—'} />
//                         </div>
//                       </div>
//                     </div>
//                   </SectionCard>

//                   {/* Key Milestones */}
//                   <SectionCard title="Key Milestones">
//                     <MilestoneTimeline currentStage={c.current_stage} history={history} />
//                   </SectionCard>

//                   {/* Document Status + Approval Status */}
//                   <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
//                     <DocumentStatusCard />
//                     <ApprovalStatusCard c={c} onApprove={() => pushToast('info', 'Approval UI coming soon')} />
//                   </div>

//                   {/* AI Insights */}
//                   <AIInsightsCard c={c} />

//                   {/* Recent Activity */}
//                   <RecentActivityCard history={history} />

//                   {/* Action Items */}
//                   <ActionItemsCard />
//                 </>
//               )}

//               {activeTab === 'history' && <HistoryTab history={history} />}

//               {['documents', 'checklist', 'letters', 'lca', 'deadlines', 'access'].includes(activeTab) && (
//                 <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[40px] text-center shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
//                   <p className="text-[14px] text-[#64748b]">
//                     {TABS.find(t => t.id === activeTab)?.label} screen coming soon.
//                   </p>
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       </PageContent>

//       {/* Auto-save indicator */}
//       <div className="fixed bottom-[20px] left-[20px] flex items-center gap-[6px] bg-white border border-[#e5e7eb] rounded-full px-[14px] py-[6px] shadow-sm z-10">
//         <span className="size-[7px] rounded-full bg-[#22c55e]" />
//         <span className="text-[12px] text-[#374151]">All changes saved</span>
//       </div>
//     </div>
//   );
// }

// src/pages/hr/HRCaseDetail.tsx
// Fixed:
//   1. 3-dot menu — Dropdown component + wired actions
//   2. Export button — real CSV download
//   3. Save Draft — calls PATCH /hr/cases/:id with editable internal notes
//   4. "View Complete History" button — switches to history tab
//   5. Share button — copies URL to clipboard

import { useState, useEffect, useCallback, useRef, type ReactNode, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft, Share2, Download, Save, User, Building2,
  Scale, Calendar, FileText, CheckCircle2, Clock, AlertCircle,
  Users, Plus, MoreHorizontal, CheckSquare, Lightbulb,
  Activity, ArrowRight, Circle, XCircle, Bell, RefreshCw,
  X, Info, AlertTriangle, Edit2, Eye,
} from 'lucide-react';
import { PageContent } from '../../components/layout/Pageheader';
import { createCaseApi } from '../../api/hr/createCase.api';
import HRDocumentManagement from './HRDocumentManagement';
import type {
  HRCaseResponse, HRCaseStatus, HRCaseStage,
  HRCaseHistoryItem, HRApprovalStatus,
} from '../../types/hr/createCase.types';
import { getFileUrl } from '../../utils/fileUrl';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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
  const mins  = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)   return `${days}d ago`;
  return fmtDate(iso);
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
  const i = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportCaseCSV(c: HRCaseResponse, history: HRCaseHistoryItem[]) {
  const esc  = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [
    ['Case Name',        c.case_name],
    ['Case #',           c.application_number],
    ['Visa Type',        c.visa_type?.code ?? ''],
    ['Status',           c.status],
    ['Stage',            c.current_stage ?? ''],
    ['Progress %',       String(c.progress_percent)],
    ['Employee',         c.employee?.full_name ?? ''],
    ['Attorney',         c.attorney?.full_name ?? ''],
    ['Priority',         c.priority],
    ['Target Date',      c.due_date ?? ''],
    ['Start Date',       c.start_date ?? ''],
    ['HR Approval',      c.hr_approval_status ?? 'pending'],
    ['Sponsor',          c.sponsor_employer ?? ''],
    ['Created',          c.created_at],
  ];
  const historyRows = history.map(h =>
    ['', '', '', h.status, h.stage, '', '', '', '', '', '', '', h.note ?? '', h.created_at].map(v => esc(String(v))).join(',')
  );

  const csv = [
    rows.map(r => r.map(v => esc(String(v))).join(',')).join('\n'),
    '',
    'Status History',
    'Case Name,Case #,Visa,Status,Stage,Progress,Employee,Attorney,Priority,Target Date,Start Date,HR Approval,Note,Date',
    ...historyRows,
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `case-${c.application_number}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX: DROPDOWN — click-outside aware
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE STATUS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ChangeStatusModal({ open, current, onClose, onSave }: {
  open: boolean; current: HRCaseStatus; onClose: () => void;
  onSave: (status: HRCaseStatus, stage: HRCaseStage | null, note: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<HRCaseStatus>(current);
  const [stage,  setStage]  = useState<HRCaseStage | null>(null);
  const [note,   setNote]   = useState('');
  const [busy,   setBusy]   = useState(false);

  const STATUSES: HRCaseStatus[]  = ['in_progress', 'action_needed', 'rfe_response', 'submitted', 'approved', 'rejected', 'withdrawn'];
  const STAGES: HRCaseStage[]     = ['profile_eligibility', 'documentation', 'lca_filing', 'uscis_submission'];

  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[480px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-semibold text-[#0f172a]">Change Case Status</h3>
            <button onClick={onClose}><X size={18} className="text-[#94a3b8]" /></button>
          </div>
          <div className="flex flex-col gap-[14px]">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">New Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as HRCaseStatus)}
                className="w-full h-[42px] border border-[#e5e7eb] rounded-[8px] px-[12px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200">
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">Stage (optional)</label>
              <select value={stage ?? ''} onChange={e => setStage((e.target.value || null) as HRCaseStage | null)}
                className="w-full h-[42px] border border-[#e5e7eb] rounded-[8px] px-[12px] text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-200">
                <option value="">— Keep current stage —</option>
                {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">Note (optional)</label>
              <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Reason for status change..." rows={3}
                className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="flex justify-end gap-[10px] mt-[20px]">
            <button onClick={onClose} className="h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">Cancel</button>
            <button onClick={async () => { setBusy(true); await onSave(status, stage, note); setBusy(false); }} disabled={busy}
              className="h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-60"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              {busy ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HR APPROVAL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ApprovalModal({ open, current, onClose, onSave }: {
  open: boolean; current: HRApprovalStatus | null; onClose: () => void;
  onSave: (status: HRApprovalStatus, notes: string) => Promise<void>;
}) {
  const [status, setStatus] = useState<HRApprovalStatus>(current ?? 'pending');
  const [notes,  setNotes]  = useState('');
  const [busy,   setBusy]   = useState(false);
  const OPTS: HRApprovalStatus[] = ['pending', 'approved', 'rejected', 'changes_requested'];
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[480px] bg-white rounded-[18px] border border-[#e2e8f0] shadow-2xl p-[24px]">
          <div className="flex items-center justify-between mb-[20px]">
            <h3 className="text-[18px] font-semibold text-[#0f172a]">HR Approval Decision</h3>
            <button onClick={onClose}><X size={18} className="text-[#94a3b8]" /></button>
          </div>
          <div className="flex flex-col gap-[14px]">
            <div className="grid grid-cols-2 gap-[8px]">
              {OPTS.map(o => (
                <button key={o} onClick={() => setStatus(o)}
                  className={`h-[40px] rounded-[8px] border text-[13px] font-medium transition ${status === o ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-[#e5e7eb] text-[#374151] hover:bg-[#f8fafc]'}`}>
                  {o.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">HR Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes visible to employee and attorney..." rows={3}
                className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          <div className="flex justify-end gap-[10px] mt-[20px]">
            <button onClick={onClose} className="h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">Cancel</button>
            <button onClick={async () => { setBusy(true); await onSave(status, notes); setBusy(false); }} disabled={busy}
              className="h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-60"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              {busy ? 'Saving...' : 'Save Decision'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────

function statusToken(s: HRCaseStatus): { bg: string; text: string; dot: string; label: string } {
  switch (s) {
    case 'in_progress':   return { bg: '#dbeafe', text: '#1d4ed8', dot: '#3b82f6', label: 'In Progress' };
    case 'action_needed': return { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'Action Required' };
    case 'rfe_response':  return { bg: '#ffedd5', text: '#c2410c', dot: '#f97316', label: 'RFE Received' };
    case 'submitted':     return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Submitted' };
    case 'approved':      return { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Approved' };
    case 'rejected':      return { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Rejected' };
    default:              return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft' };
  }
}

function approvalToken(s: HRApprovalStatus | null): { icon: ReactNode; color: string; label: string } {
  switch (s) {
    case 'approved':          return { icon: <CheckCircle2 size={16} />, color: '#16a34a', label: 'Approved' };
    case 'rejected':          return { icon: <XCircle size={16} />,      color: '#dc2626', label: 'Rejected' };
    case 'changes_requested': return { icon: <AlertCircle size={16} />,  color: '#c2410c', label: 'Changes Requested' };
    default:                  return { icon: <Clock size={16} />,         color: '#94a3b8', label: 'Pending' };
  }
}

type TabId = 'overview' | 'documents' | 'checklist' | 'letters' | 'lca' | 'deadlines' | 'history' | 'access';
const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview',   label: 'Overview' },
  { id: 'documents',  label: 'Documents' },
  { id: 'checklist',  label: 'Missing Checklist' },
  { id: 'letters',    label: 'Generated Letters' },
  { id: 'lca',        label: 'LCA Tracking' },
  { id: 'deadlines',  label: 'Deadlines' },
  { id: 'history',    label: 'Case History' },
  { id: 'access',     label: 'Access' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

function ProgressBar({ label, current, total, color }: { label: string; current: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-[5px]">
        <span className="text-[13px] text-[#374151]">{label}</span>
        <span className="text-[13px] font-semibold text-[#111827]">{current}/{total}</span>
      </div>
      <div className="h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function Sidebar({ c, onApprove }: { c: HRCaseResponse; onApprove: () => void }) {
  const deadlines = [
    c.due_date ? { label: 'Target Submission', days: daysUntil(c.due_date) } : null,
  ].filter(Boolean) as Array<{ label: string; days: number | null }>;

  const participants = [
    c.employee ? { name: c.employee.full_name, role: 'Employee', pic: (c.employee as { profile_picture_url?: string | null }).profile_picture_url } : null,
    c.attorney ? { name: c.attorney.full_name,  role: 'Attorney', pic: null } : null,
  ].filter(Boolean) as Array<{ name: string; role: string; pic?: string | null }>;

  return (
    <div className="w-full lg:w-[280px] shrink-0 flex flex-col gap-[16px]">

      {/* Quick Stats */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
          <Activity size={14} /> Quick Stats
        </h3>
        <div className="flex flex-col gap-[14px]">
          <ProgressBar label="Documents"  current={6}  total={8}  color="#4f46e5" />
          <ProgressBar label="Approvals"  current={c.hr_approval_status === 'approved' ? 1 : 0} total={1} color="#16a34a" />
          <ProgressBar label="Progress"   current={c.progress_percent} total={100} color="#f59e0b" />
        </div>
      </div>

      {/* Upcoming Deadlines */}
      {deadlines.length > 0 && (
        <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
          <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
            <Clock size={14} /> Upcoming Deadlines
          </h3>
          <div className="flex flex-col gap-[10px]">
            {deadlines.map((d, i) => {
              const urgent = d.days != null && d.days <= 7;
              return (
                <div key={i} className={`flex items-start gap-[10px] p-[10px] rounded-[8px] ${urgent ? 'bg-[#fff7ed] border border-[#fed7aa]' : 'bg-[#f9fafb]'}`}>
                  <Clock size={14} className={`mt-[3px] shrink-0 ${urgent ? 'text-[#ea580c]' : 'text-[#94a3b8]'}`} />
                  <div>
                    <p className="text-[13px] font-medium text-[#111827]">{d.label}</p>
                    <p className={`text-[11px] ${urgent ? 'text-[#ea580c] font-semibold' : 'text-[#64748b]'}`}>
                      {d.days != null ? (d.days <= 0 ? 'Overdue' : `Due in ${d.days} day${d.days !== 1 ? 's' : ''}`) : '—'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0f172a] mb-[14px] flex items-center gap-[6px]">
          <Users size={14} /> Participants
        </h3>
        <div className="flex flex-col gap-[12px]">
          {participants.map((p, i) => {
            const avatarSrc = getFileUrl(p.pic ?? null);
            return (
              <div key={i} className="flex items-center gap-[10px]">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={p.name} className="size-[36px] rounded-full object-cover border border-[#e5e7eb] shrink-0" />
                ) : (
                  <div className="size-[36px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                       style={{ backgroundColor: avatarColor(p.name) }}>
                    {initials(p.name)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-[#111827] truncate">{p.name}</p>
                  <p className="text-[11px] text-[#64748b]">{p.role}</p>
                </div>
                <div className="size-[8px] rounded-full bg-[#22c55e] shrink-0 ml-auto" />
              </div>
            );
          })}
          <button className="flex items-center gap-[6px] text-[12px] font-medium text-indigo-600 hover:underline mt-[2px]">
            <Plus size={12} /> Add Participant
          </button>
        </div>
      </div>

      {/* HR Approval */}
      <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0f172a] mb-[12px]">HR Approval</h3>
        {(() => {
          const tok = approvalToken(c.hr_approval_status);
          return (
            <div className="flex items-center gap-[8px] mb-[8px]" style={{ color: tok.color }}>
              {tok.icon}
              <span className="text-[13px] font-semibold">{tok.label}</span>
            </div>
          );
        })()}
        {c.hr_notes && <p className="text-[12px] text-[#64748b] mb-[8px]">{c.hr_notes}</p>}
        {c.hr_approved_at && <p className="text-[11px] text-[#94a3b8] mb-[8px]">{fmtDate(c.hr_approved_at)}</p>}
        <button onClick={onApprove}
          className="w-full h-[34px] rounded-[8px] border border-indigo-200 text-indigo-600 text-[12px] font-semibold hover:bg-indigo-50 transition">
          {c.hr_approval_status === 'approved' ? 'Update Approval' : 'Review & Approve'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
      <div className="px-[24px] py-[18px] border-b border-[#f8fafc]">
        <h2 className="text-[16px] font-bold text-[#0f172a] flex items-center gap-[8px]">{icon}{title}</h2>
      </div>
      <div className="px-[24px] py-[20px]">{children}</div>
    </div>
  );
}

function InfoPair({ label, value, badge }: { label: string; value: string; badge?: ReactNode }) {
  return (
    <div className="flex items-start gap-[8px] mb-[10px]">
      <span className="text-[13px] text-[#64748b] w-[140px] shrink-0">{label}</span>
      {badge ?? <span className="text-[13px] font-medium text-[#111827]">{value}</span>}
    </div>
  );
}

const MILESTONE_STAGES = [
  { key: 'profile_eligibility', label: 'Profile & Eligibility', note: 'Initial case setup and eligibility check' },
  { key: 'documentation',       label: 'Documentation',         note: 'Document collection and verification' },
  { key: 'lca_filing',          label: 'LCA Filing',            note: 'Labor Condition Application filed with DOL' },
  { key: 'uscis_submission',    label: 'USCIS Submission',       note: 'Final petition submission to USCIS' },
];

function MilestoneTimeline({ currentStage, history }: { currentStage: string | null; history: HRCaseHistoryItem[] }) {
  return (
    <div className="relative flex flex-col">
      <div className="absolute left-[15px] top-[16px] bottom-[16px] w-[2px] bg-[#e5e7eb]" />
      {MILESTONE_STAGES.map((ms, i) => {
        const historyItem = history.find(h => h.stage === ms.key);
        const isCompleted = !!(historyItem && ['in_progress', 'submitted', 'approved'].includes(historyItem.status));
        const isCurrent   = currentStage === ms.key && !isCompleted;
        return (
          <div key={ms.key} className={`flex items-start gap-[14px] py-[14px] ${i < MILESTONE_STAGES.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
            <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 z-10 border-2 ${
              isCompleted ? 'bg-[#dcfce7] border-[#22c55e] text-[#15803d]'
              : isCurrent  ? 'bg-indigo-50 border-indigo-600 text-indigo-600'
              : 'bg-white border-[#d1d5db] text-[#9ca3af]'
            }`}>
              {isCompleted ? <CheckCircle2 size={14} /> : isCurrent ? <Circle size={10} className="fill-indigo-600" /> : <Circle size={10} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-[8px]">
                <p className={`text-[14px] font-semibold ${isCompleted || isCurrent ? 'text-[#111827]' : 'text-[#9ca3af]'}`}>{ms.label}</p>
                <span className={`text-[11px] font-medium shrink-0 ${isCompleted ? 'text-[#15803d]' : isCurrent ? 'text-indigo-600' : 'text-[#9ca3af]'}`}>
                  {isCompleted ? fmtDate(historyItem?.created_at) : isCurrent ? 'In Progress' : 'Upcoming'}
                </span>
              </div>
              <p className={`text-[12px] mt-[2px] ${isCompleted || isCurrent ? 'text-[#64748b]' : 'text-[#c4cdd8]'}`}>{ms.note}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DocumentStatusCard() {
  const docs = [
    { name: 'Passport Copy',       status: 'verified' },
    { name: 'Degree Certificate',  status: 'verified' },
    { name: 'Resume/CV',           status: 'verified' },
    { name: 'Employment Letter',   status: 'pending_review' },
    { name: 'I-129 Form',          status: 'missing' },
    { name: 'LCA Approval',        status: 'missing' },
  ];
  const colorMap: Record<string, string> = { verified: '#16a34a', pending_review: '#a16207', missing: '#dc2626' };
  const labelMap: Record<string, string> = { verified: 'Verified', pending_review: 'Pending', missing: 'Missing' };
  return (
    <SectionCard title="Document Status" icon={<FileText size={15} />}>
      <div className="flex flex-col">
        {docs.map((d, i) => (
          <div key={i} className="flex items-center justify-between py-[10px] border-b border-[#f8fafc] last:border-b-0">
            <div className="flex items-center gap-[10px]">
              <FileText size={14} className="text-[#94a3b8] shrink-0" />
              <span className="text-[13px] text-[#374151]">{d.name}</span>
            </div>
            <span className="text-[12px] font-semibold" style={{ color: colorMap[d.status] }}>{labelMap[d.status]}</span>
          </div>
        ))}
      </div>
      <button className="mt-[14px] w-full text-[13px] font-medium text-indigo-600 hover:underline flex items-center justify-center gap-[4px]">
        View All Documents <ArrowRight size={12} />
      </button>
    </SectionCard>
  );
}

function ApprovalStatusCard({ c, onApprove }: { c: HRCaseResponse; onApprove: () => void }) {
  const approvers = [
    { name: c.employee?.full_name ?? 'Employee',  role: 'Employee',          status: 'approved' as const,   date: c.start_date },
    { name: c.attorney?.full_name ?? 'Attorney',  role: 'Immigration Lawyer', status: (c.hr_approval_status === 'approved' ? 'approved' : 'pending') as 'approved' | 'pending', date: null },
    { name: 'HR Manager',                          role: 'HR Director',        status: (c.hr_approval_status ?? 'pending') as 'approved' | 'pending' | 'rejected', date: c.hr_approved_at },
  ];
  return (
    <SectionCard title="Approval Status" icon={<CheckSquare size={15} />}>
      <div className="flex flex-col">
        {approvers.map((a, i) => {
          const approved = a.status === 'approved', rejected = a.status === 'rejected';
          return (
            <div key={i} className="flex items-center justify-between py-[12px] border-b border-[#f8fafc] last:border-b-0">
              <div className="flex items-center gap-[10px]">
                <div className="size-[36px] rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                     style={{ backgroundColor: avatarColor(a.name) }}>{initials(a.name)}</div>
                <div>
                  <p className="text-[13px] font-medium text-[#111827]">{a.name}</p>
                  <p className="text-[11px] text-[#64748b]">{a.role}</p>
                  {a.date && <p className="text-[10px] text-[#94a3b8]">{fmtDate(a.date)}</p>}
                </div>
              </div>
              <div className={`size-[28px] rounded-full flex items-center justify-center ${approved ? 'bg-[#dcfce7] text-[#15803d]' : rejected ? 'bg-[#fee2e2] text-[#dc2626]' : 'bg-[#f1f5f9] text-[#9ca3af]'}`}>
                {approved ? <CheckCircle2 size={14} /> : rejected ? <XCircle size={14} /> : <Clock size={14} />}
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={onApprove}
        className="mt-[14px] w-full text-[13px] font-semibold text-indigo-600 border border-indigo-200 h-[36px] rounded-[8px] hover:bg-indigo-50 flex items-center justify-center gap-[6px] transition">
        {c.hr_approval_status === 'approved' ? 'Update Approval' : 'Review & Approve'} <ArrowRight size={12} />
      </button>
    </SectionCard>
  );
}

function AIInsightsCard({ c }: { c: HRCaseResponse }) {
  const insights = [
    { icon: <Lightbulb size={13} className="text-[#f59e0b]" />, title: 'Document Suggestion', body: `Upload all supporting documents for ${c.visa_type?.code ?? 'this visa'} early to avoid processing delays.` },
    { icon: <AlertCircle size={13} className="text-[#ea580c]" />, title: 'Deadline Alert', body: c.due_date ? `Target submission is ${fmtDate(c.due_date)}. Ensure all approvals are completed 2 weeks before.` : 'Set a target submission date to track deadlines.' },
    { icon: <CheckCircle2 size={13} className="text-[#16a34a]" />, title: 'Case Strength', body: `Case is ${c.progress_percent >= 75 ? 'on track' : c.progress_percent >= 50 ? 'progressing well' : 'in early stages'} at ${c.progress_percent}% complete.` },
  ];
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-[14px] p-[20px]">
      <div className="flex items-center gap-[10px] mb-[16px]">
        <div className="size-[36px] rounded-[10px] bg-indigo-600 flex items-center justify-center">
          <Lightbulb size={16} className="text-white" />
        </div>
        <h2 className="text-[16px] font-bold text-[#0f172a]">AI Insights & Recommendations</h2>
      </div>
      <div className="flex flex-col gap-[10px]">
        {insights.map((ins, i) => (
          <div key={i} className="bg-white rounded-[10px] p-[14px] border border-white/80">
            <div className="flex items-start gap-[10px]">
              {ins.icon}
              <div>
                <p className="text-[13px] font-semibold text-[#111827]">{ins.title}</p>
                <p className="text-[12px] text-[#374151] mt-[3px]">{ins.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentActivityCard({ history, onViewAll }: { history: HRCaseHistoryItem[]; onViewAll: () => void }) {
  if (!history.length) return null;
  return (
    <SectionCard title="Recent Activity" icon={<Activity size={15} />}>
      <div className="flex flex-col">
        {history.slice(0, 5).map((h, i) => (
          <div key={h.id} className={`flex items-start gap-[12px] py-[12px] ${i < Math.min(history.length, 5) - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
            <div className="size-[36px] rounded-full bg-[#f1f5f9] flex items-center justify-center shrink-0">
              <Activity size={14} className="text-[#64748b]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#111827]">
                Status changed to <strong>{h.status.replace(/_/g, ' ')}</strong>
                {h.note ? ` — ${h.note}` : ''}
              </p>
              <p className="text-[11px] text-[#94a3b8] mt-[2px]">{fmtRelative(h.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
      {/* FIX 4: "View Complete History" switches tab instead of showing toast */}
      <button onClick={onViewAll}
        className="mt-[12px] w-full text-[13px] font-medium text-indigo-600 hover:underline flex items-center justify-center gap-[4px]">
        View Complete History ({history.length}) <ArrowRight size={12} />
      </button>
    </SectionCard>
  );
}

function ActionItemsCard() {
  const [items, setItems] = useState([
    { id: '1', title: 'Upload I-129 Form',              priority: 'critical', done: false, note: 'Required for petition filing. Download template from USCIS website.' },
    { id: '2', title: 'Review Employment Letter Draft', priority: 'high',     done: false, note: 'Review and approve the employment letter prepared by HR.' },
    { id: '3', title: 'Schedule Interview with Lawyer', priority: 'medium',   done: false, note: 'Discuss case strategy and timeline with the attorney.' },
    { id: '4', title: 'Upload Passport Copy',           priority: 'low',      done: true,  note: 'Valid passport biographical page uploaded and verified.' },
  ]);

  const toggleItem = (id: string) => setItems(prev => prev.map(i => i.id === id ? { ...i, done: !i.done } : i));

  const priorityColor: Record<string, string> = { critical: '#dc2626', high: '#c2410c', medium: '#a16207', low: '#15803d' };
  const priorityBg:    Record<string, string> = { critical: '#fee2e2', high: '#ffedd5', medium: '#fef9c3', low: '#dcfce7' };

  return (
    <SectionCard title="Action Items" icon={<CheckSquare size={15} />}>
      <div className="flex flex-col">
        {items.map((item, i) => (
          <div key={item.id} className={`flex items-start gap-[12px] py-[14px] ${i < items.length - 1 ? 'border-b border-[#f8fafc]' : ''} ${item.done ? 'opacity-60' : ''}`}>
            {/* Interactive checkbox */}
            <button
              onClick={() => toggleItem(item.id)}
              className={`size-[20px] rounded-[4px] border-2 flex items-center justify-center shrink-0 mt-[2px] transition ${
                item.done ? 'bg-indigo-600 border-indigo-600' : 'border-[#d1d5db] hover:border-indigo-400'
              }`}>
              {item.done && <CheckCircle2 size={12} className="text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-[8px] mb-[3px]">
                <p className={`text-[14px] font-semibold ${item.done ? 'line-through text-[#9ca3af]' : 'text-[#111827]'}`}>
                  {item.title}
                </p>
                {!item.done && (
                  <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: priorityBg[item.priority], color: priorityColor[item.priority] }}>
                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </span>
                )}
                {item.done && <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold bg-[#dcfce7] text-[#15803d] shrink-0">Completed</span>}
              </div>
              <p className="text-[12px] text-[#64748b]">{item.note}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function HistoryTab({ history }: { history: HRCaseHistoryItem[] }) {
  if (!history.length) return <div className="py-[40px] text-center text-[#64748b] text-[14px]">No history yet.</div>;
  return (
    <SectionCard title="Case Status History">
      <div className="flex flex-col">
        {history.map((h, i) => {
          const tok = statusToken(h.status);
          return (
            <div key={h.id} className={`flex items-start gap-[12px] py-[14px] ${i < history.length - 1 ? 'border-b border-[#f8fafc]' : ''}`}>
              <div className="size-[36px] rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Activity size={14} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[8px]">
                  <p className="text-[13px] font-semibold text-[#111827]">
                    {h.stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold shrink-0"
                        style={{ backgroundColor: tok.bg, color: tok.text }}>{tok.label}</span>
                </div>
                {h.note && <p className="text-[12px] text-[#64748b] mt-[2px]">{h.note}</p>}
                <p className="text-[11px] text-[#94a3b8] mt-[3px]">{fmtDateTime(h.created_at)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HRCaseDetail() {
  const navigate              = useNavigate();
  const { applicationId }     = useParams<{ applicationId: string }>();
  const [searchParams] = useSearchParams();
  const [c, setCase]          = useState<HRCaseResponse | null>(null);
  const [history, setHistory] = useState<HRCaseHistoryItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const initialTab = searchParams.get('tab') as TabId | null;
  const [activeTab, setTab] = useState<TabId>(
    initialTab && TABS.some(t => t.id === initialTab) ? initialTab : 'overview'
  );
  const [toasts, setToasts]   = useState<ToastItem[]>([]);

  // FIX 3: Save Draft state
  const [editNotes, setEditNotes] = useState('');
  const [isDirty,   setDirty]     = useState(false);
  const [saving,    setSaving]    = useState(false);

  // Modals
  const [showStatusModal,   setStatusModal]   = useState(false);
  const [showApprovalModal, setApprovalModal] = useState(false);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, tone, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3200);
  }, []);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true); setError(null);
    try {
      const [caseRes, histRes] = await Promise.all([
        createCaseApi.getCase(applicationId),
        createCaseApi.getCaseHistory(applicationId),
      ]);
      setCase(caseRes);
      setEditNotes(caseRes.internal_notes ?? '');
      setHistory(histRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally { setLoading(false); }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  // FIX 3: Save Draft — calls PATCH /hr/cases/:id
  const handleSaveDraft = async () => {
    if (!applicationId || !c) return;
    setSaving(true);
    try {
      const updated = await createCaseApi.updateCase(applicationId, { internal_notes: editNotes });
      setCase(updated);
      setDirty(false);
      pushToast('success', 'Saved', 'Internal notes updated.');
    } catch {
      pushToast('error', 'Save failed', 'Please try again.');
    } finally { setSaving(false); }
  };

  // Change Status
  const handleChangeStatus = async (status: HRCaseStatus, stage: HRCaseStage | null, note: string) => {
    if (!applicationId) return;
    try {
      const updated = await createCaseApi.updateStatus(applicationId, { status, current_stage: stage ?? undefined, note: note || undefined });
      setCase(updated);
      const histRes = await createCaseApi.getCaseHistory(applicationId);
      setHistory(histRes);
      setStatusModal(false);
      pushToast('success', 'Status updated', `Case is now ${status.replace(/_/g, ' ')}.`);
    } catch { pushToast('error', 'Update failed', 'Please try again.'); }
  };

  // HR Approval
  const handleApproval = async (approvalStatus: HRApprovalStatus, notes: string) => {
    if (!applicationId) return;
    try {
      const updated = await createCaseApi.updateApproval(applicationId, { hr_approval_status: approvalStatus, hr_notes: notes || undefined });
      setCase(updated);
      setApprovalModal(false);
      pushToast('success', 'Approval updated', `HR decision: ${approvalStatus.replace(/_/g, ' ')}.`);
    } catch { pushToast('error', 'Approval failed', 'Please try again.'); }
  };

  if (isLoading) return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex flex-col gap-[16px] p-[24px]">
        {[120, 60, 500].map((h, i) => <div key={i} className="bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" style={{ height: h }} />)}
      </div>
    </div>
  );

  if (error || !c) return (
    <div className="flex flex-col h-full items-center justify-center gap-[12px]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <p className="text-[#ef4444] text-[16px] font-medium">{error ?? 'Case not found'}</p>
      <button onClick={() => navigate('/employer/cases')} className="text-indigo-600 text-[14px] hover:underline flex items-center gap-[4px]">
        <ChevronLeft size={13} /> Back to Cases
      </button>
    </div>
  );

  const tok = statusToken(c.status);

  // FIX 2: 3-dot menu items — all wired
  const menuItems: DropdownItem[] = [
    { label: 'View Details',    icon: <Eye size={14} />,        onClick: () => setTab('overview') },
    { label: 'Edit Case Notes', icon: <Edit2 size={14} />,      onClick: () => setTab('overview') },
    { label: 'Change Status',   icon: <RefreshCw size={14} />,  onClick: () => setStatusModal(true) },
    { label: 'HR Approval',     icon: <CheckSquare size={14} />,onClick: () => setApprovalModal(true) },
    { label: 'View History',    icon: <Activity size={14} />,   onClick: () => setTab('history') },
    { label: 'Export CSV',      icon: <Download size={14} />,   onClick: () => { exportCaseCSV(c, history); pushToast('success', 'Exported', 'Case data saved to CSV.'); } },
    { label: 'Withdraw Case',   icon: <XCircle size={14} />,    danger: true, onClick: () => setStatusModal(true) },
  ];

  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

      <PageContent>
        <div className="flex flex-col gap-[0px]">

          {/* Case Header */}
          <div className="bg-white border border-[#f1f5f9] rounded-[16px] mb-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <div className="px-[24px] pt-[20px] pb-[16px]">
              {/* Breadcrumb */}
              <div className="flex items-center gap-[6px] mb-[12px]">
                <button onClick={() => navigate('/employer/cases')}
                  className="flex items-center gap-[4px] text-[13px] text-[#64748b] hover:text-indigo-600 transition">
                  <ChevronLeft size={14} /> Cases
                </button>
                <span className="text-[#d1d5db]">/</span>
                <span className="text-[13px] text-[#374151] truncate max-w-[200px]">{c.case_name}</span>
              </div>

              {/* Title + actions */}
              <div className="flex items-start justify-between gap-[16px]">
                <div className="min-w-0">
                  <div className="flex items-center gap-[12px] flex-wrap mb-[6px]">
                    <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">{c.visa_type?.name ?? c.case_name}</h1>
                    <span className="inline-flex items-center gap-[6px] px-[12px] py-[4px] rounded-full text-[13px] font-semibold"
                          style={{ backgroundColor: tok.bg, color: tok.text }}>
                      <span className="size-[6px] rounded-full" style={{ backgroundColor: tok.dot }} />
                      {tok.label}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#64748b]">Case ID: {c.application_number} · Created {fmtDate(c.created_at)}</p>
                </div>

                <div className="flex items-center gap-[8px] shrink-0">
                  <button onClick={() => navigate('/employer/notifications')}
                    className="size-[38px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
                    <Bell size={15} />
                    <span className="absolute top-[8px] right-[8px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
                  </button>

                  {/* FIX 5: Share — copies URL to clipboard */}
                  <button onClick={() => { navigator.clipboard?.writeText(window.location.href); pushToast('success', 'Link copied'); }}
                    className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
                    <Share2 size={13} /> Share
                  </button>

                  {/* FIX 3: Export — real CSV */}
                  <button onClick={() => { exportCaseCSV(c, history); pushToast('success', 'Exported', 'Case data saved to CSV.'); }}
                    className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
                    <Download size={13} /> Export
                  </button>

                  {/* FIX 3: Save Draft — calls API, disabled when no changes */}
                  <button onClick={() => void handleSaveDraft()} disabled={saving || !isDirty}
                    className="flex items-center gap-[6px] h-[38px] px-[14px] rounded-[10px] text-white text-[13px] font-semibold disabled:opacity-50 transition"
                    style={{ backgroundImage: PRIMARY_GRADIENT }}>
                    <Save size={13} /> {saving ? 'Saving...' : 'Save Draft'}
                  </button>

                  {/* FIX 2: 3-dot — Dropdown with wired actions */}
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

              {/* Meta row */}
              <div className="flex items-center flex-wrap gap-[20px] mt-[12px]">
                {c.employee    && <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><User size={13} className="text-[#94a3b8]" /> Employee: {c.employee.full_name}</span>}
                {c.sponsor_employer && <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><Building2 size={13} className="text-[#94a3b8]" /> Employer: {c.sponsor_employer}</span>}
                {c.attorney    && <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><Scale size={13} className="text-[#94a3b8]" /> Attorney: {c.attorney.full_name}</span>}
                {c.due_date    && <span className="flex items-center gap-[6px] text-[13px] text-[#475569]"><Calendar size={13} className="text-[#94a3b8]" /> Target: {fmtDate(c.due_date)}</span>}
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-[24px] py-[14px] border-t border-[#f8fafc]">
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[13px] text-[#64748b]">Overall Case Progress</span>
                <span className="text-[14px] font-bold text-indigo-600">{c.progress_percent}%</span>
              </div>
              <div className="h-[10px] bg-[#f1f5f9] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                     style={{ width: `${c.progress_percent}%`, backgroundImage: PRIMARY_GRADIENT }} />
              </div>
              <div className="flex items-center gap-[24px] mt-[8px]">
                <span className="text-[11px] text-[#64748b]">Stage: {c.current_stage?.replace(/_/g, ' ') ?? 'Not started'}</span>
                {c.has_action_required && (
                  <span className="text-[11px] text-[#c2410c] font-medium flex items-center gap-[3px]">
                    <AlertCircle size={10} /> {c.action_required_note ?? 'Action required'}
                  </span>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-[0px] px-[24px] border-t border-[#f8fafc] overflow-x-auto">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-[16px] py-[14px] text-[13px] font-medium whitespace-nowrap border-b-2 transition ${
                    activeTab === t.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-[#64748b] hover:text-[#334155]'
                  }`}>
                  {t.label}
                  {t.id === 'history' && history.length > 0 && (
                    <span className="ml-[5px] px-[6px] py-[1px] rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-semibold">{history.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main: sidebar + tab area */}
          <div className="flex flex-col lg:flex-row gap-[20px] items-start">
            <Sidebar c={c} onApprove={() => setApprovalModal(true)} />

            <div className="flex-1 min-w-0 flex flex-col gap-[16px]">
              {activeTab === 'overview' && (
                <>
                  {/* Case Summary with editable internal notes */}
                  <SectionCard title="Case Summary">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] mb-[16px]">
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Basic Information</p>
                        <InfoPair label="Visa Type:"    value={c.visa_type?.name ?? '—'} />
                        <InfoPair label="Case Status:"  value={tok.label}
                          badge={<span className="px-[8px] py-[2px] rounded-full text-[11px] font-semibold" style={{ backgroundColor: tok.bg, color: tok.text }}>{tok.label}</span>} />
                        <InfoPair label="Priority:"     value={c.priority} />
                        <InfoPair label="Created:"      value={fmtDate(c.created_at)} />
                        <InfoPair label="Last Updated:" value={fmtRelative(c.updated_at)} />
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8] mb-[10px]">Employment Details</p>
                        <InfoPair label="Job Title:"   value={c.employee?.job_title ?? '—'} />
                        <InfoPair label="Department:"  value={c.employee?.department ?? '—'} />
                        <InfoPair label="Start Date:"  value={fmtDate(c.start_date)} />
                        <InfoPair label="Target Date:" value={fmtDate(c.due_date)} />
                        <InfoPair label="Sponsor:"     value={c.sponsor_employer ?? '—'} />
                      </div>
                    </div>
                    {/* FIX 3: Editable internal notes — triggers Save Draft */}
                    <div className="border-t border-[#f8fafc] pt-[14px]">
                      <label className="block text-[12px] font-semibold uppercase tracking-[0.04em] text-[#94a3b8] mb-[6px]">
                        Internal Notes (HR only)
                      </label>
                      <textarea
                        value={editNotes}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setEditNotes(e.target.value); setDirty(true); }}
                        placeholder="Add internal notes visible only to HR and attorney..."
                        rows={3}
                        className="w-full border border-[#e5e7eb] rounded-[8px] px-[12px] py-[8px] text-[13px] text-[#111827] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200 transition placeholder:text-[#9ca3af]"
                      />
                      {isDirty && (
                        <p className="text-[11px] text-[#f59e0b] mt-[4px] flex items-center gap-[4px]">
                          <AlertCircle size={10} /> Unsaved changes — click "Save Draft" to save
                        </p>
                      )}
                    </div>
                  </SectionCard>

                  <SectionCard title="Key Milestones">
                    <MilestoneTimeline currentStage={c.current_stage} history={history} />
                  </SectionCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                    <DocumentStatusCard />
                    <ApprovalStatusCard c={c} onApprove={() => setApprovalModal(true)} />
                  </div>

                  <AIInsightsCard c={c} />

                  {/* FIX 4: onViewAll switches to history tab */}
                  <RecentActivityCard history={history} onViewAll={() => setTab('history')} />

                  <ActionItemsCard />
                </>
              )}

              {activeTab === 'history' && <HistoryTab history={history} />}
              
              {activeTab === 'documents' && (
                <HRDocumentManagement
                  embedded
                  applicationId={applicationId ?? ''}
                  caseName={c.case_name}
                  visaType={c.visa_type?.name ?? 'H-1B'}
                  participants={[
                    ...(c.employee ? [{ name: c.employee.full_name, role: 'Employee' }] : []),
                    ...(c.attorney ? [{ name: c.attorney.full_name, role: 'Immigration Lawyer' }] : []),
                    { name: 'HR Manager', role: 'HR Manager' },
                  ]}
                />
              )}
              {['checklist', 'letters', 'lca', 'deadlines', 'access'].includes(activeTab) && (
                <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[40px] text-center shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
                  <p className="text-[14px] font-semibold text-[#0f172a] mb-[4px]">
                    {TABS.find(t => t.id === activeTab)?.label}
                  </p>
                  <p className="text-[13px] text-[#64748b]">This screen is being built next.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </PageContent>

      {/* Auto-save indicator */}
      <div className="fixed bottom-[20px] left-[20px] flex items-center gap-[6px] bg-white border border-[#e5e7eb] rounded-full px-[14px] py-[6px] shadow-sm z-10"
           style={{ color: isDirty ? '#f59e0b' : '#374151' }}>
        <span className={`size-[7px] rounded-full ${isDirty ? 'bg-[#f59e0b] animate-pulse' : 'bg-[#22c55e]'}`} />
        <span className="text-[12px]">{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
      </div>

      <ChangeStatusModal open={showStatusModal} current={c.status} onClose={() => setStatusModal(false)} onSave={handleChangeStatus} />
      <ApprovalModal open={showApprovalModal} current={c.hr_approval_status} onClose={() => setApprovalModal(false)} onSave={handleApproval} />
    </div>
  );
}