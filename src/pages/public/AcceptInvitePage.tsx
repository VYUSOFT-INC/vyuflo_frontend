// src/pages/public/AcceptInvitePage.tsx
//
// PUBLIC route: /accept-invite?token=...  OR  /accept-invite?code=...
//
// REDESIGNED (v2): no more embedded signup/merge forms. This page only
// decides "does an account exist for the invited email" and routes the
// person to the REAL /signup or /login pages with ?redirect= back to this
// exact URL. Once they return authenticated, this page finishes the job
// automatically: optional passport confirmation, then the existing
// authenticated accept call (useAcceptInvite -> POST /hr/accept), then the
// optional personal-email step (unchanged).

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Building2, ArrowRight, ShieldCheck,
  X, XCircle, Info, Mail, Lock, IdCard, LogIn,
} from 'lucide-react';

import { useValidateInvite, useAcceptInvite } from '../../hooks/hr/useInvitations';
import { useAddPersonalEmail, useVerifyPersonalEmail } from '../../hooks/auth/usePersonalEmail';
import { useAuthStore } from '../../store/authStore';
import { getUiSession } from '../../utils/uiSession';

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

// ── NEW — no account exists for this email. Sends them to the real signup
// page and back.
function NeedsSignupCard({
  companyName, hrName, invitedEmail, redirectTarget,
}: {
  companyName: string; hrName?: string; invitedEmail?: string; redirectTarget: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full flex items-center justify-center text-white mb-[20px]"
             style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <Building2 size={28} />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">
          Join <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
          {hrName ? `${hrName} from ${companyName}` : companyName} invited you to join. You don't have an
          account yet.
        </p>

        {invitedEmail && (
          <div className="mt-[16px] w-full rounded-[10px] bg-[#f8fafc] border border-[#f1f5f9] px-[14px] py-[10px] text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">Invited email</p>
            <p className="text-[13px] text-[#334155]">{invitedEmail}</p>
          </div>
        )}

        <Link to={redirectTarget}
          className="mt-[20px] w-full h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px]
                     text-white text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          Create account to join <ArrowRight size={16} />
        </Link>
        <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] mt-[10px]">
          Takes you to signup, then brings you right back here.
        </p>
      </div>
    </Card>
  );
}

// ── NEW — an account already exists for this email. Sends them to the
// real login page and back.
function NeedsLoginCard({
  companyName, hrName, invitedEmail, redirectTarget,
}: {
  companyName: string; hrName?: string; invitedEmail?: string; redirectTarget: string;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full flex items-center justify-center text-white mb-[20px]"
             style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <Building2 size={28} />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">
          Join <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
          {hrName ? `${hrName} from ${companyName}` : companyName} invited you. We found an existing account
          for this email.
        </p>

        {invitedEmail && (
          <div className="mt-[16px] w-full rounded-[10px] bg-[#f8fafc] border border-[#f1f5f9] px-[14px] py-[10px] text-left">
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[#94a3b8]">Invited email</p>
            <p className="text-[13px] text-[#334155]">{invitedEmail}</p>
          </div>
        )}

        <Link to={redirectTarget}
          className="mt-[20px] w-full h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px]
                     text-white text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
          style={{ backgroundImage: PRIMARY_GRADIENT }}>
          <LogIn size={16} /> Log in to accept
        </Link>
        <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] mt-[10px]">
          Takes you to login, then finishes linking automatically once you're signed in.
        </p>
      </div>
    </Card>
  );
}

// ── NEW — shown right after the person lands back here authenticated, only
// when the invite requires passport confirmation (requires_passport_verification
// from GET /hr/validate). Submits straight into the existing useAcceptInvite call.
function PassportConfirmCard({
  companyName, loading, error, onSubmit,
}: {
  companyName: string; loading: boolean; error: string | null;
  onSubmit: (passportNumber: string) => void;
}) {
  const [passportNumber, setPassportNumber] = useState('');
  const canSubmit = passportNumber.trim().length >= 6;

  return (
    <Card>
      <div className="flex flex-col items-center text-center">
        <div className="size-[64px] rounded-full bg-[#fff7ed] flex items-center justify-center mb-[20px]">
          <IdCard size={28} className="text-[#c2410c]" />
        </div>
        <h1 className="text-[22px] font-bold text-[#0f172a] tracking-[-0.5px]">Confirm your identity</h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
          One last check before we link your account to <span className="font-semibold text-[#0f172a]">{companyName}</span>.
        </p>

        <div className="mt-[20px] w-full flex flex-col gap-[6px] text-left">
          <FieldLabel>Passport Number</FieldLabel>
          <input value={passportNumber} onChange={e => setPassportNumber(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && canSubmit) onSubmit(passportNumber.trim()); }}
            placeholder="Enter your passport number" className={inputClass} />
        </div>

        {error && <p className="text-[12px] text-[#dc2626] tracking-[-0.5px] mt-[12px]">{error}</p>}

        <div className="mt-[20px] w-full">
          <PrimaryButton onClick={() => onSubmit(passportNumber.trim())} disabled={!canSubmit} loading={loading}>
            <Lock size={16} /> Confirm and join
          </PrimaryButton>
        </div>
        <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] mt-[10px]">
          If it doesn't match, you'll see an error here and can try again.
        </p>
      </div>
    </Card>
  );
}

// ── Shown after acceptance, only when needs_personal_email=true.
// Two-step: enter email -> send code, then enter code -> verified.
// Unchanged from the previous version of this page.
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

type PersonalEmailPhase = 'idle' | 'prompt' | 'done';

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token') ?? undefined;
  const code  = params.get('code')  ?? undefined;
  const hasInvite = !!(token || code);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const session = getUiSession();
  const authed = isAuthenticated || !!session;

  const validate = useValidateInvite(token, code);

  // Existing hook — POST /hr/accept, unchanged since June 18. It keeps its
  // own success/company/needsPersonalEmail state internally.
  const {
    accept, loading: acceptLoading, error: acceptError,
    success: acceptSuccess, company: acceptedCompanyFromHook, needsPersonalEmail,
  } = useAcceptInvite();

  // Where /signup and /login should send the person back to.
  const currentUrl = `/accept-invite?${token ? `token=${token}` : `code=${code}`}`;
  const signupTarget = `/signup?redirect=${encodeURIComponent(currentUrl)}`;
  const loginTarget = `/login?redirect=${encodeURIComponent(currentUrl)}`;

  const [awaitingPassport, setAwaitingPassport] = useState(false);
  const [personalEmailPhase, setPersonalEmailPhase] = useState<PersonalEmailPhase>('idle');

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

  // Once acceptInvite succeeds, decide whether the personal-email prompt is
  // needed, and fire a one-time success toast.
  const [toastedSuccess, setToastedSuccess] = useState(false);
  useEffect(() => {
    if (!acceptSuccess || toastedSuccess) return;
    setToastedSuccess(true);
    pushToast('success', 'Welcome aboard!', acceptedCompanyFromHook ? `You're now linked to ${acceptedCompanyFromHook}.` : undefined);
    setAwaitingPassport(false);
    setPersonalEmailPhase(needsPersonalEmail ? 'prompt' : 'done');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptSuccess]);

  // If accept fails specifically because a passport is required/missing,
  // surface the passport card instead of a dead-end toast.
  useEffect(() => {
    if (!acceptError) return;
    if (acceptError.toLowerCase().includes('passport')) {
      setAwaitingPassport(true);
    } else {
      pushToast('error', 'Could not link your account', acceptError);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acceptError]);

  const runAccept = (passportNumber?: string) => {
    void accept(token, code, passportNumber);
  };

  // Auto-run once authenticated and the invite has validated: go straight
  // to accept unless a passport is required up front, or we're already
  // mid-flow / done.
  const [autoRunStarted, setAutoRunStarted] = useState(false);
  useEffect(() => {
    if (!authed || !hasInvite) return;
    if (acceptSuccess || awaitingPassport || autoRunStarted) return;
    if (!validate.result || !validate.result.valid) return;
    if (acceptLoading) return;

    setAutoRunStarted(true);
    if (validate.result.requires_passport_verification) {
      setAwaitingPassport(true);
    } else {
      runAccept();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, hasInvite, validate.result, acceptSuccess, awaitingPassport, autoRunStarted]);

  // ── Decide which card to show ────────────────────────────────────────────
  let body: ReactNode;

  if (!hasInvite) {
    body = <NoTokenCard />;
  } else if (acceptSuccess && acceptedCompanyFromHook) {
    if (personalEmailPhase === 'prompt') {
      body = (
        <AddPersonalEmailCard
          companyName={acceptedCompanyFromHook}
          onSkip={() => setPersonalEmailPhase('done')}
          onVerified={() => setPersonalEmailPhase('done')}
        />
      );
    } else {
      body = <AcceptedCard companyName={acceptedCompanyFromHook} countdown={countdown} />;
    }
  } else if (awaitingPassport && validate.result) {
    body = (
      <PassportConfirmCard
        companyName={validate.result.company_name ?? 'this company'}
        loading={acceptLoading}
        error={acceptError && acceptError.toLowerCase().includes('passport') ? acceptError : null}
        onSubmit={(passportNumber) => runAccept(passportNumber)}
      />
    );
  } else if (authed) {
    // Authenticated, invite still being validated/accepted in the background.
    body = <ValidatingCard />;
  } else if (validate.loading) {
    body = <ValidatingCard />;
  } else if (validate.error) {
    body = <InvalidCard message={validate.error} onRetry={() => window.location.reload()} />;
  } else if (validate.result && !validate.result.valid) {
    body = <InvalidCard message={validate.result.message} />;
  } else if (validate.result) {
    const companyName = validate.result.company_name ?? 'this company';
    const hrName = validate.result.hr_name;

    body = validate.result.account_exists ? (
      <NeedsLoginCard
        companyName={companyName} hrName={hrName} invitedEmail={validate.result.invited_email}
        redirectTarget={loginTarget}
      />
    ) : (
      <NeedsSignupCard
        companyName={companyName} hrName={hrName} invitedEmail={validate.result.invited_email}
        redirectTarget={signupTarget}
      />
    );
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