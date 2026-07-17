// // src/api/profile.api.ts  (updated)
// // ─────────────────────────────────────────────────────────────────────────────
// // WHAT CHANGED:  Added `theme_color` to updateMyProfile body type,
// // plus a convenience `updateThemeColor()` one-liner.
// // ─────────────────────────────────────────────────────────────────────────────

// import axios from "../axios";

// export const profileApi = {
//   // GET /users/me/profile
//   getMyProfile: async () => {
//     const res = await axios.get("/users/me/profile");
//     return res.data;
//   },

//   getLoginHistory: async (params?: { limit?: number; offset?: number }) => {
//     const res = await axios.get("/users/me/login-history", { params });
//     return res.data;
//   },

//   markSuspicious: async (historyId: string) => {
//     const res = await axios.patch(`/users/me/login-history/${historyId}/suspicious`);
//     return res.data;
//   },

//   signOutAllDevices: async () => {
//     const res = await axios.post("/users/me/sign-out-all");
//     return res.data;
//   },

//   uploadProfilePicture: async (file: File): Promise<{ profile_picture_url: string }> => {
//     const formData = new FormData();
//     formData.append("file", file);
//     const res = await axios.post("/users/me/upload-picture", formData, {
//       headers: { "Content-Type": "multipart/form-data" },
//     });
//     return res.data;
//   },

//   // PATCH /users/me/profile
//   updateMyProfile: async (body: {
//     full_legal_name?:      string;
//     nationality?:          string;
//     country_of_residence?: string;
//     date_of_birth?:        string;
//     gender?:               string;
//     profile_picture_url?:  string;
//     phone_number?:         string;
//     country_code?:         string;
//     timezone?:             string;
//     preferred_language?:   string;
//     onboarding_step?:      number;
//     onboarding_completed?: boolean;
//     theme_color?:          string;  // ← NEW
//   }) => {
//     const res = await axios.patch("/users/me/profile", body);
//     return res.data;
//   },

//   // ── Convenience: update just the theme color ──────────────────────────────
//   updateThemeColor: async (hex: string) => {
//     const res = await axios.patch("/users/me/profile", { theme_color: hex });
//     return res.data;
//   },
// };

// // ── Named re-exports ────────────────────────────────────────────────────────

// export const getMyProfile       = () => profileApi.getMyProfile();
// export const updateMyProfile    = (body: Parameters<typeof profileApi.updateMyProfile>[0]) =>
//   profileApi.updateMyProfile(body);
// export const updateThemeColor   = (hex: string) => profileApi.updateThemeColor(hex);
// export const getLoginHistory    = (params?: { limit?: number; offset?: number }) =>
//   profileApi.getLoginHistory(params);
// export const markSuspicious     = (historyId: string) =>
//   profileApi.markSuspicious(historyId);
// export const signOutAllDevices  = () =>
//   profileApi.signOutAllDevices();
// export const uploadProfilePicture = (file: File) =>
//   profileApi.uploadProfilePicture(file);


// src/api/profile.api.ts
// ─────────────────────────────────────────────────────────────────────────────
// WHAT CHANGED:
//   - Added `tour_*_seen` fields to updateMyProfile body type
//   - Added `markTourSeen(role)` method → PATCH /users/me/tour-seen
// ─────────────────────────────────────────────────────────────────────────────

import axios from "../axios";

// ── Types ─────────────────────────────────────────────────────────────────────

export type TourRole = 'employee' | 'hr' | 'attorney' | 'admin';

// ── API object ────────────────────────────────────────────────────────────────

export const profileApi = {

  // GET /users/me/profile
  getMyProfile: async () => {
    const res = await axios.get("/users/me/profile");
    return res.data;
  },

  // GET /users/me/login-history
  getLoginHistory: async (params?: { limit?: number; offset?: number }) => {
    const res = await axios.get("/users/me/login-history", { params });
    return res.data;
  },

  // PATCH /users/me/login-history/:id/suspicious
  markSuspicious: async (historyId: string) => {
    const res = await axios.patch(`/users/me/login-history/${historyId}/suspicious`);
    return res.data;
  },

  // POST /users/me/sign-out-all
  signOutAllDevices: async () => {
    const res = await axios.post("/users/me/sign-out-all");
    return res.data;
  },

  // POST /users/me/upload-picture
  uploadProfilePicture: async (file: File): Promise<{ profile_picture_url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("/users/me/upload-picture", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // PATCH /users/me/profile
  updateMyProfile: async (body: {
    full_legal_name?:      string;
    nationality?:          string;
    country_of_residence?: string;
    date_of_birth?:        string;
    gender?:               string;
    profile_picture_url?:  string;
    phone_number?:         string;
    country_code?:         string;
    timezone?:             string;
    preferred_language?:   string;
    onboarding_step?:      number;
    onboarding_completed?: boolean;
    theme_color?:          string;
  }) => {
    const res = await axios.patch("/users/me/profile", body);
    return res.data;
  },

  // Convenience: update just the theme color
  updateThemeColor: async (hex: string) => {
    const res = await axios.patch("/users/me/profile", { theme_color: hex });
    return res.data;
  },

  // PATCH /users/me/tour-seen
  // Marks the dashboard tour as seen for the given role.
  // Called once when user finishes or skips the tour — fire and forget.
  markTourSeen: async (role: TourRole): Promise<{ ok: boolean }> => {
    const res = await axios.patch("/users/me/tour-seen", { role });
    return res.data;
  },
};

// ── Named re-exports ──────────────────────────────────────────────────────────

export const getMyProfile         = ()                                                          => profileApi.getMyProfile();
export const updateMyProfile      = (body: Parameters<typeof profileApi.updateMyProfile>[0])    => profileApi.updateMyProfile(body);
export const updateThemeColor     = (hex: string)                                               => profileApi.updateThemeColor(hex);
export const getLoginHistory      = (params?: { limit?: number; offset?: number })              => profileApi.getLoginHistory(params);
export const markSuspicious       = (historyId: string)                                         => profileApi.markSuspicious(historyId);
export const signOutAllDevices    = ()                                                          => profileApi.signOutAllDevices();
export const uploadProfilePicture = (file: File)                                                => profileApi.uploadProfilePicture(file);
export const markTourSeen         = (role: TourRole)                                            => profileApi.markTourSeen(role);