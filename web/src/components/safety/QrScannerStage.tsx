import * as React from 'react'
import jsQR from 'jsqr'
import { AlertCircle, Camera, RefreshCw, SwitchCamera, Upload } from 'lucide-react'

export function extractQrToken(rawValue: string): string | null {
  const trimmed = rawValue.trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed)
    const qrQuery = parsed.searchParams.get('qr')
    if (qrQuery && qrQuery.trim()) return qrQuery.trim()

    const match = parsed.pathname.match(/\/qr\/([^/?#]+)/i)
    if (match && match[1]) return decodeURIComponent(match[1])
  } catch {
    // Not a full URL; treat as path or raw token
  }

  const pathMatch = trimmed.match(/\/qr\/([^/?#]+)/i)
  if (pathMatch && pathMatch[1]) {
    return decodeURIComponent(pathMatch[1])
  }

  return trimmed
}

export function QrScannerStage({
  onDetected,
  isResolving,
  errorMessage,
}: {
  onDetected: (qrToken: string) => void
  isResolving?: boolean
  errorMessage?: string | null
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const lockedRef = React.useRef<boolean>(false)

  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment')
  const [cameraState, setCameraState] = React.useState<'starting' | 'active' | 'error'>('starting')
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [restartKey, setRestartKey] = React.useState(0)

  React.useEffect(() => {
    if (errorMessage) {
      lockedRef.current = false
      setRestartKey((k) => k + 1)
    }
  }, [errorMessage])

  const stopCamera = React.useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  React.useEffect(() => {
    let cancelled = false
    lockedRef.current = false
    setCameraState('starting')
    setCameraError(null)

    const start = async () => {
      stopCamera()

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) {
          setCameraState('error')
          setCameraError(
            'Browser atau perangkat ini tidak mendukung akses kamera langsung. Gunakan tombol Unggah Gambar QR.',
          )
        }
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setCameraState('active')

        let lastScanTime = 0
        const scanFrame = (now: number) => {
          if (cancelled || lockedRef.current) return
          if (now - lastScanTime >= 120) {
            lastScanTime = now
            const v = videoRef.current
            const canvas = canvasRef.current
            if (v && canvas && v.readyState >= v.HAVE_CURRENT_DATA && v.videoWidth > 0) {
              const w = Math.min(v.videoWidth, 800)
              const scale = w / v.videoWidth
              const h = Math.round(v.videoHeight * scale)
              canvas.width = w
              canvas.height = h
              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (ctx) {
                ctx.drawImage(v, 0, 0, w, h)
                const imgData = ctx.getImageData(0, 0, w, h)
                const code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' })
                if (code && code.data) {
                  const token = extractQrToken(code.data)
                  if (token) {
                    lockedRef.current = true
                    stopCamera()
                    onDetected(token)
                    return
                  }
                }
              }
            }
          }
          rafRef.current = requestAnimationFrame(scanFrame)
        }

        rafRef.current = requestAnimationFrame(scanFrame)
      } catch {
        if (!cancelled) {
          setCameraState('error')
          setCameraError(
            'Kamera tidak dapat diakses (izin ditolak atau tidak ada kamera). Gunakan tombol Unggah Gambar QR di bawah ini.',
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [facingMode, restartKey, onDetected, stopCamera])

  const handleUploadQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const bitmap = await createImageBitmap(file)
      const canvas = document.createElement('canvas')
      const maxDim = 1400
      const scale = Math.max(bitmap.width, bitmap.height) > maxDim
        ? maxDim / Math.max(bitmap.width, bitmap.height)
        : 1
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        bitmap.close()
        setUploadError('Gagal membaca gambar QR.')
        return
      }
      ctx.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()

      const imgData = ctx.getImageData(0, 0, w, h)
      const code = jsQR(imgData.data, w, h, { inversionAttempts: 'attemptBoth' })
      if (!code || !code.data) {
        setUploadError('Kode QR tidak terdeteksi pada gambar tersebut. Pastikan gambar tajam dan jelas.')
        return
      }
      const token = extractQrToken(code.data)
      if (!token) {
        setUploadError('Isi kode QR tidak valid.')
        return
      }
      stopCamera()
      onDetected(token)
    } catch {
      setUploadError('File gambar tidak dapat diproses. Gunakan format JPG, PNG, atau WebP.')
    }
  }

  return (
    <div className="mx-auto max-w-[600px] space-y-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Pindai QR Mesin
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Arahkan kamera ke stiker QR pada mesin untuk langsung membuka form laporan.
        </p>
      </div>

      {(errorMessage || uploadError) && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-[8px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] p-3.5 text-[13px] text-[var(--safety-danger-foreground)]"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMessage || uploadError}</span>
        </div>
      )}

      {/* Camera Viewport Surface */}
      <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${
              facingMode === 'user' ? '-scale-x-100' : ''
            } ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Clean Industrial Viewfinder Corner Frame */}
          {cameraState === 'active' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48 sm:h-56 sm:w-56">
                <span className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-[#F97316]" />
                <span className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-[#F97316]" />
                <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-[#F97316]" />
                <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-[#F97316]" />
              </div>
            </div>
          )}

          {/* Camera Status Overlay */}
          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
              <Camera className="h-6 w-6 text-[#b4b4b4]" />
              <span className="text-[14px] font-medium">Membuka kamera...</span>
            </div>
          )}

          {cameraState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <Camera className="h-7 w-7 text-[#949494]" />
              <p className="max-w-sm text-[13px] text-[#b4b4b4]">{cameraError}</p>
              <button
                type="button"
                onClick={() => setRestartKey((k) => k + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[#3a3a3a] bg-[#1a1a1a] px-3.5 text-[13px] font-medium text-white hover:bg-[#252525]"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Coba Buka Kamera Lagi</span>
              </button>
            </div>
          )}

          {isResolving && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/75 text-[14px] font-medium text-white">
              Mengenali mesin dari QR...
            </div>
          )}
        </div>

        {/* Camera Controls Bar: Flip Camera + Upload QR Image */}
        <div className="grid grid-cols-1 gap-2.5 border-t border-[var(--rule)] p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-4 text-[14px] font-medium text-[var(--text)] hover:bg-[var(--raised)]"
          >
            <SwitchCamera className="h-4 w-4 stroke-[1.75px]" />
            <span>
              {facingMode === 'environment' ? 'Balik ke Kamera Depan' : 'Balik ke Kamera Belakang'}
            </span>
          </button>

          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]">
            <Upload className="h-4 w-4 stroke-[2px]" />
            <span>Unggah Gambar QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleUploadQr}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
