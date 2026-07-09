// src/components/layout/NotificationBell.tsx
//
// Header bell dropdown — shows the 5 most recent notifications inline.
// Clicking an item marks it read + navigates to its CTA url (or detail page).
// "View All Notifications" footer link routes to the full notifications page.
// Role-aware: HR → /employer/notifications, everyone else → /notifications.
//
// Uses the SAME hooks as the full notification pages (useNotifications),
// so the data, mark-read, and dismiss behaviour is identical everywhere.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, ChevronRight } from "lucide-react";
import { useNotifications } from "../../hooks/employee/useNotifications";
import type { Notification } from "../../types/employee/notification.types";
import { getUiSession } from "../../utils/uiSession";

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const CATEGORY_DOT: Record<string, string> = {
  case_update: "#22c55e",
  deadline:    "#f97316",
  news:        "#8b5cf6",
  security:    "#ef4444",
  billing:     "#10b981",
  approval:    "#4338ca",
  compliance:  "#dc2626",
  employee:    "#1d4ed8",
};

function NotifItem({ notif, onClick }: { notif: Notification; onClick: () => void }) {
  const dot = CATEGORY_DOT[notif.category] ?? "#94a3b8";
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left px-[16px] py-[12px] flex items-start gap-[10px] transition border-b border-[#f3f4f6] last:border-0 ${
        !notif.is_read ? "bg-[#fafbff] hover:bg-[#f0f5ff]" : "hover:bg-[#f9fafb]"
      }`}>
      <div className="w-[8px] h-[8px] rounded-full shrink-0 mt-[6px]" style={{ backgroundColor: notif.is_read ? "#e2e8f0" : dot }} />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] leading-[18px] ${!notif.is_read ? "font-semibold text-[#0f172a]" : "font-medium text-[#475569]"}`}>
          {notif.title}
        </p>
        <p className="text-[12px] text-[#94a3b8] mt-[2px] leading-[16px] line-clamp-1">{notif.body}</p>
        <p className="text-[11px] text-[#cbd5e1] mt-[4px]">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && <div className="w-[7px] h-[7px] rounded-full bg-indigo-600 shrink-0 mt-[6px]" />}
    </button>
  );
}

interface Props {
  className?: string;
}

export function NotificationBell({ className = "" }: Props) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const session = getUiSession();
  const isHR = session?.roles?.includes("hr") ?? false;
  const fullPagePath = isHR ? "/employer/notifications" : "/notifications";

  // Pull the 5 most recent notifications (all categories) — reuses the exact
  // same hook the full page uses, so behaviour and data are identical.
  const { notifications, unreadCount, markRead, markAllRead, loading } = useNotifications();
  const recent = notifications.slice(0, 5);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleItemClick = (notif: Notification) => {
    markRead(notif.id);
    setOpen(false);
    if (notif.cta_primary_url) navigate(notif.cta_primary_url);
    else navigate(fullPagePath);
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(fullPagePath);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Bell trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        className="bg-white border border-[#e2e8f0] drop-shadow-[0px_1px_1px_rgba(0,0,0,0.05)]
                   flex items-center justify-center relative rounded-[10px] sm:rounded-[12px]
                   size-[34px] sm:size-[38px] lg:size-[40px]
                   hover:bg-[#f8fafc] transition-colors shrink-0"
      >
        <Bell size={14} className="text-[#64748b]" />
        {unreadCount > 0 && (
          <span className="absolute -top-[4px] -right-[4px] min-w-[16px] h-[16px] px-[3px] rounded-full
                           bg-indigo-600 border-2 border-white flex items-center justify-center
                           text-white text-[9px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] w-[340px] sm:w-[380px] bg-white
                        border border-[#e5e7eb] rounded-[14px] shadow-[0_12px_32px_rgba(0,0,0,0.12)]
                        z-50 overflow-hidden flex flex-col max-h-[480px]">

          {/* Header */}
          <div className="flex items-center justify-between px-[16px] py-[12px] border-b border-[#f1f5f9] shrink-0">
            <div className="flex items-center gap-[8px]">
              <h3 className="text-[14px] font-bold text-[#0f172a]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-[6px] py-[1px] rounded-full bg-indigo-600 text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={() => markAllRead()}
                className="flex items-center gap-[4px] text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition">
                <Check size={11} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && recent.length === 0 ? (
              <div className="flex items-center justify-center py-[32px]">
                <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            ) : recent.length === 0 ? (
              <div className="flex flex-col items-center py-[32px] px-[16px]">
                <div className="w-[40px] h-[40px] bg-[#f1f5f9] rounded-full flex items-center justify-center mb-[8px] text-[#9ca3af]">
                  <Bell size={18} />
                </div>
                <p className="text-[13px] font-medium text-[#374151]">No notifications</p>
                <p className="text-[11px] text-[#9ca3af] mt-[2px]">You're all caught up!</p>
              </div>
            ) : (
              recent.map(n => (
                <NotifItem key={n.id} notif={n} onClick={() => handleItemClick(n)} />
              ))
            )}
          </div>

          {/* Footer */}
          <button onClick={handleViewAll}
            className="flex items-center justify-center gap-[4px] py-[12px] border-t border-[#f1f5f9]
                       text-[13px] font-medium text-indigo-600 hover:bg-[#f8fafc] transition shrink-0">
            View All Notifications <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}