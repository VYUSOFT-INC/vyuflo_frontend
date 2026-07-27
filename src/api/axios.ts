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

import { useAuthStore } from '../store/authStore';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import axios from 'axios';

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

const instance = axios.create({
  baseURL:         '/api/v1',
  headers: {
    'Content-Type':               'application/json',
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

// ── RESPONSE — silent refresh on 401 ─────────────────────────────────────────
instance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;
    const status          = error.response?.status;
    const url             = originalRequest?.url ?? '';

    // ✅ These endpoints handle their own 401s — don't intercept
    const isSkippedEndpoint =
      url.includes('/auth/login')    ||
      url.includes('/auth/signup')   ||
      url.includes('/auth/sso')      ||
      url.includes('/auth/refresh'); // ← refresh itself — prevents infinite loop

    if (status === 401 && !isSkippedEndpoint && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Silent refresh — browser sends httpOnly cookie automatically
        const res = await axios.post(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true }
        );
        const { access_token } = res.data;
        useAuthStore.getState().setTokens({ access_token });
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return instance(originalRequest);  // retry original request

      } catch {
        // Refresh failed — session expired, force logout
        useAuthStore.getState().clearAuth();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // ✅ 403 — no permission
    //if (status === 403) {
      //window.location.href = '/dashboard';
    }

    // All other errors — pass through to the calling function
   // return Promise.reject(error);
  //}
);

export default instance;