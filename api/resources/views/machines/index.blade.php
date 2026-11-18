<x-app-layout title="Kelola Mesin — SafetyLog">
    <div class="topbar" x-slot="header">
        <h1>Kelola Mesin</h1>
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

            <table id="tblMachines">
                <thead>
                    <tr>
                        <th>Kode</th>
                        <th>Nama</th>
                        <th>Area</th>
                        <th>Site</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($machines as $machine)
                        <tr>
                            <td>{{ $machine->code }}</td>
                            <td>{{ $machine->name }}</td>
                            <td>{{ $machine->area->name ?? '—' }} ({{ $machine->area->code ?? '—' }})</td>
                            <td>{{ $machine->site->name ?? '—' }} ({{ $machine->site->code ?? '—' }})</td>
                            <td>
                                <span class="badge {{ $machine->is_active ? 'badge-active' : 'badge-archived' }}">
                                    {{ $machine->is_active ? 'Aktif' : 'Arsip' }}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-outline btn-sm" onclick="app.editMachine({{ $machine->id }})">Ubah</button>
                                <button class="btn btn-{{ $machine->is_active ? 'danger' : 'outline' }} btn-sm" onclick="app.toggleArchive({{ $machine->id }}, {{ $machine->is_active ? 'true' : 'false' }})">
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

    <script type="module" src="{{ asset('js/machines.js') }}"></script>
    <script>
        window.__MACHINES_INIT = @json($machines);
        window.__MACHINES_AREAS = @json($areas);
    </script>

    <div class="modal" id="modalMachine">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title" id="modalMachineTitle">Tambah Mesin</h3>
                <button class="close-btn" id="btnCloseMachine">&times;</button>
            </div>
            <form id="formMachine">
                <input type="hidden" id="machineId">
                <div class="form-group">
                    <label>Area Produksi <span style="color:#dc2626;">*</span></label>
                    <select id="machineAreaId" required>
                        @foreach ($areas as $area)
                                <option value="{{ $area->id }}" @disabled(! $area->is_active || $area->archived_at)>
                                    {{ $area->name }} ({{ $area->code ?? '—' }}){{ ! $area->is_active || $area->archived_at ? ' — Arsip' : '' }}
                                </option>
                        @endforeach
                    </select>
                </div>
                <div class="form-group">
                    <label>Kode Mesin</label>
                    <input type="text" id="machineCode" value="Dihasilkan otomatis" readonly
                        style="background:#f1f5f9; color:#64748b;">
                </div>
                <div class="form-group">
                    <label>Nama Mesin <span style="color:#dc2626;">*</span></label>
                    <input type="text" id="machineName" placeholder="Contoh: Mesin Konveyor Pengemasan 01" required>
                </div>
                <div class="form-group">
                    <label>Deskripsi</label>
                    <textarea id="machineDesc" rows="2" placeholder="Keterangan tambahan..."></textarea>
                </div>
                <div class="form-group" style="display:flex; align-items:center; gap:0.5rem;">
                    <input type="checkbox" id="machineActive" checked>
                    <label for="machineActive" style="margin:0; font-weight:600;">Aktif</label>
                </div>
                <div style="display:flex; gap:0.5rem; margin-top:1rem;">
                    <button type="button" class="btn btn-outline" id="btnCancelMachine">Batal</button>
                    <button type="submit" class="btn btn-primary" id="btnSaveMachine">Simpan</button>
                </div>
            </form>
        </div>
    </div>

</x-app-layout>
