// src/components/ui/UploadTaskPickerModal.tsx
//
// NEW: closes the remaining gap in the Hub upload task-linking fix.
// The backend/API layer now accepts an explicit task_id and prefers it
// over guessing from document_type text (see document_service.py's
// upload_document()) — but the Hub's generic "Upload New Document" box
// still doesn't know WHICH of an application's pending requirements a
// dropped/browsed file is meant to satisfy when a specific application
// tab is active. Rather than silently guessing (the old, broken
// behavior) or always uploading as a standalone/unclassified document,
// this modal asks the person directly, using the same `requirements`
// data the Hub already has loaded. Skipping still uploads the file as a
// standalone document, same as before — no behavior is removed, only the
// silent-guess path is replaced with an explicit choice.

import type { RequirementItem } from "../../types/employee/documentHub.types";
import { FileText, X } from "lucide-react";

export function UploadTaskPickerModal({
  open,
  fileName,
  choices,
  onSelect,
  onSkip,
  onCancel,
}: {
  open:     boolean;
  fileName: string;
  choices:  RequirementItem[];
  onSelect: (choice: RequirementItem) => void;
  onSkip:   () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[90]" onClick={onCancel} />
      <div className="fixed inset-0 z-[91] flex items-center justify-center p-[16px]">
        <div className="w-full max-w-[440px] bg-white rounded-[16px] shadow-2xl p-[24px] flex flex-col gap-[16px]">
          <div className="flex items-start justify-between gap-[12px]">
            <div className="min-w-0">
              <h3 className="text-[16px] font-bold text-[#0f172a]">What is this document for?</h3>
              <p className="text-[13px] text-[#64748b] mt-[4px] leading-[19px] truncate">
                <span className="font-medium text-[#374151]">{fileName}</span> — pick the
                requirement it satisfies so the task is marked done automatically.
              </p>
            </div>
            <button onClick={onCancel} className="shrink-0 text-[#94a3b8] hover:text-[#475569]">
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-[6px] max-h-[300px] overflow-y-auto">
            {choices.map(choice => (
              <button
                key={choice.id}
                onClick={() => onSelect(choice)}
                className="flex items-center gap-[10px] w-full text-left px-[14px] py-[11px] rounded-[10px] border border-[#e5e7eb] hover:border-indigo-300 hover:bg-indigo-50 transition"
              >
                <FileText size={14} className="text-indigo-500 shrink-0" />
                <span className="text-[13px] font-medium text-[#374151] truncate">{choice.task_name}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-[10px] pt-[4px] border-t border-[#f1f5f9]">
            <button
              onClick={onSkip}
              className="h-[36px] px-[14px] rounded-[10px] text-[13px] font-medium text-[#64748b] hover:bg-[#f8fafc] transition"
            >
              Skip — upload as standalone document
            </button>
          </div>
        </div>
      </div>
    </>
  );
}