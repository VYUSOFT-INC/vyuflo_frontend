
// src/api/invitation.api.ts

import axios from "../axios";

import type {
  InviteByEmailRequest,
  InviteByCodeRequest,
  InviteByLinkRequest,
  AcceptInviteRequest,
  UpdateEmployeeRequest,
  InvitationResponse,
  InvitationListResponse,
  AcceptInviteResponse,
  EmployeeListResponse,
  ValidateTokenResponse,
} from "../../types/hr/invitation.types";

const BASE = "/hr";

export const invitationApi = {
  inviteByEmail: async (
    data: InviteByEmailRequest
  ): Promise<InvitationResponse> => {
    const res = await axios.post(`${BASE}/email`, data);
    return res.data;
  },

  inviteByCode: async (
    data: InviteByCodeRequest
  ): Promise<InvitationResponse> => {
    const res = await axios.post(`${BASE}/code`, data);
    return res.data;
  },

  inviteByLink: async (
    data: InviteByLinkRequest
  ): Promise<InvitationResponse> => {
    const res = await axios.post(`${BASE}/link`, data);
    return res.data;
  },

  listInvitations: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<InvitationListResponse> => {
    const res = await axios.get(`${BASE}/`, { params });
    return res.data;
  },

  revokeInvitation: async (invitationId: string): Promise<void> => {
    await axios.delete(`${BASE}/${invitationId}`);
  },

  resendInvitation: async (
    invitationId: string
  ): Promise<InvitationResponse> => {
    const res = await axios.post(`${BASE}/${invitationId}/resend`);
    return res.data;
  },

  validateInvite: async (params: {
    invite_token?: string;
    invite_code?: string;
  }): Promise<ValidateTokenResponse> => {
    const res = await axios.get(`${BASE}/validate`, { params });
    return res.data;
  },

  acceptInvite: async (
    data: AcceptInviteRequest
  ): Promise<AcceptInviteResponse> => {
    const res = await axios.post(`${BASE}/accept`, data);
    return res.data;
  },

  listEmployees: async (params?: {
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<EmployeeListResponse> => {
    const res = await axios.get(`${BASE}/employees`, { params });
    return res.data;
  },

  updateEmployee: async (
    employeeLinkId: string,
    data: UpdateEmployeeRequest
  ): Promise<void> => {
    await axios.patch(`${BASE}/employees/${employeeLinkId}`, data);
  },

  removeEmployee: async (employeeLinkId: string): Promise<void> => {
    await axios.delete(`${BASE}/employees/${employeeLinkId}`);
  },
};