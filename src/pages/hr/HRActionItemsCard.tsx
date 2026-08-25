// src/pages/hr/HRActionItemsCard.tsx
//
// "Action Items" card on the HR dashboard. Lists open form-correction
// requests the attorney sent back to HR. Backend endpoint is the primary
// source; local I-9 / I-983 draft `open_corrections` targeted at HR are
// injected as a fallback so the flow works end-to-end pre-backend.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listHRActionItems, type HRActionItem } from '../../api/hr/actionItems.api';
import { listLocalDrafts as listLocalI9Drafts }   from '../../api/employee/i9Form.api';
import { listLocalDrafts as listLocalI983Drafts } from '../../api/employee/i983Form.api';

/** Local-fallback shape — mirrors HRActionItem minus fields that we
 *  can't cheaply synthesize (form_id vs application_id, requester name). */
type Item = {
  id:               string;
  form_type:        'i9' | 'i983';
  application_id:   string;
  case_reference:   string;
  employee_name:    string;
  requested_by:     string;
  note:             string;
  fields:           string[];
  created_at:       string;
};

export default function HRActionItemsCard() {
  const navigate = useNavigate();
  const [backendItems, setBackendItems] = useState<HRActionItem[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listHRActionItems();
        if (!cancelled) setBackendItems(Array.isArray(list) ? list : []);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Merge backend items (when it ships) with local corrections extracted
  // from I-9 / I-983 drafts that target='hr'. De-dupe by correction id.
  const items: Item[] = useMemo(() => {
    const rows: Item[] = [];
    const seen = new Set<string>();

    // 1. Backend — normalise to safe defaults so a malformed row doesn't
    //    take out the whole card.
    for (const b of backendItems) {
      if (!b || typeof b !== 'object') continue;
      const id = b.id ?? `${b.form_type}-${b.application_id}`;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      rows.push({
        id,
        form_type:      (b.form_type === 'i983' ? 'i983' : 'i9') as 'i9' | 'i983',
        application_id: b.application_id ?? '',
        case_reference: b.case_reference ?? '',
        employee_name:  b.employee_name  ?? 'Employee',
        requested_by:   b.requested_by   ?? 'Attorney',
        note:           b.note           ?? '',
        fields:         Array.isArray(b.fields) ? b.fields : [],
        created_at:     b.created_at     ?? new Date().toISOString(),
      });
    }

    // 2. Local fallback — form drafts with open_corrections targeting HR.
    try {
      const push = (
        formType: 'i9' | 'i983',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec: any,
      ) => {
        if (!rec || !rec.application_id) return;
        const opens = Array.isArray(rec.open_corrections) ? rec.open_corrections : [];
        for (const c of opens) {
          if (!c || c.target !== 'hr' || c.resolved_at) continue;
          const id = `local-${formType}-${c.id ?? Math.random()}`;
          if (seen.has(id)) continue;
          seen.add(id);
          const employeeName =
            formType === 'i9'
              ? [rec.data?.first_name, rec.data?.last_name].filter(Boolean).join(' ') || 'Employee'
              : [rec.data?.student_given_name, rec.data?.student_surname].filter(Boolean).join(' ') || 'Employee';
          rows.push({
            id,
            form_type:      formType,
            application_id: rec.application_id,
            case_reference: `#${String(rec.application_id).slice(0, 8).toUpperCase()}`,
            employee_name:  employeeName,
            requested_by:   c.requested_by_name ?? 'Attorney',
            note:           c.note ?? '',
            fields:         Array.isArray(c.fields) ? c.fields : [],
            created_at:     c.created_at ?? new Date().toISOString(),
          });
        }
      };
      listLocalI9Drafts().forEach((r)   => push('i9',   r));
      listLocalI983Drafts().forEach((r) => push('i983', r));
    } catch { /* ignore */ }

    return rows;
  }, [backendItems]);

  const openItem = (it: Item) => {
    const path = it.form_type === 'i9'
      ? `/employer/visa-forms/i9/${it.application_id}/pdf`
      : `/employer/visa-forms/i983/${it.application_id}/pdf`;
    navigate(path);
  };

  return (
    <div className="rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">⚠</span>
          <div>
            <p className="text-sm font-bold text-gray-900">Action Items</p>
            <p className="text-[11px] text-gray-500">Corrections requested by attorneys for you to fix.</p>
          </div>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
            {items.length}
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-gray-500">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-center">
          <p className="text-xs font-semibold text-gray-700">You&apos;re all caught up.</p>
          <p className="mt-0.5 text-[11px] text-gray-500">No open correction requests.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((it) => (
            <li key={it.id}>
              <button onClick={() => openItem(it)}
                className="w-full rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-left transition hover:bg-amber-100/70">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-bold text-amber-900">
                    {it.form_type === 'i9' ? 'Form I-9' : 'Form I-983'} · {it.employee_name}
                  </p>
                  {it.case_reference && (
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">{it.case_reference}</span>
                  )}
                </div>
                <p className="mt-1 truncate text-[11px] text-amber-900/80">{it.note}</p>
                {it.fields.length > 0 && (
                  <p className="mt-0.5 truncate text-[10px] text-amber-800">Fields: {it.fields.join(', ')}</p>
                )}
                <p className="mt-1 text-[10px] text-amber-700/80">
                  Requested by {it.requested_by} · {(() => {
                    try { return new Date(it.created_at).toLocaleDateString(); }
                    catch { return ''; }
                  })()}
                </p>
              </button>
            </li>
          ))}
          {items.length > 5 && (
            <li>
              <button onClick={() => navigate('/employer/visa-forms')}
                className="w-full rounded-lg border border-gray-200 bg-white p-2 text-center text-xs font-semibold text-indigo-600 hover:bg-gray-50">
                See all {items.length} items →
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
