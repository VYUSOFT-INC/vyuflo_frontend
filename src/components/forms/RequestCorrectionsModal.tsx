// src/components/forms/RequestCorrectionsModal.tsx
//
// Modal used from the lawyer review page to send a form back with
// corrections. Attorney picks: (a) target party — employee or HR —
// (b) required note, (c) optional list of fields to flag.

import { useEffect, useState } from 'react';

export interface RequestCorrectionsSubmit {
  target: 'employee' | 'hr';
  note:   string;
  fields: string[];
}

interface Props {
  open:       boolean;
  formLabel:  string;                    // e.g. "I-9 · Gowtham L."
  fieldOptions?: Array<{ key: string; label: string }>;
  onCancel:   () => void;
  onSubmit:   (payload: RequestCorrectionsSubmit) => Promise<void> | void;
}

export default function RequestCorrectionsModal({
  open, formLabel, fieldOptions = [], onCancel, onSubmit,
}: Props) {
  const [target, setTarget] = useState<'employee' | 'hr'>('employee');
  const [note,   setNote]   = useState('');
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [busy,   setBusy]   = useState(false);
  const [err,    setErr]    = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTarget('employee'); setNote(''); setChecked(new Set()); setErr(null); setBusy(false); }
  }, [open]);

  if (!open) return null;

  const toggleField = (k: string) => {
    setChecked((prev) => {
      const s = new Set(prev);
      if (s.has(k)) s.delete(k); else s.add(k);
      return s;
    });
  };

  const submit = async () => {
    if (!note.trim() || note.trim().length < 5) { setErr('Add a short note (at least 5 characters).'); return; }
    setBusy(true); setErr(null);
    try {
      await onSubmit({ target, note: note.trim(), fields: Array.from(checked) });
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not submit corrections.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">Request corrections</h2>
          <p className="mt-0.5 text-xs text-gray-500">Send <span className="font-semibold text-gray-700">{formLabel}</span> back for edits.</p>
        </header>

        <div className="space-y-4 px-5 py-4">
          {/* Target party */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Who should fix this?</p>
            <div className="grid grid-cols-2 gap-2">
              {(['employee', 'hr'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTarget(t)}
                  className={`rounded-lg border p-2 text-left text-xs transition ${
                    target === t
                      ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-200'
                      : 'border-gray-200 bg-white hover:border-indigo-300'
                  }`}
                >
                  <p className="font-bold text-gray-900">{t === 'employee' ? 'Employee' : 'HR'}</p>
                  <p className="text-[10px] text-gray-500">
                    {t === 'employee'
                      ? 'Sends the form back to the employee to edit Section 1.'
                      : 'Sends the form back to HR to edit their sections.'}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Optional field checklist */}
          {fieldOptions.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">Fields to flag (optional)</p>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                {fieldOptions.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs text-gray-700 hover:bg-white">
                    <input type="checkbox" checked={checked.has(f.key)} onChange={() => toggleField(f.key)}
                      className="h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500" />
                    <span>{f.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-600">
              Note <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Explain what needs to change so they can fix it in one pass."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button onClick={onCancel} disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={submit} disabled={busy}
            className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
            {busy ? 'Sending…' : 'Send back for corrections'}
          </button>
        </footer>
      </div>
    </div>
  );
}
