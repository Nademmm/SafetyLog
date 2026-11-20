import * as React from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, QrCode, RefreshCw } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import type { AreaRef, Machine, SiteRef } from '@/types/safetylog'

export function AdminMachinesPage() {
  const queryClient = useQueryClient()

  const sitesQuery = useQuery({
    queryKey: ['admin-sites'],
    queryFn: () => apiFetch<{ data: SiteRef[] }>('/sites'),
  })

  const areasQuery = useQuery({
    queryKey: ['admin-areas'],
    queryFn: () => apiFetch<{ data: AreaRef[] }>('/areas'),
  })

  const machinesQuery = useQuery({
    queryKey: ['admin-machines'],
    queryFn: () => apiFetch<{ data: Machine[] }>('/machines'),
  })

  const [newMachineCode, setNewMachineCode] = React.useState('')
  const [newMachineName, setNewMachineName] = React.useState('')
  const [newMachineAreaId, setNewMachineAreaId] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const [qrModalMachine, setQrModalMachine] = React.useState<Machine | null>(null)

  const sites = sitesQuery.data?.data ?? []
  const areas = areasQuery.data?.data ?? []
  const machines = machinesQuery.data?.data ?? []

  const handleCreateMachine = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    if (!newMachineCode.trim() || !newMachineName.trim() || !newMachineAreaId) {
      setErrMsg('Kode, nama mesin, dan area wajib diisi.')
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
          code: newMachineCode.trim().toUpperCase(),
          name: newMachineName.trim(),
        },
      })
      setNewMachineCode('')
      setNewMachineName('')
      void queryClient.invalidateQueries({ queryKey: ['admin-machines'] })
      void queryClient.invalidateQueries({ queryKey: ['machines'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah mesin.')
    } finally {
      setBusy(false)
    }
  }

  const handleRegenerateQr = async (machine: Machine) => {
    try {
      const res = await apiFetch<{ data: Machine }>(`/machines/${machine.id}/regenerate-qr`, {
        method: 'POST',
      })
      setQrModalMachine(res.data)
      void queryClient.invalidateQueries({ queryKey: ['admin-machines'] })
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Area, Mesin &amp; Kode QR
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Kelola daftar mesin produksi dan cetak kode QR tempel untuk pelaporan cepat di lantai pabrik.
        </p>
      </div>

      {/* Add Machine Form */}
      <form onSubmit={handleCreateMachine} className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-[var(--text)]">Tambah Mesin Baru</h2>
        {errMsg && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
            {errMsg}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={newMachineAreaId}
            onChange={(e) => setNewMachineAreaId(e.target.value)}
            required
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
          >
            <option value="">Pilih Area...</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.code})
              </option>
            ))}
          </select>

          <input
            type="text"
            value={newMachineCode}
            onChange={(e) => setNewMachineCode(e.target.value)}
            placeholder="Kode (mis. MCH-PACK-02)"
            required
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

          <button
            type="submit"
            disabled={busy}
            className="h-11 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? 'Menyimpan...' : 'Simpan Mesin'}
          </button>
        </div>
      </form>

      {/* Machines List */}
      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {machinesQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat daftar mesin...</div>
        ) : machines.length === 0 ? (
          <div className="p-6 text-[14px] text-[var(--faint)]">Belum ada mesin terdaftar.</div>
        ) : (
          machines.map((m) => (
            <div
              key={m.id}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold text-[var(--accent)]">
                    {m.code}
                  </span>
                  <span className="text-[12px] text-[var(--faint)]">
                    · {m.area?.name || 'Area'}
                  </span>
                </div>
                <div className="text-[15px] font-medium text-[var(--text)]">{m.name}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/machines/${m.id}/cases`}
                  className="inline-flex h-11 sm:h-10 items-center rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Riwayat Kasus
                </Link>
                <button
                  type="button"
                  onClick={() => setQrModalMachine(m)}
                  className="inline-flex h-11 sm:h-10 items-center gap-1.5 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)]"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Cetak QR</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Printable QR Modal (B-07) */}
      {qrModalMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-sm rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="text-[12px] font-mono text-[var(--accent)]">SAFETYLOG QR MESIN</div>
              <h2 className="text-[18px] font-semibold text-[var(--text)]">{qrModalMachine.code}</h2>
              <p className="text-[13px] text-[var(--muted)]">{qrModalMachine.name}</p>
            </div>

            <div className="mx-auto flex w-fit items-center justify-center rounded-[8px] bg-white p-4">
              <QRCodeSVG
                value={`${window.location.origin}/qr/${qrModalMachine.qr_token}`}
                size={200}
                level="M"
              />
            </div>

            <div className="text-center space-y-1">
              <div className="text-[12px] text-[var(--faint)]">
                Pindai QR ini untuk lapor masalah mesin ≤ 60 detik
              </div>
              <Link
                to={`/qr/${qrModalMachine.qr_token}`}
                className="inline-block font-mono text-[11px] text-[var(--accent)] underline break-all"
              >
                /qr/{qrModalMachine.qr_token}
              </Link>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleRegenerateQr(qrModalMachine)}
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
                onClick={() => setQrModalMachine(null)}
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
