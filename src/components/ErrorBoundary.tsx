/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

declare global {
  interface Window {
    process?: { env: { NODE_ENV: string } };
  }
}

const isDevelopment = () => {
  if (typeof window !== 'undefined' && window.process?.env?.NODE_ENV) {
    return window.process.env.NODE_ENV === 'development';
  }
  return import.meta.env?.DEV ?? false;
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(_error: Error): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center h-screen bg-bg-primary">
          <div className="max-w-md w-full mx-4 p-6 bg-bg-secondary border border-border rounded-lg">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h1 className="text-xl font-semibold text-text-primary mb-2">
                Something went wrong
              </h1>
              <p className="text-text-secondary mb-6">
                An unexpected error occurred. You can try resetting the view or reloading the application.
              </p>

              {isDevelopment() && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                    Error details
                  </summary>
                  <pre className="mt-2 p-3 bg-bg-hover rounded text-xs overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-3 justify-center">
                <Button variant="secondary" onClick={this.handleReset}>
                  Reset View
                </Button>
                <Button variant="primary" onClick={this.handleReload}>
                  Reload App
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
