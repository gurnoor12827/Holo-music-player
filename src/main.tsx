import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected rendering error.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Holo Music ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="holo-bg-gradient flex min-h-dvh flex-col items-center justify-center p-6 text-center text-white"
        >
          <div className="holo-dialog-surface max-w-md p-6">
            <h1 className="border-b-2 border-[#33B5E5] pb-2 text-lg font-semibold text-[#33B5E5]">
              Holo Music Stopped
            </h1>
            <p className="mt-3 text-sm text-white/80">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="holo-btn-primary mt-5 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
