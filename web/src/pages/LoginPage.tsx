import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '@/lib/api'
import { isRedirectAllowedForRole, roleHomePath, useAuth } from '@/lib/auth'
import { ThemeToggle } from '@/components/safety/ThemeToggle'

const loginSchema = z.object({
  email: z.string().email('Masukkan alamat email yang valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const DEMO_ACCOUNTS = [
  { label: 'Pelapor', email: 'pelapor@safetylog.test', roleNote: 'Lapor & PIC' },
  { label: 'Supervisor', email: 'supervisor@safetylog.test', roleNote: 'Triase & CAPA' },
  { label: 'K3 / Verifikator', email: 'k3@safetylog.test', roleNote: 'Verifikasi' },
  { label: 'Manajer / Admin', email: 'admin@safetylog.test', roleNote: 'Dashboard & Master' },
]

const WORKFLOW_STAGES = [
  {
    code: '01 · CAPTURE',
    title: 'Catat dari Lantai Produksi',
    desc: 'Pindai QR mesin di HP, isi 3 kolom wajib dan foto kondisi dalam ≤ 60 detik.',
  },
  {
    code: '02 · RESOLVE',
    title: 'Triase 5×5 & Tindakan CAPA',
    desc: 'Supervisor menilai keparahan × kemungkinan, menunjuk PIC, dan memantau tenggat SLA.',
  },
  {
    code: '03 · LEARN',
    title: 'Verifikasi Independen K3',
    desc: 'Verifikator ≠ PIC memeriksa bukti penyelesaian dan mencatat ringkasan pembelajaran.',
  },
  {
    code: '04 · PREVENT',
    title: 'Cegah Masalah Berulang',
    desc: 'Kasus Sedang/Tinggi wajib memiliki tindakan Preventif selesai; mesin berulang ditandai otomatis.',
  },
]

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const redirectTo = searchParams.get('redirect')

  React.useEffect(() => {
    if (isAuthenticated && user) {
      const target = isRedirectAllowedForRole(redirectTo, user.role)
        ? redirectTo!
        : roleHomePath(user.role)
      navigate(target, { replace: true })
    }
  }, [isAuthenticated, user, navigate, redirectTo])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      const loggedUser = await login(values.email, values.password)
      const target = isRedirectAllowedForRole(redirectTo, loggedUser.role)
        ? redirectTo!
        : roleHomePath(loggedUser.role)
      navigate(target, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(err.message)
      } else {
        setServerError('Tidak dapat terhubung ke server API SafetyLog.')
      }
    }
  }

  const fillDemo = (email: string) => {
    setServerError(null)
    setValue('email', email, { shouldValidate: true })
    setValue('password', 'password123', { shouldValidate: true })
  }

  return (
    <div className="min-h-screen bg-[var(--ground)] text-[var(--text)] flex flex-col">
      {/* Top Navbar with Brand and Icon-Only Day/Night Toggle */}
      <header className="flex h-14 sm:h-[60px] lg:h-16 items-center justify-between border-b border-[var(--rule)] bg-[var(--ground)] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="4" stroke="var(--accent)" strokeWidth="2" />
            <path
              d="M8 12.5L10.8 15.3L16.5 9.2"
              stroke="var(--text)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[15px] font-semibold tracking-tight text-[var(--text)]">
            SafetyLog
          </span>
          <span className="hidden sm:inline text-[12px] text-[var(--faint)]">
            · Closed-Loop K3 &amp; Keandalan Mesin
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Responsive All-Devices Content Grid */}
      <main className="flex-1 flex items-center px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-[1152px] grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
          {/* Login & Quick Demo Column (First on Mobile/Tablet, Right on Desktop) */}
          <div className="lg:col-span-5 lg:order-2 space-y-5">
            <div>
              <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
                Masuk ke SafetyLog
              </h1>
              <p className="mt-1 text-[14px] text-[var(--muted)]">
                Masuk sesuai peran operasional Anda di pabrik.
              </p>
            </div>

            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-5">
              {serverError && (
                <div
                  role="alert"
                  className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--safety-danger-foreground)]"
                >
                  {serverError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[14px] font-medium text-[var(--text)]">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@pabrik.test"
                    {...register('email')}
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[16px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  {errors.email && (
                    <p className="text-[12px] text-[var(--safety-danger-foreground)]">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[14px] font-medium text-[var(--text)]"
                  >
                    Kata Sandi
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    {...register('password')}
                    className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[16px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none"
                  />
                  {errors.password && (
                    <p className="text-[12px] text-[var(--safety-danger-foreground)]">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {isSubmitting ? 'Memproses...' : 'Masuk'}
                </button>
              </form>
            </div>

            {/* Demo Quick-Fill Panel */}
            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[var(--text)]">
                  Isi Cepat Akun Demo (v0.1)
                </span>
                <span className="font-mono text-[11px] text-[var(--faint)]">
                  Sandi: password123
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc.email)}
                    className="flex min-h-[44px] flex-col items-start justify-center rounded-[6px] border border-[var(--control)] bg-[var(--raised)] px-3 py-2 text-left hover:border-[var(--faint)]"
                  >
                    <span className="text-[13px] font-medium text-[var(--text)]">{acc.label}</span>
                    <span className="text-[11px] text-[var(--faint)]">{acc.roleNote}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Closed-Loop System Overview Column (Balances Desktop/Tablet Canvas) */}
          <div className="lg:col-span-7 lg:order-1 space-y-5">
            <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--rule)] pb-3">
                <span className="text-[14px] font-semibold text-[var(--text)]">
                  Alur Tertutup SafetyLog (Closed-Loop CAPA)
                </span>
                <span className="font-mono text-[12px] text-[var(--accent)] tabular-nums">
                  4 Peran · 10 Skenario UAT
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {WORKFLOW_STAGES.map((st) => (
                  <div
                    key={st.code}
                    className="rounded-[6px] border border-[var(--border)] bg-[var(--ground)] p-4 space-y-1.5"
                  >
                    <div className="font-mono text-[11px] text-[var(--accent)]">{st.code}</div>
                    <div className="text-[14px] font-semibold text-[var(--text)]">{st.title}</div>
                    <p className="text-[13px] leading-relaxed text-[var(--muted)]">{st.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Divided KPI Reference Strip */}
            <div className="grid grid-cols-3 rounded-[8px] border border-[var(--border)] bg-[var(--surface)] divide-x divide-[var(--border)]">
              <div className="p-4">
                <div className="text-[12px] text-[var(--faint)]">Target waktu lapor</div>
                <div className="mt-1 text-[20px] sm:text-[24px] font-semibold text-[var(--text)] tabular-nums">
                  ≤ 60 dtk
                </div>
              </div>
              <div className="p-4">
                <div className="text-[12px] text-[var(--faint)]">Matriks risiko K3</div>
                <div className="mt-1 text-[20px] sm:text-[24px] font-semibold text-[var(--text)] tabular-nums">
                  5 × 5
                </div>
              </div>
              <div className="p-4">
                <div className="text-[12px] text-[var(--faint)]">Ambang berulang</div>
                <div className="mt-1 text-[20px] sm:text-[24px] font-semibold text-[var(--text)] tabular-nums">
                  ≥ 3 / 90h
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
