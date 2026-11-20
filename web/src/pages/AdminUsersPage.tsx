import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api'
import { useReferenceData } from '@/lib/reference'
import type { User, UserRole } from '@/types/safetylog'

export function AdminUsersPage() {
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<{ data: User[] }>('/users'),
  })

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const password = 'password123'
  const [role, setRole] = React.useState<UserRole>('reporter')
  const [jobTitle, setJobTitle] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)

  const users = usersQuery.data?.data ?? []
  const roles = refQuery.data?.roles ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    setBusy(true)
    try {
      await apiFetch('/users', {
        method: 'POST',
        json: {
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          job_title: jobTitle.trim() || null,
        },
      })
      setName('')
      setEmail('')
      setJobTitle('')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah pengguna.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (u: User) => {
    setErrMsg(null)
    try {
      await apiFetch(`/users/${u.id}`, {
        method: 'PATCH',
        json: { is_active: !u.is_active },
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal mengubah status pengguna.')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight text-[var(--text)]">
          Pengguna &amp; Peran
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Kelola pengguna dalam organisasi beserta pembagian peran (Pelapor, Supervisor, K3, Admin).
        </p>
      </div>

      <form onSubmit={handleCreate} className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4">
        <h2 className="text-[16px] font-semibold text-[var(--text)]">Tambah Pengguna Baru</h2>
        {errMsg && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
            {errMsg}
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap"
            required
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
          />
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Jabatan (opsional)"
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--ground)] px-3 text-[14px] text-[var(--text)]"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="h-11 sm:col-span-2 lg:col-span-1 rounded-[6px] bg-[var(--primary)] px-4 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy ? 'Menyimpan...' : 'Tambah'}
          </button>
        </div>
      </form>

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {usersQuery.isLoading ? (
          <div className="p-5 text-[14px] text-[var(--faint)]">Memuat pengguna...</div>
        ) : (
          users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-[var(--text)]">{u.name}</span>
                  <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[11px] text-[var(--muted)]">
                    {u.role_label}
                  </span>
                  {!u.is_active && (
                    <span className="rounded-[4px] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[11px] text-[var(--safety-danger-foreground)]">
                      Nonaktif
                    </span>
                  )}
                </div>
                <div className="text-[13px] text-[var(--faint)]">
                  {u.email} {u.job_title ? `· ${u.job_title}` : ''}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleActive(u)}
                className="h-11 sm:h-9 rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] text-[var(--muted)] hover:text-[var(--text)] self-start sm:self-auto"
              >
                {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
