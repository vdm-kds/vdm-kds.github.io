import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private lastPathname: string = typeof window !== 'undefined' ? window.location.pathname : '';

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught error in component]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  componentDidMount() {
    window.addEventListener('popstate', this.handleLocationChange);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.handleLocationChange);
  }

  private handleLocationChange = () => {
    if (this.state.hasError && window.location.pathname !== this.lastPathname) {
      this.lastPathname = window.location.pathname;
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  };

  componentDidUpdate() {
    if (typeof window !== 'undefined' && window.location.pathname !== this.lastPathname) {
      this.lastPathname = window.location.pathname;
      if (this.state.hasError) {
        this.setState({ hasError: false, error: null, errorInfo: null });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F8EF] flex items-center justify-center p-4 font-sans text-[#101410]">
          <div className="w-full max-w-md bg-white rounded-3xl border border-[#DAE7C7] p-8 shadow-xl text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-[#DAE7C7]/50 text-[#08482D] flex items-center justify-center mx-auto text-2xl shadow-xs">
              <AlertCircle className="w-8 h-8 text-[#08482D]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-[#08482D]">
                Ối, có chút trục trặc
              </h2>
              <p className="text-xs sm:text-sm text-[#5E5E61] leading-relaxed">
                Hệ thống đã ghi nhận sự cố và đang giữ an toàn cho phiên làm việc của bạn. Hãy bấm tải lại trang hoặc quay về trang chủ nhé.
              </p>
            </div>

            {/* Error detail for debugging in development */}
            {this.state.error && (
              <div className="text-left bg-[#F5F8EF] p-3 rounded-xl border border-[#DAE7C7]/60 text-[11px] font-mono text-red-700 max-h-28 overflow-y-auto">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                onClick={() => window.location.reload()}
                className="flex-1 text-xs font-bold gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tải lại trang
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => window.location.assign('/')}
                className="flex-1 text-xs font-bold gap-2"
              >
                <Home className="w-4 h-4" />
                Về trang chủ
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
