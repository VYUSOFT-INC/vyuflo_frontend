// src/hooks/useOCR.ts

import { useState, useCallback } from "react";
import ocrApi from "../../api/employee/ocr.api";
import type { OCRField } from "../../types/employee/ocr.types";

// ── Map DB field → local OCRField (adds UI-only fields) ──────────────────────
function mapSavedField(f: {
  id: string;
  field_name: string;
  extracted_value: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  is_confirmed: boolean;
  is_mandatory?: boolean;
}): OCRField {
  return {
    id:               f.id,
    field_name:       f.field_name,
    extracted_value:  f.extracted_value ?? "",
    confidence_score: f.confidence_score ?? 0,
    needs_review:     f.needs_review,
    is_confirmed:     f.is_confirmed,
    is_mandatory:     f.is_mandatory ?? false,
    is_editing:       false,
    edit_value:       f.extracted_value ?? "",
  };
}

function calcAvg(fields: OCRField[]): number {
  if (!fields.length) return 0;
  return Math.round(fields.reduce((s, f) => s + f.confidence_score, 0) / fields.length);
}

// Fields marked mandatory (by admin config) that are still empty —
// checks edit_value first since that's what the user is actively typing.
function getMissingMandatory(fields: OCRField[]): string[] {
  return fields
    .filter(f => f.is_mandatory && !(f.edit_value || f.extracted_value || "").trim())
    .map(f => f.field_name);
}

// ─────────────────────────────────────────────────────────────────────────────
export function useOCR(documentId: string | undefined) {
  const [fields,        setFields]       = useState<OCRField[]>([]);
  const [avgConfidence, setAvgConf]      = useState(0);
  const [isLoading,     setIsLoading]    = useState(false);
  const [error,         setError]        = useState<string | null>(null);
  const [source,        setSource]       = useState<"db" | "ocr" | null>(null);
  const [detectedType,  setDetectedType] = useState<string | null>(null);
  const [typeMismatch,  setTypeMismatch] = useState(false);
  const [expectedType,  setExpectedType] = useState<string | null>(null);

  const missingMandatoryFields = getMissingMandatory(fields);

  // ── Main load function — called once file blob is ready ───────────────────
  // NOTE: known gap — the fresh OCR-extract path (Step 2 below) hits
  // /documents/:id/ocr-extract, which runs run_extraction() directly and
  // never learned about DocumentFieldConfiguration. is_mandatory will be
  // false for everything on a document's very first view. It becomes
  // accurate once fields reload from the DB (the "db" branch below), which
  // does go through the updated get_ocr_fields().
  const loadFields = useCallback(async (blob: Blob, fileName: string) => {
    if (!documentId) return;
    setIsLoading(true);
    setError(null);
    setTypeMismatch(false);

    try {
      // ── Step 1: Check DB first ────────────────────────────────────────────
      const saved = await ocrApi.getFields(documentId);

      if (saved.length > 0) {
        const mapped = saved.map(mapSavedField);
        setFields(mapped);
        setAvgConf(calcAvg(mapped));
        setSource("db");
        setIsLoading(false);
        return;
      }

      // ── Step 2: No DB fields — call the backend OCR-extract endpoint ─────
      const safeName = fileName && /\.(jpg|jpeg|png|pdf)$/i.test(fileName)
        ? fileName
        : `document_${Date.now()}.jpg`;

      const data = await ocrApi.extract(documentId, blob, safeName);

      setDetectedType(data.document_type);
      setExpectedType(data.expected_type ?? null);
      setTypeMismatch(data.type_mismatch);

      const mapped: OCRField[] = data.fields.map((f, i) => ({
        id:               `f-${i}`,
        field_name:       f.field_name,
        extracted_value:  f.extracted_value,
        confidence_score: f.confidence_score,
        needs_review:     f.needs_review,
        is_confirmed:     false,
        is_mandatory:     f.is_mandatory ?? false,
        is_editing:       false,
        edit_value:       f.extracted_value,
      }));

      setFields(mapped);
      setAvgConf(calcAvg(mapped));
      setSource("ocr");

    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR extraction failed.");
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  // ── Submit / Update ───────────────────────────────────────────────────────
  const submitFields = useCallback(async () => {
    if (!documentId || !fields.length) return;

    // Block submission client-side if any mandatory field is still empty.
    // This is the primary UX guard; the backend (save_or_update_ocr_fields)
    // enforces the same rule server-side as the real, unbypassable check.
    const missing = getMissingMandatory(fields);
    if (missing.length > 0) {
      setError(`Please fill in required field(s): ${missing.join(", ")}`);
      return;
    }

    const snapshot = fields;

    setFields(prev => prev.map(f => ({
      ...f, is_confirmed: true, needs_review: false, is_editing: false,
    })));

    try {
      const saved = await ocrApi.saveFields(documentId, {
        fields: snapshot.map(f => ({
          id:               f.id.startsWith("f-") ? undefined : f.id,
          field_name:       f.field_name,
          extracted_value:  f.edit_value || f.extracted_value,
          confidence_score: f.confidence_score,
          needs_review:     false,
        })),
      });

      if (saved.length === snapshot.length) {
        setFields(saved.map(mapSavedField).map(f => ({
          ...f, is_confirmed: true, needs_review: false,
        })));
        setAvgConf(calcAvg(saved.map(mapSavedField)));
      }

      try {
        await ocrApi.confirmDocument(documentId);
      } catch (e) {
        console.warn("[useOCR] confirmDocument failed:", e);
      }
    } catch (e) {
      // Surface backend validation errors (e.g. "Cannot save — missing
      // required field(s): ...") instead of only logging them.
      const message = e instanceof Error ? e.message : "Failed to save fields.";
      setError(message);
      console.warn("[useOCR] submitFields failed:", e);
    }
  }, [documentId, fields]);

  const confirmField = useCallback((id: string) => {
    setFields(prev => prev.map(f =>
      f.id === id ? { ...f, is_confirmed: true, needs_review: false, is_editing: false } : f
    ));
  }, []);

  const saveEdit = useCallback((id: string) => {
    setFields(prev => prev.map(f =>
      f.id === id
        ? { ...f, is_editing: false, extracted_value: f.edit_value, needs_review: false }
        : f
    ));
  }, []);

  const startEdit = useCallback((id: string) => {
    setFields(prev => prev.map(f =>
      f.id === id ? { ...f, is_editing: true, edit_value: f.extracted_value } : f
    ));
  }, []);

  const cancelEdit = useCallback((id: string) => {
    setFields(prev => prev.map(f =>
      f.id === id ? { ...f, is_editing: false } : f
    ));
  }, []);

  const updateEditValue = useCallback((id: string, value: string) => {
    setFields(prev => prev.map(f =>
      f.id === id ? { ...f, edit_value: value } : f
    ));
  }, []);

  return {
    fields,
    avgConfidence,
    isLoading,
    error,
    source,
    detectedType,
    typeMismatch,
    expectedType,
    missingMandatoryFields,
    loadFields,
    submitFields,
    confirmField,
    saveEdit,
    startEdit,
    cancelEdit,
    updateEditValue,
    setError,
    dismissMismatch: () => setTypeMismatch(false),
  };
}