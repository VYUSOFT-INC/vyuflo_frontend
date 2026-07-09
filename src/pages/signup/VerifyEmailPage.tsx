// // src/pages/signup/  
// import { useState, useRef, useEffect } from "react";
// import type { KeyboardEvent, ClipboardEvent } from "react";

// import imgLeftPanelBg from "../../assets/icons/left-panel-bg.svg";
// import imgGlobeIcon   from "../../assets/icons/globe-icon.svg";
// import imgLockIcon    from "../../assets/icons/lock-icon.svg";
// import { useNavigate } from 'react-router-dom';
// import { onboardingApi } from "../../api/onboarding.api";  // ← use shared axios instance

// interface AccountVerificationProps {
//   email?: string;
//   onSuccess?: (tokens: { access_token: string; refresh_token: string }) => void;
// }

// export default function AccountVerification({
//   email = sessionStorage.getItem("signup_email") ?? "",
//   onSuccess,
// }: AccountVerificationProps) {
//   const OTP_LENGTH = 6;
//   const navigate   = useNavigate();

//   const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(""));
//   const [loading, setLoading]         = useState(false);
//   const [error, setError]             = useState<string | null>(null);
//   const [success, setSuccess]         = useState(false);
//   const [resendTimer, setResendTimer] = useState(0);
//   const [resendMsg, setResendMsg]     = useState<string | null>(null);

//   const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

//   useEffect(() => { inputRefs.current[0]?.focus(); }, []);

//   useEffect(() => {
//     if (resendTimer <= 0) return;
//     const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
//     return () => clearTimeout(id);
//   }, [resendTimer]);

//   const otp        = digits.join("");
//   const isComplete = otp.length === OTP_LENGTH && digits.every((d) => d !== "");

//   function focusAt(index: number) {
//     inputRefs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
//   }

//   function handleChange(index: number, value: string) {
//     const char = value.replace(/\D/g, "").slice(-1);
//     const next = [...digits];
//     next[index] = char;
//     setDigits(next);
//     setError(null);
//     if (char && index < OTP_LENGTH - 1) focusAt(index + 1);
//   }

//   function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
//     if (e.key === "Backspace") {
//       if (digits[index]) {
//         const next = [...digits]; next[index] = ""; setDigits(next);
//       } else { focusAt(index - 1); }
//     } else if (e.key === "ArrowLeft")  { focusAt(index - 1); }
//       else if (e.key === "ArrowRight") { focusAt(index + 1); }
//   }

//   function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
//     e.preventDefault();
//     const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
//     if (!pasted) return;
//     const next = Array(OTP_LENGTH).fill("");
//     pasted.split("").forEach((c, i) => { next[i] = c; });
//     setDigits(next);
//     focusAt(Math.min(pasted.length, OTP_LENGTH - 1));
//     setError(null);
//   }

//   // ── Verify — now uses onboardingApi (shared axios, correct base URL, auth interceptor) ──
//   async function handleVerify() {
//     if (!isComplete) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const data = await onboardingApi.verifyEmail({ otp });
//       setSuccess(true);
//       onSuccess?.(data);
//       setTimeout(() => navigate("/signup/profile-setup"), 1200);
//     } catch (e: unknown) {
//       const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
//         ?.response?.data?.detail ?? (e instanceof Error ? e.message : "Something went wrong.");
//       setError(msg);
//       setDigits(Array(OTP_LENGTH).fill(""));
//       setTimeout(() => focusAt(0), 50);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // ── Resend — now uses onboardingApi ──────────────────────────────────────────
//   async function handleResend() {
//     if (resendTimer > 0) return;
//     setResendMsg(null);
//     setError(null);
//     try {
//       await onboardingApi.resendOtp();
//       setResendTimer(60);
//       setResendMsg("Code sent! Check your inbox.");
//       setDigits(Array(OTP_LENGTH).fill(""));
//       setTimeout(() => focusAt(0), 50);
//     } catch (e: unknown) {
//       const msg = (e as { response?: { data?: { detail?: string } }; message?: string })
//         ?.response?.data?.detail ?? (e instanceof Error ? e.message : "Failed to resend code.");
//       setError(msg);
//     }
//   }

//   return (
//     <div className="flex min-h-screen w-full overflow-hidden bg-gray-50" style={{ fontFamily: "Inter, sans-serif" }}>

//       {/* ── LEFT PANEL — hidden on mobile, shown md+ ── */}
//       <div
//         className="hidden md:flex relative flex-1 h-screen items-center justify-center overflow-hidden sticky top-0"
//         style={{ background: "linear-gradient(90deg, #312e81 0%, #312e81 100%)" }}
//       >
//         <img
//           src={imgLeftPanelBg}
//           alt=""
//           className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
//         />
//         <div
//           className="absolute inset-0 pointer-events-none"
//           style={{
//             background: `
//               radial-gradient(ellipse 100% 70% at 0% 0%, rgba(16,15,21,0.9) 0%, rgba(16,15,21,0) 60%),
//               radial-gradient(ellipse 50% 70% at 50% 0%, rgba(47,62,106,0.8) 0%, rgba(47,62,106,0) 60%),
//               radial-gradient(ellipse 100% 70% at 100% 0%, rgba(114,39,65,0.7) 0%, rgba(114,39,65,0) 60%)
//             `,
//           }}
//         />
//         <div className="relative z-10 flex flex-col items-center gap-4 max-w-[512px] px-12">
//           <div className="flex items-center justify-center w-full mb-2">
//             <div
//               className="flex items-center justify-center w-24 h-24 rounded-full border border-white/20"
//               style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)" }}
//             >
//               <img src={imgGlobeIcon} alt="Globe" className="w-9 h-9 opacity-90" />
//             </div>
//           </div>
//           <h2 className="text-white text-center font-bold text-[30px] leading-[36px]">
//             Global Reach, Local Touch
//           </h2>
//           <p className="text-[#e0e7ff] text-[18px] text-center leading-[29px] font-normal">
//             Secure your Vyuflo account to unlock seamless international processing and dedicated support.
//           </p>
//         </div>
//       </div>

//       {/* ── RIGHT PANEL ── */}
//       <div className="flex flex-1 flex-col min-h-screen bg-white relative">

//         {/* Step indicator */}
//         <div className="absolute top-0 right-0 p-6 sm:p-8 flex items-center z-10">
//           <span className="text-[#9ca3af] text-[14px] font-medium leading-5 mr-2">Step 3 of 3</span>
//           <div className="flex items-center gap-1 ml-2">
//             {[0, 1, 2].map((i) => (
//               <div key={i} className="h-[6px] w-8 rounded-full bg-indigo-600" />
//             ))}
//           </div>
//         </div>

//         {/* Main content — centered, scrollable */}
//         <div className="flex flex-1 flex-col items-start justify-center w-full px-6 sm:px-12 lg:px-24 xl:px-32 pt-20 pb-28">

//           {/* Heading */}
//           <div className="flex flex-col w-full pb-8 sm:pb-10">
//             <h1 className="text-[#111827] text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.8px] mb-3">
//               Check Your Email
//             </h1>
//             <p className="text-[#6b7280] text-[15px] sm:text-[16px] font-normal leading-6">
//               We've sent a 6-digit verification code to
//             </p>
//             <p className="text-[#111827] text-[15px] sm:text-[16px] font-medium leading-6 break-all">
//               {email}
//             </p>
//           </div>

//           {/* OTP inputs — responsive: flexbox instead of absolute positioning */}
//           <div className="flex gap-2 sm:gap-3 w-full max-w-sm mb-6">
//             {Array.from({ length: OTP_LENGTH }).map((_, i) => (
//               <input
//                 key={i}
//                 ref={(el) => { inputRefs.current[i] = el; }}
//                 type="text"
//                 inputMode="numeric"
//                 maxLength={1}
//                 value={digits[i]}
//                 onChange={(e) => handleChange(i, e.target.value)}
//                 onKeyDown={(e) => handleKeyDown(i, e)}
//                 onPaste={handlePaste}
//                 disabled={loading || success}
//                 className={[
//                   "flex-1 min-w-0 aspect-square rounded-full border text-center",
//                   "text-[20px] sm:text-[24px] font-semibold text-[#111827]",
//                   "bg-[#f9fafb] outline-none transition-all duration-150",
//                   "disabled:opacity-60 disabled:cursor-not-allowed",
//                   error
//                     ? "border-red-400 bg-red-50"
//                     : success
//                     ? "border-green-400 bg-green-50"
//                     : digits[i]
//                     ? "border-indigo-600 bg-white"
//                     : "border-[#e5e7eb]",
//                   "focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20",
//                 ].join(" ")}
//               />
//             ))}
//           </div>

//           {/* Error / success messages */}
//           {error && (
//             <p className="text-red-500 text-sm mb-4">{error}</p>
//           )}
//           {resendMsg && !error && (
//             <p className="text-green-600 text-sm mb-4">{resendMsg}</p>
//           )}

//           {/* Verify button */}
//           <button
//             type="button"
//             onClick={handleVerify}
//             disabled={!isComplete || loading || success}
//             className={[
//               "flex items-center justify-center w-full max-w-sm py-4 rounded-xl",
//               "text-white text-[15px] font-medium leading-[22px] text-center",
//               "drop-shadow-sm transition-all duration-150",
//               "disabled:opacity-50 disabled:cursor-not-allowed",
//               success ? "bg-green-500" : "bg-indigo-600 hover:bg-indigo-800 active:scale-[0.99]",
//             ].join(" ")}
//           >
//             {success ? (
//               <span className="flex items-center gap-2">
//                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
//                 </svg>
//                 Verified!
//               </span>
//             ) : loading ? (
//               <span className="flex items-center gap-2">
//                 <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
//                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
//                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
//                 </svg>
//                 Verifying…
//               </span>
//             ) : (
//               "Verify Email"
//             )}
//           </button>

//           {/* Resend row */}
//           <div className="flex items-center flex-wrap gap-1 pt-6 w-full max-w-sm">
//             <span className="text-[#6b7280] text-[14px] font-normal leading-5">
//               Didn't receive the code?
//             </span>
//             <button
//               type="button"
//               onClick={handleResend}
//               disabled={resendTimer > 0}
//               className={[
//                 "text-[14px] font-medium leading-5",
//                 resendTimer > 0
//                   ? "text-[#9ca3af] cursor-not-allowed"
//                   : "text-indigo-600 hover:underline cursor-pointer",
//               ].join(" ")}
//             >
//               {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Click to resend"}
//             </button>
//           </div>
//         </div>

//         {/* Footer note */}
//         <div className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 lg:px-24 xl:px-32 pb-6 sm:pb-8">
//           <div className="border-t border-[#f3f4f6] pt-5 flex items-start gap-2">
//             <img src={imgLockIcon} alt="" className="w-[13px] h-[13px] mt-[3px] shrink-0" />
//             <p className="text-[#9ca3af] text-[13px] leading-[19px] font-normal">
//               What happens next? Once verified, you'll be redirected to your dashboard to complete your profile.
//             </p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


import { useState, useRef, useEffect } from "react";
import type { KeyboardEvent, ClipboardEvent } from "react";

import imgLeftPanelBg from "../../assets/icons/left-panel-bg.svg";
import imgGlobeIcon   from "../../assets/icons/globe-icon.svg";
import imgLockIcon    from "../../assets/icons/lock-icon.svg";
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from "../../api/onboarding.api";
import { StepBar } from "../public/Signup";

interface AccountVerificationProps {
  email?: string;
  onSuccess?: (tokens: { access_token: string; refresh_token: string }) => void;
}

export default function AccountVerification({
  email = sessionStorage.getItem("signup_email") ?? "",
  onSuccess,
}: AccountVerificationProps) {
  const OTP_LENGTH = 6;
  const navigate   = useNavigate();

  const [digits, setDigits]           = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendMsg, setResendMsg]     = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const otp        = digits.join("");
  const isComplete = otp.length === OTP_LENGTH && digits.every((d) => d !== "");

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
    if (!isComplete) return;
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
      setResendTimer(60);
      setResendMsg("Code sent! Check your inbox.");
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

      {/* ── LEFT PANEL — hidden on mobile, shown md+ ── */}
      <div
        className="hidden md:flex relative flex-1 h-screen items-center justify-center overflow-hidden sticky top-0"
        style={{ background: "linear-gradient(90deg, #312e81 0%, #312e81 100%)" }}
      >
        <img
          src={imgLeftPanelBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 100% 70% at 0% 0%, rgba(16,15,21,0.9) 0%, rgba(16,15,21,0) 60%),
              radial-gradient(ellipse 50% 70% at 50% 0%, rgba(47,62,106,0.8) 0%, rgba(47,62,106,0) 60%),
              radial-gradient(ellipse 100% 70% at 100% 0%, rgba(114,39,65,0.7) 0%, rgba(114,39,65,0) 60%)
            `,
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4 max-w-[512px] px-12">
          <div className="flex items-center justify-center w-full mb-2">
            <div
              className="flex items-center justify-center w-24 h-24 rounded-full border border-white/20"
              style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(6px)" }}
            >
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
      <div className="flex flex-1 flex-col min-h-screen bg-white">

        {/* ── StepBar pinned to top ── */}
        <StepBar current={2} />

        {/* Main content */}
        <div className="flex flex-1 flex-col items-start justify-center w-full px-6 sm:px-12 lg:px-24 xl:px-32 pt-10 pb-28">

          {/* Heading */}
          <div className="flex flex-col w-full pb-8 sm:pb-10">
            <h1 className="text-[#111827] text-[26px] sm:text-[32px] font-bold leading-tight tracking-[-0.8px] mb-3">
              Check Your Email
            </h1>
            <p className="text-[#6b7280] text-[15px] sm:text-[16px] font-normal leading-6">
              We've sent a 6-digit verification code to
            </p>
            <p className="text-[#111827] text-[15px] sm:text-[16px] font-medium leading-6 break-all">
              {email}
            </p>
          </div>

          {/* OTP inputs */}
          <div className="flex gap-2 sm:gap-3 w-full max-w-sm mb-6">
            {Array.from({ length: OTP_LENGTH }).map((_, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digits[i]}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onPaste={handlePaste}
                disabled={loading || success}
                className={[
                  "flex-1 min-w-0 aspect-square rounded-full border text-center",
                  "text-[20px] sm:text-[24px] font-semibold text-[#111827]",
                  "bg-[#f9fafb] outline-none transition-all duration-150",
                  "disabled:opacity-60 disabled:cursor-not-allowed",
                  error
                    ? "border-red-400 bg-red-50"
                    : success
                    ? "border-green-400 bg-green-50"
                    : digits[i]
                    ? "border-indigo-600 bg-white"
                    : "border-[#e5e7eb]",
                  "focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20",
                ].join(" ")}
              />
            ))}
          </div>

          {/* Error / success messages */}
          {error && (
            <p className="text-red-500 text-sm mb-4">{error}</p>
          )}
          {resendMsg && !error && (
            <p className="text-green-600 text-sm mb-4">{resendMsg}</p>
          )}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerify}
            disabled={!isComplete || loading || success}
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
            ) : (
              "Verify Email"
            )}
          </button>

          {/* Resend row */}
          <div className="flex items-center flex-wrap gap-1 pt-6 w-full max-w-sm">
            <span className="text-[#6b7280] text-[14px] font-normal leading-5">
              Didn't receive the code?
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendTimer > 0}
              className={[
                "text-[14px] font-medium leading-5",
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
        <div className="px-6 sm:px-12 lg:px-24 xl:px-32 pb-6 sm:pb-8">
          <div className="border-t border-[#f3f4f6] pt-5 flex items-start gap-2">
            <img src={imgLockIcon} alt="" className="w-[13px] h-[13px] mt-[3px] shrink-0" />
            <p className="text-[#9ca3af] text-[13px] leading-[19px] font-normal">
              What happens next? Once verified, you'll be redirected to your dashboard to complete your profile.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}