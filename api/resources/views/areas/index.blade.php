<x-app-layout title="Kelola Area — SafetyLog">
    <div class="topbar" x-slot="header">
        <h1>Kelola Area Produksi</h1>
        <div class="nav-links">
            <a href="{{ route('web.dashboard') }}" class="btn btn-outline">← Kembali</a>
            <form method="POST" action="{{ route('web.logout') }}">
                @csrf
                <button type="submit" class="btn btn-danger">Keluar</button>
            </form>
        </div>
    </div>

    <div class="container" x-slot="content">
        <div class="card">
            <h2>Daftar Area Produksi</h2>
            <p class="muted">Khusus peran Admin. Semua data dibatasi organisasi Anda (multi-tenant).</p>

            @if (session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif

            @if (session('error'))
                <div class="alert alert-error">{{ session('error') }}</div>
            @endif
            <div id="alert" class="alert alert-error" style="display:none;"></div>
            <div id="alertSuccess" class="alert alert-success" style="display:none;"></div>

            <button class="btn btn-primary" id="btnAddArea" style="margin-bottom:1rem;">+ Tambah Area</button>

            <table id="tblAreas">
                <thead>
                    <tr>
                        <th>Nama</th>
                        <th>Kode</th>
                        <th>Site/Pabrik</th>
                        <th>Jumlah Mesin Aktif</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($areas as $area)
                        <tr>
                            <td>{{ $area->name }}</td>
                            <td><code>{{ $area->code ?? '—' }}</code></td>
                            <td>{{ $area->site->name ?? '—' }} ({{ $area->site->code ?? '—' }})</td>
                            <td>{{ $area->machines_count ?? 0 }}</td>
                            <td>
                                <span class="badge {{ $area->is_active ? 'badge-active' : 'badge-archived' }}">
                                    {{ $area->is_active ? 'Aktif' : 'Arsip' }}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="app.editArea({{ $area->id }})">Ubah</button>
                                <button class="btn btn-{{ $area->is_active ? 'danger' : 'outline' }} btn-sm" onclick="app.toggleArchive({{ $area->id }}, {{ $area->is_active ? 'true' : 'false' }})">
                                    {{ $area->is_active ? 'Arsipkan' : 'Aktifkan' }}
                                </button>
                            </td>
                        </tr>
                    @endforeach
                    @if (empty($areas))
                        <tr><td colspan="6" style="text-align:center;">Belum ada area.</td></tr>
                    @endif
                </tbody>
            </table>
        </div>
    </div>

    <div class="modal" id="modalArea">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalAreaTitle">Tambah Area</h3>
                <button class="close-btn" id="btnCloseArea">&times;</button>
            </div>
            <form id="formArea">
                <input type="hidden" id="areaId">
                <div class="form-group">
                    <label>Site/Pabrik <span style="color:#dc2626;">*</span></label>
                    <select id="areaSiteId" required>
                        @foreach ($sites as $site)
                            <option value="{{ $site->id }}">{{ $site->name }} ({{ $site->code }})</option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group">
                    <label>Nama Area <span style="color:#dc2626;">*</span></label>
                    <input type="text" id="areaName" placeholder="Contoh: Lini Pengemasan A" required>
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                    <input type="checkbox" id="areaActive" checked>
                    <label for="areaActive" style="margin:0; font-weight:600;">Aktif</label>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelArea">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveArea">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <script type="module" src="{{ asset('js/areas.js') }}"></script>
    <script>
        // Inisialisasi data dari Blade (server-side) untuk areas.js
        window.__AREAS_INIT = @json($areas);
        window.__AREAS_SITES = @json($sites);
    </script>
</x-app-layout>
