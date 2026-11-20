SafetyLog | Panduan Sprint MVP 5 Hari 

#### **S A F E T Y L O G** 

# **Panduan Sprint MVP 5 Hari** 

Backlog, jadwal harian, pembagian tugas, tech stack, dan cara menangani perubahan 

Dari: Afgan (Project Manager / Product Owner)   |   Untuk: Tim SafetyLog   |   Versi 1.0, 14 November 2026 

#### **Cara baca dokumen ini** 

- **Semua orang:** baca bagian 1 sampai 6 (sekitar 10 menit). Itu aturan main kita minggu ini. 

- **Developer:** bagian 7 (daftar kerjaan rinci), 8 (jadwal harian), 9 (aturan produk), 10 (tech stack), dan 13 (pakai AI agent). 

- **Afgan (PO):** bagian 11 (kalau ada perubahan), 12 (wawancara), dan 15 (UAT dan demo). 

- Kalau ada yang kurang jelas, tanya di grup. Pertanyaan itu bagus, tebakan itu mahal. 

##### **Isi dokumen** 

1. Gambaran singkat: apa yang kita bikin 

2. Tujuan sprint dan tanda kita berhasil 

3. Istilah yang dipakai 

4. Tim dan peran 

5. Jadwal dan ritme kerja 

6. Aturan kerja bareng 

7. Product Backlog (daftar kerjaan) rinci 

8. Rencana harian Senin sampai Sabtu 

9. Alur kasus dan aturan produk 

10. Tech stack 

11. Kalau ada perubahan atau tambahan requirement 

12. Wawancara hari Senin 

13. Pakai AI agent dengan benar 

14. Risiko dan antisipasi 

15. UAT dan skrip demo 

16. Lampiran: template 

## **1. Gambaran Singkat: Apa yang Kita Bikin** 

Dokumen ini dibuat oleh Afgan (Project Manager sekaligus Product Owner) untuk seluruh tim. Isinya semua yang perlu kita tahu untuk membangun MVP dalam satu minggu: apa yang dibuat, siapa mengerjakan apa, kapan, dan apa yang dilakukan kalau ada hal yang berubah di tengah jalan. 

### **SafetyLog itu apa?** 

Di banyak pabrik, laporan mesin rusak atau kondisi tidak aman (K3) tercecer di WhatsApp, Excel, atau kertas. Akibatnya penyebab masalah tidak tercatat, tindak lanjut tidak terpantau, dan masalah yang sama muncul lagi. Pengalaman teknisi juga hilang saat orangnya pindah. 

Halaman 1 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

SafetyLog adalah aplikasi web (bisa dibuka di HP) yang membuat setiap masalah **dicatat sekali, ditindaklanjuti sampai tuntas, dan disimpan sebagai pengetahuan yang bisa dicari lagi** . 

### **Alur intinya: 4 tahap** 

|**Tahap**|**Artinya**|**Contohnya di aplikasi**|
|---|---|---|
|**CAPTURE**<br>**(catat)**|Masalah dicatat cepat oleh orang<br>yang melihatnya.|Operator scan QR di mesin, isi 3 kolom, kirim. Kurang<br>dari 1 menit.|
|**RESOLVE**<br>**(selesaikan)**|Masalah dinilai, ditangani, lalu dicek<br>orang lain.|Supervisor menilai risiko, tindakan dibuat dan<br>dikerjakan, petugas K3 memverifikasi.|
|**LEARN**<br>**(pelajari)**|Setiap kasus yang selesai jadi<br>pengetahuan.|Kasus tersimpan, bisa dicari, ada riwayat per mesin<br>dan dashboard.|
|**PREVENT**<br>**(cegah)**|Masalah berulang terlihat dan<br>dicegah.|Kasus sedang/tinggi wajib punya tindakan<br>pencegahan; mesin yang sering bermasalah ditandai.|



### **Yang dibuat minggu ini, dan yang tidak** 

- **Dibuat di MVP minggu ini Tidak dibuat minggu ini (sengaja ditunda)** • Login dengan 4 peran • WhatsApp sebagai jalur lapor • Data mesin dan QR per mesin • Mode offline • Form lapor yang cepat (HP) • AI dan sensor/IoT • Penilaian risiko (skor 5×5) dan penunjukan PIC • Ekspor Excel dan PDF • Analisis penyebab sederhana (5 Why) • Banyak pabrik sekaligus, SSO, integrasi ERP • Tindakan korektif dan preventif • Eskalasi otomatis (sementara cukup label • Verifikasi dan penutupan kasus “Terlambat”) • Perkiraan kerugian (hanya kalau sisa waktu, lihat 

- • Pencarian kasus, riwayat mesin, kasus mirip bagian 7) 

- • Dashboard dasar • Aplikasi native Android/iOS (kita pakai web yang 

- • Riwayat perubahan (audit log) dan notifikasi dalam bisa dipasang di layar utama) 

- aplikasi 

#### **Catatan jujur** 

MVP ini dibangun **sebelum** kita punya bukti pasar yang kuat. Jadi anggap versi minggu ini (v0.1) sebagai alat bantu untuk wawancara dan pilot, bukan produk final. Itu sebabnya hal-hal yang bergantung pada dunia industri (kategori masalah, matriks risiko, nama status, target waktu) dibuat mudah diubah. 

## **2. Tujuan Sprint dan Tanda Kita Berhasil** 

#### **Sprint Goal (tujuan sprint)** 

Pada hari demo (Sabtu, 21 November 2026), operator, supervisor, dan petugas K3 bisa menjalankan satu kasus lengkap di staging lewat HP: **lapor via QR → dinilai risikonya → ada tindakan → diverifikasi dan ditutup → kasusnya ketemu di pencarian dan muncul di dashboard.** 

### **Tanda kita berhasil di hari demo** 

- Tiga peran (operator, supervisor, K3) bisa menjalankan satu kasus penuh dari HP. 

- Lapor lewat QR selesai dalam **60 detik atau kurang** . 

- Dua aturan wajib berjalan: verifikator tidak boleh sama dengan PIC, dan kasus risiko sedang/tinggi tidak bisa ditutup tanpa tindakan preventif. 

Halaman 2 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

- Pencarian tetap menemukan kasus walau ada salah ketik ringan. 

- Dashboard menampilkan angka dari data demo. 

- Tidak ada bug “berat” (bug yang menghalangi alur utama). 

### **Tanggal penting** 

|**Tanggal**|**Apa yang terjadi**|
|---|---|
|**Sabtu–Minggu, 14–15**<br>**Nov**|Persiapan ringan (opsional, sekitar 2 jam): Sandy sketsa kasar layar utama;<br>Panji/Abdil siapkan repo dan server.|
|**Senin, 16 Nov**|Sprint Planning, wawancara HSE/K3, hari pertama build.|
|**Selasa–Rabu, 17–18**<br>**Nov**|Build inti. Refinement untuk menyerap hasil wawancara.|
|**Kamis, 19 Nov**|Build terakhir.**Feature freeze pukul 17.00**(setelah ini hanya perbaikan bug).|
|**Jumat, 20 Nov**|UAT (uji terima), bug bash, deploy final, rekam video cadangan.|
|**Sabtu, 21 Nov**|**Demo**(= Sprint Review), lalu Retro.|



### **Hitungan kapasitas (asumsi, boleh dikoreksi)** 

|**Komponen**|**Jam kerja**|
|---|---|
|Jam tersedia: 6 orang × 5 jam efektif × 5 hari (Senin–Jumat)|150|
|Dikurangi acara Scrum (planning, daily, refinement)|−20|
|Jam kerja efektif|±130|
|Komitmen kita: semua item Must + Should (estimasi tanpa bantuan AI)|±114|
|Sisa kalau AI tidak membantu (buffer perubahan)|±16|
|Perkiraan percepatan AI agent, hanya untuk pekerjaan kode|1,3 sampai 1,5 kali|
|Sisa buffer kalau AI terbukti membantu|±40 sampai 55|



**Pegangan:** rencanakan seolah AI tidak membantu (buffer 16 jam). Kalau Rabu sore semua target sudah tercapai, baru kita tarik item stretch (Could). Kalau jam efektif ternyata lebih kecil dari 5 jam per orang karena sekolah, pakai aturan potong di bagian 7. 

## **3. Istilah yang Dipakai** 

Biar semua satu bahasa. Kalau ada istilah baru yang muncul di grup, tambahkan di sini. 

|**Istilah**|**Artinya (bahasa sederhana)**|
|---|---|
|**Tentang Scrum**||
|**Agile / Scrum**|Cara kerja tim dalam putaran pendek. Kita bekerja per sprint, lihat hasil, lalu<br>menyesuaikan.|
|**Sprint**|Satu putaran kerja dengan batas waktu. Sprint kita 5 hari (Senin–Jumat), demo hari<br>Sabtu.|
|**Product Backlog**|Daftar semua kerjaan yang mungkin dilakukan, diurutkan dari yang paling penting.|
|**Sprint Goal**|Satu kalimat tujuan sprint. Scope boleh bergeser, tujuan ini yang dijaga.|
|**Product Owner (PO)**|Orang yang memutuskan apa yang dibuat dan urutan prioritasnya. Di tim ini: Afgan.|



Halaman 3 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**Istilah**|**Artinya (bahasa sederhana)**|
|---|---|
|**Scrum Master (SM)**|Orang yang menjaga proses berjalan: pegang waktu daily dan catat hambatan. Kita<br>gilir tiap hari.|
|**Daily Scrum (Daily)**|Rapat berdiri 15 menit tiap hari: kemarin apa, hari ini apa, ada hambatan apa.|
|**Refinement**|Rapat singkat untuk memperjelas dan mengurutkan ulang item backlog.|
|**Sprint Review**|Pamer hasil kerja. Untuk kita: demo hari Sabtu.|
|**Retro (Retrospective)**|Evaluasi cara kerja: apa yang bagus, apa yang diperbaiki.|
|**Definition of Done**<br>**(DoD)**|Daftar syarat sebuah kerjaan boleh disebut “selesai”.|
|**Feature freeze**|Batas waktu berhenti menambah fitur. Setelah itu hanya memperbaiki bug.|
|**Buffer**|Jam cadangan yang sengaja tidak diisi, untuk perubahan dan hal tak terduga.|
|**Tentang pekerjaan tekn**|**is**|
|**MVP**|Versi produk paling sederhana yang sudah bisa dipakai dan dipelajari.|
|**Staging**|Server percobaan. Mirip aplikasi asli tapi untuk tes dan demo, bukan untuk<br>pelanggan.|
|**PR (Pull Request)**|Permintaan untuk menggabungkan kode ke cabang utama. Wajib dicek orang lain<br>dulu.|
|**CI/CD**|Robot yang otomatis menjalankan tes (CI) dan memasang versi baru ke server (CD)<br>setiap kode digabung.|
|**Frontend / Backend**|Frontend = bagian yang dilihat dan disentuh pengguna. Backend = “otak” di server<br>yang menyimpan data dan menjalankan aturan.|
|**API**|Pintu komunikasi antara frontend dan backend.|
|**UAT**|User Acceptance Test: uji skenario nyata untuk memastikan fitur benar-benar<br>bekerja seperti yang diminta.|
|**PWA**|Web yang bisa “dipasang” di layar utama HP seperti aplikasi.|
|**AI agent**|Asisten AI yang bisa menulis dan mengubah kode (misalnya Claude Code). Kita<br>pakai sebagai pembantu bukan pengambil keputusan.|
|**Tentang dunia K3 / pabr**|,<br>**ik**|
|**K3 / HSE**|Keselamatan dan Kesehatan Kerja / Health, Safety, Environment.|
|**Near miss (nyaris**<br>**celaka)**|Kejadian yang hampir menyebabkan cedera atau kerusakan, tapi tidak terjadi.|
|**Triase**|Menilai laporan yang baru masuk: seberapa serius, siapa yang menangani.|
|**PIC**|Person In Charge: orang yang bertanggung jawab atas sebuah tindakan.|
|**CAPA**|Corrective and Preventive Action: tindakan memperbaiki masalah (korektif) dan<br>mencegahnya terulang (preventif).|
|**5 Why / 6M**|Cara mencari akar penyebab: tanya “kenapa” berulang kali (5 Why) dan<br>kelompokkan penyebab ke Manusia, Mesin, Metode, Material, Pengukuran,<br>Lingkungan (6M).|
|**Verifikator**|Orang yang memeriksa bahwa tindakan benar-benar selesai dan efektif. Tidak boleh<br>orang yang sama dengan pelaksana.|



Halaman 4 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **4. Tim dan Peran** 

Scrum tidak punya jabatan “PM”. Perannya Product Owner, Scrum Master, dan Developer. Semua anggota tim adalah developer, dengan keahlian utama berbeda. 

|**Nama**|**Peran Scrum**|**Fokus teknis**|**Tanggung jawab utama**|
|---|---|---|---|
|**Afgan**|Product Owner +<br>Developer|Project manager;<br>backend/frontend<br>ringan|Memutuskan prioritas dan scope, wawancara,<br>menerima atau menolak hasil kerja, menjaga<br>change log, memimpin demo. Juga mengerjakan<br>B-13, B-17, B-22.|
|**Reva**|Developer + Agent<br>Lead|AI engineer; data,<br>pencarian, backend|Skema database (bareng Nadim), data master<br>dan seed, pencarian dan kasus mirip, data<br>dashboard. Merawat AGENTS.md dan kumpulan<br>prompt tim.|
|**Nadim**|Developer|Backend inti|Login dan peran, API kasus, triase, tindakan,<br>verifikasi, dan semua aturan bisnis.|
|**Panji**|Developer +<br>DevOps|Infrastruktur, CI,<br>keamanan|Repo dan CI, QR, upload foto, notifikasi, PWA,<br>pengamanan (hardening).|
|**Sandy**|Developer + UI/UX|Desain dan frontend|Wireframe, design tokens, form lapor, triase,<br>dashboard, uji kegunaan ke orang awam.|
|**Abdil**|Developer +<br>DevOps|Server dan frontend|Staging dan auto-deploy, kerangka frontend,<br>halaman tindakan, verifikasi, dan pencarian,<br>backup dan rollback.|



### **Scrum Master bergilir (usulan, boleh tukar)** 

|**Senin**|**Selasa**|**Rabu**|**Kamis**|**Jumat**|**Sabtu**|
|---|---|---|---|---|---|
|Nadim|Sandy|Abdil|Panji|Reva|Afgan (pimpin demo)|



Tugas SM harian: memulai daily tepat waktu, menjaga daily maksimal 15 menit, mencatat hambatan di satu tempat, dan menagih orang yang butuh bantuan supaya tidak diam. 

### **Siapa memutuskan apa** 

- **Afgan (PO)** memutuskan apa yang dibuat, prioritas, dan apakah sebuah hasil diterima. 

- **Developer** memutuskan cara teknis dan menaksir lama pengerjaan. PO tidak memaksa angka. 

- **Kalau stuck lebih dari 1 jam** , tanya di grup. Jangan menunggu sampai daily. 

- **Kalau merasa Sprint Goal terancam** , bilang ke Afgan secepatnya, paling lambat Rabu. 

## **5. Jadwal dan Ritme Kerja** 

|**Acara**|**Kapan**|**Durasi**|**Isi dan tujuan**|
|---|---|---|---|
|**Sprint Planning**|Senin, awal hari|60 menit|Baca Sprint Goal, pastikan semua paham item<br>Must, tanya jawab, konfirmasi pembagian tugas.<br>Kalau wawancara bentrok, planning tetap jalan<br>dengan backlog apa adanya; hasil wawancara<br>diserap di Refinement Selasa.|



Halaman 5 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**Acara**|**Kapan**|**Durasi**|**Isi dan tujuan**|
|---|---|---|---|
|**Daily Scrum**|Senin–Jumat, jam<br>tetap (disepakati<br>Senin; usul malam<br>via call kalau siang<br>bentrok sekolah)|15 menit|Tiga hal saja: (1) kemarin apa yang**sudah jalan**<br>**di staging**, (2) hari ini mengerjakan apa, (3) ada<br>hambatan apa. Hambatan dibahas**sesudah**<br>daily oleh yang terkait.|
|**Refinement 1**|Selasa pagi|30 menit|Masukkan hasil wawancara ke backlog, perjelas<br>item, urutkan ulang.|
|**Refinement 2**|Rabu sore|30 menit|Cek apakah target on track, putuskan Could<br>mana yang ditarik, tutup pintu perubahan.|
|**Demo mini**|Rabu sore|15 menit|Tunjukkan alur lapor sampai triase ke Afgan.|
|**Feature freeze**|Kamis 17.00|-|Berhenti menambah fitur. Setelah ini hanya<br>perbaikan bug.|
|**UAT dan bug bash**|Jumat pagi|±3 jam|Semua orang menjalankan 10 skenario uji<br>(bagian 15) dan mencatat bug.|
|**Sprint Review**<br>**(Demo)**|Sabtu|±60 menit|Demo ke audiens. Skrip ada di bagian 15.|
|**Retro**|Sabtu, sesudah<br>demo|45 menit|Apa yang berjalan baik, apa yang diperbaiki, pilih<br>1–2 aksi.|



### **Aturan komunikasi** 

- Satu grup utama untuk koordinasi harian. Hal teknis panjang dibahas di komentar PR atau issue supaya tidak tenggelam di chat. 

- Balas chat tim dalam **30 menit** selama jam kerja sprint. Kalau tidak bisa, bilang “lagi tidak bisa, balik jam sekian”. 

- Hambatan dicatat di satu tempat (daftar “Hambatan” di board). Jangan hanya di chat. 

## **6. Aturan Kerja Bareng** 

### **Aturan Git dan PR** 

- Cabang **main** selalu dalam kondisi jalan. Setiap merge ke main otomatis naik ke staging. 

- Dilarang push langsung ke main. Semua lewat **PR** dengan **minimal 1 reviewer** . 

- Satu item backlog = satu cabang = satu PR. Nama cabang: **feature/B-08-form-lapor** . 

- Judul PR diawali ID item, misalnya **B-08: Form lapor** . Pesan commit juga diawali ID. 

- PR kecil dan sering. Reviewer membalas dalam maksimal 2 jam kerja. 

- Tes harus lulus (CI hijau) sebelum merge. 

- Rebase atau tarik main setiap pagi supaya konflik kecil dan cepat diselesaikan. 

- Dilarang menyimpan password, token, atau file .env di repo. 

### **Penamaan dan bahasa** 

- Nama tabel, variabel, dan fungsi dalam bahasa Inggris. Teks yang dilihat pengguna dalam bahasa Indonesia yang sederhana. 

- Semua angka kerugian ditulis dengan label “perkiraan”. 

- Layar minimal 360 px, teks minimal 16 px, area sentuh minimal 44 px, bisa dipakai satu tangan. 

Halaman 6 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

### **Definition of Ready (kapan item siap dikerjakan)** 

- Ada penjelasan singkat dan kriteria selesai (lihat bagian 7). 

- Dependensi sudah jelas (misalnya butuh skema DB dulu). 

- Ada PIC utama. 

### **Definition of Done (kapan item boleh disebut selesai)** 

- Jalan di **staging** , bukan hanya di laptop. 

- Sudah dicoba di HP. 

- PR sudah di-review satu orang dan digabung ke main. 

- Kriteria selesai item (bagian 7) terpenuhi, dan Afgan menerima hasilnya. 

- Aturan produk di bagian 9 tidak dilanggar. 

- Kalau item punya aturan bisnis, ada tes otomatisnya. 

Halaman 7 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **7. Product Backlog (Daftar Kerjaan) Rinci** 

Prioritas: **M** = Must (wajib, kita berkomitmen), **S** = Should (kita komit juga, tapi yang pertama dikorbankan kalau waktu mepet). Jam = perkiraan kasar jam kerja per item (frontend + backend), **tanpa** memperhitungkan bantuan AI. 

**Komitmen = semua Must (±96 jam) + semua Should (±18 jam).** Urutan menarik Should kalau kita mepet: B-13, B-20, B-10, B-18, B-17, B-25 (dari yang paling dipertahankan). 

|**ID**|**Item dan penjelasan**|**Kriteria selesai**|**Prio ·**<br>**Jam**|**PIC**|
|---|---|---|---|---|
|**A. Fon**|**dasi**||||
|B-01|**Setup repo, CI, aturan kerja**<br>Satu repo berisi folder api<br>(Laravel) dan web (React), plus CI<br>otomatis.|• Semua anggota bisa menjalankan<br>proyek di laptop dengan README<br>maksimal 10 langkah.<br>• Cabang main dilindungi (wajib PR + 1<br>reviewer).<br>• CI otomatis menjalankan tes dan lint di<br>setiap PR.|M · 4|Panji|
|B-02|**Server staging dan auto-deploy**<br>Server percobaan yang bisa<br>dibuka dari HP, ter-update<br>otomatis.|• Alamat HTTPS bisa dibuka dari HP.<br>• Setiap merge ke main otomatis<br>terpasang di staging.<br>• Database PostgreSQL berjalan; ada<br>catatan cara restart.|M · 6|Abdil|
|B-03|**Skema database, migrasi,**<br>**seeder**<br>Tabel-tabel inti dan data awal.|• Tabel: organisasi, site, area, mesin,<br>user + peran, kasus, tindakan, lampiran,<br>riwayat perubahan, kategori,<br>konfigurasi.<br>• Semua tabel utama punya<br>organization_id (pemisah data antar<br>pelanggan).<br>• Seeder mengisi 1 organisasi, 1 site, 3<br>mesin contoh, 4 user (satu per peran).<br>• Bisa dibangun ulang dari nol dengan<br>satu perintah.|M · 5|Reva +<br>Nadim|
|B-04|**Wireframe dan design tokens**<br>Sketsa 3 layar utama dan “bahan<br>bangunan” tampilan.|• Wireframe Lapor, Triase/Detail kasus,<br>dan Dashboard disetujui Afgan.<br>• Warna, font, ukuran tombol, badge<br>risiko, kartu, dan input siap dipakai<br>ulang.<br>• Semua layar nyaman di lebar 360 px.|M · 8|Sandy|
|**B. Aku**|**n dan data master**||||
|B-05|**Login dan 4 peran**<br>Pelapor, Supervisor,<br>K3/Verifikator, Manajer/Admin.|• Login email dan password; sesi<br>tersimpan (tidak login ulang tiap<br>melapor).<br>• Halaman yang bukan hak peran<br>tersebut**ditolak**(bukan hanya<br>disembunyikan).<br>• Percobaan login salah dibatasi (rate<br>limit).|M · 5|Nadim|



Halaman 8 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**ID**|**Item dan penjelasan**|**Kriteria selesai**|**Prio ·**<br>**Jam**|**PIC**|
|---|---|---|---|---|
|B-06|**Kelola area dan mesin**<br>Halaman admin sederhana.|• Admin bisa tambah, ubah, dan arsipkan<br>area dan mesin.<br>• Setiap mesin punya kode unik dan<br>token QR acak (bukan nomor urut yang<br>bisa ditebak).|M · 4|Reva|
|B-07|**QR per mesin**<br>Kode QR yang ditempel di mesin.|• Setiap mesin punya halaman cetak QR<br>yang siap ditempel.<br>• Scan QR di HP membuka form lapor<br>dengan mesin sudah terpilih.<br>• Kalau belum login: diarahkan login lalu<br>kembali ke form.|M · 3|Panji|
|**C. Cap**|**ture (melapor)**||||
|B-08|**Form lapor**<br>Halaman terpenting: harus cepat<br>dan tidak membingungkan.|• Hanya 3 isian wajib: mesin, jenis kasus,<br>deskripsi.<br>• Ditambah 2 pertanyaan cepat (mesin<br>berhenti? ada orang terdampak?) dan<br>foto (opsional).<br>• Kirim → nomor kasus otomatis format<br>**SL-{KODE SITE}-{TAHUN}-{URUTAN**<br>**4 DIGIT}**.<br>• Lapor selesai dalam 60 detik atau<br>kurang.<br>• Jenis “Insiden” dengan orang terdampak<br>menampilkan pengingat: ikuti prosedur<br>darurat perusahaan (SafetyLog bukan<br>pengganti prosedur resmi).|M · 8|Sandy<br>(tampilan) +<br>Nadim<br>(server)|
|B-09|**Upload foto**<br>Foto dari kamera HP.|• Foto diperkecil di HP sebelum dikirim.<br>• Jenis dan ukuran file divalidasi (usul:<br>JPG/PNG/WebP, maksimal 5 MB<br>setelah dikompres).<br>• Foto muncul di detail kasus.|M · 4|Panji|
|B-10|**Peringatan kasus terbuka**<br>Mencegah laporan ganda.|• Saat memilih mesin yang punya kasus<br>belum selesai dalam 7 hari terakhir,<br>muncul peringatan dan tautan ke kasus<br>itu.<br>• Pelapor tetap boleh melanjutkan.|S · 2|Nadim|
|**D. Res**|**olve (menyelesaikan)**||||
|B-11|**Antrean triase dan detail kasus**<br>Tempat Supervisor melihat<br>laporan baru.|• Supervisor melihat daftar kasus<br>berstatus Baru (terbaru di atas) dengan<br>filter dasar.<br>• Buka kasus → satu layar ringkas:<br>kejadian, foto, risiko, penyebab,<br>tindakan, status.|M · 6|Nadim<br>(server) +<br>Sandy<br>(tampilan)|



Halaman 9 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**ID**|**Item dan penjelasan**|**Kriteria selesai**|**Prio ·**<br>**Jam**|**PIC**|
|---|---|---|---|---|
|B-12|**Penilaian risiko, PIC,**<br>**tolak/duplikat**<br>Menentukan seberapa serius<br>sebuah kasus.|• Supervisor mengisi keparahan (1–5)<br>dan kemungkinan terulang (1–5).<br>• Skor = keparahan × kemungkinan; level<br>otomatis: 1–6 Rendah, 7–14 Sedang, 15<br>–25 Tinggi. Contoh: 4 × 4 = 16 →<br>Tinggi.<br>• Bisa menunjuk PIC; bisa menolak<br>(alasan wajib) atau menandai duplikat<br>(pilih kasus aslinya).<br>• Status berpindah Baru → Dinilai.<br>• Ambang skor diambil dari tabel<br>konfigurasi, tidak ditulis mati di kode.|M · 5|Nadim +<br>Sandy|
|B-13|**Analisis penyebab**<br>Mencari akar masalah, bentuk<br>sederhana.|• Form 5 Why (maksimal 5 baris<br>“kenapa?”) dan pilihan kategori akar<br>penyebab (Manusia, Mesin, Metode,<br>Material, Pengukuran, Lingkungan).<br>• Status Dinilai → Dianalisis. Kalau item<br>ini tidak sempat, status Dianalisis<br>dilewati.|S · 4|Afgan|
|B-14|**Tindakan korektif/preventif**<br>Daftar tindakan untuk<br>menyelesaikan kasus.|• Dari sebuah kasus bisa menambah<br>tindakan: jenis<br>(Sementara/Korektif/Preventif), judul,<br>PIC, tenggat.<br>• Halaman “Tindakan Saya” menampilkan<br>tindakan milik pengguna, tenggat<br>terdekat di atas.<br>• Status kasus menjadi Tindakan berjalan<br>setelah ada tindakan pertama.|M · 6|Nadim<br>(server) +<br>Abdil<br>(tampilan)|
|B-15|**Menyelesaikan tindakan**<br>PIC melaporkan hasil tindakan.|• PIC menandai tindakan selesai dengan<br>catatan hasil (wajib) dan foto bukti<br>(opsional).<br>• Kalau semua tindakan selesai, status<br>kasus otomatis jadi Menunggu verifikasi.|M · 3|Nadim + Abdil|
|B-16|**Verifikasi dan tutup kasus**<br>Pemeriksaan oleh orang yang<br>berbeda.|• Verifikator bisa Setujui (kasus Selesai<br>dan terkunci) atau Tolak (kembali ke<br>Tindakan berjalan, alasan wajib).<br>• Sistem**menolak**kalau verifikator sama<br>dengan PIC tindakan di kasus itu.<br>• Kasus Sedang/Tinggi tidak bisa ditutup<br>tanpa minimal 1 tindakan Preventif.<br>• Ringkasan pembelajaran wajib diisi saat<br>menutup kasus.|M · 5|Nadim<br>(server) +<br>Abdil<br>(tampilan)|
|B-17|**Buka ulang kasus**<br>Kalau masalah muncul lagi.|• Kasus Selesai bisa dibuka ulang oleh<br>K3/Verifikator atau Admin dengan<br>alasan.<br>• Kasus kembali ke Tindakan berjalan;<br>pembukaan ulang tercatat di riwayat.|S · 2|Afgan|
|B-18|**Notifikasi dalam aplikasi**<br>Lonceng pemberitahuan.|• Notifikasi muncul saat: kasus baru<br>(Supervisor), ditunjuk jadi PIC, tindakan<br>mendekati tenggat, kasus menunggu<br>verifikasi.<br>• Tindakan melewati tenggat diberi label<br>merah “Terlambat”.|S · 4|Panji|



Halaman 10 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**ID**|**Item dan penjelasan**|**Kriteria selesai**|**Prio ·**<br>**Jam**|**PIC**|
|---|---|---|---|---|
|**E. Lea**|**rn (belajar dari kasus)**||||
|B-19|**Pencarian kasus**<br>Perpustakaan kasus yang bisa<br>dicari.|• Kolom cari: ketik kata, salah ketik ringan<br>tetap ketemu (misal “konvayor”<br>menemukan “konveyor”). Hasil dalam<br>kurang dari 2 detik.<br>• Filter: mesin, kategori, status, level<br>risiko, rentang tanggal.|M · 6|Reva (server)<br>+ Abdil<br>(halaman)|
|B-20|**Riwayat mesin dan kasus mirip**<br>Belajar dari kejadian sebelumnya.|• Halaman mesin menampilkan semua<br>kasusnya.<br>• Di detail kasus ada panel “Kasus mirip”<br>(maksimal 5) berdasarkan kemiripan<br>teks,**bukan AI**, dengan sumber kasus<br>yang jelas.|S · 4|Reva|
|B-21|**Dashboard dasar**<br>Ringkasan untuk manajer.|• Kartu: jumlah kasus terbuka, terlambat,<br>selesai bulan ini.<br>• Grafik: kasus per mesin dan per<br>kategori; daftar tindakan terlambat<br>(sebaran risiko kalau sempat).<br>• Terbuka dalam kurang dari 3 detik<br>dengan data demo.|M · 6|Reva (data) +<br>Sandy<br>(tampilan)|
|**F. Pen**|**utup dan kualitas**||||
|B-22|**Riwayat perubahan (audit log)**<br>Jejak siapa mengubah apa.|• Setiap perubahan status tercatat: siapa,<br>kapan, dari status apa ke apa, alasan.<br>• Log hanya bisa ditambah, tidak bisa<br>diubah atau dihapus lewat aplikasi.<br>• Kasus Selesai terkunci.|M · 3|Afgan|
|B-23|**Data demo (seed) realistis**<br>Data fiktif tapi masuk akal.|• Minimal 10 mesin dan ±30 kasus<br>tersebar di semua status, kategori, dan<br>level risiko.<br>• Ada 3–4 kasus berulang di satu mesin<br>(untuk demo).<br>• Tidak memakai data asli dari<br>narasumber.|M · 3|Reva|
|B-24|**UAT, bug bash, skrip demo**<br>Menguji sebelum dipamerkan.|• 10 skenario UAT (bagian 15) dijalankan<br>dan hasilnya dicatat.<br>• Bug berat = 0.<br>• Skrip demo final dan sudah dilatih 1 kali<br>penuh.|M · 6|Semua<br>(Afgan<br>memimpin)|
|B-25|**PWA (bisa dipasang di layar**<br>**utama)**<br>Terasa seperti aplikasi.|• Muncul opsi “Tambahkan ke layar<br>utama” di HP; ikon dan nama tampil<br>benar.|S · 2|Panji|



### **Item stretch (Could): tidak disentuh dulu** 

Ditarik hanya kalau Rabu sore semua target sudah tercapai. Urutan: dari atas. 

|**ID**|**Item**|**Penjelasan**|
|---|---|---|
|**C-01**|Label “Berulang”|Mesin dengan 3 kasus atau lebih dalam 90 hari diberi label<br>Berulang. Murah dikerjakan dan efeknya bagus saat demo (±2 jam,<br>Reva).|



Halaman 11 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**ID**|**Item**|**Penjelasan**|
|---|---|---|
|**C-02**|Perkiraan kerugian sederhana|Rumus: jam berhenti × biaya per jam lini + biaya suku cadang + jam<br>kerja teknisi × tarif. Selalu berlabel “perkiraan”.**Menunggu**angka<br>biaya per jam dari wawancara dan keputusan rumus final (±4 jam,<br>Afgan).|
|**C-03**|Impor mesin dari CSV|Admin mengunggah daftar mesin sekaligus (±3 jam).|
|**C-04**|Notifikasi email|Pemberitahuan juga lewat email (±3 jam).|



### **Sengaja ditunda (bukan MVP seminggu)** 

|**Fitur**|**Alasan ditunda**|
|---|---|
|**WhatsApp**|Butuh penyedia resmi dan biaya; bisa nanti setelah alur inti terbukti.|
|**Mode offline (draf)**|Butuh rancangan khusus; bukan kebutuhan demo.|
|**AI dan sensor/IoT**|Keputusan produk: MVP tanpa AI dan IoT. AI hanya pendukung keputusan<br>di tahap lanjut.|
|**Ekspor Excel/PDF**|Berguna untuk audit, tapi bukan inti alur.|
|**Eskalasi otomatis**|Sementara diganti label “Terlambat” dan notifikasi.|
|**Cek efektivitas 30 hari, laporan**<br>**anonim, banyak site, SSO**|Fase berikutnya, setelah ada pilot.|



#### **Kalau kapasitas ternyata kurang, potong dengan urutan ini** 

Berhenti di tiap langkah kalau sudah cukup: 

- **1.** Buang semua item Should (S). 

- **2.** Sederhanakan B-21 menjadi kartu dan daftar terlambat saja. 

- **3.** Sederhanakan B-12: buang fitur tolak/duplikat. 

- Yang **tidak** boleh dipotong: B-08, B-12 (skor), B-14, B-16, B-19, B-22, dan B-24. Itulah inti demo. 

Halaman 12 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **8. Rencana Harian Senin sampai Sabtu** 

Pembagian tugas di bawah adalah rencana awal. Boleh bertukar antarorang kalau ada yang lebih cepat atau tersangkut, asal diberi tahu di daily. Setiap hari ada **target akhir hari** yang harus tercapai; kalau tidak, bilang saat daily berikutnya. 

#### **Persiapan opsional, Sabtu–Minggu (±2 jam)** 

- **Sandy:** sketsa kasar layar Lapor, Detail kasus, dan Dashboard. Bisa ditunjukkan 5 menit ke narasumber Senin untuk bertanya “alurnya benar nggak?”. 

- **Abdil dan Panji:** siapkan akun server, nama domain, dan repo kosong. 

- **Afgan:** finalkan pertanyaan wawancara (bagian 12). 

### **Senin, 16 November: Pondasi dan Wawancara** 

|**Orang**|**Tugas**|
|---|---|
|**Afgan**|• Sprint Planning (60 menit): bacakan Sprint Goal, pastikan semua paham item Must.<br>• Wawancara dengan praktisi HSE/K3.<br>• Malam: debrief 30–45 menit, tandai setiap item backlog:**Confirmed / Berubah / Baru /**<br>**Gugur**.|
|**Reva**|• B-03 skema database (bareng Nadim).<br>• Tulis AGENTS.md versi pertama (bareng Panji), lihat bagian 13.|
|**Nadim**|• B-03 skema database (bareng Reva).<br>• B-05 login dan 4 peran.|
|**Panji**|• B-01 repo, struktur folder, CI, aturan branch dan PR.<br>• Template PR dan README cara menjalankan proyek.|
|**Sandy**|• B-04 wireframe 3 layar dan design tokens.<br>• Tunjukkan ke Afgan sore hari untuk disetujui.|
|**Abdil**|• B-02 server staging: Docker, HTTPS, database.|



#### **Target akhir hari Senin** 

- Repo dan CI jalan; staging bisa dibuka dari HP (halaman awal cukup). 

- Skema ter-migrate di staging; login jalan. 

- Wireframe disetujui Afgan. 

- Hasil wawancara sudah ditandai di backlog. 

### **Selasa, 17 November: Melapor dan Data Master** 

Acara: Refinement pagi 30 menit (serap hasil wawancara). 

|**Orang**|**Tugas**|
|---|---|
|**Afgan**|• Refinement: masukkan hasil wawancara ke backlog.|
||• B-22 riwayat perubahan (audit log).|
||• Uji dan terima atau tolak hasil B-08 (form lapor).|
|**Reva**|• B-06 kelola area dan mesin.|
||• Siapkan index pencarian di database (full-text dan kemiripan teks).|



Halaman 13 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**Orang**|**Tugas**|
|---|---|
|**Nadim**|• B-08 sisi server: kirim laporan, nomor kasus otomatis, validasi.<br>• B-10 peringatan kasus terbuka.|
|**Panji**|• B-07 QR per mesin dan halaman cetak.<br>• B-09 upload foto (kompres di HP, validasi file).|
|**Sandy**|• Komponen UI dasar dari design tokens.<br>• B-08 halaman form lapor (mobile-first).|
|**Abdil**|• Selesaikan auto-deploy ke staging (B-02).<br>• Kerangka frontend: login, menu sesuai peran, layout.|
|**Target a**<br>Dari HP: s|**khir hari Selasa**<br>can QR → login → lapor → dapat nomor kasus, di staging.|



### **Rabu, 18 November: Triase, Risiko, dan Tindakan** 

Acara: Refinement ke-2 (sore, 30 menit) dan demo mini 15 menit. 

|**Orang**|**Tugas**|
|---|---|
|**Afgan**|• B-13 analisis penyebab (5 Why dan 6M).<br>• Finalkan skenario UAT (bagian 15).<br>• Refinement ke-2: putuskan item Could yang ditarik; tutup pintu perubahan.|
|**Reva**|• B-19 pencarian: sisi server dan filter.<br>• Seed awal: kategori dan 10 mesin.|
|**Nadim**|• B-11 antrean triase dan detail kasus (server).<br>• B-12 skor risiko, PIC, tolak/duplikat.<br>• B-14 tindakan (server).|
|**Panji**|• B-18 notifikasi dalam aplikasi dan label Terlambat.<br>• B-25 PWA.|
|**Sandy**|• B-11 dan B-12 tampilan: antrean triase, detail kasus, form penilaian risiko.|
|**Abdil**|• B-14 tampilan: tambah tindakan dan halaman Tindakan Saya.|



#### **Target akhir hari Rabu** 

- Kasus bisa berjalan dari Baru sampai Tindakan berjalan. 

- Demo mini ke Afgan sudah dilakukan. 

- Semua target Senin–Rabu on track, atau sudah ada rencana tukar item. 

### **Kamis, 19 November: Verifikasi, Pencarian, Dashboard** 

|**Orang**|**Tugas**|
|---|---|
|**Afgan**|• B-17 buka ulang kasus.|
||• Uji alur end-to-end dari lapor sampai tutup.|
||• Stretch: C-02 perkiraan kerugian kalau angka dari wawancara sudah ada.|
||• **Feature freeze pukul 17.00.**|



Halaman 14 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**Orang**|**Tugas**|
|---|---|
|**Reva**|• B-20 riwayat mesin dan kasus mirip.<br>• B-21 data dashboard (server).<br>• Stretch: C-01 label Berulang.<br>• Seed lengkap (±30 kasus).|
|**Nadim**|• B-15 menyelesaikan tindakan (server).<br>• B-16 verifikasi dan tutup kasus, plus aturan wajibnya.|
|**Panji**|• Pengamanan: batas percobaan login, validasi file, header keamanan, cek hak akses semua<br>endpoint.<br>• Backup database harian (bareng Abdil).<br>• Bantu bug integrasi.|
|**Sandy**|• B-21 tampilan dashboard.<br>• Poles tampilan HP.|
|**Abdil**|• B-15 dan B-16 tampilan (selesaikan tindakan, verifikasi/tutup).<br>• B-19 halaman pencarian.|



#### **Target akhir hari Kamis** 

- Satu kasus bisa ditutup dari awal sampai akhir di staging. 

- Feature freeze 17.00 diberlakukan. 

- Daftar bug sudah dibuat. 

### **Jumat, 20 November: UAT dan Perapian** 

Tidak ada fitur baru hari ini. Fokus: menguji, memperbaiki, dan menyiapkan demo. 

|**Orang**|**Tugas**|
|---|---|
|**Afgan**|• Memimpin UAT 10 skenario (pagi) dan mencatat hasilnya.<br>• Menentukan bug mana yang wajib diperbaiki.<br>• Menulis skrip demo final.<br>• Malam: rekam video demo penuh sebagai cadangan (bareng 1 orang).|
|**Reva**|• Bug bash.<br>• Tuning relevansi pencarian.<br>• Seed demo final dan cara me-reset data demo.|
|**Nadim**|• Memperbaiki bug sisi server.|
|**Panji**|• Smoke test staging, perbaiki bug.<br>• Siapkan hotspot dan perangkat cadangan untuk demo.|
|**Sandy**|• Uji kegunaan ke 3–5 orang awam: ukur waktu lapor (target ±60 detik).<br>• Perbaiki masalah tampilan.|
|**Abdil**|• Deploy versi final.<br>• Cek backup bisa dipulihkan; siapkan rencana rollback.|



Halaman 15 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

#### **Target akhir hari Jumat** 

- Bug berat = 0. 

- Versi final sudah terpasang di staging. 

- Video cadangan demo sudah jadi. 

### **Sabtu, 21 November: Hari Demo** 

Waktu di bawah dihitung mundur dari jam mulai demo (T). Jam pastinya disepakati Jumat. 

|**Waktu**|**Kegiatan**|**Penanggung jawab**|
|---|---|---|
|**T − 3 jam**|Smoke test staging: login tiap peran, alur lapor sampai tutup.|Panji, Abdil|
|**T − 2 jam**|Reset data demo dan akun demo; cek QR yang akan dipindai.|Reva|
|**T − 1 jam**|Latihan demo penuh satu kali sesuai skrip (bagian 15).|Afgan + semua|
|**T − 30 menit**|Cek HP, kabel/proyektor, jaringan, hotspot cadangan; buka<br>video cadangan di perangkat.|Panji|
|**T**|**Demo**(±10 menit presentasi + tanya jawab).|Afgan memimpin|
|**Sesudah**<br>**demo**|Retro 45 menit, catat masukan audiens, rapikan backlog<br>Sprint 2.|Afgan + SM|



#### **Aturan hari Sabtu** 

Sabtu **bukan** tempat menambah fitur. Kalau ada ide baru, masukkan ke backlog Sprint 2. Satu-satunya pekerjaan kode di hari Sabtu adalah memperbaiki bug yang menghalangi demo. 

## **9. Alur Kasus dan Aturan Produk** 

Bagian ini penting untuk developer. Semua yang bertanda “usulan awal” bisa berubah setelah wawancara, jadi simpan sebagai **data/konfigurasi** , bukan kode yang ditulis mati. 

### **Status kasus** 

|**Status**|**Artinya**|**Siapa yang memindahkan**|
|---|---|---|
|**Baru**|Laporan baru masuk.|Otomatis saat laporan dikirim|
|**Dinilai**|Risiko sudah dinilai dan PIC ditunjuk.|Supervisor|
|**Dianalisis**|Penyebab sudah dicatat (boleh dilewati kalau<br>B-13 belum jadi).|Supervisor atau K3|
|**Tindakan berjalan**|Minimal ada satu tindakan yang sedang<br>dikerjakan.|Otomatis saat tindakan pertama<br>dibuat|
|**Menunggu**<br>**verifikasi**|Semua tindakan sudah selesai.|Otomatis|
|**Selesai**|Sudah diverifikasi dan ditutup. Terkunci.|K3/Verifikator|
|**Ditolak / Duplikat**|Laporan tidak valid atau sama dengan kasus lain<br>(alasan wajib).|Supervisor|
|**Dibuka ulang**|Kasus yang sudah Selesai dibuka lagi. Kembali<br>ke Tindakan berjalan.|K3/Verifikator atau Admin|



Halaman 16 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

### **Skor risiko (usulan awal)** 

Skor = keparahan (1–5) × kemungkinan terulang (1–5). Hasilnya 1 sampai 25. 

|**Level**|**Skor**|**Respons pertama**|**Tindakan sementara**|**Tindakan permanen**|
|---|---|---|---|---|
|**Rendah**|1–6|1 hari|30 hari|60 hari|
|**Sedang**|7–14|4 jam|7 hari|30 hari|
|**Tinggi**|15–25|1 jam|24 jam|14 hari|



Angka target waktu ini asumsi awal. Di MVP dipakai sebagai saran tenggat bawaan di form tindakan. Kalau wawancara menunjukkan angka lain, cukup ubah di tabel konfigurasi. 

### **Jenis dan kategori kasus (contoh awal)** 

- **Jenis kasus:** Abnormalitas mesin, Kerusakan, Kondisi tidak aman, Nyaris celaka (near miss), Insiden. 

- **Kategori:** Mekanik, Kelistrikan, Instrumen/kontrol, Pneumatik/hidrolik, Kebersihan dan sanitasi, Keselamatan kerja, Lingkungan, Lainnya. Ini hanya contoh untuk data demo; diganti sesuai hasil wawancara. 

### **Hak akses per peran (usulan awal)** 

|**Aksi**|**Pelapor**|**Supervisor**|**K3/Verifikator**|**Manajer/Admin**|
|---|---|---|---|---|
|**Membuat laporan**|Ya|Ya|Ya|Ya|
|**Melihat kasus miliknya**|Ya|Ya|Ya|Ya|
|**Melihat semua kasus dan mencari**|Tidak|Ya|Ya|Ya|
|**Triase, nilai risiko, tunjuk PIC**|Tidak|Ya|Tidak|Ya|
|**Analisis penyebab dan tambah**<br>**tindakan**|Tidak|Ya|Ya|Ya|
|**Menyelesaikan tindakan**|Hanya jika<br>dia PIC|Hanya jika dia<br>PIC|Hanya jika dia<br>PIC|Hanya jika dia PIC|
|**Verifikasi, tutup, dan buka ulang**<br>**kasus**|Tidak|Tidak|Ya|Ya|
|**Dashboard**|Tidak|Ya|Ya|Ya|
|**Kelola mesin, user, konfigurasi**|Tidak|Tidak|Tidak|Ya|



Catatan: aturan “verifikator tidak boleh sama dengan PIC” berlaku untuk semua peran, termasuk Admin. 

### **Aturan produk yang tidak boleh dilanggar** 

1. **Bukan sekadar aplikasi lapor.** Nilai utamanya ada di tindak lanjut sampai tuntas dan di mencegah masalah berulang. 

2. **MVP tanpa AI dan IoT.** Fitur “kasus mirip” memakai kemiripan teks. Jangan menyebutnya AI di demo. 

3. **Verifikator tidak boleh sama dengan PIC.** Kasus tidak bisa ditutup oleh orang yang mengerjakan tindakannya. 

4. **Kasus Sedang/Tinggi wajib punya tindakan Preventif** sebelum bisa ditutup. 

5. **Semua angka kerugian berlabel “perkiraan”.** 

Halaman 17 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

6. **Data antar organisasi terpisah.** Setiap tabel utama punya organization_id dan setiap pertanyaan ke database dibatasi olehnya. 

7. **Kasus Selesai terkunci, dan riwayat perubahan tidak bisa diubah.** 

8. **Aplikasi bukan pengganti prosedur darurat perusahaan.** Untuk insiden dengan orang terdampak, tampilkan pengingat. 

9. **Jujur kepada narasumber.** Kita membangun solusi digital sebagai proyek tim; jangan mengklaim hal yang tidak benar dan jangan menjanjikan apa pun. 

## **10. Tech Stack** 

Pilihan ini sama dengan rancangan di dokumen handover dan sesuai keahlian tim (Laravel, React, Python). Bedanya, komponen yang belum perlu untuk seminggu ditunda. 

### **Yang kita pakai** 

|**Lapisan**|**Pilihan**|**Fungsinya (bahasa**<br>**awam)**|**Catatan**|
|---|---|---|---|
|**Frontend**|React (Vite) sebagai PWA,<br>Tailwind CSS + shadcn/ui,<br>TanStack Query, React Hook<br>Form + Zod|Bagian yang dilihat dan<br>disentuh pengguna di HP|Mobile-first. PWA supaya bisa<br>dipasang di layar utama.|
|**Backend**|Laravel (REST API) + Sanctum|“Otak” aplikasi: menyimpan<br>aturan dan data, mengatur<br>siapa boleh apa|Sanctum untuk login dan sesi.|
|**Database**|PostgreSQL, dengan full-text<br>search dan pg_trgm|“Lemari arsip” data,<br>sekaligus mesin pencarian<br>yang toleran salah ketik|Tidak perlu Elasticsearch untuk<br>seminggu.|
|**File foto**|Penyimpanan lokal Laravel|Tempat menyimpan foto<br>laporan|Nanti tinggal ganti ke<br>penyimpanan cloud (S3-<br>compatible).|
|**Antrean/notifikasi**|Queue driver database;<br>notifikasi dalam aplikasi|Pekerjaan latar belakang<br>dan lonceng<br>pemberitahuan|Tanpa Redis dulu.|
|**Server**|Docker Compose di 1 VPS<br>(wilayah Asia), Caddy untuk<br>HTTPS otomatis|Satu server yang<br>menjalankan semuanya|Staging saja; produksi nanti.|
|**CI/CD**|GitHub Actions|Robot untuk tes dan<br>deploy otomatis|Merge ke main → naik ke<br>staging.|
|**Kolaborasi**|GitHub (PR wajib), board<br>(Trello/GitHub Projects), kontrak<br>API OpenAPI|Mengatur kerja bareng|Kontrak API ditulis Senin–<br>Selasa supaya frontend bisa<br>mulai tanpa menunggu server.|



### **Kenapa pilihan ini** 

- **Sesuai keahlian tim.** Tidak ada teknologi baru yang harus dipelajari minggu ini. 

- **Frontend dan backend dipisah** supaya enam orang bisa bekerja paralel memakai kontrak API. Kalau integrasi ternyata terlalu merepotkan, cadangan kita Laravel + Inertia (satu aplikasi). 

- **PostgreSQL** cukup untuk pencarian teks dan kemiripan kasus tanpa tambahan alat. 

- **Docker Compose di satu server** cukup untuk staging dan mudah dipindah. 

Halaman 18 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

### **Yang sengaja belum dipakai** 

|**Teknologi**|**Alasan**|
|---|---|
|**Redis**|Belum ada beban yang membutuhkannya.|
|**WhatsApp Business API**|Butuh penyedia dan biaya; ditunda.|
|**Penyimpanan cloud (S3)**|Lokal dulu, ganti belakangan.|
|**Email**|Stretch (C-04).|
|**Python / model AI**|Keputusan produk: MVP tanpa AI. Python baru dipakai nanti untuk fase lanjut.|
|**Aplikasi native**|PWA sudah cukup untuk MVP.|



### **Struktur repo dan lingkungan** 

- **/api** (Laravel), **/web** (React), **/docs** (dokumen ini, kontrak API, catatan keputusan), dan file AGENTS.md di root. 

- **Lingkungan:** lokal (laptop), staging (server). Produksi belum ada. 

- **Dijadikan data, bukan kode:** kategori kasus, jenis kasus, ambang skor risiko, target waktu, label status, dan field wajib. Perubahan dari wawancara cukup mengubah seed/konfigurasi. 

### **Dasar keamanan (wajib, murah, dan sering terlewat)** 

- Password disimpan dalam bentuk hash, bukan teks biasa. 

- Percobaan login salah dibatasi. 

- Setiap endpoint memeriksa hak akses peran dan organisasi. 

- Semua masukan dan file yang diunggah divalidasi. 

- HTTPS di staging; tidak ada rahasia (password/token) di repo. 

- Backup database harian dan sudah pernah dicoba dipulihkan. 

## **11. Kalau Ada Perubahan atau Tambahan Requirement** 

Perubahan **pasti** datang, terutama setelah wawancara Senin. Di Scrum itu normal. Yang penting kita punya aturan supaya perubahan tidak merusak sprint. 

#### **Prinsip utama** 

**Sprint Goal tetap. Scope boleh dinegosiasikan.** Kalau ada yang masuk, ada yang keluar (tukar), bukan sekadar ditambah. 

### **Alur penanganan perubahan** 

1. **Satu pintu.** Semua permintaan perubahan disampaikan ke Afgan (PO), bukan langsung ke developer. Isi formulir singkat (Lampiran A). 

2. **Afgan mencatat** di change log (Lampiran B) dan memilah kategorinya. 

3. **Developer menaksir** dampaknya dalam jam. Afgan memutuskan. 

4. **Keputusan diumumkan** di daily atau grup, dan backlog diperbarui. 

Halaman 19 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

### **Tiga kategori perubahan** 

|**Kategori**|**Ciri-ciri**|**Tindakan**|**Diputuskan di**|
|---|---|---|---|
|**Merah**|Mengancam Sprint Goal atau<br>menunjukkan salah paham<br>mendasar (misalnya alur status<br>atau siapa yang menutup kasus<br>ternyata berbeda).|**Tukar:**keluarkan item dengan<br>jam setara dari sprint, lalu<br>masukkan perubahan.|Afgan + developer<br>terkait, langsung (tidak<br>menunggu rapat)|
|**Kuning**|Kecil, kurang dari atau sama<br>dengan 2 jam (misalnya<br>mengganti label, menambah<br>satu pilihan).|Ambil dari buffer. Tidak perlu<br>menukar.|Afgan, diumumkan di<br>daily|
|**Hijau**|Nice-to-have, tidak mengubah<br>alur inti.|Masuk Product Backlog,<br>dipertimbangkan di Sprint 2.|Afgan, dicatat saja|



### **Contoh supaya jelas** 

|**Situasi**|**Kategori**|**Penanganan**|
|---|---|---|
|Narasumber bilang matriks risiko<br>mereka 3×3, bukan 5×5.|Kuning|Karena ambang skor ada di tabel konfigurasi, ini<br>perubahan data (±1–2 jam), bukan perubahan kode.|
|Ternyata yang berhak menutup<br>kasus adalah manajer, bukan K3.|Merah|Mengubah aturan peran dan status (±3 jam). Tukar<br>dengan item Should, misalnya B-18 notifikasi.|
|Ada yang minta ekspor laporan ke<br>PDF.|Hijau|Masuk backlog Sprint 2. Dicatat sumbernya.|
|Narasumber memakai istilah<br>“unsafe action” dan “unsafe<br>condition” sebagai jenis kasus.|Kuning|Ganti isi daftar jenis kasus di konfigurasi dan seed.|



### **Aturan tambahan** 

- **Setelah Refinement Rabu sore, pintu ditutup.** Setelah itu hanya perubahan Merah yang boleh masuk; sisanya ke Sprint 2. 

- **Setelah feature freeze Kamis 17.00** , tidak ada perubahan fitur sama sekali, hanya bug. 

- **Bug bukan perubahan requirement.** Bug langsung diperbaiki sesuai prioritasnya. 

- **Penjelasan yang lebih rinci bukan perubahan.** Kalau sebuah item ternyata butuh penjelasan lebih lengkap tetapi hasil akhirnya sama, cukup diperjelas, tidak dihitung sebagai perubahan. 

- **Kalau tim merasa Sprint Goal tidak mungkin tercapai** , bicarakan dengan Afgan secepatnya (paling lambat Rabu). Pilihan pertama: buang item Should, lalu potong sesuai urutan di bagian 7. Membatalkan sprint adalah wewenang PO dan hanya dilakukan kalau Sprint Goal benar-benar sudah tidak masuk akal. 

- **Estimasi** dibuat developer. PO tidak menekan angka. 

- **Setiap perubahan dicatat** di change log: bisa dipakai untuk menjelaskan ke guru atau juri kenapa scope bergeser. 

## **12. Wawancara Hari Senin** 

Wawancara dengan praktisi HSE/K3 dilakukan Afgan (boleh ditemani 1 orang sebagai pencatat). Selain script 17 pertanyaan yang sudah ada di dokumen handover, ini pertanyaan khusus yang langsung memengaruhi build kita. 

Halaman 20 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

### **Yang harus dibawa pulang** 

|**No**|**Pertanyaan atau hal yang digali**|**Dipakai untuk**|
|---|---|---|
|**1**|Istilah dan jenis kasus yang dipakai di<br>pabrik (unsafe act, unsafe condition, near<br>miss, insiden, dan seterusnya).|Daftar jenis dan kategori kasus (B-08, B-23).|
|**2**|Matriks risiko yang dipakai (5×5, 3×3,<br>atau lain) dan arti tiap level.|Skor dan level risiko (B-12).|
|**3**|Alur nyata dari lapor sampai tutup: siapa<br>menilai, siapa menyetujui, siapa<br>memverifikasi.|Status dan peran (B-05, B-12, B-16).|
|**4**|Data apa yang wajib ada di form laporan<br>dan form investigasi mereka. Minta<br>contoh form yang sudah dianonimkan.|Kolom form dan template (B-08, B-13).|
|**5**|Cara lapor sekarang (WhatsApp, kertas,<br>Excel) dan kendala operator (HP, sinyal,<br>bahasa, sarung tangan).|Rancangan form dan alasan memilih PWA (B-04, B-08).|
|**6**|Target waktu tindak lanjut yang biasa<br>dipakai untuk kasus ringan, sedang,<br>berat.|Tabel konfigurasi tenggat (B-14).|
|**7**|Biaya per jam kalau lini berhenti (kalau<br>mereka bersedia berbagi, bisa berupa<br>kisaran).|Item stretch C-02.|
|**8**|Izin: boleh menunjukkan sketsa layar<br>selama 5 menit untuk meminta<br>pendapat?|Validasi cepat alur (Sandy).|



### **Cara mencatat** 

- Pisahkan dua hal: **yang kita duga** (dari handover) dan **yang benar-benar dikatakan narasumber** . Bagian kedua yang menang kalau bertentangan. 

- Catat kutipan pendek yang penting dengan kata-kata narasumber. Jangan menafsirkan dulu saat mencatat. 

- Tandai jawaban yang ragu-ragu atau “tergantung perusahaan”; itu tandanya hal tersebut harus dibuat bisa dikonfigurasi. 

### **Etika wawancara** 

- Jelaskan dengan jujur bahwa ini proyek tim untuk membangun solusi digital dan kamu sedang belajar dari praktisi. 

- Jangan menjanjikan apa pun dan jangan meminta data rahasia perusahaan. 

- Hasil wawancara dianonimkan. **Jangan** mengunggah catatan mentah atau dokumen narasumber ke AI atau repo. 

### **Debrief Senin malam (30–45 menit)** 

1. Baca ulang catatan bersama. 

2. Untuk setiap item backlog, beri tanda: **Confirmed** (sudah benar), **Berubah** (perlu disesuaikan), **Baru** (muncul kebutuhan baru), **Gugur** (tidak relevan). 

3. Masukkan semua yang Berubah dan Baru ke change log dengan kategori Merah/Kuning/Hijau. 

4. Siapkan daftar kecil untuk dibahas di Refinement Selasa pagi. 

Halaman 21 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **13. Pakai AI Agent dengan Benar** 

AI agent (misalnya Claude Code) boleh dan **didorong** dipakai untuk mempercepat. Tetapi tanggung jawab atas kode tetap di orang yang membuat PR, bukan di AI. 

### **Aturan main** 

1. **Satu item = satu cabang = satu sesi agent.** Ambil per ID (misalnya B-12), jangan “bangun semua fitur sampai dashboard” sekaligus. 

2. **Beri konteks tertulis di repo.** Reva merawat file AGENTS.md (atau CLAUDE.md) yang berisi stack, struktur folder, cara menjalankan proyek, konvensi penamaan, dan aturan produk (bagian 9). Kontrak API dan wireframe juga dipakai sebagai acuan. 

3. **Tes sebagai pagar.** Minta agent menulis tes otomatis untuk aturan bisnis: skor risiko (B-12), verifikator ≠ PIC (B-16), hak akses (B-05). 

4. **Review manusia wajib di setiap PR** , terutama untuk login, hak akses, upload file, dan pencarian. Kode dari AI sering jalan mulus saat demo tapi bolong di keamanan. 

5. **Jangan** menempelkan file .env, token, atau data wawancara mentah ke AI. 

6. **PR kecil, merge sering, tarik main tiap pagi.** Banyak agent berjalan paralel = rawan konflik. 

7. **Tanya Afgan untuk keputusan alur bisnis.** Agent tidak boleh “menebak” aturan produk. 

8. **AI bukan alasan untuk menambah scope.** Feature freeze Kamis 17.00 tetap berlaku. 

9. **Di daily, ukurannya “sudah jalan di staging?”** , bukan “kodenya sudah ditulis?”. 

### **Mana yang cocok diserahkan dan mana yang harus hati-hati** 

- **Harus dikerjakan atau diperiksa dengan teliti oleh** 

- **Cocok diserahkan ke agent (tetap di-review) manusia** 

- • Migrasi dan model dari skema • Login, sesi, dan hak akses • Halaman CRUD dan form • Upload file • Komponen UI dari wireframe • Query pencarian (rawan celah SQL injection) • Tes otomatis dari aturan bisnis • Pemisahan data antar organisasi • Data demo (seed) fiktif • Rahasia dan konfigurasi server • Draf konfigurasi Docker dan CI • Keputusan alur bisnis • Refactor kecil dan penjelasan pesan error • Perubahan besar di banyak file sekaligus 

### **Contoh perintah ke agent** 

**Konteks:** Baca AGENTS.md dulu. 

**Tugas:** Kerjakan B-12 (penilaian risiko). 

**Aturan:** Skor = keparahan × kemungkinan (masing-masing 1–5). Level: 1–6 Rendah, 7–14 Sedang, 15– 25 Tinggi. Ambang diambil dari tabel konfigurasi, jangan ditulis mati di kode. Hanya Supervisor dan Admin yang boleh menilai. 

**Keluaran:** endpoint, validasi, dan feature test untuk tiga kasus (2×3, 4×4, 5×5). 

**Batasan:** Jangan mengubah file di luar tugas ini. Di akhir, jelaskan apa saja yang diubah. 

### **Isi minimal AGENTS.md** 

- Deskripsi singkat produk dan sembilan aturan produk di bagian 9. 

- Stack dan struktur folder; cara menjalankan, menguji, dan melakukan lint. 

Halaman 22 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

- Konvensi penamaan, format pesan commit dan nama cabang. 

- Daftar “jangan”: jangan push ke main, jangan menyimpan rahasia, jangan mengubah skema tanpa migrasi, jangan menulis aturan bisnis tanpa tes. 

Halaman 23 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **14. Risiko dan Antisipasi** 

|**Risiko**|**Peluang**|**Dampak**|**Antisipasi**|**Penanggung jawab**|
|---|---|---|---|---|
|Jam efektif lebih kecil<br>dari asumsi (jam<br>sekolah dan kegiatan<br>lain)|Sedang|Tinggi|Ikuti aturan potong (bagian 7).<br>Putuskan pemotongan paling lambat<br>Rabu.|Afgan|
|Wawancara mengubah<br>alur dasar|Sedang|Tinggi|Hal yang bergantung industri dibuat<br>konfigurasi; refinement Selasa; tukar<br>item (bagian 11).|Afgan|
|Integrasi frontend dan<br>backend terlambat|Sedang|Sedang|Kontrak API ditulis dulu; frontend<br>memakai data tiruan di awal;<br>integrasi sedikit-sedikit setiap hari.|Nadim, Sandy|
|Deploy atau server<br>bermasalah|Sedang|Tinggi|Staging dibangun Senin; auto-<br>deploy Selasa; backup dan rollback<br>dicek Jumat.|Abdil, Panji|
|Konflik merge karena<br>banyak orang dan agent|Tinggi|Sedang|PR kecil, merge sering, rebase tiap<br>pagi.|Semua|
|Kode AI punya celah<br>keamanan|Sedang|Tinggi|Review wajib; tes hak akses;<br>hardening Kamis.|Panji|
|Scope melar karena ide<br>baru|Tinggi|Sedang|Satu pintu perubahan, tutup pintu<br>Rabu, freeze Kamis.|Afgan|
|Demo gagal (internet<br>atau server)|Rendah|Tinggi|Video cadangan, hotspot,<br>screenshot, simulasi lokal bila perlu.|Panji, Afgan|
|Satu orang menjadi<br>hambatan (misalnya<br>backend bertumpu di<br>Nadim)|Sedang|Sedang|Reva dan Afgan siap mengambil<br>item; pair kerja kalau ada yang<br>tertinggal.|Afgan|



## **15. UAT dan Skrip Demo** 

### **10 skenario UAT (Jumat pagi)** 

Setiap skenario dijalankan di staging dari HP. Hasilnya dicatat di kolom terakhir: Lulus atau Gagal (plus nomor bug). 

|**No**|**Skenario**|**Langkah singkat**|**Hasil yang diharapkan**|**Hasil**|
|---|---|---|---|---|
|**U1**|Lapor via QR dalam<br>60 detik|Scan QR mesin → login → isi 3<br>kolom + foto → kirim.|Nomor kasus muncul. Total<br>waktu ≤ 60 detik.|☐|
|**U2**|Peringatan kasus<br>terbuka|Lapor di mesin yang masih punya<br>kasus belum selesai (≤ 7 hari).|Muncul peringatan dan tautan ke<br>kasus itu; tetap bisa kirim.|☐|
|**U3**|Skor risiko|Supervisor mengisi keparahan 4<br>dan kemungkinan 4.|Skor 16, level Tinggi.|☐|
|**U4**|Tutup tanpa tindakan<br>preventif|Kasus Tinggi hanya punya<br>tindakan Korektif; K3 mencoba<br>menutup.|Ditolak dengan pesan jelas.|☐|
|**U5**|Verifikator = PIC|Orang yang menjadi PIC<br>mencoba memverifikasi<br>kasusnya.|Ditolak.|☐|



Halaman 24 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**No**|**Skenario**|**Langkah singkat**|**Hasil yang diharapkan**|**Hasil**|
|---|---|---|---|---|
|**U6**|Pencarian salah ketik|Cari “konvayor” (data berisi<br>“konveyor”).|Kasus terkait tetap muncul.|☐|
|**U7**|Label Terlambat|Tindakan melewati tenggat.|Label merah “Terlambat” di<br>Tindakan Saya dan dashboard.|☐|
|**U8**|Hak akses dan<br>pemisahan data|(a) Pelapor membuka halaman<br>triase lewat alamat langsung. (b)<br>User organisasi B membuka<br>kasus organisasi A.|Keduanya ditolak.|☐|
|**U9**|Riwayat perubahan|Ubah status beberapa kasus lalu<br>lihat log.|Tercatat siapa, kapan, dari-ke<br>status apa, alasan.|☐|
|**U10**|Buka ulang kasus<br>(jika B-17 selesai)|K3 membuka ulang kasus Selesai<br>dengan alasan.|Kembali ke Tindakan berjalan<br>dan tercatat di riwayat.|☐|



### **Skrip demo (±10 menit)** 

|**Menit**|**Adegan**|**Yang ditunjukkan**|**Pembicara**<br>**(usulan)**|
|---|---|---|---|
|**0:00–1:00**|Masalah|Cerita singkat: laporan tercecer di WhatsApp dan<br>Excel, masalah yang sama muncul lagi.|Afgan|
|**1:00–2:30**|Lapor via QR|Scan QR di mesin, lapor kurang dari 60 detik,<br>nomor kasus, peringatan kasus terbuka.|Sandy (di HP)|
|**2:30–4:00**|Triase|Supervisor menilai risiko 4 × 4 = 16 (Tinggi) dan<br>menunjuk PIC.|Nadim|
|**4:00–5:30**|Tindakan|Menambah tindakan korektif dan preventif; PIC<br>menyelesaikan dengan foto bukti.|Abdil|
|**5:30–7:00**|Verifikasi|Mencoba menutup tanpa preventif (ditolak), PIC<br>mencoba verifikasi (ditolak), K3 menyetujui lalu<br>kasus terkunci.|Panji|
|**7:00–8:30**|Belajar|Pencarian dengan salah ketik, kasus mirip, riwayat<br>mesin.|Reva|
|**8:30–9:30**|Dashboard|Kasus terbuka dan terlambat, kasus per mesin,<br>label Berulang (kalau sempat).|Reva / Sandy|
|**9:30–10:00**|Penutup|Langkah berikutnya: pilot di satu pabrik, jalur<br>WhatsApp, AI bertahap.|Afgan|



#### **Jangan diklaim di demo** 

- Jangan bilang ini memakai AI. “Kasus mirip” berbasis kemiripan teks. 

- Jangan bilang “sudah teruji di pabrik”. Ini v0.1 dengan data demo. 

- Jangan menyebut angka kerugian sebagai pasti. Selalu “perkiraan”. 

- Jangan bilang ini pengganti prosedur K3 resmi atau sistem pemeliharaan (CMMS). 

#### **Rencana cadangan (Plan B)** 

- Video demo penuh direkam Jumat malam dan disimpan di dua perangkat. 

- Hotspot HP cadangan dan satu laptop yang bisa menjalankan versi lokal. 

- Screenshot setiap langkah skrip sebagai slide darurat. 

Halaman 25 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

## **16. Lampiran: Template** 

### **Lampiran A: Formulir permintaan perubahan** 

Isi singkat saja (cukup 1 menit) dan kirim ke Afgan. 

|**Isian**|**Jawaban**|
|---|---|
|**Tanggal dan pengusul**||
|**Sumber (wawancara, tim,**<br>**dosen/guru, lainnya)**||
|**Masalah atau kebutuhan**<br>**(apa yang tidak pas?)**||
|**Usulan perubahan**||
|**Item backlog yang**<br>**terpengaruh (ID)**||
|**Perkiraan jam (diisi**<br>**developer)**||
|**Kategori (diisi Afgan):**<br>**Merah / Kuning / Hijau**||
|**Keputusan: tukar dengan**<br>**apa / ambil dari buffer / ke**<br>**backlog**||



### **Lampiran B: Change log** 

|**Tgl**<br>**Perubahan**|**Sumber**<br>**Kategori**|**Keputusan**<br>**Dampak jam**|
|---|---|---|





### **Lampiran C: Catatan wawancara** 

|**Topik**|**Yang kita duga (handover)**|**Yang dikatakan narasumber**|
|---|---|---|
|**Jenis dan kategori**<br>**kasus**|||
|**Matriks risiko**|||
|**Alur lapor sampai**<br>**tutup**|||
|**Field wajib form**|||
|**Cara lapor sekarang**<br>**dan kendala**|||
|**Target waktu tindak**<br>**lanjut**|||



Halaman 26 dari 27 

SafetyLog | Panduan Sprint MVP 5 Hari 

|**Topik**|**Yang kita duga (handover)**|**Yang dikatakan narasumber**|
|---|---|---|
|**Biaya per jam lini**|||
|**berhenti**|||



### **Lampiran D: Format catatan Daily** 

|**Pertanyaan**|**Catatan**|
|---|---|
|**Kemarin apa yang sudah**<br>**jalan di staging?**||
|**Hari ini mengerjakan apa?**||
|**Hambatan dan siapa yang**<br>**membantu?**||
|**Target hari ini on track?**||
|**(Ya / Tidak, kenapa)**||





_Dokumen ini hidup. Kalau ada yang berubah, Afgan memperbarui dan mengumumkan versi baru di grup._ 

Halaman 27 dari 27 

