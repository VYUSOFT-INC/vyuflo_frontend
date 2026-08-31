// src/components/AuthBootstrap.tsx
//
// There is no persisted access token by design (see authStore.ts) — it
// lives in memory only and resets to null on every full page load, while
// the ui_session cookie and the httpOnly refresh_token cookie survive.
// Previously nothing rehydrated accessToken on mount: the axios request
// interceptor would send the first request with no Authorization header,
// get a 401, and only THEN try a silent refresh reactively. If that
// reactive refresh failed for any reason, clearAuth() + a hard redirect
// to /login fired immediately — wiping any in-flight page (e.g.
// /accept-invite?token=...) with no way back.
//
// This component runs once, before the rest of the app renders routes,
// and proactively refreshes the access token whenever a ui_session
// cookie says "this browser should be logged in" but memory doesn't back
// that up yet. This closes the gap the reactive-only refresh left open.

import { useEffect, useState, type ReactNode } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { getUiSession } from '../utils/uiSession';

function BootScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f9fafb]">
      <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  );
}

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const accessToken = useAuthStore.getState().accessToken;
      const session = getUiSession();

      // Already have a token in memory (e.g. we just navigated here in-app
      // right after login/signup) — nothing to do.
      if (accessToken) {
        if (!cancelled) setReady(true);
        return;
      }

      // No cookie either — genuinely logged out. Let the route guards
      // handle sending the person to /login as usual.
      if (!session) {
        if (!cancelled) setReady(true);
        return;
      }

      // Cookie says "logged in", memory disagrees (fresh page load).
      // Try one refresh before rendering anything that might make an
      // authenticated call.
      try {
        const res = await axios.post(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true },
        );
        const { access_token } = res.data;
        useAuthStore.getState().setTokens({ access_token });
      } catch {
        // Refresh genuinely failed (expired/revoked session) — clear the
        // stale cookie-backed state so route guards correctly treat this
        // as logged out instead of half-authenticated.
        useAuthStore.getState().clearAuth();
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void boot();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <BootScreen />;
  return <>{children}</>;
}