<x-app-layout title="Notifikasi | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Notifikasi</h1>
                <p class="page-subtitle">
                    Pemberitahuan penugasan tindakan, eskalasi tenggat, dan status verifikasi kasus Anda.
                </p>
            </div>
            <div class="row-actions">
                @if ($unreadCount > 0)
                    <button id="btnMarkAllRead" type="button" class="btn btn-primary">
                        Tandai Semua Dibaca ({{ $unreadCount }})
                    </button>
                @endif
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        <section class="card" aria-labelledby="notifications-heading">
            <h2 id="notifications-heading">Kotak Masuk ({{ $notifications->total() }})</h2>

            @if ($notifications->isEmpty())
                <div class="empty-state">
                    <p>Belum ada notifikasi saat ini.</p>
                    <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Kembali ke Dashboard</a>
                </div>
            @else
                <ul class="timeline-list">
                    @foreach ($notifications as $notif)
                        <li class="timeline-item {{ $notif->read_at === null ? 'timeline-item-unread' : '' }}">
                            <div class="row-actions" style="justify-content: space-between;">
                                <div>
                                    <strong>{{ $notif->title }}</strong>
                                    @if ($notif->read_at === null)
                                        <span class="badge badge-warning" style="margin-left: 0.35rem;">Belum dibaca</span>
                                    @else
                                        <span class="badge" style="margin-left: 0.35rem;">Dibaca</span>
                                    @endif
                                </div>
                                <span class="muted tabular-nums">{{ $notif->created_at?->format('d M Y H:i') ?? '-' }}</span>
                            </div>

                            <p style="margin: 0.45rem 0 0.75rem;">{{ $notif->body }}</p>

                            <div class="row-actions">
                                @if ($notif->safetyCase)
                                    <a href="{{ route('web.cases.show', $notif->safetyCase->id) }}" class="btn btn-outline btn-sm">
                                        Buka Kasus <span class="mono">{{ $notif->safetyCase->case_number }}</span>
                                    </a>
                                @endif
                                @if ($notif->read_at === null)
                                    <button type="button" class="btn btn-primary btn-sm" data-mark-read="{{ $notif->id }}">
                                        Tandai Dibaca
                                    </button>
                                @endif
                            </div>
                        </li>
                    @endforeach
                </ul>

                @if ($notifications->hasPages())
                    <div class="pagination-row">
                        <span class="muted tabular-nums">
                            Halaman {{ $notifications->currentPage() }} dari {{ $notifications->lastPage() }}
                        </span>
                        <div class="row-actions">
                            @if ($notifications->onFirstPage())
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Sebelumnya</span>
                            @else
                                <a href="{{ $notifications->previousPageUrl() }}" class="btn btn-outline btn-sm">Sebelumnya</a>
                            @endif

                            @if ($notifications->hasMorePages())
                                <a href="{{ $notifications->nextPageUrl() }}" class="btn btn-outline btn-sm">Berikutnya</a>
                            @else
                                <span class="btn btn-outline btn-sm" aria-disabled="true">Berikutnya</span>
                            @endif
                        </div>
                    </div>
                @endif
            @endif
        </section>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/notifications.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
