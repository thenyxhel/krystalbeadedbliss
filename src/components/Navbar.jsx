import { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { dark, toggle } = useTheme()
  const { count } = useCart()
  const nav = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close menu on route change
  useEffect(() => setMenuOpen(false), [])

  const links = [
    { to: '/shop',    label: 'Shop' },
    { to: '/custom',  label: 'Custom Order' },
    { to: '/track',   label: 'Track Order' },
  ]

  return (
    <>
      {/* Floating navbar */}
      <header
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 20px 0' }}
        className="pointer-events-none"
      >
        <nav
          className="pointer-events-auto mx-auto flex items-center justify-between"
          style={{
            maxWidth: 960,
            height: 56,
            background: 'var(--nbg)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            border: '1px solid var(--bd)',
            borderRadius: 100,
            padding: '0 8px 0 16px',
            boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.18)' : '0 4px 16px rgba(0,0,0,0.1)',
            transition: 'box-shadow 0.3s',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div
              style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--gold), var(--gold2))',
                border: '2px solid var(--gold2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.2)"/>
                <circle cx="6"  cy="10" r="2.5" fill="white" opacity=".8"/>
                <circle cx="10" cy="6"  r="2"   fill="white" opacity=".6"/>
                <circle cx="14" cy="10" r="2.5" fill="white" opacity=".8"/>
                <circle cx="10" cy="14" r="2"   fill="white" opacity=".6"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <div className="font-serif text-sm font-semibold leading-tight" style={{ color: 'var(--tx)' }}>
                Krystal's
              </div>
              <div className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)', fontSize: 9 }}>
                Beaded Bliss
              </div>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggle}
              style={{
                width: 32, height: 32, borderRadius: '50%',
                border: '1px solid var(--bd)',
                background: 'var(--surf)',
                color: 'var(--tx)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, transition: 'transform 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'rotate(20deg) scale(1.1)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
              aria-label="Toggle theme"
            >
              {dark ? '☀️' : '🌙'}
            </button>

            {/* Cart */}
            <button
              onClick={() => nav('/cart')}
              className="btn-gold text-xs px-3 py-2 gap-1.5"
              style={{ minWidth: 80 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Cart
              {count > 0 && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.28)',
                    borderRadius: 100,
                    padding: '1px 7px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {count}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex flex-col gap-1 p-2"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              {[0,1,2].map(i => (
                <span
                  key={i}
                  style={{
                    display: 'block', width: 18, height: 2,
                    background: 'var(--tx)',
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    transform: menuOpen
                      ? i === 0 ? 'rotate(45deg) translate(3px, 3px)'
                      : i === 2 ? 'rotate(-45deg) translate(3px, -3px)'
                      : 'scaleX(0)'
                      : 'none',
                  }}
                />
              ))}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col"
          style={{ background: 'var(--bg)', paddingTop: 80 }}
        >
          <div className="flex flex-col items-center gap-2 p-6">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className="nav-link text-base w-full text-center py-3"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <button
            className="absolute top-5 right-6 text-2xl"
            style={{ color: 'var(--tx)', background: 'none', border: 'none' }}
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spacer so content doesn't hide under fixed nav */}
      <div style={{ height: 80 }} />
    </>
  )
}
