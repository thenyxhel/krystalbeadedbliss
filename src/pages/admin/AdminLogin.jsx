import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSeo } from '../../lib/useSeo'
import { friendlyError } from '../../lib/utils'
import { Mark } from '../../components/Brand'
import Icon from '../../components/Icon'

export default function AdminLogin() {
  const navigate = useNavigate()
  const location = useLocation()

  useSeo({ title: 'Admin', noindex: true })

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Already signed in and already an admin? Skip the form.
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: isAdmin } = await supabase.rpc('is_admin')
      if (isAdmin === true) navigate(location.state?.from ?? '/admin', { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      // Deliberately vague: distinguishing "no such user" from "wrong
      // password" hands an attacker a way to enumerate valid accounts.
      setError(
        /invalid|credentials/i.test(err.message)
          ? 'That email and password do not match.'
          : friendlyError(err, 'Could not sign in. Please try again.')
      )
      setLoading(false)
      return
    }

    navigate(location.state?.from ?? '/admin', { replace: true })
  }

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)', padding: 'var(--gutter)' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div className="text-center mb-8">
          <Mark size={34} className="mx-auto" />
          <h1 className="h2 mt-4">Admin</h1>
          <p className="meta mt-1">Krystal Beaded Bliss</p>
        </div>

        <form onSubmit={signIn} className="card p-6 flex flex-col gap-5">
          <div>
            <label className="label" htmlFor="admin-email">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              className="field"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="label" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="error-text flex items-start gap-2" role="alert">
              <Icon name="alert" size={16} style={{ marginTop: 2 }} />
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? (
              <>
                <Icon name="spinner" size={17} className="animate-spin" /> Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="help text-center mt-5">
          Access is granted by adding your user to the <span className="numeric">admins</span> table.
          Signing up alone does not grant it.
        </p>
      </div>
    </main>
  )
}
