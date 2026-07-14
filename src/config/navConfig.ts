// src/config/navConfig.ts
//
// Single source of truth for sidebar navigation, keyed by user role.
// Sidebar.tsx reads the logged-in user's role (from the ui_session cookie)
// and renders the matching nav set.
//
// Icon styles:
//   • kind: 'lucide' → lucide-react component, inherits currentColor automatically
//                       (works with the dynamic theme system)

import type { LucideIcon } from 'lucide-react';
import {
  // ── Shared ────────────────────────────────────────────────────────────────
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Settings,
  Bell,
  CreditCard,
  HelpCircle,
  BarChart3,
  Shield,
  // ── Employee-only ─────────────────────────────────────────────────────────
  PieChart,
  FolderOpen,
  Mail,
  CalendarDays,
  // ── HR-only ───────────────────────────────────────────────────────────────
  Briefcase,
  Clock,
  CheckSquare,
  // ── Lawyer-only ───────────────────────────────────────────────────────────
  ClipboardList,
  FolderKanban,
  BookOpen,
  // ── Admin-only ────────────────────────────────────────────────────────────
  DollarSign,
  ScrollText,
  Package,
  // ── Shared: Visa Checklist ────────────────────────────────────────────────
  FileCheck2,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

/** The four roles that exist in VisaFlow (matches UiSession.roles values). */
export type AppRole = 'employee' | 'attorney' | 'hr' | 'app_admin';

/** An icon is either an imported SVG (string URL) or a lucide-react component. */
export type NavIcon =
  | { kind: 'img';    src: string }
  | { kind: 'lucide'; Icon: LucideIcon };

export interface NavItem {
  to:    string;
  label: string;
  icon:  NavIcon;
}

// ── EMPLOYEE NAV ──────────────────────────────────────────────────────────────
// All lucide-react icons so they inherit the dynamic theme color.

const employeeNav: NavItem[] = [
  { to: '/dashboard',         label: 'Application Dashboard', icon: { kind: 'lucide', Icon: PieChart      } },
  { to: '/applications/list', label: 'Applications',          icon: { kind: 'lucide', Icon: FolderOpen    } },
  { to: '/messages',          label: 'Messages',              icon: { kind: 'lucide', Icon: Mail          } },
  { to: '/documents',         label: 'Documents',             icon: { kind: 'lucide', Icon: FileText      } },
  { to: '/payments',          label: 'Payments & Billing',    icon: { kind: 'lucide', Icon: CreditCard    } },
  { to: '/consultations',     label: 'Book Consultation',     icon: { kind: 'lucide', Icon: CalendarDays  } },
  { to: '/profile',           label: 'Settings',              icon: { kind: 'lucide', Icon: Settings      } },
  { to: '/notifications',     label: 'Notifications',         icon: { kind: 'lucide', Icon: Bell         } },
  { to: '/visa-checklist',    label: 'Visa Checklist',        icon: { kind: 'lucide', Icon: FileCheck2   } },
];

// ── HR / EMPLOYER NAV ─────────────────────────────────────────────────────────

const hrNav: NavItem[] = [
  { to: '/employer/dashboard',     label: 'Dashboard',      icon: { kind: 'lucide', Icon: LayoutDashboard } },
  { to: '/employer/employees',     label: 'Employees',      icon: { kind: 'lucide', Icon: Users           } },
  { to: '/employer/cases',         label: 'Cases',          icon: { kind: 'lucide', Icon: Briefcase       } },
  { to: '/employer/approvals',     label: 'Approvals',      icon: { kind: 'lucide', Icon: CheckSquare     } },
  { to: '/employer/deadlines',     label: 'Deadlines',      icon: { kind: 'lucide', Icon: Clock           } },
  { to: '/employer/messages',      label: 'Messages',       icon: { kind: 'lucide', Icon: MessageSquare   } },
  { to: '/employer/profile',       label: 'Settings',       icon: { kind: 'lucide', Icon: Settings        } },
  { to: '/employer/notifications', label: 'Notifications',  icon: { kind: 'lucide', Icon: Bell            } },
  { to: '/visa-checklist',         label: 'Visa Checklist', icon: { kind: 'lucide', Icon: FileCheck2      } },
];

// ── ATTORNEY / LAWYER NAV ─────────────────────────────────────────────────────
// Routes are wired in App.tsx under the /lawyer/* prefix.

const attorneyNav: NavItem[] = [
  { to: '/lawyer/dashboard',     label: 'Dashboard',      icon: { kind: 'lucide', Icon: LayoutDashboard } },
  { to: '/lawyer/intake',        label: 'Client Intake',  icon: { kind: 'lucide', Icon: ClipboardList  } },
  { to: '/lawyer/cases',         label: 'Cases',          icon: { kind: 'lucide', Icon: Briefcase      } },
  { to: '/lawyer/documents',     label: 'Documents',      icon: { kind: 'lucide', Icon: FolderKanban   } },
  { to: '/lawyer/templates',     label: 'Templates',      icon: { kind: 'lucide', Icon: BookOpen       } },
  { to: '/lawyer/messages',      label: 'Messages',       icon: { kind: 'lucide', Icon: MessageSquare  } },
  { to: '/lawyer/calendar',      label: 'Calendar',       icon: { kind: 'lucide', Icon: CalendarDays   } },
  { to: '/lawyer/billing',       label: 'Billing',        icon: { kind: 'lucide', Icon: CreditCard     } },
  { to: '/lawyer/analytics',     label: 'Analytics',      icon: { kind: 'lucide', Icon: BarChart3      } },
  { to: '/lawyer/notifications', label: 'Notifications',  icon: { kind: 'lucide', Icon: Bell          } },
  { to: '/lawyer/settings',      label: 'Settings',       icon: { kind: 'lucide', Icon: Settings       } },
  { to: '/lawyer/help',          label: 'Help & Support', icon: { kind: 'lucide', Icon: HelpCircle     } },
  { to: '/visa-checklist',       label: 'Visa Checklist', icon: { kind: 'lucide', Icon: FileCheck2     } },
];

// ── APP ADMIN NAV ─────────────────────────────────────────────────────────────
// Routes are wired in App.tsx under the /admin/* prefix.
//
// Note: Sidebar.tsx hides this main nav and shows a hash-routed sub-nav when the
// user is on /admin/settings, /admin/visa-types, or /admin/subscription-pricing.
// So those three still work — they just render their own contextual sub-nav.

const appAdminNav: NavItem[] = [
  { to: '/admin/dashboard',              label: 'Dashboard',              icon: { kind: 'lucide', Icon: LayoutDashboard } },
  { to: '/admin/users',                  label: 'User Management',        icon: { kind: 'lucide', Icon: Users            } },
  { to: '/admin/roles-permissions',      label: 'Roles & Permissions',    icon: { kind: 'lucide', Icon: Shield           } },
  { to: '/admin/visa-types',             label: 'Visa Types',             icon: { kind: 'lucide', Icon: FileText         } },
  { to: '/admin/subscription-pricing',   label: 'Subscription & Pricing', icon: { kind: 'lucide', Icon: Package          } },
  { to: '/admin/revenue-dashboard',      label: 'Revenue',                icon: { kind: 'lucide', Icon: DollarSign       } },
  { to: '/admin/notification-templates', label: 'Notification Templates', icon: { kind: 'lucide', Icon: Bell             } },
  { to: '/admin/system-audit-logs',      label: 'Audit Logs',             icon: { kind: 'lucide', Icon: ScrollText       } },
  { to: '/admin/settings',               label: 'System Settings',        icon: { kind: 'lucide', Icon: Settings         } },
  { to: '/admin/help-support',           label: 'Help & Support',         icon: { kind: 'lucide', Icon: HelpCircle       } },
];

const navByRole: Record<AppRole, NavItem[]> = {
  employee:  employeeNav,
  hr:        hrNav,
  attorney:  attorneyNav,
  app_admin: appAdminNav,
};

// ── Resolvers ─────────────────────────────────────────────────────────────────

/**
 * Resolve the user's primary role from the session `roles` array.
 * Falls back to 'employee' if the role is missing or unrecognised.
 */
export function resolvePrimaryRole(roles?: string[] | null): AppRole {
  const r = roles?.[0];
  return r === 'hr' || r === 'attorney' || r === 'app_admin' || r === 'employee'
    ? r
    : 'employee';
}

/** Public helper used by Sidebar.tsx to get the nav items for the current user. */
export function getNavItems(roles?: string[] | null): NavItem[] {
  return navByRole[resolvePrimaryRole(roles)];
}