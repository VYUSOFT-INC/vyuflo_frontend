// src/api/visa-types.api.ts
// ─────────────────────────────────────────────────────────────
// ADMIN-06  Visa Types Manager
// Base URL : axios baseURL already ends with /api/v1
// Auth     : Authorization: Bearer <token> (added by axios interceptor)
// ─────────────────────────────────────────────────────────────
import axios from "../axios";
import type {
  VisaTypeListResponse,
  VisaTypeListParams,
  VisaTypeItem,
  CreateVisaTypePayload,
  UpdateVisaTypePayload,
} from "../../types/admin/visaTypes.types";

/** GET /admin/visa-types — stats + paginated items in one response.
 *  NOTE: no trailing slash (a slash triggers a 307 that drops the auth header). */
export const fetchVisaTypes = async (
  params?: VisaTypeListParams
): Promise<VisaTypeListResponse> => {
  const res = await axios.get("/admin/visa-types", { params });
  return res.data;
};

/** GET /admin/visa-types/{id} — full detail for the View Details panel
 *  (includes the required_documents list, active cases, processing label, etc.). */
export const fetchVisaTypeDetail = async (
  id: string
): Promise<VisaTypeItem> => {
  const res = await axios.get(`/admin/visa-types/${id}`);
  return res.data;
};

/** POST /admin/visa-types — create a new visa type.
 *  required_documents must be a JSON array STRING, e.g. '["Passport Copy"]'. */
export const createVisaType = async (
  payload: CreateVisaTypePayload
): Promise<VisaTypeItem> => {
  const res = await axios.post("/admin/visa-types", payload);
  return res.data;
};

/** PATCH /admin/visa-types/{id} — edit an existing visa type.
 *  Backend accepts partial payload; only include changed fields.
 *  Once saved, changes flow to: Visa Checklist (client-side), the
 *  lawyer Review checklist, and HR Case Detail required-docs —
 *  every consumer reads from the same /visa-types row. */
export const updateVisaType = async (
  id: string,
  payload: UpdateVisaTypePayload,
): Promise<VisaTypeItem> => {
  const res = await axios.patch(`/admin/visa-types/${id}`, payload);
  return res.data;
};