import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/config'
import ProductCard from '../components/ProductCard'
import BeadDivider from '../components/BeadDivider'
import { useToast, ToastContainer } from '../components/Toast'

const CATEGORIES = [
  { key: 'bracelet', label: 'Bracelets', emoji: '📿' },
  { key: 'necklace', label: 'Necklaces', emoji: '💫' },
  { key: 'earrings', label: 'Earrings',  emoji: '✨' },
  { key: 'set',      label: 'Sets',      emoji: '💎' },
]

function useReveal() {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.12 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return [ref, visible]
}

export default function HomePage() {
  const { toasts, toast } = useToast()
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [heroVisible, setHeroVisible] = useState(false)
  const [catRef, catVisible] = useReveal()
  const [featRef, featVisible] = useReveal()
  const [ctaRef, ctaVisible] = useReveal()

  useEffect(() => {
    setTimeout(() => setHeroVisible(true), 80)
    supabase
      .from('products')
      .select('*')
      .eq('featured', true)
      .eq('available', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setFeatured(data || []); setLoading(false) })
  }, [])

  return (
    <div>
      <ToastContainer toasts={toasts} />

      {/* ── Hero ── */}
      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: '92vh', padding: '60px 24px 80px' }}
      >
        {/* Mesh background */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(155,135,196,0.20) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 20%, rgba(176,96,144,0.12) 0%, transparent 60%), var(--bg)'
        }} />

        {/* Floating orbs */}
        <div className="orb float-gem" style={{ width: 320, height: 320, background: 'var(--lavender)', opacity: .18, top: '-60px', right: '-40px', animationDelay: '0s' }} />
        <div className="orb float-gem" style={{ width: 240, height: 240, background: 'var(--purple2)', opacity: .12, bottom: '-40px', left: '-40px', animationDelay: '1.5s' }} />
        <div className="orb float-gem" style={{ width: 160, height: 160, background: 'var(--gold)', opacity: .16, top: '40%', right: '8%', animationDelay: '3s' }} />

        {/* Decorative rings */}
        <div className="absolute" style={{ top: '8%', right: '12%', width: 96, height: 96, borderRadius: '50%', border: '1px solid var(--lavender)', opacity: .12 }} />
        <div className="absolute" style={{ bottom: '20%', left: '6%', width: 140, height: 140, borderRadius: '50%', border: '1px solid var(--gold)', opacity: .10 }} />

        <div
          className="text-center relative z-10 max-w-xl mx-auto"
          style={{
            opacity: heroVisible ? 1 : 0,
            transform: heroVisible ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.9s ease, transform 0.9s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          {/* Logo badge with pulse */}
          <div className="relative inline-flex items-center justify-center mb-8">
            <div style={{
              position: 'absolute', width: 80, height: 80, borderRadius: '50%',
              background: 'var(--lavender)', opacity: .28,
              animation: 'pulseRing 2.5s ease-out infinite',
            }} />
            <div style={{
              position: 'relative', width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
              border: '2px solid var(--gold)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(45,27,105,0.35)',
            }}>
              <svg width="26" height="26" viewBox="0 0 20 20">
                <circle cx="6"  cy="10" r="2.5" fill="white" opacity=".75"/>
                <circle cx="10" cy="6"  r="2"   fill="white" opacity=".55"/>
                <circle cx="14" cy="10" r="2.5" fill="white" opacity=".75"/>
                <circle cx="10" cy="14" r="2"   fill="white" opacity=".55"/>
              </svg>
            </div>
          </div>

          <p className="text-xs font-bold tracking-[0.3em] uppercase mb-4" style={{ color: 'var(--lavender)' }}>
            Est. Lagos · Nigeria
          </p>

          <h1
            className="font-display font-light mb-2"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 5.5rem)', lineHeight: 1.05, color: 'var(--tx)' }}
          >
            Krystal
          </h1>
          <h1
            className="font-display font-semibold lavender-shimmer mb-4"
            style={{ fontSize: 'clamp(2.8rem, 8vw, 5.5rem)', lineHeight: 1.05 }}
          >
            Beaded Bliss
          </h1>

          <p className="font-script text-2xl mb-3" style={{ color: 'var(--gold)' }}>
            ....Be"U"tiful
          </p>

          <p className="text-sm leading-relaxed mb-10 max-w-sm mx-auto" style={{ color: 'var(--tx2)' }}>
            Each piece is hand-strung with intention — from ready-made collections
            to fully custom creations built around you.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/shop"   className="btn-primary">Shop Collection</Link>
            <Link to="/custom" className="btn-outline">Build Custom Piece</Link>
          </div>

          <BeadDivider className="mt-14" />
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2" style={{ opacity: heroVisible ? 1 : 0, transition: 'opacity 1s ease 1s' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'var(--tx2)' }}>Scroll</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, var(--lavender), transparent)', opacity: 0.4 }} />
        </div>
      </section>

      {/* ── Categories ── */}
      <section ref={catRef} className="max-w-5xl mx-auto px-6 pb-20">
        <div className={`reveal ${catVisible ? 'visible' : ''} mb-8`}>
          <p className="section-eyebrow">Browse by type</p>
          <h2 className="section-title">What are you looking for?</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map((c, i) => (
            <Link
              key={c.key}
              to={`/shop?category=${c.key}`}
              className={`card flex flex-col items-center justify-center gap-2 py-7 no-underline reveal ${catVisible ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 0.08}s` }}
            >
              <span style={{ fontSize: 28 }}>{c.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ── */}
      {(loading || featured.length > 0) && (
        <section ref={featRef} className="max-w-5xl mx-auto px-6 pb-24">
          <BeadDivider className="mb-12" />
          <div className={`flex items-end justify-between mb-8 reveal ${featVisible ? 'visible' : ''}`}>
            <div>
              <p className="section-eyebrow">Handpicked for you</p>
              <h2 className="section-title">Featured <em className="font-semibold not-italic" style={{ color: 'var(--purple)' }}>pieces</em></h2>
            </div>
            <Link to="/shop" className="text-sm font-semibold hidden sm:block no-underline transition-colors" style={{ color: 'var(--lavender)' }}
              onMouseEnter={e => e.target.style.color = 'var(--purple)'}
              onMouseLeave={e => e.target.style.color = 'var(--lavender)'}>
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card" style={{ height: 300, opacity: 0.3 }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map((p, i) => (
                <div key={p.id} className={`reveal ${featVisible ? 'visible' : ''}`} style={{ transitionDelay: `${i * 0.08}s` }}>
                  <ProductCard product={p} onAdded={() => toast('Added to cart!')} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Custom Builder CTA ── */}
      <section
        ref={ctaRef}
        className="relative overflow-hidden"
        style={{ background: 'var(--surf)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)' }}
      >
        <div className="orb" style={{ width: 280, height: 280, background: 'var(--lavender)', opacity: .10, top: '-60px', right: '10%' }} />
        <div className="orb" style={{ width: 200, height: 200, background: 'var(--gold)', opacity: .08, bottom: '-40px', left: '5%' }} />
        <div className={`max-w-5xl mx-auto px-6 py-20 text-center relative z-10 reveal ${ctaVisible ? 'visible' : ''}`}>
          <p className="section-eyebrow mb-3">One of a kind</p>
          <h2 className="font-display font-light text-4xl mb-4" style={{ color: 'var(--tx)' }}>
            Build your own <em className="font-semibold" style={{ color: 'var(--purple)' }}>piece</em>
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-md mx-auto" style={{ color: 'var(--tx2)' }}>
            Choose your bead type, colour, and charms — we'll string it exactly
            the way you imagined it.
          </p>
          <Link to="/custom" className="btn-primary">Start Building →</Link>
        </div>
      </section>
    </div>
  )
}
