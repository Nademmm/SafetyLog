import { describe, expect, it } from 'vitest'
import {
  localizeAreaName,
  localizeCategoryName,
  localizeContentText,
  localizeJobTitle,
  localizeMachineName,
  localizeMatchingReason,
  readStoredLanguage,
  translateKey,
} from '@/lib/i18n-helpers'

describe('i18n', () => {
  it('defaults to Indonesian when no stored preference exists', () => {
    expect(readStoredLanguage()).toBe('id')
  })

  it('translates login and navigation keys for both id and en', () => {
    expect(translateKey('id', 'login.submit')).toBe('Masuk ke Sistem')
    expect(translateKey('en', 'login.submit')).toBe('Sign In')
    expect(translateKey('id', 'shell.logout')).toBe('Keluar')
    expect(translateKey('en', 'shell.logout')).toBe('Sign Out')
  })

  it('localizes similar cases matching reasons with zero Indonesian leakage', () => {
    expect(localizeMatchingReason('id', 'Mesin sama')).toBe('Mesin sama')
    expect(localizeMatchingReason('en', 'Mesin sama')).toBe('Same machine')
    expect(localizeMatchingReason('en', 'Kemiripan teks gejala/penyebab')).toBe(
      'Symptom/cause text similarity',
    )
    expect(localizeMatchingReason('en', 'Kategori sama')).toBe('Same category')
  })

  it('localizes machines, areas, and categories', () => {
    expect(localizeMachineName('en', 'Mesin Konveyor Pengemasan 01')).toBe(
      'Packaging Conveyor Machine 01',
    )
    expect(localizeAreaName('en', 'Lini Pengemasan A')).toBe('Packaging Line A')
    expect(localizeCategoryName('en', 'Mekanik')).toBe('Mechanical')
    expect(localizeCategoryName('en', 'Kelistrikan')).toBe('Electrical')
    expect(localizeJobTitle('en', 'Operator Lini Pengemasan')).toBe('Packaging Line Operator')
  })

  it('localizes case descriptions and CAPA actions for zero Indonesian leakage', () => {
    expect(
      localizeContentText(
        'en',
        'Pelindung samping konveyor pengemasan bagian ujung bergetar dan bautnya kendur.',
      ),
    ).toBe('Packaging conveyor end side guard vibrates and bolts are loose.')
    expect(
      localizeContentText(
        'en',
        'Konveyor pengemasan berhenti mendadak akibat rantai penggerak kendor.',
      ),
    ).toBe('Packaging conveyor stopped suddenly due to loose drive chain.')
    expect(
      localizeContentText('en', 'Tindakan perbaikan komponen terkait'),
    ).toBe('Corrective action for related component')
  })
})

