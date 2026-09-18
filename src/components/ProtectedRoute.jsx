import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

/**
 * Gate the admin area.
 *
 * The old check was `session ? children : redirect` — i.e. "is anyone signed
 * in?". Combined with RLS policies that said `auth.role() = 'authenticated'`,
 * that meant any person who created an account could read every customer's
 * address. Now we ask the database whether *this* user is an admin, and the
 * database is the same authority that guards the rows.
 */
export default function ProtectedRoute({ children }) {
  const [state, setState] = useState('checking') // checking | admin | denied | anon
  const location = useLocation()

  useEffect(() => {
    let cancelled = false

    const evaluate = async (session) => {
      if (!session) {
        if (!cancelled) setState('anon')
        return
      }
      const { data, error } = await supabase.rpc('is_admin')
      if (cancelled) return
      if (error) {
        console.error('[KBB] is_admin() failed:', error)
        setState('denied')
        return
      }
      setState(data === true ? 'admin' : 'denied')
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState('checking')
      evaluate(session)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  if (state === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center gap-2 text-ink-3">
        <Icon name="spinner" size={18} className="animate-spin" />
        <span className="text-sm">Checking access…</span>
      </div>
    )
  }

  if (state === 'anon') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }

  // Signed in, but not on the allow-list. Say so plainly rather than looping
  // them back to a login form they have already completed.
  if (state === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ padding: 'var(--gutter)' }}>
        <div className="card p-8 text-center" style={{ maxWidth: 420 }}>
          <Icon name="alert" size={28} style={{ color: 'var(--bad)', margin: '0 auto 0.75rem' }} />
          <h1 className="h3 mb-2">This account is not an administrator.</h1>
          <p className="text-sm text-ink-2 mb-5">
            You are signed in, but your user is not on the admin allow-list.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={async () => {
                await supabase.auth.signOut()
              }}
            >
              Sign out
            </button>
            <a className="btn btn-ghost btn-sm" href="/">
              Back to the shop
            </a>
          </div>
        </div>
      </div>
    )
  }

  return children
}
