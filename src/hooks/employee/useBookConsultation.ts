// src/hooks/employee/useBookConsultation.ts
import { useState, useEffect, useCallback } from "react";
import type { AxiosError } from "axios";
import type {
  BookConsultationData,
  CreateConsultationBookingRequest,
} from "../../types/employee/bookConsultation.types";
import { getBookConsultationData, createConsultationBooking } from "../../api/employee/bookConsultation.api";

function extractMessage(e: unknown): string {
  const err = e as AxiosError<{ detail: string }>;
  return err.response?.data?.detail ?? (e instanceof Error ? e.message : "Something went wrong. Please try again.");
}

export function useBookConsultation(attorneyId?: string) {
  const [data, setData] = useState<BookConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setData(await getBookConsultationData(attorneyId));
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, [attorneyId]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, refetch: load };
}

export function useCreateConsultationBooking(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (body: CreateConsultationBookingRequest) => {
    try {
      setLoading(true);
      setError(null);
      await createConsultationBooking(body);
      onSuccess?.();
    } catch (e) {
      setError(extractMessage(e));
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { submit, loading, error };
}