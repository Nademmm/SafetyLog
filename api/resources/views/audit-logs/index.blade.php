@php
    $actionOptions = [
        'case_reported' => 'Kasus Dilaporkan',
        'case_triaged' => 'Triase & Penilaian Risiko',
        'case_rejected' => 'Kasus Ditolak',
        'case_marked_duplicate' => 'Ditandai Duplikat',
        'root_cause_analyzed' => 'Analisis Akar Masalah',
        'action_created' => 'Tindakan Ditambahkan',
        'action_updated' => 'Tindakan Diubah',
        'action_completed' => 'Tindakan Diselesaikan',
        'all_actions_completed' => 'Semua Tindakan Selesai',
        'action_reopened' => 'Tindakan Dibuka Ulang',
        'verification_approved' => 'Verifikasi Disetujui (Selesai)',
        'verification_rejected' => 'Verifikasi Ditolak',
        'case_reopened' => 'Kasus Dibuka Ulang',
    ];
@endphp

<x-app-layout title="Riwayat Perubahan (Audit Log) | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Riwayat Perubahan (Audit Log)</h1>
                <p class="page-subtitle">
                    Jejak audit append-only seluruh transisi status kasus. Data riwayat ini bersifat permanen dan tidak dapat diubah atau dihapus.
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.cases.index') }}" class="btn btn-outline">Semua Kasus</a>
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        <section class="card" aria-labelledby="filter-audit-heading">
            <h2 id="filter-audit-heading" class="visually-hidden">Filter Riwayat Audit</h2>
            <search>
                <form method="GET" action="{{ route('web.audit-logs') }}" class="filter-bar">
                    <div class="form-group">
                        <label for="action_name">Jenis Aktivitas</label>
                        <select id="action_name" name="action_name">
                            <option value="">Semua Aktivitas</option>
                            @foreach ($actionOptions as $key => $label)
                                <option value="{{ $key }}" @selected($selectedAction === $key)>
                                    {{ $label }} ({{ $key }})
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <div class="row-actions">
                        <button type="submit" class="btn btn-primary">Terapkan Filter</button>
                        @if ($selectedAction !== '')
                            <a href="{{ route('web.audit-logs') }}" class="btn btn-outline">Reset</a>
                        @endif
                    </div>
                </form>
            </search>
        </section>

        <section class="card" aria-labelledby="audit-table-heading">
            <h2 id="audit-table-heading">Catatan Audit ({{ $histories->total() }})</h2>

            @if ($histories->isEmpty())
                <div class="empty-state">
                    <p>Belum ada catatan audit pada filter ini.</p>
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="audit-table-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Waktu</th>
                                <th scope="col">Kasus</th>
                                <th scope="col">Aktivitas</th>
                                <th scope="col">Transisi Status</th>
                                <th scope="col">Aktor</th>
                                <th scope="col">Catatan</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($histories as $hist)
                                <tr>
                                    <td data-label="Waktu" class="tabular-nums">
                                        {{ $hist->created_at?->format('d M Y H:i') ?? '-' }}
                                    </td>
                                    <td data-label="Kasus">
                                        @if ($hist->safetyCase)
                                            <a href="{{ route('web.cases.show', $hist->safetyCase->id) }}" class="mono">
                                                {{ $hist->safetyCase->case_number }}
                                            </a>
                                        @else
                                            <span class="muted">-</span>
                                        @endif
                                    </td>
                                    <td data-label="Aktivitas">
                                        <span class="badge">{{ $actionOptions[$hist->action_name] ?? $hist->action_name }}</span>
                                    </td>
                                    <td data-label="Transisi Status">
                                        {{ $hist->from_status?->label() ?? '-' }} ke {{ $hist->to_status?->label() ?? '-' }}
                                    </td>
                                    <td data-label="Aktor">
                                        {{ $hist->changedBy?->name ?? 'Sistem' }}
                                        @if ($hist->changedBy?->role)
                                            <div class="muted">{{ $hist->changedBy->role->label() }}</div>
                                        @endif
                                    </td>
                                    <td data-label="Catatan">{{ $hist->reason ?? '-' }}</td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                @if ($histories->hasPages())
                    <div class="pagination-row">
                        <span class="muted tabular-nums">
                            Halaman {{ $histories->currentPage() }} dari {{ $histories->lastPage() }}
                        </span>
                        <div class="row-actions">
                            @if ($histories->onFirstPage())
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Sebelumnya</span>
                            @else
                                <a href="{{ $histories->previousPageUrl() }}" class="btn btn-outline btn-sm">Sebelumnya</a>
                            @endif

                            @if ($histories->hasMorePages())
                                <a href="{{ $histories->nextPageUrl() }}" class="btn btn-outline btn-sm">Berikutnya</a>
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
