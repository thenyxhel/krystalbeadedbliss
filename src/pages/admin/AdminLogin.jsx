import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export default function AdminLogin() {
  const nav = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false) }
    else nav('/admin')
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center rounded-full mb-4"
            style={{
              width: 52, height: 52,
              background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
              border: '2px solid var(--gold2)',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)"/>
              <circle cx="6"  cy="10" r="2.5" fill="white" opacity=".8"/>
              <circle cx="10" cy="6"  r="2"   fill="white" opacity=".6"/>
              <circle cx="14" cy="10" r="2.5" fill="white" opacity=".8"/>
              <circle cx="10" cy="14" r="2"   fill="white" opacity=".6"/>
            </svg>
          </div>
          <h1 className="font-serif text-2xl font-semibold" style={{ color: 'var(--tx)' }}>
            Admin Panel
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--tx2)' }}>Krystal's Beaded Bliss</p>
        </div>

        <form onSubmit={handleLogin} className="card p-6 flex flex-col gap-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: 'var(--pink)' }}>{error}</p>
          )}

          <button
            type="submit"
            className="btn-gold w-full mt-1"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
