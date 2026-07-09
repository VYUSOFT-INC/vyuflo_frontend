interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export default function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 animate-pulse ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 bg-gray-200 rounded w-28" />
        <div className="h-5 bg-gray-200 rounded-full w-20" />
      </div>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-3 bg-gray-200 rounded mb-2 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
        />
      ))}
    </div>
  );
}
