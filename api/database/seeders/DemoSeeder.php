<?php

namespace Database\Seeders;

use App\Enums\ActionStatus;
use App\Enums\ActionType;
use App\Enums\CaseStatus;
use App\Enums\RiskLevel;
use App\Enums\UserRole;
use App\Models\Area;
use App\Models\CaseAction;
use App\Models\CaseSequence;
use App\Models\CaseStatusHistory;
use App\Models\CaseType;
use App\Models\Category;
use App\Models\Machine;
use App\Models\Organization;
use App\Models\SafetyCase;
use App\Models\Site;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $this->call(DatabaseSeeder::class);

        $org = Organization::query()->where('code', 'PNS')->firstOrFail();
        $site = Site::query()->where('organization_id', $org->id)->where('code', 'SBY1')->firstOrFail();

        $packagingArea = Area::query()->where('organization_id', $org->id)->where('code', 'PACK-A')->firstOrFail();
        $fillingArea = Area::query()->where('organization_id', $org->id)->where('code', 'FILL-1')->firstOrFail();
        $utilityArea = Area::query()->where('organization_id', $org->id)->where('code', 'UTIL-1')->firstOrFail();
        $warehouseArea = Area::query()->firstOrCreate(
            ['organization_id' => $org->id, 'site_id' => $site->id, 'code' => 'WH-FG'],
            ['name' => 'Gudang Bahan & Jadi', 'is_active' => true],
        );

        $extraMachines = [
            ['area_id' => $packagingArea->id, 'code' => 'MCH-SEAL-01', 'name' => 'Mesin Carton Sealer 01', 'qr_token' => 'qr-pns-sby1-seal-01-demo', 'description' => 'Mesin perekat karton otomatis jalur A.'],
            ['area_id' => $packagingArea->id, 'code' => 'MCH-LABL-01', 'name' => 'Mesin Labeling Botol 01', 'qr_token' => 'qr-pns-sby1-labl-01-demo', 'description' => 'Mesin penempel label stiker produk.'],
            ['area_id' => $fillingArea->id, 'code' => 'MCH-MIXR-01', 'name' => 'Tangki Mixing Stainless 01', 'qr_token' => 'qr-pns-sby1-mixr-01-demo', 'description' => 'Tangki pencampur adonan cair kapasitas 1000L.'],
            ['area_id' => $fillingArea->id, 'code' => 'MCH-PAST-01', 'name' => 'Unit Pasteurisasi Plate 01', 'qr_token' => 'qr-pns-sby1-past-01-demo', 'description' => 'Penukar panas suhu tinggi lini filling.'],
            ['area_id' => $utilityArea->id, 'code' => 'MCH-BOIL-01', 'name' => 'Boiler Uap Utama 01', 'qr_token' => 'qr-pns-sby1-boil-01-demo', 'description' => 'Boiler penyuplai uap untuk pasteurisasi.'],
            ['area_id' => $utilityArea->id, 'code' => 'MCH-CHIL-01', 'name' => 'Water Chiller Sentral 01', 'qr_token' => 'qr-pns-sby1-chil-01-demo', 'description' => 'Unit pendingin sirkulasi proses produksi.'],
            ['area_id' => $warehouseArea->id, 'code' => 'MCH-PALW-01', 'name' => 'Mesin Pallet Wrapper 01', 'qr_token' => 'qr-pns-sby1-palw-01-demo', 'description' => 'Pembungkus palet stretch film area gudang.'],
        ];

        foreach ($extraMachines as $item) {
            Machine::query()->firstOrCreate(
                ['organization_id' => $org->id, 'code' => $item['code']],
                [
                    'site_id' => $site->id,
                    'area_id' => $item['area_id'],
                    'name' => $item['name'],
                    'qr_token' => $item['qr_token'],
                    'description' => $item['description'],
                    'is_active' => true,
                ],
            );
        }

        if (SafetyCase::query()->forOrganization($org->id)->exists()) {
            return;
        }

        $machines = Machine::query()->forOrganization($org->id)->get()->keyBy('code');
        $types = CaseType::query()->forOrganization($org->id)->get()->keyBy('code');
        $categories = Category::query()->forOrganization($org->id)->get()->keyBy('code');
        $users = User::query()->forOrganization($org->id)->get()->keyBy(fn (User $u) => $u->role->value);

        $reporter = $users[UserRole::Reporter->value];
        $supervisor = $users[UserRole::Supervisor->value];
        $hse = $users[UserRole::Hse->value];
        $admin = $users[UserRole::Admin->value];

        $year = (int) now()->format('Y');

        $scenarios = [
            // 4 recurring cases on MCH-CONV-01 within 90 days (for B-20, B-23, C-01, U6)
            ['MCH-CONV-01', 'machine_abnormality', 'mechanical', CaseStatus::Closed, 4, 4, RiskLevel::High, 'Belt konveyor pengemasan slip dan berdecit saat beban penuh.', 55, 'Bearing roller sisi kanan kering sehingga menimbulkan gesekan.', 'Penggantian bearing dan penjadwalan pelumasan mingguan berhasil menghilangkan slip.'],
            ['MCH-CONV-01', 'breakdown', 'mechanical', CaseStatus::Closed, 4, 3, RiskLevel::Medium, 'Konveyor pengemasan berhenti mendadak akibat rantai penggerak kendor.', 35, 'Tensioner rantai konveyor bergeser karena getaran kontinu.', 'Pemasangan lock nut pada tensioner rantai menjaga ketegangan tetap stabil.'],
            ['MCH-CONV-01', 'machine_abnormality', 'electrical', CaseStatus::InProgress, 3, 4, RiskLevel::Medium, 'Sensor konveyor pengemasan gagal mendeteksi karton ketika debu menumpuk.', 12, 'Debu karton menutupi lensa sensor fotoelektrik.', null],
            ['MCH-CONV-01', 'unsafe_condition', 'occupational_safety', CaseStatus::New, null, null, null, 'Pelindung samping konveyor pengemasan bagian ujung bergetar dan bautnya kendur.', 2, null, null],

            // Other 26 realistic cases spread across all statuses & risk levels (historical closed cases > 95 days keep only MCH-CONV-01 recurring)
            ['MCH-FILL-01', 'breakdown', 'pneumatic_hydraulic', CaseStatus::Closed, 4, 4, RiskLevel::High, 'Tekanan udara aktuator nozzle filler 3 turun di bawah batas.', 120, 'Seal selang pneumatik retak karena usia pakai.', 'Standarisasi inspeksi selang pneumatik setiap 6 bulan mengurangi gangguan nozzle.'],
            ['MCH-FILL-01', 'machine_abnormality', 'instrumentation', CaseStatus::Closed, 3, 3, RiskLevel::Medium, 'Volume pengisian botol tidak konsisten pada head nomor 5.', 105, 'Kalibrasi flowmeter bergeser pasca pembersihan CIP.', 'Checklist kalibrasi ulang wajib dijalankan setelah setiap siklus CIP.'],
            ['MCH-FILL-01', 'unsafe_condition', 'sanitation', CaseStatus::PendingVerification, 2, 3, RiskLevel::Low, 'Genangan air bilasan di sekitar lantai operator mesin filler.', 4, 'Saluran drainase lantai tersumbat potongan label.', null],
            ['MCH-COMP-01', 'machine_abnormality', 'mechanical', CaseStatus::Closed, 5, 3, RiskLevel::High, 'Suhu outlet kompresor udara meningkat hingga 96 derajat Celsius.', 110, 'Sirip pendingin radiator kompresor tersumbat debu pabrik.', 'Pembersihan sirip radiator bulanan dan alarm suhu praperingatan diterapkan.'],
            ['MCH-COMP-01', 'unsafe_condition', 'occupational_safety', CaseStatus::PendingVerification, 4, 4, RiskLevel::High, 'Suara bising kompresor melebihi 85 dBA saat pintu ruang utilitas terbuka.', 6, 'Peredam pintu ruang kompresor terlepas.', null],
            ['MCH-SEAL-01', 'breakdown', 'electrical', CaseStatus::InProgress, 3, 3, RiskLevel::Medium, 'Elemen pemanas carton sealer tidak mencapai suhu kerja optimal.', 9, 'Kabel terminal heater mengalami oksidasi.', null],
            ['MCH-SEAL-01', 'near_miss', 'occupational_safety', CaseStatus::Analyzed, 4, 2, RiskLevel::Medium, 'Jari operator hampir menyentuh pisau pemotong lakban saat menarik karton macet.', 100, 'Pelindung akrilik di atas pisau pemotong tidak terpasang kembali setelah bersih-bersih.', null],
            ['MCH-LABL-01', 'machine_abnormality', 'mechanical', CaseStatus::Assessed, 2, 2, RiskLevel::Low, 'Gulungan label sering miring saat pergantian rol baru.', 98, null, null],
            ['MCH-LABL-01', 'breakdown', 'instrumentation', CaseStatus::InProgress, 3, 2, RiskLevel::Low, 'Sensor celah label kadang melewati dua botol sekaligus.', 3, null, null],
            ['MCH-MIXR-01', 'unsafe_condition', 'occupational_safety', CaseStatus::Closed, 5, 4, RiskLevel::High, 'Interlock tutup tangki mixing tidak memutus daya motor saat tutup dibuka.', 130, 'Limit switch pengaman tutup tangki macet akibat kerak adonan.', 'Penggantian ke safety switch tertutup IP67 dan tes interlock harian sebelum shift.'],
            ['MCH-MIXR-01', 'machine_abnormality', 'sanitation', CaseStatus::New, null, null, null, 'Paking karet tutup tangki mixing mulai getas dan meninggalkan remah.', 1, null, null],
            ['MCH-PAST-01', 'breakdown', 'instrumentation', CaseStatus::PendingVerification, 4, 4, RiskLevel::High, 'Katup pengalih suhu pasteurisasi terlambat menutup saat suhu turun.', 5, 'Solenoid valve kotor dan membutuhkan kalibrasi.', null],
            ['MCH-PAST-01', 'machine_abnormality', 'mechanical', CaseStatus::Assessed, 3, 3, RiskLevel::Medium, 'Rembesan kecil air panas pada gasket pelat nomor 12 unit pasteurisasi.', 4, null, null],
            ['MCH-BOIL-01', 'near_miss', 'occupational_safety', CaseStatus::Closed, 5, 3, RiskLevel::High, 'Katup buang uap manual menyembur ke jalur jalan teknisi saat blowdown.', 140, 'Pipa pembuangan blowdown tidak diarahkan ke bak penampung tertutup.', 'Pemasangan pipa pengarah ke blowdown pit tertutup dan penandaan zona panas.'],
            ['MCH-BOIL-01', 'unsafe_condition', 'environment', CaseStatus::InProgress, 3, 4, RiskLevel::Medium, 'Isolasi pipa uap di dekat tangga akses terkelupas sepanjang 1 meter.', 11, 'Pelapis aluminium rusak terkena benturan troli.', null],
            ['MCH-CHIL-01', 'machine_abnormality', 'electrical', CaseStatus::Analyzed, 3, 3, RiskLevel::Medium, 'Pompa sirkulasi chiller mengalami trip overload dua kali minggu ini.', 7, 'Arus fasa tidak seimbang pada kontaktor motor pompa.', null],
            ['MCH-CHIL-01', 'breakdown', 'mechanical', CaseStatus::Assessed, 4, 3, RiskLevel::Medium, 'Kipas kondensor chiller mengeluarkan getaran berlebih saat start.', 3, null, null],
            ['MCH-PALW-01', 'incident', 'occupational_safety', CaseStatus::InProgress, 4, 3, RiskLevel::Medium, 'Kaki operator tergores sudut palet kayu saat memutar meja pallet wrapper.', 10, 'Area putar palet belum memiliki garis batas aman.', null],
            ['MCH-PALW-01', 'machine_abnormality', 'mechanical', CaseStatus::New, null, null, null, 'Ketegangan plastik stretch film terlalu kencang sehingga sering putus.', 1, null, null],
            ['MCH-FILL-01', 'near_miss', 'occupational_safety', CaseStatus::Assessed, 3, 2, RiskLevel::Low, 'Kabel ekstensi sementara melintang di jalur dorong troli botol.', 6, null, null],
            ['MCH-SEAL-01', 'unsafe_condition', 'sanitation', CaseStatus::Analyzed, 2, 3, RiskLevel::Low, 'Sisa potongan lakban dan debu menumpuk di bawah rangka mesin sealer.', 9, 'Belum ada tempat sampah khusus di ujung lini pengemasan.', null],
            ['MCH-BOIL-01', 'machine_abnormality', 'instrumentation', CaseStatus::InProgress, 4, 2, RiskLevel::Medium, 'Manometer tekanan uap di panel lokal berkaca buram sehingga sulit dibaca.', 14, null, null],
            ['MCH-LABL-01', 'unsafe_condition', 'other', CaseStatus::New, null, null, null, 'Pencahayaan di atas meja inspeksi label terasa redup saat shift malam.', 0, null, null],
            ['MCH-COMP-01', 'machine_abnormality', 'other', CaseStatus::Rejected, null, null, null, 'Laporan uji coba tombol pelaporan dari ruang utilitas.', 20, null, null],
            ['MCH-CONV-01', 'machine_abnormality', 'mechanical', CaseStatus::Duplicate, null, null, null, 'Sabuk konveyor pengemasan bunyi berdecit lagi saat shift siang.', 54, null, null],
            ['MCH-MIXR-01', 'breakdown', 'electrical', CaseStatus::Rejected, null, null, null, 'Tombol panel tidak menyala karena MCB utama memang sedang dimatikan untuk maintenance.', 18, null, null],
        ];

        $sequenceNumber = 0;
        $firstCaseId = null;

        foreach ($scenarios as [$machineCode, $typeCode, $categoryCode, $status, $sev, $lik, $riskLevel, $desc, $daysAgo, $rootSummary, $learning]) {
            $sequenceNumber++;
            $machine = $machines[$machineCode];
            $reportedAt = now()->subDays($daysAgo)->subHours($sequenceNumber % 8);
            $caseNumber = sprintf('SL-%s-%04d-%04d', $site->code, $year, $sequenceNumber);

            $isClosed = $status === CaseStatus::Closed;
            $isRejectedOrDup = in_array($status, [CaseStatus::Rejected, CaseStatus::Duplicate], true);

            $case = SafetyCase::query()->create([
                'organization_id' => $org->id,
                'site_id' => $site->id,
                'area_id' => $machine->area_id,
                'machine_id' => $machine->id,
                'reporter_id' => $reporter->id,
                'case_type_id' => $types[$typeCode]->id,
                'category_id' => $status !== CaseStatus::New && ! $isRejectedOrDup ? $categories[$categoryCode]->id : null,
                'case_number' => $caseNumber,
                'description' => $desc,
                'is_machine_stopped' => $typeCode === 'breakdown',
                'has_affected_people' => $typeCode === 'incident',
                'status' => $status,
                'severity' => $sev,
                'likelihood' => $lik,
                'risk_score' => ($sev !== null && $lik !== null) ? $sev * $lik : null,
                'risk_level' => $riskLevel,
                'assigned_pic_id' => in_array($status, [CaseStatus::Assessed, CaseStatus::Analyzed, CaseStatus::InProgress, CaseStatus::PendingVerification, CaseStatus::Closed], true) ? $supervisor->id : null,
                'triaged_by' => $status !== CaseStatus::New ? $supervisor->id : null,
                'triaged_at' => $status !== CaseStatus::New ? $reportedAt->copy()->addHours(2) : null,
                'rejection_reason' => $isRejectedOrDup ? 'Laporan uji coba atau sama dengan kasus sebelumnya.' : null,
                'duplicate_of_case_id' => $status === CaseStatus::Duplicate ? $firstCaseId : null,
                'root_cause_category' => $rootSummary !== null ? 'Mesin' : null,
                'five_whys' => $rootSummary !== null ? ['Gejala muncul saat operasi normal.', $rootSummary] : null,
                'root_cause_summary' => $rootSummary,
                'analyzed_by' => $rootSummary !== null ? $supervisor->id : null,
                'analyzed_at' => $rootSummary !== null ? $reportedAt->copy()->addHours(4) : null,
                'learning_summary' => $learning,
                'verified_by' => $isClosed ? $hse->id : null,
                'verified_at' => $isClosed ? $reportedAt->copy()->addDays(2) : null,
                'closed_at' => $isClosed ? $reportedAt->copy()->addDays(2) : null,
                'is_locked' => $isClosed || $isRejectedOrDup,
                'reported_at' => $reportedAt,
            ]);

            if ($firstCaseId === null) {
                $firstCaseId = $case->id;
            }

            CaseStatusHistory::query()->create([
                'organization_id' => $org->id,
                'safety_case_id' => $case->id,
                'changed_by' => $reporter->id,
                'from_status' => null,
                'to_status' => CaseStatus::New->value,
                'action_name' => 'case_reported',
                'created_at' => $reportedAt,
            ]);

            if ($status !== CaseStatus::New) {
                CaseStatusHistory::query()->create([
                    'organization_id' => $org->id,
                    'safety_case_id' => $case->id,
                    'changed_by' => $supervisor->id,
                    'from_status' => CaseStatus::New->value,
                    'to_status' => $status->value,
                    'action_name' => $isClosed ? 'verification_approved' : 'case_triaged',
                    'created_at' => $reportedAt->copy()->addHours(3),
                ]);
            }

            if (in_array($status, [CaseStatus::InProgress, CaseStatus::PendingVerification, CaseStatus::Closed], true)) {
                $actionDone = in_array($status, [CaseStatus::PendingVerification, CaseStatus::Closed], true);
                $makeOverdue = $status === CaseStatus::InProgress && ($sequenceNumber % 2 === 0);

                CaseAction::query()->create([
                    'organization_id' => $org->id,
                    'safety_case_id' => $case->id,
                    'action_type' => ActionType::Corrective,
                    'title' => 'Tindakan perbaikan komponen terkait',
                    'pic_user_id' => $supervisor->id,
                    'created_by' => $supervisor->id,
                    'due_at' => $makeOverdue ? now()->subDays(2) : now()->addDays(5),
                    'status' => $actionDone ? ActionStatus::Completed : ActionStatus::Open,
                    'completion_note' => $actionDone ? 'Perbaikan komponen telah dilaksanakan sesuai SOP.' : null,
                    'completed_at' => $actionDone ? $reportedAt->copy()->addDay() : null,
                    'completed_by' => $actionDone ? $supervisor->id : null,
                ]);

                if (in_array($riskLevel, [RiskLevel::Medium, RiskLevel::High], true)) {
                    CaseAction::query()->create([
                        'organization_id' => $org->id,
                        'safety_case_id' => $case->id,
                        'action_type' => ActionType::Preventive,
                        'title' => 'Penerapan checklist pencegahan berkala',
                        'pic_user_id' => $admin->id,
                        'created_by' => $supervisor->id,
                        'due_at' => $makeOverdue ? now()->subDay() : now()->addDays(10),
                        'status' => $actionDone ? ActionStatus::Completed : ActionStatus::Open,
                        'completion_note' => $actionDone ? 'Checklist pencegahan sudah dimasukkan dalam inspeksi rutin.' : null,
                        'completed_at' => $actionDone ? $reportedAt->copy()->addDays(2) : null,
                        'completed_by' => $actionDone ? $admin->id : null,
                    ]);
                }
            }
        }

        CaseSequence::query()->updateOrCreate(
            ['site_id' => $site->id, 'year' => $year],
            ['organization_id' => $org->id, 'last_sequence' => $sequenceNumber],
        );
    }
}
