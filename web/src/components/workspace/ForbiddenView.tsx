import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface ForbiddenViewProps {
  currentRoleLabel: string
  attemptedPath: string
  allowedRolesLabel: string
  onBackToHome: () => void
}

export function ForbiddenView({
  currentRoleLabel,
  attemptedPath,
  allowedRolesLabel,
  onBackToHome,
}: ForbiddenViewProps) {
  return (
    <div className="mx-auto max-w-lg py-6">
      <Card className="border-safety-danger-border bg-graphite">
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="danger" className="font-mono">
              403 - Akses Ditolak
            </Badge>
            <ShieldAlert className="h-5 w-5 text-safety-danger stroke-[2px]" />
          </div>
          <CardTitle className="text-h2 font-bold text-off-white">
            Halaman Bukan Hak Peran Anda
          </CardTitle>
          <CardDescription>
            Anda masuk sebagai <span className="font-semibold text-off-white">{currentRoleLabel}</span>.
            Rute <code className="font-mono text-off-white">{attemptedPath}</code> hanya tersedia untuk{' '}
            <span className="font-semibold text-off-white">{allowedRolesLabel}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            role="alert"
            className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-caption text-safety-danger-foreground"
          >
            Sesuai matriks hak akses SafetyLog, menu dan rute halaman yang berada di luar kewenangan peran ditolak di tingkat rute dan API backend.
          </div>
          <Button type="button" variant="industrial" onClick={onBackToHome} className="w-full gap-2">
            <ArrowLeft className="h-4 w-4 stroke-[2px]" />
            Kembali ke Beranda Peran Saya
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
