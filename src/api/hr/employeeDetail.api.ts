// src/api/hr/employeeDetail.api.ts
import axios from '../axios';
import type { EmployeeDetailData } from '../../types/hr/employeeDetail.types';

const BASE = '/hr';

export const employeeDetailApi = {
  /**
   * GET /hr/employees/:employee_link_id/detail
   * Returns the full profile detail payload for Screen 21.
   * employeeLinkId = employer_employees.id (the UUID we have in EmployeeLink.id)
   */
  get: async (employeeLinkId: string): Promise<EmployeeDetailData> => {
    const res = await axios.get(`${BASE}/employees/${employeeLinkId}/detail`);
    return res.data;
  },
};