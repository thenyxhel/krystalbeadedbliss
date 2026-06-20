import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ADMIN_BASE } from '../../lib/adminPath'

const NAV = [
  { to: ADMIN_BASE,                  label: 'Dashboard',     icon: '◈', end: true },
  { to: `${ADMIN_BASE}/products`,    label: 'Products',      icon: '◎' },
  { to: `${ADMIN_BASE}/orders`,      label: 'Orders',        icon: '◷' },
  { to: `${ADMIN_BASE}/reviews`,     label: 'Reviews',       icon: '★' },
  { to: `${ADMIN_BASE}/complaints`,  label: 'Complaints',    icon: '◌' },
  { to: `${ADMIN_BASE}/custom`,      label: 'Builder Config', icon: '◉' },
]

export default function AdminLayout() {
  const nav = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    nav('/')   // back to the public site, not the admin login
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg)' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex flex-col w-56 flex-shrink-0"
        style={{
          background: 'var(--surf)',
          borderRight: '1px solid var(--bd)',
          position: 'sticky', top: 0, height: '100vh',
        }}
      >
        <div className="px-5 py-6" style={{ borderBottom: '1px solid var(--bd)' }}>
          <p className="font-serif text-base font-semibold" style={{ color: 'var(--tx)' }}>Krystal's</p>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontSize: 9 }}>Admin Panel</p>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all no-underline"
              style={({ isActive }) => ({
                background: isActive ? 'var(--goldl)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--tx2)',
              })}
            >
              <span style={{ fontSize: 16 }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ color: 'var(--tx2)', background: 'none', border: 'none', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--pink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tx2)'}
          >
            <span style={{ fontSize: 16 }}>→</span> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{ height: 56, background: 'var(--surf)', borderBottom: '1px solid var(--bd)' }}
      >
        <p className="font-serif text-sm font-semibold" style={{ color: 'var(--tx)' }}>Admin</p>
        <div className="flex gap-2 overflow-x-auto">
          {NAV.map(n => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className="text-xs px-2 py-1 rounded-lg no-underline whitespace-nowrap"
              style={({ isActive }) => ({
                background: isActive ? 'var(--goldl)' : 'transparent',
                color: isActive ? 'var(--gold)' : 'var(--tx2)',
              })}
            >
              {n.label}
            </NavLink>
          ))}
        </div>
        <button
          onClick={logout}
          style={{ background: 'none', border: 'none', color: 'var(--tx2)', fontSize: 12 }}
        >
          Out
        </button>
      </div>

      <main className="flex-1 min-w-0 p-6 md:p-8 mt-14 md:mt-0">
        <Outlet />
      </main>
    </div>
  )
}