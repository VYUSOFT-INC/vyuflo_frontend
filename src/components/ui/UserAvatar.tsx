// src/components/ui/UserAvatar.tsx
import { useState, useEffect } from 'react';
import { Avatar } from './Avatar';
import { getAvatarUrl } from '../../utils/fileUrl';

interface UserAvatarProps {
  userId: string | null | undefined;
  name: string;
  size?: number; // px — defaults to 40
  className?: string;
}

/**
 * Renders a user's avatar photo, falling back to initials automatically
 * when the person has no picture set (backend 404s) or the image fails
 * to load for any other reason. Centralizes the getAvatarUrl() + onError
 * pattern that was previously duplicated (inconsistently) across Sidebar,
 * HREmployees, HRCreateCase, HRCaseDetail, HREmployeeDetail, and
 * SecureMessaging — several of which had NO fallback at all, so a 404
 * showed a broken-image icon instead of initials.
 */
export function UserAvatar({ userId, name, size = 40, className = '' }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = failed ? null : getAvatarUrl(userId);

  // Reset the failure flag if we're now looking at a different person
  // (e.g. a drawer got reused for a different row) — otherwise a stale
  // 404 from the PREVIOUS user would incorrectly suppress a real photo.
  useEffect(() => {
    setFailed(false);
  }, [userId]);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-[#e5e7eb] ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return <Avatar name={name} size={size >= 48 ? 'lg' : 'md'} />;
}