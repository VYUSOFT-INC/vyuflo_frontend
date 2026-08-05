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
    // Fill in defaults if backend returns partial payload
    return {
      attorney:          res.data?.attorney ?? null,
      appointment_types: res.data?.appointment_types?.length ? res.data.appointment_types : APPOINTMENT_TYPES,
      slots:             res.data?.slots?.length ? res.data.slots : synthesiseSlots(browserTz()),
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