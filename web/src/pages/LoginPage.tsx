import * as React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError } from '@/lib/api'
import { isRedirectAllowedForRole, roleHomePath, useAuth } from '@/lib/auth-helpers'
import { useTheme } from '@/lib/theme-helpers'
import { useLanguage } from '@/lib/i18n-helpers'
import { LanguageToggle } from '@/components/safety/LanguageToggle'
import { ThemeToggle } from '@/components/safety/ThemeToggle'
import { DitheringShader } from '@/components/ui/dithering-shader'
import { SignIn6, type SignIn6FormValues } from '@/components/ui/sign-in-6'

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth()
  const { theme } = useTheme()
  const { t } = useLanguage()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const loginSchema = React.useMemo(
    () =>
      z.object({
        email: z.string().email(t('login.emailInvalid')),
        password: z.string().min(1, t('login.passwordRequired')),
      }),
    [t],
  )

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
  } = useForm<SignIn6FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (values: SignIn6FormValues) => {
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
        setServerError(t('login.networkError'))
      }
    }
  }

  const shaderBack = theme === 'dark' ? '#0D1117' : '#F5F7FA'
  const shaderFront = theme === 'dark' ? '#F38020' : '#D95300'

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[var(--ground)] text-[var(--text)] flex flex-col">
      {/* Running WebGL Bayer 8x8 Dotted Wave Background */}
      <DitheringShader
        shape="wave"
        type="8x8"
        colorBack={shaderBack}
        colorFront={shaderFront}
        pxSize={3}
        speed={0.6}
        className="pointer-events-none fixed inset-0 z-0"
      />

      {/* Top Bar with Language & Theme Switchers */}
      <header className="relative z-10 flex h-16 items-center justify-end px-4 sm:px-8">
        <div className="flex items-center gap-2 rounded-[8px] bg-[var(--surface)]/90 p-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Centered Split SignIn6 Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 pb-10 pt-2 sm:px-6">
        <div className="w-full max-w-3xl">
          <SignIn6
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
            serverError={serverError}
            onSubmit={handleSubmit(onSubmit)}
          />
        </div>
      </main>
    </div>
  )
}
