// src/components/admin/AdminBackButton.tsx
//
// Small reusable "Back" affordance for every admin sub-page.
// Sits at the top-left of the page, above the existing header.
//
//   • Desktop → icon + "Back" text, subtle chip style, hover lifts to indigo.
//   • Mobile  → icon-only compact tap target (still accessible via aria-label).
//
// Behaviour:
//   • If a `to` prop is passed, we navigate there (e.g. `/admin`).
//   • Otherwise we navigate(-1) — same as the browser back button. This is
//     the safe default because most admin pages arrive from a variety of
//     entry points (sidebar, search, deep link).
//
// This component is deliberately additive: no page-level layout changes.
// Drop it in as the first child of the page's outer wrapper and it slots
// in above the existing header without disturbing anything else.

import { useNavigate } from 'react-router-dom';

export interface AdminBackButtonProps {
  /** Optional destination. Defaults to browser back (navigate(-1)). */
  to?: string;
  /** Optional visible label override. Default: "Back". */
  label?: string;
  /** Optional wrapper class (e.g. add extra margin in some pages). */
  className?: string;
}

export default function AdminBackButton({
  to,
  label = 'Back',
  className = '',
}: AdminBackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      // If there's no history to go back to, land on the admin dashboard.
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/admin');
      }
    }
  };

  return (
    <div className={`mb-3 md:mb-4 ${className}`}>
      <button
        type="button"
        onClick={handleClick}
        aria-label={label}
        className="
          inline-flex items-center gap-1.5
          rounded-lg border border-slate-200 bg-white
          px-2.5 py-1.5 md:px-3 md:py-1.5
          text-xs md:text-sm font-medium text-slate-600
          shadow-sm
          transition
          hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700
          focus:outline-none focus:ring-2 focus:ring-indigo-100
        "
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 5 7 10l5 5"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span>{label}</span>
      </button>
    </div>
  );
}
