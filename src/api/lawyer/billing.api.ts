// src/api/lawyer/billing.api.ts
//
// Billing & Time Tracking endpoints (20 routes total — 16 base + 4 Screen 21 detail).
// All requests use the shared axios instance — JWT attached via interceptor.

import axios from '../axios';
import type {
  AddLineItemPayload,
  BillingClient,
  BillingClientListParams,
  BillingClientListResponse,
  BillingDashboardStats,
  BulkActionPayload,
  BulkActionResponse,
  CreateBillingClientPayload,
  CreateInvoicePayload,
  DraftInvoicePayload,
  EditInvoiceDetailsPayload,
  Invoice,
  InvoiceDetailResponse,
  InvoiceListParams,
  InvoiceListResponse,
  LogTimePayload,
  StatPeriod,
  TimeEntry,
  TimeEntryListParams,
  TimeEntryListResponse,
  TopUnbilledClientsResponse,
  UpdateInvoiceStatusPayload,
  UpdateTimeEntryPayload,
} from '../../types/lawyer/billing.types';

/* ── Dashboard ───────────────────────────────────────────────────── */
export async function getDashboardStats(period: StatPeriod = 'this_month'): Promise<BillingDashboardStats> {
  const res = await axios.get<BillingDashboardStats>('/dashboard/stats', { params: { period } });
  return res.data;
}

export async function getTopUnbilledClients(limit = 10): Promise<TopUnbilledClientsResponse> {
  const res = await axios.get<TopUnbilledClientsResponse>('/clients/top-unbilled', { params: { limit } });
  return res.data;
}

/* ── Billing clients ─────────────────────────────────────────────── */
export async function listBillingClients(params?: BillingClientListParams): Promise<BillingClientListResponse> {
  const res = await axios.get<BillingClientListResponse>('/clients', { params });
  return res.data;
}

export async function createBillingClient(payload: CreateBillingClientPayload): Promise<BillingClient> {
  const res = await axios.post<BillingClient>('/clients', payload);
  return res.data;
}

export async function getBillingClient(clientId: string): Promise<BillingClient> {
  const res = await axios.get<BillingClient>(`/clients/${clientId}`);
  return res.data;
}

/* ── Time entries ────────────────────────────────────────────────── */
export async function listTimeEntries(params?: TimeEntryListParams): Promise<TimeEntryListResponse> {
  const res = await axios.get<TimeEntryListResponse>('/time-entries', { params });
  return res.data;
}

export async function logTime(payload: LogTimePayload): Promise<TimeEntry> {
  const res = await axios.post<TimeEntry>('/time-entries', payload);
  return res.data;
}

export async function getTimeEntry(entryId: string): Promise<TimeEntry> {
  const res = await axios.get<TimeEntry>(`/time-entries/${entryId}`);
  return res.data;
}

/** ⚠ Only entries with status === 'unbilled' can be edited. */
export async function updateTimeEntry(entryId: string, payload: UpdateTimeEntryPayload): Promise<TimeEntry> {
  const res = await axios.patch<TimeEntry>(`/time-entries/${entryId}`, payload);
  return res.data;
}

/** ⚠ Only 'unbilled' entries can be deleted. */
export async function deleteTimeEntry(entryId: string): Promise<void> {
  await axios.delete(`/time-entries/${entryId}`);
}

export async function bulkActionTimeEntries(payload: BulkActionPayload): Promise<BulkActionResponse> {
  const res = await axios.post<BulkActionResponse>('/time-entries/bulk-action', payload);
  return res.data;
}

/* ── Invoices (list + create) ────────────────────────────────────── */
export async function draftInvoice(payload: DraftInvoicePayload): Promise<Invoice> {
  const res = await axios.post<Invoice>('/invoices/draft', payload);
  return res.data;
}

export async function listInvoices(params?: InvoiceListParams): Promise<InvoiceListResponse> {
  const res = await axios.get<InvoiceListResponse>('/invoices', { params });
  return res.data;
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<Invoice> {
  const res = await axios.post<Invoice>('/invoices', payload);
  return res.data;
}

/** Lightweight invoice (used by lists, dropdowns). For Screen 21 use getInvoiceDetail. */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  const res = await axios.get<Invoice>(`/invoices/${invoiceId}`);
  return res.data;
}

/**
 * ⚠ State machine:
 *    draft   → open
 *    open    → sent | void
 *    sent    → paid | void
 *    overdue → paid | void
 *
 * Voiding RELEASES linked time entries back to status='unbilled'.
 * Marking PAID transitions linked entries to status='paid'.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  payload: UpdateInvoiceStatusPayload,
): Promise<Invoice> {
  const res = await axios.patch<Invoice>(`/invoices/${invoiceId}/status`, payload);
  return res.data;
}

/* ════════════════════════════════════════════════════════════════════
   INVOICE DETAIL — Screen 21 endpoints (NEW)
   ════════════════════════════════════════════════════════════════════ */

/**
 * GET /invoices/{id}/detail
 * Returns enriched payload for Screen 21 with line_items, audit_summary,
 * full billing address, payment_terms, notes_to_client.
 */
export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailResponse> {
  const res = await axios.get<InvoiceDetailResponse>(`/invoices/${invoiceId}/detail`);
  return res.data;
}

/**
 * PATCH /invoices/{id}
 * Edit invoice details. Powers four UI elements:
 *  1. Edit Details button → matter, issued_date, due_date
 *  2. Tax % input          → tax_rate_percent  (auto-recalcs tax + total)
 *  3. Discount input       → discount_cents    (auto-recalcs total)
 *  4. Settings panel       → payment_terms, notes_to_client
 *
 * ⚠ Blocked if status is 'paid' or 'void'.
 * Returns the full updated InvoiceDetailResponse.
 */
export async function editInvoiceDetails(
  invoiceId: string,
  payload: EditInvoiceDetailsPayload,
): Promise<InvoiceDetailResponse> {
  const res = await axios.patch<InvoiceDetailResponse>(`/invoices/${invoiceId}`, payload);
  return res.data;
}

/**
 * POST /invoices/{id}/line-items
 * Add a billable row to Screen 21's table. Two modes:
 *   A) Link existing unbilled TimeEntry: pass `time_entry_id`. Rate + duration copied.
 *      TimeEntry → 'invoiced'.
 *   B) Manual flat-fee: pass `time_entry_id: null` + `unit_amount_cents` + `quantity` (usually 1).
 *
 * Auto-recalculates subtotal/tax/total. Blocked if invoice is 'paid' or 'void'.
 * Returns the full updated InvoiceDetailResponse.
 */
export async function addInvoiceLineItem(
  invoiceId: string,
  payload: AddLineItemPayload,
): Promise<InvoiceDetailResponse> {
  const res = await axios.post<InvoiceDetailResponse>(`/invoices/${invoiceId}/line-items`, payload);
  return res.data;
}

/**
 * DELETE /invoices/{id}/line-items/{line_item_id}
 * Remove a billable row. If the row was linked to a TimeEntry, that entry is
 * RELEASED back to 'unbilled' so it can be added to a different invoice.
 *
 * Auto-recalculates subtotal/tax/total. Blocked if invoice is 'paid' or 'void'.
 * Returns the full updated InvoiceDetailResponse.
 */
export async function removeInvoiceLineItem(
  invoiceId: string,
  lineItemId: string,
): Promise<InvoiceDetailResponse> {
  const res = await axios.delete<InvoiceDetailResponse>(`/invoices/${invoiceId}/line-items/${lineItemId}`);
  return res.data;
}

/* ── Bundled export ──────────────────────────────────────────────── */
export const billingApi = {
  // Dashboard
  getDashboardStats,
  getTopUnbilledClients,
  // Clients
  listBillingClients,
  createBillingClient,
  getBillingClient,
  // Time entries
  listTimeEntries,
  logTime,
  getTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  bulkActionTimeEntries,
  // Invoices
  draftInvoice,
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoiceStatus,
  // Invoice Detail (Screen 21)
  getInvoiceDetail,
  editInvoiceDetails,
  addInvoiceLineItem,
  removeInvoiceLineItem,
};