// // src/api/auth.api.ts
// import axios from "./axios";

// // ── Auth (Login / Signup / Logout / Refresh) ──────────────────────────────────
// export const authApi = {

//   signup: async (body: {
//     first_name: string;
//     last_name: string;
//     email: string;
//     password: string;
//     role: string;
//     phone?: string;
//     terms_accepted: boolean;
//     marketing_opt_in: boolean;
//     newsletter_opt_in: boolean;
//     referral_source?: string;
//   }) => {
//     const res = await axios.post("/auth/signup", body);
//     return res.data; // { access_token, refresh_token, roles, onboarding_step }
//   },

//   login: async (body: { email: string; password: string }) => {
//     const res = await axios.post("/auth/login", body);
//     return res.data; // { access_token, refresh_token, roles }
//   },

//   logout: async () => {
//     const res = await axios.post("/auth/logout");
//     localStorage.removeItem("access_token");
//     localStorage.removeItem("refresh_token");
//     return res.data;
//   },

//   refresh: async (refresh_token: string) => {
//     const res = await axios.post("/auth/refresh", { refresh_token });
//     return res.data; // { access_token, refresh_token }
//   },

// };

// // ── Forgot Password (Screens 07–09) ───────────────────────────────────────────
// export const forgotPasswordApi = {

//   // Screen 07 — user submits their email
//   requestReset: async (body: { email: string }) => {
//   const res = await axios.post("/auth/password-reset/request", body);
//   return res.data as { message: string; reset_token_id: string };
//   },

//   // Screen 08 — user submits the 6-digit OTP
//   verifyOtp: async (body: { reset_token_id: string; otp_code: string }) => {
//     const res = await axios.post("/auth/password-reset/verify-otp", body);
//     return res.data; // { message }
//   },

//   // Screen 09 — user sets a new password
//   completeReset: async (body: { reset_token_id: string; new_password: string;confirm_password: string }) => {
//     const res = await axios.post("/auth/password-reset/complete", body);
//     return res.data; // { message }
//   },

// };

// // ── Aliases — all pages import from here, names vary ─────────────────────────
// export const loginApi        = authApi;
// export const signupApi       = authApi;


import axios from './axios';
import type {
  User,
  TokenPayload,
  SignupBody,
  LoginBody,
  SSOBody,
  SignupResponse,
  LoginResponse,
  ResetRequestResponse,
} from '../types/auth.types';

// Re-export so files that used to import User from here still work
export type { User, TokenPayload };

// ── Auth API ──────────────────────────────────────────────────────────────────

export const authApi = {
  signup: async (body: SignupBody): Promise<SignupResponse> => {
    const res = await axios.post('/auth/signup', body);
    return res.data;
  },

  login: async (body: LoginBody): Promise<LoginResponse> => {
    const res = await axios.post('/auth/login', body);
    return res.data;
  },

  sso: async (body: SSOBody): Promise<LoginResponse> => {
    const res = await axios.post('/auth/sso', body);
    return res.data;
  },

  logout: async (): Promise<void> => {
    await axios.post('/auth/logout');
    // clearAuth wipes both Zustand state and localStorage tokens
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.getState().clearAuth();
  },

  refresh: async (refresh_token: string): Promise<TokenPayload> => {
    const res = await axios.post('/auth/refresh', { refresh_token });
    return res.data;
  },
};

// ── Forgot Password API ───────────────────────────────────────────────────────

export const forgotPasswordApi = {
  requestReset: async (body: {
    email: string;
  }): Promise<ResetRequestResponse> => {
    const res = await axios.post('/auth/password-reset/request', body);
    return res.data;
  },

  verifyOtp: async (body: {
    reset_token_id: string;
    otp_code:       string;
  }): Promise<{ message: string }> => {
    const res = await axios.post('/auth/password-reset/verify-otp', body);
    return res.data;
  },

  completeReset: async (body: {
    reset_token_id:   string;
    new_password:     string;
    confirm_password: string;
  }): Promise<{ message: string }> => {
    const res = await axios.post('/auth/password-reset/complete', body);
    return res.data;
  },
};

// ── Me API ────────────────────────────────────────────────────────────────────

export const getMeApi = async (): Promise<User> => {
  const res = await axios.get('/auth/me');
  return res.data;
};