// import { create } from 'zustand';
// import { persist } from 'zustand/middleware';
// import type { User, TokenPayload } from '../types/auth.types';

// interface AuthState {
//   user:            User | null;
//   tokens:          TokenPayload | null;
//   isAuthenticated: boolean;
//   setAuth:         (user: User, tokens: TokenPayload) => void;
//   clearAuth:       () => void;
//   updateUser:      (partial: Partial<User>) => void;
// }

// export const useAuthStore = create<AuthState>()(
//   persist(
//     (set) => ({
//       user:            null,
//       tokens:          null,
//       isAuthenticated: false,

//       setAuth: (user, tokens) => {
//         // Save tokens to localStorage for axios interceptor to read
//         localStorage.setItem('access_token',  tokens.access_token);
//         localStorage.setItem('refresh_token', tokens.refresh_token);
//         // Also save roles for getOnboardingRoute to read
//         localStorage.setItem('roles', JSON.stringify(user.roles));
//         set({ user, tokens, isAuthenticated: true });
//       },

//       clearAuth: () => {
//         localStorage.removeItem('access_token');
//         localStorage.removeItem('refresh_token');
//         localStorage.removeItem('roles');
//         set({ user: null, tokens: null, isAuthenticated: false });
//       },

//       updateUser: (partial) =>
//         set((state) => ({
//           user: state.user ? { ...state.user, ...partial } : null,
//         })),
//     }),
//     {
//       name: 'auth-store',
//       partialize: (state) => ({
//         user:            state.user,
//         tokens:          state.tokens,
//         isAuthenticated: state.isAuthenticated,
//       }),
//     }
//   )
// );

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

  // Called after login/signup — stores access token in memory
  setAuth:   (data: { access_token: string; user?: User | null ; roles?: string[]}) => void;

  // Called after silent refresh — updates access token only
  setTokens: (data: { access_token: string; user?: User | null ; roles?: string[]}) => void;

  // Called on logout or auth failure
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken:     null,
  user:            null,
  roles:           [],
  isAuthenticated: false,

  setAuth: ({ access_token, user, roles }) => {
    set({
      accessToken:     access_token,
      user:            user ?? null,
      roles:           roles ?? [],
      isAuthenticated: true,
    });
  },

  setTokens: ({ access_token, user,roles }) => {
    set((state) => ({
      accessToken:     access_token,
      user:            user ?? state.user,   // keep existing user if not provided
      roles:           roles ?? state.roles,
      isAuthenticated: true,
    }));
  },

  clearAuth: () => {
    set({
      accessToken:     null,
      user:            null,
      roles: [],
      isAuthenticated: false,
    });
  },
}));

// ── Selector helpers (use these in components for clean re-renders) ────────────
export const selectIsAuthenticated = (s: AuthState) => s.isAuthenticated;
export const selectUser            = (s: AuthState) => s.user;
export const selectAccessToken     = (s: AuthState) => s.accessToken;