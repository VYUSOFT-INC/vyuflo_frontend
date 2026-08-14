// src/hooks/hr/useInvitations.ts
import { useState, useEffect, useCallback } from "react";
import { invitationApi } from "../../api/hr/invitation.api";
import type {
  InvitationResponse,
  EmployeeResponse,
  ValidateTokenResponse,
  InviteByEmailRequest,
  InviteByCodeRequest,
} from "../../types/hr/invitation.types";

function extractErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: string } }; message?: string };
  return err.response?.data?.detail ?? err.message ?? fallback;
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
//
// NOTE ON FIX: previously this caught its own error and stored it in state
// WITHOUT re-throwing. That meant any caller doing
//   try { await send(...) } catch { showFailureToast() }
// never saw the failure — send() always resolved cleanly, so the failure
// branch was dead code and the UI reported "sent successfully" even when
// the request actually failed. Now the error is re-thrown after being
// recorded, so both the inline `error` state AND caller-side try/catch work.

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
      throw new Error(message);   // ← re-throw so callers can detect the failure
    } finally {
      setLoading(false);
    }
  };

  return { send, loading, error, success, reset: () => { setSuccess(false); setError(null); } };
}

// ── HR: Generate company code ─────────────────────────────────────────────────
// Same fix as useSendEmailInvite — re-throws after recording the error.

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
      throw new Error(message);   // ← re-throw so callers can detect the failure
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

// ── Employee: Accept invite ───────────────────────────────────────────────────
//
// accept() now takes a THIRD optional argument, passportNumber — required
// only when ValidateTokenResponse.requires_passport_verification was true
// for this invite. Also exposes needsPersonalEmail, set from the backend's
// AcceptInviteResponse.needs_personal_email: true when the account that
// just accepted has no login path independent of the org's invited email
// (i.e. they signed up USING that email). The frontend uses this to decide
// whether to show the "add a personal email" prompt right after acceptance.

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