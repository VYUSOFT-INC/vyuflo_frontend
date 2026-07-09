// // src/pages/employee/ApplicationsList.tsx
// import { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useApplications } from "../../hooks/employee/useApplications";
// import { useCurrentUser } from "../../hooks/useAuth";
// import type { Application, ApplicationStatus } from "../../types/employee/application.types";
// import { Search, Plus, Bell } from "lucide-react";

// // ── Assets ────────────────────────────────────────────────────────────────────
// import imgVisaH1b        from "../../assets/icons/applist-visa-h1b.svg";
// import imgVisaF1         from "../../assets/icons/applist-visa-f1.svg";
// import imgStatusProgress from "../../assets/icons/applist-status-progress.svg";
// import imgCheckGreen     from "../../assets/icons/applist-check-green.svg";
// import imgChevronSelect  from "../../assets/icons/applist-chevron-select.svg";
// import imgChevronRight   from "../../assets/icons/applist-chevron-right.svg";

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function formatDate(iso: string): { date: string; time: string } {
//   try {
//     const d = new Date(iso);
//     return {
//       date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
//       time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
//     };
//   } catch {
//     return { date: "—", time: "—" };
//   }
// }

// // ── Status badge config ───────────────────────────────────────────────────────
// function getStatusBadge(status: ApplicationStatus) {
//   switch (status) {
//     case "approved":
//       return { bg: "bg-[#ecfdf5]", border: "border border-[#d1fae5]", text: "text-[#047857]", icon: imgCheckGreen,     label: "Approved" };
//     case "in_progress":
//     case "submitted":
//       return { bg: "bg-[#f0f5ff]", border: "border border-[#e5edff]", text: "text-[#2f35ca]", icon: imgStatusProgress, label: "In Progress" };
//     case "action_needed":
//     case "rfe_response":
//       return { bg: "bg-[#fff7ed]", border: "border border-[#fed7aa]", text: "text-[#c2410c]", icon: imgStatusProgress, label: "Action Needed" };
//     case "rejected":
//       return { bg: "bg-[#fef2f2]", border: "border border-[#fecaca]", text: "text-[#b91c1c]", icon: imgStatusProgress, label: "Rejected" };
//     default:
//       return { bg: "bg-[#f8fafc]", border: "border border-[#e2e8f0]", text: "text-[#475569]", icon: imgStatusProgress, label: "Draft" };
//   }
// }

// // ── Visa icon ─────────────────────────────────────────────────────────────────
// function getVisaIcon(code?: string) {
//   if (!code) return imgVisaF1;
//   const c = code.toUpperCase();
//   if (c.includes("H-1B") || c.includes("H1B")) return imgVisaH1b;
//   return imgVisaF1;
// }

// const PAGE_SIZE = 10;

// // ─────────────────────────────────────────────────────────────────────────────
// export default function ApplicationsList() {
//   const navigate = useNavigate();

//   const { data: user } = useCurrentUser();
//   const fullName       = user ? `${user.first_name} ${user.last_name}` : "—";
//   const userInitials   = user
//     ? `${user.first_name[0] ?? ""}${user.last_name[0] ?? ""}`.toUpperCase()
//     : "?";

//   // ── Filter / sort / search state ──────────────────────────────────────────
//   const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "">("");
//   const [visaFilter,   setVisaFilter]   = useState("");
//   const [sortBy,       setSortBy]       = useState("newest");
//   const [search,       setSearch]       = useState("");
//   const [page,         setPage]         = useState(1);

//   // ── Data ──────────────────────────────────────────────────────────────────
//   const { data, isLoading, error } = useApplications({
//     status: statusFilter || undefined,
//     limit:  200,
//     offset: 0,
//   });

//   const allItems: Application[] = data?.items ?? [];

//   const filtered = allItems.filter(a => {
//     const q           = search.toLowerCase();
//     const matchSearch = !q ||
//       a.application_number?.toLowerCase().includes(q) ||
//       a.visa_type?.name?.toLowerCase().includes(q) ||
//       a.sponsor_employer?.toLowerCase().includes(q);
//     const matchVisa   = !visaFilter || a.visa_type?.code === visaFilter;
//     return matchSearch && matchVisa;
//   });

//   const sorted = [...filtered].sort((a, b) => {
//     if (sortBy === "oldest")
//       return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
//     return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
//   });

//   const totalPages  = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
//   const paginated   = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
//   const showingFrom = sorted.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
//   const showingTo   = Math.min(page * PAGE_SIZE, sorted.length);

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>

//       {/* ══════════════════════════════════════════════════════════════════════
//           TOP HEADER — Figma node 14:12666
//           h-[72px], bg-[rgba(255,255,255,0.8)], border-b border-[#f1f5f9]
//           Left:  "Applications" title + subtitle
//           Right: Search input + Bell button + "+ New Application" CTA
//       ══════════════════════════════════════════════════════════════════════ */}
//       <header className="bg-[rgba(255,255,255,0.8)] border-b border-[#f1f5f9] backdrop-blur-sm
//                          flex h-[72px] items-center justify-between px-[32px] shrink-0 sticky top-0 z-10">

//         {/* Left: title + subtitle — w-[248px] */}
//         <div className="flex flex-col gap-[2px]">
//           <p className="font-bold leading-[28px] text-[#0f172a] text-[20px] tracking-[-0.5px] whitespace-nowrap">
//             Applications
//           </p>
//           <p className="font-normal leading-[16px] text-[#64748b] text-[12px] tracking-[-0.5px] whitespace-nowrap">
//             Manage and track all your visa applications.
//           </p>
//         </div>

//         {/* Right: search + bell + CTA — gap-[16px], h-[40px] */}
//         <div className="flex items-center gap-[16px] h-[40px]">

//           {/* Search input — bg-[#f8fafc], border-[#e2e8f0], rounded-[12px], h-[38px], w-[256px] */}
//           <div className="relative h-[38px] w-[256px]">
//             <input
//               type="text"
//               placeholder="Search applications..."
//               value={search}
//               onChange={e => { setSearch(e.target.value); setPage(1); }}
//               className="bg-[#f8fafc] border border-[#e2e8f0] h-[38px] w-[256px]
//                          pl-[36px] pr-[16px] py-[8px] rounded-[12px]
//                          text-[#1e293b] text-[14px] font-normal tracking-[-0.5px]
//                          focus:outline-none focus:ring-2 focus:ring-[#5269f2] focus:border-transparent
//                          placeholder:text-[#94a3b8] transition-colors"
//             />
//             <Search
//               size={14}
//               className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none"
//             />
//           </div>

//           {/* Bell button — bg-white, border-[#e2e8f0], drop-shadow, rounded-[12px], size-[40px] */}
//           <button
//             type="button"
//             onClick={() => navigate("/notifications")}
//             aria-label="Notifications"
//             className="bg-white border border-[#e2e8f0] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]
//                        flex items-center justify-center relative rounded-[12px] shrink-0 size-[40px]
//                        hover:bg-[#f8fafc] transition-colors"
//           >
//             <Bell size={14} className="text-[#64748b]" />
//             {/* Notification dot — bg-[#5269f2] */}
//             <span className="absolute bg-[#5269f2] border border-white h-[8px] w-[8px]
//                              rounded-full top-[8px] right-[10px]" />
//           </button>

//           {/* + New Application — gradient, rounded-[12px], h-[36px], w-[162px] */}
//           <button
//             type="button"
//             onClick={() => navigate("/applications/new")}
//             className="drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] flex items-center gap-[8px]
//                        h-[36px] justify-center px-[16px] py-[8px] rounded-[12px] shrink-0
//                        text-white text-[14px] font-medium tracking-[-0.5px] leading-[20px]
//                        hover:opacity-90 transition-opacity"
//             style={{ backgroundImage: "linear-gradient(167.47deg, rgb(58,70,229) 0%, rgb(157,78,221) 100%)" }}
//           >
//             <Plus size={12} />
//             New Application
//           </button>
//         </div>
//       </header>

//       {/* ══════════════════════════════════════════════════════════════════════
//           SCROLLABLE CONTENT
//       ══════════════════════════════════════════════════════════════════════ */}
//       <main className="flex-1 overflow-y-auto pb-[48px] pt-[32px] px-[32px]">
//         <div className="flex flex-col gap-[24px] w-full">

//           {/* ── Filter bar ────────────────────────────────────────────────── */}
//           <div className="bg-white border border-[#f1f5f9] drop-shadow-[0px_4px_6px_rgba(0,0,0,0.02)]
//                           flex flex-wrap gap-[16px] items-center p-[17px] rounded-[16px] w-full">

//             {/* Status filter */}
//             <div className="flex items-center gap-[8px] h-[37px]">
//               <span className="text-[#334155] text-[14px] font-medium tracking-[-0.5px] leading-[20px] whitespace-nowrap">
//                 Status:
//               </span>
//               <div className="relative">
//                 <select
//                   value={statusFilter}
//                   onChange={e => { setStatusFilter(e.target.value as ApplicationStatus | ""); setPage(1); }}
//                   className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] h-[37px] pl-[8px] pr-[32px]
//                              text-[#334155] text-[14px] tracking-[-0.5px] appearance-none
//                              focus:outline-none focus:border-indigo-600 cursor-pointer"
//                   style={{ fontFamily: "Inter, sans-serif" }}
//                 >
//                   <option value="">All Statuses</option>
//                   <option value="draft">Draft</option>
//                   <option value="in_progress">In Progress</option>
//                   <option value="action_needed">Action Needed</option>
//                   <option value="submitted">Submitted</option>
//                   <option value="approved">Approved</option>
//                   <option value="rejected">Rejected</option>
//                 </select>
//                 <img src={imgChevronSelect} alt="" className="w-[21px] h-[21px] object-contain absolute right-[6px] top-[8px] pointer-events-none" />
//               </div>
//             </div>

//             {/* Visa Type filter */}
//             <div className="flex items-center gap-[8px] h-[37px]">
//               <span className="text-[#334155] text-[14px] font-medium tracking-[-0.5px] leading-[20px] whitespace-nowrap">
//                 Visa Type:
//               </span>
//               <div className="relative">
//                 <select
//                   value={visaFilter}
//                   onChange={e => { setVisaFilter(e.target.value); setPage(1); }}
//                   className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[8px] h-[37px] pl-[8px] pr-[32px]
//                              text-[#334155] text-[14px] tracking-[-0.5px] appearance-none
//                              focus:outline-none focus:border-indigo-600 cursor-pointer"
//                   style={{ fontFamily: "Inter, sans-serif" }}
//                 >
//                   <option value="">All Types</option>
//                   <option value="H-1B">H-1B</option>
//                   <option value="F-1">F-1</option>
//                   <option value="F-1 OPT">F-1 OPT</option>
//                   <option value="O-1A">O-1A</option>
//                   <option value="L-1">L-1</option>
//                   <option value="EB-2">EB-2</option>
//                 </select>
//                 <img src={imgChevronSelect} alt="" className="w-[21px] h-[21px] object-contain absolute right-[6px] top-[8px] pointer-events-none" />
//               </div>
//             </div>

//             {/* Sort by */}
//             <div className="flex items-center gap-[8px] h-[37px]">
//               <span className="text-[#334155] text-[14px] font-medium tracking-[-0.5px] leading-[20px] whitespace-nowrap">
//                 Sort by:
//               </span>
//               <div className="relative">
//                 <select
//                   value={sortBy}
//                   onChange={e => { setSortBy(e.target.value); setPage(1); }}
//                   className="bg-white border border-[#e2e8f0] rounded-[8px] h-[37px] pl-[8px] pr-[32px]
//                              text-[#334155] text-[14px] tracking-[-0.5px] appearance-none
//                              focus:outline-none focus:border-indigo-600 cursor-pointer"
//                   style={{ fontFamily: "Inter, sans-serif" }}
//                 >
//                   <option value="newest">Date Modified (Newest)</option>
//                   <option value="oldest">Date Modified (Oldest)</option>
//                 </select>
//                 <img src={imgChevronSelect} alt="" className="w-[21px] h-[21px] object-contain absolute right-[6px] top-[8px] pointer-events-none" />
//               </div>
//             </div>
//           </div>

//           {/* ── Table card ────────────────────────────────────────────────── */}
//           <div className="bg-white border border-[#f1f5f9] overflow-hidden rounded-[24px]
//                           shadow-[0px_4px_12px_0px_rgba(0,0,0,0.02)] w-full">

//             {/* Loading */}
//             {isLoading && (
//               <div className="flex items-center justify-center py-[64px]">
//                 <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                 </svg>
//               </div>
//             )}

//             {/* Error */}
//             {error && !isLoading && (
//               <div className="flex items-center justify-center py-[64px]">
//                 <div className="text-center">
//                   <p className="text-[#ef4444] text-[16px] font-medium mb-[4px]">Failed to load applications</p>
//                   <p className="text-[#64748b] text-[14px]">{error}</p>
//                 </div>
//               </div>
//             )}

//             {/* Table */}
//             {!isLoading && !error && (
//               <>
//                 {/* Table header row */}
//                 <div className="bg-[#f8fafc] border-b border-[#f1f5f9]
//                                 grid grid-cols-[1.2fr_1fr_1fr_1fr_80px] h-[50px] items-center px-[24px]">
//                   <span className="text-[#334155] text-[12px] font-semibold tracking-[-0.5px] leading-[16px]">Applicant / ID</span>
//                   <span className="text-[#334155] text-[12px] font-semibold tracking-[-0.5px] leading-[16px]">Visa Category</span>
//                   <span className="text-[#334155] text-[12px] font-semibold tracking-[-0.5px] leading-[16px]">Submission Date</span>
//                   <span className="text-[#334155] text-[12px] font-semibold tracking-[-0.5px] leading-[16px]">Status</span>
//                   <span className="text-[#334155] text-[12px] font-semibold tracking-[-0.5px] leading-[16px] text-right">Action</span>
//                 </div>

//                 {/* Data rows */}
//                 {paginated.length > 0 ? (
//                   paginated.map((app, i) => {
//                     const badge    = getStatusBadge(app.status);
//                     const visaIcon = getVisaIcon(app.visa_type?.code);
//                     const dt       = formatDate(app.submission_date ?? app.created_at);

//                     return (
//                       <div
//                         key={app.id}
//                         onClick={() => navigate(`/applications/${app.id}`)}
//                         className={`cursor-pointer hover:bg-[#f8fafc] transition-colors
//                                     ${i > 0 ? "border-t border-[#f1f5f9]" : ""}`}
//                       >
//                         {/* ── Mobile card (< sm) ── */}
//                         <div className="flex sm:hidden items-start gap-[12px] px-[16px] py-[14px]">
//                           <div className="bg-[#f0f5ff] flex items-center justify-center rounded-full shrink-0 size-[40px]">
//                             <span className="text-indigo-600 text-[14px] font-bold tracking-[-0.5px]">{userInitials}</span>
//                           </div>
//                           <div className="flex-1 min-w-0 flex flex-col gap-[6px]">
//                             <div className="flex items-center justify-between gap-[8px]">
//                               <div className="min-w-0">
//                                 <p className="text-[#0f172a] text-[14px] font-bold tracking-[-0.5px] truncate">{fullName}</p>
//                                 <p className="text-[#64748b] text-[11px] tracking-[-0.5px]">{app.application_number}</p>
//                               </div>
//                               <img src={imgChevronRight} alt="" className="w-[8px] h-[12px] shrink-0" />
//                             </div>
//                             <div className="flex items-center justify-between gap-[8px]">
//                               <div className="flex items-center gap-[5px] min-w-0">
//                                 <img src={visaIcon} alt="" className="w-[12px] h-[12px] shrink-0" />
//                                 <span className="text-[#334155] text-[12px] font-medium tracking-[-0.5px] truncate">
//                                   {app.visa_type?.name ?? "—"}
//                                 </span>
//                               </div>
//                               <span className={`${badge.bg} ${badge.border} ${badge.text}
//                                                inline-flex items-center gap-[5px] shrink-0
//                                                px-[8px] py-[3px] rounded-[6px]
//                                                text-[11px] font-medium whitespace-nowrap`}>
//                                 <img src={badge.icon} alt="" className="w-[8px] h-[9px]" />
//                                 {badge.label}
//                               </span>
//                             </div>
//                             <p className="text-[#94a3b8] text-[11px] tracking-[-0.5px]">{dt.date} · {dt.time}</p>
//                           </div>
//                         </div>

//                         {/* ── Desktop table row (sm+) ── */}
//                         <div className="hidden sm:grid sm:grid-cols-[1.2fr_1fr_1fr_80px] lg:grid-cols-[1.2fr_1fr_1fr_1fr_80px]
//                                         min-h-[64px] items-center py-[8px] px-[24px]">
//                           <div className="flex items-center gap-[12px]">
//                             <div className="bg-[#f0f5ff] flex items-center justify-center rounded-full shrink-0 size-[40px]">
//                               <span className="text-indigo-600 text-[14px] font-bold tracking-[-0.5px]">{userInitials}</span>
//                             </div>
//                             <div className="flex flex-col gap-[2px]">
//                               <span className="text-[#0f172a] text-[14px] font-bold tracking-[-0.5px] whitespace-nowrap">{fullName}</span>
//                               <span className="text-[#64748b] text-[12px] tracking-[-0.5px] whitespace-nowrap">{app.application_number}</span>
//                             </div>
//                           </div>
//                           <div className="flex items-center gap-[8px]">
//                             <img src={visaIcon} alt="" className="w-[14px] h-[14px] shrink-0" />
//                             <span className="text-[#334155] text-[14px] font-medium tracking-[-0.5px] whitespace-nowrap">
//                               {app.visa_type?.name ?? "—"}
//                             </span>
//                           </div>
//                           <div className="flex flex-col gap-[2px]">
//                             <span className="text-[#0f172a] text-[14px] font-medium tracking-[-0.5px] whitespace-nowrap">{dt.date}</span>
//                             <span className="text-[#64748b] text-[12px] tracking-[-0.5px] whitespace-nowrap">{dt.time}</span>
//                           </div>
//                           <div>
//                             <span className={`${badge.bg} ${badge.border} ${badge.text}
//                                              inline-flex items-center gap-[6px] h-[26px]
//                                              pl-[11px] pr-[10px] rounded-[6px]
//                                              text-[12px] font-medium tracking-[-0.5px] whitespace-nowrap`}>
//                               <img src={badge.icon} alt="" className="w-[9px] h-[10px] shrink-0" />
//                               {badge.label}
//                             </span>
//                           </div>
//                           <div className="flex items-center justify-end">
//                             <button type="button"
//                               onClick={e => { e.stopPropagation(); navigate(`/applications/${app.id}`); }}
//                               className="flex items-center justify-center w-[25px] h-[36px] rounded-[8px] hover:bg-[#f1f5f9] transition-colors">
//                               <img src={imgChevronRight} alt="→" className="w-[8.75px] h-[14px]" />
//                             </button>
//                           </div>
//                         </div>
//                       </div>
//                     );
//                   })
//                 ) : (
//                   /* Empty state */
//                   <div className="flex flex-col items-center justify-center py-[64px] text-center">
//                     <p className="text-[#334155] text-[16px] font-semibold mb-[4px]">No applications found</p>
//                     <p className="text-[#94a3b8] text-[14px]">
//                       {search || statusFilter || visaFilter
//                         ? "Try adjusting your filters"
//                         : "Click 'New Application' to get started"}
//                     </p>
//                     <button
//                       type="button"
//                       onClick={() => navigate("/applications/new")}
//                       className="mt-[16px] flex items-center gap-[6px] px-[16px] py-[8px]
//                                  rounded-[12px] text-white text-[14px] font-medium
//                                  hover:opacity-90 transition-opacity"
//                       style={{ backgroundImage: "linear-gradient(167.47deg, rgb(58,70,229) 0%, rgb(157,78,221) 100%)" }}
//                     >
//                       <Plus size={12} />
//                       New Application
//                     </button>
//                   </div>
//                 )}

//                 {/* Pagination footer */}
//                 <div className="bg-[rgba(248,250,252,0.5)] border-t border-[#f1f5f9]
//                                 flex items-center justify-between h-[67px] px-[24px]">
//                   <p className="text-[14px] tracking-[-0.5px] leading-[20px]">
//                     <span className="text-[#64748b] font-normal">Showing </span>
//                     <span className="text-[#0f172a] font-medium">{showingFrom}</span>
//                     <span className="text-[#64748b] font-normal"> to </span>
//                     <span className="text-[#0f172a] font-medium">{showingTo}</span>
//                     <span className="text-[#64748b] font-normal"> of </span>
//                     <span className="text-[#0f172a] font-medium">{sorted.length}</span>
//                     <span className="text-[#64748b] font-normal"> applications</span>
//                   </p>
//                   <div className="flex items-center gap-[8px]">
//                     <button
//                       type="button"
//                       disabled={page <= 1}
//                       onClick={() => setPage(p => Math.max(1, p - 1))}
//                       className="bg-white border border-[#e2e8f0] flex items-center justify-center
//                                  h-[34px] px-[12px] rounded-[8px] text-[#64748b] text-[14px]
//                                  font-medium tracking-[-0.5px] leading-[20px]
//                                  disabled:opacity-50 disabled:cursor-not-allowed
//                                  hover:bg-[#f8fafc] transition-colors"
//                     >
//                       Previous
//                     </button>
//                     <button
//                       type="button"
//                       disabled={page >= totalPages}
//                       onClick={() => setPage(p => Math.min(totalPages, p + 1))}
//                       className="bg-white border border-[#e2e8f0] flex items-center justify-center
//                                  h-[34px] px-[12px] rounded-[8px] text-[#64748b] text-[14px]
//                                  font-medium tracking-[-0.5px] leading-[20px]
//                                  disabled:opacity-50 disabled:cursor-not-allowed
//                                  hover:bg-[#f8fafc] transition-colors"
//                     >
//                       Next
//                     </button>
//                   </div>
//                 </div>
//               </>
//             )}
//           </div>

//         </div>
//       </main>
//     </div>
//   );
// }



// src/pages/employee/ApplicationsList.tsx

import { useState, useMemo, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Download, Search, ChevronDown, LayoutGrid, List,
  Briefcase, FileText, Clock, AlertCircle, CheckCircle2,
  MoreVertical, Eye, Bell, X, Info, AlertTriangle, XCircle,
  ShieldCheck, CalendarClock,
} from 'lucide-react';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useApplications } from '../../hooks/employee/useApplications';
import { useCurrentUser } from '../../hooks/useAuth';
import type { Application, ApplicationStatus } from '../../types/employee/application.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';
const PRIMARY = 'var(--theme-primary)';

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

// function initials(name: string): string {
//   return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
// }

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT
// ─────────────────────────────────────────────────────────────────────────────

function exportApplicationsCSV(apps: Application[], filename = 'my-applications') {
  const esc = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const headers = ['Application #', 'Visa Type', 'Status', 'Sponsor', 'Submitted Date', 'Last Updated'];
  const rows = apps.map(a => [
    a.application_number ?? '',
    a.visa_type?.name ?? '',
    a.status,
    a.sponsor_employer ?? '',
    a.submission_date ?? '',
    a.updated_at,
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
// STATUS TOKEN
// ─────────────────────────────────────────────────────────────────────────────

function statusToken(s: ApplicationStatus): {
  bg: string; text: string; dot: string; label: string; topBar: string;
} {
  switch (s) {
    case 'in_progress':
    case 'submitted':
      return { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6', label: 'In Progress',    topBar: '#3b82f6' };
    case 'action_needed':
    case 'rfe_response':
      return { bg: '#fff7ed', text: '#c2410c', dot: '#f97316', label: 'Action Needed',  topBar: '#f97316' };
    case 'approved':
      return { bg: '#f0fdf4', text: '#15803d', dot: '#22c55e', label: 'Approved',       topBar: '#22c55e' };
    case 'rejected':
      return { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444', label: 'Rejected',       topBar: '#ef4444' };
    default:
      return { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Draft',          topBar: '#94a3b8' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────

interface DropdownItem {
  label:   string;
  icon?:   ReactNode;
  danger?: boolean;
  onClick: () => void;
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
// APPLICATION CARD (grid view)
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationCard({ app, userInitials, userName, onOpen }: {
  app: Application;
  userInitials: string;
  userName: string;
  onOpen: () => void;
}) {
  const navigate = useNavigate();
  const tok = statusToken(app.status);

  const menuItems: DropdownItem[] = [
    { label: 'View Details',   icon: <Eye size={14} />,      onClick: onOpen },
    { label: 'View Documents', icon: <FileText size={14} />, onClick: () => navigate(`/applications/${app.id}?tab=documents`) },
    { label: 'Download CSV',   icon: <Download size={14} />, onClick: () => exportApplicationsCSV([app], `app-${app.application_number}`) },
  ];

  const primaryBtnLabel = app.status === 'action_needed' || app.status === 'rfe_response'
    ? 'Take Action'
    : app.status === 'draft'
    ? 'Continue Application'
    : 'View Details';

  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[14px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)] flex flex-col">
      {/* Top colour bar */}
      <div className="h-[5px]" style={{ backgroundColor: tok.topBar }} />

      <div className="flex-1 p-[20px] flex flex-col gap-[14px]">

        {/* Header row */}
        <div className="flex items-start justify-between gap-[8px]">
          <div className="min-w-0">
            <div className="flex items-center gap-[6px] mb-[6px] flex-wrap">
              <span className="inline-flex items-center px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
                {app.visa_type?.code ?? '—'}
              </span>
              <span className="inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-full text-[11px] font-semibold"
                    style={{ backgroundColor: tok.bg, color: tok.text }}>
                <span className="size-[5px] rounded-full shrink-0" style={{ backgroundColor: tok.dot }} />
                {tok.label}
              </span>
            </div>
            <h3 className="text-[15px] font-bold text-[#0f172a] tracking-[-0.3px] truncate">
              {app.visa_type?.name ?? 'Visa Application'}
            </h3>
            <p className="text-[12px] text-[#94a3b8] mt-[2px]">
              #{app.application_number ?? '—'}
            </p>
          </div>

          <Dropdown
            trigger={
              <button className="size-[28px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] shrink-0">
                <MoreVertical size={15} />
              </button>
            }
            items={menuItems}
          />
        </div>

        {/* Progress bar */}
        {typeof app.progress_percent === 'number' && (
          <div>
            <div className="flex items-center justify-between mb-[6px]">
              <span className="text-[12px] text-[#64748b]">Overall Progress</span>
              <span className="text-[12px] font-semibold text-[#0f172a]">{app.progress_percent}%</span>
            </div>
            <div className="h-[7px] bg-[#f1f5f9] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                   style={{ width: `${app.progress_percent}%`, backgroundColor: tok.topBar }} />
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex flex-col gap-[6px]">
          {app.sponsor_employer && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#64748b]">
              <Briefcase size={12} className="shrink-0" />
              <span className="truncate">{app.sponsor_employer}</span>
            </div>
          )}
          {(app.submission_date ?? app.created_at) && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#64748b]">
              <CalendarClock size={12} className="shrink-0" />
              <span>Submitted: {fmtDate(app.submission_date ?? app.created_at)}</span>
            </div>
          )}
          {app.due_date && (
            <div className="flex items-center gap-[8px] text-[12px]"
                 style={{ color: new Date(app.due_date) < new Date() ? '#dc2626' : '#64748b' }}>
              <Clock size={12} className="shrink-0" />
              <span>Deadline: {fmtDate(app.due_date)}</span>
            </div>
          )}
          {(app.status === 'action_needed' || app.status === 'rfe_response') && (
            <div className="flex items-center gap-[8px] text-[12px] text-[#c2410c]">
              <AlertCircle size={12} className="shrink-0" />
              <span>Your action is required</span>
            </div>
          )}
        </div>

        {/* Applicant row */}
        <div>
          <p className="text-[11px] text-[#94a3b8] font-semibold uppercase tracking-[0.04em] mb-[6px]">Applicant</p>
          <div className="flex items-center gap-[8px]">
            <div className="size-[28px] rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                 style={{ backgroundImage: PRIMARY_GRADIENT }}>
              {userInitials}
            </div>
            <span className="text-[13px] font-medium text-[#334155] truncate">{userName}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-[20px] pb-[16px] flex items-center gap-[8px]">
        <button onClick={onOpen}
          className="flex-1 h-[40px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          {primaryBtnLabel}
        </button>
        <button
          onClick={() => navigate(`/applications/${app.id}?tab=documents`)}
          title="Documents"
          className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
          <FileText size={14} />
        </button>
        <button
          onClick={() => exportApplicationsCSV([app], `app-${app.application_number}`)}
          title="Download CSV"
          className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] transition">
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LIST ROW (list view)
// ─────────────────────────────────────────────────────────────────────────────

function ApplicationListRow({ app, onOpen }: { app: Application; onOpen: () => void }) {
  const navigate = useNavigate();
  const tok = statusToken(app.status);

  const menuItems: DropdownItem[] = [
    { label: 'View Details',   icon: <Eye size={14} />,      onClick: onOpen },
    { label: 'View Documents', icon: <FileText size={14} />, onClick: () => navigate(`/applications/${app.id}?tab=documents`) },
    { label: 'Download CSV',   icon: <Download size={14} />, onClick: () => exportApplicationsCSV([app], `app-${app.application_number}`) },
  ];

  return (
    <div className="flex items-center gap-[14px] px-[20px] py-[13px] border-b border-[#f8fafc] last:border-b-0 hover:bg-[#fafbfc] transition cursor-pointer"
         onClick={onOpen}>
      <div className="w-[3px] h-[36px] rounded-full shrink-0" style={{ backgroundColor: tok.topBar }} />

      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold text-[#0f172a] truncate">
          {app.visa_type?.name ?? 'Visa Application'}
        </p>
        <p className="text-[11px] text-[#94a3b8]">#{app.application_number ?? '—'}</p>
      </div>

      <span className="hidden sm:inline-flex px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[12px] font-semibold text-[#475569] shrink-0">
        {app.visa_type?.code ?? '—'}
      </span>

      <span className="hidden md:inline-flex items-center gap-[5px] px-[10px] py-[3px] rounded-full text-[12px] font-semibold shrink-0"
            style={{ backgroundColor: tok.bg, color: tok.text }}>
        <span className="size-[5px] rounded-full" style={{ backgroundColor: tok.dot }} />
        {tok.label}
      </span>

      {app.sponsor_employer && (
        <span className="hidden lg:inline text-[13px] text-[#64748b] truncate max-w-[140px] shrink-0">
          {app.sponsor_employer}
        </span>
      )}

      {typeof app.progress_percent === 'number' && (
        <div className="hidden lg:flex items-center gap-[8px] w-[100px] shrink-0">
          <div className="flex-1 h-[5px] bg-[#f1f5f9] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${app.progress_percent}%`, backgroundColor: tok.topBar }} />
          </div>
          <span className="text-[11px] text-[#64748b] w-[28px] text-right">{app.progress_percent}%</span>
        </div>
      )}

      <span className="hidden xl:inline text-[12px] text-[#64748b] shrink-0">
        {fmtDate(app.submission_date ?? app.created_at)}
      </span>

      <div className="flex items-center gap-[4px] shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onOpen} title="View"
          className="size-[30px] rounded-[7px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9]">
          <Eye size={14} />
        </button>
        <button onClick={() => exportApplicationsCSV([app], `app-${app.application_number}`)} title="Export CSV"
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
// COMPLETED TABLE
// ─────────────────────────────────────────────────────────────────────────────

function CompletedTable({ apps, onView }: { apps: Application[]; onView: (id: string) => void }) {
  if (!apps.length) return null;
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
      <div className="px-[24px] pt-[20px] pb-[14px] flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Applications</h2>
        <span className="text-[13px] text-[#64748b]">{apps.length} applications</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-t border-b border-[#f1f5f9] bg-[#f9fafb]">
              {['Application', 'Visa Type', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} className="px-[20px] py-[12px] text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-[#64748b]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map(app => {
              const tok = statusToken(app.status);
              return (
                <tr key={app.id} className="border-b border-[#f8fafc] hover:bg-[#fafbfc] transition">
                  <td className="px-[20px] py-[14px]">
                    <p className="text-[14px] font-semibold text-[#0f172a] truncate max-w-[200px]">
                      {app.visa_type?.name ?? 'Visa Application'}
                    </p>
                    <p className="text-[12px] text-[#94a3b8]">#{app.application_number}</p>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <span className="inline-flex items-center px-[8px] py-[3px] rounded-full bg-[#f1f5f9] text-[12px] font-medium text-[#475569]">
                      {app.visa_type?.code ?? '—'}
                    </span>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <span className="inline-flex items-center gap-[5px] text-[12px] font-medium" style={{ color: tok.text }}>
                      <CheckCircle2 size={13} /> {tok.label}
                    </span>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <p className="text-[13px] text-[#1f2937]">{fmtDate(app.updated_at)}</p>
                    <p className="text-[11px] text-[#94a3b8]">{fmtRelative(app.updated_at)}</p>
                  </td>
                  <td className="px-[20px] py-[14px]">
                    <div className="flex items-center gap-[10px]">
                      <button onClick={() => onView(app.id)}
                        className="text-[13px] font-medium text-indigo-600 hover:underline">
                        View
                      </button>
                      <button onClick={() => exportApplicationsCSV([app], `app-${app.application_number}`)}
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
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-[24px]">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        {[0,1,2,3].map(i => <div key={i} className="h-[100px] bg-white border border-[#f1f5f9] rounded-[16px] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {[0,1,2].map(i => <div key={i} className="h-[340px] bg-white border border-[#f1f5f9] rounded-[14px] animate-pulse" />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

const STATUSES: Array<{ value: ApplicationStatus | ''; label: string }> = [
  { value: '',              label: 'All Statuses' },
  { value: 'in_progress',  label: 'In Progress' },
  { value: 'action_needed',label: 'Action Needed' },
  { value: 'submitted',    label: 'Submitted' },
  { value: 'approved',     label: 'Approved' },
  { value: 'rejected',     label: 'Rejected' },
  { value: 'draft',        label: 'Draft' },
];

export default function ApplicationsList() {
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const fullName     = user ? `${user.first_name} ${user.last_name}` : '—';
  const userInitials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?';

  const [search,       setSearch]      = useState('');
  const [statusFilter, setStatus]      = useState<ApplicationStatus | ''>('');
  const [visaFilter,   setVisa]        = useState('');
  const [sortBy,       setSortBy]      = useState('newest');
  const [viewMode,     setViewMode]    = useState<'grid' | 'list'>('grid');
  const [toasts,       setToasts]      = useState<ToastItem[]>([]);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, tone, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3200);
  }, []);

  const { data, isLoading, error } = useApplications({
    status: statusFilter || undefined,
    limit:  200,
    offset: 0,
  });

  const allItems: Application[] = data?.items ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter(a => {
      if (q && !`${a.application_number ?? ''} ${a.visa_type?.name ?? ''} ${a.sponsor_employer ?? ''}`.toLowerCase().includes(q)) return false;
      if (visaFilter && a.visa_type?.code !== visaFilter) return false;
      return true;
    });
  }, [allItems, search, visaFilter]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  }), [filtered, sortBy]);

  const activeApps    = sorted.filter(a => ['in_progress', 'action_needed', 'rfe_response', 'submitted'].includes(a.status));
  const completedApps = sorted.filter(a => ['approved', 'rejected'].includes(a.status));
  const draftApps     = sorted.filter(a => a.status === 'draft');
  const visaTypes     = [...new Set(allItems.map(a => a.visa_type?.code).filter(Boolean) as string[])];

  // KPI counts
  const kpi = useMemo(() => ({
    total:         allItems.length,
    active:        allItems.filter(a => ['in_progress', 'submitted', 'action_needed', 'rfe_response'].includes(a.status)).length,
    approved:      allItems.filter(a => a.status === 'approved').length,
    actionNeeded:  allItems.filter(a => a.status === 'action_needed' || a.status === 'rfe_response').length,
  }), [allItems]);

  const statCards = [
    { label: 'Total Applications', value: kpi.total,        sub: 'All time',           icon: <ShieldCheck size={20} />, bg: '#eef2ff', color: PRIMARY },
    { label: 'In Progress',        value: kpi.active,       sub: 'Active cases',       icon: <Clock size={20} />,       bg: '#f0fdf4', color: '#16a34a' },
    { label: 'Approved',           value: kpi.approved,     sub: 'Successfully done',  icon: <CheckCircle2 size={20} />,bg: '#dcfce7', color: '#15803d' },
    { label: 'Action Needed',      value: kpi.actionNeeded, sub: 'Needs your response',icon: <AlertCircle size={20} />, bg: '#fff7ed', color: '#ea580c' },
  ];

  const headerActions = (
    <>
      <button onClick={() => navigate('/notifications')}
        className="size-[40px] rounded-[10px] border border-[#e5e7eb] flex items-center justify-center text-[#64748b] hover:bg-[#f8fafc] relative">
        <Bell size={16} />
        {kpi.actionNeeded > 0 && (
          <span className="absolute top-[9px] right-[9px] size-[6px] rounded-full bg-[#ef4444] border border-white" />
        )}
      </button>
      <button
        onClick={() => {
          exportApplicationsCSV(filtered, 'my-applications');
          pushToast('success', 'Exported', `${filtered.length} applications saved to CSV`);
        }}
        className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#334155] hover:bg-[#f8fafc]">
        <Download size={14} /> Export
      </button>
      {/* <button onClick={() => navigate('/applications/new')}
        className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
        style={{ backgroundImage: PRIMARY_GRADIENT }}>
        <Plus size={14} /> New Application
      </button> */}
    </>
  );

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: 'Inter, sans-serif' }}>
      <ToastStack items={toasts} onDismiss={id => setToasts(p => p.filter(x => x.id !== id))} />

      <PageHeader
        title="My Applications"
        subtitle="Track and manage all your visa applications in one place."
        showSearch={false}
        showBell={false}
        actions={headerActions}
      />

      <PageContent>
        {isLoading ? <LoadingSkeleton /> : error ? (
          <div className="flex flex-col items-center justify-center py-[80px] text-center">
            <p className="text-[#ef4444] text-[16px] font-medium mb-[12px]">{String(error)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-[28px]">

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
              {statCards.map(s => (
                <div key={s.label} className="bg-white border border-[#f1f5f9] rounded-[16px] p-[20px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-[14px]">
                    <div className="size-[44px] rounded-[12px] flex items-center justify-center shrink-0"
                         style={{ backgroundColor: s.bg, color: s.color }}>{s.icon}</div>
                    <div>
                      <p className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">{s.value}</p>
                      <p className="text-[12px] font-semibold text-[#334155]">{s.label}</p>
                      <p className="text-[11px] text-[#94a3b8]">{s.sub}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Filters ── */}
            <div className="bg-white border border-[#f1f5f9] rounded-[16px] p-[16px] flex flex-col sm:flex-row sm:items-center justify-between gap-[12px] shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[10px] flex-1">

                {/* Search */}
                <div className="relative w-full sm:w-[260px]">
                  <Search size={15} className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applications..."
                    className="w-full h-[44px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[8px] pl-[36px] pr-[12px] text-[13px] text-[#111827] focus:outline-none focus:ring-2 focus:ring-indigo-200 transition" />
                </div>

                {/* Status */}
                <div className="relative">
                  <select value={statusFilter} onChange={e => setStatus(e.target.value as ApplicationStatus | '')}
                    className="appearance-none h-[44px] min-w-[160px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                </div>

                {/* Visa type */}
                {visaTypes.length > 0 && (
                  <div className="relative">
                    <select value={visaFilter} onChange={e => setVisa(e.target.value)}
                      className="appearance-none h-[44px] min-w-[150px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
                      <option value="">All Visa Types</option>
                      {visaTypes.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                  </div>
                )}

                {/* Sort */}
                <div className="relative">
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="appearance-none h-[44px] min-w-[180px] bg-white border border-[#e5e7eb] rounded-[8px] pl-[12px] pr-[32px] text-[13px] text-[#374151] focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer transition">
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af] pointer-events-none" />
                </div>
              </div>

              {/* Grid / List toggle */}
              <div className="flex items-center gap-[4px] bg-[#f1f5f9] rounded-[8px] p-[3px] shrink-0">
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

            {/* ── Active Applications ── */}
            {activeApps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Active Applications</h2>
                  <span className="text-[13px] text-[#64748b]">{activeApps.length} application{activeApps.length !== 1 ? 's' : ''}</span>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                    {activeApps.map(app => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        userInitials={userInitials}
                        userName={fullName}
                        onOpen={() => navigate(`/applications/${app.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border border-[#f1f5f9] rounded-[16px] overflow-hidden shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
                    {activeApps.map(app => (
                      <ApplicationListRow
                        key={app.id}
                        app={app}
                        onOpen={() => navigate(`/applications/${app.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Completed Applications ── */}
            {completedApps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Completed Applications</h2>
                  <span className="text-[13px] text-[#64748b]">{completedApps.length} application{completedApps.length !== 1 ? 's' : ''}</span>
                </div>
                <CompletedTable apps={completedApps} onView={id => navigate(`/applications/${id}`)} />
              </div>
            )}

            {/* ── Draft Applications ── */}
            {draftApps.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-[16px]">
                  <h2 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Drafts</h2>
                  <span className="text-[13px] text-[#64748b]">{draftApps.length} draft{draftApps.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex flex-col gap-[10px]">
                  {draftApps.map(app => (
                    <div key={app.id}
                      className="bg-white border border-[#f1f5f9] rounded-[14px] p-[20px] flex items-center gap-[16px] shadow-[0px_1px_2px_rgba(0,0,0,0.05)]">
                      <div className="size-[48px] rounded-[12px] bg-[#f1f5f9] flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-[#64748b]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[8px] mb-[3px]">
                          <h3 className="text-[15px] font-semibold text-[#0f172a] truncate">
                            {app.visa_type?.name ?? 'Draft Application'}
                          </h3>
                          <span className="px-[8px] py-[2px] rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#64748b]">Draft</span>
                        </div>
                        <p className="text-[12px] text-[#94a3b8]">#{app.application_number ?? '—'}</p>
                        <p className="text-[11px] text-[#94a3b8] mt-[2px]">Last edited: {fmtDate(app.updated_at)}</p>
                      </div>
                      <button
                        onClick={() => navigate(`/applications/${app.id}`)}
                        className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition shrink-0"
                        style={{ backgroundImage: PRIMARY_GRADIENT }}>
                        Continue
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Empty state ── */}
            {sorted.length === 0 && (
              <div className="flex flex-col items-center justify-center py-[60px] text-center bg-white border border-[#f1f5f9] rounded-[16px]">
                <div className="size-[56px] rounded-full bg-[#f1f5f9] flex items-center justify-center mb-[14px]">
                  <Briefcase size={24} className="text-[#94a3b8]" />
                </div>
                <p className="text-[16px] font-semibold text-[#0f172a] mb-[4px]">
                  {search || statusFilter || visaFilter ? 'No applications match your filters' : 'No applications yet'}
                </p>
                <p className="text-[13px] text-[#64748b] mb-[16px]">
                  {search || statusFilter || visaFilter ? 'Try clearing your filters' : 'Start a new application to begin your visa journey'}
                </p>
                <button onClick={() => navigate('/applications/new')}
                  className="flex items-center gap-[6px] h-[40px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
                  style={{ backgroundImage: PRIMARY_GRADIENT }}>
                  <Plus size={14} /> New Application
                </button>
              </div>
            )}

          </div>
        )}
      </PageContent>
    </div>
  );
}