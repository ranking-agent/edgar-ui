import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, ChevronDown } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
              {/* Error Header */}
              <div className="px-6 py-5 bg-gradient-to-r from-red-50 to-rose-50 border-b border-red-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/25">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">Something went wrong</h2>
                    <p className="text-red-600 text-sm">An unexpected error occurred</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Error Message */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-red-900 mb-1">Error Message</p>
                      <p className="text-sm text-red-700 font-mono break-all">
                        {this.state.error?.message || 'Unknown error'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stack Trace (Collapsible) */}
                {this.state.errorInfo && (
                  <details className="group">
                    <summary className="cursor-pointer flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                      View Technical Details
                    </summary>
                    <div className="mt-3 bg-slate-900 rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-slate-800 border-b border-slate-700">
                        <span className="text-xs text-slate-400 font-medium">Component Stack Trace</span>
                      </div>
                      <div className="p-4 overflow-x-auto max-h-48 custom-scrollbar">
                        <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={this.handleReset}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-200"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
                  >
                    Reload Page
                  </button>
                </div>

                {/* Help Text */}
                <p className="text-sm text-slate-500 text-center">
                  If this error persists, please contact support with the error details above.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}