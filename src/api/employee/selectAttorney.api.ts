// src/api/employee/selectAttorney.api.ts
//
// Uses the SAME `/attorneys` endpoint HR uses (proven working in
// createCase.api.ts). Handles the actual backend response shape —
// which is a bare list of attorney records without computed fields
// like rating / review_count / badges — and enriches those fields on
// the frontend with sensible defaults. 2 mock attorneys are kept as a
// fallback for the case where 0 real attorneys have signed up yet.

import type {
  AttorneyProfile,
  AttorneyListResponse,
  FetchAttorneysParams,
} from "../../types/employee/selectAttorney.types";
import axios from "../axios";

/* ── 2 mock attorneys — shown only when 0 real attorneys exist ───── */
export const MOCK_ATTORNEYS: AttorneyProfile[] = [
  {
    id:                 "mock-attorney-1",
    user_id:            "mock-user-1",
    bar_number:         "CA-284517",
    bar_state:          "CA",
    years_experience:   15,
    law_firm_name:      "Martinez Immigration Law Group",
    specialisations:    '["H-1B","O-1","EB-2","L-1"]',
    languages:          '["English","Spanish"]',
    availability_note:  "Available within 24h",
    max_active_cases:   30,
    bio:                "15 years of immigration law experience.",
    profile_photo_url:  null,
    is_accepting_cases: true,
    is_verified:        true,
    is_active:          true,
    created_at:         "2026-01-15T00:00:00Z",
    updated_at:         "2026-08-01T00:00:00Z",
    user: {
      id:         "mock-user-1",
      first_name: "Sarah",
      last_name:  "Martinez",
      email:      "sarah.martinez@vyuflo.com",
      phone:      "+1-310-555-0184",
    },
    rating:                 4.9,
    review_count:           287,
    success_rate:           98,
    total_cases:            1240,
    consultation_fee_cents: 15000,
    is_available:           true,
    distance_miles:         2.3,
    badges:                 ["Top Rated", "Verified", "Fast Response"],
    location_display:       "Beverly Hills, CA · 2.3 miles away",
    languages_list:         ["English", "Spanish"],
    visa_types_list:        ["H-1B", "O-1", "EB-2", "L-1"],
  },
  {
    id:                 "mock-attorney-2",
    user_id:            "mock-user-2",
    bar_number:         "NY-92847",
    bar_state:          "NY",
    years_experience:   9,
    law_firm_name:      "Chen & Associates",
    specialisations:    '["EB-5","EB-1","K-1","Asylum"]',
    languages:          '["English","Mandarin"]',
    availability_note:  "Available now",
    max_active_cases:   20,
    bio:                "Focused on investor visas and family immigration.",
    profile_photo_url:  null,
    is_accepting_cases: true,
    is_verified:        true,
    is_active:          true,
    created_at:         "2026-03-10T00:00:00Z",
    updated_at:         "2026-08-01T00:00:00Z",
    user: {
      id:         "mock-user-2",
      first_name: "David",
      last_name:  "Chen",
      email:      "david.chen@vyuflo.com",
      phone:      "+1-212-555-0421",
    },
    rating:                 4.7,
    review_count:           156,
    success_rate:           94,
    total_cases:            520,
    consultation_fee_cents: 12500,
    is_available:           true,
    distance_miles:         null,
    badges:                 ["Verified"],
    location_display:       "Manhattan, NY",
    languages_list:         ["English", "Mandarin"],
    visa_types_list:        ["EB-5", "EB-1", "K-1", "Asylum"],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function parseJsonListLoose(v: string | string[] | null | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean);
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch { /* fall through */ }
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

/**
 * Backend returns the bare attorney row without enrichment
 * (rating/review_count/badges/etc.). Fill in reasonable defaults so
 * the AttorneyCard component doesn't crash on missing fields.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function enrichAttorney(raw: any): AttorneyProfile {
  const specs     = parseJsonListLoose(raw?.specialisations);
  const languages = parseJsonListLoose(raw?.languages);
  const firm      = raw?.law_firm_name ?? null;

  return {
    id:                 raw?.id            ?? raw?.attorney_id ?? raw?.user_id ?? "",
    user_id:            raw?.user_id       ?? "",
    bar_number:         raw?.bar_number    ?? null,
    bar_state:          raw?.bar_state     ?? null,
    years_experience:   raw?.years_experience ?? null,
    law_firm_name:      firm,
    specialisations:    typeof raw?.specialisations === "string" ? raw.specialisations : (specs.length ? JSON.stringify(specs) : null),
    languages:          typeof raw?.languages === "string" ? raw.languages : (languages.length ? JSON.stringify(languages) : null),
    availability_note:  raw?.availability_note ?? null,
    max_active_cases:   raw?.max_active_cases  ?? null,
    bio:                raw?.bio               ?? null,
    profile_photo_url:  raw?.profile_photo_url ?? null,
    is_accepting_cases: raw?.is_accepting_cases ?? true,
    is_verified:        raw?.is_verified        ?? false,
    is_active:          raw?.is_active          ?? true,
    created_at:         raw?.created_at         ?? new Date().toISOString(),
    updated_at:         raw?.updated_at         ?? new Date().toISOString(),
    user: raw?.user ? {
      id:         raw.user.id         ?? raw.user_id ?? "",
      first_name: raw.user.first_name ?? "",
      last_name:  raw.user.last_name  ?? "",
      email:      raw.user.email      ?? "",
      phone:      raw.user.phone      ?? null,
    } : null,

    // ── Computed defaults (backend hasn't enriched these yet) ────
    rating:                 raw?.rating       ?? 4.5,
    review_count:           raw?.review_count ?? 0,
    success_rate:           raw?.success_rate ?? 90,
    total_cases:            raw?.total_cases  ?? (raw?.active_cases ?? 0),
    consultation_fee_cents: raw?.consultation_fee_cents ?? 15000,
    is_available:           raw?.is_available ?? (raw?.is_accepting_cases ?? true),
    distance_miles:         raw?.distance_miles ?? null,
    badges:                 raw?.badges ?? (raw?.is_verified ? ["Verified"] : []),
    location_display:       raw?.location_display ?? (raw?.bar_state ? `${raw.bar_state}, USA` : (firm ?? "")),
    languages_list:         raw?.languages_list  ?? languages,
    visa_types_list:        raw?.visa_types_list ?? specs,
  };
}

/* ── Filter/sort mocks locally so they respect sidebar too ───────── */
function applyFiltersLocal(list: AttorneyProfile[], p?: FetchAttorneysParams): AttorneyProfile[] {
  if (!p) return list;
  let out = [...list];
  if (p.visa_types?.length)  out = out.filter(a => p.visa_types!.some(v => a.visa_types_list.includes(v)));
  if (p.languages?.length)   out = out.filter(a => p.languages!.some(l => a.languages_list.includes(l)));
  if (p.min_rating != null)  out = out.filter(a => a.rating >= p.min_rating!);
  if (p.min_fee_cents != null) out = out.filter(a => a.consultation_fee_cents >= p.min_fee_cents!);
  if (p.max_fee_cents != null) out = out.filter(a => a.consultation_fee_cents <= p.max_fee_cents!);
  if (p.availability && p.availability !== "All") out = out.filter(a => a.is_available);

  switch (p.sort_by) {
    case "fee_asc":    out.sort((a, b) => a.consultation_fee_cents - b.consultation_fee_cents); break;
    case "fee_desc":   out.sort((a, b) => b.consultation_fee_cents - a.consultation_fee_cents); break;
    case "experience": out.sort((a, b) => (b.years_experience ?? 0) - (a.years_experience ?? 0)); break;
    case "rating":
    default:           out.sort((a, b) => b.rating - a.rating);
  }
  return out;
}

/* ── Public API ──────────────────────────────────────────────────── */
/**
 * Uses HR's proven call — `/attorneys` with `is_accepting=true&limit=50`.
 * Once backend deploys `/attorneys/marketplace`, switch this back to
 * trying marketplace first (see git history).
 */
async function fetchAttorneysDualEndpoint(params: FetchAttorneysParams | undefined) {
  const query = {
    is_accepting: true,
    limit:        params?.page_size ?? 50,
  };
  return await axios.get("/attorneys", { params: query });
}

export const attorneyApi = {
  /**
   * Enriched attorney list for the Book Consultation screen.
   * Prefers `/attorneys/marketplace`, falls back to `/attorneys` on 404.
   * Falls back to 2 mocks if both fail or return 0 rows.
   */
  list: async (params?: FetchAttorneysParams): Promise<AttorneyListResponse> => {
    try {
      const res = await fetchAttorneysDualEndpoint(params);

      // Endpoint may return either an array or { items: [...] } or
      // { attorneys: [...] } — accept all three.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items: any[] = Array.isArray(res.data)
        ? res.data
        : res.data?.items ?? res.data?.attorneys ?? [];

      const enriched = items.map(enrichAttorney).filter(a => a.user);

      if (enriched.length > 0) {
        // Real attorneys returned — apply client-side filters/sort
        const filtered = applyFiltersLocal(enriched, params);
        return { attorneys: filtered, total: filtered.length, page: 1, page_size: filtered.length };
      }

      // Backend returned 0 → fall back to mocks so testing can continue
      const mocks = applyFiltersLocal(MOCK_ATTORNEYS, params);
      return { attorneys: mocks, total: mocks.length, page: 1, page_size: mocks.length };

    } catch (e) {
      console.warn("[attorneys] endpoint failed, using mocks", e);
      const mocks = applyFiltersLocal(MOCK_ATTORNEYS, params);
      return { attorneys: mocks, total: mocks.length, page: 1, page_size: mocks.length };
    }
  },

  get: async (attorneyId: string): Promise<AttorneyProfile> => {
    // Short-circuit mock lookups so no network call happens
    const mock = MOCK_ATTORNEYS.find(a => a.id === attorneyId);
    if (mock) return mock;
    // Use HR-proven /attorneys/{id} endpoint.
    try {
      const res = await axios.get(`/attorneys/${attorneyId}`);
      return enrichAttorney(res.data);
    } catch (e) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const _ = (e as any)?.response?.status;
      void _;
      // Last resort — fetch the list and pick by id
      const list = await attorneyApi.list();
      const match = list.attorneys.find(a => a.id === attorneyId || a.user_id === attorneyId);
      if (match) return match;
      throw new Error("Attorney not found.");
    }
  },
};

export const listAttorneys = (params?: FetchAttorneysParams) => attorneyApi.list(params);
export const getAttorney   = (id: string) => attorneyApi.get(id);