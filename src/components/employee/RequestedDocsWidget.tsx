// src/components/employee/RequestedDocsWidget.tsx
//
// "Documents Requested by Your Attorney" widget — client-side inbox for
// forward requests (attorney is asking for a NEW document, not a re-upload
// of a rejected one). Parallel to RejectedDocsWidget.
//
// Fetches GET /api/v1/documents/my-requested on mount, shows each requested
// document with the reason + due date + Upload button.
//
// Usage:
//   <RequestedDocsWidget />               // standalone (full-width card)
//   <RequestedDocsWidget compact />       // tighter density
//   <RequestedDocsWidget hideWhenEmpty /> // hide entirely if nothing requested

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Clock, AlertTriangle } from 'lucide-react';

import { requestedDocumentsApi } from '../../api/employee/requestedDocuments.api';
import type { RequestedDocument } from '../../types/employee/documentRequests.types';

interface Props {
  compact?:        boolean;
  onUpload?:       (doc: RequestedDocument) => void;
  hideWhenEmpty?:  boolean;
}

/* ─── Formatters ─── */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function fmtDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso; }
}

function priorityChip(p: string): { bg: string; text: string; label: string } {
  const s = p.toLowerCase();
  if (s === 'urgent') return { bg: '#fef2f2', text: '#dc2626', label: 'Urgent' };
  if (s === 'high')   return { bg: '#fff7ed', text: '#c2410c', label: 'High' };
  if (s === 'low')    return { bg: '#f0fdf4', text: '#15803d', label: 'Low' };
  return { bg: '#eff6ff', text: '#2563eb', label: 'Normal' };
}

/* ════════════════════════════════════════════════════════════════════ */
export default function RequestedDocsWidget({
  compact = false,
  onUpload,
  hideWhenEmpty = false,
}: Props) {
  const navigate = useNavigate();
  const [items,   setItems]   = useState<RequestedDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await requestedDocumentsApi.getMyRequested();
    setItems(res.items || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = (doc: RequestedDocument) => {
    if (onUpload) { onUpload(doc); return; }
    // Default — take client to upload page with request context so backend
    // can auto-link the new file to this request and flip status to fulfilled.
    // Field names match backend's upload endpoint:
    //   document_request_id, document_type, application_id
    const params = new URLSearchParams({
      document_request_id: doc.id,
      document_type:       doc.document_name,
    });
    if (doc.application_id) params.set('application_id', doc.application_id);
    navigate(`/documents/upload?${params.toString()}`);
  };

  /* Hide entirely (opt-in) when nothing to action */
  if (!loading && items.length === 0 && hideWhenEmpty) return null;

  /* Loading */
  if (loading) {
    return (
      <div className={container(compact, 'border-gray-200 bg-white')}>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Checking for new document requests…
        </div>
      </div>
    );
  }

  /* Empty (only reached when hideWhenEmpty=false) */
  if (items.length === 0) {
    return (
      <div className={container(compact, 'border-emerald-200 bg-emerald-50/40')}>
        <div className="flex items-start gap-3">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">No documents requested</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Your attorney hasn't asked for anything extra right now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* Has items */
  return (
    <div className={container(compact, 'border-indigo-200 bg-indigo-50/30')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-lg">📥</span>
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              {items.length === 1
                ? '1 document requested by your attorney'
                : `${items.length} documents requested by your attorney`}
            </p>
            <p className="mt-0.5 text-[11px] text-indigo-700">
              Please upload the items below so your case can move forward.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          title="Refresh"
          className="shrink-0 rounded-md p-1 text-indigo-600 hover:bg-indigo-100"
        >
          ⟳
        </button>
      </div>

      <ul className={`mt-3 space-y-2 ${compact ? '' : 'sm:space-y-3'}`}>
        {items.map((doc) => {
          const days = daysUntil(doc.due_date);
          const chip = priorityChip(doc.priority);
          const overdue = days !== null && days < 0;
          const urgent  = days !== null && days >= 0 && days <= 3;

          return (
            <li key={doc.id} className="rounded-lg border border-indigo-100 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText size={14} className="text-indigo-600 shrink-0" />
                    <span className="truncate">{doc.document_name}</span>
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap shrink-0"
                      style={{ backgroundColor: chip.bg, color: chip.text }}
                    >
                      {chip.label}
                    </span>
                  </p>

                  {doc.details && (
                    <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap break-words">
                      {doc.details}
                    </p>
                  )}

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                    {doc.due_date && (
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          overdue ? 'text-red-600' : urgent ? 'text-orange-600' : 'text-gray-500'
                        }`}
                      >
                        {overdue ? <AlertTriangle size={11} /> : <Clock size={11} />}
                        Due {fmtDate(doc.due_date)}
                        {days !== null && !overdue && ` · ${days}d left`}
                        {overdue && ` · ${Math.abs(days!)}d overdue`}
                      </span>
                    )}
                    {doc.requested_by_name && (
                      <span className="text-gray-400">Requested by {doc.requested_by_name}</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleUpload(doc)}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
                >
                  <Upload size={12} /> Upload
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Style helper ─── */
function container(compact: boolean, palette: string): string {
  return [
    'rounded-xl border',
    palette,
    compact ? 'p-3' : 'p-4 sm:p-5',
  ].join(' ');
}