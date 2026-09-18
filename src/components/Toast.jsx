import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import Icon from './Icon'

const ToastCtx = createContext(null)

/**
 * One toast host for the whole app.
 *
 * Previously every page called its own useToast() and rendered its own
 * container, so a toast fired during navigation vanished with the page that
 * raised it, and "Added to cart" could never survive the route change it was
 * describing. It also lived outside any live region, so screen readers never
 * heard it at all.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const toast = useCallback(
    (message, tone = 'ok', duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss]
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastCtx.Provider value={value}>
      {children}

      {/* Polite: announced at the next pause, not shouted over the reader. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed z-[120] flex flex-col gap-2 no-print"
        style={{ bottom: '1.25rem', right: '1.25rem', left: '1.25rem', maxWidth: 380, marginLeft: 'auto' }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-rise flex items-start gap-3 px-4 py-3 shadow-lg"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--line-strong)',
              borderLeft: `3px solid var(--${t.tone === 'bad' ? 'bad' : t.tone === 'warn' ? 'warn' : 'ok'})`,
              borderRadius: 'var(--r-md)',
            }}
          >
            <Icon
              name={t.tone === 'bad' ? 'alert' : t.tone === 'warn' ? 'info' : 'check'}
              size={18}
              className="mt-0.5"
              style={{ color: `var(--${t.tone === 'bad' ? 'bad' : t.tone === 'warn' ? 'warn' : 'ok'})`, flexShrink: 0 }}
            />
            <p className="flex-1 text-sm text-ink">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="text-ink-3 hover:text-ink"
              style={{ background: 'none', border: 'none', padding: 2, lineHeight: 0 }}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
