// src/components/layout/SettingsSidebar.tsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { Avatar } from "../ui/Avatar";
import { getUiSession, type UiSession } from "../../utils/uiSession";
import { getFileUrl } from "../../utils/fileUrl";
import { useMyProfile } from "../../hooks/employee/useProfile";
import {
  ChevronLeft, X, User, Settings,
  Shield, Activity, Download, HelpCircle,
  LogOut, Lock, Bell,
} from "lucide-react";

interface SidebarItem { id: string; label: string; icon: React.ReactNode; path: string }

const EMP_PERSONAL: SidebarItem[] = [
  { id:"profile",       label:"Profile",            icon:<User     size={16}/>, path:"/profile"                   },
  { id:"auth",          label:"Authentication",      icon:<Settings size={16}/>, path:"/profile/authentication"    },
  { id:"mfa",           label:"Multi-Factor Auth",   icon:<Lock     size={16}/>, path:"/profile/mfa"               },
  { id:"alerts",        label:"Security Alerts",     icon:<Shield   size={16}/>, path:"/profile/security-alerts"   },
  { id:"notifications", label:"Notification Sounds", icon:<Bell     size={16}/>, path:"/profile/notifications"     },
];
const EMP_SYSTEM: SidebarItem[] = [
  { id:"history",  label:"Login History",    icon:<Activity   size={16}/>, path:"/profile/login-history" },
  { id:"privacy",  label:"Privacy Settings", icon:<Download   size={16}/>, path:"/profile/privacy"       },
  { id:"devices",  label:"Devices",          icon:<HelpCircle size={16}/>, path:"/profile/devices"       },
];

const HR_PERSONAL: SidebarItem[] = [
  { id:"profile",       label:"Profile",            icon:<User     size={16}/>, path:"/employer/profile"                   },
  { id:"auth",          label:"Authentication",      icon:<Settings size={16}/>, path:"/employer/profile/authentication"    },
  { id:"mfa",           label:"Multi-Factor Auth",   icon:<Lock     size={16}/>, path:"/employer/profile/mfa"               },
  { id:"alerts",        label:"Security Alerts",     icon:<Shield   size={16}/>, path:"/employer/profile/security-alerts"   },
  { id:"notifications", label:"Notification Sounds", icon:<Bell     size={16}/>, path:"/employer/profile/notifications"     },
];
const HR_SYSTEM: SidebarItem[] = [
  { id:"history",  label:"Login History",    icon:<Activity   size={16}/>, path:"/employer/profile/login-history" },
  { id:"privacy",  label:"Privacy Settings", icon:<Download   size={16}/>, path:"/employer/profile/privacy"       },
  { id:"devices",  label:"Devices",          icon:<HelpCircle size={16}/>, path:"/employer/profile/devices"       },
];

interface Props { onClose?: () => void }

export function SettingsSidebar({ onClose }: Props = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearAuth: logout } = useAuthStore();
  const [session, setSession] = useState<UiSession | null>(null);
  const { data: profile } = useMyProfile();

  useEffect(() => {
    setSession(getUiSession());
    const h = () => setSession(getUiSession());
    window.addEventListener("ui-session-updated", h);
    return () => window.removeEventListener("ui-session-updated", h);
  }, []);

  const isHR      = session?.roles?.includes("hr") ?? false;
  const fullName  = session ? `${session.first_name} ${session.last_name}`.trim() : "User";
  const avatarUrl = getFileUrl(profile?.profile_picture_url ?? null);
  const backPath  = isHR ? "/employer/dashboard" : "/dashboard";

  const personalItems = isHR ? HR_PERSONAL : EMP_PERSONAL;
  const systemItems   = isHR ? HR_SYSTEM   : EMP_SYSTEM;

  const go       = (path: string) => { navigate(path); onClose?.(); };
  const isActive = (path: string) => location.pathname === path;

  const renderGroup = (label: string, items: SidebarItem[]) => (
    <div className="mb-[8px]">
      <p className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-[0.08em] px-[12px] mb-[4px]">
        {label}
      </p>
      {items.map(item => {
        const active = isActive(item.path);
        return (
          <button key={item.id} onClick={() => go(item.path)}
            className={[
              "w-full flex items-center gap-[10px] px-[12px] py-[10px] rounded-[8px]",
              "text-[14px] font-medium tracking-[-0.5px] transition-colors duration-150 mb-[2px]",
              active ? "" : "text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]",
            ].join(" ")}
            style={active ? { backgroundColor:"var(--theme-light)", color:"var(--theme-dark)" } : undefined}>
            <span style={active ? { color:"var(--theme-dark)" } : undefined}
              className={active ? "" : "text-[#94a3b8]"}>
              {item.icon}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <aside className="w-[280px] sm:w-[288px] shrink-0 bg-white border-r border-[#f1f5f9] flex flex-col h-screen overflow-y-auto">
      {/* Header */}
      <div className="px-[24px] pt-[24px] pb-[16px] shrink-0">
        <div className="flex items-center justify-between mb-[16px]">
          <button onClick={() => go(backPath)}
            className="flex items-center gap-[8px] text-[#64748b] text-[13px] font-medium hover:text-[#0f172a] transition-colors">
            <ChevronLeft size={14} /> Back to Dashboard
          </button>
          {onClose && (
            <button onClick={onClose}
              className="p-[6px] rounded-[8px] text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        <h2 className="text-[22px] sm:text-[24px] font-bold text-[#0f172a] tracking-[-0.5px]">Settings</h2>

        {/* User card */}
        <div className="flex items-center gap-[12px] mt-[16px] p-[12px] bg-[#f8fafc] rounded-[12px] border border-[#f1f5f9]">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-white shadow-sm"
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : (
              <Avatar name={fullName} size="sm" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#0f172a] tracking-[-0.5px] truncate">{fullName}</p>
            <p className="text-[11px] text-[#94a3b8] capitalize">{isHR ? "HR Manager" : "Employee"}</p>
          </div>
        </div>
      </div>

      <div className="h-px bg-[#f1f5f9] mx-[24px] shrink-0" />

      {/* Nav */}
      <nav className="flex-1 px-[12px] pt-[16px] pb-[8px] overflow-y-auto">
        {renderGroup("Personal Settings", personalItems)}
        {renderGroup("System", systemItems)}
      </nav>

      {/* Sign out */}
      <div className="border-t border-[#f1f5f9] px-[12px] py-[12px] shrink-0">
        <button onClick={() => { logout(); navigate("/login"); }}
          className="flex items-center gap-[8px] w-full px-[12px] py-[10px] rounded-[8px] text-[14px] font-medium text-[#64748b] hover:bg-red-50 hover:text-red-600 transition-colors duration-150">
          <LogOut size={14} className="shrink-0" /> Sign Out
        </button>
      </div>
    </aside>
  );
}