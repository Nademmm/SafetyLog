import * as React from 'react'
import jsQR from 'jsqr'
import {
  AlertCircle,
  Camera,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  ShieldAlert,
  SwitchCamera,
} from 'lucide-react'

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>
}

interface WindowWithBarcodeDetector extends Window {
  BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike
}

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

async function loadDrawableImage(
  file: File,
): Promise<{ width: number; height: number; source: CanvasImageSource; cleanup: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        cleanup: () => bitmap.close(),
      }
    } catch {
      // Fallback to HTMLImageElement below
    }
  }

  const objectUrl = URL.createObjectURL(file)
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Gagal memuat gambar.'))
    el.src = objectUrl
  })

  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    source: img,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  }
}

async function decodeQrFromImageFile(file: File): Promise<string | null> {
  const loaded = await loadDrawableImage(file)
  try {
    // 1. Coba hardware BarcodeDetector bawaan Chrome Android jika tersedia
    const Detector = (window as WindowWithBarcodeDetector).BarcodeDetector
    if (Detector) {
      try {
        const detector = new Detector({ formats: ['qr_code'] })
        const results = await detector.detect(loaded.source as ImageBitmapSource)
        const raw = results.find((r) => r.rawValue)?.rawValue
        if (raw) return raw
      } catch {
        // Lanjut ke fallback jsQR multi-skala
      }
    }

    // 2. Fallback jsQR multi-skala (penuh + crop tengah) agar foto kamera HP resolusi tinggi cepat & akurat terbaca
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    const passes: Array<{ maxDim: number; cropRatio: number }> = [
      { maxDim: 1400, cropRatio: 1 },
      { maxDim: 900, cropRatio: 1 },
      { maxDim: 600, cropRatio: 1 },
      { maxDim: 1000, cropRatio: 0.65 },
    ]

    for (const pass of passes) {
      const srcW = Math.round(loaded.width * pass.cropRatio)
      const srcH = Math.round(loaded.height * pass.cropRatio)
      const sx = Math.round((loaded.width - srcW) / 2)
      const sy = Math.round((loaded.height - srcH) / 2)

      const maxSide = Math.max(srcW, srcH)
      const scale = maxSide > pass.maxDim ? pass.maxDim / maxSide : 1
      const dstW = Math.max(1, Math.round(srcW * scale))
      const dstH = Math.max(1, Math.round(srcH * scale))

      canvas.width = dstW
      canvas.height = dstH
      ctx.clearRect(0, 0, dstW, dstH)
      ctx.drawImage(loaded.source, sx, sy, srcW, srcH, 0, 0, dstW, dstH)

      const imgData = ctx.getImageData(0, 0, dstW, dstH)
      const decoded = jsQR(imgData.data, dstW, dstH, { inversionAttempts: 'attemptBoth' })
      if (decoded?.data) {
        return decoded.data
      }
    }

    return null
  } finally {
    loaded.cleanup()
  }
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

  const isInsecureHttp =
    typeof window !== 'undefined' &&
    !window.isSecureContext &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'

  const [facingMode, setFacingMode] = React.useState<'environment' | 'user'>('environment')
  const [cameraState, setCameraState] = React.useState<
    'starting' | 'active' | 'insecure_http' | 'error'
  >(isInsecureHttp ? 'insecure_http' : 'starting')
  const [cameraError, setCameraError] = React.useState<string | null>(null)
  const [uploadError, setUploadError] = React.useState<string | null>(null)
  const [decodingPhoto, setDecodingPhoto] = React.useState(false)
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

    const start = async () => {
      stopCamera()

      if (isInsecureHttp || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) {
          if (isInsecureHttp) {
            setCameraState('insecure_http')
            setCameraError(null)
          } else {
            setCameraState('error')
            setCameraError(
              'Browser tidak mengizinkan siaran kamera langsung. Gunakan tombol Buka Kamera HP (Foto QR) di bawah ini.',
            )
          }
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
            'Izin kamera langsung ditolak atau perangkat tidak memiliki kamera aktif. Gunakan tombol Buka Kamera HP (Foto QR) di bawah.',
          )
        }
      }
    }

    void start()

    return () => {
      cancelled = true
      stopCamera()
    }
  }, [facingMode, restartKey, onDetected, stopCamera, isInsecureHttp])

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
          'Kode QR belum terbaca pada foto tersebut. Dekatkan kamera ke stiker QR, pastikan fokus & tidak buram, lalu coba lagi.',
        )
        return
      }
      const token = extractQrToken(rawValue)
      if (!token) {
        setUploadError('Isi kode QR tidak valid untuk mesin SafetyLog.')
        return
      }
      stopCamera()
      onDetected(token)
    } catch {
      setUploadError('Foto tidak dapat diproses. Pastikan format gambar adalah JPG, PNG, atau WebP.')
    } finally {
      setDecodingPhoto(false)
    }
  }

  return (
    <div className="mx-auto max-w-[600px] space-y-4">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Pindai QR Mesin
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Pindai stiker QR pada mesin untuk langsung membuka form laporan dengan mesin terpilih otomatis.
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
        {cameraState === 'insecure_http' ? (
          /* Mode Optimal HP di HTTP Jaringan Lokal: Buka Kamera Bawaan HP Langsung (selalu diizinkan Chrome!) */
          <div className="p-5 sm:p-6 space-y-5">
            <div className="flex items-start gap-3 rounded-[8px] border border-[var(--safety-warning-border)] bg-[var(--safety-warning-bg)] p-3.5 text-[13px] text-[var(--safety-warning-foreground)]">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold">Mode Kamera Foto QR Aktif (Akses HTTP Lokal)</div>
                <p className="opacity-90 leading-relaxed">
                  Chrome membatasi siaran kamera live pada alamat <code className="font-mono">http://</code> jaringan lokal. Tekan tombol di bawah untuk langsung membuka <strong>Kamera HP</strong> Anda dan memfoto stiker QR — sistem akan membacanya otomatis.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-[8px] bg-[var(--primary)] px-4 py-3 text-[15px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] transition-colors">
                <Camera className="h-5 w-5 stroke-[2px]" />
                <span>Buka Kamera HP &amp; Foto QR</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageQr}
                  className="hidden"
                />
              </label>

              <label className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[var(--control)] bg-[var(--ground)] px-4 py-2.5 text-[14px] font-medium text-[var(--text)] hover:bg-[var(--raised)] transition-colors">
                <ImageIcon className="h-4 w-4 stroke-[1.75px]" />
                <span>Pilih Gambar QR dari Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageQr}
                  className="hidden"
                />
              </label>
            </div>

            <div className="rounded-[6px] border border-[var(--rule)] bg-[var(--ground)] px-3.5 py-2.5 text-[12px] text-[var(--faint)] leading-relaxed">
              <strong className="text-[var(--muted)]">Ingin siaran kamera live tanpa jepret?</strong>{' '}
              Jalankan frontend dengan HTTPS (<code className="font-mono text-[var(--text)]">npm run dev:https</code>) lalu buka alamat <code className="font-mono text-[var(--text)]">https://...</code> di HP.
            </div>
          </div>
        ) : (
          <>
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
            </div>

            {/* Camera Controls Bar: Flip Camera + Native Camera Photo + Gallery */}
            <div className="grid grid-cols-1 gap-2.5 border-t border-[var(--rule)] p-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setFacingMode((m) => (m === 'environment' ? 'user' : 'environment'))}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]"
              >
                <SwitchCamera className="h-4 w-4 shrink-0 stroke-[1.75px]" />
                <span>{facingMode === 'environment' ? 'Kamera Depan' : 'Kamera Belakang'}</span>
              </button>

              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-[var(--primary)] px-3 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]">
                <Camera className="h-4 w-4 shrink-0 stroke-[2px]" />
                <span>Foto QR (Kamera)</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageQr}
                  className="hidden"
                />
              </label>

              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]">
                <ImageIcon className="h-4 w-4 shrink-0 stroke-[1.75px]" />
                <span>Pilih Galeri</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageQr}
                  className="hidden"
                />
              </label>
            </div>
          </>
        )}

        {(isResolving || decodingPhoto) && (
          <div className="flex items-center justify-center gap-2 border-t border-[var(--rule)] bg-[var(--raised)] px-4 py-3 text-[13px] font-medium text-[var(--text)]">
            <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
            <span>
              {decodingPhoto ? 'Membaca kode QR dari foto...' : 'Mengenali mesin dari QR...'}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
