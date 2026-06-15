import { useEffect, useState } from 'react'

export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = (msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }

  return { toasts, toast }
}

export function ToastContainer({ toasts }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-fade-up px-5 py-3 rounded-xl text-sm font-medium text-white shadow-lg"
          style={{ background: t.type === 'error' ? 'var(--pink)' : 'var(--gold)' }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  )
}
