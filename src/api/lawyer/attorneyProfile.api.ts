// src/api/lawyer/attorneyProfile.api.ts

import axios from "../axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AttorneyProfile {
  id: string;
  user_id: string;
  bar_number: string | null;
  bar_state: string | null;
  years_experience: number | null;
  law_firm_name: string | null;
  firm_id: string | null;
  specialisations: string | null;
  languages: string | null;
  availability_note: string | null;
  max_active_cases: number | null;
  bio: string | null;
  profile_photo_url: string | null;
  is_accepting_cases: boolean;
  is_verified: boolean;
  is_active: boolean;
  hourly_rate_cents: number | null;
  monthly_billing_target_cents: number | null;
}

export type AttorneyProfileUpdateBody = Partial<
  Pick<
    AttorneyProfile,
    | "bar_number" | "bar_state" | "years_experience" | "law_firm_name"
    | "specialisations" | "languages" | "availability_note"
    | "max_active_cases" | "bio" | "is_accepting_cases"
    | "hourly_rate_cents" | "monthly_billing_target_cents"
  >
>;

// ── API object ────────────────────────────────────────────────────────────────

export const attorneyProfileApi = {

  // GET /attorney/me/profile
  getAttorneyProfile: async (): Promise<AttorneyProfile> => {
    const res = await axios.get("/attorney/me/profile");
    return res.data;
  },

  // PATCH /attorney/me/profile
  updateAttorneyProfile: async (body: AttorneyProfileUpdateBody): Promise<AttorneyProfile> => {
    const res = await axios.patch("/attorney/me/profile", body);
    return res.data;
  },

  // POST /attorney/me/profile/upload-photo
  uploadAttorneyPhoto: async (file: File): Promise<{ profile_photo_url: string | null }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/attorney/me/profile/upload-photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // DELETE /attorney/me/profile/photo
  removeAttorneyPhoto: async (): Promise<AttorneyProfile> => {
    const res = await axios.delete("/attorney/me/profile/photo");
    return res.data;
  },
};

// ── Named re-exports ──────────────────────────────────────────────────────────

export const getAttorneyProfile    = ()                                => attorneyProfileApi.getAttorneyProfile();
export const updateAttorneyProfile = (body: AttorneyProfileUpdateBody) => attorneyProfileApi.updateAttorneyProfile(body);
export const uploadAttorneyPhoto   = (file: File)                      => attorneyProfileApi.uploadAttorneyPhoto(file);
export const removeAttorneyPhoto   = ()                                => attorneyProfileApi.removeAttorneyPhoto();