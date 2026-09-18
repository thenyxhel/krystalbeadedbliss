import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useSeo } from '../../lib/useSeo'
import { Mark } from '../../components/Brand'
import Icon from '../../components/Icon'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: 'grid', end: true },
  { to: '/admin/products', label: 'Products', icon: 'package' },
  { to: '/admin/orders', label: 'Orders', icon: 'truck' },
  { to: '/admin/reviews', label: 'Reviews', icon: 'star' },
  { to: '/admin/complaints', label: 'Complaints', icon: 'chat' },
  { to: '/admin/custom', label: 'Builder options', icon: 'sliders' },
]

const linkStyle = ({ isActive }) => ({
  background: isActive ? 'var(--surface-2)' : 'transparent',
  color: isActive ? 'var(--ink)' : 'var(--ink-2)',
  borderLeft: `2px solid ${isActive ? 'var(--clay)' : 'transparent'}`,
})

export default function AdminLayout() {
  const navigate = useNavigate()

  useSeo({ title: 'Admin', noindex: true })

  const signOut = async () => {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen md:flex" style={{ background: 'var(--bg)' }}>
      <aside
        className="hidden md:flex flex-col flex-shrink-0"
        style={{
          width: 226,
          background: 'var(--surface)',
          borderRight: '1px solid var(--line)',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--line)' }}>
          <Mark size={24} />
          <p className="eyebrow mt-3">Admin</p>
        </div>

        <nav className="flex-1 py-3" aria-label="Admin sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex items-center gap-3 px-5 py-2.5 text-sm font-medium no-underline transition-colors"
              style={linkStyle}
            >
              <Icon name={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3" style={{ borderTop: '1px solid var(--line)' }}>
          <a href="/" className="btn btn-ghost btn-sm btn-block no-underline justify-start">
            <Icon name="arrowLeft" size={15} />
            View the shop
          </a>
          <button type="button" onClick={signOut} className="btn btn-ghost btn-sm btn-block justify-start">
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile: a scrolling tab strip, not a cramped row that clips. */}
      <div
        className="md:hidden sticky top-0 z-40"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <Mark size={22} />
          <button type="button" onClick={signOut} className="btn btn-ghost btn-sm">
            <Icon name="logout" size={15} />
            Sign out
          </button>
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto" aria-label="Admin sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="chip flex-shrink-0 no-underline"
              style={({ isActive }) =>
                isActive
                  ? { background: 'var(--ink)', borderColor: 'var(--ink)', color: 'var(--bg)' }
                  : undefined
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="flex-1 min-w-0 p-5 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}
