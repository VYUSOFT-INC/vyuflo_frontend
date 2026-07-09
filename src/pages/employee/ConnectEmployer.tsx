// src/pages/employee/ConnectEmployer.tsx
//
// Employee already has an account and wants to link to their company.
// Accessible from: Profile → Settings → "Connect to Employer"
//
// Flow:
//   1. Employee enters company code (VF-XXXX-XXXX)
//   2. System validates → shows company name + HR name
//   3. Employee clicks Connect → linked

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, PageContent } from '../../components/layout/Pageheader';
import { useAcceptInvite } from '../../hooks/hr/useInvitations';
import { invitationApi } from '../../api/hr/invitation.api';

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <svg className="animate-spin text-white" style={{ width: size, height: size }} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

export default function ConnectEmployer() {
  const navigate = useNavigate();

  const [code,        setCode]        = useState('');
  const [validation,  setValidation]  = useState<{ valid: boolean; company_name?: string; hr_name?: string; message: string } | null>(null);
  const [checking,    setChecking]    = useState(false);
  const [checkError,  setCheckError]  = useState<string | null>(null);

  const { accept, loading: accepting, error: acceptError, success, company } = useAcceptInvite();

  // ── Step 1: Validate code ──────────────────────────────────────────────────
  const handleCheckCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setChecking(true);
    setCheckError(null);
    setValidation(null);

    try {
      const result = await invitationApi.validateInvite({ invite_code: trimmed });
      setValidation(result);
      if (!result.valid) setCheckError(result.message);
    } catch {
      setCheckError('Could not validate code. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  // ── Step 2: Accept ─────────────────────────────────────────────────────────
  const handleConnect = async () => {
    const ok = await accept(undefined, code.trim().toUpperCase());
    if (ok) {
      setTimeout(() => navigate('/dashboard'), 1500);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f9fafb]" style={{ fontFamily: 'Inter, sans-serif' }}>
      <PageHeader
        title="Connect to Employer"
        subtitle="Link your account to your sponsoring company"
        showBell={false}
      />
      <PageContent>
        <div className="max-w-[560px] w-full">

          {/* ── Success ───────────────────────────────────────────────────── */}
          {success ? (
            <div className="bg-white rounded-[16px] border border-[#e5e7eb] shadow-sm p-[32px] text-center">
              <div className="w-[64px] h-[64px] bg-[#d1fae5] rounded-full flex items-center justify-center mx-auto mb-[20px]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h2 className="text-[20px] font-bold text-[#111827] mb-[8px]">Successfully Connected!</h2>
              <p className="text-[14px] text-[#6b7280] mb-[4px]">
                Your account is now linked to <span className="font-semibold text-[#111827]">{company}</span>.
              </p>
              <p className="text-[13px] text-[#9ca3af]">Redirecting to dashboard…</p>
            </div>
          ) : (
            <>
              {/* ── Info card ──────────────────────────────────────────── */}
              <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-[12px] p-[16px] mb-[20px] flex items-start gap-[12px]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-[1px]">
                  <circle cx="12" cy="12" r="10" stroke="#3b82f6" strokeWidth="2"/>
                  <path d="M12 8v4M12 16h.01" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p className="text-[13px] text-[#1e40af] leading-[18px]">
                  Ask your HR team for the company invite code. It looks like <strong>VF-XXXX-XXXX</strong>.
                  They can find it in their HR Dashboard under "Invite Employee".
                </p>
              </div>

              {/* ── Code input card ────────────────────────────────────── */}
              <div className="bg-white rounded-[16px] border border-[#e5e7eb] shadow-sm p-[24px] sm:p-[32px] mb-[16px]">
                <h2 className="text-[17px] font-semibold text-[#111827] mb-[4px]">Enter Company Code</h2>
                <p className="text-[13px] text-[#6b7280] mb-[20px]">
                  Your HR team shared this code with you.
                </p>

                <div className="flex gap-[10px]">
                  <input
                    type="text"
                    value={code}
                    onChange={e => {
                      setCode(e.target.value.toUpperCase());
                      setValidation(null);
                      setCheckError(null);
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') void handleCheckCode(); }}
                    placeholder="VF-XXXX-XXXX"
                    maxLength={12}
                    className="flex-1 h-[48px] rounded-[10px] border border-[#e5e7eb] bg-[#f9fafb]
                               text-[#111827] text-[16px] font-mono px-[16px] tracking-[0.1em]
                               focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                               placeholder:text-[#d1d5db] placeholder:tracking-normal placeholder:font-sans"
                  />
                  <button
                    onClick={handleCheckCode}
                    disabled={checking || code.trim().length < 3}
                    className="h-[48px] px-[20px] rounded-[10px] border border-[#e5e7eb] text-[#374151]
                               text-[14px] font-medium hover:bg-[#f9fafb] transition
                               disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {checking ? 'Checking…' : 'Verify'}
                  </button>
                </div>

                {/* Error */}
                {checkError && (
                  <p className="flex items-center gap-[6px] text-[13px] text-[#dc2626] mt-[10px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2"/>
                      <path d="M15 9l-6 6M9 9l6 6" stroke="#dc2626" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    {checkError}
                  </p>
                )}

                {/* Valid — show company info */}
                {validation?.valid && (
                  <div className="mt-[16px] bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px] p-[16px]">
                    <div className="flex items-center gap-[12px] mb-[12px]">
                      <div className="w-[40px] h-[40px] rounded-[10px] bg-[#d1fae5] flex items-center justify-center shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6L9 17l-5-5" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-[#111827]">{validation.company_name}</p>
                        <p className="text-[12px] text-[#6b7280]">Managed by {validation.hr_name ?? 'HR Team'}</p>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#065f46]">
                      ✓ Valid company code — click Connect to link your account.
                    </p>
                  </div>
                )}
              </div>

              {/* ── Accept error ───────────────────────────────────────── */}
              {acceptError && (
                <div className="bg-[#fef2f2] border border-[#fca5a5] rounded-[10px] px-[14px] py-[10px] mb-[16px]">
                  <p className="text-[13px] text-[#dc2626]">{acceptError}</p>
                </div>
              )}

              {/* ── Connect button — shown only after valid code ───────── */}
              {validation?.valid && (
                <button
                  onClick={handleConnect}
                  disabled={accepting}
                  className="w-full h-[48px] rounded-[12px] text-white text-[15px] font-semibold
                             flex items-center justify-center gap-[8px]
                             hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, var(--theme-primary), var(--theme-gradient-end))' }}
                >
                  {accepting ? <><Spinner /> Connecting…</> : `Connect to ${validation.company_name}`}
                </button>
              )}

              {/* Already linked info */}
              <div className="mt-[20px] bg-white rounded-[12px] border border-[#f1f5f9] p-[16px]">
                <p className="text-[13px] font-medium text-[#374151] mb-[8px]">Don't have a code?</p>
                <p className="text-[12px] text-[#6b7280] leading-[18px]">
                  Ask your HR manager or employer to send you an invite from their HR Dashboard.
                  They can invite you by email or share a company code.
                </p>
              </div>

            </>
          )}
        </div>
      </PageContent>
    </div>
  );
}