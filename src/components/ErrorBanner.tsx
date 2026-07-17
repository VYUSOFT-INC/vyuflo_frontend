import { AlertCircle } from 'lucide-react';

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <AlertCircle size={18} className="text-red-500 shrink-0" />
        <p className="text-sm text-red-700 truncate">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 text-sm font-semibold text-red-700 hover:text-red-900 underline underline-offset-2 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
