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
