// // src/hooks/useOCR.ts

// import { useState, useCallback } from "react";
// import ocrApi from "../../api/employee/ocr.api";
// import type { OCRField } from "../../types/employee/ocr.types";

// // ── Map DB field → local OCRField (adds UI-only fields) ──────────────────────
// function mapSavedField(f: {
//   id: string;
//   field_name: string;
//   extracted_value: string | null;
//   confidence_score: number | null;
//   needs_review: boolean;
//   is_confirmed: boolean;
//   is_mandatory?: boolean;
// }): OCRField {
//   return {
//     id:               f.id,
//     field_name:       f.field_name,
//     extracted_value:  f.extracted_value ?? "",
//     confidence_score: f.confidence_score ?? 0,
//     needs_review:     f.needs_review,
//     is_confirmed:     f.is_confirmed,
//     is_mandatory:     f.is_mandatory ?? false,
//     is_locked:        false,   // ← DB-sourced fields are never locked — data's already there
//     is_editing:       false,
//     edit_value:       f.extracted_value ?? "",
//   };
// }

// function calcAvg(fields: OCRField[]): number {
//   if (!fields.length) return 0;
//   return Math.round(fields.reduce((s, f) => s + f.confidence_score, 0) / fields.length);
// }

// // Fields marked mandatory (by admin config) that are still empty —
// // checks edit_value first since that's what the user is actively typing.
// // Locked (skeleton) fields are never counted as "missing" — they simply
// // don't have real data yet, which is a different state from the user
// // having left something blank.
// function getMissingMandatory(fields: OCRField[]): string[] {
//   return fields
//     .filter(f => f.is_mandatory && !f.is_locked && !(f.edit_value || f.extracted_value || "").trim())
//     .map(f => f.field_name);
// }

// // ─────────────────────────────────────────────────────────────────────────────
// export function useOCR(documentId: string | undefined) {
//   const [fields,        setFields]       = useState<OCRField[]>([]);
//   const [avgConfidence, setAvgConf]      = useState(0);
//   const [isLoading,     setIsLoading]    = useState(false);
//   const [error,         setError]        = useState<string | null>(null);
//   const [source,        setSource]       = useState<"db" | "ocr" | null>(null);
//   const [detectedType,  setDetectedType] = useState<string | null>(null);
//   const [typeMismatch,  setTypeMismatch] = useState(false);
//   const [expectedType,  setExpectedType] = useState<string | null>(null);

//   const missingMandatoryFields = getMissingMandatory(fields);

//   // ── Main load function — called once file blob is ready ───────────────────
//   const loadFields = useCallback(async (blob: Blob, fileName: string) => {
//     if (!documentId) return;
//     setIsLoading(true);
//     setError(null);
//     setTypeMismatch(false);

//     try {
//       // ── Step 1: Check DB first ────────────────────────────────────────────
//       const saved = await ocrApi.getFields(documentId);

//       if (saved.length > 0) {
//         const mapped = saved.map(mapSavedField);
//         setFields(mapped);
//         setAvgConf(calcAvg(mapped));
//         setSource("db");
//         setIsLoading(false);
//         return;
//       }

//       // ── Step 2: Fetch the config skeleton FAST — show locked placeholder
//       // fields immediately, before waiting on slow OCR. Fuzzy types (no
//       // config) return an empty list here, which is fine — we just skip
//       // straight to Step 3 with no skeleton shown, same as before.
//       try {
//         const expected = await ocrApi.getExpectedFields(documentId);
//         if (expected.fields.length > 0) {
//           const skeleton: OCRField[] = expected.fields.map((f, i) => ({
//             id:               `f-${i}`,
//             field_name:       f.field_name,
//             extracted_value:  "",
//             confidence_score: 0,
//             needs_review:     true,
//             is_confirmed:     false,
//             is_mandatory:     f.is_mandatory,
//             is_locked:        true,   // ← locked until real OCR finishes
//             is_editing:       false,
//             edit_value:       "",
//           }));
//           setFields(skeleton);
//           setAvgConf(0);
//         }
//       } catch (e) {
//         // Non-fatal — if this fast lookup fails for any reason, just skip
//         // the skeleton and go straight to real extraction below.
//         console.warn("[useOCR] getExpectedFields failed, skipping skeleton:", e);
//       }

//       // ── Step 3: Run the REAL (slow) OCR extraction ───────────────────────
//       const safeName = fileName && /\.(jpg|jpeg|png|pdf)$/i.test(fileName)
//         ? fileName
//         : `document_${Date.now()}.jpg`;

//       const data = await ocrApi.extract(documentId, blob, safeName);

//       setDetectedType(data.document_type);
//       setExpectedType(data.expected_type ?? null);
//       setTypeMismatch(data.type_mismatch);

//       const mapped: OCRField[] = data.fields.map((f, i) => ({
//         id:               `f-${i}`,
//         field_name:       f.field_name,
//         extracted_value:  f.extracted_value,
//         confidence_score: f.confidence_score,
//         needs_review:     f.needs_review,
//         is_confirmed:     false,
//         is_mandatory:     f.is_mandatory ?? false,
//         is_locked:        false,   // ← real data is in — unlock
//         is_editing:       false,
//         edit_value:       f.extracted_value,
//       }));

//       setFields(mapped);
//       setAvgConf(calcAvg(mapped));
//       setSource("ocr");

//     } catch (e) {
//       setError(e instanceof Error ? e.message : "OCR extraction failed.");
//       // On failure, unlock whatever skeleton was showing so the user isn't
//       // stuck staring at permanently-locked empty fields.
//       setFields(prev => prev.map(f => ({ ...f, is_locked: false })));
//     } finally {
//       setIsLoading(false);
//     }
//   }, [documentId]);

//   // ── Submit / Update ───────────────────────────────────────────────────────
//   const submitFields = useCallback(async () => {
//     if (!documentId || !fields.length) return;

//     // Block submission client-side if any mandatory field is still empty,
//     // OR if extraction is still in progress (fields still locked).
//     const missing = getMissingMandatory(fields);
//     if (missing.length > 0) {
//       setError(`Please fill in required field(s): ${missing.join(", ")}`);
//       return;
//     }
//     if (fields.some(f => f.is_locked)) {
//       setError("Please wait for extraction to finish before submitting.");
//       return;
//     }

//     const snapshot = fields;

//     setFields(prev => prev.map(f => ({
//       ...f, is_confirmed: true, needs_review: false, is_editing: false,
//     })));

//     try {
//       const saved = await ocrApi.saveFields(documentId, {
//         fields: snapshot.map(f => ({
//           id:               f.id.startsWith("f-") ? undefined : f.id,
//           field_name:       f.field_name,
//           extracted_value:  f.edit_value || f.extracted_value,
//           confidence_score: f.confidence_score,
//           needs_review:     false,
//         })),
//       });

//       if (saved.length === snapshot.length) {
//         setFields(saved.map(mapSavedField).map(f => ({
//           ...f, is_confirmed: true, needs_review: false,
//         })));
//         setAvgConf(calcAvg(saved.map(mapSavedField)));
//       }

//       try {
//         await ocrApi.confirmDocument(documentId);
//       } catch (e) {
//         console.warn("[useOCR] confirmDocument failed:", e);
//       }
//     } catch (e) {
//       // Surface backend validation errors (e.g. "Cannot save — missing
//       // required field(s): ...") instead of only logging them.
//       const message = e instanceof Error ? e.message : "Failed to save fields.";
//       setError(message);
//       console.warn("[useOCR] submitFields failed:", e);
//     }
//   }, [documentId, fields]);

//   const confirmField = useCallback((id: string) => {
//     setFields(prev => prev.map(f =>
//       f.id === id ? { ...f, is_confirmed: true, needs_review: false, is_editing: false } : f
//     ));
//   }, []);

//   const saveEdit = useCallback((id: string) => {
//     setFields(prev => prev.map(f =>
//       f.id === id
//         ? { ...f, is_editing: false, extracted_value: f.edit_value, needs_review: false }
//         : f
//     ));
//   }, []);

//   const startEdit = useCallback((id: string) => {
//     setFields(prev => prev.map(f =>
//       f.id === id ? { ...f, is_editing: true, edit_value: f.extracted_value } : f
//     ));
//   }, []);

//   const cancelEdit = useCallback((id: string) => {
//     setFields(prev => prev.map(f =>
//       f.id === id ? { ...f, is_editing: false } : f
//     ));
//   }, []);

//   const updateEditValue = useCallback((id: string, value: string) => {
//     setFields(prev => prev.map(f =>
//       f.id === id ? { ...f, edit_value: value } : f
//     ));
//   }, []);

//   return {
//     fields,
//     avgConfidence,
//     isLoading,
//     error,
//     source,
//     detectedType,
//     typeMismatch,
//     expectedType,
//     missingMandatoryFields,
//     loadFields,
//     submitFields,
//     confirmField,
//     saveEdit,
//     startEdit,
//     cancelEdit,
//     updateEditValue,
//     setError,
//     dismissMismatch: () => setTypeMismatch(false),
//   };
// }


// src/hooks/useOCR.ts

import { useState, useCallback } from "react";
import ocrApi from "../../api/employee/ocr.api";
import type { OCRField } from "../../types/employee/ocr.types";

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
    is_locked:        false,
    is_editing:       false,
    edit_value:       f.extracted_value ?? "",
  };
}

function calcAvg(fields: OCRField[]): number {
  if (!fields.length) return 0;
  return Math.round(fields.reduce((s, f) => s + f.confidence_score, 0) / fields.length);
}

function getMissingMandatory(fields: OCRField[]): string[] {
  return fields
    .filter(f => f.is_mandatory && !f.is_locked && !(f.edit_value || f.extracted_value || "").trim())
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
  const [qualityIssue,  setQualityIssue] = useState<string | null>(null);

  const missingMandatoryFields = getMissingMandatory(fields);

  const loadFields = useCallback(async (blob: Blob, fileName: string) => {
    if (!documentId) return;
    setIsLoading(true);
    setError(null);
    setTypeMismatch(false);
    setQualityIssue(null);

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

      // ── Step 2: Fetch the config skeleton FAST — locked placeholders ─────
      try {
        const expected = await ocrApi.getExpectedFields(documentId);
        if (expected.fields.length > 0) {
          const skeleton: OCRField[] = expected.fields.map((f, i) => ({
            id:               `f-${i}`,
            field_name:       f.field_name,
            extracted_value:  "",
            confidence_score: 0,
            needs_review:     true,
            is_confirmed:     false,
            is_mandatory:     f.is_mandatory,
            is_locked:        true,
            is_editing:       false,
            edit_value:       "",
          }));
          setFields(skeleton);
          setAvgConf(0);
        }
      } catch (e) {
        console.warn("[useOCR] getExpectedFields failed, skipping skeleton:", e);
      }

      // ── Step 3: Run the REAL (slow) OCR extraction ───────────────────────
      const safeName = fileName && /\.(jpg|jpeg|png|pdf)$/i.test(fileName)
        ? fileName
        : `document_${Date.now()}.jpg`;

      const data = await ocrApi.extract(documentId, blob, safeName);

      setDetectedType(data.document_type);
      setExpectedType(data.expected_type ?? null);
      setTypeMismatch(data.type_mismatch);
      setQualityIssue(data.quality_issue ?? null);

      if (data.quality_issue === "blurry") {
        setFields([]);
        setAvgConf(0);
        setSource("ocr");
        return;
      }

      const mapped: OCRField[] = data.fields.map((f, i) => ({
        id:               `f-${i}`,
        field_name:       f.field_name,
        extracted_value:  f.extracted_value,
        confidence_score: f.confidence_score,
        needs_review:     f.needs_review,
        is_confirmed:     false,
        is_mandatory:     f.is_mandatory ?? false,
        is_locked:        false,
        is_editing:       false,
        edit_value:       f.extracted_value,
      }));

      setFields(mapped);
      setAvgConf(calcAvg(mapped));
      setSource("ocr");

    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR extraction failed.");
      setFields(prev => prev.map(f => ({ ...f, is_locked: false })));
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  const submitFields = useCallback(async () => {
    if (!documentId || !fields.length) return;

    const missing = getMissingMandatory(fields);
    if (missing.length > 0) {
      setError(`Please fill in required field(s): ${missing.join(", ")}`);
      return;
    }
    if (fields.some(f => f.is_locked)) {
      setError("Please wait for extraction to finish before submitting.");
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
    qualityIssue,
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