import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  message: string
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'Terjadi kesalahan tampilan yang tidak terduga.',
    }
  }

  componentDidCatch(error: Error) {
    if (import.meta.env.DEV) {
      console.error('SafetyLog ErrorBoundary:', error)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--ground)] text-[var(--text)] flex items-center justify-center p-5">
          <div className="w-full max-w-md rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-[var(--safety-danger-foreground)]">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span className="text-[12px] font-mono uppercase tracking-wider">
                Gangguan Aplikasi
              </span>
            </div>
            <h1 className="text-[20px] font-semibold text-[var(--text)]">
              Terjadi kesalahan saat menampilkan halaman
            </h1>
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">
              Muat ulang halaman atau kembali ke beranda untuk melanjutkan pekerjaan Anda.
            </p>
            {this.state.message && (
              <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] px-3 py-2 font-mono text-[12px] text-[var(--faint)] break-words">
                {this.state.message}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex h-11 items-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
                Muat Ulang
              </button>
              <a
                href="/"
                className="inline-flex h-11 items-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-4 text-[14px] font-medium text-[var(--text)] hover:bg-[var(--raised)]"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
