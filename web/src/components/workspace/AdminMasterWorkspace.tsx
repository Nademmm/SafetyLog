import * as React from 'react'
import { Building2, RefreshCw, QrCode, Users, Shield, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuthSession, MachineRecord, UserRoleCode } from '@/lib/qr-flow'
import {
  type AreaRecord,
  type ReferenceDataPayload,
  type SimpleUserRef,
  type SiteRecord,
  createArea,
  createMachine,
  createSite,
  createUser,
  fetchAreas,
  fetchReferenceData,
  fetchSites,
  fetchUsers,
  regenerateMachineQr,
  toggleArchiveArea,
  toggleArchiveMachine,
  toggleArchiveSite,
  updateRiskConfig,
  updateUser,
} from '@/lib/role-api'

export interface AdminMasterWorkspaceProps {
  session: AuthSession
  machines: MachineRecord[]
  onMachinesChanged: () => void
  onOpenQrPrintForMachine: (machine: MachineRecord) => void
}

type AdminSection = 'areas' | 'machines' | 'users' | 'risk'

export function AdminMasterWorkspace({
  session,
  machines,
  onMachinesChanged,
  onOpenQrPrintForMachine,
}: AdminMasterWorkspaceProps) {
  const [section, setSection] = React.useState<AdminSection>('areas')
  const [sites, setSites] = React.useState<SiteRecord[]>([])
  const [areas, setAreas] = React.useState<AreaRecord[]>([])
  const [users, setUsers] = React.useState<SimpleUserRef[]>([])
  const [refData, setRefData] = React.useState<ReferenceDataPayload | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState<boolean>(false)

  // Site form
  const [siteName, setSiteName] = React.useState<string>('')
  const [siteAddress, setSiteAddress] = React.useState<string>('')

  // Area form (with PIC Area)
  const [areaSiteId, setAreaSiteId] = React.useState<string>('')
  const [areaName, setAreaName] = React.useState<string>('')
  const [areaPicId, setAreaPicId] = React.useState<string>('')

  // Machine form
  const [machineAreaId, setMachineAreaId] = React.useState<string>('')
  const [machineName, setMachineName] = React.useState<string>('')
  const [machineDesc, setMachineDesc] = React.useState<string>('')

  // User form
  const [newUserName, setNewUserName] = React.useState<string>('')
  const [newUserEmail, setNewUserEmail] = React.useState<string>('')
  const [newUserPassword, setNewUserPassword] = React.useState<string>('password123')
  const [newUserRole, setNewUserRole] = React.useState<UserRoleCode>('reporter')
  const [newUserJobTitle, setNewUserJobTitle] = React.useState<string>('')

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, a, u, r] = await Promise.all([
        fetchSites(session),
        fetchAreas(session),
        fetchUsers(session),
        fetchReferenceData(session),
      ])
      setSites(s)
      setAreas(a)
      setUsers(u)
      setRefData(r)
      setAreaSiteId((prev) => prev || (s[0] ? String(s[0].id) : ''))
      setMachineAreaId((prev) => prev || (a[0] ? String(a[0].id) : ''))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat master data.')
    } finally {
      setLoading(false)
    }
  }, [session])

  React.useEffect(() => {
    void loadAll()
  }, [loadAll])

  const runAction = async (fn: () => Promise<void>, successText: string) => {
    setSubmitting(true)
    setError(null)
    setMsg(null)
    try {
      await fn()
      setMsg(successText)
      await loadAll()
      onMachinesChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operasi gagal diproses.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h2 font-bold text-off-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-industrial-orange stroke-[2px]" />
            Pengaturan &amp; Master Data (Manajer / Admin)
          </h1>
          <p className="text-caption text-steel-muted">
            Kelola site, area beserta PIC area, mesin dan token QR, akun pengguna 4 peran, dan ambang SLA risiko.
          </p>
        </div>

        <Button type="button" size="sm" variant="outline" onClick={loadAll} className="gap-1.5">
          <RefreshCw className="h-4 w-4 stroke-[2px]" />
          Muat Ulang
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'areas', label: 'Site & Area (PIC Area)' },
            { id: 'machines', label: 'Mesin & QR' },
            { id: 'users', label: 'Pengguna (4 Peran)' },
            { id: 'risk', label: 'Konfigurasi Risiko & SLA' },
          ] as const
        ).map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={section === tab.id ? 'industrial' : 'outline'}
            onClick={() => setSection(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {error && (
        <div role="alert" className="rounded-input border border-safety-danger-border bg-safety-danger-bg p-3 text-body text-safety-danger-foreground">
          {error}
        </div>
      )}

      {msg && (
        <div role="status" className="rounded-input border border-safety-safe-border bg-safety-safe-bg p-3 text-body text-safety-safe-foreground">
          {msg}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-center text-steel-muted">Memuat master data organisasi...</Card>
      ) : (
        <>
          {section === 'areas' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card className="bg-graphite">
                <CardHeader>
                  <CardTitle className="text-h4">Daftar Site (Kode Otomatis)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      runAction(
                        async () => {
                          await createSite(session, {
                            name: siteName.trim(),
                            address: siteAddress.trim() || undefined,
                          })
                          setSiteName('')
                          setSiteAddress('')
                        },
                        'Site baru berhasil ditambahkan.'
                      )
                    }}
                    className="flex flex-wrap gap-2"
                  >
                    <Input
                      required
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="Nama Pabrik / Site *"
                      className="flex-1 min-w-[160px]"
                    />
                    <Input
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
                      placeholder="Alamat (opsional)"
                      className="flex-1 min-w-[160px]"
                    />
                    <Button type="submit" disabled={submitting} size="sm" variant="industrial">
                      <Plus className="h-4 w-4 stroke-[2px]" />
                    </Button>
                  </form>

                  <div className="space-y-2">
                    {sites.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between rounded-sm border border-charcoal-border bg-carbon px-3 py-2"
                      >
                        <div>
                          <span className="font-mono text-caption font-bold text-industrial-orange mr-2">
                            {s.code}
                          </span>
                          <span className="text-body text-off-white">{s.name}</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() =>
                            runAction(
                              async () => {
                                await toggleArchiveSite(session, s.id, s.is_active)
                              },
                              'Status site diperbarui.'
                            )
                          }
                        >
                          {s.is_active ? 'Arsipkan' : 'Aktifkan'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-graphite">
                <CardHeader>
                  <CardTitle className="text-h4">Daftar Area &amp; PIC Area</CardTitle>
                  <CardDescription>
                    PIC Area menjadi penanggung jawab default saat triase kasus dari area tersebut.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      runAction(
                        async () => {
                          await createArea(session, {
                            site_id: Number(areaSiteId),
                            name: areaName.trim(),
                            pic_user_id: areaPicId ? Number(areaPicId) : null,
                          })
                          setAreaName('')
                        },
                        'Area baru berhasil dibuat.'
                      )
                    }}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                  >
                    <select
                      required
                      value={areaSiteId}
                      onChange={(e) => setAreaSiteId(e.target.value)}
                      className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                    >
                      {sites.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={areaPicId}
                      onChange={(e) => setAreaPicId(e.target.value)}
                      className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                    >
                      <option value="">-- PIC Area (Opsional) --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role_label ?? u.role})
                        </option>
                      ))}
                    </select>
                    <Input
                      required
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      placeholder="Nama Area *"
                      className="sm:col-span-2"
                    />
                    <Button type="submit" disabled={submitting} size="sm" variant="industrial" className="sm:col-span-2">
                      Tambah Area (Kode Otomatis)
                    </Button>
                  </form>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {areas.map((a) => (
                      <div
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon px-3 py-2"
                      >
                        <div>
                          <div className="font-semibold text-off-white">
                            <span className="font-mono text-industrial-orange mr-2">{a.code}</span>
                            {a.name}
                          </div>
                          <div className="text-[11px] text-steel-muted">
                            Site: {a.site?.code ?? '-'} | PIC Area: {a.pic_user?.name ?? 'Belum ditentukan'}
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() =>
                            runAction(
                              async () => {
                                await toggleArchiveArea(session, a.id, a.is_active)
                              },
                              'Status area diperbarui.'
                            )
                          }
                        >
                          {a.is_active ? 'Arsipkan' : 'Aktifkan'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {section === 'machines' && (
            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4">Master Mesin &amp; Token QR</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runAction(
                      async () => {
                        await createMachine(session, {
                          area_id: Number(machineAreaId),
                          name: machineName.trim(),
                          description: machineDesc.trim() || undefined,
                        })
                        setMachineName('')
                        setMachineDesc('')
                      },
                      'Mesin baru berhasil dibuat beserta kode & token QR unik.'
                    )
                  }}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-4"
                >
                  <select
                    required
                    value={machineAreaId}
                    onChange={(e) => setMachineAreaId(e.target.value)}
                    className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                  >
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} - {a.name}
                      </option>
                    ))}
                  </select>
                  <Input
                    required
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    placeholder="Nama Mesin *"
                  />
                  <Input
                    value={machineDesc}
                    onChange={(e) => setMachineDesc(e.target.value)}
                    placeholder="Keterangan (opsional)"
                  />
                  <Button type="submit" disabled={submitting} variant="industrial">
                    Tambah Mesin (Kode Otomatis)
                  </Button>
                </form>

                <div className="space-y-2">
                  {machines.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-caption font-bold text-industrial-orange">
                            {m.code}
                          </span>
                          <span className="font-semibold text-off-white">{m.name}</span>
                          {!m.is_active && <Badge variant="danger">Diarsipkan</Badge>}
                        </div>
                        <div className="text-[11px] text-steel-muted">
                          {m.site?.name ?? '-'} | {m.area?.name ?? '-'} | Token: {m.qr_token ?? '-'}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => onOpenQrPrintForMachine(m)}
                          className="gap-1.5"
                        >
                          <QrCode className="h-4 w-4 stroke-[2px]" />
                          Cetak QR
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() =>
                            runAction(
                              async () => {
                                await regenerateMachineQr(session, m.id)
                              },
                              'Token QR mesin diperbarui.'
                            )
                          }
                        >
                          Regenerasi QR
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting}
                          onClick={() =>
                            runAction(
                              async () => {
                                await toggleArchiveMachine(session, m.id, m.is_active)
                              },
                              'Status arsip mesin diperbarui.'
                            )
                          }
                        >
                          {m.is_active ? 'Arsipkan' : 'Aktifkan'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'users' && (
            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Users className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                  Manajemen Pengguna &amp; 4 Peran Resmi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    runAction(
                      async () => {
                        await createUser(session, {
                          name: newUserName.trim(),
                          email: newUserEmail.trim(),
                          password: newUserPassword,
                          role: newUserRole,
                          job_title: newUserJobTitle.trim() || undefined,
                          site_id: sites[0]?.id ?? null,
                        })
                        setNewUserName('')
                        setNewUserEmail('')
                        setNewUserJobTitle('')
                      },
                      'Pengguna baru berhasil didaftarkan.'
                    )
                  }}
                  className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                >
                  <Input
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Nama Lengkap"
                  />
                  <Input
                    required
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="Email Kerja"
                  />
                  <Input
                    required
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Kata Sandi Awal"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRoleCode)}
                    className="h-11 rounded-input border border-charcoal-border bg-[#151A20] px-3 text-body text-off-white"
                  >
                    <option value="reporter">Pelapor</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="hse">K3 / Verifikator</option>
                    <option value="admin">Manajer / Admin</option>
                  </select>
                  <Input
                    value={newUserJobTitle}
                    onChange={(e) => setNewUserJobTitle(e.target.value)}
                    placeholder="Jabatan (opsional)"
                  />
                  <Button type="submit" disabled={submitting} variant="industrial">
                    Tambah Pengguna
                  </Button>
                </form>

                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-charcoal-border bg-carbon p-3"
                    >
                      <div>
                        <div className="font-semibold text-off-white">
                          {u.name}{' '}
                          {u.is_active === false && <Badge variant="danger">Nonaktif</Badge>}
                        </div>
                        <div className="font-mono text-[11px] text-steel-muted">
                          {u.email} | {u.role_label ?? u.role} | {u.job_title ?? '-'}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          aria-label={`Ubah peran ${u.name}`}
                          value={u.role ?? 'reporter'}
                          disabled={submitting}
                          onChange={(e) =>
                            runAction(
                              async () => {
                                await updateUser(session, u.id, {
                                  role: e.target.value as UserRoleCode,
                                })
                              },
                              'Peran pengguna diperbarui.'
                            )
                          }
                          className="h-10 rounded-input border border-charcoal-border bg-[#151A20] px-2.5 text-caption text-off-white"
                        >
                          <option value="reporter">Pelapor</option>
                          <option value="supervisor">Supervisor</option>
                          <option value="hse">K3 / Verifikator</option>
                          <option value="admin">Manajer / Admin</option>
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={submitting || u.id === session.user.id}
                          onClick={() =>
                            runAction(
                              async () => {
                                await updateUser(session, u.id, {
                                  is_active: u.is_active === false,
                                })
                              },
                              'Status aktif pengguna diperbarui.'
                            )
                          }
                        >
                          {u.is_active === false ? 'Aktifkan' : 'Nonaktifkan'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {section === 'risk' && (
            <Card className="bg-graphite">
              <CardHeader>
                <CardTitle className="text-h4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-industrial-orange stroke-[2px]" />
                  Konfigurasi Ambang Risiko, SLA, &amp; Wajib Preventif
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(refData?.risk_configs ?? []).map((rc) => (
                  <div
                    key={rc.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-charcoal-border bg-carbon p-3"
                  >
                    <div>
                      <div className="font-semibold text-off-white">
                        {rc.label} (Skor {rc.min_score} - {rc.max_score})
                      </div>
                      <div className="text-caption text-steel-muted">
                        Respons Awal: {rc.first_response_hours} jam | Sementara: {rc.temporary_action_hours} jam | Permanen: {rc.permanent_action_hours} jam
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={submitting}
                        onClick={() =>
                          runAction(
                            async () => {
                              await updateRiskConfig(session, rc.id, {
                                requires_preventive_action: !rc.requires_preventive_action,
                              })
                            },
                            'Aturan preventif diperbarui.'
                          )
                        }
                      >
                        {rc.requires_preventive_action ? 'Preventif: Wajib' : 'Preventif: Opsional'}
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
