// src/pages/admin/UserManagement.tsx
//
// Fully-wired admin User Management screen.
//   • Server-side search (debounced 300 ms) via GET /admin/users?search=
//   • Change role (bulk) — enabled when ≥ 1 row checked; POST /admin/users/bulk-role
//   • Filter popover — role + status; refetches with query params
//   • Role column: static colored badge (no dropdown)
//   • Row 3-dots → "View / Edit user" modal (name, email, role editable)
//   • Create User button → modal → POST /admin/users
//   • Export → GET /admin/users/export → CSV download

import { useEffect, useRef, useState } from "react";

import {
  fetchUsers,
  fetchUserStats,
  createUser,
  updateUser,
  bulkUpdateRole,
  exportUsers,
  ROLE_LABEL,
  ROLE_STYLE,
  normaliseRole,
  type AdminUser,
  type UserRole,
  type UserStatus,
  type UserStats,
} from "../../api/admin/users.api";

import imgSearchSmall    from "../../assets/admin/search-small.svg";
import imgExport         from "../../assets/admin/export.svg";
import imgFilter         from "../../assets/admin/filter.svg";
import imgChevronDown    from "../../assets/admin/chevron-down.svg";
import imgChevronLeft    from "../../assets/admin/chevron-left.svg";
import imgChevronRight   from "../../assets/admin/chevron-right.svg";
import imgDotsVertical   from "../../assets/admin/dots-vertical.svg";
import imgPlus           from "../../assets/admin/plus.svg";
import imgUsersTotal     from "../../assets/admin/users-total.svg";
import imgUsersActive    from "../../assets/admin/users-active.svg";
import imgArrowUp        from "../../assets/admin/arrow-up.svg";

import AdminBackButton from "../../components/admin/AdminBackButton";

/* ── Constants ─────────────────────────────────────────────────── */
const PAGE_SIZE = 20;
const ROLES: UserRole[] = ["hr", "admin", "employee", "lawyer"];
const STATUSES: UserStatus[] = ["Active", "Pending", "Suspended"];
const AVATAR_COLORS = [
  "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)",
  "#a855f7", "#14b8a6", "#f43f5e", "#f59e0b",
  "#10b981", "#6366f1", "#ec4899",
];

/* ── Helpers ───────────────────────────────────────────────────── */
function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function getAvatarBg(idx: number): string { return AVATAR_COLORS[idx % AVATAR_COLORS.length]; }

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/* ── Static role badge (colored, no dropdown) ──────────────────── */
function RoleBadge({ role }: { role: string }) {
  const key = normaliseRole(role);
  const s = ROLE_STYLE[key];
  return (
    <span
      className="inline-flex items-center px-[10px] py-[4px] rounded-full text-[12px] font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {ROLE_LABEL[key]}
    </span>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-[14px] text-[#9ca3af]">—</span>;
  const lower = status.toLowerCase();
  const isActive    = lower === "active";
  const isSuspended = lower === "suspended";
  const dot    = isActive ? "#22c55e" : isSuspended ? "#ef4444" : "#eab308";
  const bg     = isActive ? "#f0fdf4" : isSuspended ? "#fef2f2" : "#fefce8";
  const border = isActive ? "#dcfce7" : isSuspended ? "#fee2e2" : "#fef9c3";
  const color  = isActive ? "#15803d" : isSuspended ? "#b91c1c" : "#a16207";
  return (
    <div className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-full"
      style={{ background: bg, border: `1px solid ${border}` }}>
      <div className="rounded-full size-[6px]" style={{ background: dot }} />
      <span className="text-[12px] font-medium whitespace-nowrap" style={{ color }}>{status}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * PAGE
 * ══════════════════════════════════════════════════════════════════ */
export default function UserManagement() {
  const [search,       setSearch]       = useState("");
  const [debounced,    setDebounced]    = useState("");
  const [roleFilter,   setRoleFilter]   = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "">("");
  const [page,         setPage]         = useState(1);
  const [selectedIds,  setSelectedIds]  = useState<Set<string>>(new Set());

  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const [stats,      setStats]      = useState<UserStats | null>(null);
  const [statsLoad,  setStatsLoad]  = useState(true);

  // Modals / popovers
  const [showFilter,  setShowFilter]  = useState(false);
  const [showRolePick,setShowRolePick]= useState(false);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editing,     setEditing]     = useState<AdminUser | null>(null);
  const [openRowMenu, setOpenRowMenu] = useState<string | null>(null);

  const filterRef   = useRef<HTMLDivElement>(null);
  const rolePickRef = useRef<HTMLDivElement>(null);
  const rowMenuRef  = useRef<HTMLDivElement>(null);

  /* ── Debounce search 300 ms ──────────────────────────────────── */
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  /* ── Reset page whenever filters change ──────────────────────── */
  useEffect(() => { setPage(1); }, [debounced, roleFilter, statusFilter]);

  /* ── Load stats (once) ───────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStatsLoad(true);
      try {
        const s = await fetchUserStats();
        if (!cancelled) setStats(s);
      } catch {
        if (!cancelled) setStats(null);
      } finally {
        if (!cancelled) setStatsLoad(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Load users on any filter/page change ────────────────────── */
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchUsers({
        search: debounced || undefined,
        role:   roleFilter || undefined,
        status: statusFilter || undefined,
        page,
        limit:  PAGE_SIZE,
      });
      setUsers(res.users ?? []);
      setTotal(res.total ?? 0);
    } catch (e: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ax = e as any;
      setError(ax?.response?.data?.detail || (e instanceof Error ? e.message : "Could not load users."));
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [debounced, roleFilter, statusFilter, page]);

  /* ── Close popovers on outside click ─────────────────────────── */
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (showFilter   && filterRef.current   && !filterRef.current.contains(e.target as Node))   setShowFilter(false);
      if (showRolePick && rolePickRef.current && !rolePickRef.current.contains(e.target as Node)) setShowRolePick(false);
      if (openRowMenu  && rowMenuRef.current  && !rowMenuRef.current.contains(e.target as Node))  setOpenRowMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showFilter, showRolePick, openRowMenu]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (users.length === 0) return;
    const allChecked = users.every((u) => selectedIds.has(u.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      users.forEach((u) => { if (allChecked) next.delete(u.id); else next.add(u.id); });
      return next;
    });
  };
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id));

  /* ── Bulk change role ────────────────────────────────────────── */
  const handleBulkRole = async (role: UserRole) => {
    if (selectedIds.size === 0) return;
    setShowRolePick(false);
    try {
      await bulkUpdateRole([...selectedIds], role);
      setSelectedIds(new Set());
      await load();
    } catch {
      alert("Could not update role for the selected users.");
    }
  };

  /* ── Export CSV ──────────────────────────────────────────────── */
  const handleExport = async () => {
    try {
      const blob = await exportUsers({
        search: debounced || undefined,
        role:   roleFilter || undefined,
        status: statusFilter || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not export users. Please try again.");
    }
  };

  /* ── Save from edit modal ────────────────────────────────────── */
  const handleSaveEdit = async (patch: Partial<AdminUser>) => {
    if (!editing) return;
    try {
      const saved = await updateUser(editing.id, {
        name:  patch.name  ?? editing.name,
        email: patch.email ?? editing.email,
        role:  (patch.role ?? editing.role) as UserRole,
      });
      setUsers((prev) => prev.map((u) => (u.id === editing.id ? { ...u, ...saved } : u)));
      setEditing(null);
    } catch {
      alert("Could not save user changes.");
    }
  };

  /* ── Create modal handler ────────────────────────────────────── */
  const handleCreate = async (payload: { name: string; email: string; role: UserRole }) => {
    try {
      const created = await createUser(payload);
      setUsers((prev) => [created, ...prev]);
      setTotal((t) => t + 1);
      setShowCreate(false);
    } catch {
      alert("Could not create user. Check the details and try again.");
    }
  };

  /* ── Stat cards ──────────────────────────────────────────────── */
  const statCards = [
    {
      label: "Total Users",
      value: statsLoad ? "…" : (stats?.totalUsers.value ?? total).toLocaleString(),
      trend: stats?.totalUsers.trend ?? "+0%",
      trendBg: "#f0fdf4", trendColor: "#16a34a",
      icon: imgUsersTotal, iconBg: "#eff6ff",
    },
    {
      label: "Active Accounts",
      value: statsLoad ? "…" : (stats?.activeAccounts.value ?? 0).toLocaleString(),
      trend: stats?.activeAccounts.trend ?? "+0%",
      trendBg: "#f0fdf4", trendColor: "#16a34a",
      icon: imgUsersActive, iconBg: "#f0fdf4",
    },
  ];

  /* ── Render ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#f9fafb]" style={{ fontFamily: "'Inter', sans-serif" }}>
      <AdminBackButton />
      <main className="max-w-[1440px] mx-auto px-4 py-6 sm:px-8 sm:py-8 flex flex-col gap-6 sm:gap-8">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] leading-tight">User Management</h1>
            <p className="text-xs sm:text-sm text-[#6b7280]">
              Manage platform access, roles, and visa application statuses.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg bg-white cursor-pointer"
              style={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 1px rgba(0,0,0,0.05)" }}
            >
              <img src={imgExport} alt="" style={{ width: 14, height: 14 }} />
              <span className="text-sm font-medium text-[#374151]">Export</span>
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-white cursor-pointer"
              style={{ backgroundImage: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)", border: "none" }}
            >
              <img src={imgPlus} alt="" style={{ width: 14, height: 14 }} />
              <span className="text-sm font-medium whitespace-nowrap">Create User</span>
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          {statCards.map((card) => (
            <div key={card.label}
              className="relative bg-white rounded-xl flex items-start gap-4 p-5"
              style={{ border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>
              <div className="size-12 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: card.iconBg }}>
                <img src={card.icon} alt="" style={{ width: 25, height: 20 }} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-sm font-medium text-[#6b7280]">{card.label}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-2xl font-bold text-[#111827]">{card.value}</span>
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded"
                    style={{ background: card.trendBg }}>
                    <img src={imgArrowUp} alt="" style={{ width: 8, height: 9 }} />
                    <span className="text-xs font-medium" style={{ color: card.trendColor }}>{card.trend}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Table container */}
        <div className="bg-white rounded-xl overflow-visible"
          style={{ border: "1px solid #e5e7eb", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" }}>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderBottom: "1px solid #e5e7eb" }}>

            {/* Search */}
            <div className="relative w-full sm:w-[320px]">
              <div className="flex items-center rounded-lg pl-10 pr-3 py-2.5 bg-white"
                style={{ border: "1px solid #e5e7eb" }}>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, or company…"
                  className="w-full outline-none text-sm text-[#111827] placeholder-[#9ca3af] bg-transparent" />
              </div>
              <img src={imgSearchSmall} alt=""
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width: 16, height: 16 }} />
            </div>

            <div className="flex flex-wrap items-center gap-2 relative">

              {/* Change role (bulk) */}
              <div ref={rolePickRef} className="relative">
                <button
                  onClick={() => selectedIds.size > 0 && setShowRolePick((v) => !v)}
                  disabled={selectedIds.size === 0}
                  title={selectedIds.size === 0 ? "Select users first" : `Change role for ${selectedIds.size} user(s)`}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white"
                  style={{
                    border: "1px solid #e5e7eb",
                    cursor: selectedIds.size === 0 ? "not-allowed" : "pointer",
                    opacity: selectedIds.size === 0 ? 0.55 : 1,
                  }}
                >
                  <span className="text-sm font-medium text-[#374151] whitespace-nowrap">
                    Change role{selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}
                  </span>
                  <img src={imgChevronDown} alt="" style={{ width: 10, height: 6 }} />
                </button>
                {showRolePick && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[180px] rounded-lg bg-white overflow-hidden"
                    style={{ border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                    {ROLES.map((r) => (
                      <button key={r} onClick={() => handleBulkRole(r)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[#f9fafb] text-sm text-[#111827] cursor-pointer">
                        <RoleBadge role={r} />
                        <span>Set to {ROLE_LABEL[r]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter popover */}
              <div ref={filterRef} className="relative">
                <button
                  onClick={() => setShowFilter((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white cursor-pointer"
                  style={{ border: "1px solid #e5e7eb" }}>
                  <img src={imgFilter} alt="" style={{ width: 14, height: 13 }} />
                  <span className="text-sm font-medium text-[#374151]">
                    Filter{(roleFilter || statusFilter) ? " · on" : ""}
                  </span>
                </button>
                {showFilter && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[260px] rounded-lg bg-white p-3 space-y-3"
                    style={{ border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                    <div>
                      <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1.5">Role</p>
                      <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
                        className="w-full px-2 py-1.5 text-sm rounded border border-[#e5e7eb] bg-white">
                        <option value="">All roles</option>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wide mb-1.5">Status</p>
                      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as UserStatus | "")}
                        className="w-full px-2 py-1.5 text-sm rounded border border-[#e5e7eb] bg-white">
                        <option value="">All statuses</option>
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => { setRoleFilter(""); setStatusFilter(""); }}
                        className="text-xs font-medium text-[#6b7280] hover:text-[#111827] cursor-pointer">
                        Clear
                      </button>
                      <button onClick={() => setShowFilter(false)}
                        className="text-xs font-semibold text-white px-3 py-1.5 rounded-md cursor-pointer"
                        style={{ backgroundImage: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)" }}>
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr style={{ background: "rgba(249,250,251,0.8)", borderBottom: "1px solid #e5e7eb" }}>
                  <th className="w-[50px] px-4 py-3.5 text-left">
                    <div onClick={toggleAll}
                      className="size-[18px] rounded flex items-center justify-center cursor-pointer"
                      style={{ border: allSelected ? "2px solid #2563eb" : "1px solid #d1d5db", background: allSelected ? "#2563eb" : "white" }}>
                      {allSelected && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">User</th>
                  <th className="w-[140px] px-4 py-3.5 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Role</th>
                  <th className="w-[140px] px-4 py-3.5 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Status</th>
                  <th className="w-[200px] px-4 py-3.5 text-left text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Last Login</th>
                  <th className="w-[80px] px-4 py-3.5 text-right text-xs font-semibold text-[#6b7280] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="size-8 rounded-full border-[3px] border-[#e5e7eb] border-t-[#2563eb] animate-spin" />
                      <span className="text-sm text-[#6b7280]">Loading users…</span>
                    </div>
                  </td></tr>
                ) : error ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">⚠️</span>
                      <span className="text-sm font-medium text-[#b91c1c]">{error}</span>
                      <button onClick={load} className="mt-2 px-4 py-2 rounded-lg text-sm font-medium text-white cursor-pointer"
                        style={{ background: "linear-gradient(135deg,#2563eb 0%,#7c3aed 100%)" }}>
                        Retry
                      </button>
                    </div>
                  </td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-14 text-center text-sm text-[#6b7280]">
                    No users match your filters.
                  </td></tr>
                ) : (
                  users.map((u, idx) => {
                    const isOpen = openRowMenu === u.id;
                    return (
                      <tr key={u.id} className="bg-white hover:bg-[#fafafa] transition-colors"
                        style={{ borderTop: "1px solid #f3f4f6" }}>
                        <td className="px-4 py-[18px]">
                          <div onClick={() => toggleRow(u.id)}
                            className="size-[18px] rounded flex items-center justify-center cursor-pointer"
                            style={{ border: selectedIds.has(u.id) ? "2px solid #2563eb" : "1px solid #d1d5db", background: selectedIds.has(u.id) ? "#2563eb" : "white" }}>
                            {selectedIds.has(u.id) && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="size-[38px] rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                              style={{ background: getAvatarBg(idx), boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}>
                              {getInitials(u.name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-[#111827]">{u.name}</span>
                              <span className="text-xs text-[#6b7280]">{u.email}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>
                        <td className="px-4 py-3.5"><StatusBadge status={u.status} /></td>
                        <td className="px-4 py-3.5">
                          <span className="text-[13px] text-[#4b5563] whitespace-nowrap font-mono">{formatDate(u.lastLogin)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-right relative">
                          <button
                            onClick={() => setOpenRowMenu(isOpen ? null : u.id)}
                            className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 cursor-pointer">
                            <img src={imgDotsVertical} alt="" style={{ width: 4, height: 14 }} />
                          </button>
                          {isOpen && (
                            <div ref={rowMenuRef}
                              className="absolute right-4 top-[42px] z-30 w-[180px] rounded-lg bg-white overflow-hidden"
                              style={{ border: "1px solid #e5e7eb", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                              <button
                                onClick={() => { setOpenRowMenu(null); setEditing(u); }}
                                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[#f9fafb] text-sm text-[#111827] cursor-pointer">
                                <span>👁</span> View / Edit user
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderTop: "1px solid #e5e7eb" }}>
            <span className="text-xs sm:text-sm text-[#6b7280]">
              {loading
                ? "Loading…"
                : `Showing ${users.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} to ${Math.min(page * PAGE_SIZE, total)} of ${total.toLocaleString()} results`}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                style={{ border: "1px solid #e5e7eb", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.45 : 1, background: "white" }}>
                <img src={imgChevronLeft} alt="" style={{ width: 6, height: 10 }} />
                <span className="text-sm text-[#4b5563]">Prev</span>
              </button>
              {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  className="size-8 flex items-center justify-center rounded text-sm font-medium cursor-pointer"
                  style={{ background: page === p ? "#eff6ff" : "transparent", color: page === p ? "#2563eb" : "#4b5563", border: "none" }}>
                  {p}
                </button>
              ))}
              {totalPages > 3 && (
                <>
                  <span className="size-8 flex items-center justify-center text-sm text-[#9ca3af]">…</span>
                  <button onClick={() => setPage(totalPages)}
                    className="size-8 flex items-center justify-center rounded text-sm font-medium cursor-pointer"
                    style={{ background: page === totalPages ? "#eff6ff" : "transparent", color: page === totalPages ? "#2563eb" : "#4b5563", border: "none" }}>
                    {totalPages}
                  </button>
                </>
              )}
              <button disabled={page === totalPages || totalPages === 0} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded"
                style={{ border: "1px solid #e5e7eb", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.45 : 1, background: "white" }}>
                <span className="text-sm text-[#4b5563]">Next</span>
                <img src={imgChevronRight} alt="" style={{ width: 6, height: 10 }} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Modals ────────────────────────────────────────────────── */}
      {showCreate  && <CreateUserModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {editing     && <EditUserModal user={editing} onClose={() => setEditing(null)} onSave={handleSaveEdit} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * CREATE USER MODAL
 * ══════════════════════════════════════════════════════════════════ */
function CreateUserModal({
  onClose, onCreate,
}: { onClose: () => void; onCreate: (p: { name: string; email: string; role: UserRole }) => void | Promise<void> }) {
  const [name,  setName]  = useState("");
  const [email, setEmail] = useState("");
  const [role,  setRole]  = useState<UserRole>("employee");
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && !saving;

  const handleSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try { await onCreate({ name: name.trim(), email: email.trim(), role }); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} title="Create User" subtitle="Add a new account to the platform.">
      <div className="flex flex-col gap-4">
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} placeholder="Jane Doe" />
        </Field>
        <Field label="Email address">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputStyle} placeholder="jane@company.com" />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
      </div>
      <ModalFooter
        cancelLabel="Cancel" onCancel={onClose}
        submitLabel={saving ? "Creating…" : "Create User"} onSubmit={handleSubmit} disabled={!canSave}
      />
    </ModalShell>
  );
}

/* ══════════════════════════════════════════════════════════════════
 * EDIT USER MODAL
 * ══════════════════════════════════════════════════════════════════ */
function EditUserModal({
  user, onClose, onSave,
}: { user: AdminUser; onClose: () => void; onSave: (patch: Partial<AdminUser>) => void | Promise<void> }) {
  const [name,  setName]  = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role,  setRole]  = useState<UserRole>(normaliseRole(user.role));
  const [saving, setSaving] = useState(false);

  const canSave = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email) && !saving;
  const dirty   = name !== user.name || email !== user.email || role !== normaliseRole(user.role);

  const handleSubmit = async () => {
    if (!canSave || !dirty) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), email: email.trim(), role }); }
    finally { setSaving(false); }
  };

  return (
    <ModalShell onClose={onClose} title="View / Edit user" subtitle={`Editing ${user.name}`}>
      <div className="flex flex-col gap-4">
        <Field label="Full name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputStyle} />
        </Field>
        <Field label="Email address">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className={inputStyle} />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
        </Field>
        <div className="flex flex-col gap-1 pt-1 text-xs text-[#6b7280]">
          <div>Status: <span className="font-medium text-[#111827]">{user.status}</span></div>
          <div>Last login: <span className="font-mono text-[#111827]">{formatDate(user.lastLogin)}</span></div>
        </div>
      </div>
      <ModalFooter
        cancelLabel="Close" onCancel={onClose}
        submitLabel={saving ? "Saving…" : "Save changes"} onSubmit={handleSubmit} disabled={!canSave || !dirty}
      />
    </ModalShell>
  );
}

/* ── Reusable modal bits ─────────────────────────────────────── */
const inputStyle =
  "w-full px-3 py-2.5 rounded-lg border border-[#d1d5db] text-sm text-[#111827] outline-none bg-white focus:border-[#2563eb] focus:ring-2 focus:ring-indigo-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[#374151] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalShell({
  title, subtitle, onClose, children,
}: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div onClick={onClose}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5"
      style={{ backdropFilter: "blur(2px)" }}>
      <div onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-[520px] max-w-full max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 12px 48px rgba(0,0,0,0.18)" }}>
        <div className="px-7 pt-6 pb-4" style={{ borderBottom: "1px solid #f3f4f6" }}>
          <h2 className="text-lg font-bold text-[#111827]">{title}</h2>
          {subtitle && <p className="mt-1 text-[13px] text-[#6b7280]">{subtitle}</p>}
        </div>
        <div className="px-7 py-5">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({
  cancelLabel, onCancel, submitLabel, onSubmit, disabled,
}: {
  cancelLabel: string; onCancel: () => void;
  submitLabel: string; onSubmit: () => void; disabled?: boolean;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2.5 pt-4"
      style={{ borderTop: "1px solid #f3f4f6" }}>
      <button
        onClick={onCancel}
        className="px-5 py-2 rounded-lg text-sm font-medium text-[#374151] bg-white cursor-pointer"
        style={{ border: "1px solid #d1d5db" }}
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSubmit}
        disabled={disabled}
        className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition"
        style={
          disabled
            ? {
                background: "#A5B4FC",
                border: "none",
                cursor: "not-allowed",
              }
            : {
                backgroundImage: "linear-gradient(135deg,#2563eb 0%,#9333ea 100%)",
                border: "none",
                cursor: "pointer",
              }
        }
      >
        {submitLabel}
      </button>
    </div>
  );
}