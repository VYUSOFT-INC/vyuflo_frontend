// src/hooks/hr/useInvitations.ts
import { useState, useEffect, useCallback } from "react";
import { invitationApi } from "../../api/hr/invitation.api";
import type {
  InvitationResponse,
  EmployeeResponse,
  ValidateTokenResponse,
  InviteByEmailRequest,
  InviteByCodeRequest,
  AcceptInviteNewUserRequest,
  AcceptInviteExistingUserRequest,
} from "../../types/hr/invitation.types";

function extractErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: string } }; message?: string };
  return err.response?.data?.detail ?? err.message ?? fallback;
}

// ── HR: Get my company's domain (for the invite email domain picker) ─────────

export function useEmployerDomain() {
  const [domain,  setDomain]  = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    invitationApi.getEmployerDomain()
      .then(res => { if (mounted) setDomain(res.domain); })
      .catch(() => { if (mounted) setDomain(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return { domain, loading };
}

// ── HR: List & manage invitations ─────────────────────────────────────────────

export function useMyInvitations(statusFilter?: string) {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invitationApi.listInvitations({ status: statusFilter });
      setInvitations(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load invitations.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { void load(); }, [load]);

  const revoke = async (invitationId: string) => {
    await invitationApi.revokeInvitation(invitationId);
    void load();
  };

  const resend = async (invitationId: string) => {
    await invitationApi.resendInvitation(invitationId);
    void load();
  };

  return { invitations, total, loading, error, refetch: load, revoke, resend };
}

// ── HR: Send email invite ─────────────────────────────────────────────────────

export function useSendEmailInvite() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const send = async (data: InviteByEmailRequest) => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await invitationApi.inviteByEmail(data);
      setSuccess(true);
    } catch (e: unknown) {
      const message = extractErrorMessage(e, "Failed to send invite.");
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error, success, reset: () => { setSuccess(false); setError(null); } };
}

// ── HR: Generate company code ─────────────────────────────────────────────────

export function useGenerateCode() {
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [invitation,  setInvitation]  = useState<InvitationResponse | null>(null);

  const generate = async (data: InviteByCodeRequest = {}) => {
    setLoading(true);
    setError(null);
    try {
      const inv = await invitationApi.inviteByCode(data);
      setInvitation(inv);
      return inv;
    } catch (e: unknown) {
      const message = extractErrorMessage(e, "Failed to generate code.");
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return { generate, invitation, loading, error };
}

// ── HR: List employees ────────────────────────────────────────────────────────

export function useMyEmployees(isActive = true) {
  const [employees, setEmployees] = useState<EmployeeResponse[]>([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await invitationApi.listEmployees({ is_active: isActive });
      setEmployees(res.items);
      setTotal(res.total);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load employees.");
    } finally {
      setLoading(false);
    }
  }, [isActive]);

  useEffect(() => { void load(); }, [load]);

  const remove = async (employeeLinkId: string) => {
    await invitationApi.removeEmployee(employeeLinkId);
    void load();
  };

  return { employees, total, loading, error, refetch: load, remove };
}

// ── Employee: Validate invite token/code ──────────────────────────────────────

export function useValidateInvite(
  inviteToken?: string,
  inviteCode?: string,
) {
  const [result,  setResult]  = useState<ValidateTokenResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!inviteToken && !inviteCode) return;
    const check = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await invitationApi.validateInvite({
          invite_token: inviteToken,
          invite_code:  inviteCode,
        });
        setResult(res);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to validate invite.");
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [inviteToken, inviteCode]);

  return { result, loading, error };
}

// ── Employee: Accept invite (authenticated — person already has a session) ────

export function useAcceptInvite() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [company, setCompany] = useState<string | null>(null);
  const [needsPersonalEmail, setNeedsPersonalEmail] = useState(false);

  const accept = async (
    inviteToken?: string,
    inviteCode?: string,
    passportNumber?: string,
  ) => {
    if (!inviteToken && !inviteCode) {
      setError("Please provide an invite token or code.");
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await invitationApi.acceptInvite({
        invite_token:    inviteToken,
        invite_code:     inviteCode,
        passport_number: passportNumber,
      });
      setSuccess(true);
      setCompany(res.company_name);
      setNeedsPersonalEmail(!!res.needs_personal_email);
      return true;
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Failed to accept invite."));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { accept, loading, error, success, company, needsPersonalEmail };
}

// ── Employee: Accept invite (public — brand new account) ──────────────────────
// NEW — creates the account, links it, and logs the person in, in one call.

export function useAcceptInviteNewUser() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const acceptAsNewUser = async (data: AcceptInviteNewUserRequest) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invitationApi.acceptInviteNewUser(data);
      return res;
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Could not create your account. Please check your details and try again."));
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { acceptAsNewUser, loading, error };
}

// ── Employee: Accept invite (public — existing account, merge via OTP) ────────
// NEW — two-step: request a code, then confirm it to merge the invite in.

export function useMergeExistingUser() {
  const [requestLoading, setRequestLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [otpSent,        setOtpSent]        = useState(false);

  const requestOtp = async (inviteToken: string | undefined, inviteCode: string | undefined, loginEmail: string) => {
    setRequestLoading(true);
    setError(null);
    try {
      await invitationApi.requestMergeOtp({
        invite_token: inviteToken, invite_code: inviteCode, login_email: loginEmail,
      });
      setOtpSent(true);
      return true;
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Could not send a verification code. Please check the email and try again."));
      return false;
    } finally {
      setRequestLoading(false);
    }
  };

  const confirmMerge = async (data: AcceptInviteExistingUserRequest) => {
    setConfirmLoading(true);
    setError(null);
    try {
      const res = await invitationApi.acceptInviteExistingUser(data);
      return res;
    } catch (e: unknown) {
      setError(extractErrorMessage(e, "Could not verify that code. Please check it and try again."));
      return null;
    } finally {
      setConfirmLoading(false);
    }
  };

  return {
    requestOtp, confirmMerge,
    requestLoading, confirmLoading, error, otpSent,
    resetOtpSent: () => setOtpSent(false),
  };
}