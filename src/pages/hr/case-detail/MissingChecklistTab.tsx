// src/pages/hr/case-detail/MissingChecklistTab.tsx
//
// HR Case Detail → "Missing Checklist" tab.
// Sources: GET /api/v1/hr/cases/{application_id}/tasks (hrTaskApi.list)
// Each task = a required item for this case. Uploaded document (if any)
// is embedded on the same row via `document_id / document_name / …`
// fields already returned by HRTaskResponse.

import { useEffect, useMemo, useState } from 'react';
import { hrTaskApi } from '../../../api/hr/hrTask.api';
import type { HRTaskResponse } from '../../../types/hr/task.types';

interface Props {
  applicationId: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  critical: '#dc2626',
  high:     '#ea580c',
  medium:   '#ca8a04',
  low:      '#16a34a',
};

function fmtBytes(n: number | null | undefined): string {
  if (!n || n <= 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

export default function MissingChecklistTab({ applicationId }: Props) {
  const [tasks,   setTasks]   = useState<HRTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const list = await hrTaskApi.list(applicationId);
        if (!cancelled) setTasks(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load checklist.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [applicationId]);

  const { completed, total, requiredMissing, optionalMissing } = useMemo(() => {
    const required = tasks.filter((t) => t.is_required);
    const completed = required.filter((t) => t.is_completed).length;
    return {
      total:            required.length,
      completed,
      requiredMissing:  required.filter((t) => !t.is_completed),
      optionalMissing:  tasks.filter((t) => !t.is_required && !t.is_completed),
    };
  }, [tasks]);

  if (loading) return (
    <div className="rounded-2xl border border-[#f1f5f9] bg-white p-8 text-center text-sm text-gray-500">
      Loading checklist…
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {error}
    </div>
  );

  if (tasks.length === 0) return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="text-sm font-semibold text-gray-700">No checklist items yet.</p>
      <p className="mt-1 text-xs text-gray-500">Attorney will populate the required documents for this case shortly.</p>
    </div>
  );

  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const uploaded = tasks.filter((t) => t.document_id).length;

  return (
    <div className="space-y-4">
      {/* Progress header */}
      <div className="rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.04)]">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900">Required Documents</p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-800">{completed}</span> / {total} complete
            {' · '}
            <span className="font-semibold text-gray-800">{uploaded}</span> uploaded
          </p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
               style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-[11px] text-gray-500">{pct}% of required items completed.</p>
      </div>

      {/* Required missing */}
      {requiredMissing.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-amber-800">
            ⚠ Missing — action needed ({requiredMissing.length})
          </p>
          <ul className="space-y-2">
            {requiredMissing.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </ul>
        </section>
      )}

      {/* Completed */}
      <section className="rounded-2xl border border-[#f1f5f9] bg-white p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
          ✓ Completed ({tasks.filter((t) => t.is_completed).length})
        </p>
        {tasks.filter((t) => t.is_completed).length === 0 ? (
          <p className="text-xs text-gray-500">Nothing checked off yet.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.filter((t) => t.is_completed).map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        )}
      </section>

      {/* Optional / nice-to-have */}
      {optionalMissing.length > 0 && (
        <section className="rounded-2xl border border-[#f1f5f9] bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-700">
            Optional — nice to have ({optionalMissing.length})
          </p>
          <ul className="space-y-2">
            {optionalMissing.map((t) => <TaskRow key={t.id} task={t} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: HRTaskResponse }) {
  const done       = task.is_completed;
  const hasDoc     = !!task.document_id;
  const prioColor  = PRIORITY_COLOR[task.priority] ?? '#64748b';
  return (
    <li className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
      done ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-white'
    }`}>
      <span className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[11px] font-bold ${
        done ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
      }`}>
        {done ? '✓' : '•'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`text-[13px] font-semibold ${done ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {task.task_name}
          </p>
          {task.is_required && !done && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">
              Required
            </span>
          )}
          {task.priority && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                  style={{ backgroundColor: prioColor + '20', color: prioColor }}>
              {task.priority}
            </span>
          )}
        </div>
        {task.description && (
          <p className="mt-0.5 text-[11px] text-gray-500">{task.description}</p>
        )}
        {hasDoc && (
          <p className="mt-1 text-[11px] text-indigo-700">
            📎 {task.document_name}
            {task.document_size_bytes ? ` · ${fmtBytes(task.document_size_bytes)}` : ''}
            {task.document_uploaded_at ? ` · uploaded ${fmtDate(task.document_uploaded_at)}` : ''}
          </p>
        )}
      </div>
    </li>
  );
}
