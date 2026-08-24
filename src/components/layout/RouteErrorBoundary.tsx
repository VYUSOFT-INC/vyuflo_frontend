// src/components/layout/RouteErrorBoundary.tsx
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Surfaces in console instead of silently blanking the page.
    console.error('[RouteErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-[40px] text-center">
          <p className="text-[16px] font-semibold text-[#0f172a] mb-[6px]">
            {this.props.fallbackTitle ?? 'Something went wrong loading this page.'}
          </p>
          <p className="text-[13px] text-[#64748b] max-w-[420px]">
            {this.state.error.message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-[16px] h-[38px] px-[16px] rounded-[10px] bg-indigo-600 text-white text-[13px] font-medium hover:bg-indigo-700"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}