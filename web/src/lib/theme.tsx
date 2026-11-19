import * as React from 'react'

export type ThemeMode = 'dark' | 'light'

const THEME_KEY = 'safetylog_theme'

interface ThemeContextValue {
  theme: ThemeMode
  setTheme: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function getInitialTheme(): ThemeMode {
  try {
    const params = new URLSearchParams(window.location.search)
    const urlTheme = params.get('theme')
    if (urlTheme === 'light' || urlTheme === 'dark') {
      return urlTheme
    }
    const saved = localStorage.getItem(THEME_KEY)
    return saved === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  root.classList.remove('dark', 'light')
  root.classList.add(mode)
  root.setAttribute('data-theme', mode)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', mode === 'light' ? '#f9fafb' : '#000000')
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(getInitialTheme)

  React.useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  const setTheme = React.useCallback((mode: ThemeMode) => {
    setThemeState(mode)
  }, [])

  const toggleTheme = React.useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme harus digunakan di dalam ThemeProvider')
  }
  return ctx
}
