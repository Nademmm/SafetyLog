<x-app-layout title="Dashboard — SafetyLog">
    <div class="topbar" x-slot="header">
        <h1>SafetyLog</h1>
        <div class="nav-links">
            <span class="user-chip">{{ $user['role'] }} · {{ $user['name'] }}</span>
            <form method="POST" action="{{ route('web.logout') }}">
                @csrf
                <button type="submit" class="btn btn-danger">Keluar</button>
            </form>
        </div>
    </div>

    <div class="container" x-slot="content">
        <div class="card">
            <h2>Selamat datang, {{ $user['name'] }}</h2>
            <p class="muted">
                Peran: <strong>{{ $user['role'] }}</strong> |
                Organisasi: <strong>ID {{ $user['organization_id'] }}</strong>
            </p>
        </div>

        <div class="card">
            <h2>Menu yang Tersedia</h2>
            <p class="muted">Akses menyesuaikan peran Anda. Halaman di luar hak peran akan ditolak (HTTP 403).</p>

            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1rem;">
                @if ($user['role'] === 'admin')
                    <a href="{{ route('web.sites') }}" class="btn btn-primary" style="width:100%; text-align:center; text-decoration:none;">Kelola Pabrik</a>
                    <a href="{{ route('web.areas') }}" class="btn btn-primary" style="width:100%; text-align:center; text-decoration:none;">Kelola Area</a>
                    <a href="{{ route('web.machines') }}" class="btn btn-primary" style="width:100%; text-align:center; text-decoration:none;">Kelola Mesin</a>
                @else
                    <button type="button" class="btn btn-outline" disabled style="width:100%; text-align:center;">Lapor Kasus Baru — Segera hadir</button>
                    <button type="button" class="btn btn-outline" disabled style="width:100%; text-align:center;">Kasus Saya — Segera hadir</button>
                    <button type="button" class="btn btn-outline" disabled style="width:100%; text-align:center;">Tindakan Saya — Segera hadir</button>
                @endif
            </div>

            @if ($user['role'] === 'admin')
                <div style="margin-top:1rem; padding:1rem; background:#fef3c7; border:1px solid #f59e0b; border-radius:0.5rem;">
                    <strong>Catatan Admin:</strong> Kelola area dan mesin hanya dapat diakses peran admin.
                </div>
            @endif
        </div>
    </div>
</x-app-layout>
