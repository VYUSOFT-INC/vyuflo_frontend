// src/components/shared/AttorneyDisplay.tsx
const AVATAR_COLORS = [
  "#4F46E5", "#0891B2", "#7C3AED", "#DB2777",
  "#059669", "#D97706", "#DC2626", "#2563EB",
];

export function getInitials(fullName: string): string {
  return (
    fullName.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
  );
}

/** Deterministic avatar color from any string seed (id or name) */
export function getAvatarColor(seed: string): string {
  const index = seed.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function AttorneyAvatar({
  photoUrl, name, seed, size = 40,
}: { photoUrl?: string | null; name: string; seed: string; size?: number }) {
  if (photoUrl) {
    return (
      <img src={photoUrl} alt={name} style={{ width: size, height: size }}
        className="rounded-full object-cover shrink-0 border border-[#e5e7eb]" />
    );
  }
  return (
    <div style={{ width: size, height: size, backgroundColor: getAvatarColor(seed) }}
      className="rounded-full flex items-center justify-center text-white font-semibold shrink-0">
      <span style={{ fontSize: size * 0.32 }}>{getInitials(name)}</span>
    </div>
  );
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M6 1l1.39 2.82L10.5 4.27l-2.25 2.19.53 3.09L6 8.02l-2.78 1.53.53-3.09L1.5 4.27l3.11-.45L6 1z"
        fill={filled ? "#FBBF24" : "#E5E7EB"} />
    </svg>
  );
}

export function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map(i => <StarIcon key={i} filled={i <= Math.round(rating)} />)}
    </div>
  );
}

export function TagChip({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`text-[10px] font-medium px-[7px] py-[2px] rounded-[4px] ${className || "bg-[#F3F4F6] text-[#374151]"}`}>
      {label}
    </span>
  );
}