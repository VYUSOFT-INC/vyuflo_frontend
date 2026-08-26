// src/api/lawyer/availability.api.ts
//
// Attorney availability — talks to the backend's /me shortcuts. If the
// backend hasn't shipped the /me routes yet, falls back gracefully.

import axios from '../axios';
import type {
  AvailabilityRow, AvailabilityPutPayload,
} from '../../types/lawyer/availability.types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissing = (e: any) => !e?.response || [404, 405, 501].includes(e.response.status);

/** GET /attorneys/me/availability — current attorney's rows. */
export async function getMyAvailability(): Promise<AvailabilityRow[]> {
  try {
    const res = await axios.get<AvailabilityRow[]>('/attorneys/me/availability');
    if (Array.isArray(res.data)) return res.data;
    return [];
  } catch (e) {
    if (!isMissing(e)) throw e;
    return [];
  }
}

/** PUT /attorneys/me/availability — bulk replace. */
export async function putMyAvailability(payload: AvailabilityPutPayload): Promise<AvailabilityRow[]> {
  try {
    const res = await axios.put<AvailabilityRow[]>('/attorneys/me/availability', payload);
    return Array.isArray(res.data) ? res.data : payload.rows;
  } catch (e) {
    if (!isMissing(e)) throw e;
    // Backend shortcut missing — echo what we sent so UI can carry on.
    return payload.rows;
  }
}

/** POST /attorneys/me/slots/generate — regenerate consultation slots
 *  for the next N days after availability change. Silent-fails when
 *  backend doesn't support it. */
export async function regenerateMySlots(fromDate?: string, toDate?: string): Promise<void> {
  const body = {
    from_date: fromDate ?? new Date().toISOString().slice(0, 10),
    to_date:   toDate   ?? addDaysISO(60),
  };
  try {
    await axios.post('/attorneys/me/slots/generate', body);
  } catch (e) {
    if (!isMissing(e)) throw e;
  }
}

function addDaysISO(days: number): string {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
