// src/types/employee/bookConsultation.types.ts
import type { AttorneyProfile } from "./selectAttorney.types";
export type { AttorneyProfile };

export type ConsultationFormat = "virtual" | "in_person";

export type BookingStep = "details" | "schedule" | "confirmation";

export interface AppointmentType {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  price_usd: number;                                   // shown as info only — no payment yet
}

export interface ConsultationSlot {
  id: string;
  date: string;                                        // ISO YYYY-MM-DD
  time: string;                                        // "9:00 AM"
  timezone: string;                                    // IANA e.g. "America/Los_Angeles"
  availability: "high" | "limited" | "none";
}

export interface BookConsultationData {
  attorney: AttorneyProfile | null;
  appointment_types: AppointmentType[];
  slots: ConsultationSlot[];
}

/* ── Booking ─────────────────────────────────────────────────────── */
export interface CreateConsultationBookingRequest {
  attorney_id:          string;
  appointment_type_id:  string;
  consultation_format:  ConsultationFormat;
  slot_id:              string;
  scheduled_start_iso:  string;                        // ISO datetime UTC
  client_timezone:      string;                        // IANA
}

export interface CreateConsultationBookingResponse {
  id:                   string;
  status:               string;                        // 'confirmed'
  confirmation_no:      string;                        // e.g. "VYU-8F3A2K"
  scheduled_start_iso:  string;
  duration_minutes:     number;
  zoho_meeting_id:      string | null;
  zoho_join_url:        string | null;
  message?:             string;
  is_mock?:             boolean;                       // true when backend not yet ready
}

/* ── Helpers ─────────────────────────────────────────────────────── */
export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(amount);
}

export function parseJsonText(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch {
    return value.split(",").map(x => x.trim()).filter(Boolean);
  }
}

/** Build a downloadable `.ics` calendar file for the booked consultation. */
export function buildIcsBlob(params: {
  title:            string;
  start_iso:        string;                            // ISO datetime UTC
  duration_minutes: number;
  description:      string;
  location:         string;
}): Blob {
  const dtStart = params.start_iso.replace(/[-:]/g, "").split(".")[0] + "Z";
  const end     = new Date(new Date(params.start_iso).getTime() + params.duration_minutes * 60000);
  const dtEnd   = end.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const uid     = `vyuflo-${Date.now()}@vyuflo.com`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vyuflo//Consultation//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([ics], { type: "text/calendar" });
}