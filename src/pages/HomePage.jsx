import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/config'
import { useSeo } from '../lib/useSeo'
import { useReveal } from '../lib/useReveal'
import ProductCard from '../components/ProductCard'
import Icon from '../components/Icon'
import Rule from '../components/Rule'
import { Mark } from '../components/Brand'

const ASSURANCES = [
  { icon: 'package', title: 'Made to order', body: 'Strung by hand after you buy' },
  { icon: 'truck', title: 'Nationwide delivery', body: 'Arranged once you confirm' },
  { icon: 'chat', title: 'We reply on WhatsApp', body: 'A person, usually same day' },
  { icon: 'star', title: 'Remake or repair', body: 'Something wrong? Tell us' },
]

const STEPS = [
  {
    icon: 'grid',
    title: 'Choose or design',
    body: 'Shop what is ready today, or build a piece from bead, colour and charm.',
  },
  {
    icon: 'package',
    title: 'Strung by hand',
    body: 'Every order is made on the bench, one at a time. Usually within a day.',
  },
  {
    icon: 'truck',
    title: 'Sent to you',
    body: 'Delivery anywhere in Nigeria, arranged with you once your order is confirmed.',
  },
]

function Section({ children, className = '' }) {
  const [ref, visible] = useReveal()
  return (
    <div ref={ref} className={`reveal ${visible ? 'is-visible' : ''} ${className}`}>
      {children}
    </div>
  )
}

export default function HomePage() {
  useSeo({
    description:
      'Beaded and chain jewellery made by hand in Lagos — bracelets, necklaces, watches, keychains and bag charms. Shop the collection or design your own.',
  })

  const [featured, setFeatured] = useState([])
  const [covers, setCovers] = useState({})
  const [state, setState] = useState('loading') // loading | ready | error

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [{ data: feature, error }, { data: recent }] = await Promise.all([
        supabase
          .from('products')
          .select('id, slug, name, category, description, price, stock, images, available, featured')
          .eq('featured', true)
          .eq('available', true)
          .gt('stock', 0)
          .order('created_at', { ascending: false })
          .limit(8),
        // Category tiles are illustrated with a real piece from that category
        // rather than a stock icon — no extra art to commission, and the
        // imagery updates itself as the collection changes.
        supabase
          .from('products')
          .select('category, images, created_at')
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(60),
      ])

      if (cancelled) return

      if (error) {
        console.error('[KBB] featured products:', error)
        setState('error')
        return
      }

      const byCategory = {}
      for (const row of recent ?? []) {
        if (!byCategory[row.category] && row.images?.[0]) byCategory[row.category] = row.images[0]
      }

      setFeatured(feature ?? [])
      setCovers(byCategory)
      setState('ready')
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const hero = featured[0]

  return (
    <>
      {/* ═══ HERO ═══════════════════════════════════════════════════════════
          Asymmetric: the words on the left, the work on the right. The old
          hero centred a logo badge over a blurred purple gradient and showed
          no product at all above the fold. */}
      <section className="page" style={{ paddingTop: 'clamp(2.5rem, 6vw, 5rem)', paddingBottom: 'clamp(3rem, 7vw, 6rem)' }}>
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 animate-rise">
            <p className="eyebrow mb-5">{CONFIG.city}</p>

            <h1 className="display">
              Beads. Chains.
              <br />
              <span style={{ color: 'var(--accent)' }}>Made by hand.</span>
            </h1>

            <p className="lede mt-6">
              Bracelets, necklaces, watches, keychains and bag charms — beaded, chained,
              or both. Ready to wear today, or built from scratch around a colour you
              have in mind.
            </p>

            {/* Stacked and full width on a phone. Side by side they wrapped
                to two lines of different widths, which reads as an accident
                rather than a pair of choices. */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-9">
              <Link to="/shop" className="btn btn-primary no-underline">
                Shop the collection
                <Icon name="arrowRight" size={17} />
              </Link>
              <Link to="/custom" className="btn btn-outline no-underline">
                Design your own
              </Link>
            </div>

          </div>

          {/* When there is no featured piece the column has nothing to show,
              so it collapses instead of reserving a tall empty box above the
              fold — which on a phone pushed everything else off screen. */}
          <div className={hero?.images?.[0] ? 'lg:col-span-6' : 'hidden lg:block lg:col-span-6'}>
            {hero?.images?.[0] ? (
              <Link to={`/product/${hero.slug || hero.id}`} className="block group no-underline">
                <div className="frame" style={{ aspectRatio: '5 / 6' }}>
                  <img
                    src={hero.images[0]}
                    alt={hero.name}
                    width="1000"
                    height="1200"
                    fetchpriority="high"
                    decoding="async"
                    className="group-hover:scale-[1.03]"
                  />
                </div>
                <p className="meta mt-3 flex items-center justify-between gap-3">
                  <span className="text-ink">{hero.name}</span>
                  <span className="link inline-flex items-center gap-1">
                    View piece <Icon name="arrowRight" size={14} />
                  </span>
                </p>
              </Link>
            ) : (
              <div
                className="frame flex items-center justify-center"
                style={{ aspectRatio: '4 / 3', background: 'var(--bg-sunk)' }}
              >
                <div className="text-center px-8">
                  <Mark size={54} className="mx-auto" />
                  <p className="meta mt-4">Featured pieces appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ REASSURANCE BAND ═══════════════════════════════════════════════
          The one bright interruption on a dark page. Four things a first-time
          buyer needs to know before they will send money to a stranger by
          bank transfer — which is exactly the job this pattern does on every
          shop that uses it. Carries its own ink tokens, so it reads the same
          in both themes. */}
      <section className="band no-print" aria-label="What to expect">
        <div className="page py-7">
          <ul className="list-none p-0 m-0 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6">
            {ASSURANCES.map((a) => (
              <li key={a.title} className="flex items-start gap-3">
                <Icon name={a.icon} size={22} style={{ marginTop: 2, opacity: 0.85 }} />
                <span>
                  <span className="block text-sm font-semibold">{a.title}</span>
                  <span className="block band-muted" style={{ fontSize: '0.8125rem' }}>
                    {a.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ═══ CATEGORIES ═════════════════════════════════════════════════════
          Illustrated with a real piece from each category, pulled live. A
          drawn icon is the fallback when a category has no photo yet, so an
          empty shop degrades to something deliberate rather than to a gap. */}
      <section className="page py-16">
        <Section>
          <p className="eyebrow mb-2">Browse</p>
          <h2 className="h1 mb-9">What are you after?</h2>
        </Section>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CONFIG.categories.map((c) => {
            const cover = covers[c.key]
            return (
              <Link key={c.key} to={`/shop?category=${c.key}`} className="group block no-underline">
                <div className="frame frame-square">
                  {cover ? (
                    <img
                      src={cover}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width="600"
                      height="600"
                      className="group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Icon name={c.key} size={34} className="text-accent" />
                    </span>
                  )}

                  {/* Scrim: the label has to stay readable over a photo we
                      have never seen, so it gets its own gradient rather than
                      relying on the image being conveniently dark. */}
                  <span
                    className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4"
                    style={{
                      background: 'linear-gradient(to top, rgba(8,6,4,0.82), rgba(8,6,4,0))',
                      paddingTop: '2.5rem',
                    }}
                  >
                    <span className="h3" style={{ color: '#fff' }}>
                      {c.label}
                    </span>
                    <Icon
                      name="arrowRight"
                      size={17}
                      style={{ color: '#fff' }}
                      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ═══ FEATURED ═══════════════════════════════════════════════════════ */}
      {state !== 'error' && (
        <section className="page py-16">
          <Section>
            <div className="flex items-end justify-between gap-6 mb-9">
              <div>
                <p className="eyebrow mb-2">Ready to wear</p>
                <h2 className="h1">Featured pieces</h2>
              </div>
              <Link to="/shop" className="link no-underline hidden sm:inline-flex items-center gap-1.5 text-sm font-medium">
                See everything
                <Icon name="arrowRight" size={16} />
              </Link>
            </div>
          </Section>

          {state === 'loading' ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
                  <div className="skeleton mt-3.5" style={{ height: 12, width: '40%' }} />
                  <div className="skeleton mt-2" style={{ height: 18, width: '75%' }} />
                </div>
              ))}
            </div>
          ) : featured.length === 0 ? (
            <div className="well p-10 text-center">
              <Mark size={40} className="mx-auto opacity-60" />
              <p className="h3 mt-4">Nothing is featured just yet.</p>
              <p className="text-sm text-ink-2 mt-1.5">The full collection is still open.</p>
              <Link to="/shop" className="btn btn-outline btn-sm mt-5 no-underline">
                Browse the shop
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
              {featured.slice(0, 3).map((p, i) => (
                <ProductCard key={p.id} product={p} priority={i < 2} />
              ))}
            </div>
          )}

          <Link to="/shop" className="btn btn-outline btn-block mt-9 sm:hidden no-underline">
            See everything
          </Link>
        </section>
      )}

      {/* ═══ HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section className="page pb-16">
        <Rule className="mb-14" />
        <Section>
          <div className="grid sm:grid-cols-3 gap-10">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <span className="numeric eyebrow" style={{ color: 'var(--accent)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon name={s.icon} size={26} className="text-ink mt-4" />
                <h3 className="h3 mt-4">{s.title}</h3>
                <p className="text-sm text-ink-2 mt-2" style={{ maxWidth: '32ch' }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </Section>
      </section>

      {/* ═══ CUSTOM CTA ═════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--ink)', color: 'var(--bg)' }}>
        <div className="page py-20 text-center">
          <p className="eyebrow" style={{ color: 'var(--gold)' }}>
            One of one
          </p>
          <h2 className="h1 mt-3" style={{ color: 'var(--bg)' }}>
            Have a colour in mind?
          </h2>
          <p className="mt-4 mx-auto text-sm" style={{ color: 'var(--bg)', opacity: 0.75, maxWidth: '44ch' }}>
            Pick the beads, the colour and the charms. We will confirm the price with you
            on WhatsApp before anything is made.
          </p>
          <Link
            to="/custom"
            className="btn mt-8 no-underline"
            style={{ background: 'var(--bg)', color: 'var(--ink)' }}
          >
            Start designing
            <Icon name="arrowRight" size={17} />
          </Link>
        </div>
      </section>
    </>
  )
}
