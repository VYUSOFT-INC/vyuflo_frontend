// src/hooks/hr/useDashboard.ts
import { useState, useEffect, useCallback } from 'react';
import type { AxiosError } from 'axios';
import type { HRDashboardData } from '../../types/hr/dashboard.types';
import { getHRDashboard } from '../../api/hr/dashboard.api';

function extractMessage(e: unknown): string {
  const err = e as AxiosError<{ detail: string }>;
  return (
    err.response?.data?.detail ??
    (e instanceof Error ? e.message : 'Something went wrong. Please try again.')
  );
}

/**
 * Loads the HR Compliance Dashboard payload (stats, compliance, expiring visas,
 * activity feed, expiration timeline) in a single request.
 * Same shape as the employee hooks: { data, isLoading, error, refetch }.
 */
export function useHRDashboard() {
  const [data, setData]         = useState<HRDashboardData | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getHRDashboard());
    } catch (e) {
      console.error('HR dashboard API error:', e);
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { data, isLoading, error, refetch: load };
}