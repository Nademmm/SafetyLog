import * as React from 'react'
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import type { FieldErrors, UseFormRegister } from 'react-hook-form'
import { useLanguage } from '@/lib/i18n-helpers'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SafetyLogMark } from '@/components/ui/SafetyLogMark'

export interface SignIn6FormValues {
  email: string
  password: string
}

export interface SignIn6Props {
  register: UseFormRegister<SignIn6FormValues>
  errors: FieldErrors<SignIn6FormValues>
  isSubmitting: boolean
  serverError: string | null
  onSubmit: React.FormEventHandler<HTMLFormElement>
}

export function SignIn6({
  register,
  errors,
  isSubmitting,
  serverError,
  onSubmit,
}: SignIn6Props) {
  const { t } = useLanguage()
  const [showPassword, setShowPassword] = React.useState(false)

  return (
    <Card className="grid w-full overflow-hidden gap-0 p-0 md:grid-cols-2">
      {/* Left Brand & Statement Panel */}
      <div className="hidden flex-col justify-between bg-[#161B22] text-[#F0F6FC] md:flex p-8 lg:p-10">
        <div className="flex items-center gap-2.5">
          <SafetyLogMark size={30} />
          <span className="text-[16px] font-semibold tracking-tight text-white">SafetyLog</span>
        </div>

        <h2 className="mt-auto max-w-[15ch] text-[28px] leading-[1.15] font-semibold tracking-tight text-white">
          {t('login.headline')}
        </h2>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex flex-col justify-center gap-5 p-6 sm:p-8">
        <div className="flex items-center gap-2.5 md:hidden">
          <SafetyLogMark size={28} />
          <span className="text-[16px] font-semibold tracking-tight text-[var(--text)]">
            SafetyLog
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-semibold tracking-tight text-[var(--text)]">
            {t('login.title')}
          </h1>
          <p className="text-[14px] text-[var(--muted)]">{t('login.subtitle')}</p>
        </div>

        {serverError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-3 text-[13px] text-[var(--safety-danger-foreground)]"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ss-email">{t('login.emailLabel')}</Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
              <Input
                id="ss-email"
                type="email"
                placeholder={t('login.emailPlaceholder')}
                autoComplete="email"
                {...register('email')}
                className="pl-10"
              />
            </div>
            {errors.email && (
              <p className="text-[13px] text-[var(--safety-danger-foreground)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ss-password">{t('login.passwordLabel')}</Label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--faint)]" />
              <Input
                id="ss-password"
                type={showPassword ? 'text' : 'password'}
                placeholder={t('login.passwordPlaceholder')}
                autoComplete="current-password"
                {...register('password')}
                className="pl-10 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-[6px] text-[var(--faint)] hover:text-[var(--text)] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-[13px] text-[var(--safety-danger-foreground)]">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full gap-2 mt-1">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('login.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('login.submit')}</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="text-[13px] text-[var(--faint)] text-center">{t('login.footer')}</p>
      </div>
    </Card>
  )
}

export default SignIn6
