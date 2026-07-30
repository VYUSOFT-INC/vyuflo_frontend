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
}): OCRField {
  return {
    id:               f.id,
    field_name:       f.field_name,
    extracted_value:  f.extracted_value ?? "",
    confidence_score: f.confidence_score ?? 0,
    needs_review:     f.needs_review,
    is_confirmed:     f.is_confirmed,
    is_editing:       false,
    edit_value:       f.extracted_value ?? "",
  };
}

function calcAvg(fields: OCRField[]): number {
  if (!fields.length) return 0;
  return Math.round(fields.reduce((s, f) => s + f.confidence_score, 0) / fields.length);
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

  // ── Main load function — called once file blob is ready ───────────────────
  // No expected-type param anymore. The backend resolves it server-side from
  // Document.document_type_id -> DocumentType.ocr_slug and returns
  // type_mismatch / expected_type directly — nothing to guess here.
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

      // Goes through the shared authenticated axios instance — NOT raw
      // fetch(). fetch() only sent cookies via credentials:"include", but
      // this backend expects a Bearer token in the Authorization header,
      // which only the axios interceptor attaches. That mismatch was the
      // entire cause of the 401s on this one call while every other
      // ocrApi/documentsApi call succeeded.
      const data = await ocrApi.extract(documentId, blob, safeName);

      setDetectedType(data.document_type);
      setExpectedType(data.expected_type ?? null);
      setTypeMismatch(data.type_mismatch);   // ← comes straight from the backend, no local matching

      const mapped: OCRField[] = data.fields.map((f, i) => ({
        id:               `f-${i}`,   // temp local ID — replaced with real UUID after saveFields()
        field_name:       f.field_name,
        extracted_value:  f.extracted_value,
        confidence_score: f.confidence_score,
        needs_review:     f.needs_review,
        is_confirmed:     false,
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
    expectedType,       // ← exposed for the banner if you want it, doc?.document_type is fine too
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