// src/store/authStore.ts
// PRODUCTION VERSION
// - access_token lives in JS memory only (never localStorage/sessionStorage)
// - refresh_token lives in httpOnly cookie (set by backend, JS cannot read it)
// - NO persist middleware — page refresh triggers silent refresh via AuthProvider

import { create } from 'zustand';
import type { User } from '../types/auth.types';

interface AuthState {
  accessToken:     string | null;
  user:            User | null;
  roles:           string[];
  isAuthenticated: boolean;
  profilePicture:  string | null;   // seeded from login response, memory-only — no cookie size limit

  // Called after login/signup — stores access token in memory
  setAuth:   (data: { access_token: string; user?: User | null; roles?: string[] }) => void;

  // Called after silent refresh — updates access token only
  setTokens: (data: { access_token: string; user?: User | null; roles?: string[] }) => void;

  // Seed/update the avatar URL — called at login and after upload/remove
  setProfilePicture: (url: string | null) => void;

  // Called on logout or auth failure
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken:     null,
  user:            null,
  roles:           [],
  isAuthenticated: false,
  profilePicture:  null,

  setAuth: ({ access_token, user, roles }) => {
    set({
      accessToken:     access_token,
      user:            user ?? null,
      roles:           roles ?? [],
      isAuthenticated: true,
    });
  },

  setTokens: ({ access_token, user, roles }) => {
    set((state) => ({
      accessToken:     access_token,
      user:            user ?? state.user,
      roles:           roles ?? state.roles,
      isAuthenticated: true,
    }));
  },

  setProfilePicture: (url) => set({ profilePicture: url }),

  clearAuth: () => {
    set({
      accessToken:     null,
      user:            null,
      roles:           [],
      isAuthenticated: false,
      profilePicture:  null,
    });
  },
}));

// ── Selector helpers (use these in components for clean re-renders) ────────────
export const selectIsAuthenticated  = (s: AuthState) => s.isAuthenticated;
export const selectUser             = (s: AuthState) => s.user;
export const selectAccessToken      = (s: AuthState) => s.accessToken;
export const selectProfilePicture   = (s: AuthState) => s.profilePicture;