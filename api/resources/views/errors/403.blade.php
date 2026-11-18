<x-app-layout :title="$title ?? 'Akses Ditolak (403) | SafetyLog'">
    @php
        $activeUser = $user ?? session('sl_user');
        $path = $requestedPath ?? ('/' . ltrim(request()->path(), '/'));
        $reason = isset($exception) && $exception->getMessage() !== ''
            ? $exception->getMessage()
            : 'Peran Anda tidak memiliki hak akses untuk membuka halaman ini.';
    @endphp

    <div class="container">
        <section class="card" aria-labelledby="forbidden-heading">
            <span class="badge badge-danger">HTTP 403 | Akses Ditolak</span>
            <h1 id="forbidden-heading" class="page-title" style="margin-top:0.75rem;">
                Anda tidak memiliki izin membuka halaman ini
            </h1>
            <p class="page-subtitle">{{ $reason }}</p>

            <div class="alert alert-error" style="margin-top:1rem;">
                <div><strong>Halaman diminta:</strong> <code class="mono">{{ $path }}</code></div>
                @if ($activeUser)
                    <div>
                        <strong>Akun aktif:</strong> {{ $activeUser['name'] }}
                        ({{ $activeUser['role_label'] ?? $activeUser['role'] }})
                    </div>
                @endif
                @if (! empty($allowedRoles))
                    <div><strong>Peran yang diizinkan:</strong> {{ implode(', ', $allowedRoles) }}</div>
                @endif
            </div>

            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-primary">Kembali ke Dashboard</a>
                @if ($activeUser)
                    <form method="POST" action="{{ route('web.logout') }}">
                        @csrf
                        <button type="submit" class="btn btn-outline">Ganti Akun (Keluar)</button>
                    </form>
                @endif
            </div>
        </section>
    </div>
</x-app-layout>
