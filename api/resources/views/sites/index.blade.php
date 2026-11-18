<x-app-layout title="Kelola Pabrik | SafetyLog">
    <div id="sitesContainer" class="container" data-sites="{{ json_encode($sites) }}">
        <div class="page-header">
            <div>
                <h1 class="page-title">Kelola Pabrik</h1>
                <p class="page-subtitle">Master data pabrik sebagai induk area produksi organisasi Anda.</p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Kembali ke Dashboard</a>
            </div>
        </div>

        <div class="card">
            <h2>Daftar Pabrik</h2>
            <p class="muted">Pabrik adalah induk dari area produksi dan dibatasi berdasarkan organisasi Anda.</p>

            <div id="alert" class="alert alert-error" style="display:none;"></div>
            <div id="alertSuccess" class="alert alert-success" style="display:none;"></div>
            <button class="btn btn-primary" id="btnAddSite" style="margin-bottom:1rem;">+ Tambah Pabrik</button>

            <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-label="Daftar Pabrik">
                <table>
                    <thead>
                        <tr>
                            <th scope="col">Nama Pabrik</th>
                            <th scope="col">Kode</th>
                            <th scope="col">Alamat</th>
                            <th scope="col">Status</th>
                            <th scope="col">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($sites as $site)
                            <tr>
                                <td data-label="Nama Pabrik">{{ $site->name }}</td>
                                <td data-label="Kode"><code>{{ $site->code }}</code></td>
                                <td data-label="Alamat">{{ $site->address ?? '-' }}</td>
                                <td data-label="Status">
                                    <span class="badge {{ $site->is_active ? 'badge-active' : 'badge-archived' }}">
                                        {{ $site->is_active ? 'Aktif' : 'Arsip' }}
                                    </span>
                                </td>
                                <td data-label="Aksi">
                                    <button type="button" class="btn btn-outline btn-sm" data-edit-site="{{ $site->id }}">Ubah</button>
                                    <button
                                        type="button"
                                        class="btn btn-{{ $site->is_active ? 'danger' : 'outline' }} btn-sm"
                                        data-toggle-site="{{ $site->id }}"
                                        data-active="{{ $site->is_active ? '1' : '0' }}"
                                    >
                                        {{ $site->is_active ? 'Arsipkan' : 'Aktifkan' }}
                                    </button>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="modal" id="modalSite">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalSiteTitle">Tambah Pabrik</h3>
                <button type="button" class="close-btn" id="btnCloseSite" aria-label="Tutup modal">&times;</button>
            </div>
            <form id="formSite">
                <input type="hidden" id="siteId">
                <div class="form-group">
                    <label for="siteName">Nama Pabrik <span class="required-mark">*</span></label>
                    <input type="text" id="siteName" placeholder="Contoh: Pabrik Surabaya" required>
                </div>
                <div class="form-group">
                    <label for="siteAddress">Alamat</label>
                    <textarea id="siteAddress" rows="3" placeholder="Alamat lengkap pabrik"></textarea>
                </div>
                <div class="row-actions" style="margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelSite">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveSite">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/sites.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
