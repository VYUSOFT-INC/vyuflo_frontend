import axios from "../axios";
import type {
  EmployeeListResponse,
  EmployeeListQuery,
  UpdateEmployeeRequest,
} from "../../types/hr/employees.types";

const BASE = "/hr";

export const employeesApi = {
  list: async (q: EmployeeListQuery = {}): Promise<EmployeeListResponse> => {
    const params: Record<string, unknown> = {};

    if (q.is_active !== undefined) params.is_active = q.is_active;
    if (q.limit) params.limit = q.limit;
    if (q.offset) params.offset = q.offset;

    const res = await axios.get(`${BASE}/employees`, { params });
    return res.data;
  },

  update: async (
    linkId: string,
    data: UpdateEmployeeRequest
  ): Promise<{ message: string; id: string }> => {
    const res = await axios.patch(`${BASE}/employees/${linkId}`, data);
    return res.data;
  },

  remove: async (linkId: string): Promise<{ message: string }> => {
    const res = await axios.delete(`${BASE}/employees/${linkId}`);
    return res.data;
  },
};

export const getHREmployees = employeesApi.list;