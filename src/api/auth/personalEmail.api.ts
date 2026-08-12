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

  verifyPersonalEmail: async (
    data: VerifyPersonalEmailRequest
  ): Promise<MessageResponse> => {
    const res = await axios.post(`${BASE}/verify-personal-email`, data);
    return res.data;
  },
};