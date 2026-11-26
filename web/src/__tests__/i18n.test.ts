import { describe, expect, it } from 'vitest'
import { readStoredLanguage, translateKey } from '@/lib/i18n-helpers'

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
})
