@use('App\Enums\ActionStatus')
@use('App\Enums\ActionType')
@use('App\Enums\CaseStatus')
@use('App\Enums\RiskLevel')
@use('App\Enums\UserRole')
@use('Illuminate\Support\Str')

@php
    $roleEnum = UserRole::from($user['role']);
    $statusBadge = match ($case->status) {
        CaseStatus::New => 'badge-info',
        CaseStatus::PendingVerification => 'badge-warning',
        CaseStatus::Closed => 'badge-safe',
        CaseStatus::Rejected, CaseStatus::Duplicate => 'badge-danger',
        default => 'badge-caution',
    };
    $riskBadge = match ($case->risk_level) {
        RiskLevel::Low => 'badge-safe',
        RiskLevel::Medium => 'badge-caution',
        RiskLevel::High => 'badge-danger',
        default => '',
    };
    $needsPreventive = in_array($case->risk_level, [RiskLevel::Medium, RiskLevel::High], true);
@endphp

<x-app-layout title="{{ $case->case_number }} | Detail Kasus | SafetyLog">
    <div
        id="caseDetailRoot"
        class="container"
        data-case-id="{{ $case->id }}"
        data-risk-configs="{{ json_encode($riskConfigs) }}"
    >
        <div class="page-header">
            <div>
                <h1 class="page-title">
                    <span class="mono">{{ $case->case_number }}</span>
                    <span class="badge {{ $statusBadge }}" style="vertical-align: middle; margin-left: 0.4rem;">
                        {{ $case->status->label() }}
                    </span>
                    @if ($case->risk_level)
                        <span class="badge {{ $riskBadge }}" style="vertical-align: middle; margin-left: 0.25rem;">
                            Risiko {{ $case->risk_level->label() }} ({{ $case->risk_score }})
                        </span>
                    @endif
                </h1>
                <p class="page-subtitle">
                    {{ $case->caseType?->name ?? '-' }} di <strong>{{ $case->machine?->name ?? '-' }}</strong>
                    ({{ $case->site?->name ?? '-' }} / {{ $case->area?->name ?? '-' }})
                </p>
            </div>
            <div class="row-actions">
                @if ($roleEnum->canViewAllCases())
                    <a href="{{ route('web.cases.index') }}" class="btn btn-outline">Semua Kasus</a>
                @else
                    <a href="{{ route('web.my-cases') }}" class="btn btn-outline">Laporan Saya</a>
                @endif
                <a href="{{ route('web.dashboard') }}" class="btn btn-outline">Dashboard</a>
            </div>
        </div>

        @if ($case->is_locked)
            <div class="alert alert-info" role="status">
                <strong>Kasus Terkunci:</strong> Kasus ini sudah berstatus Selesai dan dikunci untuk menjaga keutuhan riwayat audit.
                Hanya K3/Verifikator atau Manajer/Admin yang dapat membuka ulang jika masalah terulang.
            </div>
        @endif

        @if ($case->caseType?->is_incident && $case->has_affected_people)
            <div class="alert alert-warning" role="status">
                <strong>Pengingat Keselamatan:</strong> Laporan ini melibatkan pekerja terdampak. Pastikan prosedur tanggap darurat resmi pabrik dijalankan lebih dulu.
            </div>
        @endif

        <div class="split-grid">
            <section class="card" aria-labelledby="case-info-heading">
                <h2 id="case-info-heading">Informasi Laporan</h2>
                <p style="white-space: pre-line; margin: 0 0 1rem;">{{ $case->description }}</p>

                <dl style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.75rem; margin: 0;">
                    <div>
                        <dt class="muted">Pelapor</dt>
                        <dd style="margin: 0.15rem 0 0;"><strong>{{ $case->reporter?->name ?? '-' }}</strong></dd>
                    </div>
                    <div>
                        <dt class="muted">Dilaporkan</dt>
                        <dd style="margin: 0.15rem 0 0;" class="tabular-nums">{{ $case->reported_at?->format('d M Y H:i') ?? '-' }}</dd>
                    </div>
                    <div>
                        <dt class="muted">Kategori</dt>
                        <dd style="margin: 0.15rem 0 0;">{{ $case->category?->name ?? 'Belum ditentukan' }}</dd>
                    </div>
                    <div>
                        <dt class="muted">PIC Penanggung Jawab</dt>
                        <dd style="margin: 0.15rem 0 0;">{{ $case->assignedPic?->name ?? 'Belum ditetapkan' }}</dd>
                    </div>
                    <div>
                        <dt class="muted">Mesin Berhenti?</dt>
                        <dd style="margin: 0.15rem 0 0;">{{ $case->is_machine_stopped ? 'Ya, mesin berhenti' : 'Tidak' }}</dd>
                    </div>
                    <div>
                        <dt class="muted">Ada Korban / Terdampak?</dt>
                        <dd style="margin: 0.15rem 0 0;">{{ $case->has_affected_people ? 'Ya' : 'Tidak' }}</dd>
                    </div>
                </dl>

                @if ($case->rejection_reason)
                    <div class="alert alert-warning" style="margin-top: 1rem; margin-bottom: 0;">
                        <strong>Catatan Penolakan / Pengembalian:</strong> {{ $case->rejection_reason }}
                    </div>
                @endif

                @if ($case->duplicateOf)
                    <div class="alert alert-info" style="margin-top: 1rem; margin-bottom: 0;">
                        <strong>Duplikat dari:</strong>
                        <a href="{{ route('web.cases.show', $case->duplicateOf) }}" class="mono">{{ $case->duplicateOf->case_number }}</a>
                    </div>
                @endif

                @if ($case->learning_summary)
                    <div class="alert alert-success" style="margin-top: 1rem; margin-bottom: 0;">
                        <strong>Pembelajaran &amp; Pencegahan:</strong> {{ $case->learning_summary }}
                    </div>
                @endif

                @if ($case->attachments->isNotEmpty())
                    <h3 style="margin-top: 1.25rem;">Foto Lampiran Laporan</h3>
                    <div class="photo-grid">
                        @foreach ($case->attachments as $att)
                            <a
                                href="{{ route('web.attachments.show', $att->id) }}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="photo-card"
                            >
                                <img
                                    src="{{ route('web.attachments.show', $att->id) }}"
                                    alt="{{ $att->original_name }}"
                                >
                            </a>
                        @endforeach
                    </div>
                @endif
            </section>

            <section class="card" aria-labelledby="similar-cases-heading">
                <h2 id="similar-cases-heading">Kasus Serupa (Kemiripan Teks)</h2>
                <p class="muted">
                    Pencarian kemiripan teks histori kasus pada mesin atau gejala sejenis di organisasi Anda.
                </p>

                @if ($similarCases->isEmpty())
                    <div class="empty-state">
                        <p>Belum ditemukan kasus terdahulu dengan kemiripan teks yang cukup tinggi.</p>
                    </div>
                @else
                    <ul class="timeline-list">
                        @foreach ($similarCases as $sim)
                            <li class="timeline-item">
                                <div class="row-actions" style="justify-content: space-between;">
                                    <a href="{{ route('web.cases.show', $sim['id']) }}" class="mono">
                                        <strong>{{ $sim['case_number'] }}</strong>
                                    </a>
                                    <span class="badge badge-info tabular-nums">{{ $sim['similarity_percent'] }}% mirip</span>
                                </div>
                                <div class="muted" style="margin-top: 0.25rem;">
                                    Status: {{ $sim['status_label'] }} | Mesin: {{ $sim['machine']['name'] ?? '-' }}
                                </div>
                                @if (!empty($sim['root_cause_summary']))
                                    <div style="margin-top: 0.4rem;">
                                        <strong>Akar masalah:</strong> {{ $sim['root_cause_summary'] }}
                                    </div>
                                @endif
                                @if (!empty($sim['learning_summary']))
                                    <div style="margin-top: 0.25rem;">
                                        <strong>Pembelajaran:</strong> {{ $sim['learning_summary'] }}
                                    </div>
                                @endif
                            </li>
                        @endforeach
                    </ul>
                @endif
            </section>
        </div>

        @if ($roleEnum->canTriage() && !$case->is_locked && in_array($case->status, [CaseStatus::New, CaseStatus::Assessed], true))
            <section class="card" aria-labelledby="triage-heading">
                <h2 id="triage-heading">Triase &amp; Penilaian Risiko (Supervisor / Admin)</h2>
                <div id="triageFeedback" class="alert" role="alert" hidden></div>

                <form id="triageForm" novalidate>
                    <div class="form-group">
                        <label for="triageDecision">Keputusan Triase</label>
                        <select id="triageDecision" name="decision">
                            <option value="assess">Terima &amp; Nilai Risiko</option>
                            <option value="reject">Tolak Laporan</option>
                            <option value="duplicate">Tandai Sebagai Duplikat</option>
                        </select>
                    </div>

                    <div id="triageAssessFields">
                        <div class="filter-bar">
                            <div class="form-group">
                                <label for="triageSeverity">Keparahan (Severity, 1-{{ $maxScale }})</label>
                                <input
                                    id="triageSeverity"
                                    type="number"
                                    min="1"
                                    max="{{ $maxScale }}"
                                    value="{{ $case->severity ?? 3 }}"
                                >
                            </div>
                            <div class="form-group">
                                <label for="triageLikelihood">Kemungkinan (Likelihood, 1-{{ $maxScale }})</label>
                                <input
                                    id="triageLikelihood"
                                    type="number"
                                    min="1"
                                    max="{{ $maxScale }}"
                                    value="{{ $case->likelihood ?? 3 }}"
                                >
                            </div>
                            <div class="form-group">
                                <label for="triageCategory">Kategori Masalah</label>
                                <select id="triageCategory">
                                    <option value="">-- Pilih kategori --</option>
                                    @foreach ($categories as $cat)
                                        <option value="{{ $cat->id }}" @selected($case->category_id === $cat->id)>{{ $cat->name }}</option>
                                    @endforeach
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="triagePic">Tetapkan PIC Utama</label>
                                <select id="triagePic">
                                    <option value="">-- Belum ditetapkan --</option>
                                    @foreach ($assignableUsers as $u)
                                        <option value="{{ $u->id }}" @selected($case->assigned_pic_id === $u->id)>
                                            {{ $u->name }} ({{ $u->role->label() }})
                                        </option>
                                    @endforeach
                                </select>
                            </div>
                        </div>
                        <p id="triageRiskPreview" class="hint" style="margin-top: 0.75rem;"></p>
                    </div>

                    <div id="triageDuplicateFields" class="form-group" hidden>
                        <label for="triageDuplicateId">Kasus Rujukan (Duplikat Dari)</label>
                        <select id="triageDuplicateId">
                            <option value="">-- Pilih kasus acuan --</option>
                            @foreach ($otherOrgCases as $other)
                                <option value="{{ $other->id }}">
                                    {{ $other->case_number }} | {{ Str::limit($other->description, 60) }}
                                </option>
                            @endforeach
                        </select>
                    </div>

                    <div id="triageRejectFields" class="form-group" hidden>
                        <label for="triageReason">Alasan Penolakan / Catatan Duplikat</label>
                        <textarea id="triageReason" placeholder="Jelaskan alasan penolakan atau referensi duplikat..."></textarea>
                    </div>

                    <button type="submit" class="btn btn-industrial">Simpan Triase</button>
                </form>
            </section>
        @endif

        @if (!$case->is_locked && $case->status !== CaseStatus::New)
            <section class="card" aria-labelledby="root-cause-heading">
                <h2 id="root-cause-heading">Analisis Akar Masalah (5 Why &amp; 6M)</h2>

                @if ($case->root_cause_summary || $case->root_cause_category)
                    <div class="alert alert-info">
                        <strong>Kategori 6M:</strong> {{ $case->root_cause_category ?? '-' }}<br>
                        <strong>Ringkasan Akar Masalah:</strong> {{ $case->root_cause_summary ?? '-' }}
                        @if (!empty($case->five_whys))
                            <ol style="margin: 0.45rem 0 0 1.25rem;">
                                @foreach ($case->five_whys as $why)
                                    <li>{{ $why }}</li>
                                @endforeach
                            </ol>
                        @endif
                    </div>
                @endif

                @if ($roleEnum->canManageActions())
                    <div id="rootCauseFeedback" class="alert" role="alert" hidden></div>
                    <form id="rootCauseForm" novalidate>
                        <div class="form-group">
                            <label for="rootCauseCategory">Kategori 6M</label>
                            <select id="rootCauseCategory" required>
                                @foreach ($rootCauseCategories as $rcCat)
                                    <option value="{{ $rcCat }}" @selected($case->root_cause_category === $rcCat)>
                                        {{ $rcCat }}
                                    </option>
                                @endforeach
                            </select>
                        </div>

                        <div class="split-grid">
                            @for ($i = 0; $i < 5; $i++)
                                <div class="form-group">
                                    <label for="why_{{ $i + 1 }}">Mengapa {{ $i + 1 }}{{ $i === 0 ? ' *' : '' }}</label>
                                    <input
                                        id="why_{{ $i + 1 }}"
                                        class="why-input"
                                        type="text"
                                        value="{{ $case->five_whys[$i] ?? '' }}"
                                        placeholder="Langkah analisis {{ $i + 1 }}"
                                        @if ($i === 0) required @endif
                                    >
                                </div>
                            @endfor
                        </div>

                        <div class="form-group">
                            <label for="rootCauseSummary">Ringkasan Akar Masalah</label>
                            <textarea id="rootCauseSummary" placeholder="Simpulkan akar penyebab utama agar dapat dicegah terulang...">{{ $case->root_cause_summary }}</textarea>
                        </div>

                        <button type="submit" class="btn btn-primary">Simpan Analisis Akar Masalah</button>
                    </form>
                @endif
            </section>
        @endif

        <section class="card" aria-labelledby="actions-heading">
            <h2 id="actions-heading">Rencana &amp; Realisasi Tindakan (CAPA)</h2>

            @if ($needsPreventive)
                <p class="muted">
                    Kasus dengan risiko <strong>{{ $case->risk_level->label() }}</strong> wajib memiliki minimal 1 tindakan berjenis <strong>Preventif</strong> yang selesai sebelum kasus dapat ditutup.
                </p>
            @endif

            @if ($case->actions->isEmpty())
                <div class="empty-state">
                    <p>Belum ada tindakan perbaikan yang ditambahkan untuk kasus ini.</p>
                </div>
            @else
                <div class="table-wrapper responsive-table" tabindex="0" role="region" aria-labelledby="actions-heading">
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Jenis</th>
                                <th scope="col">Tindakan</th>
                                <th scope="col">PIC</th>
                                <th scope="col">Tenggat</th>
                                <th scope="col">Status</th>
                                <th scope="col">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach ($case->actions as $action)
                                @php
                                    $isMine = $action->pic_user_id === $user['id'];
                                    $canCompleteAction = $action->status === ActionStatus::Open
                                        && !$case->is_locked
                                        && ($isMine || $roleEnum->canManageActions());
                                @endphp
                                <tr>
                                    <td data-label="Jenis">
                                        <span class="badge">{{ $action->action_type->label() }}</span>
                                    </td>
                                    <td data-label="Tindakan">
                                        <strong>{{ $action->title }}</strong>
                                        @if ($action->description)
                                            <div class="muted">{{ $action->description }}</div>
                                        @endif
                                        @if ($action->completion_note)
                                            <div class="muted" style="margin-top: 0.3rem;">
                                                <strong>Catatan selesai:</strong> {{ $action->completion_note }}
                                            </div>
                                        @endif
                                        @if ($action->attachments->isNotEmpty())
                                            <div class="row-actions" style="margin-top: 0.35rem;">
                                                @foreach ($action->attachments as $att)
                                                    <a
                                                        href="{{ route('web.attachments.show', $att->id) }}"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        class="btn btn-outline btn-sm"
                                                    >
                                                        Bukti: {{ Str::limit($att->original_name, 20) }}
                                                    </a>
                                                @endforeach
                                            </div>
                                        @endif
                                    </td>
                                    <td data-label="PIC">{{ $action->pic?->name ?? '-' }}</td>
                                    <td data-label="Tenggat" class="tabular-nums">
                                        {{ $action->due_at->format('d M Y') }}
                                        @if ($action->isOverdue())
                                            <div><span class="badge badge-danger">Terlambat</span></div>
                                        @endif
                                    </td>
                                    <td data-label="Status">
                                        <span class="badge {{ $action->status === ActionStatus::Completed ? 'badge-safe' : 'badge-warning' }}">
                                            {{ $action->status->label() }}
                                        </span>
                                    </td>
                                    <td data-label="Aksi">
                                        @if ($canCompleteAction)
                                            <button
                                                type="button"
                                                class="btn btn-industrial btn-sm"
                                                data-complete-action="{{ $action->id }}"
                                                data-action-title="{{ $action->title }}"
                                            >
                                                Selesaikan
                                            </button>
                                        @else
                                            <span class="muted">-</span>
                                        @endif
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            @endif

            @if ($roleEnum->canManageActions() && !$case->is_locked && $case->status !== CaseStatus::New)
                <h3 style="margin-top: 1.5rem;">Tambah Tindakan Baru</h3>
                <div id="actionFeedback" class="alert" role="alert" hidden></div>

                <form id="addActionForm" novalidate>
                    <div class="filter-bar">
                        <div class="form-group">
                            <label for="actionType">Jenis Tindakan</label>
                            <select id="actionType" required>
                                @foreach (ActionType::cases() as $at)
                                    <option value="{{ $at->value }}">{{ $at->label() }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="actionPicUserId">PIC Pelaksana</label>
                            <select id="actionPicUserId" required>
                                @foreach ($assignableUsers as $u)
                                    <option value="{{ $u->id }}" @selected($case->assigned_pic_id === $u->id)>
                                        {{ $u->name }} ({{ $u->role->label() }})
                                    </option>
                                @endforeach
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="actionDueAt">Target Tanggal Selesai</label>
                            <input
                                id="actionDueAt"
                                type="date"
                                required
                                value="{{ now()->addDays(7)->format('Y-m-d') }}"
                            >
                        </div>
                    </div>

                    <div class="form-group" style="margin-top: 0.75rem;">
                        <label for="actionTitle">Judul Tindakan *</label>
                        <input id="actionTitle" type="text" required placeholder="Contoh: Pasang pelindung pengaman konveyor">
                    </div>

                    <div class="form-group">
                        <label for="actionDescription">Detail Pekerjaan (Opsional)</label>
                        <textarea id="actionDescription" placeholder="Langkah kerja, suku cadang, atau standar pemeriksaan..."></textarea>
                    </div>

                    <button type="submit" class="btn btn-primary">Tambah Tindakan</button>
                </form>
            @endif
        </section>

        @if ($roleEnum->canVerify() && $case->status === CaseStatus::PendingVerification)
            <section class="card" aria-labelledby="verify-heading">
                <h2 id="verify-heading">Verifikasi Independen &amp; Penutupan Kasus</h2>

                @if ($isPicOnCase)
                    <div class="alert alert-warning" role="alert">
                        <strong>Pembatasan Pemisahan Tugas:</strong> Anda tercatat sebagai PIC atau pelaksana tindakan pada kasus ini.
                        Sesuai aturan SafetyLog, verifikator tidak boleh sama dengan PIC. Minta verifikator K3/Admin lain untuk memeriksa kasus ini.
                    </div>
                @else
                    <div id="verifyFeedback" class="alert" role="alert" hidden></div>
                    <form id="verifyForm" novalidate>
                        <div class="form-group">
                            <label for="verifyDecision">Keputusan Verifikasi</label>
                            <select id="verifyDecision">
                                <option value="approve">Setujui &amp; Tutup Kasus (Selesai)</option>
                                <option value="reject">Kembalikan untuk Perbaikan Ulang</option>
                            </select>
                        </div>

                        <div id="verifyApproveFields" class="form-group">
                            <label for="learningSummary">Ringkasan Pembelajaran Organisasi *</label>
                            <textarea
                                id="learningSummary"
                                placeholder="Tuliskan pelajaran penting dan perubahan standar agar kejadian serupa tidak berulang..."
                            ></textarea>
                        </div>

                        <div id="verifyRejectFields" class="form-group" hidden>
                            <label for="verifyRejectionReason">Alasan Pengembalian *</label>
                            <textarea
                                id="verifyRejectionReason"
                                placeholder="Jelaskan temuan verifikasi yang masih perlu diperbaiki PIC..."
                            ></textarea>
                        </div>

                        <button type="submit" class="btn btn-industrial">Kirim Keputusan Verifikasi</button>
                    </form>
                @endif
            </section>
        @endif

        @if ($roleEnum->canVerify() && $case->status === CaseStatus::Closed)
            <section class="card" aria-labelledby="reopen-heading">
                <h2 id="reopen-heading">Buka Ulang Kasus</h2>
                <p class="muted">
                    Gunakan hanya apabila masalah muncul kembali atau verifikasi lanjutan diperlukan. Alasan akan dicatat pada log audit permanen.
                </p>
                <div id="reopenFeedback" class="alert" role="alert" hidden></div>
                <form id="reopenForm" novalidate>
                    <div class="form-group">
                        <label for="reopenReason">Alasan Membuka Ulang *</label>
                        <textarea id="reopenReason" required placeholder="Jelaskan temuan baru atau alasan buka ulang kasus..."></textarea>
                    </div>
                    <button type="submit" class="btn btn-danger">Buka Ulang Kasus</button>
                </form>
            </section>
        @endif

        <section class="card" aria-labelledby="timeline-heading">
            <h2 id="timeline-heading">Riwayat Status &amp; Audit Log (Append-Only)</h2>
            @if ($case->statusHistories->isEmpty())
                <div class="empty-state">
                    <p>Belum ada riwayat perubahan status tercatat.</p>
                </div>
            @else
                <ul class="timeline-list">
                    @foreach ($case->statusHistories as $hist)
                        <li class="timeline-item">
                            <div class="row-actions" style="justify-content: space-between;">
                                <strong>{{ $hist->action_name }}</strong>
                                <span class="muted tabular-nums">{{ $hist->created_at?->format('d M Y H:i') ?? '-' }}</span>
                            </div>
                            <div class="muted" style="margin-top: 0.25rem;">
                                Oleh: {{ $hist->changedBy?->name ?? 'Sistem' }}
                                @if ($hist->from_status || $hist->to_status)
                                    | {{ $hist->from_status?->label() ?? '-' }} ke {{ $hist->to_status?->label() ?? '-' }}
                                @endif
                            </div>
                            @if ($hist->reason)
                                <div style="margin-top: 0.35rem;">{{ $hist->reason }}</div>
                            @endif
                        </li>
                    @endforeach
                </ul>
            @endif
        </section>
    </div>

    <dialog id="completeActionDialog" aria-labelledby="completeDialogTitle">
        <div class="modal-header">
            <h2 id="completeDialogTitle" class="modal-title">Selesaikan Tindakan</h2>
            <button id="btnCloseCompleteDialog" type="button" class="close-btn" aria-label="Tutup dialog">&times;</button>
        </div>
        <p id="completeActionTitle" style="font-weight: 600; margin-top: 0;"></p>
        <div id="completeFeedback" class="alert" role="alert" hidden></div>

        <form id="completeActionForm" novalidate>
            <div class="form-group">
                <label for="completion_note">Catatan Penyelesaian *</label>
                <textarea
                    id="completion_note"
                    name="completion_note"
                    required
                    minlength="5"
                    aria-invalid="false"
                    placeholder="Jelaskan hasil perbaikan atau pencegahan yang telah dikerjakan..."
                ></textarea>
            </div>
            <div class="form-group">
                <label for="completePhotos">Foto Bukti Penyelesaian (Opsional)</label>
                <input id="completePhotos" name="photos[]" type="file" multiple accept="image/jpeg,image/png,image/webp">
            </div>
            <div class="row-actions">
                <button type="submit" class="btn btn-industrial">Simpan Penyelesaian</button>
            </div>
        </form>
    </dialog>

    <x-slot:scripts>
        <script type="module" src="{{ asset('js/cases-show.js') }}"></script>
    </x-slot:scripts>
</x-app-layout>
