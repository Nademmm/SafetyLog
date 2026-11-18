<x-app-layout title="Dashboard | SafetyLog">
    @php
        $role = $user['role'];
        $roleLabel = $user['role_label'] ?? $role;
    @endphp

    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Selamat datang, {{ $user['name'] }}</h1>
                <p class="page-subtitle">
                    Peran: <strong>{{ $roleLabel }}</strong> (<span class="mono">{{ $role }}</span>) |
                    {{ $user['organization_name'] ?? 'Organisasi ID ' . $user['organization_id'] }}
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.cases.create') }}" class="btn btn-industrial">Buat Laporan Baru</a>
                <a href="{{ route('web.notifications') }}" class="btn btn-outline">
                    Notifikasi ({{ $unreadNotifications }})
                </a>
            </div>
        </div>

        <section class="card" aria-labelledby="role-actions-heading">
            <h2 id="role-actions-heading">Menu Sesuai Peran Anda</h2>
            <p class="muted">
                Seluruh rute dijaga oleh server. Halaman di luar hak peran Anda akan ditolak dengan HTTP 403.
            </p>

            <div class="action-grid">
                <a href="{{ route('web.cases.create') }}" class="btn btn-primary">Lapor Kasus Baru</a>
                <a href="{{ route('web.my-cases') }}" class="btn btn-outline">Laporan Saya ({{ $myReportedOpenCount }} terbuka)</a>
                <a href="{{ route('web.my-actions') }}" class="btn btn-outline">
                    Tindakan Saya ({{ $myOpenActionsCount }} terbuka{{ $myOverdueActionsCount > 0 ? ', ' . $myOverdueActionsCount . ' terlambat' : '' }})
                </a>

                @if (in_array($role, ['supervisor', 'hse', 'admin'], true))
                    <a href="{{ route('web.cases.index', ['status' => 'new']) }}" class="btn btn-outline">
                        Antrean Triase Baru ({{ $newCasesQueueCount }})
                    </a>
                    <a href="{{ route('web.cases.index') }}" class="btn btn-outline">Semua Kasus &amp; Pencarian</a>
                    <a href="{{ route('web.audit-logs') }}" class="btn btn-outline">Riwayat Perubahan (Audit Log)</a>
                @endif

                @if ($role === 'hse')
                    <a href="{{ route('web.cases.index', ['status' => 'pending_verification']) }}" class="btn btn-industrial">
                        Antrean Verifikasi ({{ $dashboardData['summary']['pending_verification_count'] ?? 0 }})
                    </a>
                @endif

                @if ($role === 'admin')
                    <a href="{{ route('web.sites') }}" class="btn btn-outline">Kelola Pabrik</a>
                    <a href="{{ route('web.areas') }}" class="btn btn-outline">Kelola Area</a>
                    <a href="{{ route('web.machines') }}" class="btn btn-outline">Kelola Mesin</a>
                    <a href="{{ route('web.users') }}" class="btn btn-outline">Kelola Pengguna</a>
                    <a href="{{ route('web.configurations') }}" class="btn btn-outline">Konfigurasi Risiko</a>
                @endif
            </div>
        </section>

        @if ($dashboardData !== null)
            <section aria-labelledby="kpi-heading">
                <h2 id="kpi-heading" class="visually-hidden">Ringkasan Operasional Pabrik</h2>
                <div class="kpi-grid">
                    <div class="kpi-card">
                        <div class="kpi-label">Kasus Terbuka</div>
                        <div class="kpi-value tabular-nums">{{ $dashboardData['summary']['open_cases_count'] }}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Tindakan Terlambat</div>
                        <div class="kpi-value tabular-nums {{ $dashboardData['summary']['overdue_actions_count'] > 0 ? 'kpi-value-danger' : '' }}">
                            {{ $dashboardData['summary']['overdue_actions_count'] }}
                        </div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Menunggu Verifikasi</div>
                        <div class="kpi-value tabular-nums">{{ $dashboardData['summary']['pending_verification_count'] }}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Selesai Bulan Ini</div>
                        <div class="kpi-value tabular-nums">{{ $dashboardData['summary']['closed_this_month_count'] }}</div>
                    </div>
                </div>
            </section>
        @endif

        <div class="split-grid">
            <section class="card" aria-labelledby="my-actions-preview-heading">
                <h2 id="my-actions-preview-heading">Tindakan Aktif Saya</h2>
                @if ($myOpenActions->isEmpty())
                    <div class="empty-state">
                        <p>Belum ada tindakan terbuka yang ditugaskan kepada Anda.</p>
                        <a href="{{ route('web.my-actions', ['status' => 'all']) }}" class="btn btn-outline btn-sm">Lihat Riwayat Tindakan</a>
                    </div>
                @else
                    <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="my-actions-preview-heading">
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">Kasus</th>
                                    <th scope="col">Tindakan</th>
                                    <th scope="col">Tenggat</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($myOpenActions as $action)
                                    <tr>
                                        <td data-label="Kasus">
                                            <a href="{{ route('web.cases.show', $action->safety_case_id) }}" class="mono">
                                                {{ $action->safetyCase->case_number ?? '-' }}
                                            </a>
                                        </td>
                                        <td data-label="Tindakan">{{ $action->title }}</td>
                                        <td data-label="Tenggat" class="tabular-nums">
                                            {{ $action->due_at->format('d M Y') }}
                                            @if ($action->isOverdue())
                                                <span class="badge badge-danger">Terlambat</span>
                                            @endif
                                        </td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                @endif
            </section>

            @if ($dashboardData !== null)
                <section class="card" aria-labelledby="machine-freq-heading">
                    <h2 id="machine-freq-heading">Masalah per Mesin (90 Hari Terakhir)</h2>
                    @if ($dashboardData['cases_per_machine']->isEmpty())
                        <div class="empty-state">
                            <p>Belum ada mesin aktif terdaftar.</p>
                        </div>
                    @else
                        <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="machine-freq-heading">
                            <table>
                                <thead>
                                    <tr>
                                        <th scope="col">Mesin</th>
                                        <th scope="col">90 Hari</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($dashboardData['cases_per_machine']->take(6) as $row)
                                        <tr>
                                            <td data-label="Mesin">{{ $row['machine_name'] }}</td>
                                            <td data-label="90 Hari" class="tabular-nums">{{ $row['cases_last_90_days'] }} kasus</td>
                                            <td data-label="Status">
                                                @if ($row['is_recurring'])
                                                    <span class="badge badge-danger">Berulang</span>
                                                @else
                                                    <span class="badge badge-safe">Normal</span>
                                                @endif
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        </div>
                    @endif
                </section>
            @endif
        </div>
    </div>
</x-app-layout>
