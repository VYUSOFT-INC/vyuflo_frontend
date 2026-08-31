// src/pages/public/PrivacyPolicy.tsx
//
// Public Privacy Policy page — reachable at /privacy.
// Rendered from the signup consent checkbox link so users can review
// the policy without losing their in-progress signup (the link now
// opens in a new tab from Signup.tsx).
//
// Working placeholder copy — legal will replace before launch, but
// the page must exist so the router doesn't fall back to Home
// (XL sheet row 5).

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import imgVyufloIcon from '../../assets/vyuflo_icon.svg';
import imgVyufloName from '../../assets/vyuflo_logotype.svg';

export default function PrivacyPolicyPage() {
  /* Land at the top of the page on mount — React Router keeps the
     previous scroll position by default, which put us mid-page when
     coming from the signup consent link. */
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      <header className="border-b border-gray-200 bg-white">
        {/* 3-column header — LEFT: back, CENTER: logo, RIGHT: spacer. */}
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
        <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: August 31, 2026</p>

        <section className="mt-8 space-y-6 text-sm leading-6 text-gray-700">
          <p>
            This Privacy Policy explains how Vyuflo collects, uses, and
            protects your information when you use our immigration case
            management platform. We take privacy seriously, particularly
            given the sensitive nature of the documents and personal data
            processed on the platform.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">1. Information We Collect</h2>
          <p>
            When you create an account we collect basic identity information
            (name, email, phone number) and the role you selected at signup
            (employee, employer/HR, or attorney). While using the service
            you may upload immigration documents, form data (I-9, I-983,
            etc.), and communications with your case team. We also collect
            standard technical data such as IP address, browser type, and
            usage timestamps for security and reliability.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">2. How We Use Information</h2>
          <p>
            Your data is used to provide the platform's functionality —
            case tracking, document storage, form generation, notifications,
            messaging with your attorney or HR representative, and audit
            trails required for compliance. We do not sell your personal
            information, and we do not use uploaded documents to train
            third-party AI models.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">3. Sharing</h2>
          <p>
            Within the platform, your case information is visible to the
            case team assigned to you (typically your attorney and your
            HR representative). We share data with third-party service
            providers strictly as required to run the platform (hosting,
            email delivery, SMS gateways, OCR processing), under
            contractual data-protection obligations. We disclose data to
            government agencies only when legally compelled.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">4. Security</h2>
          <p>
            Data is encrypted in transit (TLS) and at rest. Access to
            production systems is restricted, logged, and audited.
            Sensitive documents are stored in a separate, access-controlled
            storage tier. Nothing on the internet is 100% secure, but we
            follow industry best practices to protect your information.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">5. Your Choices</h2>
          <p>
            You can review, export, or delete your data from
            Settings → Privacy at any time. You can also request account
            deletion, which removes personal data except where retention
            is legally required (for example, immigration recordkeeping
            obligations).
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">6. Children</h2>
          <p>
            Vyuflo is not intended for use by anyone under 13. We do not
            knowingly collect information from children under 13.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">7. Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. Material
            changes will be announced in-app or by email before they take
            effect.
          </p>

          <h2 className="mt-6 text-lg font-semibold text-gray-900">8. Contact</h2>
          <p>
            Privacy questions or requests? Reach us at{' '}
            <a href="mailto:privacy@vyuflo.com" className="text-indigo-600 hover:underline">
              privacy@vyuflo.com
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
