// src/lib/lawyerLocalCases.ts
//
// Small localStorage-backed store for cases the lawyer creates on the
// New Case wizard. Backend doesn't yet return them via the worklist
// endpoint, so we keep them locally and merge into the Cases list.
// Once backend implements `POST /lawyer/cases` + returns them in
// `/lawyer/applications`, this can be removed (or used as offline cache).

import type { CaseListItem } from "../types/lawyer/cases.types";
import type { AssignedApplication } from "../types/lawyer/intake.types";

const KEY = "vyuflo:lawyer:local-cases:v1";

export interface LocalCaseSeed {
  id:              string;
  case_reference:  string;
  client_user_id:  string;
  client_name:     string;
  client_email:    string;
  visa_type_code:  string;
  visa_type_label: string;
  case_name:       string;
  target_date?:    string;
  priority:        string;
  created_at:      string;
}

/** Read all locally-created cases. Safe on SSR / missing storage. */
export function readLocalCases(): LocalCaseSeed[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Append a new locally-created case. */
export function appendLocalCase(seed: LocalCaseSeed): void {
  try {
    const list = readLocalCases();
    // De-dupe by id
    const next = [seed, ...list.filter((c) => c.id !== seed.id)];
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota / private-mode failures */
  }
}

/** Delete a locally-created case (used after backend picks it up). */
export function removeLocalCase(id: string): void {
  try {
    const list = readLocalCases();
    localStorage.setItem(KEY, JSON.stringify(list.filter((c) => c.id !== id)));
  } catch {
    /* ignore */
  }
}

/** Convert a stored seed into the CaseListItem shape used by the Cases table. */
export function seedToListItem(seed: LocalCaseSeed): CaseListItem {
  return {
    id:                       seed.id,
    case_reference:           seed.case_reference,
    client_id:                seed.client_user_id,
    client_name:              seed.client_name,
    client_email:             seed.client_email,
    client_avatar_url:        null,
    employer_name:            null,
    visa_type_code:           seed.visa_type_code,
    status:                   "in_progress",
    status_label:             "Intake In Progress",
    urgency:                  seed.priority === "premium" ? "critical" : seed.priority === "urgent" ? "high" : "medium",
    days_to_next_deadline:    null,
    next_deadline_label:      seed.target_date ? `Target ${new Date(seed.target_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : null,
    action_required:          true,
    has_alert:                false,
    assigned_attorney_id:     "me",
    assigned_attorney_name:   "You",
    filing_date:              null,
    created_at:               seed.created_at,
    updated_at:               seed.created_at,
  } as CaseListItem;
}

/** Convert a stored seed into the AssignedApplication shape used by
 *  the Client Intake page (`/lawyer/intake`). */
export function seedToAssignedApp(seed: LocalCaseSeed): AssignedApplication {
  return {
    application_id:    seed.id,
    client_id:         seed.client_user_id,
    user_id:           seed.client_user_id,
    client_name:       seed.client_name,
    client_email:      seed.client_email,
    visa_type:         seed.visa_type_code,
    visa_type_label:   seed.visa_type_label,
    status:            "intake_in_progress",
    intake_session_id: null,
    intake_step:       null,
    assigned_at:       seed.created_at,
    hr_reviewed_by:    null,
  };
}