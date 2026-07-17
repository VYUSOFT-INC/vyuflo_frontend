import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api";


// ── Figma Assets ──────────────────────────────────────────────────────────────

import imgLogoIcon  from "../../assets/icons/send-plane-icon.svg";
import imgEmailIcon from "../../assets/icons/email-icon.svg";
import imgArrowR    from "../../assets/icons/arrow-right-btn.svg";
import imgArrowL    from "../../assets/icons/arrow-left-btn.svg";

// ── Component ─────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await forgotPasswordApi.requestReset({ email: email.trim().toLowerCase() });
      // Store email for OTP screen
      sessionStorage.setItem("reset_email", email.trim().toLowerCase());
      sessionStorage.setItem("reset_token_id", data.reset_token_id ?? "");  // ← ADD THIS
      setSent(true);
      setTimeout(() => navigate("/forgot-password/verify-otp"), 1200);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    // ── Page: bg-[#f9fafb], full screen ──────────────────────────────────────
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">

      {/* ── Main centred area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-[153px]">

        {/* ── Auth card: white, rounded-[24px], shadow, w-[448px] ── */}
        <div className="relative bg-white rounded-[24px] shadow-[0px_0px_3px_0px_rgba(0,0,0,0.02),0px_4px_20px_0px_rgba(0,0,0,0.05)] w-[448px] p-[40px] flex flex-col gap-[32px] overflow-hidden">

          {/* ── Top gradient bar: 4px, indigo→violet ── */}
          <div
            className="absolute top-0 left-0 right-0 h-[4px]"
            style={{ backgroundImage: "linear-gradient(179.49deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)" }}
          />

          {/* ── Header section ── */}
          <div className="flex flex-col gap-[32px] items-center w-full">

            {/* Logo row */}
            <div className="flex items-center justify-center gap-[8px] w-full">
              {/* Gradient circle with plane icon */}
              <div
                className="w-[40px] h-[40px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_4px_3px_rgba(99,102,241,0.3),0px_10px_7.5px_rgba(99,102,241,0.3)]"
                style={{ backgroundImage: "linear-gradient(135deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)" }}
              >
                <img src={imgLogoIcon} alt="" className="w-[18px] h-[18px] object-contain" />
              </div>
              {/* Brand name */}
              <span
                className="text-[#111827] text-[24px] font-bold tracking-[-0.7px] leading-[32px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Vyuflo
              </span>
            </div>

            {/* Step indicator: 1 → 2 → 3 */}
            <div className="flex items-center justify-center gap-[8px] w-full">
              {/* Step 1 — active */}
              <div className="flex items-center gap-[8px]">
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)] bg-[#4f46e5]"
                >
                  <span
                    className="text-white text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >1</span>
                </div>
                <span
                  className="text-[#4f46e5] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >Email</span>
              </div>

              {/* Connector */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#e5e7eb] shrink-0" />

              {/* Step 2 — inactive */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6]">
                  <span
                    className="text-[#9ca3af] text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >2</span>
                </div>
              </div>

              {/* Connector */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#e5e7eb] shrink-0" />

              {/* Step 3 — inactive */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6]">
                  <span
                    className="text-[#9ca3af] text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >3</span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <p
              className="text-[#111827] text-[28px] font-bold tracking-[-0.7px] leading-[35px] text-center w-full"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Reset password
            </p>

            {/* Subtext */}
            <p
              className="text-[#6b7280] text-[15px] font-normal tracking-[-0.5px] leading-[25px] text-center px-[16px] w-full"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Enter your registered email address and we'll<br />
              send you a code to reset your password.
            </p>
          </div>

          {/* ── Form section ── */}
          <div className="flex flex-col gap-[24px] w-full">

            {/* Email field */}
            <div className="flex flex-col gap-[8px] w-full">

              {/* Label */}
              <label
                className="text-[#374151] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Email Address
              </label>

              {/* Input wrapper */}
              <div className="relative w-full">
                {/* Email icon inside input */}
                <div className="absolute left-[16px] top-1/2 -translate-y-1/2 flex items-center">
                  <img src={imgEmailIcon} alt="" className="w-[18px] h-[18px] object-contain" />
                </div>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null); }}
                  onKeyDown={handleKeyDown}
                  disabled={loading || sent}
                  className={[
                    "w-full h-[53px] bg-[#f9fafb] border rounded-[12px]",
                    "pl-[44px] pr-[16px] py-[14px]",
                    "text-[#111827] text-[15px] font-normal tracking-[-0.5px] leading-[23px]",
                    "focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition",
                    "placeholder:text-[#9ca3af]",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    error ? "border-[#ef4444]" : "border-[#e5e7eb]",
                  ].join(" ")}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
              </div>

              {/* Helper / error text */}
              {error
                ? <p className="text-[#ef4444] text-[13px] tracking-[-0.5px] leading-[20px]" style={{ fontFamily: "Inter, sans-serif" }}>{error}</p>
                : <p className="text-[#6b7280] text-[13px] tracking-[-0.5px] leading-[20px]" style={{ fontFamily: "Inter, sans-serif" }}>
                    Must be the email associated with your account.
                  </p>
              }
            </div>

            {/* Action group */}
            <div className="flex flex-col gap-[14px] w-full pt-[16px]">

              {/* Send Reset Code button — indigo→violet gradient */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || sent}
                className={[
                  "w-full h-[53px] rounded-[14px] flex items-center justify-center gap-[5px]",
                  "text-white text-[15px] font-semibold tracking-[-0.5px] leading-[23px]",
                  "drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)]",
                  "transition hover:opacity-90 active:scale-[0.99]",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                ].join(" ")}
                style={{
                  backgroundImage: sent
                    ? undefined
                    : "linear-gradient(171.8deg, rgb(79,70,229) 0%, rgb(124,58,237) 100%)",
                  backgroundColor: sent ? "#16a34a" : undefined,
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {sent ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Code Sent!
                  </span>
                ) : loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  <>
                    Send Reset Code&nbsp;
                    <img src={imgArrowR} alt="" className="w-[12px] h-[14px] object-contain opacity-80" />
                  </>
                )}
              </button>

              {/* Back to Login button — white, border */}
              <Link
                to="/login"
                className={[
                  "w-full h-[53px] rounded-[14px] flex items-center justify-center gap-[8px]",
                  "bg-white border border-[#e5e7eb]",
                  "text-[#374151] text-[15px] font-semibold tracking-[-0.5px] leading-[23px]",
                  "hover:bg-[#f9fafb] transition",
                ].join(" ")}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                <img src={imgArrowL} alt="" className="w-[12px] h-[14px] object-contain" />
                Back to Login
              </Link>
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
          href="mailto:support@Vyuflo.com"
          className="text-[#4f46e5] text-[16px] font-medium tracking-[-0.5px] leading-[24px] text-center hover:underline"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}