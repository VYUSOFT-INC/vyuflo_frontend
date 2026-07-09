// src/pages/public/AcceptInvitePage.tsx
//
// PUBLIC route: /accept-invite?token=...  OR  /accept-invite?code=...
// Lives OUTSIDE DashboardLayout — no sidebar, no auth guard.

import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, Building2, User, ArrowRight, LogIn, UserPlus,
  ShieldCheck, X, XCircle, Info,
} from 'lucide-react';
import { getDashboardRoute } from '../../utils/navigation';
import { useValidateInvite, useAcceptInvite } from '../../hooks/hr/useInvitations';
import { useAuthStore } from '../../store/authStore';
import { getUiSession } from '../../utils/uiSession';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';

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

function InfoBlock({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-[12px] p-[14px] rounded-[12px] bg-[#fafbfc] border border-[#f1f5f9]">
      <div className="size-[34px] rounded-[10px] bg-white border border-[#e2e8f0] flex items-center justify-center text-indigo-600 shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">{label}</p>
        <p className="text-[14px] font-semibold text-[#0f172a] tracking-[-0.5px] mt-[2px] truncate">{value}</p>
      </div>
    </div>
  );
}

function NeedsLoginCard({
  companyName, hrName, inviteMethod, returnUrl,
}: {
  companyName: string; hrName?: string; inviteMethod?: string; returnUrl: string;
}) {
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
          You've been invited to <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] text-center mt-[6px] max-w-[380px] mx-auto leading-[22px]">
          {hrName ? `${hrName} from ${companyName}` : companyName} has invited you to join their
          immigration case management workspace on Vyuflo.
        </p>

        <div className="mt-[24px] flex flex-col gap-[10px]">
          <InfoBlock icon={<Building2 size={16} />} label="Company" value={companyName} />
          {hrName && <InfoBlock icon={<User size={16} />} label="Invited By" value={hrName} />}
          {inviteMethod && (
            <InfoBlock icon={<ShieldCheck size={16} />} label="Invite Method"
              value={inviteMethod.charAt(0).toUpperCase() + inviteMethod.slice(1)} />
          )}
        </div>

        <div className="mt-[24px] pt-[20px] border-t border-[#f1f5f9]">
          <p className="text-[13px] text-[#475569] tracking-[-0.5px] text-center mb-[14px]">
            Sign in to accept this invitation, or create a new account if you don't have one yet.
          </p>
          <div className="flex flex-col gap-[10px]">
            <Link to={`/login?redirect=${encodeURIComponent(returnUrl)}`}
              className="h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px] text-white
                         text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
              style={{ backgroundImage: PRIMARY_GRADIENT }}>
              <LogIn size={16} /> Sign In to Accept
            </Link>
            <Link to={`/signup?redirect=${encodeURIComponent(returnUrl)}`}
              className="h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px]
                         bg-white border border-[#e2e8f0] text-[#334155] text-[14px] font-semibold tracking-[-0.5px]
                         hover:bg-[#f8fafc] transition">
              <UserPlus size={16} /> Create New Account
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReadyCard({
  companyName, hrName, userName, inviteMethod, accepting, onAccept, onDecline,
}: {
  companyName: string; hrName?: string; userName?: string; inviteMethod?: string;
  accepting: boolean; onAccept: () => void; onDecline: () => void;
}) {
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
          Join <span style={{ backgroundImage: PRIMARY_GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{companyName}</span>?
        </h1>
        <p className="text-[14px] text-[#64748b] tracking-[-0.5px] text-center mt-[6px] leading-[22px]">
          {userName ? `Signed in as ${userName}. ` : ''}
          Accepting will link your account to {companyName} so they can manage your immigration cases.
        </p>

        <div className="mt-[24px] flex flex-col gap-[10px]">
          <InfoBlock icon={<Building2 size={16} />} label="Company" value={companyName} />
          {hrName && <InfoBlock icon={<User size={16} />} label="Invited By" value={hrName} />}
          {inviteMethod && (
            <InfoBlock icon={<ShieldCheck size={16} />} label="Invite Method"
              value={inviteMethod.charAt(0).toUpperCase() + inviteMethod.slice(1)} />
          )}
        </div>

        <div className="mt-[24px] flex flex-col gap-[10px]">
          <button onClick={onAccept} disabled={accepting}
            className="h-[46px] rounded-[12px] inline-flex items-center justify-center gap-[8px] text-white
                       text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98]
                       transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            {accepting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Accepting...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} /> Accept Invitation
              </>
            )}
          </button>
          <button onClick={onDecline} disabled={accepting}
            className="h-[42px] rounded-[12px] inline-flex items-center justify-center
                       text-[#94a3b8] text-[13px] font-medium tracking-[-0.5px] hover:text-[#475569] transition disabled:opacity-60">
            Not now
          </button>
        </div>

        <p className="text-[11px] text-[#94a3b8] tracking-[-0.5px] text-center mt-[16px] leading-[16px]">
          By accepting, you agree to share your immigration case details with {companyName}'s HR team.
        </p>
      </div>
    </Card>
  );
}

function AcceptedCard({ companyName, countdown,dashboardRoute }: { companyName: string; countdown: number ;dashboardRoute: string}) {
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
          <Link to={dashboardRoute}
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

export default function AcceptInvitePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get('token') ?? undefined;
  const code  = params.get('code')  ?? undefined;
  const hasInvite = !!(token || code);

  // ── Auth check — uses BOTH Zustand AND your existing cookie util ──────────
  //    Zustand: reactive, covers immediate-post-login (in-memory state).
  //    Cookie:  covers page reloads where Zustand resets but cookie persists.
  const isAuthInStore = useAuthStore(state => state.isAuthenticated);
  const session = getUiSession();
  const isLoggedIn = (isAuthInStore || !!session) && session?.roles?.[0] === 'employee';

  // Backend hooks
  const validate = useValidateInvite(token, code);
  const acceptHook = useAcceptInvite();

  // Toast state
  const [toastItems, setToastItems] = useState<ToastItem[]>([]);
  const pushToast = (tone: ToastTone, title: string, message?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToastItems(prev => [...prev, { id, tone, title, message }]);
    window.setTimeout(() => setToastItems(prev => prev.filter(x => x.id !== id)), 3500);
  };
  const dismissToast = (id: string) => setToastItems(prev => prev.filter(x => x.id !== id));

  // Auto-redirect countdown after acceptance
  const [countdown, setCountdown] = useState(5);
  useEffect(() => {
    if (!acceptHook.success) return;
    if (countdown <= 0) {
      navigate(getDashboardRoute(session?.roles?.[0] ?? ''));
      return;
    }
    const t = window.setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [acceptHook.success, countdown, navigate]);

  // Handle accept click
  const handleAccept = async () => {
    const ok = await acceptHook.accept(token, code);
    if (ok) {
      pushToast('success', 'Welcome aboard!', `You're now linked to ${acceptHook.company ?? 'your company'}.`);
    } else if (acceptHook.error) {
      pushToast('error', 'Could not accept invitation', acceptHook.error);
    }
  };

  // Return URL — auth pages bounce back here after sign-in/sign-up
  const returnUrl = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/accept-invite';

  // Display name from session for the ReadyCard greeting
  const userName = session
    ? `${session.first_name ?? ''} ${session.last_name ?? ''}`.trim() || session.email
    : undefined;

  // ── Decide which card to show ───────────────────────────────────────────────
  let body: ReactNode;

  if (!hasInvite) {
    body = <NoTokenCard />;
  } else if (acceptHook.success && acceptHook.company) {
    body = <AcceptedCard companyName={acceptHook.company} countdown={countdown} dashboardRoute={getDashboardRoute(session?.roles?.[0] ?? '')} />;
  } else if (validate.loading) {
    body = <ValidatingCard />;
  } else if (validate.error) {
    body = <InvalidCard message={validate.error} onRetry={() => window.location.reload()} />;
  } else if (validate.result && !validate.result.valid) {
    body = <InvalidCard message={validate.result.message} />;
  } else if (validate.result) {
    const companyName = validate.result.company_name ?? 'this company';
    const hrName = validate.result.hr_name;
    const inviteMethod = validate.result.invite_method;
    if (!isLoggedIn) {
      body = (
        <NeedsLoginCard
          companyName={companyName}
          hrName={hrName}
          inviteMethod={inviteMethod}
          returnUrl={returnUrl}
        />
      );
    } else {
      body = (
        <ReadyCard
          companyName={companyName}
          hrName={hrName}
          userName={userName}
          inviteMethod={inviteMethod}
          accepting={acceptHook.loading}
          onAccept={handleAccept}
          onDecline={() => navigate('/dashboard')}
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