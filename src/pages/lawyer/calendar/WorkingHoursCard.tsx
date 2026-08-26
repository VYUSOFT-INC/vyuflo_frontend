// src/pages/lawyer/calendar/WorkingHoursCard.tsx
//
// Sidebar card on the lawyer's Calendar page that summarises the
// current weekly working hours. "Set Availability" button opens the
// SetAvailabilityModal.

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { getMyAvailability } from '../../../api/lawyer/availability.api';
import {
  DAYS_OF_WEEK, groupRowsByDay, type DayAvailability,
} from '../../../types/lawyer/availability.types';
import SetAvailabilityModal from './SetAvailabilityModal';

/** Formats "HH:mm" → "9:00 AM". */
function fmt(t: string): string {
  if (!t) return '';
  const [hh, mm] = t.split(':');
  const h = Number(hh);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${mm} ${suffix}`;
}

export default function WorkingHoursCard() {
  const [days,    setDays]    = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getMyAvailability();
      setDays(groupRowsByDay(rows));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const activeDays = days.filter((d) => d.is_active && d.windows.length > 0);

  return (
    <>
      <div className="rounded-2xl border border-[#f1f5f9] bg-white p-4 shadow-[0px_1px_1px_rgba(0,0,0,0.05)]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
              <Clock size={16} />
            </span>
            <div>
              <p className="text-sm font-bold text-gray-900">Working Hours</p>
              <p className="text-[11px] text-gray-500">Times you accept consultation bookings.</p>
            </div>
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500">Loading…</p>
        ) : activeDays.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-3 text-center">
            <p className="text-xs font-semibold text-gray-700">Not set yet.</p>
            <p className="mt-0.5 text-[11px] text-gray-500">
              Add weekly hours to start accepting bookings.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {activeDays.map((d) => {
              const meta = DAYS_OF_WEEK.find((x) => x.code === d.day_of_week)!;
              return (
                <li key={d.day_of_week} className="flex items-start gap-3 text-[12px]">
                  <span className="w-10 shrink-0 font-semibold text-gray-700">{meta.short}</span>
                  <span className="flex-1 text-gray-800">
                    {d.windows.map((w, i) => (
                      <span key={i}>
                        {i > 0 && <span className="text-gray-400"> · </span>}
                        {fmt(w.start_time)} – {fmt(w.end_time)}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <button
          onClick={() => setOpen(true)}
          className="mt-3 w-full rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:opacity-90"
        >
          {activeDays.length === 0 ? 'Set Availability' : 'Edit Availability'}
        </button>
      </div>

      <SetAvailabilityModal open={open} onClose={() => setOpen(false)} onSaved={load} />
    </>
  );
}
