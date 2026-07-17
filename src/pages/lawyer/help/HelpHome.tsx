// src/pages/lawyer/help/HelpHome.tsx
//
// Combines Figma Screens 28 (FAQ Home) + 30 (Search Results) + 31 (Support Resources).
//
// Lawyer's first stop when they need help. Goal: SELF-SERVICE FIRST.
// If the lawyer's question is in an article/FAQ, they don't need to wait
// for support. Search > categories > popular articles > submit ticket fallback.
//
// LAWYER USE CASE:
//   "Mid-petition lo USCIS naa client ki visa stamping ki RFE ichindhi —
//   ee scenarios em chesthaaru immigration attorneys?" → search "RFE response"
//   → finds curated article → reads → fixed in 5 min instead of 30 min ticket wait.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. Search query lives in URL (?search=...) so browser back/forward works.
//   2. Search debounced 300ms — don't hammer backend on every keystroke.
//   3. Mock fallback when backend empty (4 articles preloaded).
//   4. Defensive on category/type strings — handle null/undefined.
//   5. Click article → /lawyer/help/articles/:id (backend auto-increments view).

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { helpSupportApi } from '../../../api/lawyer/helpSupport.api';
import type {
  ArticleCategory,
  HelpArticle,
} from '../../../types/lawyer/helpSupport.types';

/* ════════════════════════════════════════════════════════════════════
   MOCK FALLBACK — realistic immigration-law help content
   ════════════════════════════════════════════════════════════════════ */
const MOCK_ARTICLES: HelpArticle[] = [
  {
    id: 'art-001',
    title: 'Step-by-Step Guide to the H1B Process',
    summary: 'Initial assessment, LCA filing, petition preparation, USCIS processing, and post-approval steps.',
    body: '',
    article_type: 'guide',
    category: 'platform_config',
    tag: 'h1b',
    view_count: 1247,
    is_featured: true,
    published_at: '2026-04-15T10:00:00Z',
    updated_at: '2026-06-10T14:00:00Z',
  },
  {
    id: 'art-002',
    title: 'Responding to an RFE — Best Practices',
    summary: 'How to interpret RFE language, build a comprehensive response, and avoid common pitfalls.',
    body: '',
    article_type: 'guide',
    category: 'platform_config',
    tag: 'rfe',
    view_count: 892,
    is_featured: true,
    published_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-05-15T14:00:00Z',
  },
  {
    id: 'art-003',
    title: 'How do I create my first invoice?',
    summary: 'Use the Billing dashboard → click "Draft" on a Top Client card → review line items → send.',
    body: '',
    article_type: 'faq',
    category: 'billing',
    tag: 'billing',
    view_count: 543,
    is_featured: false,
    published_at: '2026-05-01T10:00:00Z',
    updated_at: '2026-05-01T10:00:00Z',
  },
  {
    id: 'art-004',
    title: 'Setting up custom hourly rates per client',
    summary: 'Configure custom_rate_cents on a Billing Client to override your default attorney rate.',
    body: '',
    article_type: 'faq',
    category: 'billing',
    tag: 'rates',
    view_count: 287,
    is_featured: false,
    published_at: '2026-05-10T10:00:00Z',
    updated_at: '2026-05-10T10:00:00Z',
  },
  {
    id: 'art-005',
    title: 'Document upload size limits and supported formats',
    summary: 'Max 25 MB per file. Supported: PDF, DOCX, JPG, PNG. OCR runs on PDFs/images automatically.',
    body: '',
    article_type: 'faq',
    category: 'platform_config',
    tag: 'documents',
    view_count: 412,
    is_featured: false,
    published_at: '2026-04-25T10:00:00Z',
    updated_at: '2026-04-25T10:00:00Z',
  },
  {
    id: 'art-006',
    title: 'Two-factor authentication setup',
    summary: 'Enable 2FA via Profile → Security → Two-factor authentication. Required for attorneys.',
    body: '',
    article_type: 'policy',
    category: 'security',
    tag: 'security',
    view_count: 198,
    is_featured: false,
    published_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-01T10:00:00Z',
  },
];

const CATEGORIES: { id: ArticleCategory | 'all'; label: string; icon: string; color: string }[] = [
  { id: 'all',              label: 'All',              icon: '📚', color: 'bg-gray-100 text-gray-700' },
  { id: 'platform_config',  label: 'Platform & Cases', icon: '⚙',  color: 'bg-indigo-100 text-indigo-700' },
  { id: 'billing',          label: 'Billing',          icon: '💰', color: 'bg-emerald-100 text-emerald-700' },
  { id: 'integrations',     label: 'Integrations',     icon: '🔌', color: 'bg-violet-100 text-violet-700' },
  { id: 'user_management',  label: 'Users & Roles',    icon: '👥', color: 'bg-amber-100 text-amber-700' },
  { id: 'security',         label: 'Security',         icon: '🔒', color: 'bg-rose-100 text-rose-700' },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function HelpHome() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const search   = searchParams.get('search') || '';
  const category = (searchParams.get('category') || 'all') as ArticleCategory | 'all';

  const [articles, setArticles]   = useState<HelpArticle[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchInput, setSearchInput] = useState(search);

  /* Sync local input when URL search changes (back button etc) */
  useEffect(() => { setSearchInput(search); }, [search]);

  /* Debounced fetch when search/category change */
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      helpSupportApi.listArticles({
        search:   search   || undefined,
        category: category === 'all' ? undefined : category,
        limit:    20,
      })
        .then((r) => {
          const items = r.items || [];
          setArticles(items.length > 0 ? items : filterMock(MOCK_ARTICLES, search, category));
        })
        .catch(() => setArticles(filterMock(MOCK_ARTICLES, search, category)))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, category]);

  /* Featured (popular) articles — only when no search */
  const featured = useMemo(() => articles.filter((a) => a.is_featured).slice(0, 3), [articles]);
  const faqs     = useMemo(() => articles.filter((a) => a.article_type === 'faq'), [articles]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set('search', searchInput.trim());
    else next.delete('search');
    setSearchParams(next);
  };

  const setCategory = (cat: ArticleCategory | 'all') => {
    const next = new URLSearchParams(searchParams);
    if (cat === 'all') next.delete('category');
    else next.set('category', cat);
    setSearchParams(next);
  };

  const isSearching = !!search;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back navigation — top-left, above the page header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* ── Top-right nav bar: My Tickets + Notifications ─────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Help &amp; Support</h1>
          <p className="text-xs text-gray-500">Find answers fast or get in touch with our team</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/lawyer/help/tickets')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            📋 My Tickets
          </button>
          <button
            onClick={() => navigate('/lawyer/help/notifications')}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
          >
            🔔 Notifications
          </button>
        </div>
      </div>

      {/* ── Hero (always visible) — softer light background ──────── */}
      <section className="relative overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 px-6 py-10 text-center shadow-sm sm:px-10 sm:py-12">
        {/* subtle decorative blob — easier on eyes than solid blue */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-violet-100/60 blur-3xl" />

        <div className="relative">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">How can we help you today?</h1>
          <p className="mt-2 text-sm text-gray-600">
            Search articles, browse by category, or contact support
          </p>
          <form onSubmit={submitSearch} className="mx-auto mt-6 flex max-w-xl items-center gap-2 rounded-xl border border-gray-200 bg-white p-1.5 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <span className="pl-3 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search for articles, videos, FAQs..."
              className="flex-1 border-0 px-2 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-0"
            />
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* ── Search results mode ───────────────────────────────────── */}
      {isSearching && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Results for "<span className="text-indigo-600">{search}</span>"
            </h2>
            <button
              onClick={() => setSearchParams({})}
              className="text-xs text-indigo-600 hover:underline"
            >
              Clear search
            </button>
          </div>
          <ArticlesList articles={articles} loading={loading} onOpen={(id) => navigate(`/lawyer/help/articles/${id}`)} />
        </section>
      )}

      {/* ── Default mode (no search): categories + popular + FAQ ──── */}
      {!isSearching && (
        <>
          {/* Categories grid */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Browse by Category</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition ${
                    category === c.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${c.color}`}>
                    {c.icon}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">{c.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Featured (Popular Articles) */}
          {featured.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700">⭐ Popular Articles</h2>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {featured.map((a) => (
                  <ArticleCard key={a.id} article={a} onClick={() => navigate(`/lawyer/help/articles/${a.id}`)} />
                ))}
              </div>
            </section>
          )}

          {/* FAQs */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-gray-700">Frequently Asked Questions</h2>
            <FAQList articles={faqs.length > 0 ? faqs : articles} loading={loading} />
          </section>
        </>
      )}

      {/* ── Still need help CTA — Submit Ticket only (My Tickets / Notifications moved to top) ─ */}
      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-6 text-center">
        <p className="text-lg font-semibold text-gray-900">Still need help?</p>
        <p className="mt-1 text-sm text-gray-600">
          Submit a ticket and our support team will respond within 24 hours.
        </p>
        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => navigate('/lawyer/help/tickets?new=1')}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            📝 Submit a Ticket
          </button>
        </div>
      </section>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════ */
function ArticlesList({
  articles, loading, onOpen,
}: {
  articles: HelpArticle[]; loading: boolean; onOpen: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />)}
      </div>
    );
  }
  if (articles.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
        <p className="text-3xl">🔍</p>
        <p className="mt-2 text-sm font-semibold text-gray-900">No articles found</p>
        <p className="mt-1 text-xs text-gray-500">Try different keywords or browse by category.</p>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {articles.map((a) => (
        <li
          key={a.id}
          onClick={() => onOpen(a.id)}
          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900">{a.title}</p>
              <p className="mt-1 text-xs text-gray-600">{a.summary}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-500">
                <ArticleTypeBadge type={a.article_type} />
                <span>·</span>
                <span>{a.view_count.toLocaleString()} views</span>
                <span>·</span>
                <span>{formatDate(a.updated_at)}</span>
              </div>
            </div>
            <span className="shrink-0 text-gray-400">→</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Accordion-style FAQ list. Clicking a question expands the answer INLINE
 * instead of navigating away — much faster for quick lookups.
 *
 * CAUTION:
 *   1. Only one item open at a time (single-accordion). Click open one →
 *      previous auto-closes. Cleaner than letting all 8 unfurl at once.
 *   2. Body fetched on-demand via getArticle if not present in list payload,
 *      then CACHED in local state so re-expanding is instant.
 *   3. Defensive on empty body — shows "View full article →" fallback link
 *      to ArticleDetail for very long content.
 */
function FAQList({
  articles, loading,
}: {
  articles: HelpArticle[]; loading: boolean;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bodies, setBodies] = useState<Record<string, string>>({});
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggle = (article: HelpArticle) => {
    /* Click open one → previous auto-closes */
    if (expandedId === article.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(article.id);

    /* Body already cached? Skip fetch */
    if (bodies[article.id]) return;

    /* Body inline in list response? Cache it */
    if (article.body && article.body.trim().length > 0) {
      setBodies((curr) => ({ ...curr, [article.id]: article.body }));
      return;
    }

    /* Fetch from backend (also increments view_count) */
    setLoadingBodyId(article.id);
    helpSupportApi.getArticle(article.id)
      .then((full) => {
        if (full?.body) {
          setBodies((curr) => ({ ...curr, [article.id]: full.body }));
        }
      })
      .catch(() => { /* silent — fallback message renders below */ })
      .finally(() => setLoadingBodyId(null));
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />)}
      </div>
    );
  }
  if (articles.length === 0) {
    return <p className="text-sm text-gray-500">No FAQs in this category.</p>;
  }

  return (
    <ul className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {articles.map((a) => {
        const isOpen   = expandedId === a.id;
        const isLoadingBody = loadingBodyId === a.id;
        const body     = bodies[a.id];

        return (
          <li key={a.id} className="border-b border-gray-100 last:border-0">
            {/* Clickable header */}
            <button
              type="button"
              onClick={() => toggle(a)}
              aria-expanded={isOpen}
              className={`flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition ${
                isOpen ? 'bg-indigo-50/40' : 'hover:bg-gray-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className={`font-medium ${isOpen ? 'text-indigo-700' : 'text-gray-900'}`}>
                  {a.title}
                </p>
                {!isOpen && a.summary && (
                  <p className="mt-0.5 truncate text-xs text-gray-500">{a.summary}</p>
                )}
              </div>
              <span
                className={`shrink-0 text-base transition-transform ${
                  isOpen ? 'rotate-180 text-indigo-600' : 'text-gray-400'
                }`}
                aria-hidden="true"
              >
                ⌄
              </span>
            </button>

            {/* Expandable answer panel */}
            {isOpen && (
              <div className="border-t border-indigo-100 bg-white px-5 pb-4 pt-3 text-sm leading-relaxed text-gray-700">
                {isLoadingBody ? (
                  <div className="space-y-2">
                    <div className="h-3 animate-pulse rounded bg-gray-100" />
                    <div className="h-3 animate-pulse rounded bg-gray-100 w-3/4" />
                  </div>
                ) : body ? (
                  <>
                    <div className="whitespace-pre-wrap">{body}</div>
                    <button
                      onClick={() => navigate(`/lawyer/help/articles/${a.id}`)}
                      className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Open full article →
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600">{a.summary || 'No additional details available.'}</p>
                    <button
                      onClick={() => navigate(`/lawyer/help/articles/${a.id}`)}
                      className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                    >
                      Read full article →
                    </button>
                  </>
                )}

                {/* Mini metadata */}
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                  <ArticleTypeBadge type={a.article_type} />
                  <span>·</span>
                  <span>{(a.view_count || 0).toLocaleString()} views</span>
                  {a.updated_at && (
                    <>
                      <span>·</span>
                      <span>Updated {formatDate(a.updated_at)}</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ArticleCard({ article, onClick }: { article: HelpArticle; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-start rounded-xl border border-gray-200 bg-white p-5 text-left transition hover:border-indigo-300 hover:shadow-md"
    >
      <ArticleTypeBadge type={article.article_type} />
      <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-indigo-700">{article.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-gray-600">{article.summary}</p>
      <p className="mt-3 text-[10px] text-gray-400">{article.view_count.toLocaleString()} views</p>
    </button>
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

/* ── Helpers ─────────────────────────────────────────────────────── */
function filterMock(
  articles: HelpArticle[],
  search: string,
  category: ArticleCategory | 'all',
): HelpArticle[] {
  let result = articles;
  if (category && category !== 'all') {
    result = result.filter((a) => a.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((a) =>
      (a.title   || '').toLowerCase().includes(q) ||
      (a.summary || '').toLowerCase().includes(q) ||
      (a.tag     || '').toLowerCase().includes(q),
    );
  }
  return result;
}

function formatDate(iso: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}
