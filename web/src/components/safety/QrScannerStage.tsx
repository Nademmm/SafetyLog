import * as React from 'react'
import jsQR from 'jsqr'
import { AlertCircle, Camera, RefreshCw, SwitchCamera, Upload } from 'lucide-react'
import { WaveformLoader } from '@/components/ui/waveform-loader'
import qrSuccessSoundUrl from '../../../require/mixkit-confirmation-tone-2867.wav'

interface QrScannerStageProps {
  onDetected: (qrToken: string) => void
  isResolving?: boolean
  errorMessage?: string | null
}

function extractQrToken(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const match = trimmed.match(/\/qr\/([A-Za-z0-9_-]+)/i)
  if (match && match[1]) return match[1]
  return trimmed
}

function decodeCanvasImage(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imgData.data, canvas.width, canvas.height, {
    inversionAttempts: 'attemptBoth',
  })
  return code?.data ?? null
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Gagal memuat gambar.'))
    el.src = src
  })
}

async function decodeQrFromImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImageElement(url)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const scales = [1400, 900, 2000, 560]
    for (const targetMax of scales) {
      const ratio = Math.min(1, targetMax / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * ratio))
      const h = Math.max(1, Math.round(img.height * ratio))
      canvas.width = w
      canvas.height = h
      ctx.drawImage(img, 0, 0, w, h)

      const direct = decodeCanvasImage(canvas)
      if (direct) return direct

      if (Math.min(w, h) >= 320) {
        const cropSize = Math.round(Math.min(w, h) * 0.65)
        const sx = Math.round((w - cropSize) / 2)
        const sy = Math.round((h - cropSize) / 2)
        const cropCanvas = document.createElement('canvas')
        cropCanvas.width = cropSize
        cropCanvas.height = cropSize
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true })
        if (cropCtx) {
          cropCtx.drawImage(canvas, sx, sy, cropSize, cropSize, 0, 0, cropSize, cropSize)
          const cropped = decodeCanvasImage(cropCanvas)
          if (cropped) return cropped
        }
      }
    }
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function QrScannerStage({
  onDetected,
  isResolving = false,
  errorMessage = null,
}: QrScannerStageProps) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const rafRef = React.useRef<number | null>(null)
  const lockedRef = React.useRef(false)
  const successAudioRef = React.useRef<HTMLAudioElement | null>(null)

  React.useEffect(() => {
    const audio = new Audio(qrSuccessSoundUrl)
    audio.preload = 'auto'
    audio.volume = 0.85
    successAudioRef.current = audio
  }, [])

  const playSuccessSound = React.useCallback(() => {
    const audio = successAudioRef.current ?? new Audio(qrSuccessSoundUrl)
    audio.currentTime = 0
    void audio.play().catch(() => {
      // Abaikan jika browser memblokir autoplay audio
    })
  }, [])

  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment')
  const [cameraState, setCameraState] = React.useState<'starting' | 'active' | 'error'>('starting')
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [decodingPhoto, setDecodingPhoto] = React.useState(false)
  const [restartKey, setRestartKey] = React.useState(0)

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

    const start = async () => {
      stopCamera()

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) {
          setCameraState('error')
          setCameraError(
            'Browser tidak mengizinkan siaran kamera langsung di koneksi ini. Unggah foto QR atau pilih mesin manual di bawah.',
          )
        }
        return
      }

      setCameraState('starting')
      setCameraError(null)

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
          if (now - lastScanTime >= 110) {
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
                    playSuccessSound()
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
            'Izin kamera ditolak atau kamera sedang digunakan aplikasi lain. Izinkan kamera atau unggah gambar QR di bawah.',
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [facingMode, restartKey, errorMessage, onDetected, playSuccessSound, stopCamera])

  const handleImageQr = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null)
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setDecodingPhoto(true)
    try {
      const rawValue = await decodeQrFromImageFile(file)
      if (!rawValue) {
        setUploadError(
          'Kode QR belum terbaca pada foto tersebut. Pastikan stiker QR terlihat jelas dan tidak buram.',
        )
        return
      }
      const token = extractQrToken(rawValue)
      if (!token) {
        setUploadError('Kode QR tidak berisi token mesin yang valid.')
        return
      }
      stopCamera()
      playSuccessSound()
      onDetected(token)
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : 'Gagal membaca file gambar QR.',
      )
    } finally {
      setDecodingPhoto(false)
    }
  }

  return (
    <div className="mx-auto max-w-[540px] space-y-4">
      <div>
        <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Pindai QR Mesin
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Arahkan kamera ke stiker QR mesin — pemindaian berjalan otomatis.
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

      {/* Clean Live Camera Card */}
      <div className="overflow-hidden rounded-[8px] border border-[var(--border)] bg-[var(--surface)]">
        <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full bg-[#0D1117] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${
              facingMode === 'user' ? '-scale-x-100' : ''
            } ${cameraState === 'active' ? 'opacity-100' : 'opacity-0'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Viewfinder Reticle + Live Auto-Scan Indicator */}
          {cameraState === 'active' && (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48 sm:h-56 sm:w-56">
                  <span className="absolute left-0 top-0 h-7 w-7 border-l-[3px] border-t-[3px] border-[var(--accent)]" />
                  <span className="absolute right-0 top-0 h-7 w-7 border-r-[3px] border-t-[3px] border-[var(--accent)]" />
                  <span className="absolute bottom-0 left-0 h-7 w-7 border-b-[3px] border-l-[3px] border-[var(--accent)]" />
                  <span className="absolute bottom-0 right-0 h-7 w-7 border-b-[3px] border-r-[3px] border-[var(--accent)]" />
                </div>
              </div>

              {/* Floating Flip Camera Button (Top-Right inside viewfinder) */}
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                aria-label="Balik kamera depan atau belakang"
                className="absolute right-3 top-3 inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-white/20 bg-black/65 px-3 text-[12px] font-medium text-white hover:bg-black/80 cursor-pointer"
              >
                <SwitchCamera className="h-4 w-4 shrink-0" />
                <span>Balik Kamera</span>
              </button>

              {/* Subtle Auto-Scan Status Pill (Bottom-Center) */}
              <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-[12px] font-medium text-white">
                <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-pulse" />
                <span>Auto-Scan Aktif</span>
              </div>
            </>
          )}

          {/* Starting State */}
          {cameraState === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-6 text-center text-white">
              <WaveformLoader size="sm" />
              <span className="text-[13px] font-medium text-white/80">Membuka kamera...</span>
            </div>
          )}

          {/* Error Fallback */}
          {cameraState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <Camera className="h-7 w-7 text-white/60" />
              <p className="max-w-sm text-[13px] text-white/80 leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={() => setRestartKey((k) => k + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-white/25 bg-white/10 px-3.5 text-[13px] font-medium text-white hover:bg-white/20 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Coba Kamera Lagi</span>
              </button>
            </div>
          )}
        </div>

        {/* Clean Single-Action Upload Bar */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--rule)] px-4 py-3">
          <span className="text-[13px] text-[var(--muted)]">
            Punya foto stiker QR?
          </span>
          <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)] transition-colors">
            <Upload className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>Unggah QR</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageQr}
              className="hidden"
            />
          </label>
        </div>

        {(isResolving || decodingPhoto) && (
          <div className="flex items-center justify-center gap-3 border-t border-[var(--rule)] bg-[var(--raised)] px-4 py-3">
            <WaveformLoader size="sm" />
            <span className="text-[13px] font-medium text-[var(--text)]">
              {decodingPhoto ? 'Membaca kode QR dari gambar...' : 'Mengenali mesin dari QR...'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
