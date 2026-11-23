import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RotateCcw, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // SECURITY: never emit raw runtime errors or component stacks in production
    if (import.meta.env.DEV) {
      console.error('ReflüRehber ErrorBoundary:', error, info.componentStack);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-[#F4F8FC] flex items-center justify-center p-4 sm:p-6">
          <div className="max-w-md w-full bg-white border border-[#DCE7F3] rounded-2xl p-6 sm:p-7 space-y-4 text-center">
            <div className="w-11 h-11 rounded-full bg-[#EBF4FF] text-[#1D6FD6] flex items-center justify-center mx-auto">
              <ShieldAlert className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-lg font-semibold text-[#0F233A]">
              Veri erişiminde beklenmeyen bir durum oluştu
            </h1>
            <p className="text-sm text-[#4A627A] leading-relaxed">
              Güvenlik kuralları veya bağlantı nedeniyle işlem tamamlanamadı. Oturumunuzu yenileyip tekrar deneyebilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 min-h-11 px-5 py-2.5 rounded-xl bg-[#1D6FD6] text-white text-sm font-medium hover:bg-[#1659B3] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Sayfayı Yenile
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
