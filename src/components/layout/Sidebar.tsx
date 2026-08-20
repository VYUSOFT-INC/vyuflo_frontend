// src/components/layout/Sidebar.tsx
import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LogOut,
  X,
  ChevronLeft,
  Settings,
  Shield,
  Plug,
  Bell,
  Flag,
  Wrench,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { getUiSession, type UiSession } from '../../utils/uiSession';
import { getFileUrl } from '../../utils/fileUrl';
import { useMyProfile } from '../../hooks/employee/useProfile';
import imgLogoIcon from '../../assets/vyuflo_icon.svg';
import imgLogoName from '../../assets/vyuflo_logotype.svg';
import { getNavItems } from '../../config/navConfig';

// ─────────────────────────────────────────────────────────────────────────────
// CSS filter that recolors a flat SVG (#64748b) to the active accent.
// Only needed for `img`-kind nav icons. lucide icons follow `currentColor`.
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVE_FILTER =
  'brightness(0) saturate(100%) invert(20%) sepia(96%) saturate(1500%) hue-rotate(222deg) brightness(95%) contrast(98%)';

const NAV_BASE =
  'flex items-center rounded-[12px] text-[14px] font-medium tracking-[-0.5px] transition-colors duration-150';

const navPad = (collapsed: boolean) =>
  collapsed
    ? 'px-3 py-[10px] gap-3 lg:px-[10px] lg:py-[10px] lg:gap-0 lg:justify-center'
    : 'px-3 py-[10px] gap-3';

const NAV_ACTIVE = 'bg-[var(--theme-light)] text-[var(--theme-dark)]';
const NAV_IDLE   = 'text-[#64748b] hover:bg-gray-50 hover:text-gray-900';

const labelSpan = (collapsed: boolean) =>
  [
    'whitespace-nowrap overflow-hidden transition-all duration-300',
    collapsed ? 'lg:w-0 lg:opacity-0' : 'lg:w-auto lg:opacity-100',
  ].join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// Admin-only contextual sub-navigation
// System Settings has multiple hash-anchored sub-sections so it renders its
// own contextual sub-nav.  Visa Types + Subscription & Pricing used to have
// the same treatment (single-item "Admin Console" chip) but that hid the
// rest of the admin sidebar — now removed so they behave like every other
// admin page (full admin nav visible, current item highlighted).
// ─────────────────────────────────────────────────────────────────────────────
const settingsNavItems = [
  { hash: '#general',       Icon: Settings, label: 'General Settings'  },
  { hash: '#security',      Icon: Shield,   label: 'Security & Access' },
  { hash: '#integrations',  Icon: Plug,     label: 'Integrations'      },
  { hash: '#notifications', Icon: Bell,     label: 'Notifications'     },
  { hash: '#feature-flags', Icon: Flag,     label: 'Feature Flags'     },
  { hash: '#maintenance',   Icon: Wrench,   label: 'Maintenance'       },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function consoleLabel(roles?: string[]): string | null {
  const r = roles ?? [];
  if (r.includes('app_admin')) return 'Admin Console';
  if (r.includes('attorney'))  return 'Attorney Console';
  if (r.includes('hr'))        return 'HR Console';
  return null;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
export function Sidebar({ open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const { clearAuth: logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [session, setSession] = useState<UiSession | null>(null);
  useEffect(() => {
    setSession(getUiSession());
    const handler = () => setSession(getUiSession());
    window.addEventListener('ui-session-updated', handler);
    return () => window.removeEventListener('ui-session-updated', handler);
  }, []);

  const { data: profile } = useMyProfile();

  const navItems      = getNavItems(session?.roles);
  const fullName      = session ? `${session.first_name} ${session.last_name}`.trim() || 'User' : 'User';
  // getFileUrl() is correct here — the backend's GET /users/me/profile already
  // returns profile_picture_url as a ready-to-use versioned URL
  // (e.g. "/api/v1/users/me/avatar?v=1755712345"), not a raw storage key.
  const avatarUrl     = getFileUrl(profile?.profile_picture_url ?? null);
  const sectionHeader = consoleLabel(session?.roles);

  // Only System Settings still uses a contextual sub-nav (hash-anchored
  // sections). Visa Types + Subscription & Pricing now show the full admin
  // sidebar like every other admin page.
  const isSettingsPage = location.pathname.startsWith('/admin/settings');
  const activeHash     = location.hash || '#general';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderSectionHeader = (text: string) => (
    <div
      className={[
        'mt-4 mb-1 px-3 transition-all duration-300 overflow-hidden',
        collapsed ? 'lg:opacity-0 lg:h-0' : 'opacity-100',
      ].join(' ')}
    >
      <p className="text-[11px] font-semibold text-[#94a3b8] tracking-[0.6px] uppercase">{text}</p>
    </div>
  );

  const renderNavItem = ({ to, icon, label }: ReturnType<typeof getNavItems>[number]) => (
    <NavLink
      key={to}
      to={to}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [NAV_BASE, navPad(collapsed), isActive ? NAV_ACTIVE : NAV_IDLE].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          {icon.kind === 'img' ? (
            <img
              src={icon.src}
              alt=""
              aria-hidden="true"
              className="shrink-0"
              style={{ width: 20, height: 20, display: 'block', filter: isActive ? ACTIVE_FILTER : 'none' }}
            />
          ) : (
            <icon.Icon size={20} className="shrink-0" aria-hidden="true" />
          )}
          <span className={labelSpan(collapsed)}>{label}</span>
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 bg-white border-r border-[#f1f5f9] flex flex-col',
          'transform transition-all duration-300 ease-in-out',
          'lg:static lg:translate-x-0 lg:z-auto',
          collapsed ? 'lg:w-16' : 'lg:w-[260px]',
          'w-[260px]',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className={['border-b border-[#f1f5f9] shrink-0 flex items-center justify-between transition-all duration-300', collapsed ? 'lg:px-3 lg:py-6 py-6 px-6' : 'py-6 px-6'].join(' ')}>
          <div className={['flex items-center transition-all duration-300', collapsed ? 'lg:justify-center lg:gap-0' : 'gap-3'].join(' ')}>
            <div className="shrink-0">
              <img
                src={imgLogoIcon}
                alt="Vyuflo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <img
              src={imgLogoName}
              alt="Vyuflo"
              className={[
                'h-[20px] w-auto whitespace-nowrap transition-all duration-300 overflow-hidden',
                collapsed ? 'lg:w-0 lg:opacity-0' : 'lg:w-auto lg:opacity-100',
              ].join(' ')}
            />
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* ── Profile ──────────────────────────────────────────────────── */}
        <div className={['border-b border-[#f1f5f9] shrink-0 py-6 transition-all duration-300', collapsed ? 'lg:px-0 px-6' : 'px-6'].join(' ')}>
          <div
            className={[
              'flex items-center transition-all duration-300',
              collapsed ? 'lg:justify-center lg:gap-0' : 'gap-3',
            ].join(' ')}
          >
            <div className="relative shrink-0">
              {/* FIXED: was an inline <img>/<Avatar> ternary with an onError
                  handler that just hid the broken image (leaving an empty
                  gap). ProfileAvatar tracks the failure and falls back to
                  the initials badge properly, same as UserAvatar elsewhere. */}
              <ProfileAvatar
                src={avatarUrl}
                name={fullName}
                sizeClass="w-10 h-10"
                avatarSize="lg"
                ringClass="ring-2 ring-white shadow-sm"
              />
              <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>

            <div
              className={[
                'flex flex-col transition-all duration-300 overflow-hidden',
                collapsed ? 'lg:w-0 lg:opacity-0' : 'lg:w-auto lg:opacity-100',
              ].join(' ')}
            >
              <p className="text-[18px] font-semibold text-[#0f172a] tracking-[-0.5px] whitespace-nowrap leading-[18px]">
                {fullName}
              </p>
            </div>
          </div>
        </div>

        {/* ── Nav ──────────────────────────────────────────────────────── */}
        <nav className={['flex-1 py-6 flex flex-col gap-1 overflow-y-auto transition-all duration-300', collapsed ? 'lg:px-2 px-4' : 'px-4'].join(' ')}>
          {!isSettingsPage && (
            <>
              {sectionHeader && renderSectionHeader(sectionHeader)}
              {navItems.map(renderNavItem)}
            </>
          )}

          {isSettingsPage && (
            <>
              {renderSectionHeader('System Configuration')}
              {settingsNavItems.map(({ hash, Icon, label }) => {
                const active = activeHash === hash;
                return (
                  <NavLink
                    key={hash}
                    to={`/admin/settings${hash}`}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={[NAV_BASE, navPad(collapsed), active ? NAV_ACTIVE : NAV_IDLE].join(' ')}
                  >
                    <Icon size={20} className="shrink-0" aria-hidden="true" />
                    <span className={labelSpan(collapsed)}>{label}</span>
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* ── Sign out ─────────────────────────────────────────────────── */}
        <div className={['py-4 border-t border-[#f1f5f9] shrink-0 transition-all duration-300', collapsed ? 'lg:px-2 px-4' : 'px-4'].join(' ')}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={[
              'flex items-center gap-2 w-full rounded-[12px] text-[14px] font-medium text-[#64748b] tracking-[-0.5px]',
              'hover:bg-red-50 hover:text-red-600 transition-colors duration-150',
              navPad(collapsed),
            ].join(' ')}
          >
            <LogOut size={14} className="shrink-0" />
            <span className={labelSpan(collapsed)}>Sign out</span>
          </button>
        </div>

        {/* ── Desktop collapse toggle ───────────────────────────────────── */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={[
            'hidden lg:flex items-center justify-center',
            'absolute -right-3 top-[72px]',
            'w-6 h-6 bg-white border border-gray-200 rounded-full shadow-sm',
            'hover:bg-[var(--theme-light)] hover:border-[var(--theme-border)] transition-colors duration-150 z-10',
          ].join(' ')}
        >
          <ChevronLeft
            size={12}
            className={['text-gray-500 transition-transform duration-300', collapsed ? 'rotate-180' : 'rotate-0'].join(' ')}
          />
        </button>
      </aside>
    </>
  );
}