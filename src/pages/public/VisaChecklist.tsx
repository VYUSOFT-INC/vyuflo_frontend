// src/pages/public/VisaChecklist.tsx
//
// Visa Document Checklist — reference screen shared by Employee, HR
// and Attorney roles.  Route: /visa-checklist
//
// Data source: backend GET /visa-types  (same catalog Admin manages
// under /admin/visa-types).  Anything an admin adds shows up here
// automatically after a refresh.  FAQs + document detail bodies live
// in src/data/visaChecklist.ts and are merged in at render time.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck2, ChevronRight, ChevronLeft, ChevronDown, Download, Sparkles,
  BookOpen, GraduationCap, Plane, Users2, Award, Heart, HelpCircle, Info,
} from 'lucide-react';

import { visaChecklistApi } from '../../api/employee/visaChecklist.api';
import {
  VISA_CATEGORIES,
  POPULAR_VISA_KEYS,
  toUiVisa,
  getVisaByKey,
  getVisasByCategory,
  getCategoryLabel,
  getDocDetail,
  getFaqsForVisa,
  type VisaCategoryKey,
  type VisaType,
} from '../../data/visaChecklist';

// Category → icon (used on popular cards + "view all" group headers)
function categoryIcon(cat: VisaCategoryKey) {
  switch (cat) {
    case 'employment':    return <Award className="text-indigo-600" size={18} />;
    case 'student':       return <GraduationCap className="text-emerald-600" size={18} />;
    case 'visitor':       return <Plane className="text-sky-600" size={18} />;
    case 'dependent':     return <Users2 className="text-purple-600" size={18} />;
    case 'gc-employment': return <BookOpen className="text-orange-600" size={18} />;
    case 'gc-family':     return <Heart className="text-rose-600" size={18} />;
    case 'exchange':      return <GraduationCap className="text-teal-600" size={18} />;
    case 'other':         return <FileCheck2 className="text-gray-500" size={18} />;
  }
}

// Category → full color theme for cards (bg + border + pill + arrow hover)
function categoryTheme(cat: VisaCategoryKey) {
  switch (cat) {
    case 'employment':    return { cardBg: 'bg-gradient-to-br from-indigo-50 via-white to-indigo-100/60',   border: 'border-indigo-200 hover:border-indigo-400',   iconBg: 'bg-indigo-100', pill: 'bg-indigo-100 text-indigo-700', arrow: 'group-hover:text-indigo-600' };
    case 'student':       return { cardBg: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60', border: 'border-emerald-200 hover:border-emerald-400', iconBg: 'bg-emerald-100', pill: 'bg-emerald-100 text-emerald-700', arrow: 'group-hover:text-emerald-600' };
    case 'visitor':       return { cardBg: 'bg-gradient-to-br from-sky-50 via-white to-sky-100/60',         border: 'border-sky-200 hover:border-sky-400',         iconBg: 'bg-sky-100', pill: 'bg-sky-100 text-sky-700', arrow: 'group-hover:text-sky-600' };
    case 'dependent':     return { cardBg: 'bg-gradient-to-br from-purple-50 via-white to-purple-100/60',   border: 'border-purple-200 hover:border-purple-400',   iconBg: 'bg-purple-100', pill: 'bg-purple-100 text-purple-700', arrow: 'group-hover:text-purple-600' };
    case 'gc-employment': return { cardBg: 'bg-gradient-to-br from-orange-50 via-white to-orange-100/60',   border: 'border-orange-200 hover:border-orange-400',   iconBg: 'bg-orange-100', pill: 'bg-orange-100 text-orange-700', arrow: 'group-hover:text-orange-600' };
    case 'gc-family':     return { cardBg: 'bg-gradient-to-br from-rose-50 via-white to-rose-100/60',       border: 'border-rose-200 hover:border-rose-400',       iconBg: 'bg-rose-100', pill: 'bg-rose-100 text-rose-700', arrow: 'group-hover:text-rose-600' };
    case 'exchange':      return { cardBg: 'bg-gradient-to-br from-teal-50 via-white to-teal-100/60',       border: 'border-teal-200 hover:border-teal-400',       iconBg: 'bg-teal-100', pill: 'bg-teal-100 text-teal-700', arrow: 'group-hover:text-teal-600' };
    case 'other':         return { cardBg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100/60',       border: 'border-gray-200 hover:border-gray-400',       iconBg: 'bg-gray-100', pill: 'bg-gray-100 text-gray-700', arrow: 'group-hover:text-gray-600' };
  }
}

export default function VisaChecklist() {
  const navigate = useNavigate();

  // ── Fetched visa catalog ─────────────────────────────────────
  const [allVisas, setAllVisas] = useState<VisaType[]>([]);
  const [loading,  setLoading]  = useState<boolean>(true);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    visaChecklistApi.listVisaTypes()
      .then((items) => {
        if (cancelled) return;
        const ui = items
          // Only surface active visas — admin can toggle status server-side.
          .filter((b) => b.is_active !== false)
          .map(toUiVisa);
        setAllVisas(ui);
        if (ui.length === 0) {
          setError('No visa types available. Please contact your administrator.');
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load visa catalog. Please try again later.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Selection state ──────────────────────────────────────────
  const [category,     setCategory]     = useState<VisaCategoryKey | ''>('');
  const [visaKey,      setVisaKey]      = useState<string>('');
  const [viewedVisa,   setViewedVisa]   = useState<VisaType | null>(null);
  const [showAll,      setShowAll]      = useState<boolean>(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [openFaqs,     setOpenFaqs]     = useState<Set<number>>(new Set());
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);

  // Cache full details across clicks so we only hit /visa-types/:id once per
  // visa per session — subsequent clicks reuse the same data.
  const detailCacheRef = useMemo(() => new Map<string, VisaType>(), []);

  // Reset visa selection when category changes so we never land in an
  // invalid (category, visa) combo.
  useEffect(() => { setVisaKey(''); }, [category]);

  // Reset expanded doc/FAQ state whenever the loaded visa changes.
  useEffect(() => {
    setExpandedDocs(new Set());
    setOpenFaqs(new Set());
  }, [viewedVisa?.key]);

  // ── Derived ──────────────────────────────────────────────────
  const visaOptions = useMemo(() => {
    if (!category) return [] as VisaType[];
    return getVisasByCategory(allVisas, category);
  }, [allVisas, category]);

  const canView = Boolean(visaKey);

  const popularVisas = useMemo(() => {
    // First try to match by POPULAR_VISA_KEYS.  If nothing matches
    // (backend uses different codes), fall back to the first 4 active
    // visas in the catalog.
    const matched = POPULAR_VISA_KEYS
      .map((k) => getVisaByKey(allVisas, k))
      .filter(Boolean) as VisaType[];
    if (matched.length >= 4) return matched.slice(0, 4);
    const seen = new Set(matched.map((v) => v.key));
    const filler = allVisas.filter((v) => !seen.has(v.key)).slice(0, 4 - matched.length);
    return [...matched, ...filler];
  }, [allVisas]);

  // Only show category rows that actually have visas.  If backend
  // returns unusual categories they'll appear as "Other".
  const categoriesWithData = useMemo(() => {
    const present = new Set(allVisas.map((v) => v.category));
    return VISA_CATEGORIES.filter((c) => present.has(c.key));
  }, [allVisas]);

  // ── Handlers ─────────────────────────────────────────────────
  const toggleDoc = (name: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };
  const toggleFaq = (idx: number) => {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  /**
   * Load a visa's FULL detail — fetches /visa-types/:id if needed so we
   * get required_documents (list endpoint often omits them).  Merges the
   * detail response over the list-cached shell so header data stays
   * intact if the detail call fails.
   */
  const loadVisaDetail = async (base: VisaType): Promise<VisaType> => {
    // If we already have docs OR no backendId → nothing to fetch.
    if (base.documents.length > 0 || !base.backendId) return base;

    // Cache lookup
    const cached = detailCacheRef.get(base.key);
    if (cached) return cached;

    setLoadingDetail(true);
    try {
      const detail = await visaChecklistApi.getVisaTypeDetail(base.backendId);
      if (detail) {
        const enriched = toUiVisa(detail);
        // Preserve list-side fields if detail is missing anything.
        const merged: VisaType = {
          ...base,
          ...enriched,
          documents: enriched.documents.length > 0 ? enriched.documents : base.documents,
        };
        detailCacheRef.set(base.key, merged);
        return merged;
      }
    } catch { /* keep base */ }
    finally { setLoadingDetail(false); }
    return base;
  };

  const handleView = async () => {
    const v = getVisaByKey(allVisas, visaKey);
    if (!v) return;
    setViewedVisa(v);            // instant paint
    const full = await loadVisaDetail(v);
    setViewedVisa(full);         // fill in docs
  };

  const handlePopularClick = async (v: VisaType) => {
    setCategory(v.category);
    setTimeout(() => setVisaKey(v.key), 0);
    setViewedVisa(v);            // instant paint
    setTimeout(() => {
      document.getElementById('visa-details-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
    const full = await loadVisaDetail(v);
    setViewedVisa(full);         // fill in docs
  };
  const handleDownloadPdf = () => { window.print(); };

  // ── Render ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: 'Inter, sans-serif',
        background:
          'linear-gradient(180deg, #eef2ff 0%, #fdf4ff 30%, #f8fafc 100%)',
      }}
    >
      <main className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">

        {/* ── Back button ─────────────────────────────────────── */}
        <div className="print:hidden mb-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white/80 backdrop-blur-sm px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700 hover:bg-white transition"
          >
            <ChevronLeft size={16} /> Back
          </button>
        </div>

        {/* ── Header hero ──────────────────────────────────────── */}
        <header className="print:hidden relative overflow-hidden rounded-2xl shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #db2777 100%)' }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-6 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative flex items-center gap-4 p-6 sm:p-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm ring-1 ring-white/30">
              <FileCheck2 size={28} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Visa Document Checklist
              </h1>
              <p className="mt-1 text-sm text-indigo-100">
                Reference guide for U.S. visa categories and their required documents.
              </p>
            </div>
          </div>
        </header>

        {/* ── Loading + Error ─────────────────────────────────── */}
        {loading && (
          <div className="print:hidden mt-8 flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            Loading visa catalog…
          </div>
        )}
        {!loading && error && (
          <div className="print:hidden mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {error}
          </div>
        )}

        {/* ── Popular ─────────────────────────────────────────── */}
        {!loading && allVisas.length > 0 && (
          <section className="print:hidden mt-8">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-800">
                Popular Visa Types
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popularVisas.map((v) => {
                const theme = categoryTheme(v.category);
                return (
                  <button
                    key={v.key}
                    onClick={() => handlePopularClick(v)}
                    className={`group text-left rounded-2xl border-2 p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${theme.cardBg} ${theme.border}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${theme.iconBg}`}>
                        {categoryIcon(v.category)}
                      </div>
                      <ChevronRight size={18} className={`text-gray-300 transition ${theme.arrow}`} />
                    </div>
                    <p className="mt-4 text-lg font-extrabold text-gray-900 tracking-tight">{v.name}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.pill}`}>
                      {getCategoryLabel(v.category)}
                    </span>
                    <p className="mt-3 line-clamp-2 text-xs text-gray-700 leading-relaxed">{v.purpose}</p>
                  </button>
                );
              })}
            </div>

            {/* View all visa types — bottom-right, blue */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowAll((v) => !v);
                  setTimeout(() => {
                    document.getElementById('all-visas-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition"
              >
                {showAll ? 'Hide all visa types' : 'View all visa types'}
                <ChevronRight size={16} className={`transition-transform ${showAll ? 'rotate-90' : 'group-hover:translate-x-0.5'}`} />
              </button>
            </div>
          </section>
        )}

        {/* ── Dropdowns + View Requirements ───────────────────── */}
        {!loading && allVisas.length > 0 && (
          <section className="print:hidden mt-8 rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Find requirements by visa type</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pick a category, then the specific visa. Click <span className="font-medium text-gray-700">View Requirements</span> to load the checklist.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Visa Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as VisaCategoryKey | '')}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">— Select category —</option>
                  {categoriesWithData.map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-700 mb-1">Specific Visa</label>
                <select
                  value={visaKey}
                  onChange={(e) => setVisaKey(e.target.value)}
                  disabled={!category}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">{category ? '— Select visa —' : 'Choose a category first'}</option>
                  {visaOptions.map((v) => (
                    <option key={v.key} value={v.key}>{v.name} — {v.title.replace(new RegExp(`^${v.name}\\s*[—-]?\\s*`), '')}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleView}
                disabled={!canView}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                View Requirements
              </button>
            </div>
          </section>
        )}

        {/* ── Requirements Panel ──────────────────────────────── */}
        {viewedVisa && (
          <section
            id="visa-details-panel"
            className="mt-8 rounded-xl border border-gray-200 bg-white p-5 print:mt-0 print:border-0 print:p-0"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  {categoryIcon(viewedVisa.category)}
                  <span>{getCategoryLabel(viewedVisa.category)}</span>
                </div>
                <h2 className="mt-1 text-2xl font-bold text-gray-900">{viewedVisa.title}</h2>
                <p className="mt-1 text-sm text-gray-600">{viewedVisa.purpose}</p>
                {(viewedVisa.processingLabel || viewedVisa.governmentFee !== undefined) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-medium">
                    {viewedVisa.processingLabel && (
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 border border-blue-200">
                        Processing: {viewedVisa.processingLabel}
                      </span>
                    )}
                    {typeof viewedVisa.governmentFee === 'number' && viewedVisa.governmentFee > 0 && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800 border border-amber-200">
                        Govt fee: ${viewedVisa.governmentFee.toLocaleString()}
                      </span>
                    )}
                    {viewedVisa.requiresEmployer && (
                      <span className="rounded-full bg-purple-50 px-2.5 py-1 text-purple-700 border border-purple-200">
                        Employer sponsor required
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleDownloadPdf}
                className="print:hidden inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 shadow-sm hover:border-indigo-300 hover:text-indigo-700"
              >
                <Download size={14} /> Download PDF
              </button>
            </div>

            {/* Required Documents */}
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Required Documents
              </p>
              <p className="mt-0.5 text-[11px] text-gray-400">
                Click any document to see format details, examples, and tips.
              </p>
              {loadingDetail ? (
                <div className="mt-3 flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  Loading required documents…
                </div>
              ) : viewedVisa.documents.length === 0 ? (
                <p className="mt-3 rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500">
                  No documents listed for this visa type yet. Ask your administrator to update the checklist.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {viewedVisa.documents.map((d) => {
                    const detail = getDocDetail(d);
                    const isOpen = expandedDocs.has(d);
                    const hasDetail = !!detail;
                    return (
                      <li key={d} className="rounded-lg border border-emerald-100 bg-white overflow-hidden">
                        <button
                          onClick={() => hasDetail && toggleDoc(d)}
                          disabled={!hasDetail}
                          className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                            hasDetail ? 'hover:bg-emerald-50/50' : 'cursor-default'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <FileCheck2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                            <span className="text-sm font-semibold text-gray-900">{d}</span>
                          </div>
                          {hasDetail && (
                            <ChevronDown
                              size={16}
                              className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            />
                          )}
                        </button>
                        {hasDetail && isOpen && detail && (
                          <div className="border-t border-emerald-100 bg-emerald-50/30 px-4 py-3 space-y-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">What it is</p>
                              <p className="mt-0.5 text-sm text-gray-800 leading-relaxed">{detail.what}</p>
                            </div>
                            {detail.format && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Format</p>
                                <p className="mt-0.5 text-sm text-gray-800 leading-relaxed">{detail.format}</p>
                              </div>
                            )}
                            {detail.tip && (
                              <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                                <Info size={14} className="mt-0.5 shrink-0 text-amber-600" />
                                <p className="text-xs text-amber-900 leading-relaxed">{detail.tip}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* FAQ */}
            <div className="mt-8 rounded-xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/40 p-5">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                  <HelpCircle size={16} className="text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Frequently Asked Questions</p>
                  <p className="text-[11px] text-gray-500">Common questions about the {viewedVisa.name} visa</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {getFaqsForVisa(viewedVisa).map((f, idx) => {
                  const isOpen = openFaqs.has(idx);
                  return (
                    <div key={f.q} className="rounded-lg border border-indigo-100 bg-white overflow-hidden">
                      <button
                        onClick={() => toggleFaq(idx)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50/40 transition"
                      >
                        <span className="text-sm font-semibold text-gray-900">{f.q}</span>
                        <ChevronDown
                          size={16}
                          className={`shrink-0 mt-0.5 text-indigo-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="border-t border-indigo-100 bg-indigo-50/30 px-4 py-3">
                          <p className="text-sm text-gray-800 leading-relaxed">{f.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Print footer */}
            <div className="mt-6 hidden print:block text-[10px] text-gray-500">
              Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · VisaFlow Visa Checklist
            </div>
          </section>
        )}

        {/* ── View All Visa Types (grouped by category) ────── */}
        <section id="all-visas-panel" className="print:hidden mt-8">
          {showAll && !loading && allVisas.length > 0 && (
            <div className="space-y-6">
              {categoriesWithData.map((cat) => {
                const visas = getVisasByCategory(allVisas, cat.key);
                if (visas.length === 0) return null;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center gap-2">
                      {categoryIcon(cat.key)}
                      <h3 className="text-sm font-bold text-gray-900">{cat.label}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">
                        {visas.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">{cat.blurb}</p>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visas.map((v) => {
                        const theme = categoryTheme(v.category);
                        return (
                          <button
                            key={v.key}
                            onClick={() => handlePopularClick(v)}
                            className={`group flex items-start justify-between gap-2 rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${theme.cardBg} ${theme.border}`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-900">{v.name}</p>
                              <p className="mt-0.5 line-clamp-2 text-xs text-gray-700">{v.purpose}</p>
                            </div>
                            <ChevronRight size={14} className={`mt-0.5 shrink-0 text-gray-300 transition ${theme.arrow}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </main>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          @page { margin: 18mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:mt-0 { margin-top: 0 !important; }
          .print\\:border-0 { border: 0 !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}