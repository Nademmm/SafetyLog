@use('App\Enums\CaseStatus')
@use('App\Enums\RiskLevel')
@use('Illuminate\Support\Str')

<x-app-layout title="Laporan Saya | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Laporan Saya</h1>
                <p class="page-subtitle">Daftar kasus yang Anda laporkan beserta perkembangan penanganannya.</p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.cases.create') }}" class="btn btn-industrial">Buat Laporan Baru</a>
            </div>
        </div>

        <section class="card" aria-labelledby="filter-my-cases-heading">
            <h2 id="filter-my-cases-heading" class="visually-hidden">Filter Laporan Saya</h2>
            <search>
                <form method="GET" action="{{ route('web.my-cases') }}" class="filter-bar">
                    <div class="form-group">
                        <label for="q">Kata Kunci</label>
                        <input
                            id="q"
                            name="q"
                            type="search"
                            value="{{ $filters['q'] ?? '' }}"
                            placeholder="Nomor kasus, deskripsi, atau mesin..."
                        >
                    </div>
                    <div class="form-group">
                        <label for="status">Status</label>
                        <select id="status" name="status">
                            <option value="">Semua Status</option>
                            @foreach ($statuses as $st)
                                <option value="{{ $st->value }}" @selected(($filters['status'] ?? '') === $st->value)>
                                    {{ $st->label() }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <div class="row-actions">
                        <button type="submit" class="btn btn-primary">Terapkan Filter</button>
                        @if (($filters['q'] ?? '') !== '' || ($filters['status'] ?? '') !== '')
                            <a href="{{ route('web.my-cases') }}" class="btn btn-outline">Reset</a>
                        @endif
                    </div>
                </form>
            </search>
        </section>

        <section class="card" aria-labelledby="my-cases-table-heading">
            <h2 id="my-cases-table-heading">Riwayat Laporan ({{ $cases->total() }})</h2>

            @if ($cases->isEmpty())
                <div class="empty-state">
                    <p>Belum ada laporan yang sesuai filter ini.</p>
                    <a href="{{ route('web.cases.create') }}" class="btn btn-industrial">Lapor Kasus Pertama</a>
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="my-cases-table-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Nomor</th>
                                <th scope="col">Mesin &amp; Jenis</th>
                                <th scope="col">Ringkasan</th>
                                <th scope="col">Risiko</th>
                                <th scope="col">Status</th>
                                <th scope="col">Tanggal</th>
                                <th scope="col">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($cases as $case)
                                @php
                                    $statusBadge = match ($case->status) {
                                        CaseStatus::New => 'badge-info',
                                        CaseStatus::PendingVerification => 'badge-warning',
                                        CaseStatus::Closed => 'badge-safe',
                                        CaseStatus::Rejected, CaseStatus::Duplicate => 'badge-danger',
                                        default => 'badge-caution',
                                    };
                                    $riskBadge = match ($case->risk_level) {
                                        RiskLevel::Low => 'badge-safe',
                                        RiskLevel::Medium => 'badge-caution',
                                        RiskLevel::High => 'badge-danger',
                                        default => '',
                                    };
                                @endphp
                                <tr>
                                    <td data-label="Nomor">
                                        <span class="mono">{{ $case->case_number }}</span>
                                    </td>
                                    <td data-label="Mesin & Jenis">
                                        <div><strong>{{ $case->machine?->name ?? '-' }}</strong></div>
                                        <div class="muted">{{ $case->caseType?->name ?? '-' }}</div>
                                    </td>
                                    <td data-label="Ringkasan">{{ Str::limit($case->description, 95) }}</td>
                                    <td data-label="Risiko">
                                        @if ($case->risk_level)
                                            <span class="badge {{ $riskBadge }}">{{ $case->risk_level->label() }}</span>
                                        @else
                                            <span class="muted">Belum dinilai</span>
                                        @endif
                                    </td>
                                    <td data-label="Status">
                                        <span class="badge {{ $statusBadge }}">{{ $case->status->label() }}</span>
                                    </td>
                                    <td data-label="Tanggal" class="tabular-nums">
                                        {{ $case->reported_at?->format('d M Y') ?? '-' }}
                                    </td>
                                    <td data-label="Aksi">
                                        <a href="{{ route('web.cases.show', $case) }}" class="btn btn-outline btn-sm">Detail</a>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                @if ($cases->hasPages())
                    <div class="pagination-row">
                        <span class="muted tabular-nums">
                            Halaman {{ $cases->currentPage() }} dari {{ $cases->lastPage() }}
                        </span>
                        <div class="row-actions">
                            @if ($cases->onFirstPage())
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Sebelumnya</span>
                            @else
                                <a href="{{ $cases->previousPageUrl() }}" class="btn btn-outline btn-sm">Sebelumnya</a>
                            @endif

                            @if ($cases->hasMorePages())
                                <a href="{{ $cases->nextPageUrl() }}" class="btn btn-outline btn-sm">Berikutnya</a>
                            @else
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Berikutnya</span>
                            @endif
                        </div>
                    </div>
                @endif
            @endif
        </section>
    </div>
</x-app-layout>
