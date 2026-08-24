// src/pages/public/AcceptInvitePage.tsx
//
// PUBLIC route: /accept-invite?token=...  OR  /accept-invite?code=...
// Lives OUTSIDE DashboardLayout — no sidebar, no auth guard.
//
// REDESIGNED: previously branched on "is there a browser session" (which
// could belong to a completely unrelated logged-in person, and caused
// real confusion in testing). Now branches on account_exists returned by
// GET /hr/validate — does an account already exist for the INVITED
// email, regardless of who (if anyone) happens to be logged into this
// browser. New-user and existing-user flows are public endpoints that
// create/merge and log the person in directly, replacing the old
// multi-step "redirect to /signup, verify email, set up profile, come
// back here" journey with a single form.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Building2, ArrowRight, ShieldCheck,
  X, XCircle, Info, Mail, Lock,
} from 'lucide-react';

import {
  useValidateInvite, useAcceptInviteNewUser, useMergeExistingUser,
} from '../../hooks/hr/useInvitations';
import { useAddPersonalEmail, useVerifyPersonalEmail } from '../../hooks/auth/usePersonalEmail';
import { useAuthStore } from '../../store/authStore';
import { writeUiSessionFromLogin } from '../../utils/uiSession';
import { getMeApi } from '../../api/auth/auth.api';
import type { AcceptInviteAuthResponse } from '../../types/hr/invitation.types';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────────────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────────────────────────────────────
    
type ToastTone = 'success' | 'error' | 'warning' | 'info';
type ToastItem = { id: string; title: string; message?: string; tone: ToastTone };

function ToastStack({ items, onDismiss }: { items: ToastItem[]; onDismiss: (id: string) => void }) {
  const tone: Record<ToastTone, { icon: ReactNode; box: string; iconBg: string; iconColor: string }> = {
    success: { icon: <CheckCircle2 size={16} />, box: 'border-[#bbf7d0] bg-[#f0fdf4]', iconBg: 'bg-[#dcfce7]', iconColor: 'text-[#15803d]' },
    error:   { icon: <XCircle size={16} />,      box: 'border-[#fecaca] bg-[#fef2f2]', iconBg: 'bg-[#fee2e2]', iconColor: 'text-[#dc2626]' },
    warning: { icon: <AlertTriangle size={16} />,box: 'border-[#fde68a] bg-[#fffbeb]', iconBg: 'bg-[#fef3c7]', iconColor: 'text-[#c2410c]' },
    info:    { icon: <Info size={16} />,         box: 'border-indigo-200 bg-indigo-50', iconBg: 'bg-indigo-100', iconColor: 'text-indigo-800' },
  };
  return (
    <div className="fixed right-[16px] top-[16px] z-[70] flex flex-col gap-[10px] w-full max-w-[360px]">
      {items.map(t => {
        const meta = tone[t.tone];
        return (
          <div key={t.id} className={`rounded-[14px] border p-[14px] shadow-lg ${meta.box}`}>
            <div className="flex items-start gap-[10px]">
              <div className={`size-[32px] rounded-full flex items-center justify-center shrink-0 ${meta.iconBg} ${meta.iconColor}`}>
                {meta.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[#0f172a]">{t.title}</p>
                {t.message && <p className="text-[12px] text-[#64748b] mt-[2px]">{t.message}</p>}
              </div>
              <button onClick={() => onDismiss(t.id)} className="text-[#94a3b8] hover:text-[#475569]">
                <X size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell
// ─────────────────────────────────────────────────────────────────────────────

function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col"
         style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%)', fontFamily: 'Inter, sans-serif' }}>
      <header className="w-full px-[24px] py-[20px] flex items-center justify-between">
        <Link to="/" className="flex items-center gap-[10px]">
          <div className="size-[36px] rounded-[10px] flex items-center justify-center text-white"
               style={{ backgroundImage: PRIMARY_GRADIENT }}>
            <ShieldCheck size={18} />
          </div>
          <span className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px]">Vyuflo</span>
        </Link>
        <a href="mailto:support@vyuflo.com"
          className="text-[13px] font-medium text-[#64748b] tracking-[-0.5px] hover:text-[#334155]">
          Need help?
        </a>
      </header>
      <main className="flex-1 flex items-center justify-center px-[16px] py-[24px]">
        <div className="w-full max-w-[480px]">{children}</div>
      </main>
      <footer className="w-full px-[24px] py-[20px] flex items-center justify-center gap-[20px] text-[12px] text-[#94a3b8] tracking-[-0.5px]">
        <Link to="/privacy" className="hover:text-[#64748b]">Privacy</Link>
        <span>·</span>
        <Link to="/terms" className="hover:text-[#64748b]">Terms</Link>
        <span>·</span>
        <span>© 2026 Vyuflo Inc.</span>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// State cards
// ─────────────────────────────────────────────────────────────────────────────

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[20px] shadow-[0px_4px_24px_rgba(15,23,42,0.06)] p-[28px] sm:p-[36px]">
      {children}
    </div>
  );
}

function ValidatingCard() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full bg-indigo-50 flex items-center justify-center mb-[20px]">
          <svg className="w-7 h-7 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">Verifying your invitation</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] max-w-[320px]">
          Hold on while we check the link you opened.
        </p>
      </div>
    </Card>
  );
}

function NoTokenCard() {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full bg-[#fff7ed] flex items-center justify-center mb-[20px]">
          <AlertTriangle size={28} className="text-[#ea580c]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">No invitation found</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
          This page expects an invitation token or code in the URL. If your HR sent you a link, open
          it directly from your email or message.
        </p>
        <Link to="/login"
          className="mt-[24px] h-[42px] px-[20px] rounded-[10px] inline-flex items-center justify-center
                     bg-white border border-[#e2e8f0] text-[#334155] text-[13px] font-semibold tracking-[-0.5px]
                     hover:bg-[#f8fafc] transition">
          Go to Login
        </Link>
      </div>
    </Card>
  );
}

function InvalidCard({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full bg-[#fef2f2] flex items-center justify-center mb-[20px]">
          <XCircle size={28} className="text-[#dc2626]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">Invitation not valid</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px] max-w-[360px]">
          {message || 'This invitation may have expired, been revoked, or already been used. Ask your HR to send a fresh one.'}
        </p>
        <div className="mt-[24px] flex flex-col sm:flex-row gap-[10px]">
          {onRetry && (
            <button onClick={onRetry}
              className="h-[42px] px-[20px] rounded-[10px] bg-white border border-[#e2e8f0]
                         text-[#334155] text-[13px] font-semibold tracking-[-0.5px] hover:bg-[#f8fafc] transition">
              Try Again
            </button>
          )}
          <Link to="/login"
            className="h-[42px] px-[20px] rounded-[10px] inline-flex items-center justify-center text-white
                       text-[13px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            Go to Login
          </Link>
        </div>
      </div>
    </Card>
  );
}


function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">{children}</label>;
}

const inputClass = "h-[46px] rounded-[12px] border border-[#e2e8f0] px-[14px] text-[14px] text-[#0f172a] " +
  "tracking-[-0.5px] placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-[#c7d2fe] " +
  "focus:border-[#a5b4fc] transition disabled:bg-[#f8fafc] disabled:text-[#94a3b8]";

function PrimaryButton({ onClick, disabled, loading, children }: {
  onClick: () => void; disabled?: boolean; loading?: boolean; children: ReactNode;
}) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className="h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px] text-white
                 text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98]
                 transition disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ backgroundImage: PRIMARY_GRADIENT }}>
      {loading ? (
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : children}
    </button>
  );
}

// ── NEW — no account exists for the invited email. Creates one, links
// it, and logs the person in, all in one submit.
function NewUserSignupCard({
  companyName, hrName, invitedEmail, requiresPassport, loading, error, onSubmit,
}: {
  companyName: string; hrName?: string; invitedEmail?: string;
  requiresPassport: boolean; loading: boolean; error: string | null;
  onSubmit: (fields: {
    firstName: string; lastName: string; email: string; otherEmail: string;
    password: string; passportNumber: string; termsAccepted: boolean;
  }) => void;
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [otherEmail, setOtherEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);

  const email = invitedEmail ?? '';
  const otherEmailValid = !otherEmail.trim() || EMAIL_RE.test(otherEmail.trim());

  const canSubmit =
    firstName.trim().length > 0 && lastName.trim().length > 0 &&
    password.length >= 8 && termsAccepted && otherEmailValid &&
    (!requiresPassport || passportNumber.trim().length > 0);

  return (
    <Card>
      <div className="flex flex-col">
        <div className="flex items-center justify-center mb-[20px]">
          <div className="size-[64px] rounded-full flex items-center justify-center text-white"
               style={{ backgroundImage: PRIMARY_GRADIENT }}>
            <Building2 size={28} />
          </div>
        </div>

        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px] text-center">
          Join <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] text-center mt-[6px] leading-[22px]">
          {hrName ? `${hrName} from ${companyName}` : companyName} invited you. Create your account to get started —
          it only takes a minute.
        </p>

        <div className="mt-[20px] flex flex-col gap-[12px]">
          <div className="grid grid-cols-2 gap-[10px]">
            <div className="flex flex-col gap-[6px]">
              <FieldLabel>First Name</FieldLabel>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <FieldLabel>Last Name</FieldLabel>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel>Email</FieldLabel>
            <input value={email} disabled className={inputClass} />
            <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">This is the email your invitation was sent to.</p>
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel>Personal Email <span className="text-[#94a3b8] normal-case font-normal">(optional backup login)</span></FieldLabel>
            <input value={otherEmail} onChange={e => setOtherEmail(e.target.value)}
              placeholder="you@personal-email.com" className={inputClass} />
            {!otherEmailValid && <p className="text-[11px] text-[#dc2626] tracking-[-0.5px]">That doesn't look like a valid email.</p>}
            <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] leading-[16px]">
              Keeps you signed in even if {companyName} later removes you.
            </p>
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel>Password</FieldLabel>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters" className={inputClass} />
          </div>

          {requiresPassport && (
            <div className="flex flex-col gap-[6px]">
              <FieldLabel>Confirm Your Passport Number</FieldLabel>
              <input value={passportNumber} onChange={e => setPassportNumber(e.target.value)}
                placeholder="Enter your passport number" className={inputClass} />
            </div>
          )}

          <label className="flex items-start gap-[8px] mt-[4px] cursor-pointer">
            <input type="checkbox" checked={termsAccepted} onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-[3px] size-[16px] accent-indigo-600" />
            <span className="text-[12px] text-[#64748b] tracking-[-0.5px] leading-[17px]">
              I agree to Vyuflo's Terms of Service and Privacy Policy, and to share my immigration case
              details with {companyName}'s HR team.
            </span>
          </label>
        </div>

        {error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px] mt-[14px]">{error}</p>}

        <div className="mt-[20px]">
          <PrimaryButton
            onClick={() => onSubmit({ firstName, lastName, email, otherEmail, password, passportNumber, termsAccepted })}
            disabled={!canSubmit} loading={loading}>
            <ArrowRight size={16} /> Create Account & Join
          </PrimaryButton>
        </div>
      </div>
    </Card>
  );
}

// ── NEW — an account already exists for the invited email. Confirms
// identity via a one-time code instead of a password, then merges the
// invite into that existing account and logs the person in.
function ExistingUserMergeCard({
  companyName, hrName, invitedEmail, requiresPassport,
  requestLoading, confirmLoading, error, otpSent,
  onRequestOtp, onConfirm,
}: {
  companyName: string; hrName?: string; invitedEmail?: string; requiresPassport: boolean;
  requestLoading: boolean; confirmLoading: boolean; error: string | null; otpSent: boolean;
  onRequestOtp: (loginEmail: string) => void;
  onConfirm: (fields: { loginEmail: string; otpCode: string; otherEmail: string; passportNumber: string }) => void;
}) {
  const [loginEmail, setLoginEmail] = useState(invitedEmail ?? '');
  const [otpCode, setOtpCode] = useState('');
  const [otherEmail, setOtherEmail] = useState('');
  const [passportNumber, setPassportNumber] = useState('');

  const otherEmailValid = !otherEmail.trim() || EMAIL_RE.test(otherEmail.trim());
  const canRequest = EMAIL_RE.test(loginEmail.trim()) && !requestLoading;
  const canConfirm = otpCode.trim().length === 6 && otherEmailValid &&
    (!requiresPassport || passportNumber.trim().length > 0);

  return (
    <Card>
      <div className="flex flex-col">
        <div className="flex items-center justify-center mb-[20px]">
          <div className="size-[64px] rounded-full flex items-center justify-center text-white"
               style={{ backgroundImage: PRIMARY_GRADIENT }}>
            <Building2 size={28} />
          </div>
        </div>

        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px] text-center">
          Join <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] text-center mt-[6px] leading-[22px]">
          {hrName ? `${hrName} from ${companyName}` : companyName} invited you, and we found an existing
          Vyuflo account for this email. Confirm it's you with a one-time code — no password needed.
        </p>

        {!otpSent ? (
          <div className="mt-[20px] flex flex-col gap-[12px]">
            <div className="flex flex-col gap-[6px]">
              <FieldLabel>Your Account Email</FieldLabel>
              <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className={inputClass} />
              <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">
                We'll send a verification code here.
              </p>
            </div>

            {error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{error}</p>}

            <PrimaryButton onClick={() => onRequestOtp(loginEmail.trim())} disabled={!canRequest} loading={requestLoading}>
              <Mail size={16} /> Send Verification Code
            </PrimaryButton>
          </div>
        ) : (
          <div className="mt-[20px] flex flex-col gap-[12px]">
            <div className="flex flex-col gap-[6px]">
              <FieldLabel>Verification Code</FieldLabel>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code" inputMode="numeric" className={inputClass} />
              <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">
                Sent to {loginEmail}. It expires in 10 minutes.
              </p>
            </div>

            {requiresPassport && (
              <div className="flex flex-col gap-[6px]">
                <FieldLabel>Confirm Your Passport Number</FieldLabel>
                <input value={passportNumber} onChange={e => setPassportNumber(e.target.value)}
                  placeholder="Enter your passport number" className={inputClass} />
              </div>
            )}

            <div className="flex flex-col gap-[6px]">
              <FieldLabel>Personal Email <span className="text-[#94a3b8] normal-case font-normal">(optional, if you don't already have one)</span></FieldLabel>
              <input value={otherEmail} onChange={e => setOtherEmail(e.target.value)}
                placeholder="you@personal-email.com" className={inputClass} />
              {!otherEmailValid && <p className="text-[11px] text-[#dc2626] tracking-[-0.5px]">That doesn't look like a valid email.</p>}
            </div>

            {error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{error}</p>}

            <PrimaryButton
              onClick={() => onConfirm({ loginEmail, otpCode: otpCode.trim(), otherEmail, passportNumber })}
              disabled={!canConfirm} loading={confirmLoading}>
              <Lock size={16} /> Confirm & Link Account
            </PrimaryButton>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Shown right after acceptance, only when needs_personal_email=true
// (authenticated-accept path only — the new-user/existing-user flows
// already collect the personal email up front, so they skip this step).
// TWO-STEP: enter email → send code, then enter code → verified. Pure
// OTP, no magic link — matches the existing-user merge flow's model.
function AddPersonalEmailCard({
  companyName, onSkip, onVerified,
}: {
  companyName: string;
  onSkip: () => void;
  onVerified: () => void;
}) {
  const { addEmail, loading: sending, error: sendError } = useAddPersonalEmail();
  const { verify, loading: verifying, error: verifyError } = useVerifyPersonalEmail();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const emailValid = EMAIL_RE.test(email.trim());

  const handleSend = async () => {
    if (!emailValid) return;
    const ok = await addEmail(email.trim());
    if (ok) setCodeSent(true);
  };

  const handleVerify = async () => {
    if (otpCode.trim().length !== 6) return;
    const ok = await verify(otpCode.trim());
    if (ok) onVerified();
  };

  return (
    <Card>
      <div className="flex flex-col">
        <div className="flex items-center justify-center mb-[20px]">
          <div className="size-[64px] rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Mail size={28} />
          </div>
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px] text-center">
          Add a personal email
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] text-center mt-[6px] leading-[22px]">
          You joined <span className="font-semibold text-[#0f172a]">{companyName}</span> using your
          work email. Add a personal email so you can still access your documents and case history
          if you ever leave {companyName}.
        </p>

        {!codeSent ? (
          <>
            <div className="mt-[20px] flex flex-col gap-[8px]">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') void handleSend(); }}
                placeholder="you@personal-email.com" className={inputClass} />
              {sendError && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{sendError}</p>}
            </div>

            <div className="mt-[20px] flex flex-col gap-[10px]">
              <PrimaryButton onClick={() => void handleSend()} disabled={!emailValid} loading={sending}>
                Send Verification Code
              </PrimaryButton>
              <button onClick={onSkip} disabled={sending}
                className="h-[42px] rounded-[12px] inline-flex items-center justify-center
                           text-[#94a3b8] text-[13px] font-medium tracking-[-0.5px] hover:text-[#475569]
                           transition disabled:opacity-60">
                Skip for now
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-[20px] flex flex-col gap-[8px]">
              <FieldLabel>Verification Code</FieldLabel>
              <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={e => { if (e.key === 'Enter') void handleVerify(); }}
                placeholder="6-digit code" inputMode="numeric" className={inputClass} />
              <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px]">
                Sent to {email}. It expires in 15 minutes.
              </p>
              {verifyError && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{verifyError}</p>}
            </div>

            <div className="mt-[20px] flex flex-col gap-[10px]">
              <PrimaryButton onClick={() => void handleVerify()} disabled={otpCode.trim().length !== 6} loading={verifying}>
                <Lock size={16} /> Confirm Code
              </PrimaryButton>
              <button onClick={onSkip} disabled={verifying}
                className="h-[42px] rounded-[12px] inline-flex items-center justify-center
                           text-[#94a3b8] text-[13px] font-medium tracking-[-0.5px] hover:text-[#475569]
                           transition disabled:opacity-60">
                Skip for now
              </button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

// ── Used for the SAME OTP confirmation when a personal email was already
// collected up front (new-user/existing-user forms) — email is already
// known, so this only needs the code.
function VerifyPersonalEmailOtpCard({
  email, onVerified, onSkip,
}: {
  email: string;
  onVerified: () => void;
  onSkip: () => void;
}) {
  const { verify, loading, error } = useVerifyPersonalEmail();
  const [otpCode, setOtpCode] = useState('');

  const handleVerify = async () => {
    if (otpCode.trim().length !== 6) return;
    const ok = await verify(otpCode.trim());
    if (ok) onVerified();
  };

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-[20px]">
          <Mail size={28} />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">Verify your personal email</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px] max-w-[340px]">
          We sent a 6-digit code to <span className="font-semibold text-[#0f172a]">{email}</span>.
        </p>

        <div className="mt-[20px] w-full flex flex-col gap-[8px] text-left">
          <FieldLabel>Verification Code</FieldLabel>
          <input value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            onKeyDown={e => { if (e.key === 'Enter') void handleVerify(); }}
            placeholder="6-digit code" inputMode="numeric" className={inputClass} />
          {error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px]">{error}</p>}
        </div>

        <div className="mt-[20px] w-full flex flex-col gap-[10px]">
          <PrimaryButton onClick={() => void handleVerify()} disabled={otpCode.trim().length !== 6} loading={loading}>
            <Lock size={16} /> Confirm Code
          </PrimaryButton>
          <button onClick={onSkip} disabled={loading}
            className="h-[42px] rounded-[12px] inline-flex items-center justify-center
                       text-[#94a3b8] text-[13px] font-medium tracking-[-0.5px] hover:text-[#475569]
                       transition disabled:opacity-60">
            I'll verify later
          </button>
        </div>
      </div>
    </Card>
  );
}

function AcceptedCard({ companyName, countdown }: { companyName: string; countdown: number }) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[72px] rounded-full bg-[#f0fdf4] flex items-center justify-center mb-[20px]">
          <CheckCircle2 size={36} className="text-[#16a34a]" />
        </div>
        <h1 className="text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">You're all set!</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px] max-w-[360px]">
          Welcome to <span className="font-semibold text-[#0f172a]">{companyName}</span>.
          Your account is now linked and ready to use.
        </p>
        <div className="mt-[24px] w-full">
          <Link to="/dashboard"
            className="h-[46px] w-full rounded-[12px] inline-flex items-center justify-center gap-[8px] text-white
                       text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            Go to Dashboard <ArrowRight size={16} />
          </Link>
          <p className="text-[12px] text-[#94a3b8] tracking-[-0.5px] mt-[10px]">
            Redirecting automatically in {countdown}s...
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

type PersonalEmailPhase = 'idle' | 'prompt' | 'sent' | 'done';

/**
 * After a new-user or existing-user merge call returns tokens, this
 * establishes the session the same way normal login does: sets the
 * Zustand auth store immediately (so isAuthenticated flips true right
 * away), then best-effort fetches the full profile via GET /auth/me to
 * populate the ui_session cookie (theme color, name, etc. for the rest
 * of the app). If that follow-up call fails, the person is still fully
 * authenticated via the Zustand store — they just might see default
 * theming until their next page load.
 */
async function establishSessionFromAuthResponse(authRes: AcceptInviteAuthResponse): Promise<void> {
  useAuthStore.getState().setAuth({ access_token: authRes.access_token, roles: authRes.roles });
  try {
    const me = await getMeApi();
    writeUiSessionFromLogin({
      user: { id: me.id, first_name: me.first_name, last_name: me.last_name, email: me.email },
      roles: authRes.roles,
      theme_color: null,
      tour_employee_seen: false,
      tour_hr_seen: false,
      tour_attorney_seen: false,
      tour_admin_seen: false,
    });
  } catch {
    // Non-fatal — Zustand auth already works; ui_session will catch up
    // on the next full page load via the normal profile-fetch flow.
  }
}

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token') ?? undefined;
  const code  = params.get('code')  ?? undefined;
  const hasInvite = !!(token || code);

  // NOTE: no session/isLoggedIn check here — deliberately. The decision
  // between "existing account" and "new account" is always based on
  // account_exists from the backend, never on whether this browser
  // happens to have a session (which could belong to a different
  // account entirely and hijack the flow).

  const validate = useValidateInvite(token, code);
  const newUserHook = useAcceptInviteNewUser();
  const mergeHook = useMergeExistingUser();

  const [personalEmailPhase, setPersonalEmailPhase] = useState<PersonalEmailPhase>('idle');
  const [acceptedCompany, setAcceptedCompany] = useState<string | null>(null);
  // Tracks which email is awaiting OTP confirmation when it was provided
  // up front (new-user/existing-user forms) — the 'prompt' phase doesn't
  // need this since AddPersonalEmailCard collects the email itself.
  const [pendingPersonalEmail, setPendingPersonalEmail] = useState<string | null>(null);

  const [toastItems, setToastItems] = useState<ToastItem[]>([]);
  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems(prev => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => setToastItems(prev => prev.filter(x => x.id !== id)), 3500);
  };
  const dismissToast = (id: string) => setToastItems(prev => prev.filter(x => x.id !== id));

  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (personalEmailPhase !== 'done') return;
    if (countdown <= 0) { navigate('/dashboard'); return; }
    const t = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [personalEmailPhase, countdown, navigate]);

  // ── NEW — brand-new account ────────────────────────────────────────────────
  const handleNewUserSubmit = async (fields: {
    firstName: string; lastName: string; email: string; otherEmail: string;
    password: string; passportNumber: string; termsAccepted: boolean;
  }) => {
    const res = await newUserHook.acceptAsNewUser({
      invite_token: token, invite_code: code,
      first_name: fields.firstName, last_name: fields.lastName, email: fields.email,
      other_email: fields.otherEmail.trim() || undefined,
      password: fields.password,
      passport_number: fields.passportNumber || undefined,
      terms_accepted: fields.termsAccepted,
    });
    if (res) {
      await establishSessionFromAuthResponse(res);
      pushToast('success', 'Welcome aboard!', `You're now linked to ${res.company_name}.`);
      setAcceptedCompany(res.company_name);
      // If a personal email was already provided in this same form, its
      // verification link is already in flight — go straight to the
      // "check your inbox" confirmation. Otherwise, if the account's
      // primary email matches the employer's domain, still ask now —
      // FIXED: previously this always skipped straight to 'done' when
      // the optional field was left blank, even for domain-matched
      // emails, meaning the prompt could be silently skipped forever.
      if (res.linked_email) {
        setPendingPersonalEmail(res.linked_email);
        setPersonalEmailPhase('sent');
      } else if (res.needs_personal_email) {
        setPersonalEmailPhase('prompt');
      } else {
        setPersonalEmailPhase('done');
      }
    } else if (newUserHook.error) {
      pushToast('error', 'Could not create your account', newUserHook.error);
    }
  };

  // ── NEW — existing account, merge via OTP ──────────────────────────────────
  const handleRequestOtp = async (loginEmail: string) => {
    const ok = await mergeHook.requestOtp(token, code, loginEmail);
    if (ok) {
      pushToast('info', 'Code sent', `Check ${loginEmail} for your verification code.`);
    } else if (mergeHook.error) {
      pushToast('error', 'Could not send code', mergeHook.error);
    }
  };

  const handleConfirmMerge = async (fields: {
    loginEmail: string; otpCode: string; otherEmail: string; passportNumber: string;
  }) => {
    const res = await mergeHook.confirmMerge({
      invite_token: token, invite_code: code,
      login_email: fields.loginEmail, otp_code: fields.otpCode,
      other_email: fields.otherEmail.trim() || undefined,
      passport_number: fields.passportNumber || undefined,
    });
    if (res) {
      await establishSessionFromAuthResponse(res);
      pushToast('success', 'Welcome aboard!', `You're now linked to ${res.company_name}.`);
      setAcceptedCompany(res.company_name);
      // Same fix as the new-user path — check needs_personal_email before
      // defaulting to 'done' when other_email was left blank.
      if (res.linked_email) {
        setPendingPersonalEmail(res.linked_email);
        setPersonalEmailPhase('sent');
      } else if (res.needs_personal_email) {
        setPersonalEmailPhase('prompt');
      } else {
        setPersonalEmailPhase('done');
      }
    } else if (mergeHook.error) {
      pushToast('error', 'Could not verify that code', mergeHook.error);
    }
  };

  // ── Decide which card to show ───────────────────────────────────────────────
  let body: ReactNode;

  if (!hasInvite) {
    body = <NoTokenCard />;
  } else if (acceptedCompany) {
    if (personalEmailPhase === 'prompt') {
      body = (
        <AddPersonalEmailCard
          companyName={acceptedCompany}
          onSkip={() => setPersonalEmailPhase('done')}
          onVerified={() => setPersonalEmailPhase('done')}
        />
      );
    } else if (personalEmailPhase === 'sent' && pendingPersonalEmail) {
      body = (
        <VerifyPersonalEmailOtpCard
          email={pendingPersonalEmail}
          onVerified={() => setPersonalEmailPhase('done')}
          onSkip={() => setPersonalEmailPhase('done')}
        />
      );
    } else {
      body = <AcceptedCard companyName={acceptedCompany} countdown={countdown} />;
    }
  } else if (validate.loading) {
    body = <ValidatingCard />;
  } else if (validate.error) {
    body = <InvalidCard message={validate.error} onRetry={() => window.location.reload()} />;
  } else if (validate.result && !validate.result.valid) {
    body = <InvalidCard message={validate.result.message} />;
  } else if (validate.result) {
    const companyName = validate.result.company_name ?? 'this company';
    const hrName = validate.result.hr_name;
    const requiresPassport = !!validate.result.requires_passport_verification;

    // FIXED: previously checked `isLoggedIn` first as a "convenience fast
    // path" for someone already signed in. That reintroduced the exact
    // problem this whole redesign was meant to prevent — a browser session
    // belonging to a DIFFERENT account than the one being invited could
    // hijack the decision. Now this always branches on account_exists
    // alone, regardless of who (if anyone) happens to be logged into this
    // browser, matching the original design intent exactly: check account
    // existence, never check session.
    if (validate.result.account_exists) {
      body = (
        <ExistingUserMergeCard
          companyName={companyName} hrName={hrName} invitedEmail={validate.result.invited_email}
          requiresPassport={requiresPassport}
          requestLoading={mergeHook.requestLoading} confirmLoading={mergeHook.confirmLoading}
          error={mergeHook.error} otpSent={mergeHook.otpSent}
          onRequestOtp={(loginEmail) => void handleRequestOtp(loginEmail)}
          onConfirm={(fields) => void handleConfirmMerge(fields)}
        />
      );
    } else {
      body = (
        <NewUserSignupCard
          companyName={companyName} hrName={hrName} invitedEmail={validate.result.invited_email}
          requiresPassport={requiresPassport} loading={newUserHook.loading} error={newUserHook.error}
          onSubmit={(fields) => void handleNewUserSubmit(fields)}
        />
      );
    }
  } else {
    body = <ValidatingCard />;
  }

  return (
    <>
      <ToastStack items={toastItems} onDismiss={dismissToast} />
      <PublicShell>{body}</PublicShell>
    </>
  );
}