import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'
import Brand from './Brand'
import Icon from './Icon'

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/custom', label: 'Design yours' },
  { to: '/track', label: 'Track order' },
]

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const { count } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const menuButtonRef = useRef(null)
  const panelRef = useRef(null)

  // Close on navigation.
  useEffect(() => setMenuOpen(false), [pathname])

  // Escape closes, focus returns to the button that opened it, and the page
  // behind the panel stops scrolling. All three are table stakes for a dialog
  // and all three were missing.
  useEffect(() => {
    if (!menuOpen) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
      }
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.querySelector('a, button')?.focus()

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <>
      <header
        className="sticky top-0 z-50 no-print"
        style={{
          background: 'var(--bg)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <div className="page flex items-center justify-between" style={{ height: 68 }}>
          <Brand />

          <nav aria-label="Main" className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggle}
              className="btn btn-ghost btn-sm"
              style={{ padding: '0.5rem' }}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>

            <Link
              to="/cart"
              className="btn btn-ghost btn-sm no-underline"
              style={{ padding: '0.5rem 0.625rem' }}
              aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart, empty'}
            >
              <Icon name="cart" size={18} />
              {count > 0 && (
                <span
                  className="numeric"
                  style={{
                    background: 'var(--clay)',
                    color: '#fff',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1,
                    padding: '3px 6px',
                    minWidth: 18,
                    textAlign: 'center',
                  }}
                >
                  {count}
                </span>
              )}
            </Link>

            <button
              ref={menuButtonRef}
              type="button"
              className="btn btn-ghost btn-sm md:hidden"
              style={{ padding: '0.5rem' }}
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="md:hidden fixed inset-0 z-40 animate-fade flex flex-col"
          style={{ background: 'var(--bg)', paddingTop: 68 }}
        >
          <nav className="page flex flex-col py-6" aria-label="Mobile">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className="h2 no-underline py-4"
                style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink)' }}
              >
                {l.label}
              </NavLink>
            ))}
            <Link to="/cart" className="h2 no-underline py-4" style={{ color: 'var(--ink)' }}>
              Cart {count > 0 && <span className="numeric text-clay">({count})</span>}
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
