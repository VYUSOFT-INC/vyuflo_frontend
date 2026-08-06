// src/hooks/employee/useBookConsultation.ts
import { useState, useEffect, useCallback } from "react";
import type {
  BookConsultationData,
  CreateConsultationBookingRequest,
  CreateConsultationBookingResponse,
} from "../../types/employee/bookConsultation.types";
import {
  getBookConsultationData,
  createConsultationBooking,
} from "../../api/employee/bookConsultation.api";

export function useBookConsultation(attorneyId?: string) {
  const [data, setData]       = useState<BookConsultationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const result = await getBookConsultationData(attorneyId);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load consultation.");
    } finally {
      setLoading(false);
    }
  }, [attorneyId]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, refetch: load };
}

export function useCreateConsultationBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [result, setResult]   = useState<CreateConsultationBookingResponse | null>(null);

  const submit = useCallback(async (body: CreateConsultationBookingRequest) => {
    try {
      setLoading(true); setError(null);
      const res = await createConsultationBooking(body);
      setResult(res);
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed.");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submit, loading, error, result };
}