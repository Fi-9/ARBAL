/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  viewName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Per-view error boundary — catches render errors within a specific view
 * and shows a recoverable UI without crashing the entire app.
 */
export default class ViewErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ARBAL ViewError: ${this.props.viewName || 'unknown'}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md w-full text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Gagal Memuat {this.props.viewName || 'Komponen'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Terjadi kesalahan saat memuat tampilan ini. Coba muat ulang atau hubungi administrator.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-4 rounded-lg transition"
            >
              <RefreshCw size={12} />
              Coba Lagi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
