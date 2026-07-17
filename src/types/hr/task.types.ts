// src/types/hr/hrTask.types.ts

export type HRTaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface HRTaskResponse {
  id:             string;
  application_id: string;
  task_name:      string;
  description:    string | null;
  is_required:    boolean;
  is_completed:   boolean;
  sort_order:     number;
  priority:       HRTaskPriority;
  completed_at:   string | null;
  completed_by:   string | null;
  created_at:     string;
  updated_at:     string;
  document_id:          string | null;
  document_name:        string | null;
  document_size_bytes:  number | null;
  document_uploaded_at: string | null;
}

export interface HRTaskCreateRequest {
  task_name:   string;
  description?: string;
  is_required:  boolean;
  sort_order:   number;
  priority:     HRTaskPriority;
}

export interface HRTaskUpdateRequest {
  task_name?:   string;
  description?: string;
  is_required?: boolean;
  sort_order?:  number;
  priority?:    HRTaskPriority;
}

export interface HRTaskCompleteRequest {
  is_completed: boolean;
  document_id?: string;
}
