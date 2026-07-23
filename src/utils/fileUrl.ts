// src/utils/fileUrl.ts

// Backend always returns a fully-resolved URL (presigned or public) directly.
// No local storage fallback — STORAGE_BACKEND=s3 only.
export const getFileUrl = (path: string | null | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Shouldn't happen anymore — surfaces as a visible bug instead of a silent 404.
  console.warn("getFileUrl received a non-URL path — backend should resolve this:", path);
  return null;
};