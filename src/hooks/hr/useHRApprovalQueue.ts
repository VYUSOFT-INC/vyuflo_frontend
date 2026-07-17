// src/hooks/hr/useHRApprovalQueue.ts
//
// Hook for HR Approval Queue page.
// Manages approval items list, selection, approve/reject actions, bulk operations.

import { useState, useCallback, useMemo } from 'react';
import { hrApprovalApi } from '../../api/hr/hrApproval.api';
import type {
  HRApprovalItem,
  HRApprovalStats,
  ApprovalItemStatus,
  HRApproveDocumentRequest,
  HRRequestEditsRequest,
} from '../../types/hr/approval.types';

// ─────────────────────────────────────────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────────────────────────────────────────

interface UseHRApprovalQueueReturn {
  // State
  items:     HRApprovalItem[];
  stats:     HRApprovalStats;
  isLoading: boolean;
  error:     string | null;

  // Selection (for bulk approve)
  checked:   Set<string>;
  toggleCheck: (id: string) => void;
  toggleAll:   () => void;
  clearChecked: () => void;

  // Actions
  load:         () => Promise<void>;
  approve:      (documentId: string, payload?: HRApproveDocumentRequest) => Promise<void>;
  requestEdits: (documentId: string, payload: HRRequestEditsRequest) => Promise<void>;
  bulkApprove:  () => Promise<{ approved: number; failed: number }>;

  // Filter controls
  showFilter:    string;
  setShowFilter: (v: string) => void;
  priFilter:     string;
  setPriFilter:  (v: string) => void;
  typeFilter:    string;
  setTypeFilter: (v: string) => void;
  dateFilter:    string;
  setDateFilter: (v: string) => void;
  search:        string;
  setSearch:     (v: string) => void;
  clearFilters:  () => void;
}

export function useHRApprovalQueue(): UseHRApprovalQueueReturn {
  const [rawItems,  setRawItems]  = useState<HRApprovalItem[]>([]);
  const [stats,     setStats]     = useState<HRApprovalStats>({ pending: 0, approved_today: 0, edits_requested: 0, avg_response_hours: 0 });
  const [isLoading, setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  // Selection
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Filters
  const [showFilter, setShowFilter] = useState('all');
  const [priFilter,  setPriFilter]  = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('7days');
  const [search,     setSearch]     = useState('');

  // ── Filtered items ─────────────────────────────────────────────────────────

  const items = useMemo(() => {
    const q = search.toLowerCase();
    return rawItems.filter(i => {
      if (q && !`${i.title} ${i.employee_name} ${i.case_number} ${i.visa_type}`.toLowerCase().includes(q)) return false;
      if (showFilter !== 'all') {
        if (showFilter === 'pending'  && i.status !== 'pending')         return false;
        if (showFilter === 'edits'    && i.status !== 'edits_requested') return false;
        if (showFilter === 'approved' && i.status !== 'approved')        return false;
      }
      if (priFilter  !== 'all' && i.priority !== priFilter)  return false;
      if (typeFilter !== 'all' && i.doc_type !== typeFilter) return false;
      return true;
    });
  }, [rawItems, search, showFilter, priFilter, typeFilter]);

  // Compute live stats from rawItems
  const liveStats = useMemo<HRApprovalStats>(() => ({
    pending:            rawItems.filter(i => i.status === 'pending').length,
    approved_today:     rawItems.filter(i => i.status === 'approved').length,
    edits_requested:    rawItems.filter(i => i.status === 'edits_requested').length,
    avg_response_hours: stats.avg_response_hours,
  }), [rawItems, stats]);

  // ── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApprovalApi.list();
      setRawItems(res.items);
      setStats(res.stats);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Approve (optimistic) ────────────────────────────────────────────────────

  const approve = useCallback(async (documentId: string, payload: HRApproveDocumentRequest = {}) => {
    // Optimistic
    setRawItems(prev => prev.map(i =>
      i.id === documentId ? { ...i, status: 'approved' as ApprovalItemStatus } : i
    ));
    try {
      const updated = await hrApprovalApi.approve(documentId, payload);
      setRawItems(prev => prev.map(i => i.id === documentId ? updated : i));
    } catch (err) {
      // Rollback
      setRawItems(prev => prev.map(i =>
        i.id === documentId ? { ...i, status: 'pending' as ApprovalItemStatus } : i
      ));
      throw err;
    }
  }, []);

  // ── Request Edits (optimistic) ─────────────────────────────────────────────

  const requestEdits = useCallback(async (documentId: string, payload: HRRequestEditsRequest) => {
    setRawItems(prev => prev.map(i =>
      i.id === documentId ? {
        ...i,
        status: 'edits_requested' as ApprovalItemStatus,
        action_note: { type: 'edit' as const, title: 'Edit Requested', body: payload.note },
      } : i
    ));
    try {
      const updated = await hrApprovalApi.requestEdits(documentId, payload);
      setRawItems(prev => prev.map(i => i.id === documentId ? updated : i));
    } catch (err) {
      setRawItems(prev => prev.map(i =>
        i.id === documentId ? { ...i, status: 'pending' as ApprovalItemStatus, action_note: undefined } : i
      ));
      throw err;
    }
  }, []);

  // ── Bulk Approve ───────────────────────────────────────────────────────────

  const bulkApprove = useCallback(async (): Promise<{ approved: number; failed: number }> => {
    const pendingIds = [...checked].filter(id =>
      rawItems.find(i => i.id === id)?.status === 'pending'
    );
    if (pendingIds.length === 0) return { approved: 0, failed: 0 };

    // Optimistic
    setRawItems(prev => prev.map(i =>
      pendingIds.includes(i.id) ? { ...i, status: 'approved' as ApprovalItemStatus } : i
    ));
    setChecked(new Set());

    try {
      const result = await hrApprovalApi.bulkApprove({ document_ids: pendingIds });
      return result;
    } catch (err) {
      // Rollback all
      setRawItems(prev => prev.map(i =>
        pendingIds.includes(i.id) ? { ...i, status: 'pending' as ApprovalItemStatus } : i
      ));
      throw err;
    }
  }, [checked, rawItems]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const toggleCheck = useCallback((id: string) => {
    setChecked(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const allIds = items.map(i => i.id);
    setChecked(prev => prev.size === allIds.length ? new Set() : new Set(allIds));
  }, [items]);

  const clearChecked = useCallback(() => setChecked(new Set()), []);

  const clearFilters = useCallback(() => {
    setShowFilter('all');
    setPriFilter('all');
    setTypeFilter('all');
    setDateFilter('7days');
    setSearch('');
  }, []);

  return {
    items,
    stats: liveStats,
    isLoading,
    error,
    checked,
    toggleCheck,
    toggleAll,
    clearChecked,
    load,
    approve,
    requestEdits,
    bulkApprove,
    showFilter,  setShowFilter,
    priFilter,   setPriFilter,
    typeFilter,  setTypeFilter,
    dateFilter,  setDateFilter,
    search,      setSearch,
    clearFilters,
  };
}