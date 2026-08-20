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
import { Avatar } from './Avatar';

interface ProfileAvatarProps {
  src: string | null | undefined;
  name: string;
  sizeClass: string; // e.g. "w-10 h-10" or "w-8 h-8" — matches the Tailwind size classes used at each call site
  avatarSize: 'sm' | 'md' | 'lg'; // size prop for the <Avatar> fallback
  ringClass?: string; // e.g. "ring-2 ring-white shadow-sm"
}

export function ProfileAvatar({ src, name, sizeClass, avatarSize, ringClass = '' }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);

  // Reset failure state if the URL changes (e.g. after a re-upload produces
  // a new versioned URL) — otherwise a stale failure would suppress a
  // now-valid image.
  useEffect(() => {
    setFailed(false);
  }, [src]);

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

  return <Avatar name={name} size={avatarSize} />;
}