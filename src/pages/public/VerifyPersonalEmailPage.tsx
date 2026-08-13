// src/pages/public/VerifyPersonalEmailPage.tsx
//
// PUBLIC route: /verify-personal-email?token=...
// Reached when the person clicks the verification link sent by
// service_add_personal_email(). No auth guard — the token itself is the
// credential, since the person may be clicking this from a device where
// they aren't logged in.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

import { useVerifyPersonalEmail } from '../../hooks/auth/usePersonalEmail';

const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)';

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full flex flex-col"
         style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #f8fafc 100%)', fontFamily: 'Inter, sans-serif' }}>
      <header className="w-full px-[24px] py-[20px] flex items-center">
        <Link to="/" className="flex items-center gap-[10px]">
          <div className="size-[36px] rounded-[10px] flex items-center justify-center text-white"
               style={{ backgroundImage: PRIMARY_GRADIENT }}>
            <ShieldCheck size={18} />
          </div>
          <span className="text-[18px] font-bold text-[#0f172a] tracking-[-0.5px]">Vyuflo</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-[16px] py-[24px]">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-[#f1f5f9] rounded-[20px] shadow-[0px_4px_24px_rgba(15,23,42,0.06)] p-[28px] sm:p-[36px]">
      {children}
    </div>
  );
}

export default function VerifyPersonalEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? undefined;

  const { verify, loading, error, success } = useVerifyPersonalEmail();
  const attempted = useRef(false);
  const [noToken, setNoToken] = useState(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    if (!token) {
      setNoToken(true);
      return;
    }
    void verify(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  let body: ReactNode;

  if (noToken) {
    body = (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="size-[64px] rounded-full bg-[#fef2f2] flex items-center justify-center mb-[20px]">
            <XCircle size={28} className="text-[#dc2626]" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Missing verification token</h1>
          <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
            This link looks incomplete. Please open the verification link directly from your email.
          </p>
        </div>
      </Card>
    );
  } else if (loading) {
    body = (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="size-[64px] rounded-full bg-indigo-50 flex items-center justify-center mb-[20px]">
            <svg className="w-7 h-7 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Verifying your email</h1>
          <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px]">One moment...</p>
        </div>
      </Card>
    );
  } else if (success) {
    body = (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="size-[64px] rounded-full bg-[#f0fdf4] flex items-center justify-center mb-[20px]">
            <CheckCircle2 size={28} className="text-[#16a34a]" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Email verified</h1>
          <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
            Your personal email is now your login for Vyuflo. You'll be able to sign in with it
            any time, including if you ever leave your current organization.
          </p>
          <Link to="/login"
            className="mt-[24px] h-[46px] w-full rounded-[12px] inline-flex items-center justify-center text-white
                       text-[14px] font-semibold tracking-[-0.5px] hover:opacity-90 active:scale-[0.98] transition"
            style={{ backgroundImage: PRIMARY_GRADIENT }}>
            Go to Login
          </Link>
        </div>
      </Card>
    );
  } else {
    body = (
      <Card>
        <div className="flex flex-col items-center text-center">
          <div className="size-[64px] rounded-full bg-[#fef2f2] flex items-center justify-center mb-[20px]">
            <XCircle size={28} className="text-[#dc2626]" />
          </div>
          <h1 className="text-[20px] font-bold text-[#0f172a] tracking-[-0.5px]">Verification failed</h1>
          <p className="text-[14px] text-[#64748b] tracking-[-0.5px] mt-[6px] leading-[22px]">
            {error || 'This link may have expired or already been used.'}
          </p>
          <p className="text-[13px] text-[#94a3b8] tracking-[-0.5px] mt-[16px]">
            You can request a new link any time from Account Settings.
          </p>
        </div>
      </Card>
    );
  }

  return <Shell>{body}</Shell>;
}