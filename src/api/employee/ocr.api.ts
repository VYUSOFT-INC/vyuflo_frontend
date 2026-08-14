// src/api/employee/ocr.api.ts

import axios from "../axios";
import type { SavedOCRField, SaveOCRFieldsPayload, ExpectedFieldsResponse } from "../../types/employee/ocr.types";

const ocrApi = {

  // ── GET /documents/:id/ocr-fields ──────────────────────────────────────
  // Called first when DocumentViewer opens.
  // Returns [] if OCR has not run yet → frontend calls OCR service.
  // Returns fields if already extracted → load instantly, skip OCR service.
  getFields: async (documentId: string): Promise<SavedOCRField[]> => {
    const res = await axios.get(`/documents/${documentId}/ocr-fields`);
    return Array.isArray(res.data) ? res.data : [];
  },

  // ── GET /documents/:id/expected-fields ─────────────────────────────────
  // NEW — fast, OCR-free lookup of the admin-configured field skeleton for
  // this document's type. Called immediately on DocumentViewer open, before
  // the slow extract() call below, so the UI can show locked placeholder
  // fields right away instead of a blank spinner. Returns an empty fields
  // array for fuzzy/VLM types (Offer Letter, etc.) with no fixed config —
  // the frontend should fall back to a plain spinner in that case.
  getExpectedFields: async (documentId: string): Promise<ExpectedFieldsResponse> => {
    const res = await axios.get(`/documents/${documentId}/expected-fields`);
    return res.data;
  },

  // ── POST /documents/:id/ocr-extract ────────────────────────────────────
  // Called when getFields() returns [] — sends the file to the backend,
  // which resolves the expected type from DocumentType.ocr_slug and proxies
  // to the standalone OCR microservice. Goes through this same authenticated
  // axios instance (not raw fetch) so the auth interceptor/cookies that
  // every other call here relies on are actually attached.
  extract: async (
    documentId: string,
    blob:       Blob,
    fileName:   string,
  ): Promise<{
    document_type:  string;
    type_mismatch:  boolean;
    quality_issue?:  string | null;     // ← ADD
    sharpness_score?: number | null;    // ← ADD
    expected_type?: string | null;
    fields: {
      field_name:       string;
      extracted_value:  string;
      confidence_score: number;
      needs_review:     boolean;
      is_mandatory?:    boolean;
    }[];
  }> => {
    const form = new FormData();
    form.append("file", blob, fileName);
    const res = await axios.post(`/documents/${documentId}/ocr-extract`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ── POST /documents/:id/ocr-fields/save ────────────────────────────────
  // Smart upsert — one endpoint for both flows:
  //   No existing DB fields → INSERT all (first open after OCR)
  //   Existing DB fields    → UPDATE by field id (re-open / user edits)
  saveFields: async (
    documentId: string,
    payload:    SaveOCRFieldsPayload,
  ): Promise<SavedOCRField[]> => {
    const res = await axios.post(`/documents/${documentId}/ocr-fields/save`, payload);
    return Array.isArray(res.data) ? res.data : [];
  },

  // ── POST /documents/:id/confirm ────────────────────────────────────────
  // Called AFTER saveFields() succeeds.
  // Sets ocr_status=confirmed, status=pending_review on the document,
  // and marks the linked ApplicationTask as is_completed=True.
  // This is the single source of truth for task completion —
  // upload alone does NOT complete the task.
  confirmDocument: async (documentId: string): Promise<void> => {
    await axios.post(`/documents/${documentId}/confirm`);
  },

};

export default ocrApi;