<x-app-layout title="Konfigurasi Risiko &amp; Sistem | SafetyLog">
    <div class="container">
        <div class="page-header">
            <div>
                <h1 class="page-title">Konfigurasi Risiko &amp; Sistem</h1>
                <p class="page-subtitle">
                    Atur ambang skor matriks risiko, target SLA penanganan, serta parameter organisasi secara dinamis berbasis database.
                </p>
            </div>
            <div class="row-actions">
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        <div id="configFeedback" class="alert" role="status" hidden></div>

        <section class="card" aria-labelledby="risk-matrix-heading">
            <h2 id="risk-matrix-heading">Ambang Risiko &amp; Target Waktu (SLA)</h2>
            <p class="muted">
                Perubahan pada tabel ini langsung berlaku untuk perhitungan skor dan tenggat tindakan saat triase kasus baru.
            </p>

            @foreach ($riskConfigs as $rc)
                <form
                    data-risk-form="{{ $rc->id }}"
                    style="border: 1px solid var(--border-subtle); border-radius: var(--radius-control); padding: 1rem; margin-top: 1rem;"
                >
                    <div class="row-actions" style="justify-content: space-between; margin-bottom: 0.75rem;">
                        <strong>{{ $rc->label }} (<span class="mono">{{ $rc->level->value }}</span>)</strong>
                    </div>

                    <div class="filter-bar">
                        <div class="form-group">
                            <label for="rc_min_{{ $rc->id }}">Skor Minimum</label>
                            <input id="rc_min_{{ $rc->id }}" name="min_score" type="number" min="1" required value="{{ $rc->min_score }}">
                        </div>
                        <div class="form-group">
                            <label for="rc_max_{{ $rc->id }}">Skor Maksimum</label>
                            <input id="rc_max_{{ $rc->id }}" name="max_score" type="number" min="1" required value="{{ $rc->max_score }}">
                        </div>
                        <div class="form-group">
                            <label for="rc_resp_{{ $rc->id }}">Respons Awal (Jam)</label>
                            <input id="rc_resp_{{ $rc->id }}" name="first_response_hours" type="number" min="1" required value="{{ $rc->first_response_hours }}">
                        </div>
                        <div class="form-group">
                            <label for="rc_temp_{{ $rc->id }}">Tindakan Sementara (Jam)</label>
                            <input id="rc_temp_{{ $rc->id }}" name="temporary_action_hours" type="number" min="1" required value="{{ $rc->temporary_action_hours }}">
                        </div>
                        <div class="form-group">
                            <label for="rc_perm_{{ $rc->id }}">Tindakan Permanen (Jam)</label>
                            <input id="rc_perm_{{ $rc->id }}" name="permanent_action_hours" type="number" min="1" required value="{{ $rc->permanent_action_hours }}">
                        </div>
                    </div>

                    <div class="row-actions" style="justify-content: space-between; margin-top: 0.75rem;">
                        <label class="checkbox-row" for="rc_prev_{{ $rc->id }}">
                            <input
                                id="rc_prev_{{ $rc->id }}"
                                name="requires_preventive_action"
                                type="checkbox"
                                @checked($rc->requires_preventive_action)
                            >
                            <span>Wajib memiliki tindakan Preventif selesai sebelum ditutup</span>
                        </label>
                        <button type="submit" class="btn btn-industrial btn-sm">Simpan Level {{ $rc->label }}</button>
                    </div>
                </form>
            @endforeach
        </section>

        <section class="card" aria-labelledby="system-config-heading">
            <h2 id="system-config-heading">Parameter Sistem Organisasi</h2>

            @if ($configurations->isEmpty())
                <div class="empty-state">
                    <p>Belum ada konfigurasi tambahan tersimpan.</p>
                </div>
            @else
                @foreach ($configurations as $cfg)
                    @php
                        $encoded = is_array($cfg->value)
                            ? json_encode($cfg->value, JSON_UNESCAPED_UNICODE)
                            : (string) $cfg->value;
                    @endphp
                    <form
                        data-config-form="{{ $cfg->key }}"
                        style="border: 1px solid var(--border-subtle); border-radius: var(--radius-control); padding: 1rem; margin-top: 1rem;"
                    >
                        <div class="form-group">
                            <label for="cfg_{{ $cfg->key }}">
                                <span class="mono">{{ $cfg->key }}</span>
                            </label>
                            @if ($cfg->description)
                                <span class="hint">{{ $cfg->description }}</span>
                            @endif
                            <input id="cfg_{{ $cfg->key }}" name="value" type="text" required value="{{ $encoded }}">
                        </div>
                        <button type="submit" class="btn btn-primary btn-sm">Perbarui Nilai</button>
                    </form>
                @endforeach
            @endif
        </section>
    </div>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/admin-configs.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
