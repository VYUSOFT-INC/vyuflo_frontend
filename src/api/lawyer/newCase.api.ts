// src/api/lawyer/newCase.api.ts
//
// Frontend calls for the New Case wizard.
// Uses mocks when backend endpoints are missing so the flow is fully
// testable before backend deploys.

import axios from "../axios";
import { visaChecklistApi, type BackendVisaType } from "../../api/employee/visaChecklist.api";
import type {
  ConsultedClient,
  NewCaseCreateRequest,
  NewCaseCreateResponse,
  VisaTypeOption,
} from "../../types/lawyer/newCase.types";
import { DEFAULT_VISA_TYPES } from "../../types/lawyer/newCase.types";

/** Categorise a backend visa code into one of the 4 wizard tabs. */
function categoriseVisa(code: string): VisaTypeOption["category"] {
  const c = code.toUpperCase();
  if (["H-1B","L-1A","L-1B","O-1","TN","E-2","E-3","P-1","R-1","EB-1","EB-2","EB-3","EB-5"].includes(c)) return "work";
  if (["F-1","M-1","J-1"].includes(c))                                    return "student";
  if (["H-4","L-2","F-2","J-2"].includes(c))                              return "dependent";
  return "other";
}

/**
 * Map a backend `category` string to one of our 4 wizard tabs.
 * Backend uses: employment | student | visitor | permanent_resident |
 * exchange | dependent | (others). Ours: work | student | dependent | other.
 */
function mapBackendCategory(raw: string | undefined | null, code: string): VisaTypeOption["category"] {
  const c = (raw ?? "").toLowerCase();
  if (c === "employment" || c === "work")             return "work";
  if (c === "student")                                 return "student";
  if (c === "dependent")                               return "dependent";
  if (c === "exchange" || c === "visitor" || c === "permanent_resident" || c === "family" || c === "humanitarian" || c === "other") return "other";
  // Category missing / unknown → fall back to code-based inference
  return categoriseVisa(code);
}

/** Icon lookup by code — uses DEFAULT_VISA_TYPES preset first, then falls back. */
function iconForCode(code: string): string {
  return DEFAULT_VISA_TYPES.find((d) => d.code === code.toUpperCase())?.icon ?? "📄";
}

/**
 * Adapt a backend visa-type row into the wizard's `VisaTypeOption` shape.
 */
function adaptBackendVisa(v: BackendVisaType): VisaTypeOption {
  const code = v.code ?? v.name ?? "";
  const preset = DEFAULT_VISA_TYPES.find((d) => d.code === code.toUpperCase());
  return {
    id:          v.id ?? code,
    code,
    name:        v.short_label || v.name || code,
    description: v.description || preset?.description || "",
    category:    mapBackendCategory(v.category, code),
    duration:    v.processing_time_label
                  ?? (typeof v.typical_processing_days === "number" ? `${v.typical_processing_days} days` : preset?.duration ?? "—"),
    doc_count:   v.required_documents_count ?? (Array.isArray(v.required_documents) ? v.required_documents.length : 0) ?? preset?.doc_count ?? 0,
    icon:        iconForCode(code),
  };
}

/**
 * Load visa types from backend. Uses the SAME catalog helper the Visa
 * Checklist screen uses (which internally tries /visa-types then
 * /admin/visa-types), so anything the Admin console adds shows up here
 * automatically. Falls back to the local default catalog on error / empty.
 */
export async function listVisaTypesForWizard(): Promise<VisaTypeOption[]> {
  try {
    const items = await visaChecklistApi.listVisaTypes();
    if (!items.length) return DEFAULT_VISA_TYPES;
    // Only surface active visa types.
    return items
      .filter((v) => v.is_active !== false)
      .map(adaptBackendVisa);
  } catch {
    return DEFAULT_VISA_TYPES;
  }
}

/** 2 mock consulted clients so the wizard is usable before backend adds
 *  the attorney-side filter on /consultations/bookings (or the dedicated
 *  /lawyer/consulted-clients endpoint from the backend spec doc). */
const MOCK_CONSULTED_CLIENTS: ConsultedClient[] = [
  {
    user_id:            "mock-client-1",
    full_name:          "gowtham laveti",
    email:              "gowtham.laveti@example.com",
    last_consulted_iso: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    visa_hint:          "H-1B",
  },
  {
    user_id:            "mock-client-2",
    full_name:          "Ravi Kumar",
    email:              "ravi.kumar@example.com",
    last_consulted_iso: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    visa_hint:          "L-1B",
  },
];

/**
 * Attorney's consulted clients. Tries backend first (multiple param
 * shapes since the endpoint contract isn't finalised); falls back to
 * mock clients when 0 real bookings resolve, so the wizard is fully
 * testable end-to-end.
 */
export async function listConsultedClients(): Promise<ConsultedClient[]> {
  const parse = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: any[],
  ): ConsultedClient[] => {
    const byUser = new Map<string, ConsultedClient>();
    for (const b of items) {
      const client = b.client ?? b.employee ?? b.user ?? {};
      const uid = client.id ?? client.user_id ?? b.client_user_id ?? b.employee_id;
      if (!uid || byUser.has(uid)) continue;
      byUser.set(uid, {
        user_id:            uid,
        full_name:          `${client.first_name ?? ""} ${client.last_name ?? ""}`.trim() || client.name || "Client",
        email:              client.email ?? "",
        last_consulted_iso: b.scheduled_start_iso ?? b.created_at,
        visa_hint:          b.visa_hint ?? undefined,
      });
    }
    return Array.from(byUser.values());
  };

  // Try the dedicated new endpoint first (spec'd in BACKEND_LAWYER_NEW_CASE_WIZARD.md)
  try {
    const res = await axios.get("/lawyer/consulted-clients");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr: any[] = Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    if (arr.length) return arr as ConsultedClient[];
  } catch { /* fall through */ }

  // Fallback — pull attorney's bookings
  try {
    const res = await axios.get("/consultations/bookings", {
      params: { role: "attorney", limit: 100 },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = Array.isArray(res.data) ? res.data
      : res.data?.items ?? res.data?.bookings ?? [];
    const parsed = parse(items);
    if (parsed.length) return parsed;
  } catch { /* fall through */ }

  // No real data yet → return mocks so the wizard is testable
  return MOCK_CONSULTED_CLIENTS;
}

/** POST /lawyer/cases — create a case. Mocks a success on 404/501. */
export async function createNewCase(body: NewCaseCreateRequest): Promise<NewCaseCreateResponse> {
  try {
    const res = await axios.post<NewCaseCreateResponse>("/lawyer/cases", body);
    return res.data;
  } catch (e) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (e as any)?.response?.status;
    if (status && status !== 404 && status !== 501) throw e;

    // Mock success — backend not yet wired
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return {
      id:          `mock-case-${Date.now()}`,
      case_number: `#VF-${year}-${rand}`,
      status:      "in_progress",
      created_at:  new Date().toISOString(),
      message:     "Case created (mock — backend endpoint not yet wired).",
    };
  }
}