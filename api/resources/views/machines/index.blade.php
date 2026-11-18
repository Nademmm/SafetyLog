<x-app-layout title="Kelola Mesin | SafetyLog">
    <div id="machinesContainer" class="container" data-machines="{{ json_encode($machines) }}">
        <div class="page-header">
            <div>
                <h1 class="page-title">Kelola Mesin</h1>
                <p class="page-subtitle">Master data mesin produksi dan peralatan organisasi Anda.</p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Kembali ke Dashboard</a>
            </div>
        </div>

        <div class="card">
            <h2>Daftar Mesin</h2>
            <p class="muted">Khusus peran Admin. Setiap mesin punya kode unik dan token QR acak (dihasilkan backend, bukan nomor urut yang bisa ditebak).</p>

            @if (session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif

            @if (session('error'))
                <div class="alert alert-error">{{ session('error') }}</div>
            @endif
            <div id="alert" class="alert alert-error" style="display:none;"></div>
            <div id="alertSuccess" class="alert alert-success" style="display:none;"></div>

            <button class="btn btn-primary" id="btnAddMachine" style="margin-bottom:1rem;">+ Tambah Mesin</button>

            <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-label="Daftar Mesin">
                <table id="tblMachines">
                    <thead>
                        <tr>
                            <th scope="col">Kode</th>
                            <th scope="col">Nama</th>
                            <th scope="col">Area</th>
                            <th scope="col">Site</th>
                            <th scope="col">Status</th>
                            <th scope="col">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach ($machines as $machine)
                            <tr>
                                <td data-label="Kode">{{ $machine->code }}</td>
                                <td data-label="Nama">{{ $machine->name }}</td>
                                <td data-label="Area">{{ $machine->area->name ?? '-' }} ({{ $machine->area->code ?? '-' }})</td>
                                <td data-label="Site">{{ $machine->site->name ?? '-' }} ({{ $machine->site->code ?? '-' }})</td>
                                <td data-label="Status">
                                    <span class="badge {{ $machine->is_active ? 'badge-active' : 'badge-archived' }}">
                                        {{ $machine->is_active ? 'Aktif' : 'Arsip' }}
                                    </span>
                                </td>
                                <td data-label="Aksi">
                                    <button type="button" class="btn btn-outline btn-sm" data-edit-machine="{{ $machine->id }}">Ubah</button>
                                    <button
                                        type="button"
                                        class="btn btn-{{ $machine->is_active ? 'danger' : 'outline' }} btn-sm"
                                        data-toggle-machine="{{ $machine->id }}"
                                        data-active="{{ $machine->is_active ? '1' : '0' }}"
                                    >
                                        {{ $machine->is_active ? 'Arsipkan' : 'Aktifkan' }}
                                    </button>
                                </td>
                            </tr>
                        @endforeach
                        @if (empty($machines))
                            <tr><td colspan="6" style="text-align:center;">Belum ada mesin.</td></tr>
                        @endif
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <div class="modal" id="modalMachine">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalMachineTitle">Tambah Mesin</h3>
                <button type="button" class="close-btn" id="btnCloseMachine" aria-label="Tutup modal">&times;</button>
            </div>
            <form id="formMachine">
                <input type="hidden" id="machineId">
                <div class="form-group">
                    <label for="machineAreaId">Area Produksi <span class="required-mark">*</span></label>
                    <select id="machineAreaId" required>
                        @foreach ($areas as $area)
                                <option value="{{ $area->id }}" @disabled(! $area->is_active || $area->archived_at)>
                                    {{ $area->name }} ({{ $area->code ?? '-' }}){{ ! $area->is_active || $area->archived_at ? ' (Arsip)' : '' }}
                                </option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group">
                    <label for="machineCode">Kode Mesin</label>
                    <input type="text" id="machineCode" value="Dihasilkan otomatis" readonly>
                </div>
                <div class="form-group">
                    <label for="machineName">Nama Mesin <span class="required-mark">*</span></label>
                    <input type="text" id="machineName" placeholder="Contoh: Mesin Konveyor Pengemasan 01" required>
                </div>
                <div class="form-group">
                    <label for="machineDesc">Deskripsi</label>
                    <textarea id="machineDesc" rows="2" placeholder="Keterangan tambahan..."></textarea>
                </div>
                <div class="form-group">
                    <label class="checkbox-row" for="machineActive">
                        <input type="checkbox" id="machineActive" checked>
                        <span>Aktif</span>
                    </label>
                </div>
                <div class="row-actions" style="margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelMachine">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveMachine">Simpan</button>
                </div>
            </form>
        </div>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/machines.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
