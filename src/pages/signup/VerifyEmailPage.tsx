// src/pages/signup/VerifyEmailPage.tsx
import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";

import imgLeftPanelBg from "../../assets/icons/left-panel-bg.svg";
import imgGlobeIcon   from "../../assets/icons/globe-icon.svg";
import imgLockIcon    from "../../assets/icons/lock-icon.svg";
import { useNavigate } from "react-router-dom";
import { onboardingApi } from "../../api/onboarding.api";
import { StepBar } from "../public/Signup";

const OTP_LENGTH      = 6;
const OTP_EXPIRY_SECS = 60;

interface AccountVerificationProps {
  email?:     string;
  onSuccess?: (tokens: { access_token: string; refresh_token: string }) => void;
}

export default function AccountVerification({
  email     = sessionStorage.getItem("signup_email") ?? "",
  onSuccess,
}: AccountVerificationProps) {
  const navigate = useNavigate();

  const [digits,      setDigits]      = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [success,     setSuccess]     = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendMsg,   setResendMsg]   = useState<string | null>(null);
  const [otpTimer,    setOtpTimer]    = useState(OTP_EXPIRY_SECS);
  const [otpExpired,  setOtpExpired]  = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  useEffect(() => {
    if (otpTimer <= 0) { setOtpExpired(true); return; }
    if (success) return;
    const id = setTimeout(() => setOtpTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [otpTimer, success]);

  const otp        = digits.join("");
  const isComplete = otp.length === OTP_LENGTH && digits.every(d => d !== "");
  const canVerify  = isComplete && !loading && !success && !otpExpired;

  function focusAt(index: number) {
    inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  }

  function handleChange(index: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);
    if (char && index < OTP_LENGTH - 1) focusAt(index + 1);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits]; next[index] = ""; setDigits(next);
      } else { focusAt(index - 1); }
    } else if (e.key === "ArrowLeft")  { focusAt(index - 1); }
      else if (e.key === "ArrowRight") { focusAt(index + 1); }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
    setError(null);
  }

  async function handleVerify() {
    if (!canVerify) return;
    setLoading(true);
    setError(null);
    try {
      const data = await onboardingApi.verifyEmail({ otp });
      setSuccess(true);
      onSuccess?.(data);
      setTimeout(() => navigate("/signup/profile-setup"), 1200);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (e instanceof Error ? e.message : "Something went wrong.");
      setError(msg);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => focusAt(0), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendTimer > 0) return;
    setResendMsg(null);
    setError(null);
    try {
      await onboardingApi.resendOtp();
      setResendTimer(OTP_EXPIRY_SECS);
      setOtpTimer(OTP_EXPIRY_SECS);
      setOtpExpired(false);
      setResendMsg("New code sent! Check your inbox.");
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => focusAt(0), 50);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
        ?.response?.data?.detail ?? (e instanceof Error ? e.message : "Failed to resend code.");
      setError(msg);
    }
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden bg-gray-50" style={{ fontFamily: "Inter, sans-serif" }}>

      {/* ── LEFT PANEL ── */}
      <div className="hidden md:flex relative flex-1 h-screen items-center justify-center overflow-hidden sticky top-0"
        style={{ background: "linear-gradient(90deg, #312e81 0%, #312e81 100%)" }}>
        <img src={imgLeftPanelBg} alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `
            radial-gradient(ellipse 100% 70% at 0% 0%, rgba(16,15,21,0.9) 0%, rgba(16,15,21,0) 60%),
            radial-gradient(ellipse 50% 70% at 50% 0%, rgba(47,62,106,0.8) 0%, rgba(47,62,106,0) 60%),
            radial-gradient(ellipse 100% 70% at 100% 0%, rgba(114,39,65,0.7) 0%, rgba(114,39,65,0) 60%)
          `}} />
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-[512px] px-12">
          <div className="flex items-center justify-center w-full mb-2">
            <div className="flex items-center justify-center w-24 h-24 rounded-full border border-white/20"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)" }}>
              <img src={imgGlobeIcon} alt="Globe" className="w-9 h-9 opacity-90" />
            </div>
          </div>
          <h2 className="text-white text-center font-bold text-[30px] leading-[36px]">
            Global Reach, Local Touch
          </h2>
          <p className="text-[#e0e7ff] text-[18px] text-center leading-[29px] font-normal">
            Secure your Vyuflo account to unlock seamless international processing and dedicated support.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex flex-1 flex-col min-h-screen bg-white relative">

        <StepBar current={2} />

        <div className="flex flex-1 flex-col items-start justify-center w-full
                        px-4 sm:px-12 lg:px-24 xl:px-32 pt-10 pb-28">

          {/* Heading */}
          <div className="flex flex-col w-full pb-6 sm:pb-8">
            <h1 className="text-[#111827] text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.8px] mb-3">
              Check Your Email
            </h1>
            <p className="text-[#6b7280] text-[15px] sm:text-[16px] leading-6">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-[#111827] text-[15px] sm:text-[16px] font-medium leading-6 break-all">
              {email}
            </p>
            <p className="text-[#6b7280] text-[13px] mt-[6px] leading-5">
              If you added a phone number during signup, the same code was also sent via SMS.
              Enter whichever arrives first.
            </p>
          </div>

          {/* ── OTP countdown bar ── */}
          {!success && (
            <div className="w-full max-w-[320px] sm:max-w-sm mb-5">
              <div className="flex items-center justify-between mb-[8px]">
                <span className="text-[12px] font-medium text-[#6b7280]">
                  {otpExpired ? "Code expired" : "Code expires in"}
                </span>
                <span className="text-[13px] font-bold tabular-nums"
                  style={{
                    color: otpExpired ? "#ef4444"
                         : otpTimer > 30 ? "#4f46e5"
                         : otpTimer > 10 ? "#f59e0b"
                         : "#ef4444",
                  }}>
                  {otpExpired ? "0s" : `${otpTimer}s`}
                </span>
              </div>

              <div className="relative w-full">
                {!otpExpired && (
                  <div
                    className="absolute z-10 transition-all duration-1000 ease-linear"
                    style={{
                      left: `calc(${(otpTimer / OTP_EXPIRY_SECS) * 100}% - 10px)`,
                      top: -22,
                    }}>
                    <svg width="20" height="20" viewBox="0 0 17.5 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="17.5" height="20" rx="3"
                        fill={otpTimer > 30 ? "#4f46e5" : otpTimer > 10 ? "#f59e0b" : "#ef4444"}
                        style={{ transition: "fill 0.5s" }} />
                      <path
                        d="M0 2.5C0 1.12109 1.12109 0 2.5 0H15C16.3789 0 17.5 1.12109 17.5 2.5V17.5C17.5 18.8789 16.3789 20 15 20H2.5C1.12109 20 0 18.8789 0 17.5V2.5V2.5M7.14844 10.8906C6.05859 10.375 5.25781 9.35156 5.05078 8.125H6.57812C6.64062 9.3125 6.87891 10.2266 7.14844 10.8906V10.8906M8.76172 11.25H8.75H8.73828C8.64453 11.1133 8.51562 10.9023 8.38281 10.6055C8.14844 10.0742 7.89844 9.26562 7.82812 8.125H9.66797C9.59766 9.26562 9.35156 10.0742 9.11328 10.6055C8.98047 10.9023 8.85156 11.1133 8.75781 11.25H8.76172M10.3516 10.8906C10.6172 10.2227 10.8555 9.3125 10.9219 8.125H12.4492C12.2422 9.35156 11.4414 10.375 10.3516 10.8906V10.8906M10.9219 6.875C10.8594 5.6875 10.6211 4.77344 10.3516 4.10938C11.4414 4.625 12.2422 5.64844 12.4492 6.875H10.9219V6.875M8.73828 3.75H8.75H8.76172C8.85547 3.88672 8.98438 4.09766 9.11719 4.39453C9.35156 4.92578 9.60156 5.73438 9.67188 6.875H7.83203C7.90234 5.73438 8.14844 4.92578 8.38672 4.39453C8.51953 4.09766 8.64844 3.88672 8.74219 3.75H8.73828M7.14844 4.10938C6.88281 4.77734 6.64453 5.6875 6.57812 6.875H5.05078C5.25781 5.64844 6.05859 4.625 7.14844 4.10938V4.10938M13.75 7.5C13.75 4.74042 11.5096 2.5 8.75 2.5C5.99042 2.5 3.75 4.74042 3.75 7.5C3.75 10.2596 5.99042 12.5 8.75 12.5C11.5096 12.5 13.75 10.2596 13.75 7.5V7.5M4.375 15C4.03125 15 3.75 15.2812 3.75 15.625C3.75 15.9688 4.03125 16.25 4.375 16.25H13.125C13.4688 16.25 13.75 15.9688 13.75 15.625C13.75 15.2812 13.4688 15 13.125 15H4.375V15"
                        fill="white" fillOpacity="0.9" />
                    </svg>
                  </div>
                )}
                <div className="w-full h-[4px] rounded-full bg-[#e5e7eb]">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-linear"
                    style={{
                      width: `${(otpTimer / OTP_EXPIRY_SECS) * 100}%`,
                      background: otpExpired ? "#ef4444"
                               : otpTimer > 30 ? "#4f46e5"
                               : otpTimer > 10 ? "#f59e0b"
                               : "#ef4444",
                      transition: "background 0.5s, width 1s linear",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Expired banner */}
          {otpExpired && !success && (
            <div className="mb-4 w-full max-w-sm bg-[#fef2f2] border border-[#fca5a5]
                            rounded-[10px] px-[14px] py-[10px] flex items-center gap-[8px]">
              <span className="text-[16px]">⏱</span>
              <p className="text-[13px] text-[#dc2626] font-medium">
                Code expired. Please request a new one below.
              </p>
            </div>
          )}

          {/* OTP inputs */}
          <div className="flex gap-[6px] sm:gap-3 w-full max-w-[320px] sm:max-w-sm mb-6">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={el => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading || success || otpExpired}
                className={[
                  "flex-1 min-w-0 aspect-square rounded-full border text-center",
                  "text-[16px] sm:text-[22px] font-semibold text-[#111827]",
                  "bg-[#f9fafb] outline-none transition-all duration-150",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  error
                    ? "border-red-400 bg-red-50"
                    : success
                    ? "border-green-400 bg-green-50"
                    : otpExpired
                    ? "border-[#e5e7eb] opacity-40"
                    : digits[i]
                    ? "border-indigo-600 bg-white"
                    : "border-[#e5e7eb]",
                  "focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20",
                ].join(" ")}
              />
            ))}
          </div>

          {error    && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {resendMsg && !error && <p className="text-green-600 text-sm mb-4">{resendMsg}</p>}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={!canVerify}
            className={[
              "flex items-center justify-center w-full max-w-sm py-4 rounded-xl",
              "text-white text-[15px] font-medium leading-[22px] text-center",
              "drop-shadow-sm transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              success ? "bg-green-500" : "bg-indigo-600 hover:bg-indigo-800 active:scale-[0.99]",
            ].join(" ")}
          >
            {success ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Verified!
              </span>
            ) : loading ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Verifying…
              </span>
            ) : otpExpired ? (
              "Code Expired — Request New Code"
            ) : (
              "Verify Email"
            )}
          </button>

          {/* Resend row */}
          <div className="flex items-center flex-wrap gap-1 pt-6 w-full max-w-[320px] sm:max-w-sm">
            <span className="text-[#6b7280] text-[14px]">Didn't receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={[
                "text-[14px] font-medium",
                resendTimer > 0
                  ? "text-[#9ca3af] cursor-not-allowed"
                  : "text-indigo-600 hover:underline cursor-pointer",
              ].join(" ")}
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Click to resend"}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 lg:px-24 xl:px-32 pb-6 sm:pb-8">
          <div className="border-t border-[#f3f4f6] pt-5 flex items-start gap-2">
            <img src={imgLockIcon} alt="" className="w-[13px] h-[13px] mt-[3px] shrink-0" />
            <p className="text-[#9ca3af] text-[13px] leading-[19px]">
              What happens next? Once verified, you'll be redirected to your dashboard to complete your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}