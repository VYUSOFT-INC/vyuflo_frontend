// src/api/hr/companyProfile.api.ts

import axios from "../axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string;
  company_size: string | null;
  industry: string | null;
  website: string | null;
  domain: string | null;
  ein: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  logo_url: string | null;
  is_verified: boolean;
  is_active: boolean;
}

export type CompanyProfileUpdateBody = Partial<
  Omit<CompanyProfile, "id" | "user_id" | "logo_url" | "is_verified" | "is_active">
>;

// ── API object ────────────────────────────────────────────────────────────────

export const companyProfileApi = {

  // GET /employer/me/company-profile
  getCompanyProfile: async (): Promise<CompanyProfile> => {
    const res = await axios.get("/employer/me/company-profile");
    return res.data;
  },

  // PATCH /employer/me/company-profile
  updateCompanyProfile: async (body: CompanyProfileUpdateBody): Promise<CompanyProfile> => {
    const res = await axios.patch("/employer/me/company-profile", body);
    return res.data;
  },

  // POST /employer/me/company-profile/upload-logo
  uploadCompanyLogo: async (file: File): Promise<{ logo_url: string | null }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/employer/me/company-profile/upload-logo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // DELETE /employer/me/company-profile/logo
  removeCompanyLogo: async (): Promise<CompanyProfile> => {
    const res = await axios.delete("/employer/me/company-profile/logo");
    return res.data;
  },
};

// ── Named re-exports ──────────────────────────────────────────────────────────

export const getCompanyProfile    = ()                               => companyProfileApi.getCompanyProfile();
export const updateCompanyProfile = (body: CompanyProfileUpdateBody) => companyProfileApi.updateCompanyProfile(body);
export const uploadCompanyLogo    = (file: File)                     => companyProfileApi.uploadCompanyLogo(file);
export const removeCompanyLogo    = ()                               => companyProfileApi.removeCompanyLogo();