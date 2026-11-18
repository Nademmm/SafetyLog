<x-app-layout title="Kelola Pabrik — SafetyLog">
    <div class="topbar">
        <h1>Kelola Pabrik</h1>
        <div class="nav-links">
            <a href="{{ route('web.dashboard') }}" class="btn btn-outline">← Kembali</a>
            <form method="POST" action="{{ route('web.logout') }}">
                @csrf
                <button type="submit" class="btn btn-danger">Keluar</button>
            </form>
        </div>
    </div>

    <div class="container">
        <div class="card">
            <h2>Daftar Pabrik</h2>
            <p class="muted">Pabrik adalah induk dari area produksi dan dibatasi berdasarkan organisasi Anda.</p>

            <div id="alert" class="alert alert-error" style="display:none;"></div>
            <div id="alertSuccess" class="alert alert-success" style="display:none;"></div>
            <button class="btn btn-primary" id="btnAddSite" style="margin-bottom:1rem;">+ Tambah Pabrik</button>

            <table>
                <thead>
                    <tr>
                        <th>Nama Pabrik</th>
                        <th>Kode</th>
                        <th>Alamat</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($sites as $site)
                        <tr>
                            <td>{{ $site->name }}</td>
                            <td><code>{{ $site->code }}</code></td>
                            <td>{{ $site->address ?? '—' }}</td>
                            <td>
                                <span class="badge {{ $site->is_active ? 'badge-active' : 'badge-archived' }}">
                                    {{ $site->is_active ? 'Aktif' : 'Arsip' }}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="app.editSite({{ $site->id }})">Ubah</button>
                                <button class="btn btn-{{ $site->is_active ? 'danger' : 'outline' }} btn-sm"
                                    onclick="app.toggleArchive({{ $site->id }}, {{ $site->is_active ? 'true' : 'false' }})">
                                    {{ $site->is_active ? 'Arsipkan' : 'Aktifkan' }}
                                </button>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>

    <div class="modal" id="modalSite">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalSiteTitle">Tambah Pabrik</h3>
                <button class="close-btn" id="btnCloseSite">&times;</button>
            </div>
            <form id="formSite">
                <input type="hidden" id="siteId">
                <div class="form-group">
                    <label>Nama Pabrik <span style="color:#dc2626;">*</span></label>
                    <input type="text" id="siteName" placeholder="Contoh: Pabrik Surabaya" required>
                </div>
                <div class="form-group">
                    <label>Alamat</label>
                    <textarea id="siteAddress" rows="3" placeholder="Alamat lengkap pabrik"></textarea>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelSite">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveSite">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="{{ asset('js/sites.js') }}"></script>
    <script>
        window.__SITES_INIT = @json($sites);
    </script>
</x-app-layout>
