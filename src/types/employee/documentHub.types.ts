// src/types/documentHub.types.ts

export type DocFileType = "pdf" | "docx" | "img" | "other";
export type DocStatus   = "verified" | "pending_review" | "uploaded" | "rejected" | "required" | "missing";

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
  in_use?:           boolean;   // ← ADD — true if reused elsewhere or confirmed on a completed task
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