// src/pages/lawyer/help/ArticleDetail.tsx
//
// Figma Screen 29 — Help FAQ Article Expanded.
//
// LAWYER USE CASE:
//   Lawyer clicked an article from Home page → arrives here to READ the full
//   walkthrough. Backend auto-increments view_count on GET so popular articles
//   bubble up to "Popular Articles" section on Home next time.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. Back button → /lawyer/help (consistent with rest of module).
//   2. Mock fallback shows demo article when backend doesn't have this id.
//   3. Body field assumed markdown-lite → rendered as preformatted text.
//      If backend ships rich HTML in future, switch to a sanitizer.
//   4. "Was this helpful?" is local-state only for now (no feedback endpoint).
//   5. "Still need help?" CTA navigates to ticket submit modal directly.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { helpSupportApi } from '../../../api/lawyer/helpSupport.api';
import type { HelpArticle } from '../../../types/lawyer/helpSupport.types';

const MOCK_ARTICLE: HelpArticle = {
  id: 'art-001',
  title: 'Step-by-Step Guide to the H1B Process',
  summary: 'Initial assessment, LCA filing, petition preparation, USCIS processing, and post-approval steps.',
  body: `The H1B process is a multi-stage journey that requires careful coordination between the employer, the employee, and the attorney. This guide walks through the five primary phases.

1. INITIAL ASSESSMENT AND LCA FILING
Before any petition is filed, the attorney evaluates the prospective beneficiary's qualifications and the offered position. The position must qualify as a "specialty occupation" requiring at least a bachelor's degree in a specific field.

Preceding Steps: Verify that the beneficiary's credentials meet the Specialty Occupation criteria. Confirm that the offered salary meets or exceeds the Department of Labor's prevailing wage. File the LCA (Labor Condition Application) with the DOL. LCA processing takes about 7 business days.

2. DOCUMENT COLLECTION
Once the LCA is certified, you can begin assembling the petition package. The standard exhibits include:
• Cover letter outlining the case
• Form I-129 with all required addenda
• Beneficiary's academic credentials and credential evaluations
• Employer's support letter
• Documentation of wages and working conditions
• Beneficiary's resume and supporting work documentation

3. PETITION PREPARATION AND REVIEW
The attorney prepares the petition with all supporting documentation. Internal review checklist: confirm the petition is timely, the beneficiary meets all eligibility criteria, and all supporting exhibits are complete.

4. USCIS FILING AND PROCESSING
Once finalized, the petition is filed with the appropriate USCIS Service Center based on the work location. Track status via the USCIS case status portal.

Approval Processing Timing: Typically 1-6 months depending on Service Center. Premium Processing (15 calendar day guarantee) is available for an additional $2,805 fee.

5. POST-APPROVAL STEPS
After approval, the beneficiary may need to attend consular processing if outside the US, or have their status adjusted if already inside the country.`,
  article_type: 'guide',
  category: 'platform_config',
  tag: 'h1b',
  view_count: 1248,
  is_featured: true,
  published_at: '2026-04-15T10:00:00Z',
  updated_at: '2026-06-10T14:00:00Z',
};

export default function ArticleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [article, setArticle] = useState<HelpArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<'yes' | 'no' | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    helpSupportApi.getArticle(id)
      .then((r) => setArticle(r || { ...MOCK_ARTICLE, id }))
      .catch(() => setArticle({ ...MOCK_ARTICLE, id }))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/lawyer/help')} className="mb-4 text-xs text-indigo-600 hover:underline">
          ← Back to Help
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠ Article not found.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      {/* Back navigation — top-left, above the article header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* Back */}
      <button onClick={() => navigate('/lawyer/help')} className="text-xs text-indigo-600 hover:underline">
        ← Back to Help
      </button>

      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <ArticleTypeBadge type={article.article_type} />
          <span className="text-[10px] text-gray-500">·</span>
          <span className="text-[10px] text-gray-500">{article.view_count.toLocaleString()} views</span>
          <span className="text-[10px] text-gray-500">·</span>
          <span className="text-[10px] text-gray-500">Updated {formatDate(article.updated_at)}</span>
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{article.title}</h1>
        {article.summary && <p className="mt-2 text-base text-gray-600">{article.summary}</p>}
      </header>

      {/* Body */}
      <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
          {article.body || 'No content available.'}
        </div>
      </article>

      {/* Was this helpful? */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 text-center shadow-sm">
        {feedback ? (
          <p className="text-sm text-emerald-700">
            ✅ Thanks for your feedback{feedback === 'no' ? ' — we\'ll work on improving this article' : ''}.
          </p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900">Was this article helpful?</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                onClick={() => setFeedback('yes')}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                👍 Yes
              </button>
              <button
                onClick={() => setFeedback('no')}
                className="rounded-lg border border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                👎 No
              </button>
            </div>
          </>
        )}
      </section>

      {/* Still need help */}
      <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-5 text-center">
        <p className="text-sm font-semibold text-gray-900">Still need help?</p>
        <p className="mt-1 text-xs text-gray-600">
          Submit a ticket and our support team will respond within 24 hours.
        </p>
        <button
          onClick={() => navigate('/lawyer/help/tickets?new=1')}
          className="mt-3 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          📝 Submit a Ticket
        </button>
      </section>
    </div>
  );
}

function ArticleTypeBadge({ type }: { type: string }) {
  const safe = type || 'faq';
  const map: Record<string, string> = {
    faq:            'bg-gray-100 text-gray-700',
    guide:          'bg-blue-100 text-blue-700',
    video_tutorial: 'bg-purple-100 text-purple-700',
    policy:         'bg-amber-100 text-amber-700',
  };
  const labels: Record<string, string> = {
    faq:            'FAQ',
    guide:          'Guide',
    video_tutorial: 'Video',
    policy:         'Policy',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[safe] || 'bg-gray-100 text-gray-700'}`}>
      {labels[safe] || safe}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}
