@php
    $usersPayload = $users->map(fn ($u) => [
        'id' => $u->id,
        'name' => $u->name,
        'email' => $u->email,
        'role' => $u->role->value,
        'site_id' => $u->site_id,
        'job_title' => $u->job_title,
        'is_active' => $u->is_active,
    ])->values();
@endphp

<x-app-layout title="Kelola Pengguna | SafetyLog">
    <div id="usersContainer" class="container" data-users="{{ json_encode($usersPayload) }}">
        <div class="page-header">
            <div>
                <h1 class="page-title">Kelola Pengguna &amp; 4 Peran</h1>
                <p class="page-subtitle">
                    Atur akun Pelapor, Supervisor, K3/Verifikator, dan Manajer/Admin dalam organisasi Anda.
                </p>
            </div>
            <div class="row-actions">
                <button id="btnAddUser" type="button" class="btn btn-industrial">+ Tambah Pengguna</button>
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        <section class="card" aria-labelledby="users-table-heading">
            <h2 id="users-table-heading">Daftar Pengguna ({{ $users->count() }})</h2>

            @if ($users->isEmpty())
                <div class="empty-state">
                    <p>Belum ada pengguna terdaftar.</p>
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="users-table-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Nama &amp; Email</th>
                                <th scope="col">Peran</th>
                                <th scope="col">Jabatan</th>
                                <th scope="col">Pabrik</th>
                                <th scope="col">Status</th>
                                <th scope="col">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($users as $u)
                                <tr>
                                    <td data-label="Nama & Email">
                                        <strong>{{ $u->name }}</strong>
                                        <div class="muted mono">{{ $u->email }}</div>
                                    </td>
                                    <td data-label="Peran">
                                        <span class="badge badge-info">{{ $u->role->label() }}</span>
                                    </td>
                                    <td data-label="Jabatan">{{ $u->job_title ?? '-' }}</td>
                                    <td data-label="Pabrik">{{ $u->site?->name ?? 'Semua Pabrik' }}</td>
                                    <td data-label="Status">
                                        @if ($u->is_active)
                                            <span class="badge badge-safe">Aktif</span>
                                        @else
                                            <span class="badge badge-danger">Nonaktif</span>
                                        @endif
                                    </td>
                                    <td data-label="Aksi">
                                        <button
                                            type="button"
                                            class="btn btn-outline btn-sm"
                                            data-edit-user="{{ $u->id }}"
                                        >
                                            Ubah
                                        </button>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif
        </section>
    </div>

    <dialog id="userDialog" aria-labelledby="userDialogTitle">
        <div class="modal-header">
            <h2 id="userDialogTitle" class="modal-title">Tambah Pengguna Baru</h2>
            <button id="btnCloseUserDialog" type="button" class="close-btn" aria-label="Tutup dialog">&times;</button>
        </div>

        <div id="userFormError" class="alert alert-error" role="alert" hidden></div>

        <form id="userForm" novalidate>
            <div class="form-group">
                <label for="userName">Nama Lengkap *</label>
                <input id="userName" type="text" required aria-invalid="false">
            </div>

            <div class="form-group">
                <label for="userEmail">Email *</label>
                <input id="userEmail" type="email" required aria-invalid="false">
            </div>

            <div class="form-group">
                <label for="userRole">Peran *</label>
                <select id="userRole" required>
                    @foreach ($roles as $r)
                        <option value="{{ $r->value }}">{{ $r->label() }} ({{ $r->value }})</option>
                    @endforeach
                </select>
            </div>

            <div class="form-group">
                <label for="userSiteId">Pabrik (Opsional)</label>
                <select id="userSiteId">
                    <option value="">Semua Pabrik Organisasi</option>
                    @foreach ($sites as $site)
                        <option value="{{ $site->id }}">[{{ $site->code }}] {{ $site->name }}</option>
                    @endforeach
                </select>
            </div>

            <div class="form-group">
                <label for="userJobTitle">Jabatan (Opsional)</label>
                <input id="userJobTitle" type="text" placeholder="Contoh: Operator Lini B">
            </div>

            <div class="form-group">
                <label for="userPassword">Password</label>
                <input id="userPassword" type="password" minlength="8" autocomplete="new-password">
                <span id="userPasswordHint" class="hint">Minimal 8 karakter.</span>
            </div>

            <div class="form-group">
                <label class="checkbox-row" for="userActive">
                    <input id="userActive" type="checkbox" checked>
                    <span>Akun aktif dan dapat login</span>
                </label>
            </div>

            <div class="row-actions">
                <button type="submit" class="btn btn-industrial">Simpan Pengguna</button>
            </div>
        </form>
    </dialog>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/admin-users.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
