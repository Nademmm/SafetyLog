import * as React from 'react'
import { apiUrl, getStoredToken } from '@/lib/api'

export function AuthorizedImage({
  attachmentId,
  alt,
  className,
}: {
  attachmentId: number
  alt: string
  className?: string
}) {
  const [src, setSrc] = React.useState<string | null>(null)
  const [failed, setFailed] = React.useState(false)

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

  if (failed) {
    return (
      <div className="flex h-32 items-center justify-center rounded-[6px] bg-[var(--raised)] text-xs text-[var(--faint)]">
        Foto tidak dapat dimuat
      </div>
    )
  }

  if (!src) {
    return <div className="h-32 rounded-[6px] bg-[var(--raised)]" />
  }

  return <img src={src} alt={alt} className={className} />
}
