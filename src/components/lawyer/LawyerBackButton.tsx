// src/components/lawyer/LawyerBackButton.tsx
//
// Mirror of AdminBackButton — same visual + same behaviour, dropped into
// every lawyer sub-page (except the dashboard, which is the landing
// screen and has nothing meaningful to go back to).
//
//   • Desktop → icon + "Back" text, subtle chip style, hover lifts to indigo.
//   • Mobile  → same layout at a slightly tighter padding.
//
// Behaviour:
//   • If a `to` prop is passed, we navigate there.
//   • Otherwise we navigate(-1) — the browser-back equivalent.
//   • If there's no history to pop, we fall back to /lawyer/dashboard.
//
// Additive drop-in: place at the top of the page's outer wrapper. It does
// NOT replace any existing breadcrumbs or context-specific back links.

import { useNavigate } from 'react-router-dom';

export interface LawyerBackButtonProps {
  /** Optional destination. Defaults to browser back (navigate(-1)). */
  to?: string;
  /** Optional visible label override. Default: "Back". */
  label?: string;
  /** Optional wrapper class (e.g. add extra margin on some pages). */
  className?: string;
}

export default function LawyerBackButton({
  to,
  label = 'Back',
  className = '',
}: LawyerBackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/lawyer/dashboard');
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
