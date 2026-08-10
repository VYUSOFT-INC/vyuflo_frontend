// src/api/employee/bookConsultation.api.ts
//
// Talks to backend for real data; falls back to mock data (2 seeded
// attorneys + synthesised slots + placeholder Zoho link) so the flow
// is testable until backend adds POST /consultations/bookings.

import axios from "../axios";
import { MOCK_ATTORNEYS } from "./selectAttorney.api";
import type {
  BookConsultationData,
  CreateConsultationBookingRequest,
  CreateConsultationBookingResponse,
  AppointmentType,
  ConsultationSlot,
  MyBookingRecord,
  BookingStatus,
  ConsultationFormat,
} from "../../types/employee/bookConsultation.types";

const APPOINTMENT_TYPES: AppointmentType[] = [
  { id: "intro",        title: "15-Min Intro Call",   description: "Quick case overview",     duration_minutes: 15, price_usd:  75 },
  { id: "consultation", title: "30-Min Consultation", description: "Detailed discussion",     duration_minutes: 30, price_usd: 150 },
  { id: "case_review",  title: "60-Min Case Review",  description: "Comprehensive analysis",  duration_minutes: 60, price_usd: 275 },
];

/** Synthesise 14 days of slots × 7 time-of-day options. */
function synthesiseSlots(tz: string): ConsultationSlot[] {
  const times = ["9:00 AM", "10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "3:30 PM", "4:30 PM"];
  const out: ConsultationSlot[] = [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let d = 0; d < 14; d++) {
    const day = new Date(today); day.setDate(today.getDate() + d);
    const iso = ymd(day);
    times.forEach((t, i) =>
      out.push({ id: `${iso}-${i}`, date: iso, time: t, timezone: tz, availability: "high" })
    );
  }
  return out;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function browserTz(): string {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
  catch { return "UTC"; }
}

function randomConfirmationNo(): string {
  return "VYU-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

/** GET /consultations/book-page?attorney_id=… */
export const getBookConsultationData = async (
  attorneyId?: string,
): Promise<BookConsultationData> => {
  // Mock short-circuit for seeded attorneys — no network call at all
  const mock = attorneyId ? MOCK_ATTORNEYS.find(a => a.id === attorneyId) : null;
  if (mock) {
    return {
      attorney:          mock,
      appointment_types: APPOINTMENT_TYPES,
      slots:             synthesiseSlots(browserTz()),
    };
  }

  try {
    const query = attorneyId ? `?attorney_id=${attorneyId}` : "";
    const res = await axios.get<BookConsultationData>(`/consultations/book-page${query}`);
    // Only synthesise slots when the backend attorney is missing entirely
    // (i.e. we're in a fully-mocked state). If a real attorney exists but
    // has no slots, show the honest empty state instead of synthesising
    // fake IDs — otherwise POST /bookings 422s with "invalid UUID".
    const hasRealAttorney = !!res.data?.attorney;
    return {
      attorney:          res.data?.attorney ?? null,
      appointment_types: res.data?.appointment_types?.length ? res.data.appointment_types : APPOINTMENT_TYPES,
      slots:             res.data?.slots?.length
        ? res.data.slots
        : (hasRealAttorney ? [] : synthesiseSlots(browserTz())),
    };
  } catch {
    // Backend not ready — fall back to a fully synthetic response
    return {
      attorney:          MOCK_ATTORNEYS[0],
      appointment_types: APPOINTMENT_TYPES,
      slots:             synthesiseSlots(browserTz()),
    };
  }
};

/** POST /consultations/bookings — real endpoint; falls back to mock success. */
export const createConsultationBooking = async (
  body: CreateConsultationBookingRequest,
): Promise<CreateConsultationBookingResponse> => {
  try {
    const res = await axios.post<CreateConsultationBookingResponse>(
      "/consultations/bookings",
      body,
    );
    return res.data;
  } catch (e: unknown) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (e as any)?.response?.status;
    if (status && status !== 404 && status !== 501) throw e;

    // Backend not implemented yet → generate a mock success so the
    // employee flow completes. Backend team replaces this.
    const fakeKey = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 12);
    const type = APPOINTMENT_TYPES.find(t => t.id === body.appointment_type_id) ?? APPOINTMENT_TYPES[1];
    return {
      id:                   `mock-booking-${Date.now()}`,
      status:               "confirmed",
      confirmation_no:      randomConfirmationNo(),
      scheduled_start_iso:  body.scheduled_start_iso,
      duration_minutes:     type.duration_minutes,
      zoho_meeting_id:      fakeKey,
      zoho_join_url:        `https://meeting.zoho.com/join?key=${fakeKey}`,
      message:              "Booking confirmed (mock — backend not yet wired).",
      is_mock:              true,
    };
  }
};

/* ── My Bookings ─────────────────────────────────────────────────── */
const MY_BOOKINGS_KEY = "vyuflo:employee:local-bookings:v1";

/** Persist a booking locally so it appears in "My Bookings" even before
 *  backend `GET /consultations/bookings` returns per-user bookings. */
export function appendLocalBooking(rec: MyBookingRecord): void {
  try {
    const raw = localStorage.getItem(MY_BOOKINGS_KEY);
    const list: MyBookingRecord[] = raw ? JSON.parse(raw) : [];
    const next = [rec, ...list.filter((b) => b.id !== rec.id)];
    localStorage.setItem(MY_BOOKINGS_KEY, JSON.stringify(next));
  } catch { /* ignore quota / private mode */ }
}

function readLocalBookings(): MyBookingRecord[] {
  try {
    const raw = localStorage.getItem(MY_BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

/** GET /consultations/bookings — falls back to localStorage if backend
 *  doesn't yet scope by current user or returns empty. */
export const listMyBookings = async (): Promise<MyBookingRecord[]> => {
  const localList = readLocalBookings();
  try {
    const res = await axios.get("/consultations/bookings", { params: { limit: 100 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = Array.isArray(res.data) ? res.data
      : res.data?.items ?? res.data?.bookings ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parsed: MyBookingRecord[] = items.map((b: any) => {
      const attorney = b.attorney ?? {};
      const attorneyUser = attorney.user ?? {};
      const type = b.appointment_type ?? {};
      const slot = b.slot ?? {};
      const startIso = b.scheduled_start_iso
        ?? (slot.slot_date && slot.slot_time ? `${slot.slot_date}T${slot.slot_time}` : new Date().toISOString());
      return {
        id:                  b.id,
        confirmation_no:     b.confirmation_no ?? `VYU-${String(b.id ?? "").slice(0, 6).toUpperCase()}`,
        attorney_name:       [attorneyUser.first_name, attorneyUser.last_name].filter(Boolean).join(" ") || "Attorney",
        attorney_email:      attorneyUser.email ?? null,
        attorney_photo_url:  attorney.profile_photo_url ?? null,
        attorney_firm:       attorney.law_firm_name ?? null,
        appointment_type:    type.title ?? "Consultation",
        duration_minutes:    type.duration_minutes ?? b.duration_minutes ?? 30,
        consultation_format: (b.consultation_format as ConsultationFormat) ?? "virtual",
        status:              (b.status as BookingStatus) ?? "confirmed",
        scheduled_start_iso: startIso,
        timezone:            slot.timezone ?? b.client_timezone ?? "UTC",
        zoho_join_url:       b.zoho_join_url ?? b.meeting_link ?? null,
      };
    });
    // Merge local bookings de-duped by id (local first so mocks show)
    const seen = new Set(parsed.map((b) => b.id));
    return [...parsed, ...localList.filter((b) => !seen.has(b.id))];
  } catch {
    return localList;
  }
};