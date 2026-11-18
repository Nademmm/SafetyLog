<x-app-layout title="Kelola Area | SafetyLog">
    <div id="areasContainer" class="container" data-areas="{{ json_encode($areas) }}">
        <div class="page-header">
            <div>
                <h1 class="page-title">Kelola Area Produksi</h1>
                <p class="page-subtitle">Master data area produksi di bawah pabrik dalam organisasi Anda.</p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Kembali ke Dashboard</a>
            </div>
        </div>

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

            <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-label="Daftar Area Produksi">
                <table id="tblAreas">
                    <thead>
                        <tr>
                            <th scope="col">Nama</th>
                            <th scope="col">Kode</th>
                            <th scope="col">Site/Pabrik</th>
                            <th scope="col">Jumlah Mesin Aktif</th>
                            <th scope="col">Status</th>
                            <th scope="col">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($areas as $area)
                            <tr>
                                <td data-label="Nama">{{ $area->name }}</td>
                                <td data-label="Kode"><code>{{ $area->code ?? '-' }}</code></td>
                                <td data-label="Site/Pabrik">{{ $area->site->name ?? '-' }} ({{ $area->site->code ?? '-' }})</td>
                                <td data-label="Jumlah Mesin Aktif">{{ $area->machines_count ?? 0 }}</td>
                                <td data-label="Status">
                                    <span class="badge {{ $area->is_active ? 'badge-active' : 'badge-archived' }}">
                                        {{ $area->is_active ? 'Aktif' : 'Arsip' }}
                                    </span>
                                </td>
                                <td data-label="Aksi">
                                    <button type="button" class="btn btn-outline btn-sm" data-edit-area="{{ $area->id }}">Ubah</button>
                                    <button
                                        type="button"
                                        class="btn btn-{{ $area->is_active ? 'danger' : 'outline' }} btn-sm"
                                        data-toggle-area="{{ $area->id }}"
                                        data-active="{{ $area->is_active ? '1' : '0' }}"
                                    >
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
    </div>

    <div class="modal" id="modalArea">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalAreaTitle">Tambah Area</h3>
                <button type="button" class="close-btn" id="btnCloseArea" aria-label="Tutup modal">&times;</button>
            </div>
            <form id="formArea">
                <input type="hidden" id="areaId">
                <div class="form-group">
                    <label for="areaSiteId">Site/Pabrik <span class="required-mark">*</span></label>
                    <select id="areaSiteId" required>
                        @foreach ($sites as $site)
                            <option value="{{ $site->id }}">{{ $site->name }} ({{ $site->code }})</option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group">
                    <label for="areaName">Nama Area <span class="required-mark">*</span></label>
                    <input type="text" id="areaName" placeholder="Contoh: Lini Pengemasan A" required>
                </div>
                <div class="form-group">
                    <label class="checkbox-row" for="areaActive">
                        <input type="checkbox" id="areaActive" checked>
                        <span>Aktif</span>
                    </label>
                </div>
                <div class="row-actions" style="margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelArea">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveArea">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/areas.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
