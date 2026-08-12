// src/pages/employee/MyBookingsPage.tsx
//
// Employee's list of consultation bookings. Split into Upcoming + Past.
// Data source: listMyBookings() — merges backend + localStorage fallback.
// Route: /consultations/my-bookings

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listMyBookings } from "../../api/employee/bookConsultation.api";
import type { MyBookingRecord } from "../../types/employee/bookConsultation.types";

/* ══════════════════════════════════════════════════════════════════ */
export default function MyBookingsPage() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBookingRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const data = await listMyBookings();
      if (!cancelled) setBookings(data);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const now = Date.now();
  const { upcoming, past } = useMemo(() => {
    const up: MyBookingRecord[] = [];
    const pa: MyBookingRecord[] = [];
    for (const b of bookings) {
      const start = new Date(b.scheduled_start_iso).getTime();
      const end   = start + b.duration_minutes * 60000;
      if (end >= now && b.status !== "cancelled") up.push(b);
      else pa.push(b);
    }
    up.sort((a, b) => new Date(a.scheduled_start_iso).getTime() - new Date(b.scheduled_start_iso).getTime());
    pa.sort((a, b) => new Date(b.scheduled_start_iso).getTime() - new Date(a.scheduled_start_iso).getTime());
    return { upcoming: up, past: pa };
  }, [bookings, now]);

  const activeList = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto max-w-[1000px] px-6 pt-3 pb-24">
      {/* Breadcrumb + heading */}
      <button onClick={() => navigate("/consultations")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline cursor-pointer">
        ← Back to attorneys
      </button>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Bookings</h1>
          <p className="mt-1 text-sm text-gray-600">Consultations you've booked with attorneys.</p>
        </div>
        <button onClick={() => navigate("/consultations")}
          className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-bold text-white cursor-pointer">
          + Book new
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-gray-200">
        <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")} label="Upcoming" count={upcoming.length} />
        <TabButton active={tab === "past"}     onClick={() => setTab("past")}     label="Past"     count={past.length} />
      </div>

      {/* List */}
      <div className="mt-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-gray-500 py-12">Loading your bookings…</p>
        ) : activeList.length === 0 ? (
          <EmptyState tab={tab} onBook={() => navigate("/consultations")} />
        ) : (
          activeList.map(b => <BookingCard key={b.id} booking={b} isPast={tab === "past"} />)
        )}
      </div>
    </div>
  );
}

/* ── Tab pill ─────────────────────────────────────────────────────── */
function TabButton({ active, onClick, label, count }: {
  active: boolean; onClick: () => void; label: string; count: number;
}) {
  return (
    <button onClick={onClick}
      className={`relative px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
        active ? "text-indigo-700" : "text-gray-500 hover:text-gray-800"
      }`}>
      <span>{label}</span>
      <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
        active ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"
      }`}>{count}</span>
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-indigo-600 rounded-full" />}
    </button>
  );
}

/* ── Booking card ─────────────────────────────────────────────────── */
function BookingCard({ booking, isPast }: { booking: MyBookingRecord; isPast: boolean }) {
  const start = new Date(booking.scheduled_start_iso);
  const dateLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const timeLabel = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const initials = booking.attorney_name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "A";

  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isPast ? "border-gray-200 bg-gray-50/50" : "border-gray-200 bg-white hover:shadow-sm"
    }`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Avatar */}
        {booking.attorney_photo_url ? (
          <img src={booking.attorney_photo_url} alt={booking.attorney_name}
               className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
               onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white text-base font-bold shadow-sm ${
            isPast ? "bg-gradient-to-br from-gray-400 to-gray-500" : "bg-gradient-to-br from-indigo-500 to-purple-600"
          }`}>
            {initials}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 truncate">{booking.attorney_name}, Esq.</h3>
              {booking.attorney_firm && <p className="text-xs text-gray-500">{booking.attorney_firm}</p>}
            </div>
            <StatusPill status={booking.status} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2 text-xs">
            <Info k="📅" v={dateLabel} />
            <Info k="⏰" v={`${timeLabel} · ${booking.timezone}`} />
            <Info k="⏱" v={`${booking.appointment_type} (${booking.duration_minutes} min)`} />
            <Info k={booking.consultation_format === "virtual" ? "💻" : "📍"} v={booking.consultation_format === "virtual" ? "Virtual" : "In-person"} />
          </div>

          <p className="mt-3 text-[10px] text-gray-400 font-mono">#{booking.confirmation_no}</p>

          {/* Meeting link for upcoming */}
          {!isPast && booking.zoho_join_url && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a href={booking.zoho_join_url} target="_blank" rel="noreferrer"
                 className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-bold text-white cursor-pointer">
                🎥 Join meeting →
              </a>
              <button onClick={() => navigator.clipboard.writeText(booking.zoho_join_url!)}
                className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer">
                Copy link
              </button>
              {booking.is_mock && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  Preview link
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <p className="flex items-start gap-1.5 text-gray-700">
      <span className="text-gray-400">{k}</span>
      <span>{v}</span>
    </p>
  );
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    completed: "bg-gray-100 text-gray-700 ring-gray-200",
    cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
    pending:   "bg-amber-50 text-amber-700 ring-amber-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${cfg[status] ?? "bg-gray-100 text-gray-700 ring-gray-200"}`}>
      {status}
    </span>
  );
}

function EmptyState({ tab, onBook }: { tab: "upcoming" | "past"; onBook: () => void }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-gray-300 bg-white p-10 text-center">
      <p className="text-2xl">📅</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">
        {tab === "upcoming" ? "No upcoming consultations" : "No past consultations"}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        {tab === "upcoming"
          ? "Book a consultation with an attorney to get started."
          : "Your completed and cancelled bookings will appear here."}
      </p>
      {tab === "upcoming" && (
        <button onClick={onBook}
          className="mt-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2 text-sm font-bold text-white cursor-pointer">
          Find an attorney
        </button>
      )}
    </div>
  );
}