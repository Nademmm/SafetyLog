import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import {
  Archive,
  Check,
  Copy,
  Edit3,
  Printer,
  QrCode,
  RefreshCw,
  RotateCcw,
  X,
} from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import type { AreaRef, Machine, SiteRef } from '@/types/safetylog'

type AdminTab = 'machines' | 'areas' | 'sites'

export function AdminMachinesPage() {
  const queryClient = useQueryClient()
  const [tab, setTab] = React.useState<AdminTab>('machines')
  const [showArchived, setShowArchived] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const sitesQuery = useQuery({
    queryKey: ['admin-sites', showArchived],
    queryFn: () =>
      apiFetch<{ data: SiteRef[] }>(`/sites${showArchived ? '?include_archived=1' : ''}`),
  })

  const areasQuery = useQuery({
    queryKey: ['admin-areas', showArchived],
    queryFn: () =>
      apiFetch<{ data: AreaRef[] }>(`/areas${showArchived ? '?include_archived=1' : ''}`),
  })

  const machinesQuery = useQuery({
    queryKey: ['admin-machines', showArchived],
    queryFn: () =>
      apiFetch<{ data: Machine[] }>(`/machines${showArchived ? '?include_archived=1' : ''}`),
  })

  const assignableQuery = useQuery({
    queryKey: ['assignable-users'],
    queryFn: () =>
      apiFetch<{ data: Array<{ id: number; name: string; role_label: string }> }>(
        '/users/assignable',
      ),
  })

  const sites = sitesQuery.data?.data ?? []
  const areas = areasQuery.data?.data ?? []
  const machines = machinesQuery.data?.data ?? []
  const assignableUsers = assignableQuery.data?.data ?? []

  // Create Machine form state
  const [newMachineCode, setNewMachineCode] = React.useState('')
  const [newMachineName, setNewMachineName] = React.useState('')
  const [newMachineDesc, setNewMachineDesc] = React.useState('')
  const [newMachineAreaId, setNewMachineAreaId] = React.useState('')
  const [editingMachine, setEditingMachine] = React.useState<Machine | null>(null)

  // Create Area form state
  const [newAreaSiteId, setNewAreaSiteId] = React.useState('')
  const [newAreaName, setNewAreaName] = React.useState('')
  const [newAreaPicId, setNewAreaPicId] = React.useState('')
  const [editingArea, setEditingArea] = React.useState<AreaRef | null>(null)

  // Create Site form state
  const [newSiteName, setNewSiteName] = React.useState('')
  const [editingSite, setEditingSite] = React.useState<SiteRef | null>(null)

  // QR modal state
  const [qrModalMachine, setQrModalMachine] = React.useState<Machine | null>(null)
  const [confirmRegen, setConfirmRegen] = React.useState(false)
  const [copiedQrUrl, setCopiedQrUrl] = React.useState(false)

  React.useEffect(() => {
    if (!qrModalMachine) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setQrModalMachine(null)
        setConfirmRegen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [qrModalMachine])

  const invalidateMasterData = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-machines'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-areas'] })
    void queryClient.invalidateQueries({ queryKey: ['admin-sites'] })
    void queryClient.invalidateQueries({ queryKey: ['machines'] })
  }

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    if (!newMachineName.trim() || !newMachineAreaId) {
      setErrMsg('Area dan nama mesin wajib diisi.')
      return
    }
    const selectedArea = areas.find((a) => String(a.id) === newMachineAreaId)
    const siteId = selectedArea?.site_id || selectedArea?.site?.id || sites[0]?.id

    setBusy(true)
    try {
      await apiFetch('/machines', {
        method: 'POST',
        json: {
          site_id: siteId,
          area_id: Number(newMachineAreaId),
          ...(newMachineCode.trim() ? { code: newMachineCode.trim().toUpperCase() } : {}),
          name: newMachineName.trim(),
          description: newMachineDesc.trim() || null,
        },
      })
      setNewMachineCode('')
      setNewMachineName('')
      setNewMachineDesc('')
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah mesin.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveMachineEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMachine) return
    setErrMsg(null)
    setBusy(true)
    try {
      await apiFetch(`/machines/${editingMachine.id}`, {
        method: 'PATCH',
        json: {
          area_id: editingMachine.area_id,
          name: editingMachine.name.trim(),
          description: editingMachine.description?.trim() || null,
        },
      })
      setEditingMachine(null)
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal memperbarui mesin.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleMachineArchive = async (m: Machine) => {
    setErrMsg(null)
    try {
      if (m.is_active === false) {
        await apiFetch(`/machines/${m.id}`, {
          method: 'PATCH',
          json: { is_active: true },
        })
      } else {
        await apiFetch(`/machines/${m.id}/archive`, { method: 'POST' })
      }
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal mengubah status mesin.')
    }
  }

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    const siteId = newAreaSiteId ? Number(newAreaSiteId) : sites[0]?.id
    if (!siteId || !newAreaName.trim()) {
      setErrMsg('Site dan nama area wajib diisi.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/areas', {
        method: 'POST',
        json: {
          site_id: siteId,
          name: newAreaName.trim(),
          pic_user_id: newAreaPicId ? Number(newAreaPicId) : null,
        },
      })
      setNewAreaName('')
      setNewAreaPicId('')
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah area.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveAreaEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingArea) return
    setErrMsg(null)
    setBusy(true)
    try {
      await apiFetch(`/areas/${editingArea.id}`, {
        method: 'PATCH',
        json: {
          site_id: editingArea.site_id,
          name: editingArea.name.trim(),
          pic_user_id: editingArea.pic_user_id || null,
        },
      })
      setEditingArea(null)
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal memperbarui area.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleAreaArchive = async (a: AreaRef) => {
    setErrMsg(null)
    try {
      if (a.is_active === false) {
        await apiFetch(`/areas/${a.id}`, { method: 'PATCH', json: { is_active: true } })
      } else {
        await apiFetch(`/areas/${a.id}/archive`, { method: 'POST' })
      }
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal mengubah status area.')
    }
  }

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    if (!newSiteName.trim()) {
      setErrMsg('Nama site wajib diisi.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/sites', {
        method: 'POST',
        json: { name: newSiteName.trim() },
      })
      setNewSiteName('')
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah site.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveSiteEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSite) return
    setErrMsg(null)
    setBusy(true)
    try {
      await apiFetch(`/sites/${editingSite.id}`, {
        method: 'PATCH',
        json: { name: editingSite.name.trim() },
      })
      setEditingSite(null)
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal memperbarui site.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleSiteArchive = async (s: SiteRef) => {
    setErrMsg(null)
    try {
      if (s.is_active === false) {
        await apiFetch(`/sites/${s.id}`, { method: 'PATCH', json: { is_active: true } })
      } else {
        await apiFetch(`/sites/${s.id}/archive`, { method: 'POST' })
      }
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal mengubah status site.')
    }
  }

  const handleRegenerateQr = async (machine: Machine) => {
    setErrMsg(null)
    try {
      const res = await apiFetch<{ data: Machine }>(`/machines/${machine.id}/regenerate-qr`, {
        method: 'POST',
      })
      setQrModalMachine(res.data)
      setConfirmRegen(false)
      invalidateMasterData()
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal membuat ulang token QR.')
    }
  }

  const handleCopyQrUrl = async (token: string) => {
    const fullUrl = `${window.location.origin}/qr/${token}`
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const ta = document.createElement('textarea')
        ta.value = fullUrl
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setCopiedQrUrl(true)
      window.setTimeout(() => setCopiedQrUrl(false), 2000)
    } catch {
      setCopiedQrUrl(false)
    }
  }

  const activeAreas = areas.filter((a) => a.is_active !== false)
  const activeSites = sites.filter((s) => s.is_active !== false)

  return (
    <div className="space-y-6">
      {/* Main Admin Workspace (hidden when printing QR sticker) */}
      <div className={`space-y-6 ${qrModalMachine ? 'print:hidden' : ''}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
              Site, Area, Mesin &amp; Kode QR
            </h1>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              Kelola master data pabrik, tetapkan PIC Area, dan cetak stiker QR per mesin.
            </p>
          </div>

          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[13px] text-[var(--text)]">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 accent-[var(--accent)]"
            />
            <span>Tampilkan yang diarsipkan</span>
          </label>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {(
            [
              { key: 'machines', label: `Mesin & QR (${machines.length})` },
              { key: 'areas', label: `Area & PIC (${areas.length})` },
              { key: 'sites', label: `Site / Pabrik (${sites.length})` },
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              onClick={() => {
                setTab(item.key)
                setErrMsg(null)
              }}
              className={`h-11 rounded-[6px] border px-4 text-[13px] font-medium transition-colors ${
                tab === item.key
                  ? 'border-[var(--accent)] bg-[var(--raised)] font-semibold text-[var(--text)]'
                  : 'border-[var(--control)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {errMsg && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-4 py-3 text-[13px] text-[var(--safety-danger-foreground)]">
            {errMsg}
          </div>
        )}

        {(machinesQuery.isError || areasQuery.isError || sitesQuery.isError) && (
          <QueryErrorBanner
            message="Gagal memuat sebagian data master pabrik."
            onRetry={invalidateMasterData}
          />
        )}

        {/* TAB 1: MACHINES */}
        {tab === 'machines' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateMachine}
              className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4"
            >
              <h2 className="text-[16px] font-semibold text-[var(--text)]">Tambah Mesin Baru</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={newMachineAreaId}
                  onChange={(e) => setNewMachineAreaId(e.target.value)}
                  required
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  <option value="">Pilih Area...</option>
                  {activeAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={newMachineCode}
                  onChange={(e) => setNewMachineCode(e.target.value)}
                  placeholder="Kode (opsional, otomatis bila kosong)"
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />

                <input
                  type="text"
                  value={newMachineName}
                  onChange={(e) => setNewMachineName(e.target.value)}
                  placeholder="Nama Mesin"
                  required
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />

                <input
                  type="text"
                  value={newMachineDesc}
                  onChange={(e) => setNewMachineDesc(e.target.value)}
                  placeholder="Keterangan singkat (opsional)"
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-11 rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {busy ? 'Menyimpan...' : 'Simpan Mesin'}
              </button>
            </form>

            <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
              {machinesQuery.isLoading ? (
                <div className="p-5 text-[14px] text-[var(--faint)]">Memuat daftar mesin...</div>
              ) : machines.length === 0 ? (
                <div className="p-6 text-[14px] text-[var(--faint)]">
                  Belum ada mesin terdaftar.
                </div>
              ) : (
                machines.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                          {m.code}
                        </span>
                        <span className="text-[12px] text-[var(--faint)]">
                          · {m.area?.name || 'Area'}
                        </span>
                        {m.is_active === false && (
                          <span className="rounded-[4px] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                            Diarsipkan
                          </span>
                        )}
                      </div>
                      <div className="text-[15px] font-medium text-[var(--text)]">{m.name}</div>
                      {m.description && (
                        <div className="text-[12px] text-[var(--muted)]">{m.description}</div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to={`/machines/${m.id}/cases`}
                        className="inline-flex h-11 sm:h-10 items-center rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        Riwayat
                      </Link>
                      <button
                        type="button"
                        onClick={() => setEditingMachine({ ...m })}
                        className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleMachineArchive(m)}
                        className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        {m.is_active === false ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" /> Arsipkan
                          </>
                        )}
                      </button>
                      {m.is_active !== false && (
                        <button
                          type="button"
                          onClick={() => {
                            setQrModalMachine(m)
                            setConfirmRegen(false)
                          }}
                          className="inline-flex h-11 sm:h-10 items-center gap-1.5 rounded-[6px] bg-[var(--primary)] px-4 text-[13px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                        >
                          <QrCode className="h-4 w-4" />
                          <span>Cetak QR</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AREAS & PIC AREA */}
        {tab === 'areas' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateArea}
              className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4"
            >
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                Tambah Area &amp; PIC Area
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <select
                  value={newAreaSiteId || (activeSites[0] ? String(activeSites[0].id) : '')}
                  onChange={(e) => setNewAreaSiteId(e.target.value)}
                  required
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  {activeSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  placeholder="Nama Area (mis. Produksi Line 1)"
                  required
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
                <select
                  value={newAreaPicId}
                  onChange={(e) => setNewAreaPicId(e.target.value)}
                  className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  <option value="">PIC Area (opsional)...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role_label})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {busy ? 'Menyimpan...' : 'Simpan Area'}
                </button>
              </div>
            </form>

            <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
              {areas.length === 0 ? (
                <div className="p-6 text-[14px] text-[var(--faint)]">Belum ada area terdaftar.</div>
              ) : (
                areas.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                          {a.code}
                        </span>
                        {a.site && (
                          <span className="text-[12px] text-[var(--faint)]">· {a.site.name}</span>
                        )}
                        {a.is_active === false && (
                          <span className="rounded-[4px] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                            Diarsipkan
                          </span>
                        )}
                      </div>
                      <div className="text-[15px] font-medium text-[var(--text)]">{a.name}</div>
                      <div className="text-[12px] text-[var(--muted)]">
                        PIC Area: {a.pic_user ? a.pic_user.name : 'Belum ditetapkan'}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingArea({ ...a })}
                        className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleToggleAreaArchive(a)}
                        className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                      >
                        {a.is_active === false ? (
                          <>
                            <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                          </>
                        ) : (
                          <>
                            <Archive className="h-3.5 w-3.5" /> Arsipkan
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SITES */}
        {tab === 'sites' && (
          <div className="space-y-6">
            <form
              onSubmit={handleCreateSite}
              className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4"
            >
              <h2 className="text-[16px] font-semibold text-[var(--text)]">
                Tambah Site / Pabrik Baru
              </h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="Nama Site / Pabrik (mis. Plant Karawang)"
                  required
                  className="h-11 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="h-11 rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  {busy ? 'Menyimpan...' : 'Simpan Site'}
                </button>
              </div>
            </form>

            <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
              {sites.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                        {s.code}
                      </span>
                      {s.is_active === false && (
                        <span className="rounded-[4px] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                          Diarsipkan
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] font-medium text-[var(--text)]">{s.name}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingSite({ ...s })}
                      className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleToggleSiteArchive(s)}
                      className="inline-flex h-11 sm:h-10 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                    >
                      {s.is_active === false ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" /> Pulihkan
                        </>
                      ) : (
                        <>
                          <Archive className="h-3.5 w-3.5" /> Arsipkan
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Machine Modal */}
      {editingMachine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingMachine(null)}
        >
          <form
            onSubmit={handleSaveMachineEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">
                Edit Mesin {editingMachine.code}
              </h2>
              <button
                type="button"
                onClick={() => setEditingMachine(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">Area</label>
                <select
                  value={editingMachine.area_id ?? ''}
                  onChange={(e) =>
                    setEditingMachine({ ...editingMachine, area_id: Number(e.target.value) })
                  }
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  {activeAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">Nama Mesin</label>
                <input
                  type="text"
                  value={editingMachine.name}
                  onChange={(e) => setEditingMachine({ ...editingMachine, name: e.target.value })}
                  required
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">Deskripsi</label>
                <input
                  type="text"
                  value={editingMachine.description || ''}
                  onChange={(e) =>
                    setEditingMachine({ ...editingMachine, description: e.target.value })
                  }
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingMachine(null)}
                className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] text-[var(--text)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Area Modal */}
      {editingArea && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingArea(null)}
        >
          <form
            onSubmit={handleSaveAreaEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">
                Edit Area {editingArea.code}
              </h2>
              <button
                type="button"
                onClick={() => setEditingArea(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">Site</label>
                <select
                  value={editingArea.site_id ?? ''}
                  onChange={(e) =>
                    setEditingArea({ ...editingArea, site_id: Number(e.target.value) })
                  }
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  {activeSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">Nama Area</label>
                <input
                  type="text"
                  value={editingArea.name}
                  onChange={(e) => setEditingArea({ ...editingArea, name: e.target.value })}
                  required
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] text-[var(--muted)]">PIC Area</label>
                <select
                  value={editingArea.pic_user_id ?? ''}
                  onChange={(e) =>
                    setEditingArea({
                      ...editingArea,
                      pic_user_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
                >
                  <option value="">Tidak ada PIC khusus</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role_label})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingArea(null)}
                className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] text-[var(--text)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Site Modal */}
      {editingSite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingSite(null)}
        >
          <form
            onSubmit={handleSaveSiteEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">
                Edit Site {editingSite.code}
              </h2>
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1">
              <label className="text-[12px] text-[var(--muted)]">Nama Site</label>
              <input
                type="text"
                value={editingSite.name}
                onChange={(e) => setEditingSite({ ...editingSite, name: e.target.value })}
                required
                className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingSite(null)}
                className="h-11 flex-1 rounded-[6px] border border-[var(--control)] text-[14px] text-[var(--text)]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={busy}
                className="h-11 flex-1 rounded-[6px] bg-[var(--primary)] text-[14px] font-semibold text-[var(--primary-ink)] disabled:opacity-50"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Printable QR Sticker Modal (B-07) */}
      {qrModalMachine && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 print:static print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setQrModalMachine(null)
            setConfirmRegen(false)
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
                {qrModalMachine.code}
              </h2>
              <p className="text-[14px] font-medium text-[var(--muted)] print:text-black">
                {qrModalMachine.name}
              </p>
              {qrModalMachine.area?.name && (
                <p className="text-[12px] text-[var(--faint)] print:text-black">
                  Area: {qrModalMachine.area.name}
                </p>
              )}
            </div>

            <div className="mx-auto flex w-fit items-center justify-center rounded-[8px] bg-white p-4 border border-black/10">
              <QRCodeSVG
                value={`${window.location.origin}/qr/${qrModalMachine.qr_token}`}
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
                onClick={() => void handleCopyQrUrl(qrModalMachine.qr_token)}
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
                  Mengacak ulang token akan membuat stiker QR lama tidak bisa dipindai lagi.
                  Lanjutkan?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleRegenerateQr(qrModalMachine)}
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
                  setQrModalMachine(null)
                  setConfirmRegen(false)
                }}
                className="inline-flex h-11 items-center justify-center rounded-[6px] border border-[var(--control)] px-4 text-[14px] text-[var(--text)]"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
