// src/api/admin/users.api.ts
//
// Admin User Management API — mirrors backend enum exactly.
// FE display roles: hr | admin | employee | lawyer  (4 canonical values).
// Backend enum:     hr | app_admin | employee | attorney
// We translate on outgoing wire calls via toBackendRole(); incoming
// responses go through normaliseRole() so the UI always sees FE codes.
// baseURL ends with /api/v1 — paths here start with /admin/...

import axios from "../axios";

// ── Types ──────────────────────────────────────────────────────────
export type UserRole   = "hr" | "admin" | "employee" | "lawyer";
export type UserStatus = "Active" | "Pending" | "Suspended" | string;

export interface AdminUser {
  id:          string;
  name:        string;
  email:       string;
  role:        UserRole;
  company:     string | null;
  status:      UserStatus;
  lastLogin:   string | null;
  initials?:   string;
  avatarColor?: string;
}

export interface UserStats {
  totalUsers:      { value: number; trend: string; trendUp: boolean };
  activeAccounts:  { value: number; trend: string; trendUp: boolean };
  pendingApproval: { value: number; trend: string; trendUp: boolean };
  suspended:       { value: number; trend: string; trendUp: null   };
}

export interface UserListResponse {
  users:      AdminUser[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface CreateUserPayload {
  name:     string;
  email:    string;
  role:     UserRole;
  company?: string;
  password?: string;
}

// ── Helpers ────────────────────────────────────────────────────────
/** Human label for a backend role code. */
export const ROLE_LABEL: Record<UserRole, string> = {
  hr:       "HR",
  admin:    "Admin",
  employee: "Employee",
  lawyer:   "Lawyer",
};

/** Colored badge palette per role. */
export const ROLE_STYLE: Record<UserRole, { bg: string; color: string; border: string }> = {
  hr:       { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  admin:    { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  employee: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  lawyer:   { bg: "#f5f3ff", color: "#6d28d9", border: "#ddd6fe" },
};

/** Normalise incoming role from backend → FE canonical code. */
export function normaliseRole(raw: string): UserRole {
  const r = (raw || "").toLowerCase().replace(/[\s-]/g, "_");
  if (r === "hr" || r === "hr_admin") return "hr";
  if (r === "admin" || r === "app_admin") return "admin";
  if (r === "employee" || r === "applicant") return "employee";
  if (r === "lawyer" || r === "attorney") return "lawyer";
  return "employee";
}

/** Convert FE canonical role → backend enum on outgoing calls.
 *  Backend expects `attorney` and `app_admin`; UI shows `lawyer` and `admin`. */
export function toBackendRole(r: UserRole): string {
  if (r === "lawyer") return "attorney";
  if (r === "admin")  return "app_admin";
  return r; // hr, employee → same on both sides
}

// ── API calls ──────────────────────────────────────────────────────

/** GET /admin/users/stats */
export const fetchUserStats = async (): Promise<UserStats> => {
  const res = await axios.get("/admin/users/stats");
  return res.data.data ?? res.data;
};

/** GET /admin/users?search=&role=&status=&page=&limit= */
export const fetchUsers = async (params?: {
  search?: string;
  role?:   UserRole;
  status?: UserStatus;
  page?:   number;
  limit?:  number;
}): Promise<UserListResponse> => {
  const p: Record<string, unknown> = { ...params };
  if (params?.role) p.role = toBackendRole(params.role);
  const res = await axios.get("/admin/users", { params: p });
  return res.data.data ?? res.data;
};

/** GET /admin/users/:id */
export const fetchUserById = async (id: string): Promise<AdminUser> => {
  const res = await axios.get(`/admin/users/${id}`);
  return (res.data.data?.user ?? res.data.data ?? res.data) as AdminUser;
};

/** POST /admin/users */
export const createUser = async (payload: CreateUserPayload): Promise<AdminUser> => {
  const body = { ...payload, role: toBackendRole(payload.role) };
  const res = await axios.post("/admin/users", body);
  return (res.data.data?.user ?? res.data.data ?? res.data) as AdminUser;
};

/** PUT /admin/users/:id */
export const updateUser = async (
  id: string,
  payload: Partial<Pick<AdminUser, "name" | "email" | "role" | "company">>,
): Promise<AdminUser> => {
  const body: Record<string, unknown> = { ...payload };
  if (payload.role) body.role = toBackendRole(payload.role as UserRole);
  const res = await axios.put(`/admin/users/${id}`, body);
  return (res.data.data?.user ?? res.data.data ?? res.data) as AdminUser;
};

/** DELETE /admin/users/:id */
export const deleteUser = async (id: string): Promise<void> => {
  await axios.delete(`/admin/users/${id}`);
};

/** PUT /admin/users/:id/status */
export const updateUserStatus = async (id: string, status: UserStatus): Promise<AdminUser> => {
  const res = await axios.put(`/admin/users/${id}/status`, { status });
  return (res.data.data?.user ?? res.data.data ?? res.data) as AdminUser;
};

/** PUT /admin/users/:id/role */
export const updateUserRole = async (id: string, role: UserRole): Promise<AdminUser> => {
  const res = await axios.put(`/admin/users/${id}/role`, { role: toBackendRole(role) });
  return (res.data.data?.user ?? res.data.data ?? res.data) as AdminUser;
};

/** POST /admin/users/bulk-role */
export const bulkUpdateRole = async (
  userIds: string[],
  role: UserRole,
): Promise<{ updated: number }> => {
  const res = await axios.post("/admin/users/bulk-role", {
    userIds,
    role: toBackendRole(role),
  });
  return res.data.data ?? res.data;
};

/** GET /admin/users/export — returns CSV blob */
export const exportUsers = async (params?: {
  role?:   UserRole;
  status?: UserStatus;
  search?: string;
}): Promise<Blob> => {
  const p: Record<string, unknown> = { ...params };
  if (params?.role) p.role = toBackendRole(params.role);
  const res = await axios.get("/admin/users/export", { params: p, responseType: "blob" });
  return res.data as Blob;
};