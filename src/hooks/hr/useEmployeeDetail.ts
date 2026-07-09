// src/hooks/hr/useEmployeeDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { employeeDetailApi } from '../../api/hr/employeeDetail.api';
import type { EmployeeDetailData } from '../../types/hr/employeeDetail.types';

export function useEmployeeDetail(employeeLinkId: string | undefined) {
  const [data, setData]           = useState<EmployeeDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeLinkId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await employeeDetailApi.get(employeeLinkId);
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employee details';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [employeeLinkId]);

  useEffect(() => { void load(); }, [load]);

  return { data, isLoading, error, refetch: load };
}