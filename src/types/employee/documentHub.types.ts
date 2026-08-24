// src/types/documentHub.types.ts

// FIXED: added "superseded" — set on a document's old version once it's
// been replaced via reupload_expired_document(), whether the replacement
// happened before or after actual expiry.
export type DocStatus =
  | "verified"
  | "pending_review"
  | "uploaded"
  | "rejected"
  | "required"
  | "missing"
  | "expired"
  | "pending_hr_release"
  | "superseded";

export type DocFileType = "pdf" | "docx" | "img" | "other";

export interface HubDocument {
  id:                string;
  name:              string;
  file_type:         DocFileType;
  status:            DocStatus;
  document_type:     string;
  category:          string;
  application_name?: string;
  application_id?:   string;
  file_size_bytes:   number;
  uploaded_at:       string;
  verified_at?:      string;
  in_use?:           boolean;
  // NEW — set on a replacement document while its predecessor is still
  // valid; the daily activate_pending_document_replacements() job clears
  // this and hands off to the new document once the old one's expiry
  // arrives. Non-null means "this is the newer version, not yet officially
  // current — the old one is still your active document until this date."
  activates_on?:     string;
  // NEW — already returned by the backend's DocumentResponse (version: int)
  // but never surfaced here. Lets the Hub show "v1"/"v2" directly on each
  // card, and lets the "Older Version" label say exactly what it's an
  // older version OF, instead of a bare, contextless badge.
  version?:          number;
}

export interface RequirementItem {
  id:           string;
  task_name:    string;
  status:       DocStatus;
  document_id?: string;
}

export interface HubRequirements {
  application_id: string;
  visa_code:      string;
  done:           number;
  total:          number;
  items:          RequirementItem[];
}

export interface ApplicationTab {
  id:        string;
  label:     string;
  visa_code: string;
  status:    string;
}

export interface ActivityItem {
  id:        string;
  text:      string;
  by:        string;
  timestamp: string;
}

export interface StorageInfo {
  used_mb:  number;
  total_mb: number;
}

export interface DocumentHubData {
  documents:       HubDocument[];
  requirements:    HubRequirements | null;
  activity:        ActivityItem[];
  storage:         StorageInfo;
  total:           number;
  applicationTabs: ApplicationTab[];
} 