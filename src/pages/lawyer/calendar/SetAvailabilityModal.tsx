// src/pages/lawyer/calendar/SetAvailabilityModal.tsx
//
// Attorney weekly availability editor. Multi-window per day: any day
// can have unlimited (start-end) blocks so a lawyer can split for
// lunch / court time / hard stops without needing 2 accounts.
//
// Backend contract:  BACKEND_MULTI_WINDOW_AVAILABILITY.md

import { useEffect, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import {
  getMyAvailability, putMyAvailability, regenerateMySlots,
} from '../../../api/lawyer/availability.api';
import {
  DAYS_OF_WEEK, SLOT_DURATIONS, groupRowsByDay, daysToRows,
  type DayAvailability, type AvailabilityWindow,
} from '../../../types/lawyer/availability.types';

interface Props {
  open:      boolean;
  onClose:   () => void;
  onSaved?:  () => void;
}

const DEFAULT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const DEFAULT_WINDOW: AvailabilityWindow = {
  start_time: '09:00',
  end_time:   '17:00',
  slot_duration_minutes: 30,
};

export default function SetAvailabilityModal({ open, onClose, onSaved }: Props) {
  const [days,    setDays]    = useState<DayAvailability[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const rows = await getMyAvailability();
        if (cancelled) return;
        setDays(groupRowsByDay(rows));
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load availability.');
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const toggleDay = (dayCode: number) => {
    setDays((prev) => prev.map((d) => {
      if (d.day_of_week !== dayCode) return d;
      const nowActive = !d.is_active;
      return {
        ...d,
        is_active: nowActive,
        // Seed one default window when turning a day on for the first time.
        windows: nowActive && d.windows.length === 0 ? [{ ...DEFAULT_WINDOW }] : d.windows,
      };
    }));
  };

  const patchWindow = (dayCode: number, idx: number, patch: Partial<AvailabilityWindow>) => {
    setDays((prev) => prev.map((d) => {
      if (d.day_of_week !== dayCode) return d;
      const next = [...d.windows];
      next[idx] = { ...next[idx], ...patch };
      return { ...d, windows: next };
    }));
  };

  const addWindow = (dayCode: number) => {
    setDays((prev) => prev.map((d) => {
      if (d.day_of_week !== dayCode) return d;
      // If the last window ends at 12:00, seed a lunch-break window.
      const last = d.windows[d.windows.length - 1];
      const nextStart = last?.end_time || '14:00';
      const nextEnd   = last?.end_time && last.end_time < '17:00' ? '17:00' : '18:00';
      return {
        ...d,
        is_active: true,
        windows: [...d.windows, {
          start_time: nextStart, end_time: nextEnd,
          slot_duration_minutes: last?.slot_duration_minutes ?? 30,
        }],
      };
    }));
  };

  const removeWindow = (dayCode: number, idx: number) => {
    setDays((prev) => prev.map((d) => {
      if (d.day_of_week !== dayCode) return d;
      const nextWindows = d.windows.filter((_, i) => i !== idx);
      return {
        ...d,
        windows: nextWindows,
        is_active: nextWindows.length > 0 && d.is_active,
      };
    }));
  };

  const applyToAll = () => {
    // Copy the first active day's windows to every other active day —
    // fast way to say "same hours all week".
    const src = days.find((d) => d.is_active && d.windows.length > 0);
    if (!src) return;
    setDays((prev) => prev.map((d) => (
      d.is_active
        ? { ...d, windows: src.windows.map((w) => ({ ...w })) }
        : d
    )));
  };

  const handleSave = async () => {
    setSaving(true); setError(null);
    try {
      // Client validation — every active day must have at least one full window.
      for (const d of days) {
        if (!d.is_active) continue;
        for (const w of d.windows) {
          if (!w.start_time || !w.end_time || w.start_time >= w.end_time) {
            const label = DAYS_OF_WEEK.find((x) => x.code === d.day_of_week)?.label ?? '';
            throw new Error(`${label}: each window must have a start time earlier than its end time.`);
          }
        }
      }
      const rows = daysToRows(days, DEFAULT_TZ);
      await putMyAvailability({ rows });
      // Kick off slot regeneration so employee-side booking picks up the change.
      regenerateMySlots().catch(() => {});
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save availability.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Set Weekly Availability</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Add multiple time windows per day (e.g. 9:00–12:00 and 14:00–17:00). Timezone: <span className="font-semibold">{DEFAULT_TZ}</span>
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-center text-xs text-gray-500">Loading current availability…</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-end">
                <button onClick={applyToAll}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                  Apply first-day hours to every active day
                </button>
              </div>

              {days.map((d) => {
                const meta = DAYS_OF_WEEK.find((x) => x.code === d.day_of_week)!;
                return (
                  <section key={d.day_of_week}
                    className={`rounded-xl border p-3 ${d.is_active ? 'border-indigo-200 bg-indigo-50/30' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={d.is_active}
                          onChange={() => toggleDay(d.day_of_week)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500" />
                        <span className="text-sm font-semibold text-gray-800">{meta.label}</span>
                      </label>
                      {d.is_active && (
                        <button onClick={() => addWindow(d.day_of_week)}
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50">
                          <Plus size={12} /> Add window
                        </button>
                      )}
                    </div>

                    {d.is_active && d.windows.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {d.windows.map((w, idx) => (
                          <div key={idx} className="flex flex-wrap items-center gap-2">
                            <input type="time" value={w.start_time}
                              onChange={(e) => patchWindow(d.day_of_week, idx, { start_time: e.target.value })}
                              className={inputCls} />
                            <span className="text-xs text-gray-500">to</span>
                            <input type="time" value={w.end_time}
                              onChange={(e) => patchWindow(d.day_of_week, idx, { end_time: e.target.value })}
                              className={inputCls} />
                            <span className="text-xs text-gray-500">·</span>
                            <select value={w.slot_duration_minutes}
                              onChange={(e) => patchWindow(d.day_of_week, idx, { slot_duration_minutes: Number(e.target.value) })}
                              className={inputCls}>
                              {SLOT_DURATIONS.map((m) => (
                                <option key={m} value={m}>{m} min slots</option>
                              ))}
                            </select>
                            {d.windows.length > 1 && (
                              <button onClick={() => removeWindow(d.day_of_week, idx)}
                                title="Remove this window"
                                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600">
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-5 py-3">
          <button onClick={onClose} disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || loading}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:opacity-90 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save availability'}
          </button>
        </footer>
      </div>
    </div>
  );
}

const inputCls =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs text-gray-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100';
