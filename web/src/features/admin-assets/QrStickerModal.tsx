import * as React from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Check, Copy, Printer, RefreshCw } from 'lucide-react'
import { copyToClipboard } from '@/lib/clipboard'
import type { Machine } from '@/types/safetylog'

interface QrStickerModalProps {
  machine: Machine | null
  onClose: () => void
  onRegenerate: (machine: Machine) => Promise<void>
}

export function QrStickerModal({ machine, onClose, onRegenerate }: QrStickerModalProps) {
  const [confirmRegen, setConfirmRegen] = React.useState(false)
  const [copiedQrUrl, setCopiedQrUrl] = React.useState(false)

  React.useEffect(() => {
    if (!machine) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmRegen(false)
        onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [machine, onClose])

  if (!machine) return null

  const handleCopy = async () => {
    const fullUrl = `${window.location.origin}/qr/${machine.qr_token}`
    const ok = await copyToClipboard(fullUrl)
    if (ok) {
      setCopiedQrUrl(true)
      window.setTimeout(() => setCopiedQrUrl(false), 2000)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 print:static print:bg-white print:p-0"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        setConfirmRegen(false)
        onClose()
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="qr-sticker-card w-full max-w-sm rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-6 space-y-5 print:border-2 print:border-black print:bg-white print:text-black print:shadow-none"
      >
        <div className="text-center space-y-1">
          <div className="text-[12px] font-mono font-semibold text-[var(--accent)] print:text-black">
            SAFETYLOG · QR MESIN
          </div>
          <h2 className="text-[20px] font-bold text-[var(--text)] print:text-black">
            {machine.code}
          </h2>
          <p className="text-[14px] font-medium text-[var(--muted)] print:text-black">
            {machine.name}
          </p>
          {machine.area?.name && (
            <p className="text-[12px] text-[var(--faint)] print:text-black">
              Area: {machine.area.name}
            </p>
          )}
        </div>

        <div className="mx-auto flex w-fit items-center justify-center rounded-[8px] bg-white p-4 border border-black/10">
          <QRCodeSVG
            value={`${window.location.origin}/qr/${machine.qr_token}`}
            size={200}
            level="M"
          />
        </div>

        <div className="text-center space-y-2">
          <div className="text-[12px] text-[var(--faint)] print:text-black">
            Pindai QR ini untuk lapor masalah mesin ≤ 60 detik
          </div>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="print:hidden inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[12px] text-[var(--text)] hover:bg-[var(--raised)]"
          >
            {copiedQrUrl ? (
              <>
                <Check className="h-3.5 w-3.5 text-[var(--safety-safe-foreground)]" />
                <span>URL QR Tersalin</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-[var(--muted)]" />
                <span>Salin URL QR</span>
              </>
            )}
          </button>
        </div>

        {confirmRegen && (
          <div className="print:hidden rounded-[6px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3 space-y-2 text-[12px] text-[var(--safety-warning-foreground)]">
            <p>
              Mengacak ulang token akan membuat stiker QR lama tidak bisa dipindai lagi. Lanjutkan?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await onRegenerate(machine)
                  setConfirmRegen(false)
                }}
                className="h-9 flex-1 rounded-[6px] bg-[var(--safety-danger)] px-3 text-[12px] font-semibold text-white"
              >
                Ya, Acak Ulang
              </button>
              <button
                type="button"
                onClick={() => setConfirmRegen(false)}
                className="h-9 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[12px] text-[var(--text)]"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        <div className="print:hidden flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmRegen(true)}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
            title="Buat ulang token QR"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Acak Ulang</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
          >
            <Printer className="h-4 w-4" />
            <span>Cetak</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmRegen(false)
              onClose()
            }}
            className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[var(--control)] px-4 text-[14px] text-[var(--text)]"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
