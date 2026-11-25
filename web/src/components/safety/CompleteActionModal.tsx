import * as React from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Camera, Check, ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { compressImageFile } from '@/lib/image-compress'
import { useReferenceData } from '@/lib/reference'
import { parseRootCauseCategories } from '@/data/normalizers'
import { invalidateActionMutation } from '@/data/invalidation'
import type { CaseAction } from '@/types/safetylog'

export interface ExistingRootCause {
  root_cause_category: string | null
  five_whys: string[] | null
  root_cause_summary: string | null
}

interface CompleteActionModalProps {
  action: CaseAction
  caseId: number
  caseNumber?: string
  existingRootCause?: ExistingRootCause | null
  onClose: () => void
  onCompleted?: () => void
}

export function CompleteActionModal({
  action,
  caseId,
  caseNumber,
  existingRootCause,
  onClose,
  onCompleted,
}: CompleteActionModalProps) {
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const categories6M = React.useMemo(
    () => parseRootCauseCategories(refQuery.data?.configurations),
    [refQuery.data?.configurations],
  )

  const [completionNote, setCompletionNote] = React.useState('')
  const [photos, setPhotos] = React.useState<File[]>([])
  const [rcCategory, setRcCategory] = React.useState(
    existingRootCause?.root_cause_category || 'Mesin',
  )
  const [fiveWhys, setFiveWhys] = React.useState<string[]>(() => {
    if (existingRootCause?.five_whys && existingRootCause.five_whys.length > 0) {
      return existingRootCause.five_whys
    }
    return ['']
  })
  const [rcSummary, setRcSummary] = React.useState(existingRootCause?.root_cause_summary || '')
  const [submitting, setSubmitting] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [rootCauseSaved, setRootCauseSaved] = React.useState(false)

  const activeCategory = categories6M.includes(rcCategory) ? rcCategory : categories6M[0]

  React.useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, submitting])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setErrorMsg(null)
    try {
      const compressed = await Promise.all(files.map(compressImageFile))
      setPhotos((prev) => [...prev, ...compressed].slice(0, 5))
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memproses foto bukti.')
    }
    e.target.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const trimmedNote = completionNote.trim()
    if (!trimmedNote) {
      setErrorMsg('Catatan hasil tindakan wajib diisi.')
      return
    }

    const cleanedWhys = fiveWhys.map((w) => w.trim()).filter(Boolean)
    if (cleanedWhys.length === 0) {
      setErrorMsg('Minimal 1 baris analisis 5 Why (Mengapa) wajib diisi oleh PIC.')
      return
    }

    setSubmitting(true)
    try {
      if (!rootCauseSaved) {
        await apiFetch(`/cases/${caseId}/root-cause`, {
          method: 'POST',
          json: {
            root_cause_category: activeCategory,
            five_whys: cleanedWhys,
            root_cause_summary: rcSummary.trim() || null,
          },
        })
        setRootCauseSaved(true)
      }

      const formData = new FormData()
      formData.append('completion_note', trimmedNote)
      photos.forEach((f) => formData.append('photos[]', f))

      await apiFetch(`/actions/${action.id}/complete`, {
        method: 'POST',
        body: formData,
      })

      await invalidateActionMutation(queryClient, caseId)

      onCompleted?.()
      onClose()
    } catch (err) {
      const baseMsg =
        err instanceof ApiError ? err.message : 'Gagal menyimpan penyelesaian tindakan.'
      setErrorMsg(
        rootCauseSaved
          ? `Analisis 5 Why & 6M sudah tersimpan, tetapi penyelesaian tindakan gagal: ${baseMsg}`
          : baseMsg,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="complete-action-title"
      onClick={() => {
        if (!submitting) onClose()
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-[12px] sm:rounded-[8px] border border-[var(--control)] bg-[var(--surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[var(--rule)] px-5 py-4">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2">
              <h2
                id="complete-action-title"
                className="text-[17px] font-semibold text-[var(--text)]"
              >
                Lapor Penyelesaian Tindakan
              </h2>
              {caseNumber && (
                <span className="font-mono text-[12px] text-[var(--faint)] tabular-nums">
                  {caseNumber}
                </span>
              )}
            </div>
            <p className="text-[13px] text-[var(--muted)] line-clamp-2">{action.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Tutup modal"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <form
          id="complete-action-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 space-y-5"
        >
          {errorMsg && (
            <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3.5 py-2.5 text-[13px] text-[var(--safety-danger-foreground)]">
              {errorMsg}
            </div>
          )}

          {/* Bagian 1: Hasil Penyelesaian */}
          <div className="space-y-3">
            <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--faint)]">
              1. Hasil Perbaikan
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="modal_completion_note"
                className="block text-[13px] font-semibold text-[var(--text)]"
              >
                Catatan Hasil Tindakan{' '}
                <span className="text-[var(--safety-danger-foreground)]">*</span>
              </label>
              <textarea
                id="modal_completion_note"
                rows={3}
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                placeholder="Jelaskan tindakan perbaikan atau pencegahan yang sudah dilakukan..."
                required
                className="w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] p-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[13px] font-semibold text-[var(--text)]">
                Foto Bukti (Opsional, maks. 5 foto)
              </label>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]">
                  <Camera className="h-4 w-4 text-[var(--muted)]" />
                  <span>Ambil Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] font-medium text-[var(--text)] hover:bg-[var(--raised)]">
                  <ImagePlus className="h-4 w-4 text-[var(--muted)]" />
                  <span>Dari Galeri</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={handlePhotoChange}
                    className="sr-only"
                  />
                </label>
              </div>
              {photos.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photos.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--control)] bg-[var(--ground)] px-2.5 py-1 text-[12px] text-[var(--muted)]"
                    >
                      <span className="max-w-[160px] truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                        aria-label={`Hapus ${file.name}`}
                        className="text-[var(--faint)] hover:text-[var(--safety-danger-foreground)]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bagian 2: Analisis Akar Penyebab (5 Why & 6M) oleh PIC */}
          <div className="border-t border-[var(--rule)] pt-4 space-y-4">
            <div className="text-[12px] font-medium uppercase tracking-wider text-[var(--faint)]">
              2. Analisis Akar Penyebab (5 Why &amp; 6M)
            </div>

            {/* Kategori 6M */}
            <div className="space-y-1.5">
              <span className="block text-[13px] font-semibold text-[var(--text)]">
                Kategori 6M <span className="text-[var(--safety-danger-foreground)]">*</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories6M.map((cat) => {
                  const selected = activeCategory === cat
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRcCategory(cat)}
                      className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-[6px] border px-3 text-[13px] transition-colors cursor-pointer ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                          : 'border-[var(--control)] bg-[var(--surface)] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5 shrink-0 stroke-[2.5px]" />}
                      <span>{cat}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 5 Why */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[var(--text)]">
                  5 Why (Mengapa masalah ini terjadi?){' '}
                  <span className="text-[var(--safety-danger-foreground)]">*</span>
                </span>
                <span className="font-mono text-[11px] text-[var(--faint)] tabular-nums">
                  {fiveWhys.length}/5
                </span>
              </div>

              {fiveWhys.map((w, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="flex h-11 w-7 shrink-0 items-center justify-center font-mono text-[12px] font-medium text-[var(--faint)] tabular-nums">
                    {idx + 1}.
                  </span>
                  <input
                    type="text"
                    value={w}
                    onChange={(e) => {
                      const next = [...fiveWhys]
                      next[idx] = e.target.value
                      setFiveWhys(next)
                    }}
                    placeholder={
                      idx === 0
                        ? 'Mengapa ke-1 (gejala awal yang ditemukan)...'
                        : `Mengapa ke-${idx + 1}...`
                    }
                    required={idx === 0}
                    className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                  />
                  {fiveWhys.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFiveWhys((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Hapus baris mengapa ke-${idx + 1}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-[var(--control)] bg-[var(--surface)] text-[var(--faint)] hover:text-[var(--safety-danger-foreground)] cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              {fiveWhys.length < 5 && (
                <button
                  type="button"
                  onClick={() => setFiveWhys((prev) => [...prev, ''])}
                  className="inline-flex h-11 items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tambah baris Mengapa ({fiveWhys.length + 1})</span>
                </button>
              )}
            </div>

            {/* Ringkasan Akar Masalah */}
            <div className="space-y-1.5">
              <label
                htmlFor="modal_rc_summary"
                className="block text-[13px] font-semibold text-[var(--text)]"
              >
                Ringkasan Akar Masalah (Opsional)
              </label>
              <input
                id="modal_rc_summary"
                type="text"
                value={rcSummary}
                onChange={(e) => setRcSummary(e.target.value)}
                placeholder="Kosongkan untuk memakai jawaban Mengapa terakhir..."
                className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
              />
            </div>
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="flex gap-2.5 border-t border-[var(--rule)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] font-medium text-[var(--text)] hover:bg-[var(--raised)] disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="complete-action-form"
            disabled={submitting}
            className="h-11 flex-[1.5] rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {submitting ? 'Menyimpan...' : 'Simpan & Selesaikan'}
          </button>
        </div>
      </div>
    </div>
  )
}
