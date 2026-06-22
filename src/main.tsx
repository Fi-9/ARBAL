import { StrictMode, Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,                     // Data is immediately considered stale, forcing refetch on mount/routing
      gcTime: 1000 * 60 * 30,          // 30 min garbage collection window
      refetchOnWindowFocus: true,       // Refetch when window gains focus to keep multi-tab state synchronized
      retry: 1,                         // One retry on network fail
    },
    mutations: {
      retry: 0,                         // Mutations should not auto-retry (idempotency risk)
    },
  },
});

// ---------------------------------------------------------------------------
// ErrorBoundary — prevents blank white page on component crashes
// ---------------------------------------------------------------------------

interface EBProps { children: ReactNode }
interface EBState { hasError: boolean; error: Error | null }

class AppErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ARBAL ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
            <div className="w-12 h-12 bg-red-100 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-4 text-xl font-bold">!</div>
            <h1 className="text-lg font-bold text-slate-800 mb-2">Terjadi Kesalahan Render</h1>
            <p className="text-sm text-slate-500 mb-4">
              Komponen gagal dimuat. Silakan muat ulang halaman atau hubungi administrator.
            </p>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-red-600 text-left mb-4 overflow-auto max-h-32">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 px-6 rounded-lg transition"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </QueryClientProvider>
  </StrictMode>,
);
