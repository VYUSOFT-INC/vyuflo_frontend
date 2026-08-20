// src/api/hr/invitation.api.ts

import axios from "../axios";

import type {
  InviteByEmailRequest,
  InviteByCodeRequest,
  AcceptInviteRequest,
  AcceptInviteNewUserRequest,
  RequestMergeOtpRequest,
  AcceptInviteExistingUserRequest,
  UpdateEmployeeRequest,
  InvitationResponse,
  InvitationListResponse,
  AcceptInviteResponse,
  AcceptInviteAuthResponse,
  RequestMergeOtpResponse,
  EmployeeListResponse,
  ValidateTokenResponse,
  EmployerDomainResponse,
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

  // NEW — powers the domain-suffix picker in the invite email field.
  getEmployerDomain: async (): Promise<EmployerDomainResponse> => {
    const res = await axios.get(`${BASE}/employer-domain`);
    return res.data;
  },

  // Authenticated path — person already has a session.
  acceptInvite: async (
    data: AcceptInviteRequest
  ): Promise<AcceptInviteResponse> => {
    const res = await axios.post(`${BASE}/accept`, data);
    return res.data;
  },

  // NEW — public, no existing account. Creates + links + logs in, in one call.
  acceptInviteNewUser: async (
    data: AcceptInviteNewUserRequest
  ): Promise<AcceptInviteAuthResponse> => {
    const res = await axios.post(`${BASE}/accept/new-user`, data);
    return res.data;
  },

  // NEW — public, step 1 of merge flow.
  requestMergeOtp: async (
    data: RequestMergeOtpRequest
  ): Promise<RequestMergeOtpResponse> => {
    const res = await axios.post(`${BASE}/accept/existing-user/request-otp`, data);
    return res.data;
  },

  // NEW — public, step 2 of merge flow.
  acceptInviteExistingUser: async (
    data: AcceptInviteExistingUserRequest
  ): Promise<AcceptInviteAuthResponse> => {
    const res = await axios.post(`${BASE}/accept/existing-user`, data);
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