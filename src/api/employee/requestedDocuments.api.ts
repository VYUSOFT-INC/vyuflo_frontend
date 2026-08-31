// src/api/employee/requestedDocuments.api.ts
//
// Client-side "documents my attorney has asked for" feed.
//
// Backend endpoint: GET /api/v1/documents/requests/my-pending
//   → { items: RequestedDocument[], total }

import axios from '../axios';
import type {
  MyRequestedDocumentsResponse,
} from '../../types/employee/documentRequests.types';

/* ── GET /documents/requests/my-pending ─────────────────────────────
 *
 * DEFENSIVE: never throws. Any backend error (404, 405, 422, network hiccup,
 * missing endpoint, malformed response) is swallowed and returned as an empty
 * list — same pattern as rejectedDocuments.api.ts so an unshipped backend
 * endpoint never blocks the client dashboard.
 * ─────────────────────────────────────────────────────────────────── */
export async function getMyRequested(): Promise<MyRequestedDocumentsResponse> {
  try {
    const res = await axios.get<MyRequestedDocumentsResponse>(
      '/documents/requests/my-pending',
      { validateStatus: () => true },
    );
    if (
      res.status === 200 &&
      res.data &&
      typeof res.data === 'object' &&
      Array.isArray((res.data as MyRequestedDocumentsResponse).items)
    ) {
      return res.data;
    }
    return { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export const requestedDocumentsApi = {
  getMyRequested,
};