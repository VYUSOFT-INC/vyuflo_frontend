import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { forgotPasswordApi } from "../../api/auth.api";

// // ── Figma Assets ──────────────────────────────────────────────────────────────
// const imgLogoIcon   = "https://www.figma.com/api/mcp/asset/c8ec1a79-00cd-4b3f-81db-ee82a5c81701"; // plane icon
// const imgCheckIcon  = "https://www.figma.com/api/mcp/asset/0b527a0a-e5c8-46ee-84db-bdedab70ce26"; // ✓ for completed steps
// const imgLockIcon   = "https://www.figma.com/api/mcp/asset/9d2e58d5-cb46-4809-bd68-a91cc2a5b8ab"; // lock icon in blue box
// const imgEyeIcon    = "https://www.figma.com/api/mcp/asset/4b2c188c-d7d2-4875-a5d5-2f1f00202e95"; // eye toggle
// const imgReqIcon    = "https://www.figma.com/api/mcp/asset/f424e69c-f04d-446e-81c0-76c631f14117"; // req bullet icon
// const imgArrowIcon  = "https://www.figma.com/api/mcp/asset/90903465-9b83-4ec8-b532-28fab4a94b71"; // → arrow on button

import imgLogoIcon  from "../../assets/icons/reset-plane-icon.svg";
import imgCheckIcon from "../../assets/icons/reset-check-icon.svg";
import imgLockIcon  from "../../assets/icons/reset-lock-icon.svg";
import imgEyeIcon   from "../../assets/icons/reset-eye-icon.svg";
import imgReqIcon   from "../../assets/icons/reset-req-icon.svg";
import imgArrowIcon from "../../assets/icons/reset-arrow-icon.svg";

// ── Password strength logic ────────────────────────────────────────────────────
interface Strength {
  len:     boolean;
  upper:   boolean;
  number:  boolean;
  special: boolean;
}

function getStrength(pw: string): Strength {
  return {
    len:     pw.length >= 8,
    upper:   /[A-Z]/.test(pw),
    number:  /[0-9]/.test(pw),
    special: /[@$!%*?&]/.test(pw),
  };
}

function getStrengthScore(s: Strength): number {
  return [s.len, s.upper, s.number, s.special].filter(Boolean).length;
}

function getStrengthLabel(score: number): { text: string; color: string } {
  if (score === 0) return { text: "Weak",      color: "#9ca3af" };
  if (score === 1) return { text: "Weak",      color: "#ef4444" };
  if (score === 2) return { text: "Fair",      color: "#f59e0b" };
  if (score === 3) return { text: "Good",      color: "#3b82f6" };
  return             { text: "Strong",   color: "#16a34a" };
}

function getBarColor(barIndex: number, score: number): string {
  if (score === 0) return "#e5e7eb";
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#16a34a"];
  const activeColor = colors[Math.min(score - 1, 3)];
  return barIndex < score ? activeColor : "#e5e7eb";
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ResetPasswordNew() {
  const navigate = useNavigate();

  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showNew, setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const strength      = getStrength(newPw);
  const score         = getStrengthScore(strength);
  const strengthLabel = getStrengthLabel(score);
  const isValid       = score === 4 && newPw === confirmPw;

  async function handleSubmit() {
    if (!isValid) {
      if (newPw !== confirmPw) setError("Passwords do not match.");
      else setError("Please meet all password requirements.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resetTokenId = sessionStorage.getItem("reset_token_id") ?? "";
      await forgotPasswordApi.completeReset({
        reset_token_id: resetTokenId,
        new_password:   newPw,
        confirm_password: confirmPw,
      });
      // ✅ Clean up sessionStorage
      sessionStorage.removeItem("reset_email");
      sessionStorage.removeItem("reset_token_id");
      sessionStorage.removeItem("reset_otp_verified");

      navigate("/forgot-password/success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // ── Page bg: #f9fafb ────────────────────────────────────────────────────
    <div className="min-h-screen bg-[#f9fafb] flex flex-col">

      {/* ── Main centred area ── */}
      <div className="flex-1 flex items-center justify-center px-4 py-[32px]">

        {/* ── Auth card ── */}
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

            {/* Step indicator: ✓ — ✓ — 3 Reset — 4 */}
            <div className="flex items-center justify-center gap-[12px] w-full">

              {/* Step 1 — completed checkmark, opacity-50 */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6] shrink-0">
                  <img src={imgCheckIcon} alt="" className="w-[10.5px] h-[12px] object-contain" />
                </div>
              </div>

              {/* Connector — indigo */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#4f46e5] shrink-0" />

              {/* Step 2 — completed checkmark, opacity-50 */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6] shrink-0">
                  <img src={imgCheckIcon} alt="" className="w-[10.5px] h-[12px] object-contain" />
                </div>
              </div>

              {/* Connector — indigo */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#4f46e5] shrink-0" />

              {/* Step 3 — active */}
              <div className="flex items-center gap-[8px]">
                <div
                  className="w-[32px] h-[32px] rounded-full flex items-center justify-center shrink-0 bg-[#4f46e5] drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)]"
                >
                  <span
                    className="text-white text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >3</span>
                </div>
                <span
                  className="text-[#4f46e5] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >Reset</span>
              </div>

              {/* Connector — gray */}
              <div className="w-[32px] h-[2px] rounded-full bg-[#e5e7eb] shrink-0" />

              {/* Step 4 — inactive, opacity-50 */}
              <div className="opacity-50">
                <div className="w-[32px] h-[32px] rounded-full flex items-center justify-center border border-[#e5e7eb] bg-[#f3f4f6] shrink-0">
                  <span
                    className="text-[#9ca3af] text-[14px] font-semibold tracking-[-0.5px] leading-[20px]"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >4</span>
                </div>
              </div>
            </div>

            {/* Lock icon — blue tint box, 48×48 */}
            <div className="w-[48px] h-[48px] bg-[#eff6ff] border border-[#dbeafe] rounded-[12px] flex items-center justify-center drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)] shrink-0">
              <img src={imgLockIcon} alt="" className="w-[18px] h-[20px] object-contain" />
            </div>

            {/* Heading */}
            <p
              className="text-[#111827] text-[28px] font-bold tracking-[-0.7px] leading-[35px] text-center w-full"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Set new password
            </p>

            {/* Subtext */}
            <p
              className="text-[#6b7280] text-[15px] font-normal tracking-[-0.5px] leading-[25px] text-center px-[16px] w-full"
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              Your new password must be different from<br />
              previously used passwords.
            </p>
          </div>

          {/* ── Form ── */}
          <div className="flex flex-col gap-[24px] w-full">

            {/* Error */}
            {error && (
              <div className="bg-[#fef2f2] border border-[#fca5a5] text-[#dc2626] rounded-[12px] px-4 py-3 text-[13px] tracking-[-0.5px]" style={{ fontFamily: "Inter, sans-serif" }}>
                {error}
              </div>
            )}

            {/* New Password field */}
            <div className="flex flex-col gap-[8px] w-full">
              <label
                className="text-[#374151] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                New Password
              </label>
              <div className="relative w-full">
                <input
                  type={showNew ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError(null); }}
                  disabled={loading}
                  className={[
                    "w-full h-[53px] bg-[#f9fafb] border rounded-[14px]",
                    "pl-[16px] pr-[48px] py-[14px]",
                    "text-[#111827] text-[15px] font-normal tracking-[-0.5px] leading-[23px]",
                    "focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition",
                    "placeholder:text-[#9ca3af]",
                    "disabled:opacity-60",
                    "border-[#e5e7eb]",
                  ].join(" ")}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(p => !p)}
                  className="absolute right-[16px] top-[14.5px] flex items-center justify-center w-[18px] h-[18px]"
                >
                  <img src={imgEyeIcon} alt="" className="w-[18px] h-[16px] object-contain" />
                </button>
              </div>
            </div>

            {/* Password strength panel */}
            <div className="bg-[rgba(249,250,251,0.5)] border border-[#f3f4f6] rounded-[14px] p-[17px] flex flex-col gap-[12px] w-full">

              {/* Strength label row */}
              <div className="flex items-center justify-between w-full h-[16px]">
                <span
                  className="text-[#6b7280] text-[12px] font-medium tracking-[-0.5px] leading-[16px]"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  Password Strength
                </span>
                <span
                  className="text-[12px] font-semibold tracking-[-0.5px] leading-[16px]"
                  style={{ color: strengthLabel.color, fontFamily: "Inter, sans-serif" }}
                >
                  {newPw ? strengthLabel.text : "Weak"}
                </span>
              </div>

              {/* Strength bars — 4 bars */}
              <div className="flex items-center gap-[6px] w-full h-[6px]">
                {[0, 1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-[6px] rounded-full flex-1 transition-all duration-300"
                    style={{ backgroundColor: newPw ? getBarColor(i, score) : "#e5e7eb" }}
                  />
                ))}
              </div>

              {/* Requirements list */}
              <div className="flex flex-col gap-[8px] w-full">
                {[
                  { ok: strength.len,     label: "At least 8 characters" },
                  { ok: strength.upper,   label: "One uppercase letter" },
                  { ok: strength.number,  label: "One number" },
                  { ok: strength.special, label: "One special character (@$!%*?&)" },
                ].map(req => (
                  <div key={req.label} className="flex items-center gap-[8px] h-[20px]">
                    <img
                      src={imgReqIcon}
                      alt=""
                      className="w-[12px] h-[12px] object-contain shrink-0 transition-all"
                      style={{ opacity: req.ok ? 1 : 0.4 }}
                    />
                    <span
                      className="text-[14px] font-normal tracking-[-0.5px] leading-[20px] transition-colors"
                      style={{
                        color: req.ok ? "#16a34a" : "#6b7280",
                        fontFamily: "Inter, sans-serif",
                      }}
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password field */}
            <div className="flex flex-col gap-[8px] w-full">
              <label
                className="text-[#374151] text-[14px] font-medium tracking-[-0.5px] leading-[20px]"
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                Confirm Password
              </label>
              <div className="relative w-full">
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError(null); }}
                  disabled={loading}
                  className={[
                    "w-full h-[53px] bg-[#f9fafb] border rounded-[14px]",
                    "pl-[16px] pr-[48px] py-[14px]",
                    "text-[#111827] text-[15px] font-normal tracking-[-0.5px] leading-[23px]",
                    "focus:outline-none focus:border-[#4f46e5] focus:ring-1 focus:ring-[#4f46e5] transition",
                    "placeholder:text-[#9ca3af]",
                    "disabled:opacity-60",
                    confirmPw && confirmPw !== newPw ? "border-[#ef4444]" : "border-[#e5e7eb]",
                  ].join(" ")}
                  style={{ fontFamily: "Inter, sans-serif" }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(p => !p)}
                  className="absolute right-[16px] top-[14.5px] flex items-center justify-center w-[18px] h-[18px]"
                >
                  <img src={imgEyeIcon} alt="" className="w-[18px] h-[16px] object-contain" />
                </button>
              </div>
              {confirmPw && confirmPw !== newPw && (
                <p className="text-[#ef4444] text-[13px] tracking-[-0.5px]" style={{ fontFamily: "Inter, sans-serif" }}>
                  Passwords do not match.
                </p>
              )}
            </div>

            {/* Action group */}
            <div className="flex flex-col gap-[12px] pt-[16px] w-full">

              {/* Reset Password button — gradient, opacity-50 when disabled */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={[
                  "w-full h-[53px] rounded-[14px] flex items-center justify-center gap-[5px]",
                  "text-white text-[15px] font-semibold tracking-[-0.5px] leading-[23px]",
                  "drop-shadow-[0px_2px_2px_rgba(79,70,229,0.2),0px_4px_3px_rgba(79,70,229,0.2)]",
                  "transition hover:opacity-90 active:scale-[0.99]",
                  !isValid || loading ? "opacity-50 cursor-not-allowed" : "opacity-100",
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
                    Resetting…
                  </span>
                ) : (
                  <>
                    Reset Password&nbsp;
                    <img src={imgArrowIcon} alt="" className="w-[12px] h-[14px] object-contain opacity-80" />
                  </>
                )}
              </button>

              {/* Back to Login — white border button */}
              <Link
                to="/login"
                className={[
                  "w-full h-[53px] rounded-[14px] flex items-center justify-center",
                  "bg-white border border-[#e5e7eb]",
                  "text-[#374151] text-[15px] font-semibold tracking-[-0.5px] leading-[23px]",
                  "hover:bg-[#f9fafb] transition",
                ].join(" ")}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
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