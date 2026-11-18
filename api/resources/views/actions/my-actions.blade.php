@use('App\Enums\ActionStatus')

<x-app-layout title="Tindakan Saya | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Tindakan Saya</h1>
                <p class="page-subtitle">
                    Daftar rencana perbaikan dan pencegahan yang ditugaskan kepada Anda sebagai PIC.
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        <section class="card" aria-labelledby="filter-actions-heading">
            <h2 id="filter-actions-heading" class="visually-hidden">Filter Tindakan</h2>
            <search>
                <form method="GET" action="{{ route('web.my-actions') }}" class="filter-bar">
                    <div class="form-group">
                        <label for="status">Status Tindakan</label>
                        <select id="status" name="status">
                            <option value="open" @selected($statusFilter === 'open')>Terbuka</option>
                            <option value="completed" @selected($statusFilter === 'completed')>Selesai</option>
                            <option value="all" @selected($statusFilter === 'all')>Semua Status</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-row" for="overdue">
                            <input id="overdue" name="overdue" type="checkbox" value="1" @checked($onlyOverdue)>
                            <span>Hanya tampilkan yang melewati tenggat</span>
                        </label>
                    </div>
                    <div class="row-actions">
                        <button type="submit" class="btn btn-primary">Terapkan Filter</button>
                        <a href="{{ route('web.my-actions') }}" class="btn btn-outline">Reset</a>
                    </div>
                </form>
            </search>
        </section>

        <section class="card" aria-labelledby="actions-list-heading">
            <h2 id="actions-list-heading">Daftar Tugas Tindakan ({{ $actions->total() }})</h2>

            @if ($actions->isEmpty())
                <div class="empty-state">
                    <p>Tidak ada tugas tindakan pada filter ini.</p>
                    @if ($statusFilter !== 'all')
                        <a href="{{ route('web.my-actions', ['status' => 'all']) }}" class="btn btn-outline">Lihat Semua Riwayat</a>
                    @endif
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="actions-list-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Kasus &amp; Mesin</th>
                                <th scope="col">Jenis</th>
                                <th scope="col">Tugas Tindakan</th>
                                <th scope="col">Tenggat</th>
                                <th scope="col">Status</th>
                                <th scope="col">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($actions as $action)
                                <tr>
                                    <td data-label="Kasus & Mesin">
                                        @if ($action->safetyCase)
                                            <a href="{{ route('web.cases.show', $action->safetyCase->id) }}" class="mono">
                                                <strong>{{ $action->safetyCase->case_number }}</strong>
                                            </a>
                                            <div class="muted">{{ $action->safetyCase->machine?->name ?? '-' }}</div>
                                        @else
                                            <span class="muted">-</span>
                                        @endif
                                    </td>
                                    <td data-label="Jenis">
                                        <span class="badge">{{ $action->action_type->label() }}</span>
                                    </td>
                                    <td data-label="Tugas Tindakan">
                                        <strong>{{ $action->title }}</strong>
                                        @if ($action->description)
                                            <div class="muted">{{ $action->description }}</div>
                                        @endif
                                        @if ($action->completion_note)
                                            <div class="muted" style="margin-top: 0.3rem;">
                                                <strong>Catatan selesai:</strong> {{ $action->completion_note }}
                                            </div>
                                        @endif
                                    </td>
                                    <td data-label="Tenggat" class="tabular-nums">
                                        {{ $action->due_at->format('d M Y') }}
                                        @if ($action->isOverdue())
                                            <div><span class="badge badge-danger">Terlambat</span></div>
                                        @endif
                                    </td>
                                    <td data-label="Status">
                                        <span class="badge {{ $action->status === ActionStatus::Completed ? 'badge-safe' : 'badge-warning' }}">
                                            {{ $action->status->label() }}
                                        </span>
                                    </td>
                                    <td data-label="Aksi">
                                        @if ($action->status === ActionStatus::Open && !($action->safetyCase?->is_locked ?? false))
                                            <button
                                                type="button"
                                                class="btn btn-industrial btn-sm"
                                                data-complete-action="{{ $action->id }}"
                                                data-action-title="{{ $action->title }}"
                                            >
                                                Selesaikan
                                            </button>
                                        @elseif ($action->safetyCase)
                                            <a href="{{ route('web.cases.show', $action->safetyCase->id) }}" class="btn btn-outline btn-sm">Lihat Kasus</a>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                @if ($actions->hasPages())
                    <div class="pagination-row">
                        <span class="muted tabular-nums">
                            Halaman {{ $actions->currentPage() }} dari {{ $actions->lastPage() }}
                        </span>
                        <div class="row-actions">
                            @if ($actions->onFirstPage())
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Sebelumnya</span>
                            @else
                                <a href="{{ $actions->previousPageUrl() }}" class="btn btn-outline btn-sm">Sebelumnya</a>
                            @endif

                            @if ($actions->hasMorePages())
                                <a href="{{ $actions->nextPageUrl() }}" class="btn btn-outline btn-sm">Berikutnya</a>
                            @else
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Berikutnya</span>
                            @endif
                        </div>
                    </div>
                @endif
            @endif
        </section>
    </div>

    <dialog id="completeActionDialog" aria-labelledby="completeDialogTitle">
        <div class="modal-header">
            <h2 id="completeDialogTitle" class="modal-title">Selesaikan Tindakan</h2>
            <button id="btnCloseCompleteDialog" type="button" class="close-btn" aria-label="Tutup dialog">&times;</button>
        </div>
        <p id="completeActionTitle" style="font-weight: 600; margin-top: 0;"></p>
        <div id="completeFeedback" class="alert alert-error" role="alert" hidden></div>

        <form id="completeActionForm" novalidate>
            <div class="form-group">
                <label for="completion_note">Catatan Penyelesaian *</label>
                <textarea
                    id="completion_note"
                    name="completion_note"
                    required
                    minlength="5"
                    aria-invalid="false"
                    placeholder="Jelaskan hasil perbaikan atau tindakan pencegahan yang dilakukan..."
                ></textarea>
            </div>
            <div class="form-group">
                <label for="completePhotos">Foto Bukti (Opsional)</label>
                <input id="completePhotos" name="photos[]" type="file" multiple accept="image/jpeg,image/png,image/webp">
            </div>
            <div class="row-actions">
                <button type="submit" class="btn btn-industrial">Simpan Penyelesaian</button>
            </div>
        </form>
    </dialog>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/my-actions.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
