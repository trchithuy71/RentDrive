'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ModalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ModalErrorBoundary caught rendering exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 text-center bg-red-50 border border-red-200 rounded-sm">
          <AlertCircle className="h-10 w-10 text-red-600 mb-4 animate-bounce" />
          <h4 className="text-xs font-black uppercase tracking-wider text-red-900 mb-2">
            MODAL RENDERING ERROR
          </h4>
          <p className="text-[10px] text-red-700 font-semibold max-w-xs leading-relaxed mb-4">
            An exception occurred while compiling the custom modal layout. The view has been aborted.
          </p>
          <pre className="text-[8px] font-mono bg-red-100/60 p-2.5 border border-red-200 rounded-sm text-red-800 text-left overflow-x-auto w-full max-h-24">
            {this.state.error?.message || 'Unknown render exception'}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-sm text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all"
          >
            Retry Render
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModalErrorBoundary;
