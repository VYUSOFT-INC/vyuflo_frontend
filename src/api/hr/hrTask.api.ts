// src/api/hr/hrTask.api.ts
import axiosInstance from '../axios';
import type {
  HRTaskResponse,
  HRTaskCreateRequest,
  HRTaskUpdateRequest,
  HRTaskCompleteRequest,
} from '../../types/hr/task.types';

const base = (applicationId: string) => `/hr/cases/${applicationId}/tasks`;

export const hrTaskApi = {
  list: async (applicationId: string): Promise<HRTaskResponse[]> => {
    const res = await axiosInstance.get(base(applicationId));
    return res.data;
  },

  create: async (applicationId: string, data: HRTaskCreateRequest): Promise<HRTaskResponse> => {
    const res = await axiosInstance.post(base(applicationId), data);
    return res.data;
  },

  update: async (applicationId: string, taskId: string, data: HRTaskUpdateRequest): Promise<HRTaskResponse> => {
    const res = await axiosInstance.patch(`${base(applicationId)}/${taskId}`, data);
    return res.data;
  },

  complete: async (applicationId: string, taskId: string, data: HRTaskCompleteRequest): Promise<HRTaskResponse> => {
    const res = await axiosInstance.patch(`${base(applicationId)}/${taskId}/complete`, data);
    return res.data;
  },

  delete: async (applicationId: string, taskId: string): Promise<void> => {
    await axiosInstance.delete(`${base(applicationId)}/${taskId}`);
  },
};