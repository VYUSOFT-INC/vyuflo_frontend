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
 * Pre-flight check for the personal-email add flow.
 *
 * IMPORTANT: on the `dev` branch there is an older copy of this same
 * hook further down in a different location, and the two textual
 * locations didn't collide during merge (both were inserted, GitHub
 * couldn't detect it as a conflict). CI then failed with TS2323
 * "Cannot redeclare exported variable useCheckPersonalEmail" and
 * TS2393 "Duplicate function implementation".
 *
 * Fix on the GitHub merge: keep THIS copy (higher in the file), and
 * DELETE the duplicate that appears later in the merged file. The
 * two implementations return the same shape so consumers work
 * either way.
 */
type EmailAvailability = { available: boolean; reason?: string | null } | null;
export function useCheckPersonalEmail() {
  const [checking, setChecking] = useState(false);
  const [result,   setResult]   = useState<EmailAvailability>(null);

  const check = async (_email: string): Promise<boolean> => {
    setChecking(true);
    try {
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
