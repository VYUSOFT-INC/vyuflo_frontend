// // src/api/axios.ts
// import axios from "axios";

// const instance = axios.create({
//   baseURL: import.meta.env.VITE_API_URL,
// });

// // Attach token to every request
// instance.interceptors.request.use((config) => {
//   const token = localStorage.getItem("access_token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// export default instance;

// import axios from "axios";

// // Read env variable
// const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// // Optional safety check
// if (!BASE_URL) {
//   throw new Error("VITE_API_BASE_URL is not defined in .env");
// }

// // Create axios instance
// const instance = axios.create({
//   baseURL: BASE_URL,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// // Attach token to every request
// instance.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("access_token");

//     if (token) {
//       config.headers = config.headers || {};
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// src/api/axios.ts
import { useAuthStore } from '../store/authStore';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const instance = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  withCredentials: true,
});

// ── REQUEST — attach access token from memory ─────────────────────────────────
instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// ── RESPONSE — silent refresh on 401, single-flight ────────────────────────────
// FIXED: previously every failing request independently called /auth/refresh.
// If two authenticated requests expired at the same time (e.g. Sidebar's
// profile fetch + a page's list fetch on mount), that fired two concurrent
// refresh calls. The second one arrives with an already-rotated/consumed
// refresh cookie, gets flagged by the backend's reuse-detection as a replay,
// and the whole session gets force-logged-out — even though the first
// refresh actually succeeded. Now all concurrent 401s share one in-flight
// refresh promise instead of racing.

let refreshPromise: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post('/api/v1/auth/refresh', {}, { withCredentials: true })
      .then((res) => {
        const { access_token } = res.data;
        useAuthStore.getState().setTokens({ access_token });
        return access_token as string;
      })
      .finally(() => {
        // Clear the lock once this refresh attempt settles (success or fail),
        // so a future 401 after this one can trigger a fresh refresh.
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    const status = error.response?.status;
    const url = originalRequest?.url ?? '';

    // ✅ These endpoints handle their own 401s — don't intercept
    const isSkippedEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/signup') ||
      url.includes('/auth/sso') ||
      url.includes('/auth/refresh'); // ← refresh itself — prevents infinite loop

    if (status === 401 && !isSkippedEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // All concurrent 401s await the SAME refresh call instead of each
        // firing their own — this is what prevents the reuse-detection race.
        const access_token = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return instance(originalRequest); // retry original request
      } catch {
        // Refresh failed — session genuinely expired, force logout
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default instance;