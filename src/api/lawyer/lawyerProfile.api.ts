// src/api/lawyer/lawyerProfile.api.ts
//
// Profile & Settings — thin wrappers over the 5 Swagger endpoints.
// All hit the shared axios instance (JWT auto-attached).
//
// IMPORTANT — avatar upload uses multipart/form-data, NOT JSON.
// Backend rejects the request if Content-Type is application/json for
// the avatar PATCH. Let axios infer the boundary by passing a FormData
// instance directly.

import axios from '../axios';
import type {
  MyProfile,
  ProfileUpdate,
  AttorneyProfileUpdate,
  AvatarResponse,
} from '../../types/lawyer/lawyerProfile.types';

const BASE = '/users/me';

export const lawyerProfileApi = {
  /** GET own aggregated profile (users + user_profiles + attorney_profiles). */
  getMyProfile: async (): Promise<MyProfile> => {
    const r = await axios.get<MyProfile>(`${BASE}/profile`);
    return r.data;
  },

  /** PATCH own profile — first_name / last_name / timezone / preferred_language. */
  updateMyProfile: async (body: ProfileUpdate): Promise<MyProfile> => {
    const r = await axios.patch<MyProfile>(`${BASE}/profile`, body);
    return r.data;
  },

  /** PATCH attorney credentials — Bar Association ID, firm, bio, billing target.
   *  Backend auto-creates the attorney_profiles row when missing. */
  updateAttorneyProfile: async (body: AttorneyProfileUpdate): Promise<MyProfile> => {
    const r = await axios.patch<MyProfile>(`${BASE}/attorney-profile`, body);
    return r.data;
  },

  /** PATCH avatar — multipart/form-data, field name `file`.
   *  Allowed: jpg / jpeg / png / webp. Max 5 MB.
   *  Returns the new profile_picture_url. */
  uploadAvatar: async (file: File): Promise<AvatarResponse> => {
    const form = new FormData();
    form.append('file', file);
    const r = await axios.patch<AvatarResponse>(`${BASE}/avatar`, form, {
      headers: {
        // Let the browser set the boundary; axios honors undefined to skip
        // its default application/json header injection.
        'Content-Type': 'multipart/form-data',
      },
    });
    return r.data;
  },

  /** DELETE avatar — sets profile_picture_url to null. */
  removeAvatar: async (): Promise<AvatarResponse> => {
    const r = await axios.delete<AvatarResponse>(`${BASE}/avatar`);
    return r.data;
  },
};