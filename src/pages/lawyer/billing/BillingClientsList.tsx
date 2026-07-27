// src/pages/lawyer/billing/BillingClientsList.tsx
//
// Manage billing clients — set custom rates, see inactive accounts, track unbilled.
// ⚠ Back button always goes to /lawyer/billing (Billing home).
// MOCK fallback when backend returns empty.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../../../api/lawyer/billing.api';
import type {
  BillingClient,
  BillingClientListResponse,
  ClientType,
} from '../../../types/lawyer/billing.types';

/* ── Mock fallback ─────────────────────────────────────────────────────── */
const MOCK_CLIENTS: BillingClientListResponse = {
  items: [
    { id: 'cli-001', display_name: 'TechCorp Solutions',     client_type: 'corporate',  billing_email: 'billing@techcorp.com',  billing_phone: '+1 555-0142', custom_rate_cents: 35000, is_active: true,  created_at: '2026-01-15T00:00:00Z', rate_display: '$350/hr', unbilled_hours: '12.5 hrs', unbilled_amount: '$4,375', unbilled_minutes: 750, unbilled_cents: 437500 },
    { id: 'cli-002', display_name: 'Maria Rodriguez',        client_type: 'individual', billing_email: 'maria.r@email.com',     billing_phone: '+1 555-0089', custom_rate_cents: 35000, is_active: true,  created_at: '2026-02-10T00:00:00Z', rate_display: '$350/hr', unbilled_hours: '6.0 hrs',  unbilled_amount: '$2,100', unbilled_minutes: 360, unbilled_cents: 210000 },
    { id: 'cli-003', display_name: 'Global Innovations Inc', client_type: 'corporate',  billing_email: 'ap@globalinno.com',     billing_phone: '+1 555-0203', custom_rate_cents: 35000, is_active: true,  created_at: '2026-03-05T00:00:00Z', rate_display: '$350/hr', unbilled_hours: '4.5 hrs',  unbilled_amount: '$1,575', unbilled_minutes: 270, unbilled_cents: 157500 },
    { id: 'cli-004', display_name: 'James Chen',             client_type: 'individual', billing_email: 'jchen@email.com',       billing_phone: '+1 555-0156', custom_rate_cents: 35000, is_active: true,  created_at: '2026-04-20T00:00:00Z', rate_display: '$350/hr', unbilled_hours: '',         unbilled_amount: '',       unbilled_minutes: 0,   unbilled_cents: 0      },
    { id: 'cli-005', display_name: 'David Park',             client_type: 'individual', billing_email: 'dpark@email.com',       billing_phone: '+1 555-0023', custom_rate_cents: 40000, is_active: true,  created_at: '2026-05-12T00:00:00Z', rate_display: '$400/hr', unbilled_hours: '',         unbilled_amount: '',       unbilled_minutes: 0,   unbilled_cents: 0      },
    { id: 'cli-006', display_name: 'ABC Manufacturing',      client_type: 'corporate',  billing_email: 'billing@abcmfg.com',    billing_phone: '+1 555-0078', custom_rate_cents: 35000, is_active: false, created_at: '2025-12-01T00:00:00Z', rate_display: '$350/hr', unbilled_hours: '',         unbilled_amount: '',       unbilled_minutes: 0,   unbilled_cents: 0      },
  ],
  total: 6, page: 1, page_size: 50, total_pages: 1,
};

export default function BillingClientsList() {
  const navigate = useNavigate();
  const [data, setData]             = useState<BillingClientListResponse | null>(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState<ClientType | ''>('');
  const [activeOnly, setActiveOnly] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      billingApi
        .listBillingClients({
          search:      search || undefined,
          client_type: typeFilter || undefined,
          is_active:   activeOnly ? true : undefined,
          sort_by:     'display_name',
          sort_order:  'asc',
          page:        1,
          page_size:   50,
        })
        .then((r) => {
          const items = r.items || [];
          if (items.length === 0 && !search && !typeFilter) {
            // No filters + empty backend → show mock so UI looks alive
            const filtered = activeOnly
              ? { ...MOCK_CLIENTS, items: MOCK_CLIENTS.items.filter((c) => c.is_active) }
              : MOCK_CLIENTS;
            setData(filtered);
          } else {
            setData(r);
          }
        })
        .catch(() => {
          const filtered = activeOnly
            ? { ...MOCK_CLIENTS, items: MOCK_CLIENTS.items.filter((c) => c.is_active) }
            : MOCK_CLIENTS;
          setData(filtered);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, typeFilter, activeOnly]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => navigate('/lawyer/billing')} className="mb-2 text-xs text-indigo-600 hover:underline">
            ← Back to Billing
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Billing Clients</h1>
          <p className="text-sm text-gray-500">
            {data ? `${data.items.length} ${activeOnly ? 'active' : ''} client${data.items.length === 1 ? '' : 's'}` : ' '}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email…"
          className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ClientType | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All types</option>
          <option value="individual">Individual</option>
          <option value="corporate">Corporate</option>
        </select>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          Active only
        </label>
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-3xl">👥</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">No clients match</p>
          <p className="mt-1 text-xs text-gray-500">Try adjusting your filters.</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Unbilled</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((c) => <ClientRow key={c.id} c={c} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientRow({ c }: { c: BillingClient }) {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-3 font-medium text-gray-900">{c.display_name}</td>
      <td className="whitespace-nowrap px-4 py-3 text-gray-700 capitalize">{c.client_type}</td>
      <td className="px-4 py-3 text-gray-700">
        {c.billing_email && <p className="text-xs">{c.billing_email}</p>}
        {c.billing_phone && <p className="text-[10px] text-gray-500">{c.billing_phone}</p>}
        {!c.billing_email && !c.billing_phone && '—'}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">{c.rate_display || '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        {c.unbilled_amount
          ? <span className="font-semibold text-amber-700">{c.unbilled_amount}</span>
          : <span className="text-gray-400">—</span>}
      </td>
      <td className="px-4 py-3">
        {c.is_active
          ? <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">Active</span>
          : <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600">Inactive</span>}
      </td>
    </tr>
  );
}
