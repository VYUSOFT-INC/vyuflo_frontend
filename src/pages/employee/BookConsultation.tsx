// src/pages/employee/BookConsultation.tsx
//
// Book Consultation flow (no payment, no price display).
//   Step 1: Details       — appointment type + format + date + slot
//   Step 2: Schedule      — POST to backend; backend returns meeting link
//   Step 3: Confirmation  — success + meeting link + Add to calendar
//
// Payment removed per product spec (v1). Backend handles Zoho meeting.

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  useBookConsultation,
  useCreateConsultationBooking,
} from "../../hooks/employee/useBookConsultation";
import { appendLocalBooking } from "../../api/employee/bookConsultation.api";
import {
  parseJsonText,
} from "../../types/employee/bookConsultation.types";
import type {
  AppointmentType,
  BookingStep,
  ConsultationFormat,
  ConsultationSlot,
  CreateConsultationBookingResponse,
} from "../../types/employee/bookConsultation.types";

/* ══════════════════════════════════════════════════════════════════ */
export default function BookConsultation() {
  const { attorneyId }    = useParams<{ attorneyId: string }>();
  const navigate          = useNavigate();
  const { data, loading } = useBookConsultation(attorneyId);
  const booking           = useCreateConsultationBooking();

  const [step, setStep]        = useState<BookingStep>("details");
  const [error, setError]      = useState<string | null>(null);

  const attorney         = data?.attorney;
  const appointmentTypes = data?.appointment_types ?? [];
  const allSlots         = data?.slots ?? [];

  const attorneyName     = useMemo(() => (
    attorney?.user ? `${attorney.user.first_name} ${attorney.user.last_name}, Esq.` : "Attorney"
  ), [attorney]);
  const attorneyInitials = useMemo(() => {
    const f = attorney?.user?.first_name?.[0] ?? "A";
    const l = attorney?.user?.last_name?.[0]  ?? "";
    return (f + l).toUpperCase();
  }, [attorney]);
  const languages = parseJsonText(attorney?.languages ?? null);

  const [typeId, setTypeId]       = useState<string>("consultation");
  const [format, setFormat]       = useState<ConsultationFormat>("virtual");
  const [selectedDate, setDate]   = useState<Date | null>(null);
  const [selectedSlot, setSlot]   = useState<ConsultationSlot | null>(null);

  const timezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; }
    catch { return "UTC"; }
  }, []);

  const type = appointmentTypes.find(t => t.id === typeId) ?? appointmentTypes[1] ?? appointmentTypes[0];

  const slotsForDate: ConsultationSlot[] = useMemo(() => {
    if (!selectedDate) return [];
    const iso = ymd(selectedDate);
    return allSlots.filter(s => s.date === iso);
  }, [allSlots, selectedDate]);

  const canProceedFromDetails = Boolean(selectedSlot && type && attorney);

  const [result, setResult] = useState<CreateConsultationBookingResponse | null>(null);

  const goToSchedule = async () => {
    if (!canProceedFromDetails || !selectedSlot || !selectedDate || !attorney || !type) return;
    setError(null);
    setStep("schedule");
    try {
      const startIso = slotToIso(selectedDate, selectedSlot.time);
      const res = await booking.submit({
        attorney_id:         attorney.id,
        appointment_type_id: type.id,
        consultation_format: format,
        slot_id:             selectedSlot.id,
        scheduled_start_iso: startIso,
        client_timezone:     timezone,
      });
      // Persist locally so "My Bookings" shows it even before backend
      // scopes /consultations/bookings by current user.
      appendLocalBooking({
        id:                  res.id,
        confirmation_no:     res.confirmation_no,
        attorney_name:       attorneyName,
        attorney_email:      attorney.user?.email ?? null,
        attorney_photo_url:  attorney.profile_photo_url ?? null,
        attorney_firm:       attorney.law_firm_name ?? null,
        appointment_type:    type.title,
        duration_minutes:    res.duration_minutes ?? type.duration_minutes,
        consultation_format: format,
        status:              "confirmed",
        scheduled_start_iso: res.scheduled_start_iso ?? startIso,
        timezone,
        zoho_join_url:       res.zoho_join_url,
        is_mock:             Boolean(res.is_mock),
      });
      setResult(res);
      setStep("confirmation");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule meeting.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-500">Loading consultation…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-6 pt-3 pb-32">

      <Stepper
        current={step}
        hasResult={Boolean(result)}
        onStepClick={(id) => {
          // Guard: only allow navigating to a step the user has actually reached.
          // - "details" is always OK.
          // - "schedule" is OK only after a booking result exists (revisits stay
          //   read-only — the summary view below handles that).
          // - "confirmation" is OK only after a booking result exists.
          if (id === "details") { setStep("details"); return; }
          if (id === "schedule" && result) { setStep("schedule"); return; }
          if (id === "confirmation" && result) { setStep("confirmation"); return; }
        }}
      />

      {step === "details" && type && (
        <DetailsStep
          attorney={{
            name: attorneyName,
            initials: attorneyInitials,
            photo: attorney?.profile_photo_url ?? null,
            firm: attorney?.law_firm_name ?? "",
            years: attorney?.years_experience ?? null,
            languages,
          }}
          appointmentTypes={appointmentTypes}
          typeId={typeId} onTypeChange={setTypeId}
          format={format} onFormatChange={setFormat}
          selectedDate={selectedDate} onDateChange={(d) => { setDate(d); setSlot(null); }}
          slotsForDate={slotsForDate}
          selectedSlot={selectedSlot} onSlotChange={setSlot}
          timezone={timezone}
          type={type}
          canProceed={canProceedFromDetails}
          onContinue={goToSchedule}
          onBack={() => navigate("/consultations")}
        />
      )}

      {step === "schedule" && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-gray-200 bg-white p-8">
            {result ? (
              // Booking already succeeded — show a static summary (revisit view)
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 font-bold">✓</div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Meeting scheduled</p>
                    <p className="text-xs text-gray-500">Confirmation #{result.confirmation_no}</p>
                  </div>
                </div>
                {result.zoho_join_url && (
                  <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Meeting link</p>
                    <a href={result.zoho_join_url} target="_blank" rel="noreferrer"
                       className="mt-1 block break-all text-sm font-semibold text-indigo-700 hover:underline">
                      {result.zoho_join_url}
                    </a>
                  </div>
                )}
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                  <button onClick={() => setStep("details")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    ← Back to details
                  </button>
                  <button onClick={() => setStep("confirmation")}
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white">
                    Continue →
                  </button>
                </div>
              </>
            ) : (
              // Actively scheduling — spinner
              <>
                <div className="flex flex-col items-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                  <p className="mt-4 text-sm font-semibold text-gray-900">Scheduling your meeting…</p>
                  <p className="mt-1 text-xs text-gray-500">Confirming the slot and generating a meeting link.</p>
                </div>
                {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
                <div className="mt-6 flex justify-start">
                  <button onClick={() => setStep("details")}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                    ← Back to details
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {step === "confirmation" && result && selectedSlot && selectedDate && type && (
        <ConfirmationStep
          confirmationNo={result.confirmation_no}
          attorneyName={attorneyName}
          type={type}
          date={selectedDate} slot={selectedSlot}
          timezone={timezone}
          format={format}
          joinUrl={result.zoho_join_url}
          isMock={Boolean(result.is_mock)}
          onBack={() => setStep("details")}
          onDone={() => navigate("/consultations/my-bookings")}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEPPER
 * ══════════════════════════════════════════════════════════════════ */
function Stepper({ current, hasResult, onStepClick }: {
  current: BookingStep;
  hasResult: boolean;
  onStepClick: (id: BookingStep) => void;
}) {
  const steps: { id: BookingStep; label: string }[] = [
    { id: "details",      label: "Details"      },
    { id: "schedule",     label: "Schedule"     },
    { id: "confirmation", label: "Confirmation" },
  ];
  const idx = steps.findIndex(s => s.id === current);
  // Once the booking has succeeded (hasResult), all 3 steps stay
  // permanently ✓ green even if the user navigates back to review.
  const allDone = hasResult;
  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white px-2 sm:px-4 py-3">
      <div className="flex items-center justify-between gap-1 sm:gap-2">
        {steps.map((s, i) => {
          const isDone    = allDone || i < idx;
          const isCurrent = !allDone && i === idx;
          const reachable =
            s.id === "details" ||
            (s.id === "schedule"     && hasResult) ||
            (s.id === "confirmation" && hasResult);
          return (
            <div key={s.id} className="flex items-center gap-1 sm:gap-2 min-w-0 shrink">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onStepClick(s.id)}
                className={`flex items-center gap-1.5 sm:gap-2 rounded-lg px-1 py-0.5 -mx-1 transition-colors min-w-0 ${
                  reachable ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                }`}
              >
                <div className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isDone    ? "bg-emerald-500 text-white"
                  : isCurrent ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                              : "bg-gray-100 text-gray-400"
                }`}>{isDone ? "✓" : i + 1}</div>
                <p className={`text-xs sm:text-sm font-semibold truncate ${isDone || isCurrent ? "text-gray-900" : "text-gray-500"}`}>
                  {s.label}
                </p>
              </button>
              {i < steps.length - 1 && (
                <div className={`h-0.5 flex-1 min-w-[12px] ${isDone ? "bg-emerald-500" : "bg-gray-200"}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEP 1 — DETAILS  (no $ anywhere)
 * ══════════════════════════════════════════════════════════════════ */
function DetailsStep(props: {
  attorney: { name: string; initials: string; photo: string | null; firm: string; years: number | null; languages: string[] };
  appointmentTypes: AppointmentType[];
  typeId: string; onTypeChange: (id: string) => void;
  format: ConsultationFormat; onFormatChange: (f: ConsultationFormat) => void;
  selectedDate: Date | null; onDateChange: (d: Date) => void;
  slotsForDate: ConsultationSlot[];
  selectedSlot: ConsultationSlot | null; onSlotChange: (s: ConsultationSlot) => void;
  timezone: string;
  type: AppointmentType;
  canProceed: boolean;
  onContinue: () => void;
  onBack: () => void;
}) {
  const { attorney, appointmentTypes, typeId, onTypeChange, format, onFormatChange,
          selectedDate, onDateChange, slotsForDate, selectedSlot, onSlotChange,
          timezone, type, canProceed, onContinue, onBack } = props;

  return (
    <>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Book Your Consultation</h1>
      <p className="mt-1 text-base text-gray-600">Select appointment type, date and time.</p>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[300px_1fr]">
        {/* ── Attorney sidebar ─────────────────────────────────── */}
        <aside className="rounded-xl border border-gray-200 bg-white p-5 h-fit">
          <div className="flex items-center gap-3">
            {attorney.photo ? (
              <img src={attorney.photo} alt={attorney.name}
                   className="h-16 w-16 rounded-full object-cover ring-2 ring-indigo-200"
                   onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-lg font-bold">
                {attorney.initials}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 truncate">{attorney.name}</h3>
              {attorney.firm && <p className="text-xs text-gray-500 truncate">{attorney.firm}</p>}
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-xs text-gray-600">
            {attorney.years != null && (
              <div><dt className="inline text-gray-400">Experience: </dt>
                   <dd className="inline font-medium text-gray-800">{attorney.years}+ years</dd></div>
            )}
            {attorney.languages.length > 0 && (
              <div><dt className="inline text-gray-400">Languages: </dt>
                   <dd className="inline font-medium text-gray-800">{attorney.languages.join(", ")}</dd></div>
            )}
          </dl>

          {/* ── Session summary (NO PRICE) ─────────────────────── */}
          <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Selected session</p>
            <p className="mt-1 text-sm font-bold text-gray-900">{type.title}</p>
            <p className="text-[11px] text-gray-600">{type.duration_minutes} min · {format === "virtual" ? "Virtual" : "In-person"}</p>
          </div>
        </aside>

        {/* ── Main column ──────────────────────────────────────── */}
        <main className="space-y-6">
          {/* Type cards — no price */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold text-gray-900">1. Appointment type</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {appointmentTypes.map(item => {
                const active = typeId === item.id;
                return (
                  <button key={item.id} onClick={() => onTypeChange(item.id)}
                    className={`text-left rounded-lg border-2 p-4 transition-colors ${
                      active ? "border-indigo-500 bg-indigo-50" : "border-gray-200 bg-white hover:border-indigo-300"
                    }`}>
                    <div className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600"
                    }`}>
                      ⏱ {item.duration_minutes} min
                    </div>
                    <p className="text-sm font-bold text-gray-900">{item.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold text-gray-700">Format:</p>
              {(["virtual", "in_person"] as ConsultationFormat[]).map(f => (
                <button key={f} onClick={() => onFormatChange(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                    format === f
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      : "border border-gray-300 text-gray-700 hover:border-indigo-400"
                  }`}>
                  {f === "virtual" ? "Virtual" : "In-person"}
                </button>
              ))}
            </div>
          </section>

          {/* Date + slots */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-gray-900">2. Date &amp; time</h3>
              <p className="text-xs text-gray-500">Timezone: <span className="font-semibold text-gray-800">{timezone}</span></p>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <MiniCalendar selectedDate={selectedDate} onSelect={onDateChange} />

              <div>
                <h4 className="text-sm font-bold text-gray-900">
                  {selectedDate
                    ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                    : "Pick a date"}
                </h4>
                <p className="text-xs text-gray-500">
                  {selectedDate ? `${slotsForDate.length} slot${slotsForDate.length === 1 ? "" : "s"} available` : "\u00a0"}
                </p>
                <div className="mt-3 flex max-h-96 flex-col gap-2 overflow-y-auto pr-1">
                  {selectedDate
                    ? slotsForDate.length === 0
                      ? <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">No slots on this day. Try another date.</p>
                      : slotsForDate.map(slot => {
                          const active = selectedSlot?.id === slot.id;
                          return (
                            <button key={slot.id} onClick={() => onSlotChange(slot)}
                              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-left ${
                                active ? "border-2 border-indigo-500 bg-indigo-50" : "border border-gray-200 bg-white hover:border-indigo-300"
                              }`}>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{slot.time}</p>
                                <p className="text-[11px] text-gray-500">{slot.timezone || timezone}</p>
                              </div>
                              <span className={`h-4 w-4 rounded-full border-2 ${active ? "border-indigo-600 bg-indigo-600" : "border-gray-300 bg-white"}`} />
                            </button>
                          );
                        })
                    : <p className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">Pick a date on the left to see slots.</p>
                  }
                </div>
              </div>
            </div>
          </section>

          {/* Nav */}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button onClick={onBack} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              ← Back to attorneys
            </button>
            <button onClick={onContinue} disabled={!canProceed}
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed">
              Confirm &amp; schedule →
            </button>
          </div>
        </main>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  MINI CALENDAR — real month, navigable, disables past dates
 * ══════════════════════════════════════════════════════════════════ */
function MiniCalendar({ selectedDate, onSelect }: {
  selectedDate: Date | null;
  onSelect: (d: Date) => void;
}) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0,0,0,0); return t; }, []);
  const [view, setView] = useState<{ y: number; m: number }>({ y: today.getFullYear(), m: today.getMonth() });

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const startDow = first.getDay();
  const canGoPrev = view.y > today.getFullYear() || view.m > today.getMonth();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button disabled={!canGoPrev}
          onClick={() => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 })}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-30">‹</button>
        <h4 className="text-sm font-bold text-gray-900">{first.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
        <button onClick={() => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 })}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d => (
          <div key={d} className="py-1 text-center text-[10px] font-semibold text-gray-500">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`s${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const d = new Date(view.y, view.m, day);
          const isPast = d < today;
          const active = selectedDate ? sameDay(d, selectedDate) : false;
          const isToday = sameDay(d, today);
          return (
            <button key={day} disabled={isPast}
              onClick={() => onSelect(d)}
              className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                isPast ? "text-gray-300 cursor-not-allowed"
                : active ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                : isToday ? "border border-indigo-300 text-indigo-700"
                : "text-gray-800 hover:bg-gray-100"
              }`}>{day}</button>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  STEP 3 — CONFIRMATION  (no $ mention)
 * ══════════════════════════════════════════════════════════════════ */
function ConfirmationStep(props: {
  confirmationNo: string;
  attorneyName:   string;
  type:           AppointmentType;
  date:           Date;
  slot:           ConsultationSlot;
  timezone:       string;
  format:         ConsultationFormat;
  joinUrl:        string | null;
  isMock:         boolean;
  onBack:         () => void;
  onDone:         () => void;
}) {
  const { confirmationNo, attorneyName, type, date, slot, timezone, format, joinUrl, isMock, onBack, onDone } = props;
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-3xl">✓</div>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Booking confirmed</h1>
      <p className="mt-1 text-sm text-gray-600">Confirmation #{confirmationNo}</p>
      {isMock && (
        <p className="mt-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] text-amber-800">
          ⚠ Backend booking API not yet wired — this is a preview link.
        </p>
      )}

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 text-left">
        <Row k="Attorney" v={attorneyName} />
        <Row k="Type"     v={`${type.title} (${type.duration_minutes} min · ${format === "virtual" ? "Virtual" : "In-person"})`} />
        <Row k="When"     v={`${date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${slot.time} ${timezone}`} />
        {joinUrl && (
          <div className="mt-4 rounded-lg bg-indigo-50 border border-indigo-200 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700">Meeting link</p>
            <a href={joinUrl} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm font-semibold text-indigo-700 hover:underline">
              {joinUrl}
            </a>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
        <button onClick={onBack}
          className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
          ← Back to slot
        </button>
        <button onClick={onDone}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white cursor-pointer">
          📅 My Bookings →
        </button>
      </div>

      <p className="mt-4 text-[11px] text-gray-500">
        📩 A notification has been sent to your Notifications tab, and a confirmation email with the meeting link is on its way to you and your attorney.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 *  Small helpers
 * ══════════════════════════════════════════════════════════════════ */
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 py-2 last:border-b-0">
      <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">{k}</dt>
      <dd className="text-sm text-gray-900 font-medium">{v}</dd>
    </div>
  );
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function slotToIso(date: Date, time: string): string {
  const [hm, ampm] = time.split(" ");
  let [h, m] = hm.split(":").map(Number);
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const d = new Date(date); d.setHours(h, m ?? 0, 0, 0);
  return d.toISOString();
}