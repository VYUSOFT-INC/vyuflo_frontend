// src/pages/public/TermsOfService.tsx
//
// Public Terms of Service page — reachable at /terms.
// Rendered from the signup consent checkbox link so users can review
// the agreement without losing their in-progress signup (the link now
// opens in a new tab from Signup.tsx).
//
// The copy below is a working placeholder that follows the standard
// SaaS ToS structure. Legal/marketing will replace the actual wording
// before public launch, but the page must EXIST so the router doesn't
// fall back to Home (that's the bug logged in the XL sheet, row 5).

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
// Use the same brand assets as the signup + sidebar so pre-login,
// legal pages, and the app itself share one logo lockup.
import imgVyufloIcon from '../../assets/vyuflo_icon.svg';
import imgVyufloName from '../../assets/vyuflo_logotype.svg';

export default function TermsOfServicePage() {
  /* React Router preserves the previous page's scroll position by
     default, so navigating from the signup consent link (near the
     bottom of that form) landed us mid-way down the ToS page. Force
     scroll to top on mount so the user starts reading from the title. */
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-gray-200 bg-white">
        {/* 3-column header:
              LEFT  — "← Back to signup"
              CENTER — Vyuflo logo lockup (icon + wordmark)
              RIGHT — reserved for symmetry (empty spacer)
            Uses grid so the logo stays exactly centered regardless of
            back-link width. */}
        <div className="mx-auto grid max-w-4xl grid-cols-3 items-center px-6 py-4">
          <Link to="/signup" className="justify-self-start text-sm font-semibold text-indigo-600 hover:underline">
            ← Back to signup
          </Link>
          <Link to="/" className="justify-self-center flex items-center gap-2">
            <img src={imgVyufloIcon} alt="Vyuflo" className="h-8 w-8 object-contain" />
            <img src={imgVyufloName} alt="Vyuflo" className="h-5 w-auto object-contain" />
          </Link>
          <span className="justify-self-end" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: August 31, 2026</p>

        <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <p>
            Welcome to Vyuflo. By creating an account or otherwise using our
            platform, you agree to these Terms of Service. Please read them
            carefully. If you do not agree with any part of these terms, you
            may not use the service.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">1. Accounts</h2>
          <p>
            You must provide accurate information when creating an account.
            You are responsible for maintaining the confidentiality of your
            credentials and for any activity that occurs under your account.
            Vyuflo is not liable for any loss or damage arising from your
            failure to protect your login information.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">2. Use of the Service</h2>
          <p>
            You may use Vyuflo only for lawful purposes and in accordance
            with these Terms. You agree not to misuse the service, interfere
            with its operation, or attempt to access it using a method other
            than the interfaces we provide.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">3. Content and Data</h2>
          <p>
            You retain ownership of documents and information you upload.
            You grant Vyuflo a limited license to process this data solely
            for the purpose of providing the service (case management,
            document review, form generation, communication with your
            attorney or HR representative, and related workflows).
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">4. Not Legal Advice</h2>
          <p>
            Vyuflo is a software platform. It does not provide legal advice
            and is not a substitute for the professional judgment of a
            licensed attorney. Any content displayed within the platform
            (including form suggestions and checklists) is informational and
            should be reviewed by a qualified professional before submission
            to any government agency.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">5. Termination</h2>
          <p>
            We may suspend or terminate your access to the service at any
            time if you violate these Terms or use the platform in a way
            that harms other users or the service itself. You may close
            your account at any time from Settings → Privacy → Delete
            Account.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">6. Changes</h2>
          <p>
            We may update these Terms from time to time. If we make material
            changes, we'll notify you by email or in-app before they take
            effect. Continued use of the service after the effective date
            constitutes acceptance of the revised terms.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">7. Contact</h2>
          <p>
            Questions about these Terms? Reach us at{' '}
            <a href="mailto:support@vyuflo.com" className="text-indigo-600 hover:underline">
              support@vyuflo.com
            </a>.
          </p>
        </section>

        <div className="mt-10 border-t border-gray-200 pt-6 text-xs text-gray-500">
          © {new Date().getFullYear()} Vyuflo. All rights reserved.
        </div>
      </main>
    </div>
  );
}
