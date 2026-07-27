// src/utils/fileUrl.ts

// Backend returns either a full URL or a relative API path (e.g. "/api/v1/users/me/avatar").
// Both pass straight through — the browser handles them the same way in <img src>.
export const getFileUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;   // relative API paths — e.g. "/api/v1/users/me/avatar"

  // Shouldn't happen — surfaces as a visible bug instead of a silent 404.
  console.warn("getFileUrl received a non-URL path — backend should resolve this:", path);
  return null;
};