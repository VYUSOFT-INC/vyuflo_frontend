// src/hooks/hr/useEmployees.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { employeesApi } from '../../api/hr/employees.api';
import type {
  EmployeeLink,
  RosterStats,
  RosterFilterOptions,
  Pagination,
} from '../../types/hr/employees.types';

interface Filters {
  search:     string;
  department: string;
  page:       number;
}

const INITIAL: Filters = {
  search:     '',
  department: 'all',
  page:       1,
};

const PAGE_SIZE = 10;

interface HREmployeesHookData {
  stats:      RosterStats;
  filters:    RosterFilterOptions;
  employees:  EmployeeLink[];
  pagination: Pagination;
}

export function useHREmployees() {
  const [allItems, setAllItems] = useState<EmployeeLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(INITIAL);
  const [searchInput, setSearchInput] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Debounce search input → filters.search
  useEffect(() => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput.trim().toLowerCase(), page: 1 }));
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [searchInput]);

  // Fetch all employees from backend
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await employeesApi.list({ is_active: true, limit: 100 });
      setAllItems(res.items);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load employees';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Client-side filtering + pagination
  const computeData = useCallback((): HREmployeesHookData | null => {
    if (!allItems.length && isLoading) return null;

    const search = filters.search;
    const filtered = allItems.filter(e => {
      if (search && !`${e.full_name} ${e.job_title ?? ''} ${e.email}`.toLowerCase().includes(search)) return false;
      if (filters.department !== 'all' && e.department !== filters.department) return false;
      return true;
    });

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const safePage = Math.min(filters.page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const employees = filtered.slice(start, start + PAGE_SIZE);

    // Derive stats from full (unfiltered) list
    const stats: RosterStats = {
      total_employees:     allItems.length,
      active_applications: allItems.reduce((a, e) => a + (e.active_applications || 0), 0),
      pending_documents:   allItems.reduce((a, e) => a + (e.pending_documents || 0), 0),
      inactive:            0, // we only fetched is_active=true
    };

    // Derive filter options
    const departments = Array.from(new Set(allItems.map(e => e.department).filter(Boolean) as string[]));

    return {
      stats,
      filters: { departments },
      employees,
      pagination: { page: safePage, page_size: PAGE_SIZE, total, total_pages: totalPages },
    };
  }, [allItems, filters, isLoading]);

  const data = computeData();

  // Setters
  const setDepartment = useCallback((v: string) => setFilters(f => ({ ...f, department: v, page: 1 })), []);
  const setPage       = useCallback((p: number) => setFilters(f => ({ ...f, page: p })), []);

  const reset = useCallback(() => {
    setSearchInput('');
    setFilters(INITIAL);
  }, []);

  const hasActiveFilters =
    filters.search !== '' || filters.department !== 'all';

  return {
    data, isLoading, error, refetch: load,
    filters, searchInput, setSearchInput,
    setDepartment, setPage,
    reset, hasActiveFilters,
  };
}