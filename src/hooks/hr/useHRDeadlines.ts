// src/hooks/hr/useHRDeadlines.ts

import { useState, useCallback, useMemo } from 'react';
import { hrDeadlinesApi } from '../../api/hr/hrDeadlines.api';
import type {
  HRDeadlineItem,
  HRExtensionRequest,
  HRDeadlineStats,
  HRDeadlineInsights,
  HRRequestExtensionBody,
} from '../../types/hr/deadlines.types';

const DEFAULT_INSIGHTS: HRDeadlineInsights = {
  completion_rate:   94.5,
  completed_on_time: 51,
  late_completions:  3,
  with_extensions:   8,
  avg_response_days: 3.2,
  fastest_hours:     12,
  slowest_days:      8,
  high_risk:         4,
  medium_risk:       8,
  low_risk:          15,
};

export interface UseHRDeadlinesReturn {
  deadlines:      HRDeadlineItem[];
  extensions:     HRExtensionRequest[];
  stats:          HRDeadlineStats;
  insights:       HRDeadlineInsights;
  isLoading:      boolean;
  error:          string | null;
  urgentItems:    HRDeadlineItem[];
  upcomingItems:  HRDeadlineItem[];
  load:              () => Promise<void>;
  requestExtension:  (applicationId: string, body: HRRequestExtensionBody) => Promise<void>;
  approveExtension:  (extensionId: string, note?: string) => Promise<void>;
  denyExtension:     (extensionId: string, note?: string) => Promise<void>;
  search:        string;
  setSearch:     (v: string) => void;
  urgencyFilter: string;
  setUrgency:    (v: string) => void;
  typeFilter:    string;
  setType:       (v: string) => void;
}

export function useHRDeadlines(): UseHRDeadlinesReturn {
  const [deadlines,   setDeadlines]  = useState<HRDeadlineItem[]>([]);
  const [extensions,  setExtensions] = useState<HRExtensionRequest[]>([]);
  // FIX: was destructuring stats into setStats but not using the setter correctly —
  //      insights setter was also missing. Now all four have explicit setters.
  const [apiStats,    setApiStats]   = useState<HRDeadlineStats | null>(null);
  const [insights,    setInsights]   = useState<HRDeadlineInsights>(DEFAULT_INSIGHTS);
  const [isLoading,   setLoading]    = useState(false);
  const [error,       setError]      = useState<string | null>(null);

  const [search,        setSearch]   = useState('');
  const [urgencyFilter, setUrgency]  = useState('all');
  const [typeFilter,    setType]     = useState('all');

  // ── Load ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dlRes, extRes] = await Promise.allSettled([
        hrDeadlinesApi.list(),
        hrDeadlinesApi.listExtensions(),
      ]);

      if (dlRes.status === 'fulfilled') {
        setDeadlines(dlRes.value.items ?? []);
        if (dlRes.value.stats)    setApiStats(dlRes.value.stats);
        if (dlRes.value.insights) setInsights(dlRes.value.insights);
      } else {
        setError('Failed to load deadlines');
      }

      if (extRes.status === 'fulfilled') {
        setExtensions(extRes.value ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deadlines');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Filtered deadlines ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return deadlines.filter(d => {
      if (q && !`${d.title} ${d.case_number} ${d.employee_name} ${d.visa_type}`.toLowerCase().includes(q)) return false;
      if (urgencyFilter !== 'all') {
        if (urgencyFilter === 'urgent'   && d.days_remaining > 7)  return false;
        if (urgencyFilter === 'warning'  && (d.days_remaining <= 7 || d.days_remaining > 30)) return false;
        if (urgencyFilter === 'on_track' && d.days_remaining <= 30) return false;
      }
      if (typeFilter !== 'all' && d.deadline_type !== typeFilter) return false;
      return true;
    });
  }, [deadlines, search, urgencyFilter, typeFilter]);

  const urgentItems   = useMemo(() => filtered.filter(d => d.days_remaining <= 7), [filtered]);
  const upcomingItems = useMemo(() => filtered.filter(d => d.days_remaining > 7 && d.days_remaining <= 30), [filtered]);

  // ── Live stats (computed, not from API) ───────────────────────────────────
  // Use apiStats if available, otherwise compute from loaded data

  const stats = useMemo<HRDeadlineStats>(() => {
    if (apiStats) return apiStats;
    return {
      urgent:     deadlines.filter(d => d.days_remaining >= 0 && d.days_remaining <= 7).length,
      warning:    deadlines.filter(d => d.days_remaining > 7  && d.days_remaining <= 30).length,
      on_track:   deadlines.filter(d => d.days_remaining > 30).length,
      extensions: extensions.filter(e => e.status === 'pending').length,
    };
  }, [apiStats, deadlines, extensions]);

  // ── Request Extension ─────────────────────────────────────────────────────

  const requestExtension = useCallback(async (applicationId: string, body: HRRequestExtensionBody) => {
    const newExt = await hrDeadlinesApi.requestExtension(applicationId, body);
    setExtensions(prev => [newExt, ...prev]);
  }, []);

  // ── Review Extension (optimistic) ─────────────────────────────────────────

  const approveExtension = useCallback(async (extensionId: string, note?: string) => {
    setExtensions(prev => prev.map(e =>
      e.id === extensionId ? { ...e, status: 'approved' as const } : e
    ));
    try {
      const updated = await hrDeadlinesApi.reviewExtension(extensionId, { action: 'approve', note });
      setExtensions(prev => prev.map(e => e.id === extensionId ? updated : e));
    } catch (err) {
      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, status: 'pending' as const } : e
      ));
      throw err;
    }
  }, []);

  const denyExtension = useCallback(async (extensionId: string, note?: string) => {
    setExtensions(prev => prev.map(e =>
      e.id === extensionId ? { ...e, status: 'denied' as const } : e
    ));
    try {
      const updated = await hrDeadlinesApi.reviewExtension(extensionId, { action: 'deny', note });
      setExtensions(prev => prev.map(e => e.id === extensionId ? updated : e));
    } catch (err) {
      setExtensions(prev => prev.map(e =>
        e.id === extensionId ? { ...e, status: 'pending' as const } : e
      ));
      throw err;
    }
  }, []);

  return {
    deadlines: filtered,
    extensions,
    stats,
    insights,
    isLoading,
    error,
    urgentItems,
    upcomingItems,
    load,
    requestExtension,
    approveExtension,
    denyExtension,
    search,        setSearch,
    urgencyFilter, setUrgency,
    typeFilter,    setType,
  };
}