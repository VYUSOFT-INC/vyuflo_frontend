// src/pages/employee/AttorneyDetail.tsx
//
// Attorney Detail page — shows all signup-provided fields for a lawyer.
// Empty fields are hidden. "Send Consultation" → same booking page.
//
// Route: /consultations/attorney/:attorneyId

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getAttorney } from "../../api/employee/selectAttorney.api";
import type { AttorneyProfile } from "../../types/employee/selectAttorney.types";

const AVATAR_COLORS = [
  "#4F46E5", "#0891B2", "#7C3AED", "#DB2777",
  "#059669", "#D97706", "#DC2626", "#2563EB",
];
function colorFrom(id: string): string {
  const idx = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[idx % AVATAR_COLORS.length];
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l1.39 2.82L10.5 4.27l-2.25 2.19.53 3.09L6 8.02l-2.78 1.53.53-3.09L1.5 4.27l3.11-.45L6 1z"
            fill={filled ? "#FBBF24" : "#E5E7EB"} />
    </svg>
  );
}

export default function AttorneyDetail() {
  const { attorneyId = "" } = useParams<{ attorneyId: string }>();
  const navigate = useNavigate();

  const [attorney, setAttorney] = useState<AttorneyProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!attorneyId) { setError("Missing attorney ID."); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const data = await getAttorney(attorneyId);
        if (!cancelled) setAttorney(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load attorney.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [attorneyId]);

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-sm text-gray-500">Loading attorney details…</div>;
  }
  if (error || !attorney) {
    return (
      <div className="mx-auto max-w-md p-8">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          {error ?? "Attorney not found."}
        </div>
        <button onClick={() => navigate("/consultations")}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          ← Back to attorneys
        </button>
      </div>
    );
  }

  const firstName = attorney.user?.first_name ?? "";
  const lastName  = attorney.user?.last_name  ?? "";
  const fullName  = `${firstName} ${lastName}`.trim();
  const initials  = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "?";
  const avatarBg  = colorFrom(attorney.id);

  const hasBadges     = attorney.badges?.length > 0;
  const hasLanguages  = attorney.languages_list?.length > 0;
  const hasVisaTypes  = attorney.visa_types_list?.length > 0;
  const hasBio        = !!attorney.bio?.trim();
  const hasLocation   = !!attorney.location_display?.trim();
  const hasLawFirm    = !!attorney.law_firm_name?.trim();
  const hasBarNumber  = !!attorney.bar_number?.trim();
  const hasBarState   = !!attorney.bar_state?.trim();
  const hasExperience = attorney.years_experience != null;
  const hasAvailNote  = !!attorney.availability_note?.trim();

  const canBook = attorney.is_accepting_cases && attorney.is_available;

  return (
    <div className="mx-auto max-w-[900px] px-6 pt-3 pb-24">
      {/* Breadcrumb */}
      <button onClick={() => navigate("/consultations")}
        className="mb-4 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline">
        ← Back to attorneys
      </button>

      {/* Hero */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {attorney.profile_photo_url ? (
            <img src={attorney.profile_photo_url} alt={fullName}
                 className="h-24 w-24 shrink-0 rounded-full object-cover ring-2 ring-indigo-200"
                 onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white"
                 style={{ backgroundColor: avatarBg }}>
              {initials}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{fullName || "Attorney"}, Esq.</h1>
              {attorney.is_verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  ✓ Verified
                </span>
              )}
            </div>
            {hasLawFirm && <p className="mt-1 text-sm text-gray-600">{attorney.law_firm_name}</p>}
            {hasLocation && <p className="mt-0.5 text-xs text-gray-500">📍 {attorney.location_display}</p>}

            {/* Rating + reviews */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <StarIcon key={i} filled={i <= Math.round(attorney.rating)} />)}
                <span className="ml-1 font-bold text-gray-900">{attorney.rating.toFixed(1)}</span>
                <span className="text-gray-500">({attorney.review_count} reviews)</span>
              </div>
            </div>

            {/* Badges */}
            {hasBadges && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {attorney.badges.map(b => (
                  <span key={b} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-gray-200 bg-gray-200">
        <Stat label="Success Rate" value={`${attorney.success_rate}%`} color="text-emerald-600" />
        <Stat label="Experience"   value={hasExperience ? `${attorney.years_experience} Yrs` : "—"} color="text-indigo-600" />
        <Stat label="Cases handled" value={attorney.total_cases >= 1000 ? `${(attorney.total_cases/1000).toFixed(1)}k+` : `${attorney.total_cases}+`} color="text-gray-900" />
      </div>

      {/* About */}
      {hasBio && (
        <Section title="About">
          <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">{attorney.bio}</p>
        </Section>
      )}

      {/* Practice areas */}
      {hasVisaTypes && (
        <Section title="Practice areas">
          <div className="flex flex-wrap gap-1.5">
            {attorney.visa_types_list.map(v => (
              <span key={v} className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                {v}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Languages */}
      {hasLanguages && (
        <Section title="Languages spoken">
          <p className="text-sm text-gray-800">{attorney.languages_list.join(" · ")}</p>
        </Section>
      )}

      {/* Credentials */}
      {(hasBarNumber || hasBarState) && (
        <Section title="Bar credentials">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hasBarState  && <Kv label="Bar state"  v={attorney.bar_state!} />}
            {hasBarNumber && <Kv label="Bar number" v={attorney.bar_number!} />}
          </dl>
        </Section>
      )}

      {/* Contact */}
      {(attorney.user?.email || attorney.user?.phone) && (
        <Section title="Contact">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {attorney.user?.email && <Kv label="Email" v={attorney.user.email} />}
            {attorney.user?.phone && <Kv label="Phone" v={attorney.user.phone} />}
          </dl>
        </Section>
      )}

      {/* Availability note */}
      {hasAvailNote && (
        <Section title="Availability">
          <p className="text-sm text-gray-800">{attorney.availability_note}</p>
        </Section>
      )}

      {/* Sticky CTA */}
      <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">Ready to book with {firstName}?</p>
            <p className="text-xs text-gray-600">Pick a date &amp; time on the next screen.</p>
          </div>
          <button
            onClick={() => navigate(`/consultations/book/${attorney.id}`)}
            disabled={!canBook}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canBook ? "Send Consultation →" : "Not accepting cases"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Small helpers ────────────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white p-4 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
function Kv({ label, v }: { label: string; v: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900 font-medium break-words">{v}</dd>
    </div>
  );
}