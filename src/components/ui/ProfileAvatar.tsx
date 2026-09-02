// src/components/ui/ProfileAvatar.tsx
//
// For rendering the CURRENT logged-in user's own avatar, where the URL is
// already resolved by the backend (e.g. useMyProfile().data.profile_picture_url,
// which GET /users/me/profile returns as a ready "/api/v1/users/me/avatar?v=..."
// string — see user_profile_service.py's _avatar_display_url()).
//  
// Distinct from UserAvatar (components/ui/UserAvatar.tsx), which builds the
// URL itself from a userId for rendering OTHER people's avatars.
//
// FIXED: Sidebar.tsx and SettingsSidebar.tsx previously handled a failed
// image load with onError={(e) => e.currentTarget.style.display = 'none'} —
// that just hides the broken image and leaves an empty gap where the avatar
// should be, instead of falling back to the initials badge. This component
// tracks the failure in state and swaps to <Avatar> properly, matching the
// fallback behavior already fixed elsewhere (UserAvatar).

import { useState, useEffect } from 'react';

interface ProfileAvatarProps {
  src: string | null | undefined;
  name: string;
  sizeClass: string; // e.g. "w-10 h-10" or "w-8 h-8" — matches the Tailwind size classes used at each call site
  avatarSize: 'sm' | 'md' | 'lg'; // size prop for the fallback initials circle
  ringClass?: string; // e.g. "ring-2 ring-white shadow-sm"
}

/* XL row 14/29 follow-up: consistency fix — every avatar for the
   CURRENT logged-in user (Sidebar, SettingsSidebar, Dashboard header,
   Profile Settings) must render the same colour. Previously the
   `<Avatar>` fallback used hashColor(name) (8-colour cycle keyed by
   the name string) while Profile Settings' inline avatar used the
   theme gradient — so the same user saw purple on the Profile page,
   teal in the sidebar, indigo on the dashboard, and yet another
   shade after login/logout when the session sometimes carried a
   different name string.

   Fix: ProfileAvatar always renders the theme gradient
   (var(--theme-primary) → var(--theme-gradient-end)) with initials.
   The old <Avatar name={} /> hashColor path is untouched — it still
   applies to team-member cards (attorneys/HR in messaging etc.)
   where the distinct-colour-per-person behaviour is actually useful.
   Only THIS wrapper (used by the "me" avatar) is locked to the
   theme colour. */
function initialsOf(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const a = parts[0]?.[0] ?? '';
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (a + b).toUpperCase();
}

// Font-size for the initials circle keyed off the same size buckets
// the fallback used to consume, so nothing at the call site changes.
const TEXT_SIZE: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function ProfileAvatar({ src, name, sizeClass, avatarSize, ringClass = '' }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizeClass} rounded-full object-cover ${ringClass}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      aria-label={`Avatar for ${name}`}
      className={`${sizeClass} ${TEXT_SIZE[avatarSize]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 select-none ${ringClass}`}
      style={{ background: 'linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-gradient-end) 100%)' }}
    >
      {initialsOf(name)}
    </div>
  );
}