
// // src/pages/employee/DocumentViewer.tsx
// import { useState, useEffect }         from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import { useDocument }                  from "../../hooks/employee/useDocuments";
// import { useOCR }                       from "../../hooks/employee/useOCR";
// import documentsApi                     from "../../api/employee/documents.api";
// import type { OCRField }                from "../../types/employee/ocr.types";
// import type { Document }                from "../../types/employee/document.types";

// // ── Helpers ───────────────────────────────────────────────────────────────────
// function Spinner({ color = "text-indigo-600" }: { color?: string }) {
//   return (
//     <svg className={`w-8 h-8 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
//       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
//       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
//     </svg>
//   );
// }

// function MiniSpinner({ color = "text-[#94a3b8]" }: { color?: string }) {
//   return (
//     <svg className={`w-4 h-4 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
//       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//     </svg>
//   );
// }

// // ── Poor extraction popup ──────────────────────────────────────────────────
// function PoorExtractionModal({ open, onReupload, onDismiss }: {
//   open: boolean;
//   onReupload: () => void;
//   onDismiss: () => void;
// }) {
//   if (!open) return null;
//   return (
//     <>
//       <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onDismiss} />
//       <div className="fixed inset-0 z-[81] flex items-center justify-center p-[16px]">
//         <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
//           <div className="flex items-start gap-[14px]">
//             <div className="size-[44px] rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
//               <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
//                 <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
//                   stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
//               </svg>
//             </div>
//             <div className="min-w-0">
//               <h3 className="text-[16px] font-bold text-[#0f172a]">Most fields couldn't be read</h3>
//               <p className="text-[13px] text-[#64748b] mt-[4px] leading-[19px]">
//                 We couldn't reliably extract the required information from this document.
//                 Please check the image on the left and try uploading a clearer version, or
//                 continue and fill in the missing fields manually.
//               </p>
//             </div>
//           </div>
//           <div className="flex items-center justify-end gap-[10px] mt-[4px]">
//             <button onClick={onDismiss}
//               className="h-[38px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition">
//               Fill In Manually
//             </button>
//             <button onClick={onReupload}
//               className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
//               style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
//               Re-upload a Clearer File
//             </button>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ── LEFT — real scanned image, large, zoomable ─────────────────────────────
// // HOISTED to a real top-level component — this is the fix. Previously this
// // was defined INSIDE DocumentViewer's render body, so React created a brand
// // new component type on every keystroke (any state update in the parent),
// // unmounting and remounting this entire panel each time — which is why
// // typing in the fields felt like it accepted one character at a time before
// // losing focus. A stable, top-level component fixes that: React now
// // correctly re-renders the SAME component in place instead of replacing it.
// // ─────────────────────────────────────────────────────────────────────────────

// interface ViewerPanelProps {
//   doc: Document;
//   fileUrl: string | null;
//   isPdf: boolean;
//   zoom: number;
//   rotation: number;
//   currentPage: number;
//   totalPages: number;
//   setCurrentPage: (updater: (p: number) => number) => void;
// }

// function ViewerPanel({ doc, fileUrl, isPdf, zoom, rotation, currentPage, totalPages, setCurrentPage }: ViewerPanelProps) {
//   return (
//     <div className="flex-1 min-w-0 bg-[#e8ecf0] flex flex-col overflow-hidden relative h-full">
//       <div className="absolute top-[12px] right-[14px] z-10 bg-white/90 backdrop-blur-sm border border-[#e5e7eb] rounded-[6px] px-[8px] py-[3px] text-[11px] text-[#64748b] font-medium shadow-sm">
//         Page {currentPage} of {totalPages}
//       </div>

//       <div className="flex-1 overflow-auto flex items-center justify-center p-[16px] sm:p-[28px]">
//         {!fileUrl ? (
//           <div className="flex flex-col items-center gap-[12px]">
//             <Spinner /><p className="text-[#64748b] text-[13px]">Loading document…</p>
//           </div>
//         ) : isPdf ? (
//           <iframe
//             src={fileUrl}
//             title={doc.name}
//             className="bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[8px]"
//             style={{
//               width: "min(900px, 100%)",
//               height: "80vh",
//               border: "none",
//               transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
//               transformOrigin: "center center",
//             }}
//           />
//         ) : (
//           <img
//             src={fileUrl}
//             alt={doc.name}
//             className="shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[8px] max-w-full max-h-full object-contain transition-transform duration-200"
//             style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
//           />
//         )}
//       </div>

//       {totalPages > 1 && (
//         <div className="bg-white border-t border-[#e5e7eb] flex items-center justify-between px-[16px] sm:px-[20px] h-[44px] shrink-0">
//           <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//             className="flex items-center gap-[4px] text-[#374151] text-[12px] font-medium disabled:opacity-40 hover:text-indigo-600 transition">
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
//             Previous
//           </button>
//           <span className="text-[#64748b] text-[12px]">Page {currentPage} of {totalPages}</span>
//           <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//             className="flex items-center gap-[4px] text-[#374151] text-[12px] font-medium disabled:opacity-40 hover:text-indigo-600 transition">
//             Next
//             <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
//           </button>
//         </div>
//       )}
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // ── RIGHT — clean grid of directly-editable input boxes ────────────────────
// // Also hoisted to a top-level component, same reasoning as ViewerPanel above.
// // ─────────────────────────────────────────────────────────────────────────────

// interface DataPanelProps {
//   doc: Document;
//   fields: OCRField[];
//   avgConfidence: number;
//   ocrLoading: boolean;
//   ocrError: string | null;
//   typeMismatch: boolean;
//   qualityIssue: string | null;
//   detectedType: string | null;
//   missingMandatoryFields: string[];
//   anyLocked: boolean;
//   source: "db" | "ocr" | null;
//   fileBlob: Blob | null;
//   fileName: string;
//   onUpdateEditValue: (id: string, value: string) => void;
//   onDismissMismatch: () => void;
//   onReupload: () => void;
//   onRetryOcr: () => void;
//   onSubmit: () => void;
//   onClosePanel: () => void;
// }

// function DataPanel({
//   doc, fields, avgConfidence, ocrLoading, ocrError, typeMismatch, qualityIssue,
//   detectedType, missingMandatoryFields, anyLocked, source,
//   onUpdateEditValue, onDismissMismatch, onReupload, onRetryOcr, onSubmit, onClosePanel,
// }: DataPanelProps) {
//   return (
//     <div className="flex flex-col h-full overflow-hidden bg-[#f9fafb]">
//       <div className="flex-1 overflow-y-auto p-[24px] sm:p-[32px]">
//         <div className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-[24px] sm:p-[32px] flex flex-col gap-[20px]">

//           <div className="flex items-center justify-between">
//             <h2 className="text-[#111827] text-[20px] sm:text-[24px] font-bold tracking-[-0.5px]">
//               {doc.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase()}
//             </h2>
//             <button onClick={onClosePanel}
//               className="hidden lg:flex text-[#94a3b8] hover:text-[#374151] transition p-[4px] shrink-0">
//               <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
//                 <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//               </svg>
//             </button>
//           </div>

//           {avgConfidence > 0 && (
//             <div className="flex flex-col gap-[4px]">
//               <div className="bg-[#f1f5f9] rounded-full h-[6px] overflow-hidden">
//                 <div className="h-full rounded-full bg-[#22c55e] transition-all duration-700" style={{ width: `${avgConfidence}%` }} />
//               </div>
//               <div className="flex items-center justify-between">
//                 <span className="text-[#94a3b8] text-[11px]">Average confidence</span>
//                 <span className="text-[#0f172a] text-[12px] font-bold">{avgConfidence}%</span>
//               </div>
//             </div>
//           )}

//           {anyLocked && (
//             <div className="bg-[#f1f5f9] border border-[#e2e8f0] rounded-[10px] p-[12px] flex items-center gap-[8px]">
//               <MiniSpinner />
//               <p className="text-[#64748b] text-[12px] font-medium">Extracting real data from the document…</p>
//             </div>
//           )}

//           {qualityIssue === "blurry" && (
//             <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] p-[14px] flex flex-col gap-[8px]">
//               <p className="text-[#92400e] text-[13px] font-semibold">Image too blurry to read</p>
//               <p className="text-[#92400e] text-[12px] leading-[17px]">
//                 Please re-upload a clearer photo — steady the camera, use good lighting,
//                 and fill the frame with the document.
//               </p>
//               <button onClick={onReupload}
//                 className="text-[12px] font-semibold text-[#92400e] bg-white border border-[#fde68a] rounded-[7px] px-[12px] py-[6px] hover:bg-[#fef3c7] transition self-start">
//                 Remove &amp; upload a clearer photo
//               </button>
//             </div>
//           )}

//           {!ocrLoading && typeMismatch && (
//             <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] p-[14px] flex flex-col gap-[8px]">
//               <p className="text-[#92400e] text-[13px] font-semibold leading-[18px]">
//                 This doesn't look like the expected document
//               </p>
//               <p className="text-[#92400e] text-[12px] leading-[17px]">
//                 We expected <span className="font-medium">{doc?.document_type ?? "this document type"}</span>, but
//                 the file looks like{" "}
//                 <span className="font-medium">
//                   {detectedType && detectedType !== "other" ? detectedType.replace(/_/g, " ") : "something else"}
//                 </span>.
//               </p>
//               <div className="flex gap-[8px]">
//                 <button onClick={onReupload}
//                   className="text-[12px] font-semibold text-[#92400e] bg-white border border-[#fde68a] rounded-[7px] px-[12px] py-[6px] hover:bg-[#fef3c7] transition">
//                   Remove &amp; upload a different file
//                 </button>
//                 <button onClick={onDismissMismatch}
//                   className="text-[12px] font-medium text-[#92400e] hover:underline px-[6px] py-[6px]">
//                   This is correct, continue
//                 </button>
//               </div>
//             </div>
//           )}

//           {ocrLoading && fields.length === 0 && (
//             <div className="flex flex-col items-center gap-[10px] py-[40px]">
//               <Spinner /><p className="text-[#64748b] text-[13px]">Extracting data…</p>
//             </div>
//           )}

//           {!ocrLoading && ocrError && (
//             <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] p-[14px]">
//               <p className="text-[#dc2626] text-[13px] leading-[18px]">{ocrError}</p>
//               <button onClick={onRetryOcr}
//                 className="mt-[8px] text-indigo-600 text-[12px] font-medium hover:underline">Retry OCR</button>
//             </div>
//           )}

//           {!ocrLoading && !ocrError && fields.length === 0 && (
//             <div className="text-center py-[40px]">
//               <p className="text-[#94a3b8] text-[13px]">No fields extracted yet.</p>
//               <button onClick={onRetryOcr}
//                 className="mt-[10px] text-indigo-600 text-[13px] font-medium hover:underline">Run OCR</button>
//             </div>
//           )}

//           {fields.length > 0 && (
//             <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[16px] gap-y-[16px]">
//               {fields.map(field => {
//                 const isMissingMandatory = field.is_mandatory && !field.is_locked && !(field.edit_value || field.extracted_value).trim();
//                 const borderColor = field.is_locked
//                   ? "#e2e8f0"
//                   : isMissingMandatory
//                   ? "#ef4444"
//                   : field.needs_review ? "#f59e0b" : "#d1d5db";
//                 const bgColor = field.is_locked
//                   ? "#f8fafc"
//                   : isMissingMandatory
//                   ? "rgba(254,242,242,0.6)"
//                   : field.needs_review ? "rgba(255,251,235,0.5)" : "white";
//                 return (
//                   <div key={field.id} className="flex flex-col gap-[4px]">
//                     <label className="text-[#64748b] text-[11px] font-medium leading-[14px]">
//                       {field.field_name}
//                       {field.is_mandatory && <span className="text-[#ef4444] ml-[3px]">*</span>}
//                     </label>
//                     <div className="relative">
//                       <input
//                         value={field.edit_value ?? field.extracted_value}
//                         onChange={e => onUpdateEditValue(field.id, e.target.value)}
//                         disabled={field.is_locked}
//                         placeholder={field.is_locked ? "" : "Type the value from the document…"}
//                         className="w-full h-[44px] px-[14px] rounded-[8px] text-[#111827] text-[15px] font-semibold border-2 focus:outline-none focus:border-indigo-600 disabled:cursor-not-allowed placeholder:text-[13px] placeholder:font-normal placeholder:text-[#94a3b8]"
//                         style={{ borderColor, backgroundColor: bgColor }}
//                       />
//                       {field.is_locked && (
//                         <div className="absolute right-[12px] top-1/2 -translate-y-1/2">
//                           <MiniSpinner />
//                         </div>
//                       )}
//                     </div>
//                     {field.is_locked ? (
//                       <p className="text-[#94a3b8] text-[10px] italic">Extracting…</p>
//                     ) : isMissingMandatory ? (
//                       <p className="text-[#dc2626] text-[10px]">This field is required.</p>
//                     ) : field.needs_review && (
//                       <p className="text-[#d97706] text-[10px]">Please verify this is correct.</p>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           )}

//           {fields.length > 0 && (
//             <div className="flex items-center gap-[12px] pt-[12px] border-t border-[#f1f5f9]">
//               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0">
//                 <rect x="3" y="10" width="18" height="11" rx="2" stroke="#94a3b8" strokeWidth="1.5"/>
//                 <circle cx="12" cy="5" r="2" stroke="#94a3b8" strokeWidth="1.5"/>
//                 <path d="M12 7v3M8 14h.01M16 14h.01M9 17h6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
//               </svg>
//               <div className="flex-1 min-w-0">
//                 {anyLocked ? (
//                   <p className="text-[#64748b] text-[12px] font-medium flex items-center gap-[6px]">
//                     <MiniSpinner /> Extracting real data — please wait…
//                   </p>
//                 ) : missingMandatoryFields.length > 0 ? (
//                   <p className="text-[#dc2626] text-[12px] font-medium">
//                     Missing required: {missingMandatoryFields.join(", ")}
//                   </p>
//                 ) : null}
//               </div>
//               <button onClick={onSubmit}
//                 disabled={missingMandatoryFields.length > 0 || anyLocked}
//                 className="shrink-0 h-[38px] px-[24px] rounded-[8px] text-white text-[13px] font-semibold transition
//                            disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
//                 style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
//                 {anyLocked ? "Extracting…" : source === "db" ? "Update" : "Submit"}
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─────────────────────────────────────────────────────────────────────────────
// export default function DocumentViewer() {
//   const navigate       = useNavigate();
//   const [searchParams] = useSearchParams();
//   const docId          = searchParams.get("doc_id")         ?? undefined;
//   const returnAppId    = searchParams.get("application_id") ?? undefined;
//   const returnUrl = searchParams.get("return_url")
//   ? decodeURIComponent(searchParams.get("return_url")!)
//   : returnAppId
//   ? `/applications/${returnAppId}`
//   : "/documents";

//   const { data: doc, isLoading: docLoading, error: docError } = useDocument(docId);

//   const [fileUrl,     setFileUrl]     = useState<string | null>(null);
//   const [fileName,    setFileName]    = useState<string>("");
//   const [fileBlob,    setFileBlob]    = useState<Blob | null>(null);
//   const [zoom,        setZoom]        = useState(100);
//   const [rotation,    setRotation]    = useState(0);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [rightOpen,   setRightOpen]   = useState(true);

//   const [mobileTab, setMobileTab] = useState<"viewer" | "data">("viewer");
//   const [showPoorExtractionModal, setShowPoorExtractionModal] = useState(false);

//   const totalPages = doc?.total_pages ?? 1;
//   const isPdf      = doc?.file_type === "pdf" || fileName.endsWith(".pdf");

//   const {
//     fields, avgConfidence, source,
//     isLoading: ocrLoading, error: ocrError,
//     detectedType, typeMismatch, dismissMismatch, qualityIssue,
//     missingMandatoryFields,
//     loadFields, submitFields, updateEditValue,
//   } = useOCR(docId);

//   const anyLocked = fields.some(f => f.is_locked);

//   useEffect(() => {
//     if (!docId) return;
//     let objectUrl: string;
//     documentsApi.getFile(docId)
//       .then(({ blob, fileName: name }) => {
//         objectUrl = URL.createObjectURL(blob);
//         setFileUrl(objectUrl);
//         setFileName(name);
//         setFileBlob(blob);
//       })
//       .catch(err => console.error("Failed to load document file:", err));
//     return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
//   }, [docId]);

//   useEffect(() => {
//     if (fileBlob && fileName && fields.length === 0 && !ocrLoading) {
//       void loadFields(fileBlob, fileName);
//     }
//   }, [fileBlob, fileName]); // eslint-disable-line react-hooks/exhaustive-deps

//   useEffect(() => {
//     if (qualityIssue === "poor_extraction") {
//       setShowPoorExtractionModal(true);
//     }
//   }, [qualityIssue]);

//   function exportData() {
//     const rows = fields.map(f =>
//       `"${f.field_name}","${f.extracted_value}",${f.confidence_score},${f.is_confirmed}`
//     );
//     const csv  = ["Field Name,Extracted Value,Confidence,Confirmed", ...rows].join("\n");
//     const blob = new Blob([csv], { type: "text/csv" });
//     const url  = URL.createObjectURL(blob);
//     const a    = document.createElement("a");
//     a.href = url; a.download = `${doc?.name ?? "document"}_data.csv`; a.click();
//     URL.revokeObjectURL(url);
//   }

//   function handleDownload() {
//     if (!fileUrl || !doc) return;
//     const a = document.createElement("a");
//     a.href = fileUrl; a.download = doc.name; a.click();
//   }

//   async function handleReupload() {
//     setShowPoorExtractionModal(false);
//     if (!docId) return;
//     try { await documentsApi.delete(docId); } catch { /* ignore */ }
//     navigate(returnUrl);
//   }

//   async function handleSubmit() {
//     await submitFields();
//     navigate(returnUrl);
//   }

//   function handleRetryOcr() {
//     if (fileBlob) void loadFields(fileBlob, fileName);
//   }

//   const confirmedCount = fields.filter(f => f.is_confirmed).length;
//   const reviewCount    = fields.filter(f => f.needs_review && !f.is_confirmed && !f.is_locked).length;

//   if (docLoading) {
//     return <div className="flex items-center justify-center h-full py-[64px]"><Spinner /></div>;
//   }
//   if (docError || !doc) {
//     return (
//       <div className="flex items-center justify-center h-full py-[64px]">
//         <div className="text-center">
//           <p className="text-[#ef4444] text-[15px] font-medium mb-[4px]">Document not found</p>
//           <p className="text-[#64748b] text-[13px] mb-[12px]">{docError ?? "Check the document ID"}</p>
//           <button onClick={() => navigate("/documents")} className="text-indigo-600 text-[13px] font-medium hover:underline">
//             ← Back to Document Hub
//           </button>
//         </div>
//       </div>
//     );
//   }

//   // ─────────────────────────────────────────────────────────────────────────
//   return (
//     <div className="flex flex-col bg-[#f9fafb] overflow-hidden"
//       style={{ fontFamily: "Inter, sans-serif", height: "calc(100dvh - 56px)" }}>

//       <PoorExtractionModal
//         open={showPoorExtractionModal}
//         onReupload={handleReupload}
//         onDismiss={() => setShowPoorExtractionModal(false)}
//       />

//       {/* ── TOP BAR ── */}
//       <div className="bg-white border-b border-[#e5e7eb] flex items-center h-[48px] sm:h-[52px] px-[12px] sm:px-[16px] shrink-0 gap-[8px] sm:gap-[12px]">
//         <button onClick={() => navigate(returnAppId ? `/applications/${returnAppId}` : "/documents")}
//           className="flex items-center gap-[6px] text-[#64748b] text-[12px] sm:text-[13px] font-medium hover:text-[#0f172a] transition whitespace-nowrap shrink-0">
//           <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
//             <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//           </svg>
//           <span className="hidden sm:inline">Back to Case</span>
//           <span className="sm:hidden">Back</span>
//         </button>

//         <div className="h-[20px] w-px bg-[#e5e7eb] shrink-0" />

//         <div className="flex items-center gap-[8px] min-w-0 flex-1">
//           <div className="bg-[#fee2e2] rounded-[5px] flex items-center justify-center w-[28px] h-[32px] shrink-0">
//             <span className="text-[#ef4444] text-[7px] font-black">PDF</span>
//           </div>
//           <div className="flex flex-col min-w-0">
//             <span className="text-[#0f172a] text-[12px] sm:text-[13px] font-semibold leading-[16px] truncate">{doc.name}</span>
//             <span className="text-[#94a3b8] text-[10px] sm:text-[11px] leading-[14px] hidden sm:block">
//               {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
//             </span>
//           </div>
//         </div>

//         <div className="hidden sm:flex items-center gap-[3px] shrink-0">
//           <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="size-[26px] border border-[#e5e7eb] rounded-[5px] text-[#374151] flex items-center justify-center hover:bg-[#f9fafb] transition text-[14px] font-medium">−</button>
//           <span className="text-[#374151] text-[12px] font-medium w-[42px] text-center">{zoom}%</span>
//           <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="size-[26px] border border-[#e5e7eb] rounded-[5px] text-[#374151] flex items-center justify-center hover:bg-[#f9fafb] transition text-[14px] font-medium">+</button>
//         </div>

//         <button onClick={() => setRotation(r => (r + 90) % 360)}
//           className="hidden sm:flex items-center gap-[5px] h-[30px] px-[10px] border border-[#e5e7eb] rounded-[7px] text-[#374151] text-[12px] font-medium hover:bg-[#f9fafb] transition shrink-0">
//           <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
//             <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//             <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//           </svg>
//           Rotate
//         </button>

//         <button onClick={handleDownload}
//           className="flex items-center gap-[5px] h-[30px] px-[8px] sm:px-[10px] border border-[#e5e7eb] rounded-[7px] text-[#374151] text-[12px] font-medium hover:bg-[#f9fafb] transition shrink-0">
//           <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
//             <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
//           </svg>
//           <span className="hidden sm:inline">Download</span>
//         </button>
//       </div>

//       {/* ── MOBILE TABS ── */}
//       <div className="lg:hidden flex items-center border-b border-[#e5e7eb] bg-white shrink-0">
//         {([
//           { id: "viewer", label: "Document" },
//           { id: "data",   label: `Fields${fields.length > 0 ? ` (${fields.length})` : ""}` },
//         ] as const).map(tab => (
//           <button key={tab.id} onClick={() => setMobileTab(tab.id)}
//             className={`flex-1 py-[10px] text-[13px] font-medium border-b-2 transition-colors ${
//               mobileTab === tab.id
//                 ? "border-indigo-600 text-indigo-600"
//                 : "border-transparent text-[#6b7280]"
//             }`}>
//             {tab.label}
//           </button>
//         ))}
//       </div>

//       {/* ── BODY ── */}
//       <div className="lg:hidden flex-1 min-h-0 overflow-hidden">
//         {mobileTab === "viewer" && (
//           <ViewerPanel
//             doc={doc} fileUrl={fileUrl} isPdf={isPdf} zoom={zoom} rotation={rotation}
//             currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
//           />
//         )}
//         {mobileTab === "data" && (
//           <DataPanel
//             doc={doc} fields={fields} avgConfidence={avgConfidence} ocrLoading={ocrLoading}
//             ocrError={ocrError} typeMismatch={typeMismatch} qualityIssue={qualityIssue}
//             detectedType={detectedType} missingMandatoryFields={missingMandatoryFields}
//             anyLocked={anyLocked} source={source} fileBlob={fileBlob} fileName={fileName}
//             onUpdateEditValue={updateEditValue} onDismissMismatch={dismissMismatch}
//             onReupload={handleReupload} onRetryOcr={handleRetryOcr} onSubmit={handleSubmit}
//             onClosePanel={() => { setRightOpen(false); setMobileTab("viewer"); }}
//           />
//         )}
//       </div>

//       <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
//         <div className="flex-1 min-w-0">
//           <ViewerPanel
//             doc={doc} fileUrl={fileUrl} isPdf={isPdf} zoom={zoom} rotation={rotation}
//             currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
//           />
//         </div>
//         {rightOpen ? (
//           <div className="flex-1 min-w-0 border-l border-[#e5e7eb]">
//             <DataPanel
//               doc={doc} fields={fields} avgConfidence={avgConfidence} ocrLoading={ocrLoading}
//               ocrError={ocrError} typeMismatch={typeMismatch} qualityIssue={qualityIssue}
//               detectedType={detectedType} missingMandatoryFields={missingMandatoryFields}
//               anyLocked={anyLocked} source={source} fileBlob={fileBlob} fileName={fileName}
//               onUpdateEditValue={updateEditValue} onDismissMismatch={dismissMismatch}
//               onReupload={handleReupload} onRetryOcr={handleRetryOcr} onSubmit={handleSubmit}
//               onClosePanel={() => setRightOpen(false)}
//             />
//           </div>
//         ) : fields.length > 0 && (
//           <div className="absolute bottom-[64px] left-1/2 -translate-x-1/2 z-20">
//             <button onClick={() => setRightOpen(true)}
//               className="flex items-center gap-[8px] h-[44px] px-[20px] rounded-full bg-white border border-[#e5e7eb] text-[#374151] text-[13px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-[#f9fafb] hover:shadow-[0_6px_20px_rgba(0,0,0,0.16)] transition-all whitespace-nowrap">
//               <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
//                 <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
//                 <path d="M9 4v16" stroke="currentColor" strokeWidth="2"/>
//               </svg>
//               Show Fields
//               {missingMandatoryFields.length > 0 && (
//                 <span className="size-[7px] rounded-full bg-[#ef4444] shrink-0" />
//               )}
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ── BOTTOM STATUS BAR ── */}
//       <div className="bg-white border-t border-[#e5e7eb] flex items-center justify-between h-[48px] px-[12px] sm:px-[16px] shrink-0">
//         <div className="flex items-center gap-[10px] sm:gap-[14px]">
//           <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#374151]">
//             <span className="size-[7px] rounded-full bg-[#22c55e] shrink-0" />
//             {confirmedCount} confirmed
//           </span>
//           {reviewCount > 0 && (
//             <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#d97706]">
//               <span className="size-[7px] rounded-full bg-[#f59e0b] shrink-0" />
//               {reviewCount} review
//             </span>
//           )}
//           {missingMandatoryFields.length > 0 && !anyLocked && (
//             <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#dc2626]">
//               <span className="size-[7px] rounded-full bg-[#ef4444] shrink-0" />
//               {missingMandatoryFields.length} required
//             </span>
//           )}
//           {anyLocked && (
//             <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#64748b]">
//               <MiniSpinner /> extracting
//             </span>
//           )}
//         </div>
//         <button onClick={exportData}
//           className="flex items-center gap-[6px] h-[32px] px-[14px] rounded-[8px] text-white text-[12px] font-semibold hover:opacity-90 transition"
//           style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))' }}>
//           <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
//             <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
//               stroke="white" strokeWidth="2" strokeLinecap="round"/>
//           </svg>
//           Export Data
//         </button>
//       </div>
//     </div>
//   );
// }


// src/pages/employee/DocumentViewer.tsx
//
// FIXED: isFreshUpload was driven only by a ?fresh=1 URL flag, which nothing
// sets anymore now that DocumentHub no longer navigates here after upload
// (and DocCard/DocRow's onClick never added it either). That silently killed
// the "warn before leaving an unconfirmed upload" feature — Back just left
// without asking, even mid-extraction.
// Fix: derive "needs confirmation" from the document's own ocr_status
// instead of a URL flag, so it works regardless of entry point. isFreshUpload
// (the URL flag) is still respected if present, but is no longer required.

import { useState, useEffect }         from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDocument }                  from "../../hooks/employee/useDocuments";
import { useOCR }                       from "../../hooks/employee/useOCR";
import documentsApi                     from "../../api/employee/documents.api";
import type { OCRField }                from "../../types/employee/ocr.types";
import type { Document }                from "../../types/employee/document.types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Spinner({ color = "text-indigo-600" }: { color?: string }) {
  return (
    <svg className={`w-8 h-8 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

function MiniSpinner({ color = "text-[#94a3b8]" }: { color?: string }) {
  return (
    <svg className={`w-4 h-4 animate-spin ${color}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ── Poor extraction popup ──────────────────────────────────────────────────
function PoorExtractionModal({ open, onReupload, onDismiss }: {
  open: boolean;
  onReupload: () => void;
  onDismiss: () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={onDismiss} />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-start gap-[14px]">
            <div className="size-[44px] rounded-full bg-[#fef3c7] flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
                  stroke="#d97706" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-[#0f172a]">Most fields couldn't be read</h3>
              <p className="text-[13px] text-[#64748b] mt-[4px] leading-[19px]">
                We couldn't reliably extract the required information from this document.
                Please check the image on the left and try uploading a clearer version, or
                continue and fill in the missing fields manually.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-[10px] mt-[4px]">
            <button onClick={onDismiss}
              className="h-[38px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition">
              Fill In Manually
            </button>
            <button onClick={onReupload}
              className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition"
              style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
              Re-upload a Clearer File
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Leave / Cancel confirmation ────────────────────────────────────────────
function LeaveModal({ open, mode, saving, onSave, onDiscard, onLeaveWithoutSaving, onKeepEditing }: {
  open:  boolean;
  mode:  "fresh" | "edit" | null;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onLeaveWithoutSaving: () => void;
  onKeepEditing: () => void;
}) {
  if (!open || !mode) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[80]" onClick={saving ? undefined : onKeepEditing} />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[420px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div>
            <h3 className="text-[16px] font-bold text-[#0f172a]">
              {mode === "fresh" ? "This document hasn't been confirmed" : "You have unsaved changes"}
            </h3>
            <p className="text-[13px] text-[#64748b] mt-[6px] leading-[19px]">
              {mode === "fresh"
                ? "You haven't submitted this document's fields yet. Save it, discard it, or keep reviewing."
                : "Save your changes before leaving, or leave without saving."}
            </p>
          </div>
          <div className="flex items-center justify-end gap-[10px] flex-wrap">
            {mode === "fresh" && (
              <button onClick={onDiscard} disabled={saving}
                className="h-[38px] px-[14px] rounded-[10px] border border-[#fecaca] text-[#dc2626] text-[13px] font-medium hover:bg-[#fef2f2] transition disabled:opacity-50">
                Discard Upload
              </button>
            )}
            {mode === "edit" && (
              <button onClick={onLeaveWithoutSaving} disabled={saving}
                className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[#374151] text-[13px] font-medium hover:bg-[#f8fafc] transition disabled:opacity-50">
                Leave Without Saving
              </button>
            )}
            <button onClick={onKeepEditing} disabled={saving}
              className="h-[38px] px-[14px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50">
              Keep Editing
            </button>
            <button onClick={onSave} disabled={saving}
              className="h-[38px] px-[16px] rounded-[10px] text-white text-[13px] font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center gap-[6px]"
              style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
              {saving && <MiniSpinner color="text-white" />}
              Save & Leave
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── LEFT — real scanned image, large, zoomable ─────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface ViewerPanelProps {
  doc: Document;
  fileUrl: string | null;
  isPdf: boolean;
  zoom: number;
  rotation: number;
  currentPage: number;
  totalPages: number;
  setCurrentPage: (updater: (p: number) => number) => void;
}

function ViewerPanel({ doc, fileUrl, isPdf, zoom, rotation, currentPage, totalPages, setCurrentPage }: ViewerPanelProps) {
  return (
    <div className="flex-1 min-w-0 bg-[#e8ecf0] flex flex-col overflow-hidden relative h-full">
      <div className="absolute top-[12px] right-[14px] z-10 bg-white/90 backdrop-blur-sm border border-[#e5e7eb] rounded-[6px] px-[8px] py-[3px] text-[11px] text-[#64748b] font-medium shadow-sm">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex-1 overflow-auto flex items-center justify-center p-[16px] sm:p-[28px]">
        {!fileUrl ? (
          <div className="flex flex-col items-center gap-[12px]">
            <Spinner /><p className="text-[#64748b] text-[13px]">Loading document…</p>
          </div>
        ) : isPdf ? (
          <iframe
            src={fileUrl}
            title={doc.name}
            className="bg-white shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[8px]"
            style={{
              width: "min(900px, 100%)",
              height: "80vh",
              border: "none",
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          <img
            src={fileUrl}
            alt={doc.name}
            className="shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[8px] max-w-full max-h-full object-contain transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100}) rotate(${rotation}deg)` }}
          />
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-white border-t border-[#e5e7eb] flex items-center justify-between px-[16px] sm:px-[20px] h-[44px] shrink-0">
          <button disabled={currentPage <= 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="flex items-center gap-[4px] text-[#374151] text-[12px] font-medium disabled:opacity-40 hover:text-indigo-600 transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Previous
          </button>
          <span className="text-[#64748b] text-[12px]">Page {currentPage} of {totalPages}</span>
          <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="flex items-center gap-[4px] text-[#374151] text-[12px] font-medium disabled:opacity-40 hover:text-indigo-600 transition">
            Next
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ── RIGHT — clean grid of directly-editable input boxes ────────────────────
// ─────────────────────────────────────────────────────────────────────────────

interface DataPanelProps {
  doc: Document;
  fields: OCRField[];
  avgConfidence: number;
  ocrLoading: boolean;
  ocrError: string | null;
  typeMismatch: boolean;
  qualityIssue: string | null;
  detectedType: string | null;
  missingMandatoryFields: string[];
  anyLocked: boolean;
  source: "db" | "ocr" | null;
  fileBlob: Blob | null;
  fileName: string;
  showCancelUpload: boolean;
  onUpdateEditValue: (id: string, value: string) => void;
  onDismissMismatch: () => void;
  onReupload: () => void;
  onRetryOcr: () => void;
  onSubmit: () => void;
  onCancelUpload: () => void;
  onClosePanel: () => void;
}

function DataPanel({
  doc, fields, avgConfidence, ocrLoading, ocrError, typeMismatch, qualityIssue,
  detectedType, missingMandatoryFields, anyLocked, source, showCancelUpload,
  onUpdateEditValue, onDismissMismatch, onReupload, onRetryOcr, onSubmit, onCancelUpload, onClosePanel,
}: DataPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f9fafb]">
      <div className="flex-1 overflow-y-auto p-[24px] sm:p-[32px]">
        <div className="bg-white rounded-[12px] shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-[24px] sm:p-[32px] flex flex-col gap-[20px]">

          <div className="flex items-center justify-between">
            <h2 className="text-[#111827] text-[20px] sm:text-[24px] font-bold tracking-[-0.5px]">
              {doc.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ").toUpperCase()}
            </h2>
            <button onClick={onClosePanel}
              className="hidden lg:flex text-[#94a3b8] hover:text-[#374151] transition p-[4px] shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {avgConfidence > 0 && (
            <div className="flex flex-col gap-[4px]">
              <div className="bg-[#f1f5f9] rounded-full h-[6px] overflow-hidden">
                <div className="h-full rounded-full bg-[#22c55e] transition-all duration-700" style={{ width: `${avgConfidence}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#94a3b8] text-[11px]">Average confidence</span>
                <span className="text-[#0f172a] text-[12px] font-bold">{avgConfidence}%</span>
              </div>
            </div>
          )}

          {anyLocked && (
            <div className="bg-[#f1f5f9] border border-[#e2e8f0] rounded-[10px] p-[12px] flex items-center gap-[8px]">
              <MiniSpinner />
              <p className="text-[#64748b] text-[12px] font-medium">Extracting real data from the document…</p>
            </div>
          )}

          {qualityIssue === "blurry" && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] p-[14px] flex flex-col gap-[8px]">
              <p className="text-[#92400e] text-[13px] font-semibold">Image too blurry to read</p>
              <p className="text-[#92400e] text-[12px] leading-[17px]">
                Please re-upload a clearer photo — steady the camera, use good lighting,
                and fill the frame with the document.
              </p>
              <button onClick={onReupload}
                className="text-[12px] font-semibold text-[#92400e] bg-white border border-[#fde68a] rounded-[7px] px-[12px] py-[6px] hover:bg-[#fef3c7] transition self-start">
                Remove &amp; upload a clearer photo
              </button>
            </div>
          )}

          {!ocrLoading && typeMismatch && (
            <div className="bg-[#fffbeb] border border-[#fde68a] rounded-[10px] p-[14px] flex flex-col gap-[8px]">
              <p className="text-[#92400e] text-[13px] font-semibold leading-[18px]">
                This doesn't look like the expected document
              </p>
              <p className="text-[#92400e] text-[12px] leading-[17px]">
                We expected <span className="font-medium">{doc?.document_type ?? "this document type"}</span>, but
                the file looks like{" "}
                <span className="font-medium">
                  {detectedType && detectedType !== "other" ? detectedType.replace(/_/g, " ") : "something else"}
                </span>.
              </p>
              <div className="flex gap-[8px]">
                <button onClick={onReupload}
                  className="text-[12px] font-semibold text-[#92400e] bg-white border border-[#fde68a] rounded-[7px] px-[12px] py-[6px] hover:bg-[#fef3c7] transition">
                  Remove &amp; upload a different file
                </button>
                <button onClick={onDismissMismatch}
                  className="text-[12px] font-medium text-[#92400e] hover:underline px-[6px] py-[6px]">
                  This is correct, continue
                </button>
              </div>
            </div>
          )}

          {ocrLoading && fields.length === 0 && (
            <div className="flex flex-col items-center gap-[10px] py-[40px]">
              <Spinner /><p className="text-[#64748b] text-[13px]">Extracting data…</p>
            </div>
          )}

          {!ocrLoading && ocrError && (
            <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] p-[14px]">
              <p className="text-[#dc2626] text-[13px] leading-[18px]">{ocrError}</p>
              <button onClick={onRetryOcr}
                className="mt-[8px] text-indigo-600 text-[12px] font-medium hover:underline">Retry OCR</button>
            </div>
          )}

          {!ocrLoading && !ocrError && fields.length === 0 && (
            <div className="text-center py-[40px]">
              <p className="text-[#94a3b8] text-[13px]">No fields extracted yet.</p>
              <button onClick={onRetryOcr}
                className="mt-[10px] text-indigo-600 text-[13px] font-medium hover:underline">Run OCR</button>
            </div>
          )}

          {fields.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-[16px] gap-y-[16px]">
              {fields.map(field => {
                const isMissingMandatory = field.is_mandatory && !field.is_locked && !(field.edit_value || field.extracted_value).trim();
                const borderColor = field.is_locked
                  ? "#e2e8f0"
                  : isMissingMandatory
                  ? "#ef4444"
                  : field.needs_review ? "#f59e0b" : "#d1d5db";
                const bgColor = field.is_locked
                  ? "#f8fafc"
                  : isMissingMandatory
                  ? "rgba(254,242,242,0.6)"
                  : field.needs_review ? "rgba(255,251,235,0.5)" : "white";
                return (
                  <div key={field.id} className="flex flex-col gap-[4px]">
                    <label className="text-[#64748b] text-[11px] font-medium leading-[14px]">
                      {field.field_name}
                      {field.is_mandatory && <span className="text-[#ef4444] ml-[3px]">*</span>}
                    </label>
                    <div className="relative">
                      <input
                        value={field.edit_value ?? field.extracted_value}
                        onChange={e => onUpdateEditValue(field.id, e.target.value)}
                        disabled={field.is_locked}
                        placeholder={field.is_locked ? "" : "Type the value from the document…"}
                        className="w-full h-[44px] px-[14px] rounded-[8px] text-[#111827] text-[15px] font-semibold border-2 focus:outline-none focus:border-indigo-600 disabled:cursor-not-allowed placeholder:text-[13px] placeholder:font-normal placeholder:text-[#94a3b8]"
                        style={{ borderColor, backgroundColor: bgColor }}
                      />
                      {field.is_locked && (
                        <div className="absolute right-[12px] top-1/2 -translate-y-1/2">
                          <MiniSpinner />
                        </div>
                      )}
                    </div>
                    {field.is_locked ? (
                      <p className="text-[#94a3b8] text-[10px] italic">Extracting…</p>
                    ) : isMissingMandatory ? (
                      <p className="text-[#dc2626] text-[10px]">This field is required.</p>
                    ) : field.needs_review && (
                      <p className="text-[#d97706] text-[10px]">Please verify this is correct.</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {fields.length > 0 && (
            <div className="flex items-center gap-[12px] pt-[12px] border-t border-[#f1f5f9] flex-wrap">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="10" width="18" height="11" rx="2" stroke="#94a3b8" strokeWidth="1.5"/>
                <circle cx="12" cy="5" r="2" stroke="#94a3b8" strokeWidth="1.5"/>
                <path d="M12 7v3M8 14h.01M16 14h.01M9 17h6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <div className="flex-1 min-w-0">
                {anyLocked ? (
                  <p className="text-[#64748b] text-[12px] font-medium flex items-center gap-[6px]">
                    <MiniSpinner /> Extracting real data — please wait…
                  </p>
                ) : missingMandatoryFields.length > 0 ? (
                  <p className="text-[#dc2626] text-[12px] font-medium">
                    Missing required: {missingMandatoryFields.join(", ")}
                  </p>
                ) : null}
              </div>

              {/* Cancel Upload — shown for any document not yet confirmed, not
                  just ones opened with ?fresh=1 (see showCancelUpload derivation
                  in the parent — driven by doc.ocr_status now, not a URL flag) */}
              {showCancelUpload && (
                <button onClick={onCancelUpload}
                  className="shrink-0 h-[38px] px-[16px] rounded-[8px] border border-[#fecaca] text-[#dc2626] text-[13px] font-medium hover:bg-[#fef2f2] transition">
                  Cancel Upload
                </button>
              )}

              <button onClick={onSubmit}
                disabled={missingMandatoryFields.length > 0 || anyLocked}
                className="shrink-0 h-[38px] px-[24px] rounded-[8px] text-white text-[13px] font-semibold transition
                           disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" }}>
                {anyLocked ? "Extracting…" : source === "db" ? "Update" : "Submit"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function DocumentViewer() {
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();
  const docId          = searchParams.get("doc_id")         ?? undefined;
  const returnAppId    = searchParams.get("application_id") ?? undefined;
  const freshFlag      = searchParams.get("fresh") === "1"; // still respected if present
  const returnUrl = searchParams.get("return_url")
  ? decodeURIComponent(searchParams.get("return_url")!)
  : returnAppId
  ? `/applications/${returnAppId}`
  : "/documents";

  const { data: doc, isLoading: docLoading, error: docError } = useDocument(docId);

  const [fileUrl,     setFileUrl]     = useState<string | null>(null);
  const [fileName,    setFileName]    = useState<string>("");
  const [fileBlob,    setFileBlob]    = useState<Blob | null>(null);
  const [zoom,        setZoom]        = useState(100);
  const [rotation,    setRotation]    = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [rightOpen,   setRightOpen]   = useState(true);

  const [mobileTab, setMobileTab] = useState<"viewer" | "data">("viewer");
  const [showPoorExtractionModal, setShowPoorExtractionModal] = useState(false);

  // ── Leave/Cancel tracking ──────────────────────────────────────────────
  const [isDirty, setIsDirty] = useState(false);
  const [leaveModalMode, setLeaveModalMode] = useState<"fresh" | "edit" | null>(null);
  const [leaveSaving, setLeaveSaving] = useState(false);

  const totalPages = doc?.total_pages ?? 1;
  const isPdf      = doc?.file_type === "pdf" || fileName.endsWith(".pdf");

  // FIX: this document counts as "needs confirmation" if its backend
  // ocr_status isn't "confirmed" yet — regardless of how the viewer was
  // opened. This is what actually decides the Cancel Upload button and the
  // "fresh" leave-modal, replacing the old URL-only isFreshUpload check.
  const isUnconfirmedDoc = doc ? doc.ocr_status !== "confirmed" : false;
  const treatAsFresh     = freshFlag || isUnconfirmedDoc;

  const {
    fields, avgConfidence, source,
    isLoading: ocrLoading, error: ocrError,
    detectedType, typeMismatch, dismissMismatch, qualityIssue,
    missingMandatoryFields,
    loadFields, submitFields, updateEditValue,
  } = useOCR(docId);

  const anyLocked = fields.some(f => f.is_locked);

  useEffect(() => {
    if (!docId) return;
    let objectUrl: string;
    documentsApi.getFile(docId)
      .then(({ blob, fileName: name }) => {
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
        setFileName(name);
        setFileBlob(blob);
      })
      .catch(err => console.error("Failed to load document file:", err));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [docId]);

  useEffect(() => {
    if (fileBlob && fileName && fields.length === 0 && !ocrLoading) {
      void loadFields(fileBlob, fileName);
    }
  }, [fileBlob, fileName]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (qualityIssue === "poor_extraction") {
      setShowPoorExtractionModal(true);
    }
  }, [qualityIssue]);

  function handleFieldEdit(id: string, value: string) {
    setIsDirty(true);
    updateEditValue(id, value);
  }

  function exportData() {
    const rows = fields.map(f =>
      `"${f.field_name}","${f.extracted_value}",${f.confidence_score},${f.is_confirmed}`
    );
    const csv  = ["Field Name,Extracted Value,Confidence,Confirmed", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${doc?.name ?? "document"}_data.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownload() {
    if (!fileUrl || !doc) return;
    const a = document.createElement("a");
    a.href = fileUrl; a.download = doc.name; a.click();
  }

  async function handleReupload() {
    setShowPoorExtractionModal(false);
    if (!docId) return;
    try { await documentsApi.delete(docId); } catch { /* ignore */ }
    navigate(returnUrl);
  }

  async function handleSubmit() {
    await submitFields();
    navigate(returnUrl);
  }

  function handleRetryOcr() {
    if (fileBlob) void loadFields(fileBlob, fileName);
  }

  // ── Back button ───────────────────────────────────────────────────────
  // Unconfirmed document (fresh OR just never confirmed) OR dirty edits on
  // an already-confirmed doc → confirm before leaving. Otherwise, just go.
  function handleBackClick() {
    if (treatAsFresh) {
      setLeaveModalMode("fresh");
    } else if (isDirty) {
      setLeaveModalMode("edit");
    } else {
      navigate(returnAppId ? `/applications/${returnAppId}` : returnUrl);
    }
  }

  function handleCancelUploadClick() {
    setLeaveModalMode("fresh");
  }

  async function handleLeaveModalSave() {
    setLeaveSaving(true);
    try {
      await submitFields();
      setLeaveModalMode(null);
      navigate(returnUrl);
    } finally {
      setLeaveSaving(false);
    }
  }

  async function handleLeaveModalDiscard() {
    setLeaveSaving(true);
    try {
      if (docId) {
        try { await documentsApi.delete(docId); } catch { /* already gone, ignore */ }
      }
      setLeaveModalMode(null);
      navigate(returnUrl);
    } finally {
      setLeaveSaving(false);
    }
  }

  function handleLeaveModalLeaveWithoutSaving() {
    setLeaveModalMode(null);
    navigate(returnAppId ? `/applications/${returnAppId}` : returnUrl);
  }

  function handleLeaveModalKeepEditing() {
    setLeaveModalMode(null);
  }

  const confirmedCount = fields.filter(f => f.is_confirmed).length;
  const reviewCount    = fields.filter(f => f.needs_review && !f.is_confirmed && !f.is_locked).length;

  if (docLoading) {
    return <div className="flex items-center justify-center h-full py-[64px]"><Spinner /></div>;
  }
  if (docError || !doc) {
    return (
      <div className="flex items-center justify-center h-full py-[64px]">
        <div className="text-center">
          <p className="text-[#ef4444] text-[15px] font-medium mb-[4px]">Document not found</p>
          <p className="text-[#64748b] text-[13px] mb-[12px]">{docError ?? "Check the document ID"}</p>
          <button onClick={() => navigate("/documents")} className="text-indigo-600 text-[13px] font-medium hover:underline">
            ← Back to Document Hub
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-[#f9fafb] overflow-hidden"
      style={{ fontFamily: "Inter, sans-serif", height: "calc(100dvh - 56px)" }}>

      <PoorExtractionModal
        open={showPoorExtractionModal}
        onReupload={handleReupload}
        onDismiss={() => setShowPoorExtractionModal(false)}
      />

      <LeaveModal
        open={leaveModalMode !== null}
        mode={leaveModalMode}
        saving={leaveSaving}
        onSave={handleLeaveModalSave}
        onDiscard={handleLeaveModalDiscard}
        onLeaveWithoutSaving={handleLeaveModalLeaveWithoutSaving}
        onKeepEditing={handleLeaveModalKeepEditing}
      />

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-[#e5e7eb] flex items-center h-[48px] sm:h-[52px] px-[12px] sm:px-[16px] shrink-0 gap-[8px] sm:gap-[12px]">
        <button onClick={handleBackClick}
          className="flex items-center gap-[6px] text-[#64748b] text-[12px] sm:text-[13px] font-medium hover:text-[#0f172a] transition whitespace-nowrap shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 12H5M5 12l7 7M5 12l7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="hidden sm:inline">Back to Case</span>
          <span className="sm:hidden">Back</span>
        </button>

        <div className="h-[20px] w-px bg-[#e5e7eb] shrink-0" />

        <div className="flex items-center gap-[8px] min-w-0 flex-1">
          <div className="bg-[#fee2e2] rounded-[5px] flex items-center justify-center w-[28px] h-[32px] shrink-0">
            <span className="text-[#ef4444] text-[7px] font-black">PDF</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[#0f172a] text-[12px] sm:text-[13px] font-semibold leading-[16px] truncate">{doc.name}</span>
            <span className="text-[#94a3b8] text-[10px] sm:text-[11px] leading-[14px] hidden sm:block">
              {doc.file_size_bytes ? `${(doc.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-[3px] shrink-0">
          <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="size-[26px] border border-[#e5e7eb] rounded-[5px] text-[#374151] flex items-center justify-center hover:bg-[#f9fafb] transition text-[14px] font-medium">−</button>
          <span className="text-[#374151] text-[12px] font-medium w-[42px] text-center">{zoom}%</span>
          <button onClick={() => setZoom(z => Math.min(300, z + 10))} className="size-[26px] border border-[#e5e7eb] rounded-[5px] text-[#374151] flex items-center justify-center hover:bg-[#f9fafb] transition text-[14px] font-medium">+</button>
        </div>

        <button onClick={() => setRotation(r => (r + 90) % 360)}
          className="hidden sm:flex items-center gap-[5px] h-[30px] px-[10px] border border-[#e5e7eb] rounded-[7px] text-[#374151] text-[12px] font-medium hover:bg-[#f9fafb] transition shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M23 4v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Rotate
        </button>

        <button onClick={handleDownload}
          className="flex items-center gap-[5px] h-[30px] px-[8px] sm:px-[10px] border border-[#e5e7eb] rounded-[7px] text-[#374151] text-[12px] font-medium hover:bg-[#f9fafb] transition shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="hidden sm:inline">Download</span>
        </button>
      </div>

      {/* ── MOBILE TABS ── */}
      <div className="lg:hidden flex items-center border-b border-[#e5e7eb] bg-white shrink-0">
        {([
          { id: "viewer", label: "Document" },
          { id: "data",   label: `Fields${fields.length > 0 ? ` (${fields.length})` : ""}` },
        ] as const).map(tab => (
          <button key={tab.id} onClick={() => setMobileTab(tab.id)}
            className={`flex-1 py-[10px] text-[13px] font-medium border-b-2 transition-colors ${
              mobileTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-[#6b7280]"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="lg:hidden flex-1 min-h-0 overflow-hidden">
        {mobileTab === "viewer" && (
          <ViewerPanel
            doc={doc} fileUrl={fileUrl} isPdf={isPdf} zoom={zoom} rotation={rotation}
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
          />
        )}
        {mobileTab === "data" && (
          <DataPanel
            doc={doc} fields={fields} avgConfidence={avgConfidence} ocrLoading={ocrLoading}
            ocrError={ocrError} typeMismatch={typeMismatch} qualityIssue={qualityIssue}
            detectedType={detectedType} missingMandatoryFields={missingMandatoryFields}
            anyLocked={anyLocked} source={source} fileBlob={fileBlob} fileName={fileName}
            showCancelUpload={treatAsFresh}
            onUpdateEditValue={handleFieldEdit} onDismissMismatch={dismissMismatch}
            onReupload={handleReupload} onRetryOcr={handleRetryOcr} onSubmit={handleSubmit}
            onCancelUpload={handleCancelUploadClick}
            onClosePanel={() => { setRightOpen(false); setMobileTab("viewer"); }}
          />
        )}
      </div>

      <div className="hidden lg:flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0">
          <ViewerPanel
            doc={doc} fileUrl={fileUrl} isPdf={isPdf} zoom={zoom} rotation={rotation}
            currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage}
          />
        </div>
        {rightOpen ? (
          <div className="flex-1 min-w-0 border-l border-[#e5e7eb]">
            <DataPanel
              doc={doc} fields={fields} avgConfidence={avgConfidence} ocrLoading={ocrLoading}
              ocrError={ocrError} typeMismatch={typeMismatch} qualityIssue={qualityIssue}
              detectedType={detectedType} missingMandatoryFields={missingMandatoryFields}
              anyLocked={anyLocked} source={source} fileBlob={fileBlob} fileName={fileName}
              showCancelUpload={treatAsFresh}
              onUpdateEditValue={handleFieldEdit} onDismissMismatch={dismissMismatch}
              onReupload={handleReupload} onRetryOcr={handleRetryOcr} onSubmit={handleSubmit}
              onCancelUpload={handleCancelUploadClick}
              onClosePanel={() => setRightOpen(false)}
            />
          </div>
        ) : fields.length > 0 && (
          <div className="absolute bottom-[64px] left-1/2 -translate-x-1/2 z-20">
            <button onClick={() => setRightOpen(true)}
              className="flex items-center gap-[8px] h-[44px] px-[20px] rounded-full bg-white border border-[#e5e7eb] text-[#374151] text-[13px] font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:bg-[#f9fafb] hover:shadow-[0_6px_20px_rgba(0,0,0,0.16)] transition-all whitespace-nowrap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 4v16" stroke="currentColor" strokeWidth="2"/>
              </svg>
              Show Fields
              {missingMandatoryFields.length > 0 && (
                <span className="size-[7px] rounded-full bg-[#ef4444] shrink-0" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM STATUS BAR ── */}
      <div className="bg-white border-t border-[#e5e7eb] flex items-center justify-between h-[48px] px-[12px] sm:px-[16px] shrink-0">
        <div className="flex items-center gap-[10px] sm:gap-[14px]">
          <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#374151]">
            <span className="size-[7px] rounded-full bg-[#22c55e] shrink-0" />
            {confirmedCount} confirmed
          </span>
          {reviewCount > 0 && (
            <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#d97706]">
              <span className="size-[7px] rounded-full bg-[#f59e0b] shrink-0" />
              {reviewCount} review
            </span>
          )}
          {missingMandatoryFields.length > 0 && !anyLocked && (
            <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#dc2626]">
              <span className="size-[7px] rounded-full bg-[#ef4444] shrink-0" />
              {missingMandatoryFields.length} required
            </span>
          )}
          {anyLocked && (
            <span className="flex items-center gap-[5px] text-[10px] sm:text-[11px] text-[#64748b]">
              <MiniSpinner /> extracting
            </span>
          )}
        </div>
        <button onClick={exportData}
          className="flex items-center gap-[6px] h-[32px] px-[14px] rounded-[8px] text-white text-[12px] font-semibold hover:opacity-90 transition"
          style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"
              stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Export Data
        </button>
      </div>
    </div>
  );
}