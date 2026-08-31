// src/api/auth/personalEmail.api.ts

import axios from "../axios";

import type {
  AddPersonalEmailRequest,
  VerifyPersonalEmailRequest,
  MessageResponse,
} from "../../types/auth/personalEmail.types";

const BASE = "/auth/account";

export const personalEmailApi = {
  addPersonalEmail: async (
    data: AddPersonalEmailRequest
  ): Promise<MessageResponse> => {
    const res = await axios.post(`${BASE}/add-personal-email`, data);
    return res.data;
  },
  // personalEmail.api.ts — add:
  checkPersonalEmail: async (email: string): Promise<{ available: boolean; reason?: string }> => {
    const res = await axios.get(`${BASE}/check-personal-email`, { params: { email } });
    return res.data;
  },
  verifyPersonalEmail: async (
    data: VerifyPersonalEmailRequest
  ): Promise<MessageResponse> => {
    const res = await axios.post(`${BASE}/verify-personal-email`, data);
    return res.data;
  },
};

