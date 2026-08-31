// src/api/employee/rejectedDocuments.api.ts
//
// "Action Required" feed for the logged-in employee/client.
// Uses the shared axios instance (JWT attached automatically).

import axios from '../axios';
import type {
  MyRejectedDocumentsResponse,
} from '../../types/employee/rejectedDocuments.types';

/* ── List documents the attorney has rejected (client must re-upload) ─
 *
 * DEFENSIVE: never throws. Any backend error (404, 405, 422 route conflict,
 * network hiccup, missing endpoint, malformed response, axios interceptor
 * quirk) is swallowed and returned as an empty list. This keeps the dashboard
 * stable while the backend `/documents/my-rejected` route is still being
 * finalized — the caller can trust that a valid, well-shaped response
 * always comes back.
 * ─────────────────────────────────────────────────────────────────── */
export async function getMyRejected(): Promise<MyRejectedDocumentsResponse> {
  try {
    // Backend mounts `document_extra_router` at `/api/v1/attorney`
    // (main.py:256), so this employee-facing endpoint really lives at
    // `/attorney/documents/my-rejected`. Calling the bare path resolves
    // to `/api/v1/documents/my-rejected` which doesn't exist → we were
    // silently returning [] and the client's Action Items looked empty
    // even after the attorney rejected a document.
    const res = await axios.get<MyRejectedDocumentsResponse>(
      '/attorney/documents/my-rejected',
      // Don't let axios throw for any status — we handle it ourselves below.
      { validateStatus: () => true },
    );

    // Only accept a well-shaped 200 response. Anything else = empty list.
    if (
      res.status === 200 &&
      res.data &&
      typeof res.data === 'object' &&
      Array.isArray((res.data as MyRejectedDocumentsResponse).items)
    ) {
      return res.data;
    }
    return { items: [], total: 0 };
  } catch {
    // Network error, interceptor error, anything — return empty list.
    return { items: [], total: 0 };
  }
}

/* ── Bundled export ────────────────────────────────────────────────── */
export const rejectedDocumentsApi = {
  getMyRejected,
};