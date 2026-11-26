import * as React from 'react'
import {
  LANGUAGE_STORAGE_KEY,
  LanguageContext,
  readStoredLanguage,
  translateKey,
  type Language,
  type TranslationKey,
} from '@/lib/i18n-helpers'

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Language>(() => readStoredLanguage())

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang
    }
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    } catch {
      // ignore storage errors
    }
  }, [lang])

  const setLang = React.useCallback((next: Language) => {
    setLangState(next)
  }, [])

  const toggleLang = React.useCallback(() => {
    setLangState((prev) => (prev === 'id' ? 'en' : 'id'))
  }, [])

  const t = React.useCallback((key: TranslationKey) => translateKey(lang, key), [lang])

  const pick = React.useCallback(
    <T,>(idValue: T, enValue: T): T => (lang === 'en' ? enValue : idValue),
    [lang],
  )

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, pick }}>
      {children}
    </LanguageContext.Provider>
  )
}
