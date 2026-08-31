// src/hooks/auth/usePersonalEmail.ts

import { useState } from "react";
import { personalEmailApi } from "../../api/auth/personalEmail.api";

// FastAPI's validation-error responses (422) send `detail` as an ARRAY of
// {type, loc, msg, input} objects, not a plain string — unlike most other
// errors (400/404/etc from raise HTTPException(...)) which send a string.
// The old inline extraction assumed `detail` was always a string, so any
// 422 (wrong field name, missing field, bad type) stored the raw array
// into error state. Rendering that array as {error} in JSX crashes React
// with "Objects are not valid as a React child" — a blank white screen
// instead of a readable message. This handles both shapes.
function extractErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { detail?: unknown } }; message?: string };
  const detail = err.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const joined = detail
      .map((d: unknown) => (d && typeof d === "object" && "msg" in d ? String((d as { msg?: unknown }).msg) : null))
      .filter(Boolean)
      .join(" ");
    return joined || fallback;
  }
  return err.message ?? fallback;
}

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
      setError(extractErrorMessage(e, "Failed to send verification email."));
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
      setError(extractErrorMessage(e, "Invalid or expired code."));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { verify, loading, error, success };
}

export function useCheckPersonalEmail() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ available: boolean; reason?: string } | null>(null);

  const check = async (email: string) => {
    setChecking(true);
    try {
      const res = await personalEmailApi.checkPersonalEmail(email);
      setResult(res);
      return res;
    } catch {
      setResult(null);
      return null;
    } finally {
      setChecking(false);
    }
  };

  return { check, checking, result, reset: () => setResult(null) };
}