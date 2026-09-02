
// src/pages/employee/DocumentHub.tsx
//
// CHANGED: Replace/Re-upload is now available on ANY document the person
// owns and isn't locked (not "superseded", not in_use by a completed task
// elsewhere) — not just ones that are already "expired". This lets someone
// proactively renew a document (e.g. new passport) before the old one
// expires, which is the healthy, encouraged case. Button label/color still
// shifts based on urgency: red "Re-upload" when actually expired, neutral
// "Replace" otherwise. A "superseded" document (already replaced by a
// newer version) shows neither Delete nor Replace — it's locked history;
// the person should interact with the newer version instead.
//
// FIXED: Uploads from this page never navigated to /documents/viewer, so
// OCR extraction (triggered by DocumentViewer's loadFields effect) never
// ran for documents uploaded here — only uploads from ApplicationDetail's
// task flow got OCR'd. handleUploadAndNavigate now navigates to the viewer
// after a successful upload, same as ApplicationDetail does, so OCR runs
// regardless of which page the person uploaded from. Returns to the active
// application if one was filtered/selected, otherwise back to the Hub.
//
// CHANGED: Clicking a document card/row now navigates straight to
// /documents/viewer (handleOpenPreview), same destination as a fresh
// upload — PreviewModal is kept only for the expired-document notification
// CTA flow (?reupload=), which still needs its own Replace/Delete actions
// since DocumentViewer doesn't support those for an already-confirmed doc.
//
// NEW — Rename: both "name this document" at upload time (client-side File
// rename, no backend call) and "rename an existing document" (hits the new
// PATCH /documents/:id/rename endpoint) via the shared RenamePromptModal.

import { useRef, useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X, Trash2, Download, RefreshCw, Lock, Clock, Pencil } from "lucide-react";
import { useDocumentHub }   from "../../hooks/employee/useDocumentHub";
import documentHubApi from "../../api/employee/documentHub.api";
import type { HubDocument, RequirementItem } from "../../types/employee/documentHub.types";
import { RenamePromptModal } from "../../components/ui/RenamePromptModal";

import imgUpload      from "../../assets/icons/appdetail-upload-cloud.svg";
import imgPdf         from "../../assets/icons/docup-pdf-icon.svg";
import imgDocx        from "../../assets/icons/dochub-docx.svg";
import imgImg         from "../../assets/icons/dochub-img.svg";
import imgListView    from "../../assets/icons/dochub-list-view.svg";
import imgGridView    from "../../assets/icons/dochub-grid-view.svg";
import imgStorage     from "../../assets/icons/dochub-storage.svg";
import imgVerified    from "../../assets/icons/dochub-verified.svg";
import imgPending     from "../../assets/icons/dochub-pending.svg";
import imgMissing     from "../../assets/icons/dochub-missing.svg";
import imgActivityDot from "../../assets/icons/dochub-activity-dot.svg";

// Renames a File object client-side before upload — the backend already
// uses file.filename as the display name, so no upload-endpoint changes
// are needed for "name this document during upload."
function renameFile(file: File, newName: string): File {
  const trimmed = newName.trim();
  if (!trimmed) return file;
  const ext = file.name.includes('.') ? file.name.split('.').pop() : undefined;
  const finalName = trimmed.includes('.') || !ext ? trimmed : `${trimmed}.${ext}`;
  return new File([file], finalName, { type: file.type, lastModified: file.lastModified });
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
    <div className="fixed right-[16px] top-[88px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px] pointer-events-none">
      {items.map(t => {
        const m = meta[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg pointer-events-auto ${m.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${m.iconBg} ${m.iconColor}`}>{m.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
                {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
              </div>
              <button onClick={() => onDismiss(t.id)} className="text-[#94a3b8] hover:text-[#475569] shrink-0">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PREVIEW MODAL — used only for the expired-document notification CTA flow
// now (?reupload=), since that's the one case still needing Replace/Delete
// actions in a modal rather than the full DocumentViewer page.
// ─────────────────────────────────────────────────────────────────────────────

function PreviewModal({ doc, reuploading, onClose, onDelete, onReupload, onRename }: {
  doc:         HubDocument | null;
  reuploading: boolean;
  onClose:     () => void;
  onDelete:    (doc: HubDocument) => void;
  onReupload:  (doc: HubDocument, file: File) => void;
  onRename:    (doc: HubDocument) => void;
}) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const reuploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!doc) {
      setFileUrl(null);
      return;
    }
    let objectUrl: string | undefined;
    setLoading(true);
    setLoadError(null);

    documentHubApi.getFileBlob(doc.id)
      .then(({ blob }) => {
        objectUrl = URL.createObjectURL(blob);
        setFileUrl(objectUrl);
      })
      .catch(() => setLoadError("Couldn't load this file. Please try again."))
      .finally(() => setLoading(false));

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [doc]);

  if (!doc) return null;

  const activeDoc = doc;

  const isPdf        = activeDoc.file_type === "pdf";
  const isImg         = activeDoc.file_type === "img";
  const isExpired      = activeDoc.status === 'expired';
  const isSuperseded  = activeDoc.status === 'superseded';
  const isPendingActivation = !!activeDoc.activates_on;
  const canReplace = !isSuperseded && !activeDoc.in_use;
  const canDelete  = !isSuperseded && !activeDoc.in_use;

  function handleDownload() {
    if (!fileUrl) return;
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = activeDoc.name;
    a.click();
  }

  function handleReuploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; 
    if (file) onReupload(activeDoc, file);
    e.target.value = '';
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[80]" onClick={reuploading ? undefined : onClose} />
      <div className="fixed inset-0 z-[81] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[820px] max-h-[90vh] bg-white rounded-[16px] shadow-2xl flex flex-col overflow-hidden">

          <div className="flex items-center justify-between px-[20px] py-[14px] border-b border-[#f1f5f9] shrink-0">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-[#0f172a] truncate">{activeDoc.name}</p>
              <p className="text-[11px] text-[#94a3b8]">
                {activeDoc.document_type}
                {activeDoc.version && ` · v${activeDoc.version}`}
              </p>
            </div>
            <div className="flex items-center gap-[8px] shrink-0">
              <button onClick={() => onRename(activeDoc)} disabled={reuploading}
                className="size-[34px] rounded-[8px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] transition disabled:opacity-40"
                title="Rename">
                <Pencil size={15} />
              </button>

              <button onClick={handleDownload} disabled={!fileUrl}
                className="size-[34px] rounded-[8px] flex items-center justify-center text-[#64748b] hover:bg-[#f1f5f9] transition disabled:opacity-40"
                title="Download">
                <Download size={16} />
              </button>

              {canReplace && (
                <>
                  <input ref={reuploadRef} type="file" className="hidden" onChange={handleReuploadFile} disabled={reuploading} />
                  <button onClick={() => reuploadRef.current?.click()}
                    disabled={reuploading}
                    className={`h-[34px] px-[12px] rounded-[8px] text-[12px] font-semibold flex items-center gap-[6px] transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      isExpired
                        ? "text-white hover:opacity-90"
                        : "text-[#374151] border border-[#e2e8f0] hover:bg-[#f8fafc]"
                    }`}
                    style={isExpired ? { backgroundImage: "linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))" } : undefined}
                    title={isExpired ? "Re-upload a renewed version" : "Replace with a newer version"}>
                    {reuploading ? (
                      <>
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        <RefreshCw size={13} /> {isExpired ? "Re-upload" : "Replace"}
                      </>
                    )}
                  </button>
                </>
              )}

              {canDelete && !isExpired && (
                <button onClick={() => { onClose(); onDelete(activeDoc); }}
                  className="size-[34px] rounded-[8px] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition"
                  title="Delete document">
                  <Trash2 size={16} />
                </button>
              )}

              <button onClick={onClose} disabled={reuploading}
                className="size-[34px] rounded-[8px] flex items-center justify-center text-[#94a3b8] hover:bg-[#f1f5f9] transition disabled:opacity-40"
                title="Close">
                <X size={18} />
              </button>
            </div>
          </div>

          {isPendingActivation && (
            <div className="px-[20px] py-[10px] bg-[#eff6ff] border-b border-[#bfdbfe] flex items-center gap-[8px] shrink-0">
              <Clock size={14} className="text-[#2563eb] shrink-0" />
              <p className="text-[12px] text-[#1d4ed8] font-medium">
                This is your renewed document — it will become your official current document on{" "}
                {fmtDate(activeDoc.activates_on)}, when your current one expires.
              </p>
            </div>
          )}

          {isExpired && (
            <div className="px-[20px] py-[10px] bg-[#fff7ed] border-b border-[#fed7aa] flex items-center gap-[8px] shrink-0">
              <AlertTriangle size={14} className="text-[#c2410c] shrink-0" />
              <p className="text-[12px] text-[#c2410c] font-medium">
                This document has expired. Upload a renewed version to keep your case current.
              </p>
            </div>
          )}

          {isSuperseded && (
            <div className="px-[20px] py-[10px] bg-[#eef2ff] border-b border-indigo-100 flex items-center gap-[8px] shrink-0">
              <Lock size={14} className="text-indigo-600 shrink-0" />
              <p className="text-[12px] text-indigo-700 font-medium">
                {activeDoc.version ? `This is v${activeDoc.version} of your ${activeDoc.document_type}` : `This is an older version of your ${activeDoc.document_type}`}
                {" — "}a newer one has replaced it. This copy is kept for your records only.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-auto bg-[#f1f5f9] flex items-center justify-center p-[20px] min-h-[300px]">
            {loading && (
              <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
            {!loading && loadError && (
              <p className="text-[#dc2626] text-[13px]">{loadError}</p>
            )}
            {!loading && !loadError && fileUrl && isPdf && (
              <iframe src={fileUrl} title={activeDoc.name} className="w-full h-[70vh] bg-white rounded-[8px] border-none" />
            )}
            {!loading && !loadError && fileUrl && isImg && (
              <img src={fileUrl} alt={activeDoc.name} className="max-w-full max-h-[70vh] object-contain rounded-[8px] shadow-sm" />
            )}
            {!loading && !loadError && fileUrl && !isPdf && !isImg && (
              <div className="text-center">
                <p className="text-[#64748b] text-[13px] mb-[10px]">Preview isn't available for this file type.</p>
                <button onClick={handleDownload}
                  className="text-indigo-600 text-[13px] font-medium hover:underline">
                  Download to view
                </button>
              </div>
            )}
          </div>

          {activeDoc.in_use && !isExpired && !isSuperseded && (
            <div className="px-[20px] py-[10px] bg-[#f8fafc] border-t border-[#f1f5f9] text-[11px] text-[#94a3b8] italic shrink-0">
              This document is used in a case and can't be deleted from here.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM DELETE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ open, docName, deleting, onConfirm, onCancel }: {
  open:      boolean;
  docName:   string;
  deleting:  boolean;
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[85]" onClick={deleting ? undefined : onCancel} />
      <div className="fixed inset-0 z-[86] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[400px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-start gap-[14px]">
            <div className="size-[44px] rounded-full bg-[#fee2e2] flex items-center justify-center shrink-0">
              <Trash2 size={20} className="text-[#dc2626]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-[#0f172a]">Delete this document?</h3>
              <p className="text-[13px] text-[#64748b] mt-[4px] leading-[19px]">
                <span className="font-medium text-[#374151]">{docName}</span> will be permanently
                deleted from your account and storage. This action cannot be undone, and any
                task linked to this document will be reset to pending.
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-[10px] mt-[4px]">
            <button
              onClick={onCancel}
              disabled={deleting}
              className="h-[38px] px-[16px] rounded-[10px] border border-[#e5e7eb] text-[13px] font-medium text-[#374151] hover:bg-[#f8fafc] transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="h-[38px] px-[16px] rounded-[10px] bg-[#dc2626] text-white text-[13px] font-semibold hover:bg-[#b91c1c] transition disabled:opacity-60 flex items-center gap-[6px]"
            >
              {deleting ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Deleting…
                </>
              ) : (
                "Yes, Delete"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function fmtSize(bytes: number): string {
  if (!bytes) return "0 KB";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
function fmtDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtRelative(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso), now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 86400)  return `Today, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 172800) return `Yesterday, ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  return fmtDate(iso);
}
function getFileIcon(type: string) {
  if (type === "pdf") return imgPdf;
  if (type === "docx") return imgDocx;
  return imgImg;
}
function getFileLabel(type: string) {
  if (type === "pdf") return "PDF";
  if (type === "docx") return "DOCX";
  if (type === "img") return "IMG";
  return "FILE";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    verified:            { bg: "bg-[#d1fae5]", text: "text-[#065f46]", label: "Verified" },
    pending_review:      { bg: "bg-[#fef3c7]", text: "text-[#92400e]", label: "Pending Review" },
    uploaded:            { bg: "bg-[#dbeafe]", text: "text-[#1e40af]", label: "Uploaded" },
    rejected:            { bg: "bg-[#fee2e2]", text: "text-[#991b1b]", label: "Rejected" },
    required:            { bg: "bg-[#f3f4f6]", text: "text-[#374151]", label: "Required" },
    missing:             { bg: "bg-[#fee2e2]", text: "text-[#991b1b]", label: "Missing" },
    expired:             { bg: "bg-[#ffedd5]", text: "text-[#c2410c]", label: "Expired" },
    pending_hr_release:  { bg: "bg-[#eef2ff]", text: "text-[#4338ca]", label: "Pending Release" },
    superseded:          { bg: "bg-[#f1f5f9]", text: "text-[#64748b]", label: "Older Version" },
  };
  const s = map[status] ?? map.uploaded;
  return (
    <span className={`${s.bg} ${s.text} text-[11px] font-semibold px-[8px] py-[3px] rounded-full leading-[16px] whitespace-nowrap`}>
      {s.label}
    </span>
  );
}

function ReqIcon({ status }: { status: string }) {
  if (status === "verified" || status === "uploaded") return <img src={imgVerified} alt="" className="size-[20px] shrink-0" />;
  if (status === "pending_review") return <img src={imgPending} alt="" className="size-[20px] shrink-0" />;
  return <img src={imgMissing} alt="" className="size-[20px] shrink-0" />;
}

function DocCard({ doc, onOpen, onDelete, onRename }: {
  doc: HubDocument;
  onOpen: (doc: HubDocument) => void;
  onDelete: (doc: HubDocument) => void;
  onRename: (doc: HubDocument) => void;
}) {
  const isExpired      = doc.status === 'expired';
  const isSuperseded  = doc.status === 'superseded';
  const isPending     = !!doc.activates_on; // waiting for the old document's expiry to arrive
  const showDeleteBtn = !isExpired && !isSuperseded;
  return (
    <div onClick={() => onOpen(doc)}
         className={`bg-white border rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] flex flex-col gap-[12px] p-[20px] cursor-pointer transition-all duration-200 relative group ${
           isExpired ? "border-[#fed7aa] hover:border-[#f97316]/50"
           : isSuperseded ? "border-[#e2e8f0] opacity-75 hover:opacity-100"
           : isPending ? "border-[#c7d2fe] hover:border-indigo-400/50"
           : "border-[#f1f5f9] hover:border-indigo-600/30 hover:shadow-[0px_4px_16px_rgba(99,102,241,0.08)]"
         }`}>
      <div className="absolute top-[12px] right-[12px] flex items-center gap-[4px] z-10">
        {!isSuperseded && (
          <button
            onClick={e => { e.stopPropagation(); onRename(doc); }}
            title="Rename"
            className="size-[28px] rounded-[8px] flex items-center justify-center transition-all duration-150
                       text-[#94a3b8] opacity-0 group-hover:opacity-100 hover:bg-[#f1f5f9] hover:text-[#374151]"
          >
            <Pencil size={13} />
          </button>
        )}
        {showDeleteBtn && (
          <button
            onClick={e => { e.stopPropagation(); if (!doc.in_use) onDelete(doc); }}
            disabled={doc.in_use}
            title={doc.in_use ? "Used in a case — remove it from there first" : "Delete document"}
            className={`size-[28px] rounded-[8px] flex items-center justify-center
                       transition-all duration-150
                       ${doc.in_use
                         ? "text-[#cbd5e1] opacity-0 group-hover:opacity-100 cursor-not-allowed"
                         : "text-[#94a3b8] opacity-0 group-hover:opacity-100 hover:bg-[#fee2e2] hover:text-[#dc2626]"}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-start justify-between">
        <img src={getFileIcon(doc.file_type)} alt={doc.file_type} className="w-[44px] h-[52px] object-contain" />
        <div className="flex flex-col items-end gap-[4px]">
          <span className="text-[#94a3b8] text-[11px] font-semibold tracking-[0.5px] uppercase">{getFileLabel(doc.file_type)}</span>
          {doc.version && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-[6px] py-[1px] rounded-[5px]">
              v{doc.version}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-[2px]">
        <p className="text-[#111827] text-[13px] font-semibold leading-[18px] line-clamp-2">{doc.name}</p>
        <p className="text-[#94a3b8] text-[11px] leading-[16px] truncate">
          {doc.document_type}
          {doc.application_name && ` · ${doc.application_name}`}
        </p>
      </div>
      <div className="flex items-center justify-between mt-auto pt-[4px] border-t border-[#f8fafc]">
        <StatusBadge status={doc.status} />
        <span className="text-[#94a3b8] text-[11px]">{fmtDate(doc.uploaded_at)}</span>
      </div>
      {doc.in_use && !isExpired && !isSuperseded && (
        <span className="text-[10px] text-[#94a3b8] italic">Used in a case</span>
      )}
      {isExpired && (
        <span className="text-[10px] text-[#c2410c] italic font-medium">Click to re-upload</span>
      )}
      {isSuperseded && (
        <span className="text-[10px] text-[#94a3b8] italic">Older version of {doc.document_type} — see the current one below</span>
      )}
      {isPending && (
        <span className="text-[10px] text-indigo-600 italic font-medium">
          Becomes active on {fmtDate(doc.activates_on)}
        </span>
      )}
    </div>
  );
}

function DocRow({ doc, onOpen, onDelete, onRename }: {
  doc: HubDocument;
  onOpen: (doc: HubDocument) => void;
  onDelete: (doc: HubDocument) => void;
  onRename: (doc: HubDocument) => void;
}) {
  const isExpired      = doc.status === 'expired';
  const isSuperseded  = doc.status === 'superseded';
  const isPending     = !!doc.activates_on;
  const showDeleteBtn = !isExpired && !isSuperseded;
  return (
    <div onClick={() => onOpen(doc)}
         className={`flex items-center gap-[16px] px-[20px] py-[14px] border-b last:border-0 cursor-pointer transition-colors group ${
           isExpired ? "bg-[#fffbf5] border-[#fed7aa] hover:bg-[#fff7ed]"
           : isSuperseded ? "bg-[#fafbfc] border-[#f1f5f9] opacity-75 hover:opacity-100"
           : "border-[#f8fafc] hover:bg-[#f8fafc]"
         }`}>
      <img src={getFileIcon(doc.file_type)} alt={doc.file_type} className="w-[32px] h-[38px] object-contain shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[#111827] text-[13px] font-semibold truncate flex items-center gap-[6px]">
          {doc.name}
          {doc.version && (
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-[6px] py-[1px] rounded-[5px] shrink-0">
              v{doc.version}
            </span>
          )}
        </p>
        <p className="text-[#94a3b8] text-[11px] truncate">
          {doc.application_name ?? doc.document_type} • {fmtSize(doc.file_size_bytes)}
          {doc.in_use && !isExpired && !isSuperseded && <span className="ml-[6px] italic">• Used in a case</span>}
          {isExpired && <span className="ml-[6px] italic text-[#c2410c] font-medium">• Click to re-upload</span>}
          {isSuperseded && <span className="ml-[6px] italic">• Older version of {doc.document_type} — see the current one below</span>}
          {isPending && <span className="ml-[6px] italic text-indigo-600 font-medium">• Becomes active on {fmtDate(doc.activates_on)}</span>}
        </p>
      </div>
      <StatusBadge status={doc.status} />
      <span className="text-[#94a3b8] text-[12px] shrink-0 hidden sm:block">{fmtDate(doc.uploaded_at)}</span>
      {!isSuperseded && (
        <button
          onClick={e => { e.stopPropagation(); onRename(doc); }}
          title="Rename"
          className="size-[30px] rounded-[8px] flex items-center justify-center shrink-0 transition-colors text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#374151]"
        >
          <Pencil size={13} />
        </button>
      )}
      {showDeleteBtn && (
        <button
          onClick={e => { e.stopPropagation(); if (!doc.in_use) onDelete(doc); }}
          disabled={doc.in_use}
          title={doc.in_use ? "Used in a case — remove it from there first" : "Delete document"}
          className={`size-[30px] rounded-[8px] flex items-center justify-center shrink-0 transition-colors
                     ${doc.in_use ? "text-[#cbd5e1] cursor-not-allowed" : "text-[#94a3b8] hover:bg-[#fee2e2] hover:text-[#dc2626]"}`}
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function ReqItem({ item, onUpload }: { item: RequirementItem; onUpload: (id: string) => void }) {
  const isMissing = item.status === "missing" || item.status === "required";
  const isPending = item.status === "pending_review";
  return (
    <div className={`flex flex-col gap-[4px] p-[12px] rounded-[10px] border ${isMissing ? "bg-white border-[#f1f5f9]" : isPending ? "bg-[#fffbeb] border-[#fde68a]" : "bg-[#f0fdf4] border-[#d1fae5]"}`}>
      <div className="flex items-center gap-[10px]">
        <ReqIcon status={item.status} />
        <div className="flex-1 min-w-0">
          <p className="text-[#111827] text-[13px] font-semibold leading-[18px] truncate">{item.task_name}</p>
          <p className={`text-[11px] leading-[14px] ${isMissing ? "text-[#ef4444]" : isPending ? "text-[#d97706]" : "text-[#059669]"}`}>
            {isMissing ? "Missing Document" : isPending ? "Pending Review" : "Uploaded & Verified"}
          </p>
        </div>
      </div>
      {isMissing && (
        <button onClick={e => { e.stopPropagation(); onUpload(item.id); }}
                className="mt-[4px] w-full h-[28px] rounded-[7px] text-white text-[12px] font-medium hover:opacity-90 transition"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
          Upload Now
        </button>
      )}
    </div>
  );
}

export default function DocumentHub() {
  const navigate   = useNavigate();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const {
    documents, requirements, activity, storage, applicationTabs,
    isLoading, error, uploading, uploadError,
    viewMode, setViewMode,
    activeFilter, setActiveFilter,
    searchQuery, setSearchQuery,
    uploadDocument,
    refetch,
  } = useDocumentHub();

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const paramAppId = searchParams.get("application_id");
    if (paramAppId && paramAppId !== activeFilter) {
      void setActiveFilter(paramAppId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<HubDocument | null>(null);
  const [docToDelete, setDocToDelete] = useState<HubDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reuploading, setReuploading] = useState(false);

  // ── Name-before-upload / rename-existing state ──────────────────────────
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<HubDocument | null>(null);
  const [renaming, setRenaming] = useState(false);

  const pushToast = useCallback((tone: ToastTone, title: string, message?: string) => {
    const tid = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id: tid, tone, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== tid)), 3200);
  }, []);

  // Auto-open the preview modal when arriving via the expired-document
  // notification's CTA (?reupload={document_id}).
  useEffect(() => {
    const reuploadId = searchParams.get('reupload');
    if (reuploadId && documents.length > 0) {
      const doc = documents.find(d => d.id === reuploadId);
      if (doc) setPreviewDoc(doc);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, documents.length]);

  const storagePct = Math.min(100, Math.round((storage.used_mb / storage.total_mb) * 100));
  const usedLabel  = `${storage.used_mb.toFixed(1)} MB of ${storage.total_mb} MB`;

  // FIXED: previously just uploaded and toasted — never navigated to the
  // viewer, so OCR extraction (triggered there by loadFields) never ran for
  // Hub uploads. Now mirrors ApplicationDetail's handleUpload: on success,
  // navigate to /documents/viewer so OCR fires. Returns to the active
  // application if one was filtered/selected when the upload happened,
  // otherwise back to the Hub itself.
  async function handleUploadAndNavigate(file: File) {
    const appId = activeFilter !== "all" ? activeFilter : undefined;

    pushToast('info', 'Uploading…', file.name);

    const doc = await uploadDocument(file, { applicationId: appId });

    if (doc?.id) {
      pushToast('success', 'Uploaded!', `${file.name} has been added to your documents.`);
      const returnUrl = encodeURIComponent(appId ? `/applications/${appId}` : '/documents');
      navigate(`/documents/viewer?doc_id=${doc.id}${appId ? `&application_id=${appId}` : ''}&return_url=${returnUrl}`);
    } else {
      pushToast('error', 'Upload failed', uploadError ?? 'Please try again.');
    }
  }

  // Both drop and browse now stash the file and open the name prompt,
  // instead of uploading immediately — Confirm renames the File object
  // client-side before uploading; Skip uploads with the original name.
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setPendingUploadFile(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPendingUploadFile(file);
    e.target.value = "";
  }

  function handleConfirmUploadName(newName: string) {
    const file = pendingUploadFile;
    setPendingUploadFile(null);
    if (file) void handleUploadAndNavigate(renameFile(file, newName));
  }

  function handleSkipUploadName() {
    const file = pendingUploadFile;
    setPendingUploadFile(null);
    if (file) void handleUploadAndNavigate(file);
  }

  function handleUploadToTask(taskId: string) {
    const appId = activeFilter !== "all" ? activeFilter : requirements?.application_id;
    if (!appId) return;
    navigate(`/applications/${appId}?tab=tasks&task_id=${taskId}`);
  }

  function handleOpenPreview(doc: HubDocument) {
    const appId = doc.application_id;
    const returnUrl = encodeURIComponent(appId ? `/applications/${appId}` : '/documents');
    navigate(`/documents/viewer?doc_id=${doc.id}${appId ? `&application_id=${appId}` : ''}&return_url=${returnUrl}`);
  }

  function handleDeleteClick(doc: HubDocument) {
    if (doc.in_use) return;
    setDocToDelete(doc);
  }

  async function handleConfirmDelete() {
    if (!docToDelete) return;
    setDeleting(true);
    try {
      await documentHubApi.deleteDocument(docToDelete.id);
      pushToast('success', 'Deleted', `${docToDelete.name} has been removed.`);
      setDocToDelete(null);
      await refetch?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      pushToast('error', "Can't delete", err?.response?.data?.detail ?? 'Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  // Replace/re-upload a document — works whether it's expired or not.
  // Old document kept as history ("superseded"), never deleted.
  async function handleReupload(doc: HubDocument, file: File) {
    setReuploading(true);
    try {
      pushToast('info', 'Uploading new version…', file.name);
      await documentHubApi.reupload(doc.id, file);
      pushToast('success', 'Uploaded!', `${doc.name} has been replaced with the new version.`);
      setPreviewDoc(null);
      await refetch?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      pushToast('error', "Replace failed", err?.response?.data?.detail ?? 'Please try again.');
    } finally {
      setReuploading(false);
    }
  }

  function handleOpenRename(doc: HubDocument) {
    setRenamingDoc(doc);
  }

  async function handleConfirmRename(newName: string) {
    if (!renamingDoc) return;
    setRenaming(true);
    try {
      await documentHubApi.rename(renamingDoc.id, newName);
      pushToast('success', 'Renamed', `Document renamed to "${newName}".`);
      setRenamingDoc(null);
      await refetch?.();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      pushToast('error', "Rename failed", err?.response?.data?.detail ?? 'Please try again.');
    } finally {
      setRenaming(false);
    }
  }

  function tabDot(status: string) {
    if (status === "in_progress") return "bg-[#22c55e]";
    if (status === "submitted")   return "bg-[#3b82f6]";
    if (status === "approved")    return "bg-[#059669]";
    return "bg-[#94a3b8]";
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      <ToastStack items={toasts} onDismiss={tid => setToasts(p => p.filter(x => x.id !== tid))} />

      <PreviewModal
        doc={previewDoc}
        reuploading={reuploading}
        onClose={() => setPreviewDoc(null)}
        onDelete={handleDeleteClick}
        onReupload={handleReupload}
        onRename={handleOpenRename}
      />

      <RenamePromptModal
        open={!!pendingUploadFile}
        mode="upload"
        initialValue={pendingUploadFile ? pendingUploadFile.name.replace(/\.[^/.]+$/, '') : ''}
        onConfirm={handleConfirmUploadName}
        onSkip={handleSkipUploadName}
        onCancel={() => setPendingUploadFile(null)}
      />

      <RenamePromptModal
        open={!!renamingDoc}
        mode="rename"
        initialValue={renamingDoc ? renamingDoc.name.replace(/\.[^/.]+$/, '') : ''}
        saving={renaming}
        onConfirm={handleConfirmRename}
        onCancel={() => setRenamingDoc(null)}
      />

      <ConfirmDeleteModal
        open={!!docToDelete}
        docName={docToDelete?.name ?? ''}
        deleting={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDocToDelete(null)}
      />

      <header className="bg-white border-b border-[#f1f5f9] shrink-0 flex items-center justify-between px-[24px] sm:px-[32px] h-[64px] gap-[16px]">
        <h1 className="text-[#0f172a] text-[20px] font-bold tracking-[-0.5px] shrink-0">Document Hub</h1>

        <div className="flex items-center gap-[4px] overflow-x-auto">
          <button onClick={() => setActiveFilter("all")}
                  className={`px-[14px] py-[6px] rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${activeFilter === "all" ? "bg-indigo-600 text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}>
            All Documents
          </button>
          {applicationTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveFilter(tab.id)}
                    className={`px-[14px] py-[6px] rounded-full text-[13px] font-medium whitespace-nowrap transition-colors flex items-center gap-[5px] ${activeFilter === tab.id ? "bg-indigo-600 text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}>
              {tab.label}
              <span className={`size-[6px] rounded-full inline-block ${tabDot(tab.status)} ${activeFilter === tab.id ? "opacity-70" : ""}`} />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-[12px] shrink-0">
          <div className="relative hidden md:block">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[#94a3b8]">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <input type="text" placeholder="Search documents..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                   className="pl-[34px] pr-[12px] py-[7px] text-[13px] bg-[#f8fafc] border border-[#f1f5f9] rounded-[10px] focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500/20 transition w-[200px]"
                   style={{ fontFamily: "Inter, sans-serif" }} />
          </div>

          <div className="hidden lg:flex items-center gap-[8px]">
            <img src={imgStorage} alt="" className="w-[16px] h-[16px]" />
            <div className="flex flex-col gap-[2px]">
              <div className="bg-[#e2e8f0] rounded-full h-[4px] w-[80px] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                     style={{ width: `${storagePct}%`, background: storagePct > 80 ? "linear-gradient(90deg,#ef4444,#f97316)" : "linear-gradient(90deg, var(--theme-primary), var(--theme-gradient-end))" }} />
              </div>
              <span className="text-[10px] text-[#94a3b8] whitespace-nowrap">Storage: {usedLabel}</span>
            </div>
          </div>

          <button onClick={() => navigate("/notifications")}
                  className="bg-white border border-[#e2e8f0] rounded-[10px] flex items-center justify-center size-[36px] hover:bg-[#f8fafc] transition relative">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-[16px] sm:px-[24px] lg:px-[32px] py-[24px] sm:py-[28px]">
        <div className="flex gap-[24px] items-start max-w-[1400px] mx-auto">

          <div className="flex flex-col gap-[24px] flex-1 min-w-0">

            <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] p-[24px]">
              <div className="flex items-center justify-between mb-[16px]">
                <h2 className="text-[#0f172a] text-[16px] font-bold tracking-[-0.3px]">Upload New Document</h2>
                <div className="relative group">
                  <button type="button" className="text-indigo-600 text-[13px] font-medium hover:underline">
                    View Supported Formats
                  </button>
                  <div className="absolute right-0 top-[28px] z-20 hidden group-hover:flex flex-col gap-[10px]
                                  min-w-[240px] bg-white border border-[#e2e8f0]
                                  rounded-[14px] shadow-[0px_8px_30px_rgba(0,0,0,0.08)] p-[16px]">
                    <div>
                      <p className="text-[#0f172a] text-[13px] font-semibold mb-[6px]">Supported File Types</p>
                      <div className="flex flex-wrap gap-[8px]">
                        {["PDF", "DOCX", "JPG", "JPEG", "PNG", "GIF"].map(t => (
                          <span key={t} className="px-[10px] py-[5px] rounded-full bg-[#f1f5f9] text-[#334155] text-[11px] font-medium">{t}</span>
                        ))}
                      </div>
                    </div>
                    <div className="border-t border-[#f1f5f9] pt-[10px]">
                      <p className="text-[#64748b] text-[11px] leading-[16px]">
                        Maximum upload size depends on your storage plan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div onDragOver={e => { e.preventDefault(); setDragging(true); }}
                   onDragLeave={() => setDragging(false)}
                   onDrop={handleDrop}
                   onClick={() => fileRef.current?.click()}
                   className={`border-2 border-dashed rounded-[14px] flex flex-col items-center justify-center gap-[10px] py-[32px] cursor-pointer transition-all duration-200 ${
                     dragging   ? "border-indigo-600 bg-[#f0f0ff]"
                     : uploading ? "border-indigo-600/40 bg-[#fafafe]"
                     : "border-[#e2e8f0] bg-[#fafafe] hover:border-indigo-600/60 hover:bg-[#f5f5ff]"
                   }`}>
                {uploading ? (
                  <>
                    <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    <p className="text-indigo-600 text-[14px] font-medium">Uploading…</p>
                  </>
                ) : (
                  <>
                    <img src={imgUpload} alt="" className="w-[48px] h-[48px]" />
                    <div className="text-center">
                      <p className="text-[#0f172a] text-[15px] font-semibold">Drag and drop files here</p>
                      <p className="text-[#94a3b8] text-[13px] mt-[2px]">or click to browse</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); fileRef.current?.click(); }}
                            className="bg-white border border-[#e2e8f0] text-[#374151] text-[13px] font-medium px-[20px] py-[8px] rounded-[8px] hover:bg-[#f8fafc] transition">
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.docx,.doc" onChange={handleFileChange} />
            </div>

            <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[#f8fafc]">
                <div className="flex items-center gap-[8px]">
                  <h2 className="text-[#0f172a] text-[16px] font-bold tracking-[-0.3px]">Recent Documents</h2>
                  {documents.length > 0 && (
                    <span className="bg-[#f1f5f9] text-[#64748b] text-[11px] font-semibold px-[8px] py-[2px] rounded-full">{documents.length}</span>
                  )}
                </div>
                <div className="flex items-center gap-[2px]">
                  <button onClick={() => setViewMode("list")} className={`p-[7px] rounded-[7px] transition ${viewMode === "list" ? "bg-indigo-600" : "text-[#94a3b8] hover:bg-[#f1f5f9]"}`}>
                    <img src={imgListView} alt="list" className={`w-[16px] h-[16px] ${viewMode === "list" ? "brightness-0 invert" : ""}`} />
                  </button>
                  <button onClick={() => setViewMode("grid")} className={`p-[7px] rounded-[7px] transition ${viewMode === "grid" ? "bg-indigo-600" : "text-[#94a3b8] hover:bg-[#f1f5f9]"}`}>
                    <img src={imgGridView} alt="grid" className={`w-[16px] h-[16px] ${viewMode === "grid" ? "brightness-0 invert" : ""}`} />
                  </button>
                </div>
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-[64px]">
                  <svg className="w-7 h-7 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
              {!isLoading && error && <div className="flex items-center justify-center py-[64px]"><p className="text-[#ef4444] text-[14px]">{error}</p></div>}
              {!isLoading && !error && documents.length === 0 && (
                <div className="flex flex-col items-center gap-[12px] py-[48px]">
                  <div className="bg-[#f1f5f9] rounded-full p-[16px]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="text-[#64748b] text-[14px]">{activeFilter === "all" ? "No documents yet" : "No documents for this application yet"}</p>
                </div>
              )}
              {!isLoading && !error && documents.length > 0 && viewMode === "grid" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-[16px] p-[20px]">
                  {documents.map(doc => (
                    <DocCard key={doc.id} doc={doc} onOpen={handleOpenPreview} onDelete={handleDeleteClick} onRename={handleOpenRename} />
                  ))}
                </div>
              )}
              {!isLoading && !error && documents.length > 0 && viewMode === "list" && (
                <div className="flex flex-col">
                  {documents.map(doc => (
                    <DocRow key={doc.id} doc={doc} onOpen={handleOpenPreview} onDelete={handleDeleteClick} onRename={handleOpenRename} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hidden lg:flex flex-col gap-[20px] w-[280px] shrink-0">

            {requirements ? (
              <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] p-[20px]">
                <div className="flex items-center justify-between mb-[16px]">
                  <h3 className="text-[#0f172a] text-[15px] font-bold tracking-[-0.3px]">{requirements.visa_code} Requirements</h3>
                  <span className="bg-[#f0fdf4] border border-[#d1fae5] text-[#059669] text-[11px] font-semibold px-[8px] py-[3px] rounded-full">
                    {requirements.done}/{requirements.total} Done
                  </span>
                </div>
                <div className="flex flex-col gap-[10px]">
                  {requirements.items.map(item => (
                    <ReqItem key={item.id} item={item} onUpload={handleUploadToTask} />
                  ))}
                </div>
                <button onClick={() => navigate(`/applications/${requirements.application_id}`)}
                        className="mt-[12px] w-full text-center text-indigo-600 text-[12px] font-medium hover:underline">
                  View Application Detail →
                </button>
              </div>
            ) : activeFilter !== "all" ? (
              <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] p-[20px]">
                <div className="flex items-center justify-center py-[24px]">
                  <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              </div>
            ) : null}

            <div className="bg-white border border-[#f1f5f9] rounded-[16px] shadow-[0px_1px_4px_rgba(0,0,0,0.04)] p-[20px]">
              <h3 className="text-[#0f172a] text-[15px] font-bold tracking-[-0.3px] mb-[16px]">Recent Activity</h3>
              {activity.length === 0 ? (
                <p className="text-[#94a3b8] text-[13px]">No recent activity.</p>
              ) : (
                <div className="flex flex-col gap-[14px]">
                  {activity.map(item => (
                    <div key={item.id} className="flex gap-[10px] items-start">
                      <img src={imgActivityDot} alt="" className="w-[8px] h-[8px] mt-[5px] shrink-0" />
                      <div className="flex flex-col gap-[2px] min-w-0">
                        <p className="text-[#0f172a] text-[12px] font-medium leading-[16px]">{item.text}</p>
                        <p className="text-[#94a3b8] text-[11px] leading-[14px]">by {item.by} • {fmtRelative(item.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button className="mt-[16px] w-full text-center text-indigo-600 text-[12px] font-medium hover:underline">View All Activity</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}