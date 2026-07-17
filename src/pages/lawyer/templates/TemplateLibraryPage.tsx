// src/pages/lawyer/templates/TemplateLibraryPage.tsx
//
// Figma node 35:6251 — Template Library (Screen 22).
//
// One file does it all (same pattern as Billing / Help / Messages):
//   • Header + My/Platform toggle
//   • Type tabs row (All / Cover / Support / RFE / Petition)
//   • Search input
//   • Visa code filter chip strip
//   • Card grid + "Create New" tile
//   • Preview modal (body_content with {{placeholder}} highlighting)
//   • Use modal (pick application + custom title → spawns Document)
//   • Create modal (form for new personal template)
//   • Edit modal (3-dot menu, only own personal templates)
//   • Delete confirm
//   • Pagination footer
//
// LAWYER USE CASE (why this exists):
//   Immigration lawyers draft Cover Letters, Support Letters, RFE Responses
//   and Petition Statements daily. 80% boilerplate, 20% case-specific.
//   Templates → swap {{placeholders}} → save hours per letter.
//
// ── CAUTIONS ─────────────────────────────────────────────────────────
//   1. URL-driven state (?source=&type=&visa=&search=&page=) → deep-linkable.
//   2. 3-dot menu only visible on OWN personal templates (created_by match + !is_platform).
//   3. Edit/Delete API returns 403 for platform OR non-creator — UI hides actions defensively.
//   4. Use button → creates Document → optimistic use_count++ → redirects to editor.
//   5. Mock fallback when backend empty (6 demo templates with realistic content).
//   6. Defensive on null page_count/use_count → fall back to 0.
//   7. Mobile-responsive: grid collapses 1-col → 2-col → 3-col by breakpoint.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../../../api/axios';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { templatesApi } from '../../../api/lawyer/templates.api';
import { intakeApi } from '../../../api/lawyer/intake.api';
import type { AssignedApplication } from '../../../types/lawyer/intake.types';

/** Visa type row as returned by GET /api/v1/visa-types. Shape mirrored
 *  here (not pulled from a shared types module) because the Template
 *  Library only needs a handful of fields. When backend exposes a typed
 *  client, replace this with the shared import. */
interface VisaTypeOption {
  id:           string;
  code:         string;       // e.g. "H-1B", "F-1-STEM-OPT"
  short_label:  string;       // e.g. "H-1B", "STEM OPT"
  name:         string;       // e.g. "H-1B Specialty Occupation"
  category?:    string;
  is_active?:   boolean;
  display_order?: number;
}
import type {
  CreateTemplatePayload,
  TemplateDetail,
  TemplateListItem,
  TemplateSource,
  TemplateType,
  UpdateTemplatePayload,
} from '../../../types/lawyer/templates.types';

/* ════════════════════════════════════════════════════════════════════
   CONSTANTS
   ════════════════════════════════════════════════════════════════════ */

const TYPE_TABS: { id: TemplateType | 'all'; label: string }[] = [
  { id: 'all',                label: 'All Templates' },
  { id: 'cover_letter',       label: 'Cover Letters' },
  { id: 'support_letter',     label: 'Support Letters' },
  { id: 'rfe_response',       label: 'RFE Responses' },
  { id: 'petition_statement', label: 'Petition Statements' },
];

const TYPE_LABELS: Record<string, string> = {
  cover_letter:       'Cover Letter',
  support_letter:     'Support Letter',
  rfe_response:       'RFE Response',
  petition_statement: 'Petition Statement',
};

const TYPE_COLORS: Record<string, string> = {
  cover_letter:       'bg-blue-50 text-blue-700 border-blue-200',
  support_letter:     'bg-violet-50 text-violet-700 border-violet-200',
  rfe_response:       'bg-amber-50 text-amber-700 border-amber-200',
  petition_statement: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

/** Fallback list — used while the live fetch is in flight or if it fails.
 *  Order matches the most common attorney use cases (H-1B family first,
 *  then student categories, then permanent-resident). When the API
 *  returns its 19 visa types these get replaced. */
const FALLBACK_VISA_CODES = ['H-1B', 'L-1A', 'O-1A', 'TN', 'F-1', 'EB-2'];

const PAGE_SIZE = 6;

/* ════════════════════════════════════════════════════════════════════
   MOCK FALLBACK — realistic immigration templates
   ════════════════════════════════════════════════════════════════════ */

const MOCK_TEMPLATES: TemplateListItem[] = [
  {
    id: 'tpl-001',
    title: 'Software Engineer Initial Support',
    description: 'Standard support letter for H-1B initial petition detailing specialty occupation requirements and beneficiary qualifications.',
    template_type: 'support_letter',
    visa_type_code: 'H-1B',
    page_count: 4,
    use_count: 124,
    is_platform: true,
    is_active: true,
    created_by: 'platform',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2026-05-20T14:00:00Z',
  },
  {
    id: 'tpl-002',
    title: 'Extraordinary Ability Cover',
    description: 'Comprehensive cover letter outlining the evidentiary criteria met for extraordinary ability in sciences or business.',
    template_type: 'cover_letter',
    visa_type_code: 'O-1A',
    page_count: 8,
    use_count: 89,
    is_platform: true,
    is_active: true,
    created_by: 'platform',
    created_at: '2025-02-10T10:00:00Z',
    updated_at: '2026-04-15T14:00:00Z',
  },
  {
    id: 'tpl-003',
    title: 'Multinational Executive Transfer',
    description: 'Detailed statement establishing qualifying corporate relationship and executive/managerial capacity.',
    template_type: 'petition_statement',
    visa_type_code: 'L-1A',
    page_count: 6,
    use_count: 210,
    is_platform: true,
    is_active: true,
    created_by: 'platform',
    created_at: '2024-11-01T10:00:00Z',
    updated_at: '2026-06-01T14:00:00Z',
  },
  {
    id: 'tpl-004',
    title: 'Specialty Occupation RFE',
    description: 'Template for responding to common RFEs challenging the specialty occupation nature of the proffered position.',
    template_type: 'rfe_response',
    visa_type_code: 'H-1B',
    page_count: 12,
    use_count: 45,
    is_platform: false,
    is_active: true,
    created_by: 'me-attorney',
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-05-10T14:00:00Z',
  },
  {
    id: 'tpl-005',
    title: 'Management Consultant TN',
    description: 'Border presentation support letter for Management Consultant NAFTA professionals.',
    template_type: 'support_letter',
    visa_type_code: 'TN',
    page_count: 3,
    use_count: 178,
    is_platform: true,
    is_active: true,
    created_by: 'platform',
    created_at: '2024-10-05T10:00:00Z',
    updated_at: '2026-05-25T14:00:00Z',
  },
  {
    id: 'tpl-006',
    title: 'NIW National Interest Brief',
    description: 'EB-2 NIW petition statement covering substantial merit, national importance, and well-positioned criteria.',
    template_type: 'petition_statement',
    visa_type_code: 'EB-2',
    page_count: 18,
    use_count: 67,
    is_platform: false,
    is_active: true,
    created_by: 'me-attorney',
    created_at: '2026-04-12T10:00:00Z',
    updated_at: '2026-06-15T14:00:00Z',
  },
];

const MOCK_BODY = (t: TemplateListItem): string => `${t.title}

[Subject Line for USCIS Reference]
Re: {{client_name}} - ${TYPE_LABELS[String(t.template_type)] || 'Letter'}
Case: {{case_number}} | Visa: ${t.visa_type_code || '{{visa_type}}'}

To Whom It May Concern at U.S. Citizenship and Immigration Services:

This letter is submitted in support of the {{visa_petition_type}} petition filed on behalf of {{client_name}} by {{petitioner_name}}.

1. PETITIONER INFORMATION
   • Company Name: {{employer_name}}
   • Address: {{employer_address}}
   • FEIN: {{employer_fein}}
   • Business Type: {{business_type}}

2. BENEFICIARY INFORMATION
   • Name: {{client_name}}
   • Country of Birth: {{country_of_birth}}
   • Education: {{highest_degree}} from {{university}}

3. POSITION OFFERED
   ${t.description || 'Detailed description of the offered position will appear here.'}

4. EVIDENTIARY ANALYSIS
   [The full body of this template contains the legal analysis specific to ${TYPE_LABELS[String(t.template_type)] || 'this letter type'}. Replace each {{placeholder}} above with case-specific data, then customise sections 4-7 as appropriate.]

Respectfully submitted,

{{attorney_name}}
{{firm_name}}
Bar No. {{bar_number}}
`;

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function TemplateLibraryPage() {
  /* `navigate` not needed here — UseModal handles its own success navigation. */
  const [searchParams, setSearchParams] = useSearchParams();

  /* URL-driven filter state */
  const source     = (searchParams.get('source') || 'all') as TemplateSource;
  const typeFilter = (searchParams.get('type')   || 'all') as TemplateType | 'all';
  const visaFilter = searchParams.get('visa')    || '';
  const search     = searchParams.get('search')  || '';
  const page       = Number(searchParams.get('page') || '1');

  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotPages] = useState(1);
  const [loading, setLoading]     = useState(true);

  const [searchInput, setSearchInput] = useState(search);

  /* Modal state */
  const [previewId, setPreviewId]     = useState<string | null>(null);
  const [useTplId, setUseTplId]       = useState<string | null>(null);
  const [createOpen, setCreateOpen]   = useState(false);
  const [editTpl, setEditTpl]         = useState<TemplateListItem | null>(null);
  const [deleteTpl, setDeleteTpl]     = useState<TemplateListItem | null>(null);

  /* Live visa types (19 from backend) — used by filter chips + Create modal
     dropdown. Single fetch on mount; in-memory cache for the session.
     Falls back to a small hardcoded list so the chip row never renders empty. */
  const [visaTypes, setVisaTypes] = useState<VisaTypeOption[]>([]);
  useEffect(() => {
    let cancelled = false;
    axios
      .get<{ items: VisaTypeOption[]; total: number }>(
        '/visa-types',
        { params: { active_only: true, limit: 100, offset: 0 } },
      )
      .then((r) => {
        if (cancelled) return;
        const items = (r.data?.items || []).slice().sort(
          (a, b) => (a.display_order ?? 999) - (b.display_order ?? 999),
        );
        setVisaTypes(items);
      })
      .catch(() => { /* keep empty → chip row uses FALLBACK_VISA_CODES */ });
    return () => { cancelled = true; };
  }, []);

  /** Codes shown in the filter chip strip — real list when loaded,
   *  fallback constants otherwise so the strip never disappears. */
  const visaCodesForChips: string[] = visaTypes.length > 0
    ? visaTypes.map((v) => v.code)
    : FALLBACK_VISA_CODES;

  /* Banner for success/error toasts */
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 3500);
    return () => clearTimeout(t);
  }, [banner]);

  /* ── Sync local input when URL search changes ──────────────────── */
  useEffect(() => { setSearchInput(search); }, [search]);

  /* ── Fetch templates (debounced on search) ─────────────────────── */
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      templatesApi.listTemplates({
        is_platform:    source === 'all' ? undefined : source === 'platform',
        template_type:  typeFilter === 'all' ? undefined : typeFilter,
        visa_type_code: visaFilter || undefined,
        search:         search || undefined,
        page,
        page_size:      PAGE_SIZE,
      })
        .then((r) => {
          const items = r.items || [];
          if (items.length > 0) {
            setTemplates(items);
            setTotal(r.total || items.length);
            setTotPages(r.total_pages || Math.max(1, Math.ceil((r.total || items.length) / PAGE_SIZE)));
          } else {
            /* Mock fallback (filtered client-side) */
            const filtered = filterMock(MOCK_TEMPLATES, { source, typeFilter, visaFilter, search });
            const sliceStart = (page - 1) * PAGE_SIZE;
            setTemplates(filtered.slice(sliceStart, sliceStart + PAGE_SIZE));
            setTotal(filtered.length);
            setTotPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
          }
        })
        .catch(() => {
          const filtered = filterMock(MOCK_TEMPLATES, { source, typeFilter, visaFilter, search });
          const sliceStart = (page - 1) * PAGE_SIZE;
          setTemplates(filtered.slice(sliceStart, sliceStart + PAGE_SIZE));
          setTotal(filtered.length);
          setTotPages(Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [source, typeFilter, visaFilter, search, page]);

  /* ── URL setters ───────────────────────────────────────────────── */
  const setQuery = (patches: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patches).forEach(([k, v]) => {
      if (v == null || v === '' || v === 'all') next.delete(k);
      else next.set(k, v);
    });
    /* Any filter change → reset to page 1 unless the patch IS page */
    if (!('page' in patches)) next.delete('page');
    setSearchParams(next);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery({ search: searchInput.trim() || null });
  };

  /* ── Refresh after a mutation ──────────────────────────────────── */
  const refetch = () => setQuery({ /* no-op patch → forces re-render via state */ });

  /* ── Optimistic use_count bump on Use ──────────────────────────── */
  const bumpUseCount = (id: string) => {
    setTemplates((curr) =>
      curr.map((t) => (t.id === id ? { ...t, use_count: (t.use_count || 0) + 1 } : t)),
    );
  };

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Back navigation — top-left, above the page header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Template Library</h1>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            Manage and customize your firm&apos;s visa letter templates
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Source segmented toggle */}
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
            <SegmentButton active={source === 'my'}        onClick={() => setQuery({ source: 'my' })}>My Templates</SegmentButton>
            <SegmentButton active={source === 'platform'}  onClick={() => setQuery({ source: 'platform' })}>Platform Templates</SegmentButton>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 sm:text-sm"
          >
            + Create Template
          </button>
        </div>
      </div>

      {banner && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>{banner.text}</div>
      )}

      {/* ── Tabs row + search ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setQuery({ type: tab.id === 'all' ? null : tab.id })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                typeFilter === tab.id || (tab.id === 'all' && typeFilter === ('all' as TemplateType | 'all'))
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={submitSearch} className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search templates..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
        </form>
      </div>

      {/* ── Visa filter chip strip ────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-gray-500">Visa:</span>
        <button
          onClick={() => setQuery({ visa: null })}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            !visaFilter
              ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
          }`}
        >
          All
        </button>
        {visaCodesForChips.map((v) => (
          <button
            key={v}
            onClick={() => setQuery({ visa: visaFilter === v ? null : v })}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              visaFilter === v
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* ── Card grid ─────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-52 animate-pulse rounded-xl bg-gray-100" />)}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
          <p className="text-4xl">📄</p>
          <p className="mt-3 text-sm font-semibold text-gray-700">No templates found</p>
          <p className="mt-1 text-xs text-gray-500">Try a different filter or create a new template.</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            + Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onPreview={() => setPreviewId(t.id)}
              onUse={() => setUseTplId(t.id)}
              onEdit={() => setEditTpl(t)}
              onDelete={() => setDeleteTpl(t)}
            />
          ))}

          {/* Create New tile (only on first page) */}
          {page === 1 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="group flex h-52 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-2xl text-indigo-600 transition group-hover:scale-110">+</div>
              <p className="mt-3 font-semibold text-gray-900">Create New</p>
              <p className="mt-1 text-xs text-gray-500">Start a blank template or upload a document</p>
            </button>
          )}
        </div>
      )}

      {/* ── Pagination footer ─────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
          <p className="text-xs text-gray-500">
            Showing <strong>{(page - 1) * PAGE_SIZE + 1}</strong> to{' '}
            <strong>{Math.min(page * PAGE_SIZE, total)}</strong> of <strong>{total}</strong> templates
          </p>
          <Pagination current={page} total={totalPages} onChange={(p) => setQuery({ page: String(p) })} />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
         MODALS
         ════════════════════════════════════════════════════════════ */}
      {previewId && (
        <PreviewModal
          templateId={previewId}
          onClose={() => setPreviewId(null)}
          onUse={() => { setUseTplId(previewId); setPreviewId(null); }}
        />
      )}

      {useTplId && (
        <UseModal
          templateId={useTplId}
          onClose={() => setUseTplId(null)}
          /* Modal now shows its own success state with "Open Document Queue" /
             "Stay" choice — no auto-navigate that could land on a non-existent
             /lawyer/documents/edit/{id} route. Parent's job is only to bump
             the card's use_count. */
          onSuccess={() => {
            bumpUseCount(useTplId);
            setBanner({ type: 'success', text: 'Document created from template.' });
          }}
          onError={(msg) => setBanner({ type: 'error', text: msg })}
        />
      )}

      {createOpen && (
        <UpsertModal
          mode="create"
          visaTypes={visaTypes}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => {
            setCreateOpen(false);
            setBanner({ type: 'success', text: 'Template created.' });
            refetch();
          }}
          onError={(msg) => setBanner({ type: 'error', text: msg })}
        />
      )}

      {editTpl && (
        <UpsertModal
          mode="edit"
          template={editTpl}
          visaTypes={visaTypes}
          onClose={() => setEditTpl(null)}
          onSuccess={() => {
            setEditTpl(null);
            setBanner({ type: 'success', text: 'Template updated.' });
            refetch();
          }}
          onError={(msg) => setBanner({ type: 'error', text: msg })}
        />
      )}

      {deleteTpl && (
        <DeleteConfirm
          template={deleteTpl}
          onClose={() => setDeleteTpl(null)}
          onSuccess={() => {
            setDeleteTpl(null);
            setBanner({ type: 'success', text: 'Template deleted.' });
            refetch();
          }}
          onError={(msg) => setBanner({ type: 'error', text: msg })}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════════ */

function SegmentButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
        active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  );
}

function TemplateCard({
  template, onPreview, onUse, onEdit, onDelete,
}: {
  template: TemplateListItem;
  onPreview: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* Defensive: only own personal templates can be edited/deleted */
  const canManage = !template.is_platform && template.created_by === 'me-attorney';

  const typeLabel = TYPE_LABELS[String(template.template_type)] || String(template.template_type);
  const typeColor = TYPE_COLORS[String(template.template_type)] || 'bg-gray-50 text-gray-700 border-gray-200';

  return (
    <div className="group relative flex h-52 flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      {/* Top row: chips + 3-dot */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {template.visa_type_code && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {template.visa_type_code}
            </span>
          )}
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${typeColor}`}>
            {typeLabel}
          </span>
          {template.is_platform && (
            <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
              ★ Platform
            </span>
          )}
        </div>

        {canManage && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Template actions"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-10 w-32 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onMouseDown={(e) => { e.preventDefault(); setMenuOpen(false); onEdit(); }}
                  className="block w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50"
                >
                  ✏ Edit
                </button>
                <button
                  onMouseDown={(e) => { e.preventDefault(); setMenuOpen(false); onDelete(); }}
                  className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                >
                  🗑 Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Title + description */}
      <div className="mt-2 flex-1 overflow-hidden">
        <h3 className="font-semibold text-gray-900">{template.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-gray-600">{template.description}</p>
      </div>

      {/* Bottom row: meta + buttons */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>📄 {template.page_count || 0} Pgs</span>
          <span>⬇ {(template.use_count || 0).toLocaleString()} Uses</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Preview
          </button>
          <button
            onClick={onUse}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Use
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({
  current, total, onChange,
}: { current: number; total: number; onChange: (p: number) => void }) {
  const pages: (number | string)[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('…');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
    if (current < total - 2) pages.push('…');
    pages.push(total);
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => current > 1 && onChange(current - 1)}
        disabled={current === 1}
        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        typeof p === 'number' ? (
          <button
            key={i}
            onClick={() => onChange(p)}
            className={`min-w-[28px] rounded px-2 py-1 text-xs font-medium ${
              p === current ? 'bg-indigo-600 text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ) : (
          <span key={i} className="px-1 text-xs text-gray-400">{p}</span>
        ),
      )}
      <button
        onClick={() => current < total && onChange(current + 1)}
        disabled={current === total}
        className="rounded border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        ›
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MODAL — Preview
   ════════════════════════════════════════════════════════════════════ */
function PreviewModal({
  templateId, onClose, onUse,
}: { templateId: string; onClose: () => void; onUse: () => void }) {
  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    templatesApi.getTemplate(templateId)
      .then((d) => setDetail(d || mockDetail(templateId)))
      .catch(() => setDetail(mockDetail(templateId)))
      .finally(() => setLoading(false));
  }, [templateId]);

  return (
    <ModalShell onClose={onClose} title="Template Preview" maxWidth="max-w-3xl">
      {loading ? (
        <div className="space-y-2 p-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-3 animate-pulse rounded bg-gray-100" />)}
        </div>
      ) : !detail ? (
        <p className="text-sm text-gray-500">Template not found.</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {detail.visa_type_code && (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                {detail.visa_type_code}
              </span>
            )}
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              TYPE_COLORS[String(detail.template_type)] || 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              {TYPE_LABELS[String(detail.template_type)] || detail.template_type}
            </span>
            <span className="text-[10px] text-gray-500">{detail.page_count || 0} Pgs · {(detail.use_count || 0).toLocaleString()} Uses</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900">{detail.title}</h3>
          {detail.description && <p className="mt-1 text-sm text-gray-600">{detail.description}</p>}

          <div className="mt-4 max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            <pre
              className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{ __html: highlightPlaceholders(detail.body_content || '') }}
            />
          </div>
          <p className="mt-2 text-[10px] text-gray-400">
            <span className="rounded bg-amber-100 px-1 text-amber-700">{'{{placeholder}}'}</span> fields auto-fill with case data when you use this template.
          </p>

          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Close</button>
            <button onClick={onUse} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Use this template</button>
          </div>
        </>
      )}
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MODAL — Use (pick application + custom title)
   ════════════════════════════════════════════════════════════════════ */
function UseModal({
  templateId, onClose, onSuccess, onError,
}: {
  templateId: string;
  onClose: () => void;
  /** Bumps use_count on the parent card after a successful create. */
  onSuccess: (documentId: string, applicationId: string) => void;
  onError: (msg: string) => void;
}) {
  /* No `navigate` needed — the post-create flow stays in this modal
     (InlineEditor replaces the success state). UseTemplate doesn't
     send the user elsewhere anymore. */
  const [appId, setAppId]       = useState('');
  const [title, setTitle]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [inlineErr, setInlineErr] = useState<string | null>(null);
  /** Set after a successful POST — drives the in-modal "next step" screen. */
  const [successDoc, setSuccessDoc] = useState<{
    documentId: string;
    applicationId: string;
    title: string;
  } | null>(null);

  /* Real application options — fetched from GET /lawyer/applications, the same
     HR-assigned worklist Cases List + Intake landing both use. Mock options
     in earlier builds caused the backend to 4xx because their UUIDs weren't
     real applications assigned to this attorney. */
  const [apps, setApps]           = useState<AssignedApplication[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsErr,  setAppsErr]    = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAppsLoading(true);
    intakeApi.listAssignedApplications()
      .then((rows) => {
        if (cancelled) return;
        setApps(rows || []);
        if (!rows || rows.length === 0) {
          setAppsErr('No applications assigned to you yet. Ask HR to assign a case before using a template.');
        }
      })
      .catch((e) => {
        if (cancelled) return;
        const status = (e as { response?: { status?: number } })?.response?.status;
        if (status === 401) setAppsErr('Session expired. Please log in again.');
        else if (status === 403) setAppsErr('You don\'t have permission to list assigned applications.');
        else setAppsErr('Could not load your applications. Try again.');
      })
      .finally(() => { if (!cancelled) setAppsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /** Pretty label for the dropdown — falls back gracefully when fields are null. */
  const appLabel = (a: AssignedApplication): string => {
    const visa = a.visa_type_label || a.visa_type || '—';
    const ref  = `#${(a.application_id || '').slice(0, 8).toUpperCase()}`;
    return `${a.client_name || 'Client'} — ${visa} (${ref})`;
  };

  const submit = async () => {
    if (!appId || submitting) return;
    setSubmitting(true);
    setInlineErr(null);
    try {
      const r = await templatesApi.useTemplate(templateId, {
        application_id: appId,
        custom_title:   title.trim() || undefined,
      });
      /* Notify parent so the template card's use_count bumps. */
      onSuccess(r.document_id, r.application_id);
      /* Show success state INSIDE the modal — no surprise redirects. */
      setSuccessDoc({
        documentId:    r.document_id,
        applicationId: r.application_id,
        title:         r.document_title || title.trim() || 'New document',
      });
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { detail?: string } } };
      const status = ax?.response?.status;
      const detail = ax?.response?.data?.detail || '';

      if (status === 403) {
        /* Extract the EXACT permission name from the backend response so the
           lawyer can pass it on to their firm admin verbatim. */
        const permMatch = detail.match(/Required permission:\s*'([^']+)'/);
        const permName  = permMatch?.[1];
        setInlineErr(
          permName
            ? `Your account lacks the "${permName}" permission. Ask your firm admin to grant it to the Lawyer role — this permission is required to spawn a draft document from a template.`
            : (detail || 'Permission denied. Contact your firm admin.'),
        );
      } else if (status === 404) {
        setInlineErr('Template or application not found. It may have been deleted.');
      } else {
        setInlineErr(detail || 'Could not create document. Please try again.');
      }
      onError('Could not use template — see modal for details.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── SUCCESS state = INLINE EDITOR — replaces form once doc is created.
       Reasoning: the lawyer's only goal here is to fill placeholders and
       download the letter; bouncing to /lawyer/documents/<id>/edit (which
       depends on backend endpoints that may 403) breaks the flow.
       Editor lives right inside this modal — fetch template body, edit,
       download as .txt. Done in <2s, never leaves the page. */
  if (successDoc) {
    return (
      <InlineEditor
        templateId={templateId}
        docTitle={successDoc.title}
        onClose={onClose}
      />
    );
  }

  /* ── FORM state — pick application + title ──────────────────────── */
  return (
    <ModalShell onClose={onClose} title="Use this template" maxWidth="max-w-md">
      <p className="text-xs text-gray-600">
        We&apos;ll create a draft document attached to the selected case. You can
        find it in the Document Queue afterwards to fill in the placeholders.
      </p>

      <label className="mt-4 block text-xs font-semibold text-gray-700">For application *</label>
      <select
        value={appId}
        onChange={(e) => setAppId(e.target.value)}
        disabled={appsLoading || apps.length === 0}
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        <option value="">
          {appsLoading
            ? 'Loading your assigned cases…'
            : apps.length === 0
              ? 'No assigned cases'
              : 'Select an application…'}
        </option>
        {apps.map((a) => (
          <option key={a.application_id} value={a.application_id}>
            {appLabel(a)}
          </option>
        ))}
      </select>
      {appsErr && !appsLoading && (
        <p className="mt-1 text-[11px] text-amber-700">{appsErr}</p>
      )}

      <label className="mt-4 block text-xs font-semibold text-gray-700">Document title (optional)</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="e.g. H-1B Cover Letter — TechCorp"
        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
      />

      {inlineErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">⚠ Cannot create document</p>
          <p className="mt-1">{inlineErr}</p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={submit}
          disabled={!appId || submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create document'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   INLINE EDITOR — replaces the post-create success state in UseModal.
   Fetches the template's body_content and lets the lawyer edit it
   straight here. No navigation to /lawyer/documents. Download as .txt.
   ════════════════════════════════════════════════════════════════════ */
function InlineEditor({
  templateId,
  docTitle,
  onClose,
}: {
  templateId: string;
  docTitle:   string;
  onClose:    () => void;
}) {
  const FALLBACK = `Dear USCIS Officer,

This letter supports the petition for {{beneficiary_name}}.
Position: {{position_title}}.
Petitioner: {{petitioner_name}} ({{entity_type}}, est. {{date_established}}).

Sincerely,
{{attorney_name}}
{{firm_name}}`;

  const [body, setBody]       = useState('');
  const [loading, setLoading] = useState(true);

  /* Fetch the template body once. Fall back to a generic skeleton if the
     fetch fails so the lawyer can still type a letter from scratch. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    templatesApi.getTemplate(templateId)
      .then((t) => {
        if (cancelled) return;
        setBody(((t as { body_content?: string }).body_content) || FALLBACK);
      })
      .catch(() => {
        if (cancelled) return;
        setBody(FALLBACK);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  /* Distinct placeholders still in the body — drives the chip strip and
     the "X to fill" badge. */
  const placeholders = useMemo(() => {
    const m = body.match(/\{\{\s*[\w_]+\s*\}\}/g) || [];
    return Array.from(new Set(m.map((s) => s.replace(/\s+/g, ''))));
  }, [body]);

  /* Live preview — splits body into plain text + highlighted placeholders. */
  const previewParts = useMemo(() => {
    const out: { text: string; ph: boolean }[] = [];
    const regex = /(\{\{\s*[\w_]+\s*\}\})/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(body)) !== null) {
      if (match.index > last) out.push({ text: body.slice(last, match.index), ph: false });
      out.push({ text: match[0], ph: true });
      last = match.index + match[0].length;
    }
    if (last < body.length) out.push({ text: body.slice(last), ph: false });
    return out;
  }, [body]);

  const download = () => {
    const safeName = (docTitle || 'document').replace(/\s+/g, '_').slice(0, 60);
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${safeName}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  };

  return (
    <ModalShell onClose={onClose} title={`Edit & download — ${docTitle}`} maxWidth="max-w-5xl">
      {loading ? (
        <div className="space-y-2">
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-[55vh] animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tip + counters */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-2 text-xs text-indigo-900">
            <span>
              Replace each <code className="rounded bg-amber-100 px-1">{'{{placeholder}}'}</code> with the
              case-specific value, then download.
            </span>
            {placeholders.length > 0 && (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-700">
                {placeholders.length} {placeholders.length === 1 ? 'placeholder' : 'placeholders'} to fill
              </span>
            )}
          </div>

          {/* Editor + Preview side-by-side */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">Editor</h3>
                <span className="text-[10px] text-gray-500">{body.length.toLocaleString()} chars</span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                spellCheck
                className="h-[55vh] w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[13px] leading-relaxed focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-gray-900">Preview</h3>
                <span className="text-[10px] text-gray-500">live · placeholders highlighted</span>
              </div>
              <div className="h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-[13px] leading-relaxed text-slate-800">
                {previewParts.length === 0 ? (
                  <span className="text-slate-400">Preview will appear here as you type.</span>
                ) : (
                  previewParts.map((p, i) =>
                    p.ph
                      ? <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{p.text}</mark>
                      : <span key={i}>{p.text}</span>,
                  )
                )}
              </div>
            </div>
          </div>

          {/* Click-to-copy placeholder chips */}
          {placeholders.length > 0 && (
            <div>
              <p className="text-[11px] text-gray-500">
                Tip: click any chip to copy the placeholder; then paste-replace it in the editor.
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {placeholders.map((p) => (
                  <CopyChip key={p} text={p} />
                ))}
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={download}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              ⬇ Download (.txt)
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* Small click-to-copy chip used by the InlineEditor placeholder strip. */
function CopyChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition ${
        copied
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
      }`}
    >
      {copied ? '✓ Copied' : text}
    </button>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MODAL — Create / Edit (shared form)
   ════════════════════════════════════════════════════════════════════ */
function UpsertModal({
  mode, template, visaTypes, onClose, onSuccess, onError,
}: {
  mode: 'create' | 'edit';
  template?: TemplateListItem;
  /** Live list from GET /visa-types — drives the dropdown options.
   *  Empty array → dropdown falls back to a short hardcoded list. */
  visaTypes: VisaTypeOption[];
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const isEdit = mode === 'edit';

  const [title, setTitle]               = useState(template?.title || '');
  const [description, setDescription]   = useState(template?.description || '');
  const [templateType, setTemplateType] = useState<string>(String(template?.template_type || 'cover_letter'));
  const [visaCode, setVisaCode]         = useState<string>(template?.visa_type_code || '');
  const [bodyContent, setBodyContent]   = useState('');
  const [pageCount, setPageCount]       = useState<number>(template?.page_count || 1);
  const [submitting, setSubmitting]     = useState(false);
  const [inlineErr, setInlineErr]       = useState<string | null>(null);

  /* Fetch full body when editing (list response doesn't include it) */
  useEffect(() => {
    if (isEdit && template?.id) {
      templatesApi.getTemplate(template.id)
        .then((d) => setBodyContent(d.body_content || ''))
        .catch(() => { /* leave blank — lawyer can re-fill */ });
    }
  }, [isEdit, template?.id]);

  const submit = async () => {
    if (!title.trim() || !bodyContent.trim() || submitting) return;
    setSubmitting(true);
    setInlineErr(null);
    const payload: CreateTemplatePayload & UpdateTemplatePayload = {
      title:          title.trim(),
      description:    description.trim() || undefined,
      body_content:   bodyContent,
      template_type:  templateType,
      visa_type_code: visaCode || undefined,
      page_count:     pageCount,
    };
    try {
      if (isEdit && template) await templatesApi.updateTemplate(template.id, payload);
      else                   await templatesApi.createTemplate(payload);
      onSuccess();
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number; data?: { detail?: string } } };
      const status = ax?.response?.status;
      const detail = ax?.response?.data?.detail || '';

      if (status === 403) {
        /* Extract the EXACT permission name from the backend response so the
           lawyer can pass it on to their firm admin verbatim. */
        const permMatch = detail.match(/Required permission:\s*'([^']+)'/);
        const permName  = permMatch?.[1];
        setInlineErr(
          isEdit
            ? (detail.includes('platform')
                ? 'Platform templates cannot be edited. Only the firm admin can modify these.'
                : permName
                    ? `Your account lacks the "${permName}" permission. Ask your firm admin to grant it to the Lawyer role.`
                    : 'You don\'t have permission to edit this template.')
            : permName
              ? `Your account lacks the "${permName}" permission. Ask your firm admin to grant it to the Lawyer role.`
              : 'Your account lacks permission to create templates. Contact your firm admin.',
        );
      } else if (status === 400 || status === 422) {
        setInlineErr(detail || 'Please check the form fields and try again.');
      } else {
        setInlineErr(detail || 'Could not save template. Please try again.');
      }
      onError('See modal for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title={isEdit ? 'Edit template' : 'Create template'} maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Title *">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. H-1B Specialty Occupation Cover Letter"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
        </Field>
        <Field label="Visa type code">
          <select
            value={visaCode}
            onChange={(e) => setVisaCode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          >
            <option value="">— None —</option>
            {/* Live list from GET /visa-types (19 entries — H-1B family,
                student categories, EB-1/2/3, etc.). Fall back to the
                hardcoded short list if the fetch hasn't completed yet. */}
            {visaTypes.length > 0
              ? visaTypes.map((v) => (
                  <option key={v.id || v.code} value={v.code}>
                    {v.short_label ? `${v.short_label} — ${v.name}` : v.name || v.code}
                  </option>
                ))
              : FALLBACK_VISA_CODES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))
            }
          </select>
        </Field>
        <Field label="Template type *">
          <select
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          >
            <option value="cover_letter">Cover Letter</option>
            <option value="support_letter">Support Letter</option>
            <option value="rfe_response">RFE Response</option>
            <option value="petition_statement">Petition Statement</option>
          </select>
        </Field>
        <Field label="Page count">
          <input
            type="number"
            min={1}
            max={50}
            value={pageCount}
            onChange={(e) => setPageCount(Math.max(1, Number(e.target.value) || 1))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
          />
        </Field>
      </div>

      <Field label="Description" className="mt-4">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="Short summary visible on the card."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
        />
      </Field>

      <Field label="Body content *" className="mt-4">
        <textarea
          value={bodyContent}
          onChange={(e) => setBodyContent(e.target.value)}
          rows={10}
          placeholder="Full letter text. Use {{placeholder}} syntax for fields that should be replaced when the template is used."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs leading-relaxed focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-200"
        />
        <p className="mt-1 text-[10px] text-gray-500">
          Tip: use <code className="rounded bg-amber-100 px-1 text-amber-700">{'{{client_name}}'}</code>, <code className="rounded bg-amber-100 px-1 text-amber-700">{'{{visa_type}}'}</code>, etc.
        </p>
      </Field>

      {inlineErr && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">⚠ Cannot save template</p>
          <p className="mt-1">{inlineErr}</p>
        </div>
      )}

      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={submit}
          disabled={!title.trim() || !bodyContent.trim() || submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create template'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MODAL — Delete confirmation
   ════════════════════════════════════════════════════════════════════ */
function DeleteConfirm({
  template, onClose, onSuccess, onError,
}: {
  template: TemplateListItem;
  onClose: () => void;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await templatesApi.deleteTemplate(template.id);
      onSuccess();
    } catch (e: unknown) {
      const ax = e as { response?: { status?: number } };
      if (ax?.response?.status === 403) onError('You don\'t have permission to delete this template.');
      else                              onError('Could not delete template. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Delete template" maxWidth="max-w-md">
      <p className="text-sm text-gray-700">
        Are you sure you want to delete <strong>{template.title}</strong>?
      </p>
      <p className="mt-2 text-xs text-gray-500">
        This template will be hidden from the library. Documents already created from it are unaffected.
        (Data preserved for audit.)
      </p>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </ModalShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   GENERIC MODAL SHELL
   ════════════════════════════════════════════════════════════════════ */
function ModalShell({
  title, onClose, maxWidth = 'max-w-lg', children,
}: { title: string; onClose: () => void; maxWidth?: string; children: React.ReactNode }) {
  /* Lock background scroll while open */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-semibold text-gray-700">{label}</label>
      {children}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════════════════════════════════ */
function filterMock(
  templates: TemplateListItem[],
  { source, typeFilter, visaFilter, search }: { source: TemplateSource; typeFilter: TemplateType | 'all'; visaFilter: string; search: string },
): TemplateListItem[] {
  let result = templates.filter((t) => t.is_active);

  if (source === 'my')       result = result.filter((t) => !t.is_platform);
  if (source === 'platform') result = result.filter((t) => t.is_platform);

  if (typeFilter !== ('all' as TemplateType | 'all')) {
    result = result.filter((t) => t.template_type === typeFilter);
  }
  if (visaFilter) {
    result = result.filter((t) => t.visa_type_code === visaFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    result = result.filter((t) =>
      (t.title       || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q),
    );
  }

  /* Sort: platform first → use_count desc → newest */
  return result.sort((a, b) => {
    if (a.is_platform !== b.is_platform) return a.is_platform ? -1 : 1;
    if ((b.use_count || 0) !== (a.use_count || 0)) return (b.use_count || 0) - (a.use_count || 0);
    return (b.created_at || '').localeCompare(a.created_at || '');
  });
}

function mockDetail(id: string): TemplateDetail {
  const base = MOCK_TEMPLATES.find((t) => t.id === id) || MOCK_TEMPLATES[0];
  return { ...base, body_content: MOCK_BODY(base) };
}

/** Wrap {{placeholder}} occurrences in highlighted spans. */
function highlightPlaceholders(body: string): string {
  /* Escape HTML first to be safe before injecting marker tags */
  const esc = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return esc.replace(
    /\{\{([^}]+)\}\}/g,
    '<span class="rounded bg-amber-100 px-1 text-amber-700 font-semibold">{{$1}}</span>',
  );
}
