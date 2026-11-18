@use('Illuminate\Support\Str')

@php
    $openCasesInit = $openCasesWarning->map(fn ($item) => [
        'id' => $item->id,
        'case_number' => $item->case_number,
        'status_label' => $item->status->label(),
        'short_description' => Str::limit($item->description, 110),
    ])->values();
@endphp

<x-app-layout title="Lapor Kasus Baru | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Lapor Kasus Baru</h1>
                <p class="page-subtitle">
                    Laporkan kondisi tidak aman, hampir celaka (near-miss), gangguan mesin, atau insiden di area kerja.
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.my-cases') }}" class="btn btn-outline">Laporan Saya</a>
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        @if ($qrError)
            <div class="alert alert-warning" role="alert">
                <strong>Catatan QR:</strong> {{ $qrError }} Silakan pilih mesin secara manual di bawah ini.
            </div>
        @endif

        @if ($selectedMachine)
            <div class="alert alert-info" role="status">
                <strong>Mesin terpilih dari QR:</strong>
                <span class="mono">{{ $selectedMachine->code }}</span> ({{ $selectedMachine->name }})
                di {{ $selectedMachine->site?->name ?? '-' }} / {{ $selectedMachine->area?->name ?? '-' }}.
            </div>
        @endif

        <div id="openCasesWarning" class="alert alert-warning" role="status" hidden>
            <strong>Perhatian: Mesin ini masih memiliki laporan terbuka:</strong>
            <ul id="openCasesList" style="margin: 0.5rem 0 0 1.25rem;"></ul>
        </div>

        <div id="reportError" class="alert alert-error" role="alert" hidden></div>
        <div id="reportSuccess" class="alert alert-success" role="status" hidden></div>

        <section class="card" aria-labelledby="form-report-heading">
            <h2 id="form-report-heading">Formulir Laporan Lapangan</h2>
            <p class="muted">
                Isi lokasi mesin, jenis temuan, dan kronologi singkat. Foto bersifat opsional tetapi membantu verifikasi awal.
            </p>

            <form id="reportCaseForm" data-open-cases="{{ json_encode($openCasesInit) }}" novalidate>
                <div class="form-group">
                    <label for="machine_id">Mesin atau Peralatan *</label>
                    <select id="machine_id" name="machine_id" required aria-invalid="false">
                        <option value="">-- Pilih mesin --</option>
                        @foreach ($machines as $machine)
                            <option
                                value="{{ $machine->id }}"
                                @selected($selectedMachine && $selectedMachine->id === $machine->id)
                            >
                                [{{ $machine->code }}] {{ $machine->name }} ({{ $machine->site?->name ?? '-' }} / {{ $machine->area?->name ?? '-' }})
                            </option>
                        @endforeach
                    </select>
                </div>

                <div class="form-group">
                    <label for="case_type_id">Jenis Laporan *</label>
                    <select id="case_type_id" name="case_type_id" required aria-invalid="false">
                        <option value="">-- Pilih jenis laporan --</option>
                        @foreach ($caseTypes as $type)
                            <option value="{{ $type->id }}">
                                {{ $type->name }}
                            </option>
                        @endforeach
                    </select>
                </div>

                <div class="form-group">
                    <label for="description">Deskripsi Kondisi atau Kejadian *</label>
                    <textarea
                        id="description"
                        name="description"
                        required
                        minlength="10"
                        maxlength="2000"
                        aria-invalid="false"
                        placeholder="Jelaskan gejala kerusakan, bahaya yang ditemukan, atau kronologi kejadian..."
                    ></textarea>
                    <span class="hint">Minimal 10 karakter agar supervisor mudah menindaklanjuti.</span>
                </div>

                <div class="form-group">
                    <label class="checkbox-row" for="is_machine_stopped">
                        <input id="is_machine_stopped" name="is_machine_stopped" type="checkbox" value="1">
                        <span>Mesin saat ini berhenti beroperasi akibat temuan ini</span>
                    </label>
                </div>

                <div class="form-group">
                    <label class="checkbox-row" for="has_affected_people">
                        <input id="has_affected_people" name="has_affected_people" type="checkbox" value="1">
                        <span>Terdapat pekerja atau orang yang terdampak / cedera</span>
                    </label>
                    <span class="hint">
                        Pengingat prosedur: jika ada korban atau bahaya mendesak pada laporan insiden, segera jalankan prosedur tanggap darurat pabrik terlebih dahulu.
                    </span>
                </div>

                <div class="form-group">
                    <label for="photos">Foto Pendukung (Opsional, maksimal 5 file)</label>
                    <input
                        id="photos"
                        name="photos[]"
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                    >
                    <span class="hint">Format JPG, PNG, atau WebP. Maksimal 5 MB per foto.</span>
                </div>

                <div class="row-actions">
                    <button id="btnSubmitReport" type="submit" class="btn btn-industrial">Kirim Laporan</button>
                    <a href="{{ route('web.my-cases') }}" class="btn btn-outline">Batal</a>
                </div>
            </form>
        </section>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/cases-create.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
