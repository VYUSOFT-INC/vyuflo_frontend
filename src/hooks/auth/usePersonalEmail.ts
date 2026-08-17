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