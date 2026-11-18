<x-app-layout title="Masuk — SafetyLog">
    <div class="login-wrap" x-slot="content">
        <div class="card login-card">
            <div class="card-header">
                <span style="font-size: 1.6rem;">🛡️</span>
                <h2>Masuk ke SafetyLog</h2>
            </div>
            <p class="muted">Sistem laporan keselamatan kerja dan keandalan mesin.</p>

            @if (session('error'))
                <div class="alert alert-error">{{ session('error') }}</div>
            @endif

            @if (session('rate_limit'))
                <div class="alert alert-error">
                    <strong>Terlalu banyak percobaan gagal.</strong> Silakan coba lagi dalam {{ session('rate_limit') }} detik.
                </div>
            @endif

            @if ($errors->any())
                <div class="alert alert-error">
                    @foreach ($errors->all() as $error)
                        <div>{{ $error }}</div>
                    @endforeach
                </div>
            @endif

            <form method="POST" action="{{ route('web.login.post') }}">
                @csrf
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" value="{{ old('email') }}" placeholder="pelapor@safetylog.test" required>
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="••••••••" required>
                </div>
                <button type="submit" class="btn btn-primary" style="width:100%;">Masuk</button>
            </form>

            <p class="hint" style="margin-top:1rem;">
                Akun demo: 
                <br><code>pelapor@safetylog.test</code>, <code>supervisor@safetylog.test</code>, 
                <code>k3@safetylog.test</code>, <code>admin@safetylog.test</code> 
                (password: <code>password123</code>)
            </p>
        </div>
    </div>
</x-app-layout>
