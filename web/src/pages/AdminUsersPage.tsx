import * as React from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit3, KeyRound, X } from 'lucide-react'
import { ApiError, apiFetch } from '@/lib/api'
import { useAuth } from '@/lib/auth-helpers'
import { useReferenceData } from '@/lib/reference'
import { PaginationBar } from '@/components/safety/PaginationBar'
import { QueryErrorBanner } from '@/components/safety/QueryErrorBanner'
import { Select } from '@/components/ui/FormField'
import { SectionLoading } from '@/components/ui/waveform-loader'
import type { PaginationMeta, SiteRef, User, UserRole } from '@/types/safetylog'

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$'
  const array = new Uint32Array(12)
  crypto.getRandomValues(array)
  return Array.from(array, (n) => chars[n % chars.length]).join('')
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const refQuery = useReferenceData()
  const [page, setPage] = React.useState(1)

  const usersQuery = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () =>
      apiFetch<{ data: User[]; meta?: PaginationMeta }>(`/users?per_page=20&page=${page}`),
  })

  const sitesQuery = useQuery({
    queryKey: ['admin-sites-active'],
    queryFn: () => apiFetch<{ data: SiteRef[] }>('/sites'),
  })

  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [role, setRole] = React.useState<UserRole>('reporter')
  const [siteId, setSiteId] = React.useState('')
  const [jobTitle, setJobTitle] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)

  // Edit user modal state
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [editPassword, setEditPassword] = React.useState('')

  const users = usersQuery.data?.data ?? []
  const roles = refQuery.data?.roles ?? []
  const sites = sitesQuery.data?.data ?? []

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrMsg(null)
    setSuccessMsg(null)
    if (password.length < 8) {
      setErrMsg('Kata sandi awal minimal 8 karakter.')
      return
    }
    setBusy(true)
    try {
      await apiFetch('/users', {
        method: 'POST',
        json: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          site_id: siteId ? Number(siteId) : sites[0]?.id || null,
          job_title: jobTitle.trim() || null,
        },
      })
      setName('')
      setEmail('')
      setPassword('')
      setJobTitle('')
      setSuccessMsg('Pengguna baru berhasil ditambahkan.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      void queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal menambah pengguna.')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setErrMsg(null)
    setSuccessMsg(null)
    if (editPassword && editPassword.length < 8) {
      setErrMsg('Kata sandi baru minimal 8 karakter.')
      return
    }
    setBusy(true)
    try {
      await apiFetch(`/users/${editingUser.id}`, {
        method: 'PATCH',
        json: {
          name: editingUser.name.trim(),
          role: editingUser.role,
          site_id: editingUser.site_id || null,
          job_title: editingUser.job_title?.trim() || null,
          ...(editPassword ? { password: editPassword } : {}),
        },
      })
      setEditingUser(null)
      setEditPassword('')
      setSuccessMsg('Data pengguna berhasil diperbarui.')
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      void queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
    } catch (err) {
      setErrMsg(err instanceof ApiError ? err.message : 'Gagal memperbarui pengguna.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (u: User) => {
    if (u.id === currentUser?.id) return
    setErrMsg(null)
    setSuccessMsg(null)
    try {
      await apiFetch(`/users/${u.id}`, {
        method: 'PATCH',
        json: { is_active: !u.is_active },
      })
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      void queryClient.invalidateQueries({ queryKey: ['assignable-users'] })
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

      <form
        onSubmit={handleCreate}
        className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] p-5 space-y-4"
      >
        <h2 className="text-[16px] font-semibold text-[var(--text)]">Tambah Pengguna Baru</h2>
        {errMsg && (
          <div className="rounded-[6px] border border-[var(--safety-danger-border)] bg-[var(--safety-danger-bg)] px-3 py-2 text-[13px] text-[var(--safety-danger-foreground)]">
            {errMsg}
          </div>
        )}
        {successMsg && (
          <div className="rounded-[6px] border border-[var(--safety-safe-border)] bg-[var(--safety-safe-bg)] px-3 py-2 text-[13px] text-[var(--safety-safe-foreground)]">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap"
            required
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email perusahaan"
            required
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata sandi awal (min. 8)"
              minLength={8}
              required
              className="h-11 min-w-0 flex-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
            />
            <button
              type="button"
              onClick={() => setPassword(generateTempPassword())}
              title="Buat kata sandi acak"
              className="inline-flex h-11 shrink-0 items-center gap-1 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-2.5 text-[12px] font-medium text-[var(--muted)] hover:bg-[var(--raised)] hover:text-[var(--text)] cursor-pointer"
            >
              <KeyRound className="h-4 w-4" />
              <span>Acak</span>
            </button>
          </div>
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
          <Select
            value={siteId || (sites[0] ? String(sites[0].id) : '')}
            onChange={(e) => setSiteId(e.target.value)}
            aria-label="Pilih site"
          >
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          <input
            type="text"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Jabatan (opsional)"
            className="h-11 rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="h-11 rounded-[6px] bg-[var(--primary)] px-5 text-[14px] font-semibold text-[var(--primary-ink)] hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {busy ? 'Menyimpan...' : 'Tambah Pengguna'}
        </button>
      </form>

      {usersQuery.isError && (
        <QueryErrorBanner
          message="Gagal memuat daftar pengguna."
          onRetry={() => void usersQuery.refetch()}
        />
      )}

      <div className="rounded-[8px] bg-[var(--surface)] border border-[var(--border)] divide-y divide-[var(--rule)]">
        {usersQuery.isLoading ? (
          <SectionLoading label="Memuat daftar pengguna..." />
        ) : (
          users.map((u) => {
            const isSelf = u.id === currentUser?.id
            return (
              <div
                key={u.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-medium text-[var(--text)]">{u.name}</span>
                    <span className="rounded-[4px] bg-[var(--raised)] px-2 py-0.5 text-[12px] text-[var(--muted)]">
                      {u.role_label}
                    </span>
                    {isSelf && (
                      <span className="rounded-[4px] border border-[var(--accent)] px-2 py-0.5 text-[12px] font-medium text-[var(--accent)]">
                        Anda
                      </span>
                    )}
                    {!u.is_active && (
                      <span className="rounded-[4px] bg-[var(--safety-danger-bg)] px-2 py-0.5 text-[12px] text-[var(--safety-danger-foreground)]">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <div className="text-[13px] text-[var(--faint)]">
                    {u.email}
                    {u.job_title ? ` · ${u.job_title}` : ''}
                    {u.site ? ` · ${u.site.name}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser({ ...u })
                      setEditPassword('')
                    }}
                    className="inline-flex h-11 items-center gap-1 rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)] cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isSelf}
                    title={isSelf ? 'Anda tidak dapat menonaktifkan akun sendiri' : undefined}
                    onClick={() => void toggleActive(u)}
                    className="h-11 rounded-[6px] border border-[var(--control)] px-3.5 text-[13px] font-medium text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <PaginationBar
        meta={usersQuery.data?.meta}
        onPageChange={setPage}
        isFetching={usersQuery.isFetching}
      />

      {/* Edit User Modal */}
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingUser(null)}
        >
          <form
            onSubmit={handleSaveEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[8px] border border-[var(--control)] bg-[var(--surface)] p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[var(--text)]">Edit Pengguna</h2>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Tutup"
                className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-[var(--control)] text-[var(--muted)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  required
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">Peran</label>
                <Select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                  }
                  disabled={editingUser.id === currentUser?.id}
                >
                  {roles.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">Site</label>
                <Select
                  value={editingUser.site_id ?? ''}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      site_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                >
                  <option value="">Tidak ditentukan</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">Jabatan</label>
                <input
                  type="text"
                  value={editingUser.job_title || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, job_title: e.target.value })}
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-[var(--text)]">
                  Reset Kata Sandi (Opsional, min. 8 karakter)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Kosongkan jika tidak diubah"
                  minLength={8}
                  className="h-11 w-full rounded-[6px] border border-[var(--control)] bg-[var(--surface)] px-3 text-[14px] text-[var(--text)] placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/15"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
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
    </div>
  )
}
