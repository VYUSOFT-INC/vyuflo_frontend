// src/api/lawyer/documentRequests.api.ts
//
// Attorney → client "please upload this extra document" flow.
//
// Backend contract:
//   POST  /api/v1/documents/requests                    — create
//   GET   /api/v1/applications/{app_id}/document-requests — per-case list
//   PATCH /api/v1/documents/requests/{id}/cancel        — cancel

import axios from '../axios';
import type {
  CreateDocumentRequestPayload,
  CreateDocumentRequestResponse,
  RequestedDocument,
} from '../../types/employee/documentRequests.types';

/* ── POST /documents/requests — attorney creates a request ─────────────
 *
 * Bulletproof: never throws in the axios path. We use validateStatus to
 * accept every HTTP status, then inspect it ourselves. This sidesteps any
 * global axios response interceptor that crashes on error responses (e.g.
 * "Cannot read properties of undefined (reading 'data')" when interceptor
 * tries to touch a null body). Non-2xx statuses are re-thrown as an
 * error object with a synthetic `.response` so the caller's existing
 * catch{} branches (403 / 422 / etc.) keep working unchanged.
 * ─────────────────────────────────────────────────────────────────── */
export async function requestDocument(
  payload: CreateDocumentRequestPayload,
): Promise<CreateDocumentRequestResponse> {
  const res = await axios.post<CreateDocumentRequestResponse>(
    '/documents/requests',
    payload,
    { validateStatus: () => true },
  );
  if (res.status >= 200 && res.status < 300) {
    return res.data;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err: any = new Error(`Request failed with status ${res.status}`);
  err.response = { status: res.status, data: res.data };
  throw err;
}

/* ── GET /applications/{app_id}/document-requests — case-scoped list ─── */
export async function listRequestsForCase(
  applicationId: string,
): Promise<{ items: RequestedDocument[]; total: number }> {
  try {
    const res = await axios.get<{ items: RequestedDocument[]; total: number }>(
      `/applications/${applicationId}/document-requests`,
      { validateStatus: () => true },
    );
    if (
      res.status === 200 &&
      res.data &&
      Array.isArray(res.data.items)
    ) {
      return res.data;
    }
    return { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

/* ── PATCH /documents/requests/{id}/cancel ───────────────────────────── */
export async function cancelDocumentRequest(
  requestId: string,
): Promise<CreateDocumentRequestResponse | null> {
  try {
    const res = await axios.patch<CreateDocumentRequestResponse>(
      `/documents/requests/${requestId}/cancel`,
    );
    return res.data;
  } catch {
    return null;
  }
}

/* ── Bundled export ──────────────────────────────────────────────────── */
export const documentRequestsApi = {
  requestDocument,
  listRequestsForCase,
  cancelDocumentRequest,
};