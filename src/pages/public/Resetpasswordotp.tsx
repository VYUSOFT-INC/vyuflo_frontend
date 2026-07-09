import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api";

// ── Figma Assets ──────────────────────────────────────────────────────────────
// const imgLogoIcon   = "https://www.figma.com/api/mcp/asset/e8212301-2dcb-4979-b40f-a96ebb39cae6"; // plane icon in logo
// const imgCheckIcon  = "https://www.figma.com/api/mcp/asset/8158a3ba-5fbf-4f72-bcb6-b41a221f26f4"; // checkmark in step 1
// const imgShieldIcon = "https://www.figma.com/api/mcp/asset/358b7281-1455-4e09-bed5-3c95fe805cf0"; // shield icon
// const imgArrowIcon  = "https://www.figma.com/api/mcp/asset/68653c6e-20c1-40f6-b4a3-e1976efa102f"; // → arrow on button


import imgLogoIcon   from "../../assets/icons/otp-plane-icon.svg";
import imgCheckIcon  from "../../assets/icons/otp-check-icon.svg";
import imgShieldIcon from "../../assets/icons/otp-shield-icon.svg";
import imgArrowIcon  from "../../assets/icons/otp-arrow-icon.svg";


const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;

export default function ResetPasswordOTP() {
  const navigate = useNavigate();

  const email = sessionStorage.getItem("reset_email") ?? "name@company.com";

  const [digits, setDigits]       = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [timer, setTimer]         = useState(RESEND_SECONDS);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  // Auto-focus first box on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer(t => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const otp        = digits.join("");
  const isComplete = digits.every(d => d !== "");

  function focusAt(i: number) {
    inputRefs.current[Math.max(0, Math.min(i, OTP_LENGTH - 1))]?.focus();
  }

  function handleChange(i: number, value: string) {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[i] = char;
    setDigits(next);
    setError(null);
    if (char && i < OTP_LENGTH - 1) focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[i]) {
        const next = [...digits];
        next[i] = "";
        setDigits(next);
      } else {
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft")  focusAt(i - 1);
    else if (e.key === "ArrowRight") focusAt(i + 1);
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
    if (!isComplete) return;
    setLoading(true);
    setError(null);
    try {
      const resetTokenId = sessionStorage.getItem("reset_token_id") ?? "";
      await forgotPasswordApi.verifyOtp({
        reset_token_id: resetTokenId,
        otp_code: otp,
      });
      // Store OTP for next step (set new password)
      sessionStorage.setItem("reset_otp_verified", "true");
      sessionStorage.setItem("reset_token_id", resetTokenId);
      navigate("/forgot-password/new-password");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid or expired code.");
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => focusAt(0), 50);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (timer > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      await forgotPasswordApi.requestReset({ email });
      setTimer(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(""));
      setTimeout(() => focusAt(0), 50);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  }

  // Format mm:ss
  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    // ── Page bg: #f9fafb ────────────────────────────────────────────────────
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">

      {/* ── Main centred area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-[141px]">

        {/* ── Auth card: white, rounded-[24px], w-[448px], exact shadow ── */}
        <div className="relative bg-white rounded-[24px] shadow-[0px_0px_3px_0px_rgba(0,0,0,0.02),0px_4px_20px_0px_rgba(0,0,0,0.05)] w-[448px] p-[40px] flex flex-col gap-[32px] overflow-hidden">

          {/* ── Top gradient bar ── */}
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ backgroundImage: "linear-gradient(179.49deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)" }}
          />

          {/* ── Header section ── */}
          <div className="flex flex-col gap-[32px] items-center w-full">

            {/* Logo row */}
            <div className="flex items-center justify-center gap-[8px] w-full">
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_4px_3px_rgba(99,102,241,0.3),0px_10px_7.5px_rgba(99,102,241,0.3)]"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)" }}
              >
                <img src={imgLogoIcon} alt="" className="w-[18px] h-[18px] object-contain" />
              </div>
              <span
                className="text-[#111827] text-[24px] font-bold tracking-[-0.7px] leading-[32px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Vyuflo
              </span>
            </div>

            {/* Step indicator: ✓ ── 2 Verify ── 3 */}
            <div className="flex items-center justify-center gap-[12px] w-full">

              {/* Step 1 — completed (checkmark), opacity-50 */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6] shrink-0">
                  <img src={imgCheckIcon} alt="" className="w-[10.5px] h-[12px] object-contain" />
                </div>
              </div>

              {/* Connector — indigo (step 1 done) */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#4f46e5] shrink-0" />

              {/* Step 2 — active */}
              <div className="flex items-center gap-[8px]">
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 bg-[#4f46e5] drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)]"
                >
                  <span
                    className="text-white text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >2</span>
                </div>
                <span
                  className="text-[#4f46e5] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >Verify</span>
              </div>

              {/* Connector — gray (step 3 not yet) */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#e5e7eb] shrink-0" />

              {/* Step 3 — inactive */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6] shrink-0">
                  <span
                    className="text-[#9ca3af] text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >3</span>
                </div>
              </div>
            </div>

            {/* Shield icon — blue tint box */}
            <div className="w-[48px] h-[48px] bg-[#eff6ff] border border-[#dbeafe] rounded-[12px] flex items-center justify-center drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] shrink-0">
              <img src={imgShieldIcon} alt="" className="w-[20px] h-[20px] object-contain" />
            </div>

            {/* Heading */}
            <p
              className="text-[#111827] text-[28px] font-bold tracking-[-0.7px] leading-[35px] text-center w-full"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Check your email
            </p>

            {/* Subtext + email */}
            <div className="flex flex-col gap-[5px] items-center w-full">
              <p
                className="text-[#6b7280] text-[15px] font-normal tracking-[-0.5px] leading-[25px] text-center"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                We sent a 6-digit verification code to
              </p>
              <p
                className="text-[#111827] text-[15px] font-medium tracking-[-0.5px] leading-[25px] text-center"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {email}
              </p>
            </div>
          </div>

          {/* ── Verify form ── */}
          <div className="flex flex-col gap-[32px] w-full">

            {/* OTP boxes — 6 squares, justify-between, exact from Figma */}
            <div className="flex items-center justify-between w-full h-[64px]">
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
                  disabled={loading}
                  className={[
                    "w-[56px] h-[64px] rounded-[12px] border text-center",
                    "text-[24px] font-semibold text-[#111827] tracking-[-0.5px]",
                    "focus:outline-none transition-all duration-150",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    error
                      ? "border-[#ef4444] bg-[#fef2f2]"
                      : i === 0 && digits[i] === "" && digits.every(d => d === "")
                        ? "bg-white border-[#4f46e5]"           // first box — indigo border (Figma active state)
                        : digits[i]
                          ? "bg-white border-[#4f46e5]"         // filled — indigo border
                          : "bg-[#f9fafb] border-[#e5e7eb]",   // empty — gray border
                  ].join(" ")}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              ))}
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-[#ef4444] text-[13px] tracking-[-0.5px] leading-[20px] text-center -mt-6"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {error}
              </p>
            )}

            {/* Action group */}
            <div className="flex flex-col gap-[16px] w-full">

              {/* Verify Code button */}
              <button
                type="button"
                onClick={handleVerify}
                disabled={!isComplete || loading}
                className={[
                  "w-full h-[53px] rounded-[14px] flex items-center justify-center gap-[5px]",
                  "text-white text-[15px] font-semibold tracking-[-0.5px] leading-[23px]",
                  "drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)]",
                  "transition hover:opacity-90 active:scale-[0.99]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                ].join(" ")}
                style={{
                  backgroundImage: "linear-gradient(171.8deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying…
                  </span>
                ) : (
                  <>
                    Verify Code&nbsp;
                    <img src={imgArrowIcon} alt="" className="w-[14px] h-[14px] object-contain opacity-80" />
                  </>
                )}
              </button>

              {/* Resend + change email row */}
              <div className="flex flex-col gap-[12px] pt-[8px] items-center w-full">

                {/* Resend timer / button */}
                <div className="flex items-center justify-center gap-[4px]">
                  {timer > 0 ? (
                    <>
                      <span
                        className="text-[#6b7280] text-[14px] font-normal tracking-[-0.5px]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        Resend code in
                      </span>
                      <span
                        className="text-[#374151] text-[14px] font-semibold tracking-[-0.5px]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {mm}:{ss}
                      </span>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="text-[#4f46e5] text-[14px] font-medium tracking-[-0.5px] hover:underline disabled:opacity-50"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {resending ? "Resending…" : "Resend code"}
                    </button>
                  )}
                </div>

                {/* Change email address */}
                <Link
                  to="/forgot-password"
                  className="text-[#6b7280] text-[14px] font-medium tracking-[-0.5px] leading-[21px] text-center hover:text-[#4f46e5] transition"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Change email address
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex flex-col items-center py-[32px] border-t border-[#e5e7eb] bg-[#f9fafb]">
        <p
          className="text-[#6b7280] text-[14px] font-normal tracking-[-0.5px] leading-[20px] text-center"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Having trouble?
        </p>
        <a
          href="mailto:support@vyuflo.com"
          className="text-[#4f46e5] text-[16px] font-medium tracking-[-0.5px] leading-[24px] text-center hover:underline"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}