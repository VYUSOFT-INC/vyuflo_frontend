// src/api/employee/dashboard.api.ts

import axios from "../axios";
import type { DashboardResponse } from "../../types/employee/dashboard.types";

/**
 * GET /dashboard
 * Returns the full employee dashboard payload.
 */
export async function getDashboard(): Promise<DashboardResponse> {
  const res = await axios.get<DashboardResponse>("/dashboard");
  return res.data;
}