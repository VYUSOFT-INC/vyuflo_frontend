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
// - access_token is mirrored to localStorage so a page reload keeps the session
// - the mirrored token is dropped as soon as its `exp` has passed
// - refresh_token lives in an httpOnly cookie (set by backend, JS cannot read it)

import { create } from 'zustand';
import { clearUiSession } from '../utils/uiSession';
import type { User } from '../types/auth.types';

const TOKEN_KEY = 'access_token';
const USER_KEY  = 'auth_user';
const ROLES_KEY = 'roles';

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

interface JwtPayload {
  exp?:   number;
  roles?: string[];
}

function decodeToken(token: string): JwtPayload | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
}

function isUsableToken(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  // No exp claim — let the backend decide when it is no longer valid
  if (typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 > Date.now();
}

function persist(token: string, user: User | null, roles: string[]): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ROLES_KEY, JSON.stringify(roles));
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Storage unavailable (private mode / quota) — session stays in memory only
  }
}

function clearPersisted(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ROLES_KEY);
  } catch {
    // ignore
  }
}

function readPersisted(): Pick<AuthState, 'accessToken' | 'user' | 'roles' | 'isAuthenticated'> {
  const empty = { accessToken: null, user: null, roles: [], isAuthenticated: false };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || !isUsableToken(token)) {
      clearPersisted();
      return empty;
    }
    const rawUser     = localStorage.getItem(USER_KEY);
    const rawRoles    = localStorage.getItem(ROLES_KEY);
    const storedRoles = rawRoles ? (JSON.parse(rawRoles) as string[]) : [];
    return {
      accessToken:     token,
      user:            rawUser ? (JSON.parse(rawUser) as User) : null,
      roles:           storedRoles.length ? storedRoles : (decodeToken(token)?.roles ?? []),
      isAuthenticated: true,
    };
  } catch {
    clearPersisted();
    return empty;
  }
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  ...readPersisted(),

  setAuth: ({ access_token, user, roles }) => {
    const nextRoles = roles ?? decodeToken(access_token)?.roles ?? [];
    persist(access_token, user ?? null, nextRoles);
    set({
      accessToken:     access_token,
      user:            user ?? null,
      roles:           nextRoles,
      isAuthenticated: true,
    });
  },

  setTokens: ({ access_token, user,roles }) => {
    const state     = get();
    const nextUser  = user  ?? state.user;                 // keep existing user if not provided
    const nextRoles = roles ?? (state.roles.length ? state.roles : decodeToken(access_token)?.roles ?? []);
    persist(access_token, nextUser, nextRoles);
    set({
      accessToken:     access_token,
      user:            nextUser,
      roles:           nextRoles,
      isAuthenticated: true,
    });
  },

  clearAuth: () => {
    clearPersisted();
    clearUiSession();
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