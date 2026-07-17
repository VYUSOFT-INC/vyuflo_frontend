// src/hooks/hr/useHRTasks.ts
import { useState, useEffect, useCallback } from 'react';
import { hrTaskApi } from '../../api/hr/hrTask.api';
import type { HRTaskResponse, HRTaskCreateRequest } from '../../types/hr/task.types';

export function useHRTasks(applicationId: string | undefined) {
  const [tasks, setTasks]     = useState<HRTaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true); setError(null);
    try {
      const data = await hrTaskApi.list(applicationId);
      setTasks(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally { setLoading(false); }
  }, [applicationId]);

  useEffect(() => { void load(); }, [load]);

  const toggle = useCallback(async (taskId: string, done: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: done } : t));
    try {
      const updated = await hrTaskApi.complete(applicationId!, taskId, { is_completed: done });
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, is_completed: !done } : t));
      throw new Error('Failed to update task');
    }
  }, [applicationId]);

  const addTask = useCallback(async (data: HRTaskCreateRequest) => {
    const task = await hrTaskApi.create(applicationId!, data);
    setTasks(prev => [...prev, task].sort((a, b) => a.sort_order - b.sort_order));
    return task;
  }, [applicationId]);

  const deleteTask = useCallback(async (taskId: string) => {
    await hrTaskApi.delete(applicationId!, taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, [applicationId]);

  const completedCount = tasks.filter(t => t.is_completed).length;
  const totalCount     = tasks.length;

  return { tasks, loading, error, toggle, addTask, deleteTask, reload: load, completedCount, totalCount };
}