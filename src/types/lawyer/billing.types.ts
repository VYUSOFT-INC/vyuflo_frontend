// src/types/lawyer/billing.types.ts
//
// Billing & Time Tracking — matches backend Swagger schema 1:1.
//
// Money convention: backend ships BOTH `_cents` (number) AND `_display` (formatted string)
// where applicable. ► Use `_display` for UI rendering, `_cents` only for math / requests.

/* ── Enums ────────────────────────────────────────────────────────── */
export type TimeEntryStatus = 'unbilled' | 'invoiced' | 'paid' | 'written_off';
export type InvoiceStatus   = 'draft' | 'open' | 'sent' | 'paid' | 'overdue' | 'void';
export type ClientType      = 'individual' | 'corporate';
export type StatPeriod      = 'this_month' | 'last_month' | 'ytd';
export type BulkAction      = 'add_to_invoice' | 'mark_billed' | 'delete';
export type TrendDirection  = 'up' | 'down' | 'flat';

/* ── KPI stat card shape ─────────────────────────────────────────── */
export interface BillingStat {
  value:           string;
  label:           string;
  sub_label:       string;
  trend_pct:       number;
  trend_direction: TrendDirection | string;
  alert?:          string | null;
}

/* ── Dashboard stats ─────────────────────────────────────────────── */
export interface BillingDashboardStats {
  period:              StatPeriod | string;
  revenue:             BillingStat;
  billable_hours:      BillingStat;
  outstanding:         BillingStat;
  active_clients:      BillingStat;
  revenue_cents:       number;
  billable_minutes:    number;
  outstanding_count:   number;
  overdue_count:       number;
  active_client_count: number;
  new_client_count:    number;
}

/* ── Billing client ──────────────────────────────────────────────── */
export interface BillingClient {
  id:                 string;
  display_name:       string;
  client_type:        ClientType | string;
  billing_email:      string;
  billing_phone:      string;
  custom_rate_cents:  number;
  is_active:          boolean;
  created_at:         string;
  rate_display:       string;
  unbilled_hours:     string;
  unbilled_amount:    string;
  unbilled_minutes:   number;
  unbilled_cents:     number;
}

export interface BillingClientListResponse {
  items:       BillingClient[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

export interface BillingClientListParams {
  search?:      string;
  client_type?: ClientType;
  is_active?:   boolean;
  sort_by?:     'display_name' | 'unbilled_amount' | 'created_at';
  sort_order?:  'asc' | 'desc';
  page?:        number;
  page_size?:   number;
}

export interface CreateBillingClientPayload {
  user_id?:             string;
  employer_profile_id?: string;
  display_name:         string;
  client_type:          ClientType;
  billing_email?:       string;
  billing_phone?:       string;
  custom_rate_cents?:   number;
}

/* ── Top unbilled clients ────────────────────────────────────────── */
export interface TopUnbilledClient {
  billing_client_id: string;
  display_name:      string;
  client_type:       string;
  initials:          string;
  color_class:       string;
  unbilled_hours:    string;
  unbilled_amount:   string;
  unbilled_minutes:  number;
  unbilled_cents:    number;
}

export interface TopUnbilledClientsResponse {
  items:                  TopUnbilledClient[];
  total_unbilled_cents:   number;
  total_unbilled_minutes: number;
  total_unbilled_display: string;
}

/* ── Time entry ──────────────────────────────────────────────────── */
export interface TimeEntry {
  id:                 string;
  attorney_id:        string;
  billing_client_id:  string;
  application_id:     string | null;
  entry_date:         string;
  duration_minutes:   number;
  description:        string;
  is_billable:        boolean;
  hourly_rate_cents:  number;
  amount_cents:       number;
  status:             TimeEntryStatus | string;
  invoice_id:         string | null;
  invoiced_at:        string | null;
  created_at:         string;
  updated_at:         string;
  duration_display:   string;
  amount_display:     string;
  rate_display:       string;
  client_name:        string;
  client_type:        string;
  case_number:        string;
}

export interface TimeEntryListResponse {
  items:       TimeEntry[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

export interface TimeEntryListParams {
  search?:            string;
  status?:            TimeEntryStatus;
  billing_client_id?: string;
  application_id?:    string;
  is_billable?:       boolean;
  date_from?:         string;
  date_to?:           string;
  sort_by?:           'entry_date' | 'amount' | 'duration' | 'client' | 'status' | 'created_at';
  sort_order?:        'asc' | 'desc';
  page?:              number;
  page_size?:         number;
}

export interface LogTimePayload {
  billing_client_id?: string;
  application_id?:    string;
  entry_date:         string;
  duration_minutes:   number;
  description:        string;
  is_billable:        boolean;
}

export type UpdateTimeEntryPayload = Partial<LogTimePayload>;

export interface BulkActionPayload {
  entry_ids:   string[];
  action:      BulkAction;
  invoice_id?: string;
}

export interface BulkActionResponse {
  action:         string;
  affected_count: number;
  skipped_count:  number;
  message:        string;
}

/* ════════════════════════════════════════════════════════════════════
   INVOICE — list shape (lighter, used in InvoicesList page)
   ════════════════════════════════════════════════════════════════════ */
export interface InvoiceListItem {
  id:                string;
  invoice_number:    string;
  attorney_id:       string;
  billing_client_id: string;
  application_id:    string | null;
  issued_date:       string;
  due_date:          string;
  total_cents:       number;
  currency:          string;
  status:            InvoiceStatus | string;
  paid_at:           string | null;
  pdf_url:           string | null;
  created_at:        string;
  total_display:     string;
  client_name:       string;
  client_type:       string;
  attorney_name:     string;
  case_label:        string;
  is_overdue:        boolean;
}

export interface InvoiceListResponse {
  items:       InvoiceListItem[];
  total:       number;
  page:        number;
  page_size:   number;
  total_pages: number;
}

export interface InvoiceListParams {
  search?:            string;
  status?:            InvoiceStatus;
  billing_client_id?: string;
  date_from?:         string;
  date_to?:           string;
  sort_by?:           'created_at' | 'total' | 'due_date' | 'status' | 'client' | 'invoice_number';
  sort_order?:        'asc' | 'desc';
  page?:              number;
  page_size?:         number;
}

/* ════════════════════════════════════════════════════════════════════
   INVOICE DETAIL — rich shape for Screen 21 (GET /invoices/{id}/detail)
   ════════════════════════════════════════════════════════════════════ */

/** Audit Summary box on Screen 21 (right side) */
export interface InvoiceAuditSummary {
  total_hours:    number;        // e.g. 3.5
  blended_rate:   number;        // in cents
  client_balance: number;        // in cents
}

/** Single billable item (line item) on Screen 21 table */
export interface InvoiceLineItem {
  id:                string;
  description:       string;
  quantity:          number;
  unit_amount_cents: number;
  sort_order:        number;
  /** When set → linked to a TimeEntry. When null → manual flat-fee. */
  time_entry_id:     string | null;
  /** Computed by backend */
  amount_cents:      number;
  /* ── Derived fields (only present when linked to a TimeEntry) ── */
  entry_date?:         string;        // YYYY-MM-DD
  hours?:              number;        // e.g. 1.5
  rate_cents?:         number;
  rate_display?:       string;        // "$350/hr"
  amount_display?:     string;        // "$525.00"
  timekeeper_initials?: string;       // "PS"
}

/** Full invoice payload returned by GET /detail, PATCH /, POST /line-items, DELETE /line-items */
export interface InvoiceDetailResponse {
  id:                   string;
  invoice_number:       string;
  status:               InvoiceStatus | string;
  billing_client_id:    string;
  /* Client snapshot (denormalized at invoice creation time) */
  client_display_name:  string;
  client_email:         string;
  client_billing_name:  string;
  client_billing_line1: string;
  client_billing_line2: string;
  client_billing_city:  string;
  client_billing_state: string;
  client_billing_zip:   string;
  /* Dates */
  issued_date:          string;
  due_date:             string;
  /* Editable details */
  matter:               string;
  tax_rate_percent:     number;
  payment_terms:        string;
  notes_to_client:      string;
  /* Totals (cents) */
  subtotal_cents:       number;
  tax_cents:            number;
  discount_cents:       number;
  total_cents:          number;
  currency:             string;
  /* Items */
  line_items:           InvoiceLineItem[];
  /* Audit box */
  audit_summary:        InvoiceAuditSummary;
  /* State timestamps */
  sent_at:              string | null;
  paid_at:              string | null;
  voided_at:            string | null;
  created_at:           string;
  updated_at:           string;
}

/**
 * PATCH /invoices/{id} — partial update.
 * Powers Edit Details button + Tax % input + Discount input + Settings panel.
 * Blocked if status is 'paid' or 'void'.
 */
export interface EditInvoiceDetailsPayload {
  matter?:           string;
  issued_date?:      string;
  due_date?:         string;
  tax_rate_percent?: number;
  discount_cents?:   number;
  payment_terms?:    string;
  notes_to_client?:  string;
}

/**
 * POST /invoices/{id}/line-items — add a billable row.
 *
 * TWO MODES:
 *   1. Link existing TimeEntry → provide `time_entry_id`. Rate + duration copied from it.
 *      TimeEntry status transitions to 'invoiced'.
 *   2. Manual flat-fee → set `time_entry_id` to null (or omit), provide `unit_amount_cents`,
 *      `quantity` typically 1.
 *
 * Auto-recalculates subtotal, tax, total. Blocked if status is 'paid' or 'void'.
 */
export interface AddLineItemPayload {
  description:        string;
  quantity:           number;
  unit_amount_cents:  number;
  sort_order?:        number;
  time_entry_id?:     string | null;
}

/* ── Legacy: kept for backward compatibility with InvoicesList ──── */
export interface Invoice extends InvoiceListItem {
  subtotal_cents:    number;
  tax_cents:         number;
  discount_cents:    number;
  sent_at:           string | null;
  voided_at:         string | null;
  void_reason:       string | null;
  notes:             string | null;
  updated_at:        string;
  subtotal_display:  string;
  line_items:        InvoiceLineItem[];
}

/* ── Other invoice mutations ─────────────────────────────────────── */
export interface DraftInvoicePayload {
  billing_client_id: string;
  entry_ids:         string[];
  application_id?:   string;
  due_date?:         string;
  notes?:            string;
}

export interface CreateInvoicePayload {
  billing_client_id: string;
  application_id?:   string;
  due_date?:         string;
  notes?:            string;
  line_items?:       InvoiceLineItem[];
}

export interface UpdateInvoiceStatusPayload {
  status:       InvoiceStatus;
  void_reason?: string;     // required when transitioning to "void"
  paid_at?:     string;     // optional override when transitioning to "paid"
}