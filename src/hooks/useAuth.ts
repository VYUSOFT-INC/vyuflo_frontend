// import { useState, useEffect, useCallback } from 'react';
// import type { AxiosError } from 'axios';
// import type { User } from '../types/auth.types';
// import { getMeApi } from '../api/auth.api';

// function extractMessage(e: unknown): string {
//   const err = e as AxiosError<{ detail: string }>;
//   return (
//     err.response?.data?.detail ??
//     (e instanceof Error ? e.message : 'Something went wrong.')
//   );
// }

// // ── Current logged-in user ────────────────────────────────────────────────────

// export function useCurrentUser() {
//   const [data, setData]         = useState<User | null>(null);
//   const [isLoading, setLoading] = useState(true);
//   const [error, setError]       = useState<string | null>(null);

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const user = await getMeApi(); // User type — no .data needed
//       setData(user);
//     } catch (e) {
//       setError(extractMessage(e));
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => { void load(); }, [load]);

//   return { data, isLoading, error, refetch: load };
// }

// // ── Simple token check ────────────────────────────────────────────────────────

// export function useIsAuthenticated(): boolean {
//   return !!localStorage.getItem('access_token');
// }


import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import type { User } from '../types/auth.types';
import { getMeApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';

function extractMessage(e: unknown): string {
  const err = e as AxiosError<{ detail: string }>;
  return (
    err.response?.data?.detail ??
    (e instanceof Error ? e.message : 'Something went wrong.')
  );
}

// ── Current logged-in user ────────────────────────────────────────────────────
export function useCurrentUser() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated); // ✅ from sessionStorage

  const [data, setData]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(isAuthenticated); // ✅ skip loading if not authed
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) return; // ✅ guard — don't call if not logged in
    setLoading(true);
    setError(null);
    try {
      const user = await getMeApi();
      setData(user);
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => { void load(); }, [load]);

  return { data, isLoading, error, refetch: load };
}

// ── Simple token check ────────────────────────────────────────────────────────
export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated); // ✅ sessionStorage, not localStorage
}

// import { useState, useEffect, useCallback } from 'react';
// import type { AxiosError } from 'axios';
// import type { User } from '../types/auth.types';
// import { getMeApi } from '../api/auth.api';
// import { useAuthStore } from '../store/authStore';

// function extractMessage(e: unknown): string {
//   const err = e as AxiosError<{ detail: string }>;
//   return (
//     err.response?.data?.detail ??
//     (e instanceof Error ? e.message : 'Something went wrong.')
//   );
// }

// // ── Current logged-in user ────────────────────────────────────────────────────
// export function useCurrentUser() {
//   const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
//   const [data, setData]         = useState<User | null>(null);
//   const [isLoading, setLoading] = useState(isAuthenticated);
//   const [error, setError]       = useState<string | null>(null);

//   const load = useCallback(async () => {
//     if (!isAuthenticated) return;
//     setLoading(true);
//     setError(null);
//     try {
//       const user = await getMeApi();
//       setData(user);
//     } catch (e) {
//       setError(extractMessage(e));
//     } finally {
//       setLoading(false);
//     }
//   }, [isAuthenticated]);

//   useEffect(() => { void load(); }, [load]);

//   return { data, isLoading, error, refetch: load };
// }

// // ── Simple token check ────────────────────────────────────────────────────────
// export function useIsAuthenticated(): boolean {
//   return useAuthStore((s) => s.isAuthenticated);
// }