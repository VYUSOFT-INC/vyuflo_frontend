// src/pages/lawyer/billing/InvoicesList.tsx
//
// All invoices, searchable + status filter.
// ⚠ Back button always goes to /lawyer/billing (Billing home).
// MOCK fallback used when backend returns empty / fails.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billingApi } from '../../../api/lawyer/billing.api';
import type {
  InvoiceListResponse,
  InvoiceStatus,
} from '../../../types/lawyer/billing.types';

/* ── Mock fallback ─────────────────────────────────────────────────────── */
const MOCK_INVOICES: InvoiceListResponse = {
  items: [
    { id: 'mock-inv-001', invoice_number: 'INV-2026-001', attorney_id: 'attr-1', billing_client_id: 'cli-001', application_id: 'app-001',
      issued_date: '2026-06-21', due_date: '2026-07-21', total_cents: 70000, currency: 'USD',
      status: 'sent', paid_at: null, pdf_url: null, created_at: '2026-06-21T09:00:00Z',
      total_display: '$700.00', client_name: 'TechCorp Solutions', client_type: 'corporate',
      attorney_name: 'Posam Srihari', case_label: 'H1B-2026-0142', is_overdue: false },
    { id: 'mock-inv-002', invoice_number: 'INV-2026-002', attorney_id: 'attr-1', billing_client_id: 'cli-003', application_id: null,
      issued_date: '2026-06-19', due_date: '2026-07-19', total_cents: 26250, currency: 'USD',
      status: 'paid', paid_at: '2026-06-20T15:00:00Z', pdf_url: null, created_at: '2026-06-19T10:00:00Z',
      total_display: '$262.50', client_name: 'James Chen', client_type: 'individual',
      attorney_name: 'Posam Srihari', case_label: 'H1B-2026-0156', is_overdue: false },
    { id: 'mock-inv-003', invoice_number: 'INV-2026-003', attorney_id: 'attr-1', billing_client_id: 'cli-004', application_id: 'app-003',
      issued_date: '2026-05-15', due_date: '2026-06-15', total_cents: 350000, currency: 'USD',
      status: 'overdue', paid_at: null, pdf_url: null, created_at: '2026-05-15T11:00:00Z',
      total_display: '$3,500.00', client_name: 'ABC Manufacturing', client_type: 'corporate',
      attorney_name: 'Posam Srihari', case_label: 'L1-2026-0078', is_overdue: true },
    { id: 'mock-inv-004', invoice_number: 'INV-2026-004', attorney_id: 'attr-1', billing_client_id: 'cli-005', application_id: 'app-004',
      issued_date: '2026-06-22', due_date: '2026-07-22', total_cents: 175000, currency: 'USD',
      status: 'draft', paid_at: null, pdf_url: null, created_at: '2026-06-22T08:00:00Z',
      total_display: '$1,750.00', client_name: 'David Park', client_type: 'individual',
      attorney_name: 'Posam Srihari', case_label: 'O1-2026-0023', is_overdue: false },
    { id: 'mock-inv-005', invoice_number: 'INV-2026-005', attorney_id: 'attr-1', billing_client_id: 'cli-002', application_id: 'app-002',
      issued_date: '2026-06-10', due_date: '2026-07-10', total_cents: 105000, currency: 'USD',
      status: 'open', paid_at: null, pdf_url: null, created_at: '2026-06-10T12:00:00Z',
      total_display: '$1,050.00', client_name: 'Maria Rodriguez', client_type: 'individual',
      attorney_name: 'Posam Srihari', case_label: 'H1B-2026-0089', is_overdue: false },
  ],
  total: 5, page: 1, page_size: 50, total_pages: 1,
};

export default function InvoicesList() {
  const navigate = useNavigate();
  const [data, setData]       = useState<InvoiceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState<InvoiceStatus | ''>('');

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      billingApi
        .listInvoices({
          search:     search || undefined,
          status:     status || undefined,
          sort_by:    'created_at',
          sort_order: 'desc',
          page:       1,
          page_size:  50,
        })
        .then((r) => {
          const items = r.items || [];
          // If user has filters applied → respect empty result.
          // If no filters & backend is empty → use mock.
          if (items.length === 0 && !search && !status) {
            setData(MOCK_INVOICES);
          } else {
            setData(r);
          }
        })
        .catch(() => setData(MOCK_INVOICES))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search, status]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            onClick={() => navigate('/lawyer/billing')}
            className="mb-2 text-xs text-indigo-600 hover:underline"
          >← Back to Billing</button>
          <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
          <p className="text-sm text-gray-500">{data ? `${data.total} total` : ' '}</p>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search invoice #, client, case…"
          className="min-w-[200px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as InvoiceStatus | '')}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="sent">Sent</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="void">Void</option>
        </select>
      </div>

      {loading && (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      )}

      {!loading && data && data.items.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
          <p className="text-3xl">📄</p>
          <p className="mt-2 text-sm font-semibold text-gray-900">No invoices match</p>
          <p className="mt-1 text-xs text-gray-500">Try a different search or status filter.</p>
        </div>
      )}

      {!loading && data && data.items.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Client / Case</th>
                  <th className="px-4 py-3">Issued</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => navigate(`/lawyer/billing/invoices/${inv.id}`)}
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-indigo-600">{inv.invoice_number}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{inv.client_name || '—'}</p>
                      {inv.case_label && <p className="text-[10px] text-gray-500">{inv.case_label}</p>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">{formatDate(inv.issued_date)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDate(inv.due_date)}
                      {inv.is_overdue && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">Overdue</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">{inv.total_display}</td>
                    <td className="px-4 py-3"><InvoiceStatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function InvoiceStatusBadge({ status }: { status: string | null | undefined }) {
  const safe = status || 'draft';
  const map: Record<string, string> = {
    draft:   'bg-gray-100 text-gray-700',
    open:    'bg-blue-100 text-blue-800',
    sent:    'bg-indigo-100 text-indigo-800',
    paid:    'bg-emerald-100 text-emerald-800',
    overdue: 'bg-red-100 text-red-800',
    void:    'bg-gray-200 text-gray-500 line-through',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${map[safe] || 'bg-gray-100 text-gray-700'}`}>
      {safe}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}
