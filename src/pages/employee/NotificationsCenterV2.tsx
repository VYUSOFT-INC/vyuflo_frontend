

// // src/pages/employee/NotificationsCenterV2.tsx
// // Employee Notifications — personal visa case alerts, deadlines, documents, news
// // Uses theme CSS variables throughout

// import { useState, useMemo } from "react";
// import {
//   Bell, CheckCheck, AlertTriangle, FileText, Clock,
//   Newspaper, Shield, CreditCard, Briefcase,
//   Filter, Settings, ChevronDown, 
//   MoreVertical, Calendar, TrendingUp,
// } from "lucide-react";
// import { useNotifications, useNotificationStats, useNotificationPreferences } from "../../hooks/employee/useNotifications";
// import type { Notification, NotificationCategory, TabFilter } from "../../types/employee/notification.types";
// import { PageHeader, PageContent } from "../../components/layout/Pageheader";

// // ── Category config ───────────────────────────────────────────────────────────
// const CAT_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
//   document:    { bg:"#eff6ff", color:"#3b82f6", icon:<FileText size={18} /> },
//   deadline:    { bg:"#fff7ed", color:"#f97316", icon:<Clock size={18} /> },
//   case_update: { bg:"#f0fdf4", color:"#22c55e", icon:<Briefcase size={18} /> },
//   news:        { bg:"#f5f3ff", color:"#8b5cf6", icon:<Newspaper size={18} /> },
//   security:    { bg:"#fef2f2", color:"#ef4444", icon:<Shield size={18} /> },
//   billing:     { bg:"#ecfdf5", color:"#10b981", icon:<CreditCard size={18} /> },
// };

// const TABS: { id: TabFilter; label: string }[] = [
//   { id:"all",         label:"All"          },
//   { id:"case_update", label:"Case Updates" },
//   { id:"deadline",    label:"Deadlines"    },
//   { id:"news",        label:"News"         },
// ];

// function timeAgo(iso: string): string {
//   const diff = Math.floor((Date.now() - +new Date(iso)) / 60000);
//   if (diff < 1) return "Just now";
//   if (diff < 60) return `${diff}m ago`;
//   const hrs = Math.floor(diff / 60);
//   if (hrs < 24) return `${hrs}h ago`;
//   const days = Math.floor(hrs / 24);
//   if (days === 1) return "Yesterday";
//   return new Date(iso).toLocaleDateString(undefined, { month:"short", day:"numeric" });
// }

// // ── Stat card ─────────────────────────────────────────────────────────────────
// function StatCard({ value, label, badge, badgeCls, iconBg, iconColor, icon, loading }: {
//   value: number; label: string; badge: string; badgeCls: string;
//   iconBg: string; iconColor: string; icon: React.ReactNode; loading?: boolean;
// }) {
//   return (
//     <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex flex-col gap-[8px] flex-1 min-w-0">
//       <div className="flex items-center justify-between">
//         <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0"
//           style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
//         <span className={`text-[10px] sm:text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${badgeCls}`}>{badge}</span>
//       </div>
//       <p className="text-[26px] sm:text-[30px] font-bold text-[#111827] leading-none mt-[4px]">
//         {loading ? <span className="text-[18px] text-[#9ca3af]">…</span> : value}
//       </p>
//       <p className="text-[11px] sm:text-[13px] text-[#6b7280] leading-tight">{label}</p>
//     </div>
//   );
// }

// // ── Toggle ────────────────────────────────────────────────────────────────────
// function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
//   return (
//     <button onClick={onChange}
//       className="relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0"
//       style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
//       <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
//     </button>
//   );
// }

// // ── Notification row ──────────────────────────────────────────────────────────
// function NotifRow({ notif, onMarkRead, onDismiss }: {
//   notif: Notification;
//   onMarkRead: (id: string) => void;
//   onDismiss:  (id: string) => void;
// }) {
//   const cat = CAT_CONFIG[notif.category] ?? { bg:"#f9fafb", color:"#6b7280", icon:<Bell size={18} /> };
//   return (
//     <div className={`border-b border-[#f3f4f6] last:border-0 ${!notif.is_read ? "bg-[#fafbff]" : "bg-white"}`}>
//       <div className="px-[16px] sm:px-[24px] py-[16px] sm:py-[20px]">
//         <div className="flex items-start gap-[12px] sm:gap-[14px]">
//           <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-[2px]"
//             style={{ backgroundColor: cat.bg, color: cat.color }}>
//             {cat.icon}
//           </div>

//           <div className="flex-1 min-w-0">
//             <div className="flex items-start gap-[6px] flex-wrap">
//               <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#111827] flex-1 min-w-0 leading-[20px]">
//                 {notif.title}
//               </h3>
//               {notif.priority === "urgent" && (
//                 <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fef2f2] text-[#dc2626] flex-shrink-0">URGENT</span>
//               )}
//               {notif.priority === "high" && (
//                 <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c] flex-shrink-0">HIGH</span>
//               )}
//               {!notif.is_read && (
//                 <div className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[6px]"
//                   style={{ backgroundColor: "var(--theme-primary)" }} />
//               )}
//             </div>
//             <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px] leading-[18px]">{notif.body}</p>
//             <div className="flex items-center flex-wrap gap-[8px] mt-[8px]">
//               {notif.case_reference && (
//                 <span className="text-[11px] font-medium" style={{ color: "var(--theme-primary)" }}>{notif.case_reference}</span>
//               )}
//               {notif.actor_label && (
//                 <span className="text-[11px] font-medium" style={{ color: "var(--theme-primary)" }}>{notif.actor_label}</span>
//               )}
//               <span className="text-[11px] text-[#9ca3af]">{timeAgo(notif.created_at)}</span>
//             </div>
//           </div>

//           <button onClick={() => onDismiss(notif.id)}
//             className="text-[#d1d5db] hover:text-[#6b7280] transition flex-shrink-0 mt-[2px] p-[4px]">
//             <MoreVertical size={14} />
//           </button>
//         </div>

//         {(notif.cta_primary_label || notif.cta_secondary_label) && (
//           <div className="flex items-center flex-wrap gap-[8px] mt-[12px] ml-[52px] sm:ml-[58px]">
//             {notif.cta_primary_label && (
//               <button onClick={() => onMarkRead(notif.id)}
//                 className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {notif.cta_primary_label}
//               </button>
//             )}
//             {notif.cta_secondary_label && (
//               <button onClick={() => onMarkRead(notif.id)}
//                 className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition">
//                 {notif.cta_secondary_label}
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // ── Main ──────────────────────────────────────────────────────────────────────
// export default function NotificationsCenterV2() {
//   const [activeTab, setActiveTab] = useState<TabFilter>("all");

//   const {
//     notifications, unreadCount, urgentCount, loading, error,
//     markRead, markAllRead, dismiss, loadMore, hasMore,
//   } = useNotifications({
//     category: activeTab === "all" ? undefined : activeTab as NotificationCategory,
//   });

//   const { stats, loading: statsLoading } = useNotificationStats();
//   const { prefs, saving, update: updatePrefs } = useNotificationPreferences();

//   const deadlines  = useMemo(() => notifications.filter(n => n.category === "deadline").slice(0, 3), [notifications]);
//   const newsItems  = useMemo(() => notifications.filter(n => n.category === "news").slice(0, 3), [notifications]);
//   const caseNotifs = notifications.filter(n => n.category === "case_update");

//   return (
//     <div className="flex flex-col h-full" style={{ fontFamily: "Inter, sans-serif" }}>
//       <PageHeader
//         title="Notifications"
//         subtitle="Stay updated on your visa case, documents, and deadlines"
//         showSearch={false}
//         actions={
//           <button onClick={() => markAllRead()}
//             className="flex items-center gap-[6px] text-[12px] sm:text-[13px] font-medium transition"
//             style={{ color: "var(--theme-primary)" }}>
//             <CheckCheck size={14} />
//             <span className="hidden sm:inline">Mark All Read</span>
//             <span className="sm:hidden">Mark All</span>
//           </button>
//         }
//       />

//       <PageContent>
//         <div className="flex flex-col gap-[20px] sm:gap-[24px]">

//           {/* Stats */}
//           <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px] sm:gap-[16px]">
//             <StatCard loading={statsLoading} value={stats?.urgent_count ?? urgentCount} label="Urgent Actions"
//               badge="Urgent"   badgeCls="bg-[#fef2f2] text-[#dc2626]"   iconBg="#fef2f2" iconColor="#dc2626" icon={<AlertTriangle size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.unread_count ?? unreadCount} label="Unread Notifications"
//               badge="New"      badgeCls="bg-[#eff6ff] text-[#2563eb]"   iconBg="#eff6ff" iconColor="#2563eb" icon={<Bell size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.week_count ?? 0}             label="Updates This Week"
//               badge="Week"     badgeCls="bg-[#f0fdf4] text-[#16a34a]"   iconBg="#f0fdf4" iconColor="#16a34a" icon={<TrendingUp size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.news_count ?? 0}             label="Immigration News"
//               badge="News"     badgeCls="bg-[#f5f3ff] text-[#7c3aed]"   iconBg="#f5f3ff" iconColor="#7c3aed" icon={<Newspaper size={18} />} />
//           </div>

//           {/* Main grid */}
//           <div className="flex flex-col xl:flex-row gap-[20px] sm:gap-[24px] items-start">

//             {/* List */}
//             <div className="flex-1 min-w-0 w-full">
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] overflow-hidden">
//                 <div className="px-[14px] sm:px-[16px] pt-[14px] pb-0 border-b border-[#e5e7eb]">
//                   <div className="flex items-center justify-between mb-[10px]">
//                     <h2 className="text-[14px] sm:text-[16px] font-bold text-[#111827]">Notifications</h2>
//                     <div className="flex items-center gap-[6px]">
//                       <button className="flex items-center gap-[4px] text-[12px] font-medium text-[#374151] border border-[#e5e7eb] rounded-[8px] px-[10px] py-[6px] hover:bg-[#f9fafb] transition">
//                         <Filter size={12} /><span className="hidden sm:inline">Filter</span>
//                       </button>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-[2px] overflow-x-auto pb-[1px]">
//                     {TABS.map(tab => (
//                       <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//                         className={`text-[12px] sm:text-[13px] font-medium px-[12px] sm:px-[14px] py-[7px] sm:py-[8px]
//                                     rounded-t-[6px] whitespace-nowrap transition border-b-2 ${
//                           activeTab === tab.id
//                             ? "border-[var(--theme-primary)] bg-[var(--theme-light)] text-[var(--theme-dark)]"
//                             : "border-transparent text-[#6b7280] hover:text-[#374151]"
//                         }`}>
//                         {tab.label}
//                         {tab.id === "all" && unreadCount > 0 && (
//                           <span className="ml-[5px] text-[10px] text-white rounded-full px-[5px] py-[1px]"
//                             style={{ background: "var(--theme-primary)" }}>{unreadCount}</span>
//                         )}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {loading && notifications.length === 0 && (
//                   <div className="flex items-center justify-center py-[48px]">
//                     <svg className="w-7 h-7 animate-spin" style={{ color: "var(--theme-primary)" }} fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
//                     </svg>
//                   </div>
//                 )}

//                 {error && (
//                   <p className="text-[13px] text-[#ef4444] text-center py-[32px]">Failed to load notifications</p>
//                 )}

//                 {!loading && !error && notifications.length === 0 && (
//                   <div className="flex flex-col items-center py-[48px]">
//                     <div className="w-[48px] h-[48px] bg-[#f1f5f9] rounded-full flex items-center justify-center mb-[12px] text-[#9ca3af]"><Bell size={20} /></div>
//                     <p className="text-[14px] font-medium text-[#374151]">No notifications</p>
//                     <p className="text-[12px] text-[#9ca3af] mt-[4px]">You're all caught up!</p>
//                   </div>
//                 )}

//                 {notifications.map(n => (
//                   <NotifRow key={n.id} notif={n} onMarkRead={markRead} onDismiss={dismiss} />
//                 ))}

//                 <div className="flex items-center justify-center py-[16px] border-t border-[#f3f4f6]">
//                   {hasMore ? (
//                     <button onClick={loadMore} disabled={loading}
//                       className="flex items-center gap-[5px] text-[12px] font-medium transition disabled:opacity-50"
//                       style={{ color: "var(--theme-primary)" }}>
//                       {loading ? "Loading…" : "Load More"} <ChevronDown size={13} />
//                     </button>
//                   ) : (
//                     <p className="text-[12px] text-[#9ca3af]">You've seen all notifications</p>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Right sidebar */}
//             <div className="hidden xl:flex flex-col gap-[16px] w-[300px] 2xl:w-[320px] flex-shrink-0">

//               {/* Notification Preferences */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <h3 className="text-[14px] font-bold text-[#111827] flex items-center gap-[8px] mb-[16px]">
//                   <Settings size={14} className="text-[#64748b]" /> Notification Preferences
//                 </h3>
//                 <div className="flex flex-col gap-[14px]">
//                   {[
//                     { label:"Email Notifications", sub:"Case & deadline updates",   key:"email_enabled"  as const, val: prefs?.email_enabled ?? true  },
//                     { label:"Push Notifications",  sub:"Real-time browser alerts",  key:"push_enabled"   as const, val: prefs?.push_enabled  ?? true  },
//                     { label:"SMS Alerts",           sub:"Urgent actions only",       key:"sms_enabled"    as const, val: prefs?.sms_enabled   ?? false },
//                   ].map(p => (
//                     <div key={p.key} className="flex items-center justify-between gap-[10px]">
//                       <div className="min-w-0">
//                         <p className="text-[12px] font-medium text-[#111827]">{p.label}</p>
//                         <p className="text-[11px] text-[#9ca3af]">{p.sub}</p>
//                       </div>
//                       <Toggle checked={p.val} onChange={() => updatePrefs({ [p.key]: !p.val })} />
//                     </div>
//                   ))}
//                 </div>
//                 <button className="w-full mt-[16px] border border-[#e5e7eb] rounded-[8px] py-[8px] text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition" disabled={saving}>
//                   {saving ? "Saving…" : "Manage All Preferences"}
//                 </button>
//               </div>

//               {/* Upcoming Deadlines */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#fff7ed] text-[#f97316] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <Calendar size={16} />
//                   </div>
//                   <div>
//                     <h3 className="text-[14px] font-bold text-[#111827]">Upcoming Deadlines</h3>
//                     <p className="text-[11px] text-[#9ca3af]">From your case</p>
//                   </div>
//                 </div>
//                 {deadlines.length === 0 ? (
//                   <p className="text-[12px] text-[#9ca3af]">No upcoming deadlines</p>
//                 ) : deadlines.map(d => (
//                   <div key={d.id} className="bg-[#f8fafc] border border-[#f1f5f9] rounded-[10px] p-[12px] mb-[8px] last:mb-0">
//                     <p className="text-[12px] font-semibold text-[#111827]">{d.title}</p>
//                     <p className="text-[11px] text-[#6b7280] mt-[2px] line-clamp-2">{d.body.slice(0, 60)}…</p>
//                     <span className="inline-block mt-[6px] text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c]">
//                       Deadline
//                     </span>
//                   </div>
//                 ))}
//                 <button onClick={() => setActiveTab("deadline")}
//                   className="flex items-center gap-[4px] text-[12px] font-medium mt-[10px] transition"
//                   style={{ color: "var(--theme-primary)" }}>
//                   View All <ChevronDown size={12} />
//                 </button>
//               </div>

//               {/* Immigration News */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#f5f3ff] text-[#7c3aed] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <Newspaper size={16} />
//                   </div>
//                   <h3 className="text-[14px] font-bold text-[#111827]">Immigration News</h3>
//                 </div>
//                 {newsItems.length === 0 ? (
//                   <p className="text-[12px] text-[#9ca3af]">No news notifications</p>
//                 ) : newsItems.map((item, i) => (
//                   <div key={item.id} className={`py-[10px] ${i < newsItems.length - 1 ? "border-b border-[#f3f4f6]" : ""}`}>
//                     <div className="flex items-start gap-[8px]">
//                       <div className="w-[6px] h-[6px] rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
//                       <div>
//                         <p className="text-[12px] font-semibold text-[#111827] leading-[16px]">{item.title}</p>
//                         <p className="text-[11px] text-[#6b7280] mt-[2px] leading-[15px]">{item.body.slice(0, 60)}…</p>
//                         <p className="text-[10px] text-[#9ca3af] mt-[4px]">{timeAgo(item.created_at)}</p>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//                 <button onClick={() => setActiveTab("news")}
//                   className="flex items-center gap-[4px] text-[12px] font-medium mt-[8px] transition"
//                   style={{ color: "var(--theme-primary)" }}>
//                   View All News <ChevronDown size={12} />
//                 </button>
//               </div>

//               {/* Case activity summary */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#f0fdf4] text-[#22c55e] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <TrendingUp size={16} />
//                   </div>
//                   <h3 className="text-[14px] font-bold text-[#111827]">Case Activity</h3>
//                 </div>
//                 <div className="mb-[12px]">
//                   <div className="flex items-center justify-between mb-[5px]">
//                     <span className="text-[12px] text-[#374151]">Case Notifications</span>
//                     <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{caseNotifs.length}</span>
//                   </div>
//                   <div className="w-full h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
//                     <div className="h-full rounded-full transition-all"
//                       style={{ width: `${Math.min(100, caseNotifs.length * 20)}%`, background: "var(--theme-primary)" }} />
//                   </div>
//                 </div>
//                 {[
//                   { label:"Unread case updates", value: caseNotifs.filter(n => !n.is_read).length },
//                   { label:"Total case activity",  value: caseNotifs.length },
//                 ].map(s => (
//                   <div key={s.label} className="flex items-center justify-between py-[7px] border-b border-[#f3f4f6] last:border-0">
//                     <span className="text-[12px] text-[#6b7280]">{s.label}</span>
//                     <span className="text-[12px] font-bold text-[#111827]">{s.value}</span>
//                   </div>
//                 ))}
//                 <button onClick={() => setActiveTab("case_update")}
//                   className="w-full mt-[14px] text-white text-[12px] font-medium rounded-[8px] py-[8px] hover:opacity-90 transition"
//                   style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                   View Case Updates
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </PageContent>
//     </div>
//   );
// }








// // src/pages/employee/NotificationsCenterV2.tsx
// // Employee Notifications — personal visa case alerts, deadlines, documents, news
// // Uses theme CSS variables throughout

// import { useState, useMemo } from "react";
// import { useNavigate } from "react-router-dom";
// import {
//   Bell, CheckCheck, AlertTriangle, FileText, Clock,
//   Newspaper, Shield, CreditCard, Briefcase,
//   Filter, Settings, ChevronDown,
//   MoreVertical, Calendar, TrendingUp,
//   ArrowRight,
// } from "lucide-react";
// import {
//   useNotifications,
//   useNotificationStats,
//   useNotificationPreferences,
// } from "../../hooks/employee/useNotifications";
// import type {
//   Notification,
//   NotificationCategory,
//   TabFilter,
// } from "../../types/employee/notification.types";
// import { PageHeader, PageContent } from "../../components/layout/Pageheader";

// // =============================================================================
// // CTA URL → internal route mapping
// // =============================================================================

// /**
//  * Converts a backend cta_primary_url (e.g. "/applications/uuid") to the
//  * correct frontend React Router path.
//  *
//  * Real-world scenarios:
//  *   /applications/{id}        → /applications/{id}          (employee app detail)
//  *   /documents/{id}           → /documents/{id}             (document viewer)
//  *   /documents/{id}/view      → /documents/{id}
//  *   /deadlines                → /applications               (no standalone deadlines page)
//  *   /employer/cases/{id}      → /applications/{id}          (HR sees same case)
//  *   /employer/employees       → /applications               (fallback)
//  *   anything else             → treat as-is (internal path)
//  */
// function resolveCtaUrl(raw?: string | null): string | null {
//   if (!raw) return null;

//   // Strip leading slash for matching
//   const path = raw.startsWith("/") ? raw : `/${raw}`;

//   // /documents/:id/view  →  /documents/:id
//   const docViewMatch = path.match(/^\/documents\/([^/]+)\/view/);
//   if (docViewMatch) return `/documents/${docViewMatch[1]}`;

//   // /employer/cases/:id  →  /applications/:id
//   const hrCaseMatch = path.match(/^\/employer\/cases\/([^/]+)/);
//   if (hrCaseMatch) return `/applications/${hrCaseMatch[1]}`;

//   // /employer/employees  →  /applications  (no employee roster in employee portal)
//   if (path.startsWith("/employer/")) return "/applications";

//   // /deadlines           →  /applications
//   if (path === "/deadlines") return "/applications";

//   // /applications/:id, /documents/:id  — pass through
//   return path;
// }

// /**
//  * Derive the best navigation target for a notification.
//  * Priority: cta_primary_url > application_id > document_id > null
//  */
// function getNotifRoute(notif: Notification): string | null {
//   // 1. Explicit CTA URL from backend
//   const fromCta = resolveCtaUrl(notif.cta_primary_url);
//   if (fromCta) return fromCta;

//   // 2. application_id  →  /applications/:id
//   if (notif.application_id) return `/applications/${notif.application_id}`;

//   // 3. document_id     →  /documents/:id
//   if (notif.document_id) return `/documents/${notif.document_id}`;

//   return null;
// }

// // =============================================================================
// // Category config
// // =============================================================================

// const CAT_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
//   document:    { bg: "#eff6ff", color: "#3b82f6", icon: <FileText size={18} /> },
//   deadline:    { bg: "#fff7ed", color: "#f97316", icon: <Clock size={18} /> },
//   case_update: { bg: "#f0fdf4", color: "#22c55e", icon: <Briefcase size={18} /> },
//   news:        { bg: "#f5f3ff", color: "#8b5cf6", icon: <Newspaper size={18} /> },
//   security:    { bg: "#fef2f2", color: "#ef4444", icon: <Shield size={18} /> },
//   billing:     { bg: "#ecfdf5", color: "#10b981", icon: <CreditCard size={18} /> },
//   approval:    { bg: "#fff7ed", color: "#f97316", icon: <CheckCheck size={18} /> },
//   compliance:  { bg: "#fef2f2", color: "#ef4444", icon: <AlertTriangle size={18} /> },
//   employee:    { bg: "#f0fdf4", color: "#22c55e", icon: <Briefcase size={18} /> },
// };

// const TABS: { id: TabFilter; label: string }[] = [
//   { id: "all",         label: "All"          },
//   { id: "case_update", label: "Case Updates" },
//   { id: "deadline",    label: "Deadlines"    },
//   { id: "news",        label: "News"         },
// ];

// function timeAgo(iso: string): string {
//   const diff = Math.floor((Date.now() - +new Date(iso)) / 60000);
//   if (diff < 1)   return "Just now";
//   if (diff < 60)  return `${diff}m ago`;
//   const hrs = Math.floor(diff / 60);
//   if (hrs < 24)   return `${hrs}h ago`;
//   const days = Math.floor(hrs / 24);
//   if (days === 1) return "Yesterday";
//   return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
// }

// // =============================================================================
// // Stat card
// // =============================================================================

// function StatCard({ value, label, badge, badgeCls, iconBg, iconColor, icon, loading }: {
//   value: number; label: string; badge: string; badgeCls: string;
//   iconBg: string; iconColor: string; icon: React.ReactNode; loading?: boolean;
// }) {
//   return (
//     <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex flex-col gap-[8px] flex-1 min-w-0">
//       <div className="flex items-center justify-between">
//         <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0"
//           style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
//         <span className={`text-[10px] sm:text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${badgeCls}`}>{badge}</span>
//       </div>
//       <p className="text-[26px] sm:text-[30px] font-bold text-[#111827] leading-none mt-[4px]">
//         {loading ? <span className="text-[18px] text-[#9ca3af]">…</span> : value}
//       </p>
//       <p className="text-[11px] sm:text-[13px] text-[#6b7280] leading-tight">{label}</p>
//     </div>
//   );
// }

// // =============================================================================
// // Toggle
// // =============================================================================

// function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
//   return (
//     <button onClick={onChange}
//       className="relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0"
//       style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
//       <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
//     </button>
//   );
// }

// // =============================================================================
// // Notification row
// // =============================================================================

// function NotifRow({ notif, onMarkRead, onDismiss }: {
//   notif: Notification;
//   onMarkRead: (id: string) => void;
//   onDismiss:  (id: string) => void;
// }) {
//   const navigate = useNavigate();
//   const cat   = CAT_CONFIG[notif.category] ?? { bg: "#f9fafb", color: "#6b7280", icon: <Bell size={18} /> };
//   const route = getNotifRoute(notif);

//   // Clicking the row body navigates + marks read
//   const handleRowClick = () => {
//     if (!notif.is_read) onMarkRead(notif.id);
//     if (route) navigate(route);
//   };

//   return (
//     <div className={`border-b border-[#f3f4f6] last:border-0 transition-colors ${
//       !notif.is_read ? "bg-[#fafbff]" : "bg-white"
//     } ${route ? "hover:bg-[#f8fafc] cursor-pointer" : ""}`}>
//       <div className="px-[16px] sm:px-[24px] py-[16px] sm:py-[20px]">

//         {/* Main row — clickable */}
//         <div
//           className="flex items-start gap-[12px] sm:gap-[14px]"
//           onClick={route ? handleRowClick : undefined}
//         >
//           <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-[2px]"
//             style={{ backgroundColor: cat.bg, color: cat.color }}>
//             {cat.icon}
//           </div>

//           <div className="flex-1 min-w-0">
//             <div className="flex items-start gap-[6px] flex-wrap">
//               <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#111827] flex-1 min-w-0 leading-[20px]">
//                 {notif.title}
//               </h3>
//               {notif.priority === "urgent" && (
//                 <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fef2f2] text-[#dc2626] flex-shrink-0">URGENT</span>
//               )}
//               {notif.priority === "high" && (
//                 <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c] flex-shrink-0">HIGH</span>
//               )}
//               {!notif.is_read && (
//                 <div className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[6px]"
//                   style={{ backgroundColor: "var(--theme-primary)" }} />
//               )}
//             </div>

//             <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px] leading-[18px]">
//               {notif.body}
//             </p>

//             <div className="flex items-center flex-wrap gap-[8px] mt-[8px]">
//               {notif.case_reference && (
//                 <span className="text-[11px] font-medium" style={{ color: "var(--theme-primary)" }}>
//                   {notif.case_reference}
//                 </span>
//               )}
//               {notif.actor_label && (
//                 <span className="text-[11px] font-medium text-[#6b7280]">
//                   {notif.actor_label}
//                 </span>
//               )}
//               <span className="text-[11px] text-[#9ca3af]">{timeAgo(notif.created_at)}</span>
//             </div>
//           </div>

//           <div className="flex items-center gap-[4px] flex-shrink-0 mt-[2px]">
//             {/* Arrow hint if navigable */}
//             {route && (
//               <ArrowRight size={13} className="text-[#d1d5db]" />
//             )}
//             {/* Dismiss — stop propagation so it doesn't trigger row click */}
//             <button
//               onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
//               className="text-[#d1d5db] hover:text-[#6b7280] transition p-[4px]">
//               <MoreVertical size={14} />
//             </button>
//           </div>
//         </div>

//         {/* CTA buttons — below the row, separated so they don't trigger row nav */}
//         {(notif.cta_primary_label || notif.cta_secondary_label) && (
//           <div className="flex items-center flex-wrap gap-[8px] mt-[12px] ml-[52px] sm:ml-[58px]">
//             {notif.cta_primary_label && route && (
//               <button
//                 onClick={e => {
//                   e.stopPropagation();
//                   if (!notif.is_read) onMarkRead(notif.id);
//                   navigate(route);
//                 }}
//                 className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {notif.cta_primary_label}
//               </button>
//             )}
//             {notif.cta_primary_label && !route && (
//               <button
//                 onClick={() => onMarkRead(notif.id)}
//                 className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                 {notif.cta_primary_label}
//               </button>
//             )}
//             {notif.cta_secondary_label && (
//               <button
//                 onClick={e => { e.stopPropagation(); onMarkRead(notif.id); }}
//                 className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition">
//                 {notif.cta_secondary_label}
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// // =============================================================================
// // Preferences panel — explains what each toggle does
// // =============================================================================

// const PREF_ITEMS = [
//   {
//     label: "Email Notifications",
//     sub: "Receive case & deadline updates by email",
//     key: "email_enabled" as const,
//   },
//   {
//     label: "Push Notifications",
//     sub: "Real-time alerts in your browser",
//     key: "push_enabled" as const,
//   },
//   {
//     label: "SMS Alerts",
//     sub: "Text messages for urgent actions only",
//     key: "sms_enabled" as const,
//   },
//   {
//     label: "Case Updates",
//     sub: "Status changes, attorney assignments",
//     key: "notify_case_updates" as const,
//   },
//   {
//     label: "Deadlines",
//     sub: "Reminders before visa deadlines",
//     key: "notify_deadlines" as const,
//   },
//   {
//     label: "Document Updates",
//     sub: "Approvals, rejections, missing docs",
//     key: "notify_document_updates" as const,
//   },
//   {
//     label: "Immigration News",
//     sub: "Policy changes, USCIS updates",
//     key: "notify_news" as const,
//   },
//   {
//     label: "Security Alerts",
//     sub: "Login activity, account changes",
//     key: "notify_security_alerts" as const,
//   },
// ] as const;

// // =============================================================================
// // Main component
// // =============================================================================

// export default function NotificationsCenterV2() {
//   const navigate    = useNavigate();
//   const [activeTab, setActiveTab] = useState<TabFilter>("all");
//   const [showAllPrefs, setShowAllPrefs] = useState(false);

//   const {
//     notifications, unreadCount, urgentCount, loading, error,
//     markRead, markAllRead, dismiss, loadMore, hasMore,
//   } = useNotifications({
//     category: activeTab === "all" ? undefined : activeTab as NotificationCategory,
//   });

//   const { stats, loading: statsLoading } = useNotificationStats();
//   const { prefs, saving, update: updatePrefs } = useNotificationPreferences();

//   const deadlines  = useMemo(() => notifications.filter(n => n.category === "deadline").slice(0, 3), [notifications]);
//   const newsItems  = useMemo(() => notifications.filter(n => n.category === "news").slice(0, 3), [notifications]);
//   const caseNotifs = notifications.filter(n => n.category === "case_update");

//   // Visible prefs: first 3 (channels) when collapsed, all when expanded
//   const visiblePrefs = showAllPrefs ? PREF_ITEMS : PREF_ITEMS.slice(0, 3);

//   return (
//     <div className="flex flex-col h-full" style={{ fontFamily: "Inter, sans-serif" }}>
//       <PageHeader
//         title="Notifications"
//         subtitle="Stay updated on your visa case, documents, and deadlines"
//         showSearch={false}
//         actions={
//           <button onClick={() => markAllRead()}
//             className="flex items-center gap-[6px] text-[12px] sm:text-[13px] font-medium transition"
//             style={{ color: "var(--theme-primary)" }}>
//             <CheckCheck size={14} />
//             <span className="hidden sm:inline">Mark All Read</span>
//             <span className="sm:hidden">Mark All</span>
//           </button>
//         }
//       />

//       <PageContent>
//         <div className="flex flex-col gap-[20px] sm:gap-[24px]">

//           {/* Stats */}
//           <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px] sm:gap-[16px]">
//             <StatCard loading={statsLoading} value={stats?.urgent_count ?? urgentCount} label="Urgent Actions"
//               badge="Urgent" badgeCls="bg-[#fef2f2] text-[#dc2626]" iconBg="#fef2f2" iconColor="#dc2626" icon={<AlertTriangle size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.unread_count ?? unreadCount} label="Unread Notifications"
//               badge="New" badgeCls="bg-[#eff6ff] text-[#2563eb]" iconBg="#eff6ff" iconColor="#2563eb" icon={<Bell size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.week_count ?? 0} label="Updates This Week"
//               badge="Week" badgeCls="bg-[#f0fdf4] text-[#16a34a]" iconBg="#f0fdf4" iconColor="#16a34a" icon={<TrendingUp size={18} />} />
//             <StatCard loading={statsLoading} value={stats?.news_count ?? 0} label="Immigration News"
//               badge="News" badgeCls="bg-[#f5f3ff] text-[#7c3aed]" iconBg="#f5f3ff" iconColor="#7c3aed" icon={<Newspaper size={18} />} />
//           </div>

//           {/* Main grid */}
//           <div className="flex flex-col xl:flex-row gap-[20px] sm:gap-[24px] items-start">

//             {/* Notification list */}
//             <div className="flex-1 min-w-0 w-full">
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] overflow-hidden">

//                 {/* List header */}
//                 <div className="px-[14px] sm:px-[16px] pt-[14px] pb-0 border-b border-[#e5e7eb]">
//                   <div className="flex items-center justify-between mb-[10px]">
//                     <h2 className="text-[14px] sm:text-[16px] font-bold text-[#111827]">Notifications</h2>
//                     <button className="flex items-center gap-[4px] text-[12px] font-medium text-[#374151] border border-[#e5e7eb] rounded-[8px] px-[10px] py-[6px] hover:bg-[#f9fafb] transition">
//                       <Filter size={12} /><span className="hidden sm:inline">Filter</span>
//                     </button>
//                   </div>
//                   <div className="flex items-center gap-[2px] overflow-x-auto pb-[1px]">
//                     {TABS.map(tab => (
//                       <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//                         className={`text-[12px] sm:text-[13px] font-medium px-[12px] sm:px-[14px] py-[7px] sm:py-[8px]
//                                     rounded-t-[6px] whitespace-nowrap transition border-b-2 ${
//                           activeTab === tab.id
//                             ? "border-[var(--theme-primary)] bg-[var(--theme-light)] text-[var(--theme-dark)]"
//                             : "border-transparent text-[#6b7280] hover:text-[#374151]"
//                         }`}>
//                         {tab.label}
//                         {tab.id === "all" && unreadCount > 0 && (
//                           <span className="ml-[5px] text-[10px] text-white rounded-full px-[5px] py-[1px]"
//                             style={{ background: "var(--theme-primary)" }}>{unreadCount}</span>
//                         )}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {/* Loading */}
//                 {loading && notifications.length === 0 && (
//                   <div className="flex items-center justify-center py-[48px]">
//                     <svg className="w-7 h-7 animate-spin" style={{ color: "var(--theme-primary)" }} fill="none" viewBox="0 0 24 24">
//                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                     </svg>
//                   </div>
//                 )}

//                 {error && (
//                   <p className="text-[13px] text-[#ef4444] text-center py-[32px]">Failed to load notifications</p>
//                 )}

//                 {!loading && !error && notifications.length === 0 && (
//                   <div className="flex flex-col items-center py-[48px]">
//                     <div className="w-[48px] h-[48px] bg-[#f1f5f9] rounded-full flex items-center justify-center mb-[12px] text-[#9ca3af]">
//                       <Bell size={20} />
//                     </div>
//                     <p className="text-[14px] font-medium text-[#374151]">No notifications</p>
//                     <p className="text-[12px] text-[#9ca3af] mt-[4px]">You're all caught up!</p>
//                   </div>
//                 )}

//                 {notifications.map(n => (
//                   <NotifRow key={n.id} notif={n} onMarkRead={markRead} onDismiss={dismiss} />
//                 ))}

//                 <div className="flex items-center justify-center py-[16px] border-t border-[#f3f4f6]">
//                   {hasMore ? (
//                     <button onClick={loadMore} disabled={loading}
//                       className="flex items-center gap-[5px] text-[12px] font-medium transition disabled:opacity-50"
//                       style={{ color: "var(--theme-primary)" }}>
//                       {loading ? "Loading…" : "Load More"} <ChevronDown size={13} />
//                     </button>
//                   ) : (
//                     <p className="text-[12px] text-[#9ca3af]">You've seen all notifications</p>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Right sidebar */}
//             <div className="hidden xl:flex flex-col gap-[16px] w-[300px] 2xl:w-[320px] flex-shrink-0">

//               {/* ── Notification Preferences ── */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <h3 className="text-[14px] font-bold text-[#111827] flex items-center gap-[8px] mb-[4px]">
//                   <Settings size={14} className="text-[#64748b]" /> Notification Preferences
//                 </h3>
//                 {/* Plain-English explainer */}
//                 <p className="text-[11px] text-[#9ca3af] leading-[16px] mb-[14px]">
//                   Control <span className="font-medium text-[#6b7280]">how</span> (email, push, SMS) and{" "}
//                   <span className="font-medium text-[#6b7280]">what</span> (case updates, deadlines, news)
//                   you get notified about. Turning off a channel stops that delivery method for all
//                   categories. Turning off a category stops it across all channels.
//                 </p>

//                 <div className="flex flex-col gap-[12px]">
//                   {visiblePrefs.map(p => {
//                     const val = prefs ? prefs[p.key] : true;
//                     return (
//                       <div key={p.key} className="flex items-center justify-between gap-[10px]">
//                         <div className="min-w-0">
//                           <p className="text-[12px] font-medium text-[#111827]">{p.label}</p>
//                           <p className="text-[11px] text-[#9ca3af] leading-[15px]">{p.sub}</p>
//                         </div>
//                         <Toggle checked={val} onChange={() => updatePrefs({ [p.key]: !val })} />
//                       </div>
//                     );
//                   })}
//                 </div>

//                 <button
//                   onClick={() => setShowAllPrefs(v => !v)}
//                   className="flex items-center gap-[4px] text-[12px] font-medium mt-[14px] transition"
//                   style={{ color: "var(--theme-primary)" }}>
//                   {showAllPrefs ? "Show less" : "Manage all preferences"}
//                   <ChevronDown size={12} className={`transition-transform ${showAllPrefs ? "rotate-180" : ""}`} />
//                 </button>

//                 {saving && (
//                   <p className="text-[11px] text-[#9ca3af] mt-[8px]">Saving…</p>
//                 )}
//               </div>

//               {/* ── Upcoming Deadlines ── */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#fff7ed] text-[#f97316] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <Calendar size={16} />
//                   </div>
//                   <div>
//                     <h3 className="text-[14px] font-bold text-[#111827]">Upcoming Deadlines</h3>
//                     <p className="text-[11px] text-[#9ca3af]">From your case</p>
//                   </div>
//                 </div>
//                 {deadlines.length === 0 ? (
//                   <p className="text-[12px] text-[#9ca3af]">No upcoming deadlines</p>
//                 ) : deadlines.map(d => {
//                   const route = getNotifRoute(d);
//                   return (
//                     <div
//                       key={d.id}
//                       onClick={() => { if (route) { markRead(d.id); navigate(route); } }}
//                       className={`bg-[#f8fafc] border border-[#f1f5f9] rounded-[10px] p-[12px] mb-[8px] last:mb-0 ${
//                         route ? "cursor-pointer hover:bg-[#f1f5f9] transition-colors" : ""
//                       }`}>
//                       <p className="text-[12px] font-semibold text-[#111827]">{d.title}</p>
//                       <p className="text-[11px] text-[#6b7280] mt-[2px] line-clamp-2">{d.body.slice(0, 60)}…</p>
//                       <span className="inline-block mt-[6px] text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c]">
//                         Deadline
//                       </span>
//                     </div>
//                   );
//                 })}
//                 <button onClick={() => setActiveTab("deadline")}
//                   className="flex items-center gap-[4px] text-[12px] font-medium mt-[10px] transition"
//                   style={{ color: "var(--theme-primary)" }}>
//                   View All <ChevronDown size={12} />
//                 </button>
//               </div>

//               {/* ── Immigration News ── */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#f5f3ff] text-[#7c3aed] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <Newspaper size={16} />
//                   </div>
//                   <h3 className="text-[14px] font-bold text-[#111827]">Immigration News</h3>
//                 </div>
//                 {newsItems.length === 0 ? (
//                   <p className="text-[12px] text-[#9ca3af]">No news notifications</p>
//                 ) : newsItems.map((item, i) => {
//                   const route = getNotifRoute(item);
//                   return (
//                     <div
//                       key={item.id}
//                       onClick={() => { if (route) { markRead(item.id); navigate(route); } }}
//                       className={`py-[10px] ${i < newsItems.length - 1 ? "border-b border-[#f3f4f6]" : ""} ${
//                         route ? "cursor-pointer hover:bg-[#f8fafc] -mx-[4px] px-[4px] rounded-[6px] transition-colors" : ""
//                       }`}>
//                       <div className="flex items-start gap-[8px]">
//                         <div className="w-[6px] h-[6px] rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
//                         <div>
//                           <p className="text-[12px] font-semibold text-[#111827] leading-[16px]">{item.title}</p>
//                           <p className="text-[11px] text-[#6b7280] mt-[2px] leading-[15px]">{item.body.slice(0, 60)}…</p>
//                           <p className="text-[10px] text-[#9ca3af] mt-[4px]">{timeAgo(item.created_at)}</p>
//                         </div>
//                       </div>
//                     </div>
//                   );
//                 })}
//                 <button onClick={() => setActiveTab("news")}
//                   className="flex items-center gap-[4px] text-[12px] font-medium mt-[8px] transition"
//                   style={{ color: "var(--theme-primary)" }}>
//                   View All News <ChevronDown size={12} />
//                 </button>
//               </div>

//               {/* ── Case Activity ── */}
//               <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
//                 <div className="flex items-center gap-[8px] mb-[14px]">
//                   <div className="w-[36px] h-[36px] bg-[#f0fdf4] text-[#22c55e] rounded-[8px] flex items-center justify-center flex-shrink-0">
//                     <TrendingUp size={16} />
//                   </div>
//                   <h3 className="text-[14px] font-bold text-[#111827]">Case Activity</h3>
//                 </div>
//                 <div className="mb-[12px]">
//                   <div className="flex items-center justify-between mb-[5px]">
//                     <span className="text-[12px] text-[#374151]">Case Notifications</span>
//                     <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{caseNotifs.length}</span>
//                   </div>
//                   <div className="w-full h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
//                     <div className="h-full rounded-full transition-all"
//                       style={{ width: `${Math.min(100, caseNotifs.length * 20)}%`, background: "var(--theme-primary)" }} />
//                   </div>
//                 </div>
//                 {[
//                   { label: "Unread case updates", value: caseNotifs.filter(n => !n.is_read).length },
//                   { label: "Total case activity",  value: caseNotifs.length },
//                 ].map(s => (
//                   <div key={s.label} className="flex items-center justify-between py-[7px] border-b border-[#f3f4f6] last:border-0">
//                     <span className="text-[12px] text-[#6b7280]">{s.label}</span>
//                     <span className="text-[12px] font-bold text-[#111827]">{s.value}</span>
//                   </div>
//                 ))}
//                 <button onClick={() => setActiveTab("case_update")}
//                   className="w-full mt-[14px] text-white text-[12px] font-medium rounded-[8px] py-[8px] hover:opacity-90 transition"
//                   style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
//                   View Case Updates
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </PageContent>
//     </div>
//   );
// }






// src/pages/employee/NotificationsCenterV2.tsx
// Employee Notifications — personal visa case alerts, deadlines, documents, news
// Uses theme CSS variables throughout

import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, AlertTriangle, FileText, Clock,
  Newspaper, Shield, CreditCard, Briefcase,
  Filter, Settings, ChevronDown,
  MoreVertical, Calendar, TrendingUp,
  ArrowRight,
} from "lucide-react";
import {
  useNotifications,
  useNotificationStats,
  useNotificationPreferences,
} from "../../hooks/employee/useNotifications";
import type {
  Notification,
  NotificationCategory,
  TabFilter,
  UpdatePreferencesRequest,
} from "../../types/employee/notification.types";
import { PageHeader, PageContent } from "../../components/layout/Pageheader";
import { getNotifRoute } from "../../utils/notifNavigation";
import {
  initPushNotifications,
  subscribeToPush,
  unsubscribeFromPush,
} from "../../utils/pushNotifications";

// =============================================================================
// Category config
// =============================================================================

const CAT_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  document:    { bg: "#eff6ff", color: "#3b82f6", icon: <FileText size={18} /> },
  deadline:    { bg: "#fff7ed", color: "#f97316", icon: <Clock size={18} /> },
  case_update: { bg: "#f0fdf4", color: "#22c55e", icon: <Briefcase size={18} /> },
  news:        { bg: "#f5f3ff", color: "#8b5cf6", icon: <Newspaper size={18} /> },
  security:    { bg: "#fef2f2", color: "#ef4444", icon: <Shield size={18} /> },
  billing:     { bg: "#ecfdf5", color: "#10b981", icon: <CreditCard size={18} /> },
  approval:    { bg: "#fff7ed", color: "#f97316", icon: <CheckCheck size={18} /> },
  compliance:  { bg: "#fef2f2", color: "#ef4444", icon: <AlertTriangle size={18} /> },
  employee:    { bg: "#f0fdf4", color: "#22c55e", icon: <Briefcase size={18} /> },
};

const TABS: { id: TabFilter; label: string }[] = [
  { id: "all",         label: "All"          },
  { id: "case_update", label: "Case Updates" },
  { id: "deadline",    label: "Deadlines"    },
  { id: "news",        label: "News"         },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (diff < 1)   return "Just now";
  if (diff < 60)  return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// =============================================================================
// Stat card
// =============================================================================

function StatCard({ value, label, badge, badgeCls, iconBg, iconColor, icon, loading }: {
  value: number; label: string; badge: string; badgeCls: string;
  iconBg: string; iconColor: string; icon: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex flex-col gap-[8px] flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
        <span className={`text-[10px] sm:text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${badgeCls}`}>{badge}</span>
      </div>
      <p className="text-[26px] sm:text-[30px] font-bold text-[#111827] leading-none mt-[4px]">
        {loading ? <span className="text-[18px] text-[#9ca3af]">…</span> : value}
      </p>
      <p className="text-[11px] sm:text-[13px] text-[#6b7280] leading-tight">{label}</p>
    </div>
  );
}

// =============================================================================
// Toggle
// =============================================================================

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
      <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

// =============================================================================
// Notification row
// =============================================================================

function NotifRow({ notif, onMarkRead, onDismiss }: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDismiss:  (id: string) => void;
}) {
  const navigate = useNavigate();
  const cat   = CAT_CONFIG[notif.category] ?? { bg: "#f9fafb", color: "#6b7280", icon: <Bell size={18} /> };
  const route = getNotifRoute(notif);

  // Clicking the row body navigates + marks read
  const handleRowClick = () => {
    if (!notif.is_read) onMarkRead(notif.id);
    if (route) navigate(route);
  };

  return (
    <div className={`border-b border-[#f3f4f6] last:border-0 transition-colors ${
      !notif.is_read ? "bg-[#fafbff]" : "bg-white"
    } ${route ? "hover:bg-[#f8fafc] cursor-pointer" : ""}`}>
      <div className="px-[16px] sm:px-[24px] py-[16px] sm:py-[20px]">

        {/* Main row — clickable */}
        <div
          className="flex items-start gap-[12px] sm:gap-[14px]"
          onClick={route ? handleRowClick : undefined}
        >
          <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-[2px]"
            style={{ backgroundColor: cat.bg, color: cat.color }}>
            {cat.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-[6px] flex-wrap">
              <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#111827] flex-1 min-w-0 leading-[20px]">
                {notif.title}
              </h3>
              {notif.priority === "urgent" && (
                <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fef2f2] text-[#dc2626] flex-shrink-0">URGENT</span>
              )}
              {notif.priority === "high" && (
                <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c] flex-shrink-0">HIGH</span>
              )}
              {!notif.is_read && (
                <div className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[6px]"
                  style={{ backgroundColor: "var(--theme-primary)" }} />
              )}
            </div>

            <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px] leading-[18px]">
              {notif.body}
            </p>

            <div className="flex items-center flex-wrap gap-[8px] mt-[8px]">
              {notif.case_reference && (
                <span className="text-[11px] font-medium" style={{ color: "var(--theme-primary)" }}>
                  {notif.case_reference}
                </span>
              )}
              {notif.actor_label && (
                <span className="text-[11px] font-medium text-[#6b7280]">
                  {notif.actor_label}
                </span>
              )}
              <span className="text-[11px] text-[#9ca3af]">{timeAgo(notif.created_at)}</span>
            </div>
          </div>

          <div className="flex items-center gap-[4px] flex-shrink-0 mt-[2px]">
            {/* Arrow hint if navigable */}
            {route && (
              <ArrowRight size={13} className="text-[#d1d5db]" />
            )}
            {/* Dismiss — stop propagation so it doesn't trigger row click */}
            <button
              onClick={e => { e.stopPropagation(); onDismiss(notif.id); }}
              className="text-[#d1d5db] hover:text-[#6b7280] transition p-[4px]">
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        {/* CTA buttons — below the row, separated so they don't trigger row nav */}
        {(notif.cta_primary_label || notif.cta_secondary_label) && (
          <div className="flex items-center flex-wrap gap-[8px] mt-[12px] ml-[52px] sm:ml-[58px]">
            {notif.cta_primary_label && route && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  if (!notif.is_read) onMarkRead(notif.id);
                  navigate(route);
                }}
                className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {notif.cta_primary_label}
              </button>
            )}
            {notif.cta_primary_label && !route && (
              <button
                onClick={() => onMarkRead(notif.id)}
                className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {notif.cta_primary_label}
              </button>
            )}
            {notif.cta_secondary_label && (
              <button
                onClick={e => { e.stopPropagation(); onMarkRead(notif.id); }}
                className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition">
                {notif.cta_secondary_label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Preferences panel — explains what each toggle does
// =============================================================================

const PREF_ITEMS = [
  {
    label: "Email Notifications",
    sub: "Receive case & deadline updates by email",
    key: "email_enabled" as const,
  },
  {
    label: "Push Notifications",
    sub: "Real-time alerts in your browser",
    key: "push_enabled" as const,
  },
  {
    label: "SMS Alerts",
    sub: "Text messages for urgent actions only",
    key: "sms_enabled" as const,
  },
  {
    label: "Case Updates",
    sub: "Status changes, attorney assignments",
    key: "notify_case_updates" as const,
  },
  {
    label: "Deadlines",
    sub: "Reminders before visa deadlines",
    key: "notify_deadlines" as const,
  },
  {
    label: "Document Updates",
    sub: "Approvals, rejections, missing docs",
    key: "notify_document_updates" as const,
  },
  {
    label: "Immigration News",
    sub: "Policy changes, USCIS updates",
    key: "notify_news" as const,
  },
  {
    label: "Security Alerts",
    sub: "Login activity, account changes",
    key: "notify_security_alerts" as const,
  },
] as const;

// =============================================================================
// Main component
// =============================================================================

export default function NotificationsCenterV2() {
  const navigate    = useNavigate();
  const [activeTab, setActiveTab] = useState<TabFilter>("all");
  const [showAllPrefs, setShowAllPrefs] = useState(false);

  const {
    notifications, unreadCount, urgentCount, loading, error,
    markRead, markAllRead, dismiss, loadMore, hasMore,
  } = useNotifications({
    category: activeTab === "all" ? undefined : activeTab as NotificationCategory,
  });

  const { stats, loading: statsLoading } = useNotificationStats();
  const { prefs, saving, update: updatePrefs } = useNotificationPreferences();

  // Init service worker once on mount, pass navigate for SW → app navigation
  useEffect(() => {
    initPushNotifications(navigate);
  }, [navigate]);

  // Push-aware toggle: when push_enabled changes, actually subscribe/unsubscribe
  const handlePrefToggle = async (key: keyof UpdatePreferencesRequest, currentVal: boolean) => {
    const newVal = !currentVal;
    if (key === "push_enabled") {
      if (newVal) {
        const ok = await subscribeToPush();
        if (!ok) return; // permission denied — don't save the pref
      } else {
        await unsubscribeFromPush();
      }
    }
    updatePrefs({ [key]: newVal });
  };

  const deadlines  = useMemo(() => notifications.filter(n => n.category === "deadline").slice(0, 3), [notifications]);
  const newsItems  = useMemo(() => notifications.filter(n => n.category === "news").slice(0, 3), [notifications]);
  const caseNotifs = notifications.filter(n => n.category === "case_update");

  // Visible prefs: first 3 (channels) when collapsed, all when expanded
  const visiblePrefs = showAllPrefs ? PREF_ITEMS : PREF_ITEMS.slice(0, 3);

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "Inter, sans-serif" }}>
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on your visa case, documents, and deadlines"
        showSearch={false}
        actions={
          <button onClick={() => markAllRead()}
            className="flex items-center gap-[6px] text-[12px] sm:text-[13px] font-medium transition"
            style={{ color: "var(--theme-primary)" }}>
            <CheckCheck size={14} />
            <span className="hidden sm:inline">Mark All Read</span>
            <span className="sm:hidden">Mark All</span>
          </button>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-[20px] sm:gap-[24px]">

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px] sm:gap-[16px]">
            <StatCard loading={statsLoading} value={stats?.urgent_count ?? urgentCount} label="Urgent Actions"
              badge="Urgent" badgeCls="bg-[#fef2f2] text-[#dc2626]" iconBg="#fef2f2" iconColor="#dc2626" icon={<AlertTriangle size={18} />} />
            <StatCard loading={statsLoading} value={stats?.unread_count ?? unreadCount} label="Unread Notifications"
              badge="New" badgeCls="bg-[#eff6ff] text-[#2563eb]" iconBg="#eff6ff" iconColor="#2563eb" icon={<Bell size={18} />} />
            <StatCard loading={statsLoading} value={stats?.week_count ?? 0} label="Updates This Week"
              badge="Week" badgeCls="bg-[#f0fdf4] text-[#16a34a]" iconBg="#f0fdf4" iconColor="#16a34a" icon={<TrendingUp size={18} />} />
            <StatCard loading={statsLoading} value={stats?.news_count ?? 0} label="Immigration News"
              badge="News" badgeCls="bg-[#f5f3ff] text-[#7c3aed]" iconBg="#f5f3ff" iconColor="#7c3aed" icon={<Newspaper size={18} />} />
          </div>

          {/* Main grid */}
          <div className="flex flex-col xl:flex-row gap-[20px] sm:gap-[24px] items-start">

            {/* Notification list */}
            <div className="flex-1 min-w-0 w-full">
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] overflow-hidden">

                {/* List header */}
                <div className="px-[14px] sm:px-[16px] pt-[14px] pb-0 border-b border-[#e5e7eb]">
                  <div className="flex items-center justify-between mb-[10px]">
                    <h2 className="text-[14px] sm:text-[16px] font-bold text-[#111827]">Notifications</h2>
                    <button className="flex items-center gap-[4px] text-[12px] font-medium text-[#374151] border border-[#e5e7eb] rounded-[8px] px-[10px] py-[6px] hover:bg-[#f9fafb] transition">
                      <Filter size={12} /><span className="hidden sm:inline">Filter</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-[2px] overflow-x-auto pb-[1px]">
                    {TABS.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`text-[12px] sm:text-[13px] font-medium px-[12px] sm:px-[14px] py-[7px] sm:py-[8px]
                                    rounded-t-[6px] whitespace-nowrap transition border-b-2 ${
                          activeTab === tab.id
                            ? "border-[var(--theme-primary)] bg-[var(--theme-light)] text-[var(--theme-dark)]"
                            : "border-transparent text-[#6b7280] hover:text-[#374151]"
                        }`}>
                        {tab.label}
                        {tab.id === "all" && unreadCount > 0 && (
                          <span className="ml-[5px] text-[10px] text-white rounded-full px-[5px] py-[1px]"
                            style={{ background: "var(--theme-primary)" }}>{unreadCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Loading */}
                {loading && notifications.length === 0 && (
                  <div className="flex items-center justify-center py-[48px]">
                    <svg className="w-7 h-7 animate-spin" style={{ color: "var(--theme-primary)" }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  </div>
                )}

                {error && (
                  <p className="text-[13px] text-[#ef4444] text-center py-[32px]">Failed to load notifications</p>
                )}

                {!loading && !error && notifications.length === 0 && (
                  <div className="flex flex-col items-center py-[48px]">
                    <div className="w-[48px] h-[48px] bg-[#f1f5f9] rounded-full flex items-center justify-center mb-[12px] text-[#9ca3af]">
                      <Bell size={20} />
                    </div>
                    <p className="text-[14px] font-medium text-[#374151]">No notifications</p>
                    <p className="text-[12px] text-[#9ca3af] mt-[4px]">You're all caught up!</p>
                  </div>
                )}

                {notifications.map(n => (
                  <NotifRow key={n.id} notif={n} onMarkRead={markRead} onDismiss={dismiss} />
                ))}

                <div className="flex items-center justify-center py-[16px] border-t border-[#f3f4f6]">
                  {hasMore ? (
                    <button onClick={loadMore} disabled={loading}
                      className="flex items-center gap-[5px] text-[12px] font-medium transition disabled:opacity-50"
                      style={{ color: "var(--theme-primary)" }}>
                      {loading ? "Loading…" : "Load More"} <ChevronDown size={13} />
                    </button>
                  ) : (
                    <p className="text-[12px] text-[#9ca3af]">You've seen all notifications</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="hidden xl:flex flex-col gap-[16px] w-[300px] 2xl:w-[320px] flex-shrink-0">

              {/* ── Notification Preferences ── */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <h3 className="text-[14px] font-bold text-[#111827] flex items-center gap-[8px] mb-[4px]">
                  <Settings size={14} className="text-[#64748b]" /> Notification Preferences
                </h3>
                {/* Plain-English explainer */}
                <p className="text-[11px] text-[#9ca3af] leading-[16px] mb-[14px]">
                  Control <span className="font-medium text-[#6b7280]">how</span> (email, push, SMS) and{" "}
                  <span className="font-medium text-[#6b7280]">what</span> (case updates, deadlines, news)
                  you get notified about. Turning off a channel stops that delivery method for all
                  categories. Turning off a category stops it across all channels.
                </p>

                <div className="flex flex-col gap-[12px]">
                  {visiblePrefs.map(p => {
                    const val = prefs ? (prefs[p.key] ?? true) : true;
                    return (
                      <div key={p.key} className="flex items-center justify-between gap-[10px]">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#111827]">{p.label}</p>
                          <p className="text-[11px] text-[#9ca3af] leading-[15px]">{p.sub}</p>
                        </div>
                        <Toggle
                          checked={val}
                          onChange={() => handlePrefToggle(p.key, val)}
                        />
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setShowAllPrefs(v => !v)}
                  className="flex items-center gap-[4px] text-[12px] font-medium mt-[14px] transition"
                  style={{ color: "var(--theme-primary)" }}>
                  {showAllPrefs ? "Show less" : "Manage all preferences"}
                  <ChevronDown size={12} className={`transition-transform ${showAllPrefs ? "rotate-180" : ""}`} />
                </button>

                {saving && (
                  <p className="text-[11px] text-[#9ca3af] mt-[8px]">Saving…</p>
                )}
              </div>

              {/* ── Upcoming Deadlines ── */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] bg-[#fff7ed] text-[#f97316] rounded-[8px] flex items-center justify-center flex-shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#111827]">Upcoming Deadlines</h3>
                    <p className="text-[11px] text-[#9ca3af]">From your case</p>
                  </div>
                </div>
                {deadlines.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">No upcoming deadlines</p>
                ) : deadlines.map(d => {
                  const route = getNotifRoute(d);
                  return (
                    <div
                      key={d.id}
                      onClick={() => { if (route) { markRead(d.id); navigate(route); } }}
                      className={`bg-[#f8fafc] border border-[#f1f5f9] rounded-[10px] p-[12px] mb-[8px] last:mb-0 ${
                        route ? "cursor-pointer hover:bg-[#f1f5f9] transition-colors" : ""
                      }`}>
                      <p className="text-[12px] font-semibold text-[#111827]">{d.title}</p>
                      <p className="text-[11px] text-[#6b7280] mt-[2px] line-clamp-2">{d.body.slice(0, 60)}…</p>
                      <span className="inline-block mt-[6px] text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c]">
                        Deadline
                      </span>
                    </div>
                  );
                })}
                <button onClick={() => setActiveTab("deadline")}
                  className="flex items-center gap-[4px] text-[12px] font-medium mt-[10px] transition"
                  style={{ color: "var(--theme-primary)" }}>
                  View All <ChevronDown size={12} />
                </button>
              </div>

              {/* ── Immigration News ── */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] bg-[#f5f3ff] text-[#7c3aed] rounded-[8px] flex items-center justify-center flex-shrink-0">
                    <Newspaper size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#111827]">Immigration News</h3>
                </div>
                {newsItems.length === 0 ? (
                  <p className="text-[12px] text-[#9ca3af]">No news notifications</p>
                ) : newsItems.map((item, i) => {
                  const route = getNotifRoute(item);
                  return (
                    <div
                      key={item.id}
                      onClick={() => { if (route) { markRead(item.id); navigate(route); } }}
                      className={`py-[10px] ${i < newsItems.length - 1 ? "border-b border-[#f3f4f6]" : ""} ${
                        route ? "cursor-pointer hover:bg-[#f8fafc] -mx-[4px] px-[4px] rounded-[6px] transition-colors" : ""
                      }`}>
                      <div className="flex items-start gap-[8px]">
                        <div className="w-[6px] h-[6px] rounded-full mt-[5px] flex-shrink-0" style={{ backgroundColor: "var(--theme-primary)" }} />
                        <div>
                          <p className="text-[12px] font-semibold text-[#111827] leading-[16px]">{item.title}</p>
                          <p className="text-[11px] text-[#6b7280] mt-[2px] leading-[15px]">{item.body.slice(0, 60)}…</p>
                          <p className="text-[10px] text-[#9ca3af] mt-[4px]">{timeAgo(item.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <button onClick={() => setActiveTab("news")}
                  className="flex items-center gap-[4px] text-[12px] font-medium mt-[8px] transition"
                  style={{ color: "var(--theme-primary)" }}>
                  View All News <ChevronDown size={12} />
                </button>
              </div>

              {/* ── Case Activity ── */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] bg-[#f0fdf4] text-[#22c55e] rounded-[8px] flex items-center justify-center flex-shrink-0">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#111827]">Case Activity</h3>
                </div>
                <div className="mb-[12px]">
                  <div className="flex items-center justify-between mb-[5px]">
                    <span className="text-[12px] text-[#374151]">Case Notifications</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{caseNotifs.length}</span>
                  </div>
                  <div className="w-full h-[6px] bg-[#f1f5f9] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, caseNotifs.length * 20)}%`, background: "var(--theme-primary)" }} />
                  </div>
                </div>
                {[
                  { label: "Unread case updates", value: caseNotifs.filter(n => !n.is_read).length },
                  { label: "Total case activity",  value: caseNotifs.length },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-[7px] border-b border-[#f3f4f6] last:border-0">
                    <span className="text-[12px] text-[#6b7280]">{s.label}</span>
                    <span className="text-[12px] font-bold text-[#111827]">{s.value}</span>
                  </div>
                ))}
                <button onClick={() => setActiveTab("case_update")}
                  className="w-full mt-[14px] text-white text-[12px] font-medium rounded-[8px] py-[8px] hover:opacity-90 transition"
                  style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                  View Case Updates
                </button>
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  );
}