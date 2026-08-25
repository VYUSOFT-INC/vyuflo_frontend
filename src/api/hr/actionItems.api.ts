// src/api/hr/actionItems.api.ts
//
// HR-side action items (corrections the attorney sent back to HR).

import axios from '../axios';

export interface HRActionItem {
  id:               string;
  kind:             'form_correction';
  form_type:        'i9' | 'i983';
  form_id:          string;
  application_id:   string;
  case_reference:   string;
  employee_name:    string;
  requested_by:     string;
  note:             string;
  fields:           string[];
  created_at:       string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isMissing = (e: any) => !e?.response || [404, 405, 501].includes(e.response.status);

export async function listHRActionItems(): Promise<HRActionItem[]> {
  try {
    const res = await axios.get<{ items: HRActionItem[] }>('/hr/action-items', { params: { limit: 25 } });
    if (Array.isArray(res.data?.items)) return res.data.items;
  } catch (e) { if (!isMissing(e)) throw e; }
  return [];
}
