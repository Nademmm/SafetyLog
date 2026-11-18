<x-app-layout title="Masuk ke SafetyLog">
    <div class="login-wrap">
        <section class="card" aria-labelledby="login-heading">
            <div class="login-header">
                <span class="brand-mark" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                </span>
                <div>
                    <h1 id="login-heading">Masuk ke SafetyLog</h1>
                </div>
            </div>
            <p class="muted">Catat temuan K3 dan gangguan mesin, tindak lanjuti sampai tuntas.</p>

            @if (session('error'))
                <div class="alert alert-error" role="alert">{{ session('error') }}</div>
            @endif

            @if (session('rate_limit'))
                <div class="alert alert-error" role="alert">
                    <strong>Terlalu banyak percobaan gagal.</strong>
                    Silakan coba lagi dalam {{ session('rate_limit') }} detik.
                </div>
            @endif

            @if ($errors->any())
                <div class="alert alert-error" role="alert">
                    @foreach ($errors->all() as $error)
                        <div>{{ $error }}</div>
                    @endforeach
                </div>
            @endif

            <form method="POST" action="{{ route('web.login.post') }}">
                @csrf
                <div class="form-group">
                    <label for="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value="{{ old('email') }}"
                        placeholder="nama@perusahaan.co.id"
                        autocomplete="email"
                        autocorrect="off"
                        autocapitalize="none"
                        spellcheck="false"
                        enterkeyhint="next"
                        required
                    >
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="password-wrap">
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Masukkan password"
                            autocomplete="current-password"
                            enterkeyhint="done"
                            required
                        >
                        <button
                            type="button"
                            class="btn btn-outline btn-sm"
                            data-toggle-password="password"
                            aria-pressed="false"
                            aria-label="Tampilkan atau sembunyikan password"
                        >Tampilkan</button>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="width:100%;">Masuk ke SafetyLog</button>
            </form>

            <div class="hint" style="margin-top:1.25rem; padding-top:0.85rem; border-top:1px solid var(--border-subtle);">
                <div><strong>Akun Demo (password: <code class="mono">password123</code>):</strong></div>
                <ul style="margin:0.4rem 0 0; padding-left:1.1rem;">
                    <li>Pelapor: <code class="mono">pelapor@safetylog.test</code></li>
                    <li>Supervisor: <code class="mono">supervisor@safetylog.test</code></li>
                    <li>K3/Verifikator: <code class="mono">k3@safetylog.test</code></li>
                    <li>Manajer/Admin: <code class="mono">admin@safetylog.test</code></li>
                </ul>
            </div>
        </section>
    </div>
</x-app-layout>
