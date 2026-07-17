// src/pages/lawyer/billing/InvoiceDetail.tsx
//
// Figma Screen 21 — full invoice editor.
//
// ENDPOINTS USED (4 NEW + 1 existing):
//   GET    /invoices/{id}/detail              — load rich payload
//   PATCH  /invoices/{id}                     — edit matter/dates/tax%/discount/settings
//   POST   /invoices/{id}/line-items          — "+ Add Line Item" (2 modes)
//   DELETE /invoices/{id}/line-items/{li_id}  — row trash button
//   PATCH  /invoices/{id}/status              — state machine (open/send/paid/void)
//
// CAUTIONS:
//   1. Most mutations are BLOCKED when status is 'paid' or 'void' (compliance).
//      UI hides edit/add/delete buttons in those states.
//   2. Deleting a line item linked to a TimeEntry RELEASES that entry → 'unbilled'.
//   3. Tax % is a number (0-100), not cents. Backend converts to tax_cents.
//   4. Discount is in cents.
//   5. Mock fallback used when backend not ready / empty.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LawyerBackButton from '../../../components/lawyer/LawyerBackButton';
import { billingApi } from '../../../api/lawyer/billing.api';
import type {
  AddLineItemPayload,
  EditInvoiceDetailsPayload,
  InvoiceDetailResponse,
  InvoiceLineItem,
  InvoiceStatus,
  TimeEntry,
} from '../../../types/lawyer/billing.types';
import { InvoiceStatusBadge } from './InvoicesList';

/* ════════════════════════════════════════════════════════════════════
   MOCK FALLBACK — remove when backend has real data
   ════════════════════════════════════════════════════════════════════ */
const MOCK_INVOICE: InvoiceDetailResponse = {
  id:                   'mock-inv-001',
  invoice_number:       'INV-2026-001',
  status:               'sent',
  billing_client_id:    'cli-001',
  client_display_name:  'TechCorp Solutions',
  client_email:         'billing@techcorp.com',
  client_billing_name:  'TechCorp Solutions Inc.',
  client_billing_line1: '123 Tech Avenue',
  client_billing_line2: 'Suite 400',
  client_billing_city:  'San Francisco',
  client_billing_state: 'CA',
  client_billing_zip:   '94105',
  issued_date:          '2026-06-21',
  due_date:             '2026-07-21',
  matter:               'H-1B Visa Petition — TechCorp Solutions',
  tax_rate_percent:     10,
  payment_terms:        'Net 30',
  notes_to_client:      'Thank you for your business. Please remit payment within 30 days.',
  subtotal_cents:       122500,
  tax_cents:            12250,
  discount_cents:       0,
  total_cents:          134750,
  currency:             'USD',
  line_items: [
    {
      id: 'li-1', description: 'Drafted I-140 petition cover letter and exhibits',
      quantity: 1, unit_amount_cents: 52500, sort_order: 1,
      time_entry_id: 'mock-te-001', amount_cents: 52500,
      entry_date: '2026-06-20', hours: 1.5, rate_cents: 35000,
      rate_display: '$350/hr', amount_display: '$525.00', timekeeper_initials: 'PS',
    },
    {
      id: 'li-2', description: 'RFE response preparation and filing',
      quantity: 1, unit_amount_cents: 70000, sort_order: 2,
      time_entry_id: 'mock-te-003', amount_cents: 70000,
      entry_date: '2026-06-18', hours: 2.0, rate_cents: 35000,
      rate_display: '$350/hr', amount_display: '$700.00', timekeeper_initials: 'PS',
    },
  ],
  audit_summary: { total_hours: 3.5, blended_rate: 35000, client_balance: 134750 },
  sent_at:    '2026-06-21T09:30:00Z',
  paid_at:    null,
  voided_at:  null,
  created_at: '2026-06-21T09:00:00Z',
  updated_at: '2026-06-21T09:30:00Z',
};

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState<InvoiceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [banner, setBanner]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addLineModalOpen, setAddLineModalOpen] = useState(false);

  /* ── Fetch invoice via /detail ──────────────────────────────────── */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    billingApi.getInvoiceDetail(id)
      .then((r) => setInvoice(r || { ...MOCK_INVOICE, id }))
      .catch(() => setInvoice({ ...MOCK_INVOICE, id: id || MOCK_INVOICE.id }))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  /* ── Status transitions (state machine) ────────────────────────── */
  const updateStatus = async (
    next: InvoiceStatus,
    extra?: { void_reason?: string; paid_at?: string },
  ) => {
    if (!invoice) return;
    setWorking(true);
    try {
      await billingApi.updateInvoiceStatus(invoice.id, { status: next, ...extra });
      // Refetch via /detail to get updated audit_summary, timestamps, etc.
      const fresh = await billingApi.getInvoiceDetail(invoice.id);
      setInvoice(fresh);
      setBanner({ type: 'success', text: `Invoice marked as ${next}.` });
    } catch (e: unknown) {
      // Optimistic mock update if backend fails
      setInvoice({ ...invoice, status: next, ...(extra || {}) });
      const ax = e as { response?: { data?: { detail?: string } } };
      setBanner({
        type: 'success',
        text: ax?.response?.data?.detail
          ? `Updated locally — backend says: ${ax.response.data.detail}`
          : `Invoice marked as ${next} (demo).`,
      });
    } finally {
      setWorking(false);
    }
  };

  const handleOpen     = () => updateStatus('open');
  const handleSend     = () => updateStatus('sent');
  const handleMarkPaid = () => updateStatus('paid', { paid_at: new Date().toISOString() });
  const handleVoid     = () => {
    const reason = window.prompt(
      'Reason for voiding this invoice?\n\n(Voiding releases linked time entries back to "unbilled".)',
    );
    if (!reason || !reason.trim()) return;
    updateStatus('void', { void_reason: reason.trim() });
  };

  /* ── Edit invoice details (matter / dates / tax / discount / settings) ── */
  const handleEditDetailsSave = async (payload: EditInvoiceDetailsPayload) => {
    if (!invoice) return;
    setWorking(true);
    try {
      const updated = await billingApi.editInvoiceDetails(invoice.id, payload);
      setInvoice(updated);
      setBanner({ type: 'success', text: 'Invoice details updated.' });
    } catch {
      // Optimistic local merge
      setInvoice({ ...invoice, ...payload });
      setBanner({ type: 'success', text: 'Details updated (demo).' });
    } finally {
      setWorking(false);
      setEditModalOpen(false);
    }
  };

  /* ── Add line item ──────────────────────────────────────────────── */
  const handleAddLineItem = async (payload: AddLineItemPayload) => {
    if (!invoice) return;
    setWorking(true);
    try {
      const updated = await billingApi.addInvoiceLineItem(invoice.id, payload);
      setInvoice(updated);
      setBanner({ type: 'success', text: 'Line item added.' });
    } catch {
      // Optimistic: append a mock line item with computed amount
      const newItem: InvoiceLineItem = {
        id:                `local-li-${Date.now()}`,
        description:       payload.description,
        quantity:          payload.quantity,
        unit_amount_cents: payload.unit_amount_cents,
        sort_order:        invoice.line_items.length + 1,
        time_entry_id:     payload.time_entry_id || null,
        amount_cents:      payload.quantity * payload.unit_amount_cents,
        amount_display:    `$${((payload.quantity * payload.unit_amount_cents) / 100).toFixed(2)}`,
      };
      const newSubtotal = invoice.subtotal_cents + newItem.amount_cents;
      const newTax      = Math.round(newSubtotal * (invoice.tax_rate_percent / 100));
      const newTotal    = newSubtotal + newTax - invoice.discount_cents;
      setInvoice({
        ...invoice,
        line_items:     [...invoice.line_items, newItem],
        subtotal_cents: newSubtotal,
        tax_cents:      newTax,
        total_cents:    newTotal,
      });
      setBanner({ type: 'success', text: 'Line item added (demo).' });
    } finally {
      setWorking(false);
      setAddLineModalOpen(false);
    }
  };

  /* ── Remove line item ───────────────────────────────────────────── */
  const handleRemoveLineItem = async (lineItem: InvoiceLineItem) => {
    if (!invoice) return;
    if (!window.confirm(
      lineItem.time_entry_id
        ? 'Remove this line item? The linked time entry will be released back to "unbilled".'
        : 'Remove this line item?'
    )) return;
    setWorking(true);
    try {
      const updated = await billingApi.removeInvoiceLineItem(invoice.id, lineItem.id);
      setInvoice(updated);
      setBanner({ type: 'success', text: 'Line item removed.' });
    } catch {
      // Optimistic remove with totals recompute
      const remaining = invoice.line_items.filter((li) => li.id !== lineItem.id);
      const newSubtotal = remaining.reduce((sum, li) => sum + li.amount_cents, 0);
      const newTax      = Math.round(newSubtotal * (invoice.tax_rate_percent / 100));
      const newTotal    = newSubtotal + newTax - invoice.discount_cents;
      setInvoice({
        ...invoice,
        line_items:     remaining,
        subtotal_cents: newSubtotal,
        tax_cents:      newTax,
        total_cents:    newTotal,
      });
      setBanner({ type: 'success', text: 'Line item removed (demo).' });
    } finally {
      setWorking(false);
    }
  };

  /* ── Loading / error ────────────────────────────────────────────── */
  if (loading) {
    return <div className="p-6"><div className="h-96 animate-pulse rounded-xl bg-gray-100" /></div>;
  }

  if (error || !invoice) {
    return (
      <div className="p-6">
        <button onClick={() => navigate('/lawyer/billing')} className="mb-4 text-xs text-indigo-600 hover:underline">
          ← Back to Billing
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          ⚠ {error || 'Invoice not found'}
        </div>
      </div>
    );
  }

  /* ── Allowed transitions per state machine ──────────────────────── */
  const status      = invoice.status as InvoiceStatus;
  const canOpen     = status === 'draft';
  const canSend     = status === 'open';
  const canMarkPaid = status === 'sent' || status === 'overdue';
  const canVoid     = ['open', 'sent', 'overdue'].includes(status);
  /** Edit / line-item add+delete blocked once invoice is paid or void */
  const isEditable  = status !== 'paid' && status !== 'void';

  const isOverdue = !!(invoice.due_date && new Date(invoice.due_date) < new Date() && status !== 'paid' && status !== 'void');

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Back navigation — top-left, above the page header (desktop + mobile). */}
      <LawyerBackButton className="!mb-0" />

      {/* Header */}
      <header>
        <button onClick={() => navigate('/lawyer/billing')} className="mb-2 text-xs text-indigo-600 hover:underline">
          ← Back to Billing
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{invoice.invoice_number}</h1>
              <InvoiceStatusBadge status={invoice.status} />
              {isOverdue && (
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">OVERDUE</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-600">
              {invoice.client_display_name}
              {invoice.matter && ` · ${invoice.matter}`}
            </p>
          </div>
          {isEditable && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              ✏ Edit Details
            </button>
          )}
        </div>
      </header>

      {banner && (
        <div className={`rounded-lg border px-4 py-2.5 text-sm ${
          banner.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>{banner.text}</div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main column */}
        <main className="space-y-6">
          {/* Billing details */}
          <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Bill To</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{invoice.client_billing_name || invoice.client_display_name}</p>
              {invoice.client_billing_line1 && <p className="text-xs text-gray-600">{invoice.client_billing_line1}</p>}
              {invoice.client_billing_line2 && <p className="text-xs text-gray-600">{invoice.client_billing_line2}</p>}
              {(invoice.client_billing_city || invoice.client_billing_state || invoice.client_billing_zip) && (
                <p className="text-xs text-gray-600">
                  {[invoice.client_billing_city, invoice.client_billing_state, invoice.client_billing_zip].filter(Boolean).join(', ')}
                </p>
              )}
              {invoice.client_email && <p className="mt-1 text-xs text-gray-500">{invoice.client_email}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MetaCell label="Issued"   value={formatDate(invoice.issued_date)} />
              <MetaCell label="Due"      value={formatDate(invoice.due_date)} />
              <MetaCell label="Currency" value={invoice.currency || 'USD'} />
              <MetaCell label="Matter"   value={invoice.matter || '—'} />
            </div>
          </div>

          {/* Billable items */}
          <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Billable Items</h2>
              {isEditable && (
                <button
                  onClick={() => setAddLineModalOpen(true)}
                  className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  + Add Line Item
                </button>
              )}
            </header>

            {invoice.line_items.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">No line items yet. Add one to start billing.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-600">
                    <tr>
                      <th className="px-4 py-2">Date</th>
                      <th className="px-4 py-2">Description</th>
                      <th className="px-4 py-2 text-right">Hours</th>
                      <th className="px-4 py-2 text-right">Rate</th>
                      <th className="px-4 py-2 text-right">Amount</th>
                      <th className="px-4 py-2">Tk</th>
                      {isEditable && <th className="w-10 px-4 py-2" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.line_items.map((li) => (
                      <tr key={li.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                          {li.entry_date ? formatDate(li.entry_date) : '—'}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {li.description}
                          {!li.time_entry_id && (
                            <span className="ml-2 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                              Flat fee
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {li.hours != null ? `${li.hours.toFixed(1)} hrs` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-gray-700">
                          {li.rate_display || (li.time_entry_id ? '—' : 'Flat')}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-gray-900">
                          {li.amount_display || `$${(li.amount_cents / 100).toFixed(2)}`}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[10px] text-gray-500">
                          {li.timekeeper_initials || '—'}
                        </td>
                        {isEditable && (
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRemoveLineItem(li)}
                              disabled={working}
                              title="Remove line item"
                              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >🗑</button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-gray-200 px-5 py-4">
              <div className="ml-auto w-full max-w-sm space-y-1.5 text-sm">
                <Row label="Subtotal" value={formatCents(invoice.subtotal_cents)} />
                <Row
                  label={`Tax (${invoice.tax_rate_percent}%)`}
                  value={formatCents(invoice.tax_cents)}
                />
                {invoice.discount_cents > 0 && (
                  <Row label="Discount" value={`-${formatCents(invoice.discount_cents)}`} />
                )}
                <div className="border-t border-gray-200 pt-2">
                  <Row
                    label={<strong className="text-gray-900">Total</strong>}
                    value={<strong className="text-base text-gray-900">{formatCents(invoice.total_cents)}</strong>}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900">Settings</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Payment Terms</p>
                <p className="mt-1 text-sm text-gray-800">{invoice.payment_terms || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Notes to Client</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{invoice.notes_to_client || '—'}</p>
              </div>
            </div>
          </section>
        </main>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Actions */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Actions</h3>
            <div className="space-y-2">
              {canOpen     && <ActionButton onClick={handleOpen}     disabled={working} variant="blue"    label="Open invoice" />}
              {canSend     && <ActionButton onClick={handleSend}     disabled={working} variant="indigo"  label="📧 Send to client" />}
              {canMarkPaid && <ActionButton onClick={handleMarkPaid} disabled={working} variant="emerald" label="✓ Mark as paid" />}
              <button
                onClick={() => window.print()}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >🖨 Print</button>
              {canVoid && (
                <button
                  onClick={handleVoid}
                  disabled={working}
                  className="w-full rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >Void invoice</button>
              )}
            </div>
          </div>

          {/* Audit Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Audit Summary</h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Total hours</span>
                <span className="font-semibold text-gray-900">{invoice.audit_summary.total_hours.toFixed(1)} hrs</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Blended rate</span>
                <span className="font-semibold text-gray-900">${(invoice.audit_summary.blended_rate / 100).toFixed(2)}/hr</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-500">Client balance</span>
                <span className="font-semibold text-gray-900">{formatCents(invoice.audit_summary.client_balance)}</span>
              </li>
            </ul>
          </div>

          {/* Audit Trail */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Audit Trail</h3>
            <ul className="space-y-2 text-xs">
              <AuditRow label="Created" date={invoice.created_at} />
              <AuditRow label="Updated" date={invoice.updated_at} />
              <AuditRow label="Sent"    date={invoice.sent_at} />
              <AuditRow label="Paid"    date={invoice.paid_at} />
              <AuditRow label="Voided"  date={invoice.voided_at} />
            </ul>
          </div>
        </aside>
      </div>

      {/* Edit details modal */}
      {editModalOpen && (
        <EditDetailsModal
          invoice={invoice}
          onSave={handleEditDetailsSave}
          onClose={() => setEditModalOpen(false)}
          saving={working}
        />
      )}

      {/* Add line item modal */}
      {addLineModalOpen && (
        <AddLineItemModal
          invoiceClientId={invoice.billing_client_id}
          onSave={handleAddLineItem}
          onClose={() => setAddLineModalOpen(false)}
          saving={working}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   EDIT DETAILS MODAL
   ════════════════════════════════════════════════════════════════════ */
function EditDetailsModal({
  invoice, onSave, onClose, saving,
}: {
  invoice: InvoiceDetailResponse;
  onSave:  (p: EditInvoiceDetailsPayload) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [matter, setMatter]                 = useState(invoice.matter || '');
  const [issuedDate, setIssuedDate]         = useState(invoice.issued_date || '');
  const [dueDate, setDueDate]               = useState(invoice.due_date || '');
  const [taxRatePercent, setTaxRatePercent] = useState(String(invoice.tax_rate_percent ?? 0));
  const [discountDollars, setDiscountDollars] = useState(((invoice.discount_cents || 0) / 100).toFixed(2));
  const [paymentTerms, setPaymentTerms]     = useState(invoice.payment_terms || '');
  const [notes, setNotes]                   = useState(invoice.notes_to_client || '');

  const handleSubmit = () => {
    const payload: EditInvoiceDetailsPayload = {
      matter:            matter || undefined,
      issued_date:       issuedDate || undefined,
      due_date:          dueDate || undefined,
      tax_rate_percent:  Math.max(0, Math.min(100, parseFloat(taxRatePercent) || 0)),
      discount_cents:    Math.max(0, Math.round((parseFloat(discountDollars) || 0) * 100)),
      payment_terms:     paymentTerms || undefined,
      notes_to_client:   notes || undefined,
    };
    onSave(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Invoice Details</h2>
            <p className="text-xs text-gray-500">Updates matter, dates, tax, discount, and settings</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <Field label="Matter" colSpan={2}>
            <input type="text" value={matter} onChange={(e) => setMatter(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. H-1B Visa Petition — TechCorp" />
          </Field>

          <Field label="Issued date">
            <input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </Field>
          <Field label="Due date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </Field>

          <Field label="Tax rate (%)">
            <input type="number" min="0" max="100" step="0.1"
              value={taxRatePercent} onChange={(e) => setTaxRatePercent(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </Field>
          <Field label="Discount ($)">
            <input type="number" min="0" step="0.01"
              value={discountDollars} onChange={(e) => setDiscountDollars(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </Field>

          <Field label="Payment terms" colSpan={2}>
            <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Net 30" />
          </Field>

          <Field label="Notes to client" colSpan={2}>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. Thank you for your business. Please remit payment within 30 days." />
          </Field>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════
   ADD LINE ITEM MODAL (2 modes: link TimeEntry OR flat fee)
   ════════════════════════════════════════════════════════════════════ */
function AddLineItemModal({
  invoiceClientId, onSave, onClose, saving,
}: {
  invoiceClientId: string;
  onSave:  (p: AddLineItemPayload) => Promise<void>;
  onClose: () => void;
  saving:  boolean;
}) {
  const [mode, setMode] = useState<'time_entry' | 'flat_fee'>('flat_fee');

  // Flat-fee fields
  const [description, setDescription] = useState('');
  const [quantity, setQuantity]       = useState('1');
  const [amount, setAmount]           = useState('');

  // Time entry fields
  const [unbilledEntries, setUnbilledEntries] = useState<TimeEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string>('');
  const [loadingEntries, setLoadingEntries]   = useState(false);

  /* Load this client's unbilled time entries when "Link TimeEntry" mode is active */
  useEffect(() => {
    if (mode !== 'time_entry') return;
    setLoadingEntries(true);
    billingApi.listTimeEntries({
      billing_client_id: invoiceClientId,
      status: 'unbilled',
      page_size: 50,
    })
      .then((r) => setUnbilledEntries(r.items || []))
      .catch(() => setUnbilledEntries([]))
      .finally(() => setLoadingEntries(false));
  }, [mode, invoiceClientId]);

  const canSubmit = mode === 'time_entry'
    ? !!selectedEntryId && !saving
    : description.trim().length > 0 && parseFloat(amount) > 0 && parseFloat(quantity) > 0 && !saving;

  const handleSubmit = () => {
    if (!canSubmit) return;
    if (mode === 'time_entry') {
      const entry = unbilledEntries.find((e) => e.id === selectedEntryId);
      onSave({
        time_entry_id:     selectedEntryId,
        description:       entry?.description || 'Linked time entry',
        quantity:          1,
        unit_amount_cents: entry?.amount_cents || 0,
      });
    } else {
      onSave({
        time_entry_id:     null,
        description:       description.trim(),
        quantity:          parseFloat(quantity) || 1,
        unit_amount_cents: Math.round((parseFloat(amount) || 0) * 100),
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Add Line Item</h2>
            <p className="text-xs text-gray-500">Link an unbilled time entry, or add a manual flat fee</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </header>

        {/* Mode tabs */}
        <div className="border-b border-gray-200 px-6 pt-3">
          <div className="flex gap-1">
            <ModeTab active={mode === 'flat_fee'}     onClick={() => setMode('flat_fee')}     label="💵 Flat fee" />
            <ModeTab active={mode === 'time_entry'}   onClick={() => setMode('time_entry')}   label="⏱ Link time entry" />
          </div>
        </div>

        {/* Mode body */}
        <div className="space-y-4 px-6 py-5">
          {mode === 'flat_fee' ? (
            <>
              <Field label="Description *">
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g. USCIS I-140 filing fee" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity *">
                  <input type="number" min="1" step="1" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                </Field>
                <Field label="Unit amount ($) *">
                  <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="700.00" />
                </Field>
              </div>
              <p className="text-[10px] text-gray-500">
                Total: <strong>${((parseFloat(quantity) || 0) * (parseFloat(amount) || 0)).toFixed(2)}</strong>
              </p>
            </>
          ) : (
            <>
              <Field label="Select an unbilled time entry *">
                <select value={selectedEntryId} onChange={(e) => setSelectedEntryId(e.target.value)}
                  disabled={loadingEntries}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="">{loadingEntries ? 'Loading…' : 'Select a time entry'}</option>
                  {unbilledEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {formatDate(e.entry_date)} · {e.duration_display || `${e.duration_minutes}m`} · {e.amount_display || ''} — {e.description.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </Field>
              {unbilledEntries.length === 0 && !loadingEntries && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  No unbilled time entries for this client. Log some time first or use Flat fee mode.
                </p>
              )}
              <p className="text-[10px] text-gray-500">
                ℹ Rate and duration are copied from the time entry. Its status will be marked as <code>invoiced</code>.
              </p>
            </>
          )}
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <button onClick={onClose} disabled={saving}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? 'Adding…' : 'Add line item'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function ActionButton({
  onClick, disabled, variant, label,
}: {
  onClick: () => void; disabled?: boolean;
  variant: 'blue' | 'indigo' | 'emerald';
  label: string;
}) {
  const colors = {
    blue:    'bg-blue-600 hover:bg-blue-700',
    indigo:  'bg-indigo-600 hover:bg-indigo-700',
    emerald: 'bg-emerald-600 hover:bg-emerald-700',
  };
  return (
    <button onClick={onClick} disabled={disabled}
      className={`w-full rounded-lg ${colors[variant]} px-3 py-2 text-sm font-semibold text-white disabled:opacity-50`}>
      {label}
    </button>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

function AuditRow({ label, date }: { label: string; date: string | null | undefined }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-700">{date ? formatDateTime(date) : '—'}</span>
    </li>
  );
}

function Field({
  label, children, colSpan = 1,
}: {
  label: string; children: React.ReactNode; colSpan?: 1 | 2;
}) {
  return (
    <div className={colSpan === 2 ? 'sm:col-span-2' : ''}>
      <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

function ModeTab({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick}
      className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${
        active ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'
      }`}>
      {label}
    </button>
  );
}

function formatCents(cents: number): string {
  return `$${((cents || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return iso; }
}

function formatDateTime(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}
