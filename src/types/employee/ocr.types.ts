
// // src/types/ocr.types.ts

// export interface OCRField {
//   id:               string;       // UUID from DB, or "f-0" local before save
//   field_name:       string;
//   extracted_value:  string;
//   confidence_score: number;       // 0–100
//   needs_review:     boolean;
//   is_confirmed:     boolean;
//   is_editing:       boolean;      // UI only
//   edit_value:       string;       // value in the edit input
// }

// // Shape returned by GET /documents/:id/ocr-fields
// export interface SavedOCRField {
//   id:               string;
//   document_id:      string;
//   field_name:       string;
//   extracted_value:  string | null;
//   confidence_score: number | null;
//   needs_review:     boolean;
//   is_confirmed:     boolean;
//   confirmed_at?:    string | null;
// }

// // Shape for POST /documents/:id/ocr-fields/save
// // id is optional — omitted on first insert, sent on update
// export interface SaveOCRFieldsPayload {
//   fields: {
//     id?:              string;     // ← present on re-open (real UUID), absent on first save
//     field_name:       string;
//     extracted_value:  string;
//     confidence_score: number;
//     needs_review:     boolean;
//   }[];
// }


// src/types/ocr.types.ts

export interface OCRField {
  id:               string;       // UUID from DB, or "f-0" local before save
  field_name:       string;
  extracted_value:  string;
  confidence_score: number;       // 0–100
  needs_review:     boolean;
  is_confirmed:     boolean;
  is_mandatory:     boolean;      // ← ADDED — driven by admin's DocumentFieldConfiguration
  is_editing:       boolean;      // UI only
  edit_value:       string;       // value in the edit input
}

// Shape returned by GET /documents/:id/ocr-fields
export interface SavedOCRField {
  id:               string;
  document_id:      string;
  field_name:       string;
  extracted_value:  string | null;
  confidence_score: number | null;
  needs_review:     boolean;
  is_confirmed:     boolean;
  is_mandatory:     boolean;      // ← ADDED — matches OCRFieldResponse.is_mandatory from the backend
  confirmed_at?:    string | null;
}

// Shape for POST /documents/:id/ocr-fields/save
// id is optional — omitted on first insert, sent on update
export interface SaveOCRFieldsPayload {
  fields: {
    id?:              string;     // ← present on re-open (real UUID), absent on first save
    field_name:       string;
    extracted_value:  string;
    confidence_score: number;
    needs_review:     boolean;
  }[];
}