import * as React from 'react'
import { createPortal } from 'react-dom'
import { Download, ExternalLink, Maximize2, X } from 'lucide-react'
import { apiUrl, getStoredToken } from '@/lib/api'

export function AuthorizedImage({
  attachmentId,
  alt,
  className,
  previewable = true,
}: {
  attachmentId: number
  alt: string
  className?: string
  previewable?: boolean
}) {
  const [src, setSrc] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)
  const [lightboxOpen, setLightboxOpen] = React.useState(false)

  React.useEffect(() => {
    let active = true
    let objectUrl: string | null = null
    const token = getStoredToken()

    fetch(apiUrl(`/attachments/${attachmentId}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat foto')
        return res.blob()
      })
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSrc(objectUrl)
      })
      .catch(() => {
        if (active) setFailed(true)
      })

    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [attachmentId])

  React.useEffect(() => {
    if (!lightboxOpen) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [lightboxOpen])

  if (failed) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[6px] bg-[var(--raised)] text-xs text-[var(--faint)]">
        Foto tidak dapat dimuat
      </div>
    )
  }

  if (!src) {
    return <div className="h-32 animate-pulse rounded-[6px] bg-[var(--raised)]" />
  }

  if (!previewable) {
    return <img src={src} alt={alt} className={className} />
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={`Lihat foto ukuran penuh: ${alt}`}
        className="group relative block overflow-hidden rounded-[6px] cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
      >
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
          <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-black/75 px-2.5 py-1 text-[12px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Lihat Penuh</span>
          </span>
        </span>
      </button>

      {lightboxOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Pratinjau foto ${alt}`}
            onClick={() => setLightboxOpen(false)}
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 p-3 sm:p-6 backdrop-blur-sm"
          >
            {/* Top Bar */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 pb-3"
            >
              <div className="min-w-0 truncate text-[13px] font-medium text-white/90">
                {alt}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-white/20 bg-white/10 px-3 text-[13px] font-medium text-white hover:bg-white/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Buka Tab Baru</span>
                </a>
                <a
                  href={src}
                  download={alt || `lampiran-${attachmentId}.jpg`}
                  className="inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-white/20 bg-white/10 px-3 text-[13px] font-medium text-white hover:bg-white/20"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Unduh</span>
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Tutup pratinjau foto"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-[6px] border border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Full-Size Image Stage */}
            <div className="flex flex-1 items-center justify-center overflow-hidden">
              <img
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[82vh] max-w-full rounded-[6px] object-contain shadow-2xl"
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
