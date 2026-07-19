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

/** PATCH /admin/visa-types/{id} — update an existing visa type.
 *  Same payload shape as create; every field is optional so callers can
 *  send only the fields they're changing. required_documents (when sent)
 *  must be a JSON array STRING to match the CreateVisaTypePayload contract. */
export const updateVisaType = async (
  id: string,
  payload: Partial<CreateVisaTypePayload>
): Promise<VisaTypeItem> => {
  const res = await axios.patch(`/admin/visa-types/${id}`, payload);
  return res.data;
};