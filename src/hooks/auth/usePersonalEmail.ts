// src/hooks/auth/usePersonalEmail.ts

import { useState } from "react";
import { personalEmailApi } from "../../api/auth/personalEmail.api";

export function useAddPersonalEmail() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const addEmail = async (personalEmail: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      await personalEmailApi.addPersonalEmail({ personal_email: personalEmail });
      setSuccess(true);
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail ?? err.message ?? "Failed to send verification email.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    addEmail,
    loading,
    error,
    success,
    reset: () => { setSuccess(false); setError(null); },
  };
}

/**
 * Stub for the not-yet-shipped "is this email already used?" pre-flight
 * check that PersonalEmailSection expects. The backend endpoint
 * (`POST /auth/account/check-personal-email`) is planned but not yet
 * live, so we short-circuit the check to `available` and never block
 * the send-code flow. When the backend ships this endpoint, replace
 * the body of `check` with the real axios call — signature stays
 * identical, no consumer changes needed.
 */
type EmailAvailability = { available: boolean; reason?: string | null } | null;
export function useCheckPersonalEmail() {
  const [checking, setChecking] = useState(false);
  const [result,   setResult]   = useState<EmailAvailability>(null);

  const check = async (_email: string): Promise<boolean> => {
    setChecking(true);
    try {
      // TODO(backend): call POST /auth/account/check-personal-email
      // and return { available, reason }. For now assume every email
      // is available so the downstream send-code button stays enabled.
      const stub: EmailAvailability = { available: true };
      setResult(stub);
      return stub.available;
    } finally {
      setChecking(false);
    }
  };

  return {
    check,
    checking,
    result,
    reset: () => setResult(null),
  };
}

export function useVerifyPersonalEmail() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const verify = async (otpCode: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await personalEmailApi.verifyPersonalEmail({ otp_code: otpCode });
      setSuccess(true);
      return true;
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string };
      setError(err.response?.data?.detail ?? err.message ?? "Invalid or expired code.");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { verify, loading, error, success };
}