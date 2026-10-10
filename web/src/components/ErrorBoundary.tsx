import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="panel p-8 sm:p-12 my-8 max-w-2xl mx-auto border-2 border-[#A12D0A] bg-[var(--paper)] shadow-hard space-y-6">
          <div className="flex items-center gap-3 text-[#A12D0A]">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h2 className="text-xl font-bold font-mono">Component Encountered An Issue</h2>
          </div>
          <p className="text-sm text-[var(--ink-2)]">
            {this.props.fallbackTitle || 'A render error occurred while displaying this view.'}
          </p>
          {this.state.error && (
            <pre className="p-4 bg-[var(--tint)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="btn solid small flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reload Page
            </button>
            <a href="#/" className="btn small flex items-center gap-2">
              <Home className="w-3.5 h-3.5" /> Return Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
