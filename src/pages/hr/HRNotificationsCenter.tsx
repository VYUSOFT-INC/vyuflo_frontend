// src/pages/hr/HRNotificationsCenter.tsx
// Real-time HR notifications — uses the exact same hooks/api as the employee
// screen (useNotifications, useNotificationStats, useNotificationPreferences).
// Only the category set, stat cards, and sidebar widgets differ.

import { useState, useMemo } from "react";
import {
  Bell, CheckCheck, FileCheck, Briefcase, Users, ShieldAlert,
  Filter, Settings, ChevronDown, Check,
  ClipboardList, TrendingUp, MoreVertical,
} from "lucide-react";
import { useNotifications, useNotificationStats, useNotificationPreferences } from "../../hooks/employee/useNotifications";
import type { Notification, NotificationCategory, TabFilter } from "../../types/employee/notification.types";
import { PageHeader, PageContent } from "../../components/layout/Pageheader";

// ── Category config — HR-relevant categories only ────────────────────────────
const CAT_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  approval:    { bg:"#eef2ff", color:"#4338ca", icon:<FileCheck size={18} /> },
  case_update: { bg:"#f0fdf4", color:"#15803d", icon:<Briefcase size={18} /> },
  employee:    { bg:"#eff6ff", color:"#1d4ed8", icon:<Users size={18} /> },
  compliance:  { bg:"#fef2f2", color:"#dc2626", icon:<ShieldAlert size={18} /> },
};

const TABS: { id: TabFilter; label: string }[] = [
  { id:"all",         label:"All"          },
  { id:"approval",    label:"Approvals"    },
  { id:"case_update", label:"Case Updates" },
  { id:"employee",    label:"Employees"    },
  { id:"compliance",  label:"Compliance"   },
];

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - +new Date(iso)) / 60000);
  if (diff < 1) return "Just now";
  if (diff < 60) return `${diff}m ago`;
  const hrs = Math.floor(diff / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return new Date(iso).toLocaleDateString(undefined, { month:"short", day:"numeric" });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ value, label, badge, badgeCls, iconBg, iconColor, icon, loading }: {
  value: number; label: string; badge: string; badgeCls: string;
  iconBg: string; iconColor: string; icon: React.ReactNode; loading?: boolean;
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[16px] sm:p-[20px] flex flex-col gap-[8px] flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <div className="w-[44px] h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
        <span className={`text-[10px] sm:text-[11px] font-semibold px-[8px] py-[3px] rounded-full ${badgeCls}`}>{badge}</span>
      </div>
      <p className="text-[26px] sm:text-[30px] font-bold text-[#111827] leading-none mt-[4px]">
        {loading ? <span className="text-[18px] text-[#9ca3af]">…</span> : value}
      </p>
      <p className="text-[11px] sm:text-[13px] text-[#6b7280] leading-tight">{label}</p>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange}
      className="relative w-[44px] h-[24px] rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: checked ? "var(--theme-primary)" : "#e5e7eb" }}>
      <div className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-sm transition-transform ${checked ? "translate-x-[22px]" : "translate-x-[2px]"}`} />
    </button>
  );
}

// ── Notification row ──────────────────────────────────────────────────────────
function NotifRow({ notif, onMarkRead, onDismiss }: {
  notif: Notification;
  onMarkRead: (id: string) => void;
  onDismiss:  (id: string) => void;
}) {
  const cat = CAT_CONFIG[notif.category] ?? { bg:"#f9fafb", color:"#6b7280", icon:<Bell size={18} /> };
  return (
    <div className={`border-b border-[#f3f4f6] last:border-0 ${!notif.is_read ? "bg-[#fafbff]" : "bg-white"}`}>
      <div className="px-[16px] sm:px-[24px] py-[16px] sm:py-[20px]">
        <div className="flex items-start gap-[12px] sm:gap-[14px]">
          <div className="w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-[10px] flex items-center justify-center flex-shrink-0 mt-[2px]"
            style={{ backgroundColor: cat.bg, color: cat.color }}>
            {cat.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-[6px] flex-wrap">
              <h3 className="text-[13px] sm:text-[14px] font-semibold text-[#111827] flex-1 min-w-0 leading-[20px]">
                {notif.title}
              </h3>
              {notif.priority === "urgent" && (
                <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fef2f2] text-[#dc2626] flex-shrink-0">URGENT</span>
              )}
              {notif.priority === "high" && (
                <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full bg-[#fff7ed] text-[#c2410c] flex-shrink-0">HIGH</span>
              )}
              {!notif.is_read && (
                <div className="w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[6px]"
                  style={{ backgroundColor: "var(--theme-primary)" }} />
              )}
            </div>
            <p className="text-[12px] sm:text-[13px] text-[#6b7280] mt-[4px] leading-[18px]">{notif.body}</p>
            <div className="flex items-center flex-wrap gap-[8px] mt-[8px]">
              {notif.actor_label && (
                <span className="text-[11px] font-medium" style={{ color: "var(--theme-primary)" }}>{notif.actor_label}</span>
              )}
              {notif.case_reference && (
                <span className="text-[11px] text-[#94a3b8] bg-[#f1f5f9] px-[8px] py-[2px] rounded-full">{notif.case_reference}</span>
              )}
              <span className="text-[11px] text-[#9ca3af]">{timeAgo(notif.created_at)}</span>
            </div>
          </div>

          <button onClick={() => onDismiss(notif.id)}
            className="text-[#d1d5db] hover:text-[#6b7280] transition flex-shrink-0 mt-[2px] p-[4px]">
            <MoreVertical size={14} />
          </button>
        </div>

        {(notif.cta_primary_label || notif.cta_secondary_label) && (
          <div className="flex items-center flex-wrap gap-[8px] mt-[12px] ml-[52px] sm:ml-[58px]">
            {notif.cta_primary_label && (
              <a href={notif.cta_primary_url ?? "#"} onClick={() => onMarkRead(notif.id)}
                className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] text-white hover:opacity-90 transition no-underline"
                style={{ background: "linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)" }}>
                {notif.cta_primary_label}
              </a>
            )}
            {notif.cta_secondary_label && (
              <button onClick={() => onMarkRead(notif.id)}
                className="text-[12px] sm:text-[13px] font-medium px-[14px] py-[6px] rounded-[8px] border border-[#e5e7eb] text-[#374151] hover:bg-[#f9fafb] transition">
                {notif.cta_secondary_label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HRNotificationsCenter() {
  const [activeTab, setActiveTab] = useState<TabFilter>("all");

  const {
    notifications, unreadCount, loading, error,
    markRead, markAllRead, dismiss, loadMore, hasMore,
  } = useNotifications({
    category: activeTab === "all" ? undefined : activeTab as NotificationCategory,
  });

  const { stats, loading: statsLoading } = useNotificationStats();
  const { prefs, saving, update: updatePrefs } = useNotificationPreferences();

  const pendingApprovals = useMemo(
    () => notifications.filter(n => n.category === "approval" && !n.is_read),
    [notifications]
  );
  const complianceAlerts = useMemo(
    () => notifications.filter(n => n.category === "compliance"),
    [notifications]
  );
  const employeeNotifs = notifications.filter(n => n.category === "employee");

  return (
    <div className="flex flex-col h-full" style={{ fontFamily: "Inter, sans-serif" }}>
      <PageHeader
        title="Notifications"
        subtitle="Company-wide alerts, approvals, and compliance updates"
        showSearch={false}
        actions={
          <button onClick={() => markAllRead()}
            className="flex items-center gap-[6px] text-[12px] sm:text-[13px] font-medium transition"
            style={{ color: "var(--theme-primary)" }}>
            <CheckCheck size={14} />
            <span className="hidden sm:inline">Mark All Read</span>
            <span className="sm:hidden">Mark All</span>
          </button>
        }
      />

      <PageContent>
        <div className="flex flex-col gap-[20px] sm:gap-[24px]">

          {/* Stats */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-[12px] sm:gap-[16px]">
            <StatCard loading={statsLoading} value={pendingApprovals.length} label="Pending Approvals"
              badge="Action"    badgeCls="bg-[#fef2f2] text-[#dc2626]" iconBg="#fef2f2" iconColor="#dc2626" icon={<FileCheck size={18} />} />
            <StatCard loading={statsLoading} value={stats?.unread_count ?? unreadCount} label="Unread Notifications"
              badge="New"       badgeCls="bg-[#eff6ff] text-[#2563eb]" iconBg="#eff6ff" iconColor="#2563eb" icon={<Bell size={18} />} />
            <StatCard loading={statsLoading} value={employeeNotifs.length} label="Employee Activity"
              badge="This Week" badgeCls="bg-[#f0fdf4] text-[#15803d]" iconBg="#f0fdf4" iconColor="#15803d" icon={<Users size={18} />} />
            <StatCard loading={statsLoading} value={complianceAlerts.length} label="Compliance Alerts"
              badge="Review"    badgeCls="bg-[#fff7ed] text-[#c2410c]" iconBg="#fff7ed" iconColor="#c2410c" icon={<ShieldAlert size={18} />} />
          </div>

          {/* Main grid */}
          <div className="flex flex-col xl:flex-row gap-[20px] sm:gap-[24px] items-start">

            {/* List */}
            <div className="flex-1 min-w-0 w-full">
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] overflow-hidden">
                <div className="px-[14px] sm:px-[16px] pt-[14px] pb-0 border-b border-[#e5e7eb]">
                  <div className="flex items-center justify-between mb-[10px]">
                    <h2 className="text-[14px] sm:text-[16px] font-bold text-[#111827]">
                      All Notifications
                      {unreadCount > 0 && (
                        <span className="ml-[8px] text-[11px] font-bold px-[7px] py-[2px] rounded-full text-white"
                          style={{ background: "var(--theme-primary)" }}>{unreadCount}</span>
                      )}
                    </h2>
                    <div className="flex items-center gap-[6px]">
                      <button className="flex items-center gap-[4px] text-[12px] font-medium text-[#374151] border border-[#e5e7eb] rounded-[8px] px-[10px] py-[6px] hover:bg-[#f9fafb] transition">
                        <Filter size={12} /><span className="hidden sm:inline">Filter</span>
                      </button>
                      <button className="flex items-center gap-[4px] text-[12px] font-medium text-[#374151] border border-[#e5e7eb] rounded-[8px] px-[10px] py-[6px] hover:bg-[#f9fafb] transition">
                        <Settings size={12} /><span className="hidden sm:inline">Settings</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-[2px] overflow-x-auto pb-[1px]">
                    {TABS.map(tab => (
                      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                        className={`text-[12px] sm:text-[13px] font-medium px-[12px] sm:px-[14px] py-[7px] sm:py-[8px]
                                    rounded-t-[6px] whitespace-nowrap transition border-b-2 ${
                          activeTab === tab.id
                            ? "border-[var(--theme-primary)] bg-[var(--theme-light)] text-[var(--theme-dark)]"
                            : "border-transparent text-[#6b7280] hover:text-[#374151]"
                        }`}>
                        {tab.label}
                        {tab.id === "all" && unreadCount > 0 && (
                          <span className="ml-[5px] text-[10px] text-white rounded-full px-[5px] py-[1px]"
                            style={{ background: "var(--theme-primary)" }}>{unreadCount}</span>
                        )}
                        {tab.id === "approval" && pendingApprovals.length > 0 && (
                          <span className="ml-[5px] text-[10px] bg-[#fef2f2] text-[#dc2626] rounded-full px-[5px] py-[1px] font-bold">{pendingApprovals.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {loading && notifications.length === 0 && (
                  <div className="flex items-center justify-center py-[48px]">
                    <svg className="w-7 h-7 animate-spin" style={{ color: "var(--theme-primary)" }} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  </div>
                )}

                {error && (
                  <p className="text-[13px] text-[#ef4444] text-center py-[32px]">Failed to load notifications</p>
                )}

                {!loading && !error && notifications.length === 0 && (
                  <div className="flex flex-col items-center py-[48px]">
                    <div className="w-[48px] h-[48px] bg-[#f1f5f9] rounded-full flex items-center justify-center mb-[12px] text-[#9ca3af]"><Bell size={20} /></div>
                    <p className="text-[14px] font-medium text-[#374151]">No notifications</p>
                    <p className="text-[12px] text-[#9ca3af] mt-[4px]">You're all caught up!</p>
                  </div>
                )}

                {notifications.map(n => (
                  <NotifRow key={n.id} notif={n} onMarkRead={markRead} onDismiss={dismiss} />
                ))}

                <div className="flex items-center justify-center py-[16px] border-t border-[#f3f4f6]">
                  {hasMore ? (
                    <button onClick={loadMore} disabled={loading}
                      className="flex items-center gap-[5px] text-[12px] font-medium transition disabled:opacity-50"
                      style={{ color: "var(--theme-primary)" }}>
                      {loading ? "Loading…" : "Load More"} <ChevronDown size={13} />
                    </button>
                  ) : (
                    <p className="text-[12px] text-[#9ca3af]">You've seen all notifications</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="hidden xl:flex flex-col gap-[16px] w-[300px] 2xl:w-[320px] flex-shrink-0">

              {/* Pending Approvals */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] rounded-[8px] flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "var(--theme-light)", color: "var(--theme-primary)" }}>
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#111827]">Pending Approvals</h3>
                    <p className="text-[11px] text-[#9ca3af]">{pendingApprovals.length} need your action</p>
                  </div>
                </div>
                {pendingApprovals.length === 0 ? (
                  <p className="text-[13px] text-[#9ca3af]">No pending approvals</p>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {pendingApprovals.slice(0, 3).map(n => (
                      <div key={n.id} className="bg-[#f8fafc] border border-[#f1f5f9] rounded-[10px] p-[12px] hover:bg-[#f0f5ff] transition cursor-pointer">
                        <p className="text-[12px] font-semibold text-[#111827] leading-[16px]">{n.title}</p>
                        {n.actor_label && <p className="text-[11px] text-[#64748b] mt-[2px]">{n.actor_label}</p>}
                        <div className="flex items-center justify-between mt-[8px]">
                          <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full bg-[#fef2f2] text-[#dc2626]">
                            {n.priority.toUpperCase()}
                          </span>
                          <button onClick={() => markRead(n.id)}
                            className="text-[11px] font-medium transition" style={{ color: "var(--theme-primary)" }}>
                            Review →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pendingApprovals.length > 3 && (
                  <button onClick={() => setActiveTab("approval")}
                    className="flex items-center gap-[4px] text-[12px] font-medium mt-[12px] transition"
                    style={{ color: "var(--theme-primary)" }}>
                    View all {pendingApprovals.length} <ChevronDown size={12} />
                  </button>
                )}
              </div>

              {/* Compliance Alerts */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] bg-[#fef2f2] text-[#dc2626] rounded-[8px] flex items-center justify-center flex-shrink-0">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#111827]">Compliance Alerts</h3>
                    <p className="text-[11px] text-[#9ca3af]">Items requiring attention</p>
                  </div>
                </div>
                {complianceAlerts.length === 0 ? (
                  <div className="flex items-center gap-[8px] bg-[#f0fdf4] rounded-[8px] p-[12px]">
                    <Check size={14} className="text-[#15803d]" />
                    <p className="text-[12px] text-[#15803d] font-medium">All compliance items are current</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[8px]">
                    {complianceAlerts.slice(0, 4).map(n => (
                      <div key={n.id} className="flex items-start gap-[8px] py-[10px] border-b border-[#f3f4f6] last:border-0">
                        <div className="w-[6px] h-[6px] rounded-full bg-[#ef4444] shrink-0 mt-[5px]" />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#111827] leading-[16px]">{n.title}</p>
                          <p className="text-[11px] text-[#6b7280] mt-[2px] leading-[15px] line-clamp-2">{n.body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification Preferences */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <h3 className="text-[14px] font-bold text-[#111827] mb-[14px] flex items-center gap-[8px]">
                  <Settings size={14} className="text-[#64748b]" /> Preferences
                </h3>
                <div className="flex flex-col gap-[14px]">
                  {[
                    { label: "Email Alerts",       sub: "Approval requests & compliance", key: "email_enabled" as const },
                    { label: "Push Notifications", sub: "Real-time browser alerts",       key: "push_enabled"  as const },
                    { label: "Compliance SMS",      sub: "Critical compliance only",       key: "notify_compliance_alerts" as const },
                  ].map(p => {
                    const checked = (prefs as any)?.[p.key] ?? true;
                    return (
                      <div key={p.key} className="flex items-center justify-between gap-[10px]">
                        <div className="min-w-0">
                          <p className="text-[12px] font-medium text-[#111827]">{p.label}</p>
                          <p className="text-[11px] text-[#9ca3af]">{p.sub}</p>
                        </div>
                        <Toggle checked={checked} onChange={() => updatePrefs({ [p.key]: !checked })} />
                      </div>
                    );
                  })}
                </div>
                <button className="w-full mt-[16px] border border-[#e5e7eb] rounded-[8px] py-[8px] text-[12px] font-medium text-[#374151] hover:bg-[#f9fafb] transition" disabled={saving}>
                  {saving ? "Saving…" : "Manage All Preferences"}
                </button>
              </div>

              {/* This Month summary — derived from real notification data */}
              <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-[20px]">
                <div className="flex items-center gap-[8px] mb-[14px]">
                  <div className="w-[36px] h-[36px] bg-[#f0fdf4] text-[#15803d] rounded-[8px] flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#111827]">This Week</h3>
                </div>
                {[
                  { label:"New employee activity", value: employeeNotifs.length },
                  { label:"Case updates",          value: notifications.filter(n => n.category === "case_update").length },
                  { label:"Pending approvals",     value: pendingApprovals.length },
                  { label:"Compliance alerts",     value: complianceAlerts.length },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-[8px] border-b border-[#f3f4f6] last:border-0">
                    <span className="text-[12px] text-[#6b7280]">{s.label}</span>
                    <span className="text-[13px] font-bold" style={{ color: "var(--theme-primary)" }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PageContent>
    </div>
  );
}