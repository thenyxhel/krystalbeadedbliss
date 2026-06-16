import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/config'
import ProductCard from '../components/ProductCard'
import BeadDivider from '../components/BeadDivider'
import { useToast, ToastContainer } from '../components/Toast'

const CATEGORIES = [
  { key: 'bracelet', label: 'Bracelets',  emoji: '📿' },
  { key: 'necklace', label: 'Necklaces',  emoji: '💫' },
  { key: 'earrings', label: 'Earrings',   emoji: '✨' },
  { key: 'set',      label: 'Sets',       emoji: '💎' },
]

export default function HomePage() {
  const nav = useNavigate()
  const { toasts, toast } = useToast()
  const [featured, setFeatured] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
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

      {/* ── Hero ───────────────────────────────────────── */}
      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: '90vh', padding: '60px 24px 80px' }}
      >
        {/* Orbs */}
        <div className="orb" style={{ width: 500, height: 500, background: 'var(--gold)',  opacity: .13, top: '-120px', right: '-80px' }} />
        <div className="orb" style={{ width: 380, height: 380, background: 'var(--pink)',  opacity: .09, bottom: '-60px', left: '-60px' }} />

        <div className="text-center relative z-10 max-w-xl mx-auto animate-fade-up">
          <div
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase mb-6 px-4 py-2 rounded-full"
            style={{ color: 'var(--gold)', border: '1px solid rgba(212,168,48,0.3)', background: 'var(--goldl)' }}
          >
            ✦ Be"U"tiful
          </div>

          <h1
            className="font-serif font-semibold mb-5"
            style={{ fontSize: 'clamp(44px, 8vw, 72px)', lineHeight: 1.08, color: 'var(--tx)', letterSpacing: '-0.01em' }}
          >
            Wear something<br />
            <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>beautifully yours</em>
          </h1>

          <p className="text-sm leading-relaxed mb-8 max-w-sm mx-auto" style={{ color: 'var(--tx2)' }}>
            Each piece is hand-strung with intention — from ready-made collections
            to fully custom creations built around you.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/shop"   className="btn-primary">Shop Collection</Link>
            <Link to="/custom" className="btn-outline">Build Custom Piece</Link>
          </div>

          <BeadDivider className="mt-14" />
        </div>
      </section>

      {/* ── Categories ─────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="mb-8">
          <p className="section-eyebrow">Browse by type</p>
          <h2 className="section-title">What are you looking for?</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CATEGORIES.map(c => (
            <Link
              key={c.key}
              to={`/shop?category=${c.key}`}
              className="card flex flex-col items-center justify-center gap-2 py-6 no-underline"
            >
              <span style={{ fontSize: 28 }}>{c.emoji}</span>
              <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ───────────────────────────── */}
      {(loading || featured.length > 0) && (
        <section className="max-w-5xl mx-auto px-6 pb-24">
          <BeadDivider className="mb-12" />
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="section-eyebrow">Handpicked for you</p>
              <h2 className="section-title">Featured pieces</h2>
            </div>
            <Link
              to="/shop"
              className="text-sm font-semibold hidden sm:block"
              style={{ color: 'var(--gold)', textDecoration: 'none' }}
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="card" style={{ height: 300, opacity: 0.4 }} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {featured.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAdded={() => toast('Added to cart!')}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── Custom Builder CTA ──────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'var(--surf)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)' }}
      >
        <div className="orb" style={{ width: 300, height: 300, background: 'var(--gold)', opacity: .08, top: '-60px', right: '10%' }} />
        <div className="max-w-5xl mx-auto px-6 py-20 text-center relative z-10">
          <p className="section-eyebrow mb-3">One of a kind</p>
          <h2 className="font-serif text-4xl font-semibold mb-4" style={{ color: 'var(--tx)' }}>
            Build your own piece
          </h2>
          <p className="text-sm leading-relaxed mb-8 max-w-md mx-auto" style={{ color: 'var(--tx2)' }}>
            Choose your bead type, colour, and charms — we'll string it exactly
            the way you imagined it.
          </p>
          <Link to="/custom" className="btn-gold">Start Building →</Link>
        </div>
      </section>

      {/* ── Sweet Soirée banner ─────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'var(--surf)', borderTop: '1px solid var(--bd)' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-16 text-center relative z-10">
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--tx2)' }}>
            Sister Store
          </p>
          <a
            href={CONFIG.sweetSoiree}
            target="_blank"
            rel="noreferrer"
            className="font-serif text-3xl font-semibold no-underline transition-colors block mb-2"
            style={{ color: 'var(--gold)' }}
            onMouseEnter={e => e.target.style.color = 'var(--gold2)'}
            onMouseLeave={e => e.target.style.color = 'var(--gold)'}
          >
            The Sweet Soirée ↗
          </a>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>Hair accessories &amp; beauty — a world of their own.</p>
        </div>
      </section>
    </div>
  )
}