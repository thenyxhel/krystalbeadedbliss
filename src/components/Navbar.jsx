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

  const links = [
    { to: '/shop',      label: 'Shop' },
    { to: '/custom',    label: 'Custom Order' },
    { to: '/track',     label: 'Track Order' },
  ]

  return (
    <>
      <header
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '12px 20px 0' }}
        className="pointer-events-none"
      >
        <nav
          className="pointer-events-auto mx-auto flex items-center justify-between"
          style={{
            maxWidth: 980,
            height: 58,
            background: scrolled
              ? (dark ? 'rgba(13,8,24,0.94)' : 'rgba(247,245,255,0.94)')
              : 'var(--nbg)',
            backdropFilter: 'blur(24px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
            border: '1px solid var(--bd)',
            borderRadius: 100,
            padding: '0 10px 0 18px',
            boxShadow: scrolled
              ? '0 8px 40px rgba(45,27,105,0.18)'
              : '0 4px 20px rgba(45,27,105,0.08)',
            transition: 'box-shadow 0.4s, background 0.4s',
          }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 no-underline">
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'var(--lavender)', opacity: 0.35, filter: 'blur(8px)',
              }} />
              <div style={{
                position: 'relative',
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
                border: '2px solid var(--gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 20 20">
                  <circle cx="10" cy="10" r="9" fill="rgba(255,255,255,0.15)"/>
                  <circle cx="6"  cy="10" r="2.5" fill="white" opacity=".75"/>
                  <circle cx="10" cy="6"  r="2"   fill="white" opacity=".55"/>
                  <circle cx="14" cy="10" r="2.5" fill="white" opacity=".75"/>
                  <circle cx="10" cy="14" r="2"   fill="white" opacity=".55"/>
                </svg>
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="font-display font-semibold text-sm leading-tight" style={{ color: 'var(--tx)' }}>
                Krystal Beaded Bliss
              </div>
              <div className="font-script text-xs leading-tight" style={{ color: 'var(--gold)', fontSize: 11 }}>
                ....Be"U"tiful
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
                width: 34, height: 34, borderRadius: '50%',
                border: '1px solid var(--bd)',
                background: 'var(--surf)',
                color: 'var(--tx)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.25s, box-shadow 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(45,27,105,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
              aria-label="Toggle theme"
            >
              {dark
                ? <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--gold)" strokeWidth={2}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
                : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--purple)" strokeWidth={2}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
              }
            </button>

            {/* Cart */}
            <button
              onClick={() => nav('/cart')}
              className="btn-primary text-xs px-4 py-2 gap-1.5"
              style={{ minWidth: 80, fontSize: 12 }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              Cart
              {count > 0 && (
                <span style={{
                  background: 'var(--gold)', color: 'var(--bg)',
                  borderRadius: 100, padding: '1px 7px',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {count}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button
              className="md:hidden w-9 h-9 rounded-full flex items-center justify-center"
              style={{ border: '1px solid var(--bd)', background: 'var(--surf)' }}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--tx)" strokeWidth={2}>
                {menuOpen
                  ? <path d="M6 18L18 6M6 6l12 12"/>
                  : <path d="M4 6h16M4 12h16M4 18h16"/>}
              </svg>
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col animate-fade-in"
          style={{ background: 'var(--bg)', paddingTop: 88 }}
        >
          <div className="flex flex-col items-center gap-2 p-6">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className="nav-link text-base w-full text-center py-3 rounded-2xl"
                onClick={() => setMenuOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <button
            className="absolute top-5 right-6 w-9 h-9 rounded-full flex items-center justify-center"
            style={{ color: 'var(--tx)', background: 'var(--surf)', border: '1px solid var(--bd)' }}
            onClick={() => setMenuOpen(false)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: 82 }} />
    </>
  )
}
