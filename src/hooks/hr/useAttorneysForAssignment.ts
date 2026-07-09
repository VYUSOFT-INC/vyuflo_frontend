import { useState, useEffect, useCallback } from "react";
import type { AxiosError } from "axios";
import type { AttorneyAssignOption } from "../../types/hr/attorneyAssign.types";
import { listAttorneysForAssignment } from "../../api/hr/attorneyAssign.api";

function extractMessage(e: unknown): string {
  const err = e as AxiosError<{ detail: string }>;
  return err.response?.data?.detail ?? (e instanceof Error ? e.message : "Something went wrong. Please try again.");
}

export function useAttorneysForAssignment() {
  const [attorneys, setAttorneys] = useState<AttorneyAssignOption[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setAttorneys(await listAttorneysForAssignment());
    } catch (e) {
      setError(extractMessage(e));
      setAttorneys([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { attorneys, loading, error, refetch: load };
}