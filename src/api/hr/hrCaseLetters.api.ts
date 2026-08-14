// src/api/hr/hrCaseLetters.api.ts
//
// HR-side Generated Letters — Screen 10 Generated Letters tab.
// Backend: app/routes/hr/hr_case_letters_routes.py
//
// Endpoints:
//   GET   /api/v1/hr/cases/{application_id}/letters
//   POST  /api/v1/hr/cases/{application_id}/letters/{letter_id}/sign
//   GET   /api/v1/hr/cases/{application_id}/letters/{letter_id}/pdf

import axios from '../axios';

export type LetterType =
  | 'offer'
  | 'support'
  | 'employment_verification'
  | 'lca_posting'
  | 'other';

export type LetterStatus =
  | 'draft'
  | 'pending_hr_signature'
  | 'signed'
  | 'sent'
  | 'filed';

export interface GeneratedLetter {
  id:           string;
  name:         string;
  letter_type:  LetterType;
  generated_by: string;      // attorney's full name
  generated_at: string;      // ISO datetime
  status:       LetterStatus;
  file_url:     string | null;
}

export const hrCaseLettersApi = {
  /** GET all letters generated for the given case. */
  list: async (applicationId: string): Promise<GeneratedLetter[]> => {
    const res = await axios.get<GeneratedLetter[]>(
      `/hr/cases/${applicationId}/letters`,
    );
    return Array.isArray(res.data) ? res.data : [];
  },

  /** POST — HR signs a letter that's in 'pending_hr_signature' state. */
  sign: async (applicationId: string, letterId: string): Promise<GeneratedLetter> => {
    const res = await axios.post<GeneratedLetter>(
      `/hr/cases/${applicationId}/letters/${letterId}/sign`,
      {},
    );
    return res.data;
  },

  /** GET — download the letter as a PDF blob. */
  downloadPdf: async (
    applicationId: string,
    letterId:      string,
  ): Promise<{ blob: Blob; fileName: string }> => {
    const res = await axios.get(
      `/hr/cases/${applicationId}/letters/${letterId}/pdf`,
      { responseType: 'blob' },
    );
    // Try to pull filename from Content-Disposition; fall back to letterId.
    const cd = res.headers?.['content-disposition'] ?? '';
    const match = /filename="?([^"]+)"?/i.exec(cd);
    return {
      blob:     res.data as Blob,
      fileName: match?.[1] ?? `letter-${letterId}.pdf`,
    };
  },
};
