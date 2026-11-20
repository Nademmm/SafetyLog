import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { ApiError } from '@/lib/api'
import { isRedirectAllowedForRole, roleHomePath, useAuth } from '@/lib/auth-helpers'
import { ThemeToggle } from '@/components/safety/ThemeToggle'

const loginSchema = z.object({
  email: z.string().email('Masukkan alamat email yang valid.'),
  password: z.string().min(1, 'Kata sandi wajib diisi.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [showPassword, setShowPassword] = React.useState(false)

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
        setServerError('Tidak dapat terhubung ke server SafetyLog. Periksa koneksi Anda.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-[var(--ground)] text-[var(--text)] flex flex-col">
      {/* Minimal Enterprise Top Bar */}
      <header className="flex h-16 items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect
              x="2"
              y="2"
              width="20"
              height="20"
              rx="5"
              stroke="var(--accent)"
              strokeWidth="2"
            />
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
        </div>
        <ThemeToggle />
      </header>

      {/* Centered Professional Auth Container */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[400px] space-y-6">
          {/* Brand Heading */}
          <div className="text-center space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[12px] border border-[var(--border)] bg-[var(--surface)] shadow-sm">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="5"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                <path
                  d="M8 12.5L10.8 15.3L16.5 9.2"
                  stroke="var(--text)"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
              Masuk ke SafetyLog
            </h1>
            <p className="text-[14px] text-[var(--muted)]">
              Gunakan akun perusahaan Anda untuk melanjutkan.
            </p>
          </div>

          {/* Clean Elevated Login Card */}
          <div className="rounded-[12px] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-7 shadow-[0_8px_30px_rgba(0,0,0,0.12)] space-y-5">
            {serverError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[8px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-3 text-[13px] text-[var(--safety-danger-foreground)]"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{serverError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-[13px] font-medium text-[var(--text)]">
                  Alamat Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="nama@perusahaan.com"
                    {...register('email')}
                    className="h-11 w-full rounded-[8px] border border-[var(--control)] bg-[var(--ground)] pl-10 pr-3.5 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                </div>
                {errors.email && (
                  <p className="text-[12px] text-[var(--safety-danger-foreground)]">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium text-[var(--text)]"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Masukkan kata sandi"
                    {...register('password')}
                    className="h-11 w-full rounded-[8px] border border-[var(--control)] bg-[var(--ground)] pl-10 pr-11 text-[15px] text-[var(--text)] placeholder:text-[var(--faint)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--faint)] hover:text-[var(--text)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[12px] text-[var(--safety-danger-foreground)]">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Subtle Support & Copyright Footer */}
          <div className="text-center space-y-1 text-[12px] text-[var(--faint)]">
            <p>Kendala akses akun? Hubungi Administrator pabrik Anda.</p>
            <p className="opacity-80">SafetyLog · Platform K3 &amp; Keandalan Mesin</p>
          </div>
        </div>
      </main>
    </div>
  )
}
