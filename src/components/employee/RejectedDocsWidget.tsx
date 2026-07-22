// src/components/employee/RejectedDocsWidget.tsx
//
// "Action Required" widget — drop into Employee Dashboard or DocumentHub.
//
// Fetches GET /api/v1/documents/my-rejected on mount, shows each rejected
// document with the rejection reason + a Re-upload button.
//
// Usage:
//   <RejectedDocsWidget />              // standalone (full-width card)
//   <RejectedDocsWidget compact />      // tighter density
//   <RejectedDocsWidget hideWhenEmpty /> // hide entirely if nothing rejected
//
// Re-upload action is a placeholder — wires up cleanly once backend ships
// POST /documents/upload with replaces_document_id support.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { rejectedDocumentsApi } from '../../api/employee/rejectedDocuments.api';
import type {
  MyRejectedDocument,
} from '../../types/employee/rejectedDocuments.types';

interface Props {
  /** Tighter density — useful for dashboard sidebars */
  compact?: boolean;
  /** Override the "Re-upload" navigation target */
  onReupload?: (doc: MyRejectedDocument) => void;
  /** Hide entirely when there's nothing to action (default: false — shows empty state) */
  hideWhenEmpty?: boolean;
}

/* ════════════════════════════════════════════════════════════════════ */
export default function RejectedDocsWidget({
  compact = false,
  onReupload,
  hideWhenEmpty = false,
}: Props) {
  const navigate = useNavigate();
  const [items, setItems]     = useState<MyRejectedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await rejectedDocumentsApi.getMyRejected();
      setItems(res.items || []);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      const status = ax?.response?.status;
      // 404/405 → endpoint not deployed yet.
      // 422    → backend is treating "my-rejected" as a UUID param (route
      //          shadowed by /documents/{document_id}). Same effect: endpoint
      //          not yet available. Treat all three as "no rejected docs" so
      //          the widget renders empty (or hides via hideWhenEmpty) instead
      //          of blocking the whole page with an error banner.
      if (status === 404 || status === 405 || status === 422) {
        setItems([]);
        return;
      }
      if (status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(e instanceof Error ? e.message : 'Could not load rejected documents.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleReupload = (doc: MyRejectedDocument) => {
    if (onReupload) {
      onReupload(doc);
      return;
    }
    // Default — navigate to upload page with the doc context.
    // Once backend supports `replaces_document_id`, append it here:
    navigate(`/documents/upload?replaces=${doc.id}&name=${encodeURIComponent(doc.file_name)}`);
  };

  /* ── Hide entirely (opt-in) when nothing to action ─────────────── */
  if (!loading && !error && items.length === 0 && hideWhenEmpty) {
    return null;
  }

  /* ── Loading state ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className={containerClasses(compact, 'border-gray-200 bg-white')}>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          Loading documents that need your attention…
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────────── */
  if (error) {
    return (
      <div className={containerClasses(compact, 'border-red-200 bg-red-50')}>
        <p className="text-sm text-red-700">⚠ {error}</p>
        <button
          onClick={load}
          className="mt-2 text-xs font-semibold text-red-700 underline hover:text-red-900"
        >
          Retry
        </button>
      </div>
    );
  }

  /* ── Empty state ──────────────────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className={containerClasses(compact, 'border-emerald-200 bg-emerald-50/40')}>
        <div className="flex items-start gap-3">
          <span className="text-lg">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-900">All caught up</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              No documents are awaiting your attention right now.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Has items ────────────────────────────────────────────────── */
  return (
    <div className={containerClasses(compact, 'border-amber-200 bg-amber-50/40')}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 text-lg">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              {items.length === 1
                ? '1 document needs your attention'
                : `${items.length} documents need your attention`}
            </p>
            <p className="mt-0.5 text-[11px] text-amber-700">
              Your attorney has flagged these — please re-upload with the requested fixes.
            </p>
          </div>
        </div>
        <button
          onClick={load}
          title="Refresh"
          className="shrink-0 rounded-md p-1 text-amber-600 hover:bg-amber-100"
        >
          ⟳
        </button>
      </div>

      {/* Items */}
      <ul className={`mt-3 space-y-2 ${compact ? '' : 'sm:space-y-3'}`}>
        {items.map((doc) => (
          <li
            key={doc.id}
            className="rounded-lg border border-amber-100 bg-white p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <span>📄</span>
                  <span className="truncate">{doc.file_name}</span>
                </p>
                <p className="mt-1 text-xs text-gray-600 whitespace-pre-wrap break-words">
                  {doc.rejection_reason || 'No reason provided.'}
                </p>
                <p className="mt-1.5 text-[10px] text-gray-400">
                  Rejected on {formatDateTime(doc.updated_at)}
                </p>
              </div>
              <button
                onClick={() => handleReupload(doc)}
                className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Re-upload
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function containerClasses(compact: boolean, palette: string): string {
  return [
    'rounded-xl border',
    palette,
    compact ? 'p-3' : 'p-4 sm:p-5',
  ].join(' ');
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}