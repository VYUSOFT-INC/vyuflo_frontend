// src/pages/employee/components/HubPicker.tsx
//
// Extracted from ApplicationDetail.tsx — this was previously defined inline
// there, used only by TaskRow's "From Hub" button. Now shared between the
// Tasks tab (TaskRow) and the new HR-styled Documents tab
// (ApplicationDocumentsTab), which also needs a "reuse from Hub" action for
// missing required documents.

import { useEffect, useState, type ReactNode } from 'react';
import { FileText, Image as ImageIcon, File as FileIcon, Search } from 'lucide-react';
import documentsApi from '../../api/employee/documents.api';
import type { Document } from '../../types/employee/document.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';

function fileTypeBadge(fileType: string): { icon: ReactNode; bg: string; iconColor: string } {
  const t = (fileType ?? "").toLowerCase();
  if (t === "pdf") {
    return { icon: <FileText size={16} />, bg: "bg-[#fee2e2]", iconColor: "text-[#dc2626]" };
  }
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(t)) {
    return { icon: <ImageIcon size={16} />, bg: "bg-indigo-50", iconColor: "text-indigo-600" };
  }
  if (["doc", "docx"].includes(t)) {
    return { icon: <FileIcon size={16} />, bg: "bg-[#dbeafe]", iconColor: "text-[#1d4ed8]" };
  }
  return { icon: <FileText size={16} />, bg: "bg-[#f1f5f9]", iconColor: "text-[#64748b]" };
}

function fmtHubDate(iso?: string): string {
  if (!iso) return "";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7)   return `${diff} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function HubPicker({ onSelect }: { onSelect: (documentId: string) => void }) {
  const [docs,    setDocs]    = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    documentsApi.listHub()
      .then(setDocs)
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d =>
    !search || d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="border border-[#e5e7eb] rounded-[14px] bg-white w-full mt-[10px] shadow-[0px_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="flex items-center justify-between px-[14px] py-[10px] bg-[#f8fafc] border-b border-[#f1f5f9]">
        <span className="text-[12px] font-bold text-[#0f172a] tracking-[-0.2px]">
          Your Document Hub
        </span>
        {!loading && (
          <span className="text-[11px] text-[#94a3b8] font-medium">
            {filtered.length} document{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div> 

      <div className="p-[12px]">
        <div className="relative mb-[10px]">
          <Search size={13} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search your documents…"
            className="w-full h-[36px] bg-[#f9fafb] border border-[#e5e7eb] rounded-[9px] pl-[32px] pr-[10px] text-[12px] text-[#111827] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#dbeafe] focus:border-indigo-300 transition" />
        </div>

        <div className="max-h-[220px] overflow-y-auto flex flex-col gap-[4px]">
          {loading ? (
            [0, 1].map(i => (
              <div key={i} className="h-[52px] rounded-[10px] bg-[#f8fafc] animate-pulse" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-[6px] py-[24px] text-center">
              <div className="size-[36px] rounded-full bg-[#f1f5f9] flex items-center justify-center">
                <FileText size={16} className="text-[#cbd5e1]" />
              </div>
              <p className="text-[12px] font-medium text-[#64748b]">
                {search ? "No matching documents" : "Your Document Hub is empty"}
              </p>
              <p className="text-[11px] text-[#9ca3af]">
                {search ? "Try a different search term." : "Upload a file once — reuse it across every case."}
              </p>
            </div>
          ) : filtered.map(d => {
            const badge = fileTypeBadge(d.file_type);
            const isPicking = picking === d.id;
            return (
              <button key={d.id} type="button" disabled={isPicking}
                onClick={async () => { setPicking(d.id); await onSelect(d.id); setPicking(null); }}
                className="flex items-center gap-[10px] px-[10px] py-[9px] rounded-[10px] border border-transparent hover:border-[#e5e7eb] hover:bg-[#f8fafc] text-left transition disabled:opacity-60 group">
                <div className={`size-[36px] rounded-[9px] ${badge.bg} ${badge.iconColor} flex items-center justify-center shrink-0`}>
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-[#111827] truncate">{d.name}</p>
                  <p className="text-[11px] text-[#94a3b8] mt-[1px]">
                    {fmtHubDate(d.uploaded_at)}
                    {d.file_size_bytes ? ` · ${(d.file_size_bytes / 1024 / 1024).toFixed(1)} MB` : ""}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold shrink-0 px-[10px] py-[6px] rounded-[8px] transition ${
                    isPicking
                      ? "text-white"
                      : "text-indigo-600 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white"
                  }`}
                  style={isPicking ? { backgroundImage: PRIMARY_GRADIENT } : undefined}
                >
                  {isPicking ? "Linking…" : "Use this"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}