import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const ThemeCtx = createContext(null)
const KEY = 'kbb-theme'

/**
 * Theme. Dark is the house style.
 *
 * Beads, metal and stones read better against a dark ground — you get
 * highlights instead of flat reflections — so the shop opens dark and light
 * is one tap away for anyone who wants it. A visitor's choice is remembered
 * from then on.
 *
 * The initial class is set by an inline script in index.html, before first
 * paint, so there is no flash of the wrong theme before React mounts. This
 * provider reads that class rather than deciding again, so the two can never
 * disagree.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* private mode — the choice simply will not persist */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggle, isDark: theme === 'dark' }), [theme, toggle])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export const useTheme = () => {
  const ctx = useContext(ThemeCtx)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
