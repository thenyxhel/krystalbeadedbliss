import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ADMIN_BASE } from '../lib/adminPath'

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState('loading') // 'loading' | 'auth' | 'unauth'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setState(data.session ? 'auth' : 'unauth')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setState(session ? 'auth' : 'unauth')
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  if (state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-sm" style={{ color: 'var(--tx2)' }}>Checking access…</div>
      </div>
    )
  }

  return state === 'auth' ? children : <Navigate to={`${ADMIN_BASE}/login`} replace />
}