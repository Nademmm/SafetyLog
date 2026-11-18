<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @if (session('sl_token'))
        <meta name="sl-token" content="{{ session('sl_token') }}">
        <meta name="sl-user" content="{{ json_encode(session('sl_user')) }}">
    @endif
    <title>{{ $title ?? 'SafetyLog' }}</title>
    <link rel="stylesheet" href="{{ asset('css/style.css') }}">
</head>
<body>
    @php
        $navUser = $currentUser ?? session('sl_user');
        $navRole = $navUser['role'] ?? null;
    @endphp

    @if ($navUser)
        <a href="#main-content" class="skip-link visually-hidden">Langsung ke konten utama</a>
        <header class="site-header">
            <div class="header-inner">
                <a class="brand-link" href="{{ route('web.dashboard') }}">
                    <span class="brand-mark" aria-hidden="true">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                    </span>
                    <span>SafetyLog</span>
                </a>

                <nav class="site-nav" aria-label="Utama">
                    <button
                        class="menu-button"
                        type="button"
                        popovertarget="site-menu"
                        popovertargetaction="toggle"
                        aria-controls="site-menu"
                    >
                        <span>Menu</span>
                    </button>

                    <ul id="site-menu" class="site-menu" popover="auto">
                        <li>
                            <a class="nav-link" href="{{ route('web.dashboard') }}" @if (request()->routeIs('web.dashboard')) aria-current="page" @endif>Dashboard</a>
                        </li>
                        <li>
                            <a class="nav-link" href="{{ route('web.cases.create') }}" @if (request()->routeIs('web.cases.create')) aria-current="page" @endif>Lapor Kasus</a>
                        </li>
                        <li>
                            <a class="nav-link" href="{{ route('web.my-cases') }}" @if (request()->routeIs('web.my-cases')) aria-current="page" @endif>Laporan Saya</a>
                        </li>
                        <li>
                            <a class="nav-link" href="{{ route('web.my-actions') }}" @if (request()->routeIs('web.my-actions')) aria-current="page" @endif>Tindakan Saya</a>
                        </li>
                        @if (in_array($navRole, ['supervisor', 'hse', 'admin'], true))
                            <li>
                                <a class="nav-link" href="{{ route('web.cases.index') }}" @if (request()->routeIs('web.cases.index')) aria-current="page" @endif>Semua Kasus</a>
                            </li>
                            <li>
                                <a class="nav-link" href="{{ route('web.audit-logs') }}" @if (request()->routeIs('web.audit-logs')) aria-current="page" @endif>Audit Log</a>
                            </li>
                        @endif
                        @if ($navRole === 'admin')
                            <li>
                                <a class="nav-link" href="{{ route('web.sites') }}" @if (request()->routeIs('web.sites')) aria-current="page" @endif>Pabrik</a>
                            </li>
                            <li>
                                <a class="nav-link" href="{{ route('web.areas') }}" @if (request()->routeIs('web.areas')) aria-current="page" @endif>Area</a>
                            </li>
                            <li>
                                <a class="nav-link" href="{{ route('web.machines') }}" @if (request()->routeIs('web.machines')) aria-current="page" @endif>Mesin</a>
                            </li>
                            <li>
                                <a class="nav-link" href="{{ route('web.users') }}" @if (request()->routeIs('web.users')) aria-current="page" @endif>Pengguna</a>
                            </li>
                            <li>
                                <a class="nav-link" href="{{ route('web.configurations') }}" @if (request()->routeIs('web.configurations')) aria-current="page" @endif>Konfigurasi</a>
                            </li>
                        @endif
                        <li>
                            <a class="nav-link" href="{{ route('web.notifications') }}" @if (request()->routeIs('web.notifications')) aria-current="page" @endif>Notifikasi</a>
                        </li>
                    </ul>
                </nav>

                <div class="user-actions">
                    <span class="user-chip">
                        <strong>{{ $navUser['role_label'] ?? $navRole }}</strong>
                        <span>{{ $navUser['name'] }}</span>
                    </span>
                    <form method="POST" action="{{ route('web.logout') }}">
                        @csrf
                        <button type="submit" class="btn btn-danger btn-sm">Keluar</button>
                    </form>
                </div>
            </div>
        </header>
    @endif

    <main id="main-content" tabindex="-1">
        {{ $slot }}
    </main>

    <script type="module" src="{{ asset('js/app-shell.js') }}"></script>
    <script type="module" src="{{ asset('js/guard.js') }}"></script>
    @if (isset($scripts))
        {{ $scripts }}
    @endif
</body>
</html>
