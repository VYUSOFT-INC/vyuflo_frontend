// // src/pages/hr/HRCasesList.tsx
// //
// // HR — Cases List (Screen 09)
// // Route: /employer/cases
// // Figma: 09 - Cases List (node 0:1399)
// //
// // Layout (from Figma):
// //   ┌─ PageHeader: "Immigration Cases" + Export All / New Case ──────────────┐
// //   ├─ Stats: Total Cases | In Progress | Completed | Draft ────────────────┤
// //   ├─ Filters: Search | Status | Visa Type | Sort ──────────────────────────┤
// //   ├─ Active Cases (card grid, 3 cols) ─────────────────────────────────────┤
// //   ├─ Completed Cases (table) ──────────────────────────────────────────────┤
// //   ├─ Draft Cases (list row) ───────────────────────────────────────────────┤
// //   └─ Quick Actions ────────────────────────────────────────────────────────┘

// import { useState, useMemo, useCallback, useEffect, type ReactNode } from 'react';
// import { useNavigate } from 'react-router-dom';
// import {
//     // ArrowRight,
//   Plus, Download, Search, ChevronDown, LayoutGrid, List,
//   Briefcase, FileText, Clock, AlertCircle, CheckCircle2,
//   MoreVertical, Trash2, Edit2, Users,
//   Bell, X, Info, AlertTriangle, XCircle,
// } from 'lucide-react';
// import { PageHeader, PageContent } from '../../components/layout/Pageheader';
// import { createCaseApi } from '../../api/hr/createCase.api';
// import type { HRCaseResponse, HRCaseStatus } from '../../types/hr/createCase.types';
// import { getFileUrl } from '../../utils/fileUrl';

// const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// // ─────────────────────────────────────────────────────────────────────────────
// // HELPERS
// // ─────────────────────────────────────────────────────────────────────────────

// function fmtDate(iso?: string | null): string {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
// }

// function fmtRelative(iso?: string | null): string {
//   if (!iso) return '';
//   const diff = Date.now() - new Date(iso).getTime();
//   const days = Math.floor(diff / 86400000);
//   if (days === 0) return 'Today';
//   if (days === 1) return 'Yesterday';
//   if (days < 30) return `${days} days ago`;
//   if (days < 365) return `${Math.floor(days / 30)} months ago`;
//   return fmtDate(iso);
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

// function statusToken(s: HRCaseStatus): { bg: string; text: string; dot: string; label: string; topBar: string } {
//   switch (s) {
//     case 'in_progress':   return { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'In Progress',   topBar: '#3b82f6' };
//     case 'action_needed': return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Action Required', topBar: '#f97316' };
//     case 'rfe_response':  return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'RFE Received',  topBar: '#f97316' };
//     case 'submitted':     return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Submitted',     topBar: '#22c55e' };
//     case 'approved':      return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Approved',      topBar: '#22c55e' };
//     case 'rejected':      return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Rejected',      topBar: '#ef4444' };
//     case 'withdrawn':     return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Withdrawn',     topBar: '#94a3b8' };
//     default:              return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft',         topBar: '#94a3b8' };
//   }
// }

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
//               <button onClick={() => onDismiss(t.id)} className="text-[#94a3b8] hover:text-[#475569]"><X size={14} /></button>
//             </div>
//           </div>
//         );
//       })}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ACTIVE CASE CARD  (Figma: case-card-1/2/3 pattern)
// // ─────────────────────────────────────────────────────────────────────────────

// function ActiveCaseCard({ c, onOpen }: { c: HRCaseResponse; onOpen: () => void }) {
//   const tok = statusToken(c.status);
// //   const empAvatar = getFileUrl(c.employee?.profile_picture_url ?? null);
//   const primaryBtn = c.status === 'action_needed' ? 'Take Action' : 'Continue Case';

//   return (
//     <div className="bg-white border border-[#f1f5f9] rounded-[14px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex flex-col">
//       {/* Top color bar */}
//       <div className="h-[6px]" style={{ backgroundColor: tok.topBar }} />

//       <div className="flex-1 p-[20px] flex flex-col gap-[14px]">
//         {/* Header */}
//         <div className="flex items-start justify-between gap-[8px]">
//           <div className="min-w-0">
//             <div className="flex items-center gap-[8px] mb-[6px]">
//               <span className="inline-flex items-center px-[8px] py-[3px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
//                 {c.visa_type?.code ?? '—'}
//               </span>
//               <span className="inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold"
//                     style={{ backgroundColor: tok.bg, color: tok.text }}>
//                 <span className="size-[5px] rounded-full shrink-0" style={{ backgroundColor: tok.dot }} />
//                 {tok.label}
//               </span>
//             </div>
//             <h3 className="text-[15px] font-bold text-[#0f172a] tracking-[-0.3px] truncate">{c.visa_type?.name ?? c.case_name}</h3>
//             <p className="text-[12px] text-[#94a3b8] mt-[2px]">Case #{c.application_number}</p>
//           </div>
//           <button className="size-[28px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] shrink-0">
//             <MoreVertical size={15} />
//           </button>
//         </div>

//         {/* Progress */}
//         <div>
//           <div className="flex items-center justify-between mb-[6px]">
//             <span className="text-[12px] text-[#64748b]">Overall Progress</span>
//             <span className="text-[12px] font-semibold text-[#0f172a]">{c.progress_percent}%</span>
//           </div>
//           <div className="h-[8px] bg-[#f1f5f9] rounded-full overflow-hidden">
//             <div className="h-full rounded-full transition-all"
//                  style={{ width: `${c.progress_percent}%`, backgroundColor: tok.topBar }} />
//           </div>
//         </div>

//         {/* Status lines */}
//         <div className="flex flex-col gap-[6px]">
//           {c.employee && (
//             <div className="flex items-center gap-[8px] text-[12px] text-[#64748b]">
//               <Users size={12} className="shrink-0" />
//               <span className="truncate">Employee: {c.employee.full_name}</span>
//             </div>
//           )}
//           {c.due_date && (
//             <div className="flex items-center gap-[8px] text-[12px]"
//                  style={{ color: new Date(c.due_date) < new Date() ? '#dc2626' : '#64748b' }}>
//               <Clock size={12} className="shrink-0" />
//               <span>Deadline: {fmtDate(c.due_date)}</span>
//             </div>
//           )}
//           {c.has_action_required && (
//             <div className="flex items-center gap-[8px] text-[12px] text-[#c2410c]">
//               <AlertCircle size={12} className="shrink-0" />
//               <span className="truncate">{c.action_required_note ?? 'Action required'}</span>
//             </div>
//           )}
//         </div>

//         {/* Participants */}
//         <div>
//           <p className="text-[11px] text-[#94a3b8] font-semibold uppercase tracking-[0.04em] mb-[6px]">Participants</p>
//           <div className="flex items-center gap-[-4px]">
//             {[c.employee, c.attorney].filter(Boolean).map((p, i) => {
//               const name = p!.full_name;
//               const src  = getFileUrl((p as { profile_picture_url?: string | null }).profile_picture_url ?? null);
//               return src ? (
//                 <img key={i} src={src} alt={name}
//                      className="size-[28px] rounded-full object-cover border-2 border-white -ml-[6px] first:ml-0" />
//               ) : (
//                 <div key={i} className="size-[28px] rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white -ml-[6px] first:ml-0"
//                      style={{ backgroundColor: avatarColor(name) }}>
//                   {initials(name)}
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>

//       {/* Action buttons */}
//       <div className="px-[20px] pb-[16px] flex items-center gap-[8px]">
//         <button onClick={onOpen}
//           className="flex-1 h-[40px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
//           style={{ backgroundImage: PRIMARY_GRADIENT }}>
//           {primaryBtn}
//         </button>
//         <button className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
//           <Download size={14} />
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // COMPLETED CASES TABLE  (Figma: completed-cases tbody rows)
// // ─────────────────────────────────────────────────────────────────────────────

// function CompletedCasesTable({ cases, onView }: { cases: HRCaseResponse[]; onView: (id: string) => void }) {
//   if (!cases.length) return null;
//   return (
//     <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
//       <div className="px-[24px] pt-[20px] pb-[14px] flex items-center justify-between">
//         <h2 className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Cases</h2>
//         <span className="text-[13px] text-[#64748b]">{cases.length} cases</span>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[700px]">
//           <thead>
//             <tr className="border-t border-b border-[#f1f5f9] bg-[#f9fafb]">
//               {['Case Details', 'Visa Type', 'Status', 'Completed Date', 'Employee', 'Actions'].map(h => (
//                 <th key={h} className="px-[20px] py-[12px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748b]">
//                   {h}
//                 </th>
//               ))}
//             </tr>
//           </thead>
//           <tbody>
//             {cases.map(c => {
//               const tok = statusToken(c.status);
//               return (
//                 <tr key={c.id} className="border-b border-[#f8fafc] hover:bg-[#fafbfc] transition">
//                   <td className="px-[20px] py-[14px]">
//                     <p className="text-[14px] font-semibold text-[#0f172a] truncate max-w-[200px]">{c.case_name}</p>
//                     <p className="text-[12px] text-[#94a3b8]">#{c.application_number}</p>
//                   </td>
//                   <td className="px-[20px] py-[14px]">
//                     <span className="inline-flex items-center px-[8px] py-[3px] rounded-full bg-[#f1f5f9] text-[12px] font-medium text-[#475569]">
//                       {c.visa_type?.code ?? '—'}
//                     </span>
//                   </td>
//                   <td className="px-[20px] py-[14px]">
//                     <span className="inline-flex items-center gap-[5px] text-[12px] font-medium" style={{ color: tok.text }}>
//                       <CheckCircle2 size={13} /> {tok.label}
//                     </span>
//                   </td>
//                   <td className="px-[20px] py-[14px]">
//                     <p className="text-[13px] text-[#1f2937]">{fmtDate(c.updated_at)}</p>
//                     <p className="text-[11px] text-[#94a3b8]">{fmtRelative(c.updated_at)}</p>
//                   </td>
//                   <td className="px-[20px] py-[14px]">
//                     {c.employee && (
//                       <div className="flex items-center gap-[8px]">
//                         <div className="size-[26px] rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
//                              style={{ backgroundColor: avatarColor(c.employee.full_name) }}>
//                           {initials(c.employee.full_name)}
//                         </div>
//                         <span className="text-[12px] text-[#475569] truncate">{c.employee.full_name}</span>
//                       </div>
//                     )}
//                   </td>
//                   <td className="px-[20px] py-[14px]">
//                     <div className="flex items-center gap-[8px]">
//                       <button onClick={() => onView(c.id)}
//                         className="text-[13px] font-medium text-indigo-600 hover:underline">View</button>
//                       <button className="text-[13px] font-medium text-[#64748b] hover:text-[#334155]">Download</button>
//                     </div>
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // DRAFT CASE ROW  (Figma: draft-cases)
// // ─────────────────────────────────────────────────────────────────────────────

// function DraftCaseRow({ c, onResume, onDelete }: {
//   c: HRCaseResponse;
//   onResume: () => void;
//   onDelete: () => void;
// }) {
//   return (
//     <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] flex items-center gap-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
//       <div className="size-[48px] rounded-[12px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
//         <FileText size={20} className="text-[#64748b]" />
//       </div>
//       <div className="flex-1 min-w-0">
//         <div className="flex items-center gap-[8px] mb-[3px]">
//           <h3 className="text-[15px] font-semibold text-[#0f172a] truncate">{c.case_name}</h3>
//           <span className="px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#64748b]">Draft</span>
//         </div>
//         <p className="text-[12px] text-[#94a3b8]">#{c.application_number}</p>
//         <p className="text-[11px] text-[#94a3b8] mt-[2px]">Last edited: {fmtDate(c.updated_at)}</p>
//         <div className="flex items-center gap-[12px] mt-[4px]">
//           <span className="text-[11px] text-[#64748b] flex items-center gap-[3px]">
//             <FileText size={10} /> {c.progress_percent}% complete
//           </span>
//         </div>
//       </div>
//       <div className="flex items-center gap-[10px] shrink-0">
//         <button onClick={onDelete}
//           className="h-[38px] px-[14px] rounded-[10px] border border-[#fecaca] text-[#dc2626] text-[13px] font-medium flex items-center gap-[6px] hover:bg-[#fef2f2] transition">
//           <Trash2 size={13} /> Delete
//         </button>
//         <button onClick={onResume}
//           className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
//           style={{ backgroundImage: PRIMARY_GRADIENT }}>
//           Resume Editing
//         </button>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // QUICK ACTIONS  (Figma: quick-actions)
// // ─────────────────────────────────────────────────────────────────────────────

// function QuickActions({ onNewCase, onUpload, onDeadlines, onExport }: {
//   onNewCase: () => void; onUpload: () => void; onDeadlines: () => void; onExport: () => void;
// }) {
//   const actions = [
//     { icon: <Plus size={20} />, title: 'Start New Case',    sub: 'Begin a new visa application',    bg: '#eef2ff', color: '#4f46e5', onClick: onNewCase },
//     { icon: <FileText size={20} />, title: 'Upload Documents', sub: 'Add files to your cases',     bg: '#f0fdf4', color: '#16a34a', onClick: onUpload },
//     { icon: <Clock size={20} />, title: 'View Deadlines',   sub: 'Check upcoming dates',            bg: '#fff7ed', color: '#ea580c', onClick: onDeadlines },
//     { icon: <Download size={20} />, title: 'Export Report', sub: 'Download case summary',           bg: '#faf5ff', color: '#7e22ce', onClick: onExport },
//   ];
//   return (
//     <div>
//       <h2 className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px] mb-[16px]">Quick Actions</h2>
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
//         {actions.map(a => (
//           <button key={a.title} onClick={a.onClick}
//             className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] text-left hover:shadow-md hover:-translate-y-[1px] transition-all shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
//             <div className="size-[44px] rounded-[12px] flex items-center justify-center mb-[12px]"
//                  style={{ backgroundColor: a.bg, color: a.color }}>
//               {a.icon}
//             </div>
//             <p className="text-[14px] font-semibold text-[#0f172a]">{a.title}</p>
//             <p className="text-[12px] text-[#64748b] mt-[2px]">{a.sub}</p>
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // LOADING SKELETON
// // ─────────────────────────────────────────────────────────────────────────────

// function LoadingSkeleton() {
//   return (
//     <div className="flex flex-col gap-[24px]">
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
//         {[0,1,2,3].map(i => <div key={i} className="h-[110px] bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" />)}
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
//         {[0,1,2].map(i => <div key={i} className="h-[360px] bg-white border border-[#f1f5f9] rounded-[14px] animate-pulse" />)}
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // PAGE
// // ─────────────────────────────────────────────────────────────────────────────

// export default function HRCasesList() {
//   const navigate = useNavigate();
//   const [allCases, setAllCases]     = useState<HRCaseResponse[]>([]);
//   const [kpi, setKpi]               = useState({ total: 0, total_active: 0, action_needed: 0, approved_ytd: 0, expiring_soon: 0 });
//   const [isLoading, setIsLoading]   = useState(true);
//   const [error, setError]           = useState<string | null>(null);
//   const [search, setSearch]         = useState('');
//   const [statusFilter, setStatus]   = useState<HRCaseStatus | 'all'>('all');
//   const [visaFilter, setVisa]       = useState('all');
//   const [viewMode]                  = useState<'grid' | 'list'>('grid');
//   const [toasts, setToasts]         = useState<ToastItem[]>([]);

//   const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
//     const id = `${Date.now()}-${Math.random()}`;
//     setToasts(prev => [...prev, { id, tone, title, message }]);
//     setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3200);
//   }, []);

//   const load = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const res = await createCaseApi.listCases({ limit: 100 });
//       setAllCases(res.items);
//       setKpi({
//         total:         res.total,
//         total_active:  res.total_active,
//         action_needed: res.action_needed,
//         approved_ytd:  res.approved_ytd,
//         expiring_soon: res.expiring_soon,
//       });
//     } catch (err: unknown) {
//       setError(err instanceof Error ? err.message : 'Failed to load cases');
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   useEffect(() => { void load(); }, [load]);

//   // Client-side filter
//   const filtered = useMemo(() => {
//     const q = search.toLowerCase();
//     return allCases.filter(c => {
//       if (q && !`${c.case_name} ${c.application_number} ${c.employee?.full_name ?? ''} ${c.visa_type?.code ?? ''}`.toLowerCase().includes(q)) return false;
//       if (statusFilter !== 'all' && c.status !== statusFilter) return false;
//       if (visaFilter !== 'all' && c.visa_type?.code !== visaFilter) return false;
//       return true;
//     });
//   }, [allCases, search, statusFilter, visaFilter]);

//   const activeCases    = filtered.filter(c => ['in_progress', 'action_needed', 'rfe_response', 'submitted'].includes(c.status));
//   const completedCases = filtered.filter(c => ['approved', 'rejected', 'withdrawn'].includes(c.status));
//   const draftCases     = filtered.filter(c => c.status === 'draft');

//   const visaTypes = [...new Set(allCases.map(c => c.visa_type?.code).filter(Boolean) as string[])];

//   const STATUSES: Array<{ value: HRCaseStatus | 'all'; label: string }> = [
//     { value: 'all',           label: 'All Statuses' },
//     { value: 'in_progress',   label: 'In Progress' },
//     { value: 'action_needed', label: 'Action Needed' },
//     { value: 'submitted',     label: 'Submitted' },
//     { value: 'approved',      label: 'Approved' },
//     { value: 'rejected',      label: 'Rejected' },
//     { value: 'draft',         label: 'Draft' },
//   ];

//   const statCards = [
//     { label: 'Total Cases',   value: kpi.total,         sub: 'All time',              icon: <Briefcase size={20} />, bg: '#eff6ff', color: '#2563eb' },
//     { label: 'In Progress',   value: kpi.total_active,  sub: 'Active applications',   icon: <Clock size={20} />,     bg: '#f0fdf4', color: '#16a34a' },
//     { label: 'Completed',     value: kpi.approved_ytd,  sub: 'Successfully approved', icon: <CheckCircle2 size={20}/>, bg: '#dcfce7', color: '#15803d' },
//     { label: 'Draft',         value: draftCases.length, sub: 'Saved for later',       icon: <Edit2 size={20} />,     bg: '#f8fafc', color: '#64748b' },
//   ];

//   const headerActions = (
//     <>
//       <button onClick={() => navigate('/employer/notifications')}
//         className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
//         <Bell size={16} />
//         <span className="absolute top-[9px] right-[9px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
//       </button>
//       <button onClick={() => pushToast('info', 'Export coming soon')}
//         className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
//         <Download size={14} /> Export All
//       </button>
//       <button onClick={() => navigate('/employer/cases/new')}
//         className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold"
//         style={{ backgroundImage: PRIMARY_GRADIENT }}>
//         <Plus size={14} /> New Case
//       </button>
//     </>
//   );

//   return (
//     <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
//       <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

//       <PageHeader
//         title="Immigration Cases"
//         subtitle="Manage all your visa applications and track their progress in one place."
//         showSearch={false}
//         showBell={false}
//         actions={headerActions}
//       />

//       <PageContent>
//         {isLoading ? <LoadingSkeleton /> : error ? (
//           <div className="flex flex-col items-center justify-center py-[80px] text-center">
//             <p className="text-[#ef4444] text-[16px] font-medium mb-[12px]">{error}</p>
//             <button onClick={() => void load()} className="text-indigo-600 text-[14px] hover:underline">Try again</button>
//           </div>
//         ) : (
//           <div className="flex flex-col gap-[28px]">

//             {/* Stats */}
//             <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
//               {statCards.map(s => (
//                 <div key={s.label} className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
//                   <div className="flex items-center gap-[14px]">
//                     <div className="size-[44px] rounded-[12px] flex items-center justify-center shrink-0"
//                          style={{ backgroundColor: s.bg, color: s.color }}>
//                       {s.icon}
//                     </div>
//                     <div>
//                       <p className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">{s.value.toLocaleString()}</p>
//                       <p className="text-[12px] font-semibold text-[#334151]">{s.label}</p>
//                       <p className="text-[11px] text-[#94a3b8]">{s.sub}</p>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>

//             {/* Filters */}
//             <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
//               <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px] flex-1">
//                 {/* Search */}
//                 <div className="relative w-full sm:w-[260px]">
//                   <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
//                   <input value={search} onChange={e => setSearch(e.target.value)}
//                     placeholder="Search cases..."
//                     className="w-full h-[44px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[36px] pr-[12px] text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
//                 </div>
//                 {/* Status filter */}
//                 <div className="relative">
//                   <select value={statusFilter} onChange={e => setStatus(e.target.value as HRCaseStatus | 'all')}
//                     className="appearance-none h-[44px] min-w-[160px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
//                     {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
//                   </select>
//                   <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
//                 </div>
//                 {/* Visa filter */}
//                 {visaTypes.length > 0 && (
//                   <div className="relative">
//                     <select value={visaFilter} onChange={e => setVisa(e.target.value)}
//                       className="appearance-none h-[44px] min-w-[150px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
//                       <option value="all">All Visa Types</option>
//                       {visaTypes.map(v => <option key={v} value={v}>{v}</option>)}
//                     </select>
//                     <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
//                   </div>
//                 )}
//               </div>
//               {/* View toggle — grid only for now */}
//               <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[8px] p-[3px]">
//                 <button className={`size-[36px] rounded-[6px] flex items-center justify-center transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b]'}`}>
//                   <LayoutGrid size={15} />
//                 </button>
//                 <button className={`size-[36px] rounded-[6px] flex items-center justify-center transition ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b]'}`}>
//                   <List size={15} />
//                 </button>
//               </div>
//             </div>

//             {/* Active Cases */}
//             {activeCases.length > 0 && (
//               <div>
//                 <div className="flex items-center justify-between mb-[16px]">
//                   <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Active Cases</h2>
//                   <span className="text-[13px] text-[#64748b]">{activeCases.length} cases</span>
//                 </div>
//                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
//                   {activeCases.map(c => (
//                     <ActiveCaseCard key={c.id} c={c}
//                       onOpen={() => navigate(`/employer/cases/${c.id}`)} />
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Completed Cases */}
//             {completedCases.length > 0 && (
//               <div>
//                 <div className="flex items-center justify-between mb-[16px]">
//                   <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Cases</h2>
//                   <span className="text-[13px] text-[#64748b]">{completedCases.length} cases</span>
//                 </div>
//                 <CompletedCasesTable cases={completedCases} onView={id => navigate(`/employer/cases/${id}`)} />
//               </div>
//             )}

//             {/* Draft Cases */}
//             {draftCases.length > 0 && (
//               <div>
//                 <div className="flex items-center justify-between mb-[16px]">
//                   <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Draft Cases</h2>
//                   <span className="text-[13px] text-[#64748b]">{draftCases.length} case{draftCases.length > 1 ? 's' : ''}</span>
//                 </div>
//                 <div className="flex flex-col gap-[10px]">
//                   {draftCases.map(c => (
//                     <DraftCaseRow key={c.id} c={c}
//                       onResume={() => navigate(`/employer/cases/${c.id}`)}
//                       onDelete={() => pushToast('info', 'Delete coming soon')}
//                     />
//                   ))}
//                 </div>
//               </div>
//             )}

//             {/* Empty */}
//             {filtered.length === 0 && (
//               <div className="flex flex-col items-center justify-center py-[60px] text-center bg-white border border-[#f1f5f9] rounded-[16px]">
//                 <div className="size-[56px] rounded-full bg-[#f1f5f9] flex items-center justify-center mb-[14px]">
//                   <Briefcase size={24} className="text-[#94a3b8]" />
//                 </div>
//                 <p className="text-[16px] font-semibold text-[#0f172a] mb-[4px]">
//                   {search || statusFilter !== 'all' ? 'No cases match your filters' : 'No cases yet'}
//                 </p>
//                 <p className="text-[13px] text-[#64748b] mb-[16px]">
//                   {search || statusFilter !== 'all' ? 'Try clearing your filters' : 'Create your first immigration case to get started'}
//                 </p>
//                 <button onClick={() => navigate('/employer/cases/new')}
//                   className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold"
//                   style={{ backgroundImage: PRIMARY_GRADIENT }}>
//                   <Plus size={14} /> New Case
//                 </button>
//               </div>
//             )}

//             {/* Quick Actions */}
//             <QuickActions
//               onNewCase={() => navigate('/employer/cases/new')}
//               onUpload={() => pushToast('info', 'Upload coming soon')}
//               onDeadlines={() => navigate('/employer/deadlines')}
//               onExport={() => pushToast('info', 'Export coming soon')}
//             />
//           </div>
//         )}
//       </PageContent>
//     </div>
//   );
// }


// src/pages/hr/HRCasesList.tsx
// Fixed:
//   1. Grid/List toggle — viewMode now has a setter: const [viewMode, setViewMode]
//   2. 3-dot dropdown — Dropdown component added, wired to each card
//   3. Download/Export — real CSV export functions, Export All button wired

import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, ChevronDown, LayoutGrid, List,
  Briefcase, FileText, Clock, AlertCircle, CheckCircle2,
  MoreVertical, Trash2, Edit2, Users, Eye,
  Bell, X, Info, AlertTriangle, XCircle,
} from 'lucide-react';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { createCaseApi } from '../../api/hr/createCase.api';
import type { HRCaseResponse, HRCaseStatus } from '../../types/hr/createCase.types';
import { getFileUrl } from '../../utils/fileUrl';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtRelative(iso?: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return fmtDate(iso);
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
// FIX 1: CSV EXPORT — replaces all "coming soon" stubs
// ─────────────────────────────────────────────────────────────────────────────

function exportCasesCSV(cases: HRCaseResponse[], filename = 'hr-cases') {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Case Name', 'Case #', 'Visa Type', 'Status', 'Employee', 'Attorney', 'Progress %', 'Target Date', 'Created'];
  const rows = cases.map(c => [
    c.case_name,
    c.application_number,
    c.visa_type?.code ?? '',
    c.status,
    c.employee?.full_name ?? '',
    c.attorney?.full_name ?? '',
    String(c.progress_percent),
    c.due_date ?? '',
    c.created_at,
  ].map(v => esc(String(v))).join(','));

  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href:     url,
    download: `${filename}-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────────────────────
// FIX 2: DROPDOWN — click-outside aware, used for 3-dot menus
// ─────────────────────────────────────────────────────────────────────────────

interface DropdownItem {
  label:    string;
  icon?:    ReactNode;
  danger?:  boolean;
  onClick:  () => void;
}

function Dropdown({ trigger, items }: { trigger: ReactNode; items: DropdownItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <div onClick={e => { e.stopPropagation(); setOpen(v => !v); }}>
        {trigger}
      </div>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-50 bg-white border border-[#e5e7eb] rounded-[10px] shadow-xl w-[180px] py-[4px] overflow-hidden">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-[10px] px-[14px] py-[9px] text-[13px] font-medium text-left hover:bg-[#f8fafc] transition ${
                item.danger ? 'text-[#dc2626] hover:bg-[#fef2f2]' : 'text-[#374151]'
              }`}>
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
// CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// TOKENS
// ─────────────────────────────────────────────────────────────────────────────

function statusToken(s: HRCaseStatus): { bg: string; text: string; dot: string; label: string; topBar: string } {
  switch (s) {
    case 'in_progress':   return { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'In Progress',    topBar: '#3b82f6' };
    case 'action_needed': return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Action Required', topBar: '#f97316' };
    case 'rfe_response':  return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'RFE Received',   topBar: '#f97316' };
    case 'submitted':     return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Submitted',      topBar: '#22c55e' };
    case 'approved':      return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Approved',       topBar: '#22c55e' };
    case 'rejected':      return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Rejected',       topBar: '#ef4444' };
    case 'withdrawn':     return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Withdrawn',      topBar: '#94a3b8' };
    default:              return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft',          topBar: '#94a3b8' };
  }
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
              <button onClick={() => onDismiss(t.id)} className="text-[#94a3b8] hover:text-[#475569]"><X size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE CASE CARD — FIX: 3-dot Dropdown + Download wired
// ─────────────────────────────────────────────────────────────────────────────

function ActiveCaseCard({ c, onOpen, onWithdraw }: {
  c: HRCaseResponse;
  onOpen: () => void;
  onWithdraw: (c: HRCaseResponse) => void;
}) {
  const navigate = useNavigate();
  const tok = statusToken(c.status);
  const primaryBtn = c.status === 'action_needed' ? 'Take Action' : 'Continue Case';

  // FIX 2: 3-dot menu items — each actually does something
  const menuItems: DropdownItem[] = [
    { label: 'View Details', icon: <Eye size={14} />,     onClick: onOpen },
    { label: 'Edit Case',    icon: <Edit2 size={14} />,   onClick: () => navigate(`/employer/cases/${c.id}?edit=true`) },
    { label: 'Export CSV',   icon: <Download size={14} />,onClick: () => exportCasesCSV([c], `case-${c.application_number}`) },
    { label: 'Withdraw',     icon: <Trash2 size={14} />,  danger: true, onClick: () => onWithdraw(c) },
  ];

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex flex-col">
      <div className="h-[6px]" style={{ backgroundColor: tok.topBar }} />

      <div className="flex-1 p-[20px] flex flex-col gap-[14px]">
        <div className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[8px] mb-[6px]">
              <span className="inline-flex items-center px-[8px] py-[3px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
                {c.visa_type?.code ?? '—'}
              </span>
              <span className="inline-flex items-center gap-[5px] px-[8px] py-[3px] rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                <span className="size-[5px] rounded-full shrink-0" style={{ backgroundColor: tok.dot }} />
                {tok.label}
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[#0f172a] tracking-[-0.3px] truncate">{c.visa_type?.name ?? c.case_name}</h3>
            <p className="text-[12px] text-[#94a3b8] mt-[2px]">Case #{c.application_number}</p>
          </div>

          {/* FIX 2: 3-dot now opens Dropdown */}
          <Dropdown
            trigger={
              <button className="size-[28px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] shrink-0">
                <MoreVertical size={15} />
              </button>
            }
            items={menuItems}
          />
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-[6px]">
            <span className="text-[12px] text-[#64748b]">Overall Progress</span>
            <span className="text-[12px] font-semibold text-[#0f172a]">{c.progress_percent}%</span>
          </div>
          <div className="h-[8px] bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
                 style={{ width: `${c.progress_percent}%`, backgroundColor: tok.topBar }} />
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-col gap-[6px]">
          {c.employee && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#64748b]">
              <Users size={12} className="shrink-0" />
              <span className="truncate">Employee: {c.employee.full_name}</span>
            </div>
          )}
          {c.due_date && (
            <div className="flex items-center gap-[8px] text-[12px]"
                 style={{ color: new Date(c.due_date) < new Date() ? '#dc2626' : '#64748b' }}>
              <Clock size={12} className="shrink-0" />
              <span>Deadline: {fmtDate(c.due_date)}</span>
            </div>
          )}
          {c.has_action_required && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#c2410c]">
              <AlertCircle size={12} className="shrink-0" />
              <span className="truncate">{c.action_required_note ?? 'Action required'}</span>
            </div>
          )}
        </div>

        {/* Participants */}
        <div>
          <p className="text-[11px] text-[#94a3b8] font-semibold uppercase tracking-[0.04em] mb-[6px]">Participants</p>
          <div className="flex items-center">
            {[c.employee, c.attorney].filter(Boolean).map((p, i) => {
              const name = p!.full_name;
              const src  = getFileUrl((p as { profile_picture_url?: string | null }).profile_picture_url ?? null);
              return src ? (
                <img key={i} src={src} alt={name}
                     className="size-[28px] rounded-full object-cover border-2 border-white -ml-[6px] first:ml-0" />
              ) : (
                <div key={i} className="size-[28px] rounded-full flex items-center justify-center text-white text-[9px] font-bold border-2 border-white -ml-[6px] first:ml-0"
                     style={{ backgroundColor: avatarColor(name) }}>
                  {initials(name)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons — FIX 3: Download now exports CSV */}
      <div className="px-[20px] pb-[16px] flex items-center gap-[8px]">
        <button onClick={onOpen}
          className="flex-1 h-[40px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          {primaryBtn}
        </button>
        <button
          onClick={() => navigate(`/employer/cases/${c.id}?tab=documents`)}
          title="View Documents"
          className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
          <FileText size={14}/>
        </button>
        <button
          onClick={() => exportCasesCSV([c], `case-${c.application_number}`)}
          title="Download CSV"
          className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST ROW — shown when viewMode === 'list'
// ─────────────────────────────────────────────────────────────────────────────

function CaseListRow({ c, onOpen, onWithdraw }: {
  c: HRCaseResponse;
  onOpen: () => void;
  onWithdraw: (c: HRCaseResponse) => void;
}) {
  const navigate = useNavigate();
  const tok = statusToken(c.status);

  const menuItems: DropdownItem[] = [
    { label: 'View Details', icon: <Eye size={14} />,     onClick: onOpen },
    { label: 'Edit Case',    icon: <Edit2 size={14} />,   onClick: () => navigate(`/employer/cases/${c.id}?edit=true`) },
    { label: 'Export CSV',   icon: <Download size={14} />,onClick: () => exportCasesCSV([c], `case-${c.application_number}`) },
    { label: 'Withdraw',     icon: <Trash2 size={14} />,  danger: true, onClick: () => onWithdraw(c) },
  ];

  return (
    <div className="flex items-center gap-[14px] px-[20px] py-[13px] border-b border-[#f8fafc] last:border-b-0 hover:bg-[#fafbfc] transition">
      {/* Status bar accent */}
      <div className="w-[3px] h-[36px] rounded-full shrink-0" style={{ backgroundColor: tok.topBar }} />

      {/* Case name */}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#0f172a] truncate">{c.case_name}</p>
        <p className="text-[11px] text-[#94a3b8]">#{c.application_number}</p>
      </div>

      {/* Visa */}
      <span className="hidden sm:inline-flex px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[12px] font-semibold text-[#475569] shrink-0">
        {c.visa_type?.code ?? '—'}
      </span>

      {/* Status badge */}
      <span className="hidden md:inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[12px] font-semibold shrink-0"
            style={{ backgroundColor: tok.bg, color: tok.text }}>
        <span className="size-[5px] rounded-full" style={{ backgroundColor: tok.dot }} />
        {tok.label}
      </span>

      {/* Employee */}
      {c.employee && (
        <span className="hidden lg:inline text-[13px] text-[#64748b] truncate max-w-[140px] shrink-0">
          {c.employee.full_name}
        </span>
      )}

      {/* Progress */}
      <div className="hidden lg:flex items-center gap-[8px] w-[100px] shrink-0">
        <div className="flex-1 h-[5px] bg-[#f1f5f9] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${c.progress_percent}%`, backgroundColor: tok.topBar }} />
        </div>
        <span className="text-[11px] text-[#64748b] w-[28px] text-right">{c.progress_percent}%</span>
      </div>

      {/* Target date */}
      <span className="hidden xl:inline text-[12px] text-[#64748b] shrink-0">{fmtDate(c.due_date)}</span>

      {/* Actions */}
      <div className="flex items-center gap-[4px] shrink-0">
        <button onClick={onOpen} title="View" className="size-[30px] rounded-[7px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9]">
          <Eye size={14} />
        </button>
        <button onClick={() => exportCasesCSV([c], `case-${c.application_number}`)} title="Export CSV"
          className="size-[30px] rounded-[7px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9]">
          <Download size={14} />
        </button>
        <Dropdown
          trigger={
            <button className="size-[30px] rounded-[7px] flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9]">
              <MoreVertical size={15} />
            </button>
          }
          items={menuItems}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED CASES TABLE
// ─────────────────────────────────────────────────────────────────────────────

function CompletedCasesTable({ cases, onView }: { cases: HRCaseResponse[]; onView: (id: string) => void }) {
  if (!cases.length) return null;
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="px-[24px] pt-[20px] pb-[14px] flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Cases</h2>
        <span className="text-[13px] text-[#64748b]">{cases.length} cases</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-t border-b border-[#f1f5f9] bg-[#f9fafb]">
              {['Case Details', 'Visa Type', 'Status', 'Completed Date', 'Employee', 'Actions'].map(h => (
                <th key={h} className="px-[20px] py-[12px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748b]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map(c => {
              const tok = statusToken(c.status);
              return (
                <tr key={c.id} className="border-b border-[#f8fafc] hover:bg-[#fafbfc] transition">
                  <td className="px-[20px] py-[14px]">
                    <p className="text-[14px] font-semibold text-[#0f172a] truncate max-w-[200px]">{c.case_name}</p>
                    <p className="text-[12px] text-[#94a3b8]">#{c.application_number}</p>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <span className="inline-flex items-center px-[8px] py-[3px] rounded-full bg-[#f1f5f9] text-[12px] font-medium text-[#475569]">
                      {c.visa_type?.code ?? '—'}
                    </span>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <span className="inline-flex items-center gap-[5px] text-[12px] font-medium" style={{ color: tok.text }}>
                      <CheckCircle2 size={13} /> {tok.label}
                    </span>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <p className="text-[13px] text-[#1f2937]">{fmtDate(c.updated_at)}</p>
                    <p className="text-[11px] text-[#94a3b8]">{fmtRelative(c.updated_at)}</p>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    {c.employee && (
                      <div className="flex items-center gap-[8px]">
                        <div className="size-[26px] rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                             style={{ backgroundColor: avatarColor(c.employee.full_name) }}>
                          {initials(c.employee.full_name)}
                        </div>
                        <span className="text-[12px] text-[#475569] truncate">{c.employee.full_name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <div className="flex items-center gap-[10px]">
                      <button onClick={() => onView(c.id)} className="text-[13px] font-medium text-indigo-600 hover:underline">View</button>
                      {/* FIX 3: Download now exports real CSV */}
                      <button onClick={() => exportCasesCSV([c], `case-${c.application_number}`)}
                        className="text-[13px] font-medium text-[#64748b] hover:text-[#334155]">
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DRAFT CASE ROW
// ─────────────────────────────────────────────────────────────────────────────

function DraftCaseRow({ c, onResume, onDelete }: {
  c: HRCaseResponse; onResume: () => void; onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] flex items-center gap-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="size-[48px] rounded-[12px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
        <FileText size={20} className="text-[#64748b]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px] mb-[3px]">
          <h3 className="text-[15px] font-semibold text-[#0f172a] truncate">{c.case_name}</h3>
          <span className="px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#64748b]">Draft</span>
        </div>
        <p className="text-[12px] text-[#94a3b8]">#{c.application_number}</p>
        <p className="text-[11px] text-[#94a3b8] mt-[2px]">Last edited: {fmtDate(c.updated_at)}</p>
        <div className="flex items-center gap-[12px] mt-[4px]">
          <span className="text-[11px] text-[#64748b] flex items-center gap-[3px]">
            <FileText size={10} /> {c.progress_percent}% complete
          </span>
        </div>
      </div>
      <div className="flex items-center gap-[10px] shrink-0">
        <button onClick={onDelete}
          className="h-[38px] px-[14px] rounded-[10px] border border-[#fecaca] text-[#dc2626] text-[13px] font-medium flex items-center gap-[6px] hover:bg-[#fef2f2] transition">
          <Trash2 size={13} /> Delete
        </button>
        <button onClick={onResume}
          className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          Resume Editing
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

function QuickActions({ onNewCase, onUpload, onDeadlines, onExport }: {
  onNewCase: () => void; onUpload: () => void; onDeadlines: () => void; onExport: () => void;
}) {
  const actions = [
    { icon: <Plus size={20} />,     title: 'Start New Case',    sub: 'Begin a new visa application', bg: '#eef2ff', color: '#4f46e5', onClick: onNewCase },
    { icon: <FileText size={20} />, title: 'Upload Documents',  sub: 'Add files to your cases',       bg: '#f0fdf4', color: '#16a34a', onClick: onUpload },
    { icon: <Clock size={20} />,    title: 'View Deadlines',    sub: 'Check upcoming dates',           bg: '#fff7ed', color: '#ea580c', onClick: onDeadlines },
    { icon: <Download size={20} />, title: 'Export Report',     sub: 'Download case summary',          bg: '#faf5ff', color: '#7e22ce', onClick: onExport },
  ];
  return (
    <div>
      <h2 className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px] mb-[16px]">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {actions.map(a => (
          <button key={a.title} onClick={a.onClick}
            className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] text-left hover:shadow-md hover:-translate-y-[1px] transition-all shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
            <div className="size-[44px] rounded-[12px] flex items-center justify-center mb-[12px]"
                 style={{ backgroundColor: a.bg, color: a.color }}>{a.icon}</div>
            <p className="text-[14px] font-semibold text-[#0f172a]">{a.title}</p>
            <p className="text-[12px] text-[#64748b] mt-[2px]">{a.sub}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOADING SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-[24px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {[0,1,2,3].map(i => <div key={i} className="h-[110px] bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {[0,1,2].map(i => <div key={i} className="h-[360px] bg-white border border-[#f1f5f9] rounded-[14px] animate-pulse" />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function HRCasesList() {
  const navigate = useNavigate();
  const [allCases, setAllCases] = useState<HRCaseResponse[]>([]);
  const [kpi, setKpi]           = useState({ total: 0, total_active: 0, action_needed: 0, approved_ytd: 0, expiring_soon: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatus] = useState<HRCaseStatus | 'all'>('all');
  const [visaFilter, setVisa]   = useState('all');

  // FIX 1: viewMode now has a setter — const [viewMode, setViewMode]
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [toasts, setToasts]     = useState<ToastItem[]>([]);
  const [withdrawTarget, setWithdrawTarget] = useState<HRCaseResponse | null>(null);
  const [withdrawBusy, setWithdrawBusy]     = useState(false);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, tone, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3200);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res = await createCaseApi.listCases({ limit: 100 });
      setAllCases(res.items);
      setKpi({ total: res.total, total_active: res.total_active, action_needed: res.action_needed, approved_ytd: res.approved_ytd, expiring_soon: res.expiring_soon });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Withdraw case (3-dot → Withdraw)
  const handleWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawBusy(true);
    try {
      await createCaseApi.updateStatus(withdrawTarget.id, { status: 'withdrawn', note: 'Withdrawn by HR' });
      pushToast('success', 'Case withdrawn', withdrawTarget.case_name);
      await load();
    } catch {
      pushToast('error', 'Failed to withdraw case');
    } finally { setWithdrawBusy(false); setWithdrawTarget(null); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allCases.filter(c => {
      if (q && !`${c.case_name} ${c.application_number} ${c.employee?.full_name ?? ''} ${c.visa_type?.code ?? ''}`.toLowerCase().includes(q)) return false;
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (visaFilter   !== 'all' && c.visa_type?.code !== visaFilter) return false;
      return true;
    });
  }, [allCases, search, statusFilter, visaFilter]);

  const activeCases    = filtered.filter(c => ['in_progress', 'action_needed', 'rfe_response', 'submitted'].includes(c.status));
  const completedCases = filtered.filter(c => ['approved', 'rejected', 'withdrawn'].includes(c.status));
  const draftCases     = filtered.filter(c => c.status === 'draft');
  const visaTypes      = [...new Set(allCases.map(c => c.visa_type?.code).filter(Boolean) as string[])];

  const STATUSES: Array<{ value: HRCaseStatus | 'all'; label: string }> = [
    { value: 'all',           label: 'All Statuses' },
    { value: 'in_progress',   label: 'In Progress' },
    { value: 'action_needed', label: 'Action Needed' },
    { value: 'submitted',     label: 'Submitted' },
    { value: 'approved',      label: 'Approved' },
    { value: 'rejected',      label: 'Rejected' },
    { value: 'draft',         label: 'Draft' },
  ];

  const statCards = [
    { label: 'Total Cases',   value: kpi.total,         sub: 'All time',              icon: <Briefcase size={20} />,  bg: '#eff6ff', color: '#2563eb' },
    { label: 'In Progress',   value: kpi.total_active,  sub: 'Active applications',   icon: <Clock size={20} />,      bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Completed',     value: kpi.approved_ytd,  sub: 'Successfully approved', icon: <CheckCircle2 size={20}/>, bg: '#dcfce7', color: '#15803d' },
    { label: 'Draft',         value: draftCases.length, sub: 'Saved for later',       icon: <Edit2 size={20} />,      bg: '#f8fafc', color: '#64748b' },
  ];

  const headerActions = (
    <>
      <button onClick={() => navigate('/employer/notifications')}
        className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
        <Bell size={16} />
        <span className="absolute top-[9px] right-[9px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
      </button>

      {/* FIX 3: Export All — real CSV download */}
      <button
        onClick={() => {
          exportCasesCSV(filtered, 'hr-cases');
          pushToast('success', 'Exported', `${filtered.length} cases saved to CSV`);
        }}
        className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
        <Download size={14} /> Export All
      </button>

      <button onClick={() => navigate('/employer/cases/new')}
        className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold"
        style={{ backgroundImage: PRIMARY_GRADIENT }}>
        <Plus size={14} /> New Case
      </button>
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

      <PageHeader
        title="Immigration Cases"
        subtitle="Manage all your visa applications and track their progress in one place."
        showSearch={false}
        showBell={false}
        actions={headerActions}
      />

      <PageContent>
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <p className="text-[#ef4444] text-[16px] font-medium mb-[12px]">{error}</p>
            <button onClick={() => void load()} className="text-indigo-600 text-[14px] hover:underline">Try again</button>
          </div>
        ) : (
          <div className="flex flex-col gap-[28px]">

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
              {statCards.map(s => (
                <div key={s.label} className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-[14px]">
                    <div className="size-[44px] rounded-[12px] flex items-center justify-center shrink-0"
                         style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                    <div>
                      <p className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">{s.value.toLocaleString()}</p>
                      <p className="text-[12px] font-semibold text-[#334151]">{s.label}</p>
                      <p className="text-[11px] text-[#94a3b8]">{s.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px] flex-1">
                <div className="relative w-full sm:w-[260px]">
                  <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cases..."
                    className="w-full h-[44px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[36px] pr-[12px] text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
                </div>
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatus(e.target.value as HRCaseStatus | 'all')}
                    className="appearance-none h-[44px] min-w-[160px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                </div>
                {visaTypes.length > 0 && (
                  <div className="relative">
                    <select value={visaFilter} onChange={e => setVisa(e.target.value)}
                      className="appearance-none h-[44px] min-w-[150px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
                      <option value="all">All Visa Types</option>
                      {visaTypes.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                  </div>
                )}
              </div>

              {/* FIX 1: Grid/List toggle — setViewMode now called */}
              <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[8px] p-[3px]">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`size-[36px] rounded-[6px] flex items-center justify-center transition ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'}`}
                  title="Grid view">
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`size-[36px] rounded-[6px] flex items-center justify-center transition ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-[#64748b] hover:text-[#334155]'}`}
                  title="List view">
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* Active Cases — FIX 1: switches between grid and list layout */}
            {activeCases.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Active Cases</h2>
                  <span className="text-[13px] text-[#64748b]">{activeCases.length} cases</span>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                    {activeCases.map(c => (
                      <ActiveCaseCard key={c.id} c={c}
                        onOpen={() => navigate(`/employer/cases/${c.id}`)}
                        onWithdraw={setWithdrawTarget}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
                    {activeCases.map(c => (
                      <CaseListRow key={c.id} c={c}
                        onOpen={() => navigate(`/employer/cases/${c.id}`)}
                        onWithdraw={setWithdrawTarget}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Completed Cases */}
            {completedCases.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Cases</h2>
                  <span className="text-[13px] text-[#64748b]">{completedCases.length} cases</span>
                </div>
                <CompletedCasesTable cases={completedCases} onView={id => navigate(`/employer/cases/${id}`)} />
              </div>
            )}

            {/* Draft Cases */}
            {draftCases.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Draft Cases</h2>
                  <span className="text-[13px] text-[#64748b]">{draftCases.length} draft{draftCases.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-col gap-[10px]">
                  {draftCases.map(c => (
                    <DraftCaseRow key={c.id} c={c}
                      onResume={() => navigate(`/employer/cases/${c.id}`)}
                      onDelete={() => setWithdrawTarget(c)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-[60px] text-center bg-white border border-[#f1f5f9] rounded-[16px]">
                <div className="size-[56px] rounded-full bg-[#f1f5f9] flex items-center justify-center mb-[14px]">
                  <Briefcase size={24} className="text-[#94a3b8]" />
                </div>
                <p className="text-[16px] font-semibold text-[#0f172a] mb-[4px]">
                  {search || statusFilter !== 'all' ? 'No cases match your filters' : 'No cases yet'}
                </p>
                <p className="text-[13px] text-[#64748b] mb-[16px]">
                  {search || statusFilter !== 'all' ? 'Try clearing your filters' : 'Create your first immigration case to get started'}
                </p>
                <button onClick={() => navigate('/employer/cases/new')}
                  className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}>
                  <Plus size={14} /> New Case
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <QuickActions
              onNewCase={() => navigate('/employer/cases/new')}
              onUpload={() => pushToast('info', 'Go to a case detail to upload documents')}
              onDeadlines={() => navigate('/employer/deadlines')}
              onExport={() => { exportCasesCSV(allCases, 'hr-cases'); pushToast('success', 'Exported', `${allCases.length} cases saved to CSV`); }}
            />
          </div>
        )}
      </PageContent>

      {/* Confirm withdraw modal */}
      <ConfirmModal
        open={!!withdrawTarget}
        title="Withdraw Case"
        message={`"${withdrawTarget?.case_name}" will be marked as withdrawn. You can re-activate it from the case detail page.`}
        confirmLabel="Withdraw"
        busy={withdrawBusy}
        onCancel={() => setWithdrawTarget(null)}
        onConfirm={() => void handleWithdraw()}
      />
    </div>
  );
}