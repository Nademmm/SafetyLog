@use('App\Enums\CaseStatus')
@use('App\Enums\RiskLevel')
@use('Illuminate\Support\Str')

<x-app-layout title="Antrean & Pencarian Kasus | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Semua Kasus &amp; Pencarian</h1>
                <p class="page-subtitle">
                    Pantau antrean triase, status tindakan perbaikan, dan histori masalah mesin di organisasi Anda.
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.cases.create') }}" class="btn btn-industrial">Buat Laporan Baru</a>
            </div>
        </div>

        <section class="card" aria-labelledby="search-cases-heading">
            <h2 id="search-cases-heading" class="visually-hidden">Cari dan Filter Kasus</h2>
            <search>
                <form method="GET" action="{{ route('web.cases.index') }}" class="filter-bar">
                    <div class="form-group">
                        <label for="q">Kata Kunci (Toleran Salah Ketik)</label>
                        <input
                            id="q"
                            name="q"
                            type="search"
                            value="{{ $filters['q'] ?? '' }}"
                            placeholder="Contoh: konveyor, kebocoran oli, SL-..."
                        >
                    </div>

                    <div class="form-group">
                        <label for="status">Status Kasus</label>
                        <select id="status" name="status">
                            <option value="">Semua Status</option>
                            @foreach ($statuses as $st)
                                <option value="{{ $st->value }}" @selected(($filters['status'] ?? '') === $st->value)>
                                    {{ $st->label() }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="risk_level">Level Risiko</label>
                        <select id="risk_level" name="risk_level">
                            <option value="">Semua Level Risiko</option>
                            @foreach ($riskLevels as $rl)
                                <option value="{{ $rl->value }}" @selected(($filters['risk_level'] ?? '') === $rl->value)>
                                    {{ $rl->label() }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="machine_id">Mesin</label>
                        <select id="machine_id" name="machine_id">
                            <option value="">Semua Mesin</option>
                            @foreach ($machines as $m)
                                <option value="{{ $m->id }}" @selected((string) ($filters['machine_id'] ?? '') === (string) $m->id)>
                                    [{{ $m->code }}] {{ $m->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="category_id">Kategori</label>
                        <select id="category_id" name="category_id">
                            <option value="">Semua Kategori</option>
                            @foreach ($categories as $cat)
                                <option value="{{ $cat->id }}" @selected((string) ($filters['category_id'] ?? '') === (string) $cat->id)>
                                    {{ $cat->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div class="row-actions">
                        <button type="submit" class="btn btn-primary">Cari Kasus</button>
                        @if (collect($filters)->filter(fn ($v) => $v !== null && $v !== '')->isNotEmpty())
                            <a href="{{ route('web.cases.index') }}" class="btn btn-outline">Reset Filter</a>
                        @endif
                    </div>
                </form>
            </search>
        </section>

        <section class="card" aria-labelledby="all-cases-table-heading">
            <h2 id="all-cases-table-heading">Daftar Kasus ({{ $cases->total() }})</h2>

            @if ($cases->isEmpty())
                <div class="empty-state">
                    <p>Tidak ditemukan kasus yang cocok dengan kriteria pencarian.</p>
                    <a href="{{ route('web.cases.index') }}" class="btn btn-outline">Tampilkan Semua Kasus</a>
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="all-cases-table-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Nomor</th>
                                <th scope="col">Mesin &amp; Lokasi</th>
                                <th scope="col">Deskripsi</th>
                                <th scope="col">Pelapor &amp; PIC</th>
                                <th scope="col">Risiko</th>
                                <th scope="col">Status</th>
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
                                        <div class="muted">{{ $case->caseType?->name ?? '-' }}</div>
                                    </td>
                                    <td data-label="Mesin & Lokasi">
                                        <div><strong>{{ $case->machine?->name ?? '-' }}</strong></div>
                                        <div class="muted">{{ $case->site?->name ?? '-' }} / {{ $case->area?->name ?? '-' }}</div>
                                    </td>
                                    <td data-label="Deskripsi">{{ Str::limit($case->description, 90) }}</td>
                                    <td data-label="Pelapor & PIC">
                                        <div>Pelapor: {{ $case->reporter?->name ?? '-' }}</div>
                                        <div class="muted">PIC: {{ $case->assignedPic?->name ?? 'Belum ditetapkan' }}</div>
                                    </td>
                                    <td data-label="Risiko">
                                        @if ($case->risk_level)
                                            <span class="badge {{ $riskBadge }}">{{ $case->risk_level->label() }} ({{ $case->risk_score }})</span>
                                        @else
                                            <span class="muted">Belum dinilai</span>
                                        @endif
                                    </td>
                                    <td data-label="Status">
                                        <span class="badge {{ $statusBadge }}">{{ $case->status->label() }}</span>
                                    </td>
                                    <td data-label="Aksi">
                                        <a href="{{ route('web.cases.show', $case) }}" class="btn btn-outline btn-sm">Buka Kasus</a>
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
