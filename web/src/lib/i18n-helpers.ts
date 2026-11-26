import * as React from 'react'

export type Language = 'id' | 'en'

export const LANGUAGE_STORAGE_KEY = 'safetylog_lang'

export const TRANSLATIONS = {
  // Login & Auth
  'login.headline': {
    id: 'Dari temuan mesin ke pencegahan tuntas.',
    en: 'From machine findings to verified prevention.',
  },
  'login.title': {
    id: 'Masuk ke Ruang Kerja',
    en: 'Sign In to Workspace',
  },
  'login.subtitle': {
    id: 'Gunakan email dan kata sandi akun perusahaan Anda.',
    en: 'Use your company email and password to continue.',
  },
  'login.emailLabel': {
    id: 'Alamat Email',
    en: 'Email Address',
  },
  'login.emailPlaceholder': {
    id: 'nama@perusahaan.com',
    en: 'name@company.com',
  },
  'login.emailInvalid': {
    id: 'Masukkan alamat email yang valid.',
    en: 'Enter a valid email address.',
  },
  'login.passwordLabel': {
    id: 'Kata Sandi',
    en: 'Password',
  },
  'login.passwordPlaceholder': {
    id: 'Masukkan kata sandi',
    en: 'Enter password',
  },
  'login.passwordRequired': {
    id: 'Kata sandi wajib diisi.',
    en: 'Password is required.',
  },
  'login.showPassword': {
    id: 'Tampilkan kata sandi',
    en: 'Show password',
  },
  'login.hidePassword': {
    id: 'Sembunyikan kata sandi',
    en: 'Hide password',
  },
  'login.submit': {
    id: 'Masuk ke Sistem',
    en: 'Sign In',
  },
  'login.submitting': {
    id: 'Memverifikasi...',
    en: 'Verifying...',
  },
  'login.footer': {
    id: 'Kendala akses akun? Hubungi Administrator pabrik Anda.',
    en: 'Need access help? Contact your plant Administrator.',
  },
  'login.networkError': {
    id: 'Tidak dapat terhubung ke server SafetyLog. Periksa koneksi Anda.',
    en: 'Unable to reach SafetyLog server. Check your connection.',
  },

  // AppShell & Navigation
  'nav.section.main': { id: 'Utama', en: 'Main' },
  'nav.section.manage': { id: 'Operasional', en: 'Operations' },
  'nav.section.admin': { id: 'Administrasi', en: 'Administration' },
  'nav.home': { id: 'Beranda Peran', en: 'Role Home' },
  'nav.home.short': { id: 'Beranda', en: 'Home' },
  'nav.report': { id: 'Lapor Cepat (QR)', en: 'Quick Report (QR)' },
  'nav.report.short': { id: 'Lapor', en: 'Report' },
  'nav.my-cases': { id: 'Kasus Saya', en: 'My Cases' },
  'nav.my-cases.short': { id: 'Kasus', en: 'Cases' },
  'nav.my-actions': { id: 'Tindakan Saya', en: 'My Actions' },
  'nav.my-actions.short': { id: 'Tindakan', en: 'Actions' },
  'nav.cases': { id: 'Antrean Kasus', en: 'Cases Queue' },
  'nav.cases.short': { id: 'Antrean', en: 'Queue' },
  'nav.dashboard': { id: 'Dashboard K3', en: 'HSE Dashboard' },
  'nav.dashboard.short': { id: 'Dashboard', en: 'Dashboard' },
  'nav.audit-logs': { id: 'Log Audit', en: 'Audit Logs' },
  'nav.audit-logs.short': { id: 'Audit', en: 'Audit' },
  'nav.admin-machines': { id: 'Mesin, Area & QR', en: 'Machines, Areas & QR' },
  'nav.admin-machines.short': { id: 'Mesin', en: 'Machines' },
  'nav.admin-users': { id: 'Pengguna & Peran', en: 'Users & Roles' },
  'nav.admin-users.short': { id: 'Pengguna', en: 'Users' },
  'nav.admin-config': { id: 'Konfigurasi Sistem', en: 'System Config' },
  'nav.admin-config.short': { id: 'Konfig', en: 'Config' },

  'shell.searchPlaceholder': {
    id: 'Cari kasus, mesin, kata kunci...',
    en: 'Search cases, machines, keywords...',
  },
  'shell.searchPlaceholderMobile': {
    id: 'Cari nomor kasus, mesin, kata kunci...',
    en: 'Search case number, machine, keyword...',
  },
  'shell.logout': { id: 'Keluar', en: 'Sign Out' },
  'shell.reportCase': { id: 'Lapor Kasus', en: 'Report Case' },
  'shell.reportShort': { id: 'Lapor', en: 'Report' },
  'shell.openMenu': { id: 'Buka menu navigasi', en: 'Open navigation menu' },
  'shell.closeMenu': { id: 'Tutup menu', en: 'Close menu' },

  // Notifications
  'notif.title': { id: 'Notifikasi', en: 'Notifications' },
  'notif.markAll': { id: 'Tandai semua dibaca', en: 'Mark all read' },
  'notif.close': { id: 'Tutup notifikasi', en: 'Close notifications' },
  'notif.empty': { id: 'Belum ada notifikasi baru.', en: 'No new notifications.' },
  'notif.new': { id: 'Baru', en: 'New' },

  // Theme & Language
  'theme.toLight': { id: 'Aktifkan Mode Siang', en: 'Switch to Light Mode' },
  'theme.toDark': { id: 'Aktifkan Mode Malam', en: 'Switch to Dark Mode' },
  'lang.label': { id: 'Pilih bahasa', en: 'Select language' },
} as const

export type TranslationKey = keyof typeof TRANSLATIONS

export interface LanguageContextValue {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (key: TranslationKey) => string
  pick: <T>(idValue: T, enValue: T) => T
}

export const LanguageContext = React.createContext<LanguageContextValue | null>(null)

export function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'id'
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (saved === 'id' || saved === 'en') return saved
  } catch {
    // ignore storage errors
  }
  return 'id'
}

export function translateKey(lang: Language, key: TranslationKey): string {
  return TRANSLATIONS[key][lang]
}

export function useLanguage(): LanguageContextValue {
  const ctx = React.useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage harus digunakan di dalam LanguageProvider')
  }
  return ctx
}

const ROLE_LABELS_EN: Record<string, string> = {
  reporter: 'Reporter',
  pelapor: 'Reporter',
  supervisor: 'Supervisor',
  hse: 'EHS Team',
  'tim k3': 'EHS Team',
  'tim k3 (hse)': 'EHS Team',
  k3: 'EHS Team',
  admin: 'Admin',
}

const CASE_STATUS_LABELS_EN: Record<string, string> = {
  new: 'New',
  baru: 'New',
  assessed: 'Assessed',
  dinilai: 'Assessed',
  analyzed: 'Analyzed',
  dianalisis: 'Analyzed',
  in_progress: 'In Progress',
  'dalam penanganan': 'In Progress',
  'tindakan berjalan': 'In Progress',
  pending_verification: 'Pending Verification',
  'menunggu verifikasi': 'Pending Verification',
  closed: 'Closed',
  selesai: 'Closed',
  rejected: 'Rejected',
  ditolak: 'Rejected',
  duplicate: 'Duplicate',
  duplikat: 'Duplicate',
  dilaporkan: 'Reported',
}

const ACTION_TYPE_LABELS_EN: Record<string, string> = {
  temporary: 'Temporary',
  sementara: 'Temporary',
  corrective: 'Corrective',
  korektif: 'Corrective',
  preventive: 'Preventive',
  preventif: 'Preventive',
}

const ACTION_STATUS_LABELS_EN: Record<string, string> = {
  open: 'Open',
  terbuka: 'Open',
  menunggu: 'Pending',
  pending: 'Pending',
  in_progress: 'In Progress',
  berjalan: 'In Progress',
  'sedang berjalan': 'In Progress',
  completed: 'Completed',
  selesai: 'Completed',
}

const RISK_LEVEL_LABELS_EN: Record<string, string> = {
  low: 'Low',
  rendah: 'Low',
  medium: 'Medium',
  sedang: 'Medium',
  high: 'High',
  tinggi: 'High',
}

const CASE_TYPE_NAMES_EN: Record<string, string> = {
  unsafe_condition: 'Unsafe Condition',
  'kondisi tidak aman': 'Unsafe Condition',
  machine_abnormality: 'Machine Abnormality',
  'abnormalitas mesin': 'Machine Abnormality',
  'temuan mesin': 'Machine Abnormality',
  incident: 'Incident',
  insiden: 'Incident',
  breakdown: 'Machine Breakdown',
  'kerusakan mesin': 'Machine Breakdown',
  'mesin rusak / breakdown': 'Machine Breakdown',
  near_miss: 'Near Miss',
  'hampir celaka': 'Near Miss',
}

const CATEGORY_6M_EN: Record<string, string> = {
  mesin: 'Machine',
  machine: 'Machine',
  manusia: 'Man',
  man: 'Man',
  metode: 'Method',
  method: 'Method',
  material: 'Material',
  lingkungan: 'Environment',
  environment: 'Environment',
  pengukuran: 'Measurement',
  measurement: 'Measurement',
}

function lookupEn(map: Record<string, string>, raw?: string | null, code?: string | null): string | undefined {
  if (code) {
    const byCode = map[code.trim().toLowerCase()]
    if (byCode) return byCode
  }
  if (raw) {
    const byRaw = map[raw.trim().toLowerCase()]
    if (byRaw) return byRaw
  }
  return undefined
}

export function localizeRoleLabel(lang: Language, label?: string | null, role?: string | null): string {
  if (lang !== 'en') return label || role || ''
  return lookupEn(ROLE_LABELS_EN, label, role) ?? label ?? role ?? ''
}

export function localizeCaseStatusLabel(lang: Language, label?: string | null, status?: string | null): string {
  if (lang !== 'en') return label || status || ''
  return lookupEn(CASE_STATUS_LABELS_EN, label, status) ?? label ?? status ?? ''
}

export function localizeActionTypeLabel(lang: Language, label?: string | null, actionType?: string | null): string {
  if (lang !== 'en') return label || actionType || ''
  return lookupEn(ACTION_TYPE_LABELS_EN, label, actionType) ?? label ?? actionType ?? ''
}

export function localizeActionStatusLabel(lang: Language, label?: string | null, status?: string | null): string {
  if (lang !== 'en') return label || status || ''
  return lookupEn(ACTION_STATUS_LABELS_EN, label, status) ?? label ?? status ?? ''
}

export function localizeRiskLevelLabel(lang: Language, label?: string | null, level?: string | null): string {
  if (lang !== 'en') return label || level || ''
  return lookupEn(RISK_LEVEL_LABELS_EN, label, level) ?? label ?? level ?? ''
}

export function localizeCaseTypeName(lang: Language, name?: string | null, code?: string | null): string {
  if (lang !== 'en') return name || code || ''
  return lookupEn(CASE_TYPE_NAMES_EN, name, code) ?? name ?? code ?? ''
}

export function localizeOverdueLabel(lang: Language, label?: string | null): string {
  const raw = label || 'Terlambat'
  if (lang !== 'en') return raw
  if (/^terlambat$/i.test(raw.trim())) return 'Overdue'
  return raw.replace(/^terlambat\b/i, 'Overdue')
}

export function localizeRecurringLabel(lang: Language, label?: string | null): string {
  const raw = label || 'Berulang'
  if (lang !== 'en') return raw
  if (/^berulang$/i.test(raw.trim())) return 'Recurring'
  return raw.replace(/^berulang\b/i, 'Recurring')
}

export function localize6MCategory(lang: Language, category?: string | null): string {
  if (!category) return ''
  if (lang !== 'en') return category
  return lookupEn(CATEGORY_6M_EN, category) ?? category
}

const MATCHING_REASONS_EN: Record<string, string> = {
  'mesin sama': 'Same machine',
  'kategori sama': 'Same category',
  'kemiripan teks gejala/penyebab': 'Symptom/cause text similarity',
  'kemiripan teks': 'Text similarity',
  'status selesai (praktek baik)': 'Resolved case (best practice)',
  'status selesai': 'Resolved status',
  'tipe kasus sama': 'Same case type',
  'area sama': 'Same area',
}

export function localizeMatchingReason(lang: Language, reason?: string | null): string {
  if (!reason) return ''
  if (lang !== 'en') return reason
  const key = reason.trim().toLowerCase()
  return MATCHING_REASONS_EN[key] ?? reason
}

const CATEGORIES_EN: Record<string, string> = {
  mechanical: 'Mechanical',
  mekanik: 'Mechanical',
  electrical: 'Electrical',
  kelistrikan: 'Electrical',
  instrumentation: 'Instrumentation & Control',
  'instrumen/kontrol': 'Instrumentation & Control',
  pneumatic_hydraulic: 'Pneumatics & Hydraulics',
  'pneumatik/hidrolik': 'Pneumatics & Hydraulics',
  sanitation: 'Sanitation & Hygiene',
  'kebersihan dan sanitasi': 'Sanitation & Hygiene',
  occupational_safety: 'Occupational Safety',
  'keselamatan kerja': 'Occupational Safety',
  environment: 'Environment',
  lingkungan: 'Environment',
  other: 'Other',
  lainnya: 'Other',
}

export function localizeCategoryName(lang: Language, name?: string | null, code?: string | null): string {
  if (!name && !code) return ''
  if (lang !== 'en') return name || code || ''
  return lookupEn(CATEGORIES_EN, name, code) ?? name ?? code ?? ''
}

const MACHINES_EN: Record<string, string> = {
  'mesin konveyor pengemasan 01': 'Packaging Conveyor Machine 01',
  'mesin rotary filler 01': 'Rotary Filler Machine 01',
  'kompresor udara sentral 01': 'Central Air Compressor 01',
  'mesin carton sealer 01': 'Carton Sealer Machine 01',
  'mesin labeling botol 01': 'Bottle Labeling Machine 01',
  'tangki mixing stainless 01': 'Stainless Mixing Tank 01',
  'unit pasteurisasi plate 01': 'Plate Pasteurization Unit 01',
  'boiler uap utama 01': 'Main Steam Boiler 01',
  'water chiller sentral 01': 'Central Water Chiller 01',
  'mesin pallet wrapper 01': 'Pallet Wrapper Machine 01',
}

export function localizeMachineName(lang: Language, name?: string | null, code?: string | null): string {
  if (!name && !code) return ''
  if (lang !== 'en') return name || code || ''
  const direct = lookupEn(MACHINES_EN, name, code)
  if (direct) return direct
  if (!name) return code || ''
  // Intelligent prefix/suffix translation for other machine patterns
  let translated = name
  translated = translated.replace(/^mesin\s+/i, '')
  if (/^kompresor\s+udara\s+sentral/i.test(name)) {
    translated = name.replace(/^kompresor\s+udara\s+sentral/i, 'Central Air Compressor')
  } else if (/^tangki\s+mixing\s+stainless/i.test(name)) {
    translated = name.replace(/^tangki\s+mixing\s+stainless/i, 'Stainless Mixing Tank')
  } else if (/^unit\s+pasteurisasi\s+plate/i.test(name)) {
    translated = name.replace(/^unit\s+pasteurisasi\s+plate/i, 'Plate Pasteurization Unit')
  } else if (/^boiler\s+uap\s+utama/i.test(name)) {
    translated = name.replace(/^boiler\s+uap\s+utama/i, 'Main Steam Boiler')
  } else if (/^water\s+chiller\s+sentral/i.test(name)) {
    translated = name.replace(/^water\s+chiller\s+sentral/i, 'Central Water Chiller')
  } else if (/^mesin\s+/i.test(name)) {
    translated = `${translated} Machine`
  }
  return translated
}

const AREAS_EN: Record<string, string> = {
  'lini pengemasan a': 'Packaging Line A',
  'lini pengemasan b': 'Packaging Line B',
  'lini filling & mixing': 'Filling & Mixing Line',
  'utilitas & boiler': 'Utilities & Boiler',
  'gudang bahan & jadi': 'Raw & Finished Goods Warehouse',
  'bengkel workshop & utilitas': 'Maintenance Workshop & Utilities',
}

export function localizeAreaName(lang: Language, name?: string | null, code?: string | null): string {
  if (!name && !code) return ''
  if (lang !== 'en') return name || code || ''
  const direct = lookupEn(AREAS_EN, name, code)
  if (direct) return direct
  if (!name) return code || ''
  return name
    .replace(/^lini\s+/i, 'Line ')
    .replace(/^gudang\s+/i, 'Warehouse ')
    .replace(/^area\s+/i, 'Area ')
}

const SITES_EN: Record<string, string> = {
  'pabrik sidoarjo 1': 'Sidoarjo Plant 1',
  'pabrik cikarang 2': 'Cikarang Plant 2',
}

export function localizeSiteName(lang: Language, name?: string | null, code?: string | null): string {
  if (!name && !code) return ''
  if (lang !== 'en') return name || code || ''
  const direct = lookupEn(SITES_EN, name, code)
  if (direct) return direct
  if (!name) return code || ''
  return name.replace(/^pabrik\s+/i, 'Plant ')
}

const JOB_TITLES_EN: Record<string, string> = {
  'operator lini pengemasan': 'Packaging Line Operator',
  'supervisor produksi': 'Production Supervisor',
  'petugas k3 / hse': 'HSE / Safety Officer',
  'petugas k3': 'Safety Officer',
  'manajer operasional': 'Operations Manager',
  'teknisi maintenance': 'Maintenance Technician',
  'teknisi listrik': 'Electrical Technician',
}

export function localizeJobTitle(lang: Language, title?: string | null): string {
  if (!title) return ''
  if (lang !== 'en') return title
  const key = title.trim().toLowerCase()
  return JOB_TITLES_EN[key] ?? title
}

const CONTENT_TRANSLATIONS_EN: Record<string, string> = {
  // Case descriptions from seed scenarios
  'belt konveyor pengemasan slip dan berdecit saat beban penuh.':
    'Packaging conveyor belt slips and squeaks under full load.',
  'konveyor pengemasan berhenti mendadak akibat rantai penggerak kendor.':
    'Packaging conveyor stopped suddenly due to loose drive chain.',
  'sensor konveyor pengemasan gagal mendeteksi karton ketika debu menumpuk.':
    'Packaging conveyor sensor failed to detect cartons when dust accumulated.',
  'pelindung samping konveyor pengemasan bagian ujung bergetar dan bautnya kendur.':
    'Packaging conveyor end side guard vibrates and bolts are loose.',
  'tekanan udara aktuator nozzle filler 3 turun di bawah batas.':
    'Air pressure of filler nozzle 3 actuator dropped below limit.',
  'volume pengisian botol tidak konsisten pada head nomor 5.':
    'Bottle filling volume inconsistent on head number 5.',
  'genangan air bilasan di sekitar lantai operator mesin filler.':
    'Puddle of rinse water around filler machine operator floor.',
  'suhu outlet kompresor udara meningkat hingga 96 derajat celsius.':
    'Air compressor outlet temperature increased up to 96 degrees Celsius.',
  'suara bising kompresor melebihi 85 dba saat pintu ruang utilitas terbuka.':
    'Compressor noise exceeds 85 dBA when utility room door is open.',
  'elemen pemanas carton sealer tidak mencapai suhu kerja optimal.':
    'Carton sealer heating element does not reach optimal operating temperature.',
  'jari operator hampir menyentuh pisau pemotong lakban saat menarik karton macet.':
    'Operator finger almost touched tape cutting blade while clearing jammed carton.',
  'gulungan label sering miring saat pergantian rol baru.':
    'Label roll often tilts during new roll changeover.',
  'sensor celah label kadang melewati dua botol sekaligus.':
    'Label gap sensor occasionally skips two bottles at once.',
  'interlock tutup tangki mixing tidak memutus daya motor saat tutup dibuka.':
    'Mixing tank lid interlock does not cut motor power when opened.',
  'paking karet tutup tangki mixing mulai getas dan meninggalkan remah.':
    'Mixing tank lid rubber gasket is getting brittle and leaving crumbs.',
  'katup pengalih suhu pasteurisasi terlambat menutup saat suhu turun.':
    'Pasteurization temperature diverter valve closes late when temperature drops.',
  'rembesan kecil air panas pada gasket pelat nomor 12 unit pasteurisasi.':
    'Small hot water seepage on plate gasket number 12 of pasteurization unit.',
  'katup buang uap manual menyembur ke jalur jalan teknisi saat blowdown.':
    'Manual steam blowdown valve sprays toward technician walkway during blowdown.',
  'isolasi pipa uap di dekat tangga akses terkelupas sepanjang 1 meter.':
    'Steam pipe insulation near access ladder is peeled off along 1 meter.',
  'pompa sirkulasi chiller mengalami trip overload dua kali minggu ini.':
    'Chiller circulation pump tripped on overload twice this week.',
  'kipas kondensor chiller mengeluarkan getaran berlebih saat start.':
    'Chiller condenser fan produces excessive vibration during startup.',
  'kaki operator tergores sudut palet kayu saat memutar meja pallet wrapper.':
    'Operator foot scratched by wooden pallet corner while rotating pallet wrapper table.',
  'ketegangan plastik stretch film terlalu kencang sehingga sering putus.':
    'Stretch film plastic tension is too tight and frequently tears.',
  'kabel ekstensi sementara melintang di jalur dorong troli botol.':
    'Temporary extension cord runs across bottle trolley push path.',
  'sisa potongan lakban dan debu menumpuk di bawah rangka mesin sealer.':
    'Tape scraps and dust accumulate beneath sealer machine frame.',
  'manometer tekanan uap di panel lokal berkaca buram sehingga sulit dibaca.':
    'Steam pressure gauge on local panel has frosted glass making it hard to read.',
  'pencahayaan di atas meja inspeksi label terasa redup saat shift malam.':
    'Lighting above label inspection table feels dim during night shift.',
  'laporan uji coba tombol pelaporan dari ruang utilitas.':
    'Test report of reporting button from utility room.',
  'sabuk konveyor pengemasan bunyi berdecit lagi saat shift siang.':
    'Packaging conveyor belt squeaks again during day shift.',
  'tombol panel tidak menyala karena mcb utama memang sedang dimatikan untuk maintenance.':
    'Panel button does not turn on because main breaker was deliberately switched off for maintenance.',

  // Root cause summaries
  'bearing roller sisi kanan kering sehingga menimbulkan gesekan.':
    'Right side roller bearing was dry causing friction.',
  'tensioner rantai konveyor bergeser karena getaran kontinu.':
    'Conveyor chain tensioner shifted due to continuous vibration.',
  'debu karton menutupi lensa sensor fotoelektrik.':
    'Carton dust covered photoelectric sensor lens.',
  'seal selang pneumatik retak karena usia pakai.':
    'Pneumatic hose seal cracked due to service age.',
  'kalibrasi flowmeter bergeser pasca pembersihan cip.':
    'Flowmeter calibration drifted following CIP cleaning.',
  'saluran drainase lantai tersumbat potongan label.':
    'Floor drain channel clogged with label scraps.',
  'sirip pendingin radiator kompresor tersumbat debu pabrik.':
    'Compressor radiator cooling fins clogged with plant dust.',
  'peredam pintu ruang kompresor terlepas.':
    'Compressor room door silencer detached.',
  'kabel terminal heater mengalami oksidasi.':
    'Heater terminal wire oxidized.',
  'pelindung akrilik di atas pisau pemotong tidak terpasang kembali setelah bersih-bersih.':
    'Acrylic guard over cutting blade was not reinstalled after cleaning.',
  'limit switch pengaman tutup tangki macet akibat kerak adonan.':
    'Tank lid safety limit switch jammed due to batter crust.',
  'solenoid valve kotor dan membutuhkan kalibrasi.':
    'Solenoid valve fouled and requires calibration.',
  'pipa pembuangan blowdown tidak diarahkan ke bak penampung tertutup.':
    'Blowdown discharge pipe was not directed to an enclosed pit.',
  'pelapis aluminium rusak terkena benturan troli.':
    'Aluminum jacketing damaged by trolley impact.',
  'arus fasa tidak seimbang pada kontaktor motor pompa.':
    'Phase current unbalanced on pump motor contactor.',
  'area putar palet belum memiliki garis batas aman.':
    'Pallet rotation area lacks a marked safety boundary line.',
  'belum ada tempat sampah khusus di ujung lini pengemasan.':
    'No dedicated trash bin at the end of packaging line.',
  'gejala muncul saat operasi normal.':
    'Symptoms appeared during normal operation.',

  // Learning summaries
  'penggantian bearing dan penjadwalan pelumasan mingguan berhasil menghilangkan slip.':
    'Bearing replacement and weekly lubrication scheduling eliminated slip.',
  'pemasangan lock nut pada tensioner rantai menjaga ketegangan tetap stabil.':
    'Installing a lock nut on chain tensioner keeps tension stable.',
  'standarisasi inspeksi selang pneumatik setiap 6 bulan mengurangi gangguan nozzle.':
    'Standardizing pneumatic hose inspection every 6 months reduced nozzle faults.',
  'checklist kalibrasi ulang wajib dijalankan setelah setiap siklus cip.':
    'Recalibration checklist mandatory following every CIP cycle.',
  'pembersihan sirip radiator bulanan dan alarm suhu praperingatan diterapkan.':
    'Monthly radiator fin cleaning and pre-warning temperature alarm implemented.',
  'penggantian ke safety switch tertutup ip67 dan tes interlock harian sebelum shift.':
    'Replaced with IP67 sealed safety switch and daily pre-shift interlock testing.',
  'pemasangan pipa pengarah ke blowdown pit tertutup dan penandaan zona panas.':
    'Installed guiding pipe to enclosed blowdown pit and hot zone demarcation.',

  // CAPA actions & notes
  'tindakan perbaikan komponen terkait': 'Corrective action for related component',
  'penerapan checklist pencegahan berkala': 'Implementation of periodic preventive checklist',
  'perbaikan komponen telah dilaksanakan sesuai sop.': 'Component repair completed according to SOP.',
  'checklist pencegahan sudah dimasukkan dalam inspeksi rutin.':
    'Preventive checklist has been included in routine inspection.',

  // Rejection reason
  'laporan uji coba atau sama dengan kasus sebelumnya.': 'Test report or duplicate of previous case.',

  // Emergency procedure text
  'ikuti prosedur darurat perusahaan terlebih dahulu. safetylog bukan pengganti prosedur resmi k3.':
    'Follow company emergency procedures first. SafetyLog is not a substitute for official HSE procedures.',
  'segera ikuti prosedur tanggap darurat perusahaan dan hubungi petugas p3k/k3 terlebih dahulu.':
    'Immediately follow company emergency response procedures and contact first-aid/EHS personnel first.',

  // Common AI sentences
  'tidak ditemukan kandidat kasus terdahulu yang relevan dan dapat anda akses.':
    'No relevant prior cases found accessible to your account.',
}

export function localizeContentText(lang: Language, text?: string | null): string {
  if (!text) return ''
  if (lang !== 'en') return text
  const clean = text.trim()
  const key = clean.toLowerCase()
  if (CONTENT_TRANSLATIONS_EN[key]) {
    return CONTENT_TRANSLATIONS_EN[key]
  }

  // Word/term-level heuristic fallback if not found in exact dictionary
  let res = clean
  const replacements: Array<[RegExp, string]> = [
    [/\bkonveyor pengemasan\b/gi, 'packaging conveyor'],
    [/\brantai penggerak\b/gi, 'drive chain'],
    [/\bkendor\b/gi, 'loose'],
    [/\bberhenti mendadak\b/gi, 'stopped suddenly'],
    [/\bakibat\b/gi, 'due to'],
    [/\bbagian ujung bergetar\b/gi, 'end part vibrates'],
    [/\bbautnya kendur\b/gi, 'bolts are loose'],
    [/\bpelindung samping\b/gi, 'side guard'],
    [/\bgagal mendeteksi\b/gi, 'failed to detect'],
    [/\bketika debu menumpuk\b/gi, 'when dust accumulated'],
    [/\btidak memutus daya motor\b/gi, 'does not cut motor power'],
    [/\bsaat tutup dibuka\b/gi, 'when lid is opened'],
    [/\btangki mixing\b/gi, 'mixing tank'],
    [/\binterlock tutup\b/gi, 'lid interlock'],
    [/\bsisa potongan lakban\b/gi, 'tape scraps'],
    [/\bdi bawah rangka mesin\b/gi, 'beneath machine frame'],
    [/\bmenumpuk\b/gi, 'accumulate'],
    [/\bperbaikan komponen\b/gi, 'component repair'],
    [/\btelah dilaksanakan sesuai sop\b/gi, 'has been completed according to SOP'],
    [/\bchecklist pencegahan\b/gi, 'preventive checklist'],
    [/\bsudah dimasukkan dalam inspeksi rutin\b/gi, 'has been included in routine inspection'],
    [/\blaporan uji coba\b/gi, 'test report'],
    [/\bkemiripan teks\b/gi, 'text similarity'],
    [/\bmesin sama\b/gi, 'same machine'],
  ]

  for (const [pattern, repl] of replacements) {
    res = res.replace(pattern, repl)
  }

  return res
}

export function localizeAiText(lang: Language, text?: string | null): string {
  return localizeContentText(lang, text)
}

