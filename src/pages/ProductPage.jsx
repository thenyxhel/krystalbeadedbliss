import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { useToast } from '../components/Toast'
import { useSeo } from '../lib/useSeo'
import { fmt, clamp } from '../lib/utils'
import { categoryLabel, CONFIG } from '../lib/config'
import Icon from '../components/Icon'
import Rule from '../components/Rule'
import ReviewSection from '../components/ReviewSection'
import ProductCard from '../components/ProductCard'
import { Mark } from '../components/Brand'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const COLUMNS = 'id, slug, name, category, description, price, stock, images, available, featured, created_at'

/** Product structured data — this is what puts a price in a Google result. */
function StructuredData({ product }) {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      description: product.description ?? undefined,
      image: product.images ?? undefined,
      brand: { '@type': 'Brand', name: CONFIG.name },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'NGN',
        price: product.price,
        availability:
          product.available && product.stock > 0
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
      },
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [product])

  return null
}

export default function ProductPage() {
  const { handle } = useParams()
  const navigate = useNavigate()
  const cart = useCart()
  const { toast } = useToast()

  const [product, setProduct] = useState(null)
  const [related, setRelated] = useState([])
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [activeImage, setActiveImage] = useState(0)
  const [qty, setQty] = useState(1)

  useSeo({
    title: product?.name,
    description: product?.description
      ? clamp(product.description, 155)
      : product
        ? `${product.name} — hand-strung ${categoryLabel(product.category).toLowerCase()} from ${CONFIG.city}.`
        : undefined,
  })

  useEffect(() => {
    let cancelled = false
    setState('loading')
    setActiveImage(0)
    setQty(1)

    const run = async () => {
      // A product is addressable by its readable slug or its raw id, so old
      // bookmarks made before slugs existed keep working.
      const column = UUID.test(handle) ? 'id' : 'slug'
      const { data, error } = await supabase.from('products').select(COLUMNS).eq(column, handle).maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('[KBB] product query:', error)
        setState('error')
        return
      }
      if (!data) {
        // Previously any failure here bounced the visitor to /shop with no
        // explanation, which made a broken link indistinguishable from a
        // network blip.
        setState('missing')
        return
      }

      setProduct(data)
      setState('ready')

      const { data: more } = await supabase
        .from('products')
        .select(COLUMNS)
        .eq('category', data.category)
        .eq('available', true)
        .gt('stock', 0)
        .neq('id', data.id)
        .limit(3)

      if (!cancelled) setRelated(more ?? [])
    }

    run()
    return () => {
      cancelled = true
    }
  }, [handle])

  if (state === 'loading') {
    return (
      <div className="page py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
          <div className="flex flex-col gap-4 pt-4">
            <div className="skeleton" style={{ height: 14, width: '25%' }} />
            <div className="skeleton" style={{ height: 38, width: '80%' }} />
            <div className="skeleton" style={{ height: 28, width: '35%' }} />
            <div className="skeleton" style={{ height: 80 }} />
          </div>
        </div>
      </div>
    )
  }

  if (state === 'missing' || state === 'error') {
    return (
      <div className="page-narrow py-24 text-center">
        <Mark size={44} className="mx-auto opacity-60" />
        <h1 className="h1 mt-6">
          {state === 'missing' ? 'This piece is no longer here.' : 'We could not load this piece.'}
        </h1>
        <p className="text-ink-2 mt-3">
          {state === 'missing'
            ? 'It may have sold and been retired. The rest of the collection is still open.'
            : 'Something went wrong on our side. Please try again.'}
        </p>
        <div className="flex gap-2 justify-center mt-7">
          <Link to="/shop" className="btn btn-primary no-underline">
            Browse the collection
          </Link>
          {state === 'error' && (
            <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>
              Try again
            </button>
          )}
        </div>
      </div>
    )
  }

  const images = product.images?.length ? product.images : []
  const soldOut = !product.available || product.stock <= 0
  const ceiling = Math.min(20, product.stock)

  const addToCart = (thenGoToCart = false) => {
    cart.add(product, qty)
    toast(`${qty} × ${product.name} added to your cart.`)
    if (thenGoToCart) navigate('/cart')
  }

  return (
    <div className="page py-8">
      <StructuredData product={product} />

      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex items-center gap-2 meta list-none p-0 m-0 flex-wrap">
          <li>
            <Link to="/shop" className="link-quiet no-underline">
              Shop
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to={`/shop?category=${product.category}`} className="link-quiet no-underline">
              {categoryLabel(product.category)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-ink">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
        {/* ── Gallery ─────────────────────────────────────────────────────── */}
        <div>
          <div className="frame">
            {images[activeImage] ? (
              <img
                src={images[activeImage]}
                alt={`${product.name} — view ${activeImage + 1} of ${images.length}`}
                width="1000"
                height="1250"
                fetchpriority="high"
                decoding="async"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center opacity-40">
                <Mark size={56} />
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1" role="group" aria-label="Product images">
              {images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === activeImage}
                  className="frame frame-square flex-shrink-0"
                  style={{
                    width: 68,
                    padding: 0,
                    border: `2px solid ${i === activeImage ? 'var(--accent)' : 'transparent'}`,
                  }}
                >
                  <img src={img} alt="" loading="lazy" decoding="async" width="136" height="136" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Detail ──────────────────────────────────────────────────────── */}
        <div>
          <p className="eyebrow">{categoryLabel(product.category)}</p>
          <h1 className="h1 mt-2">{product.name}</h1>

          <p className="numeric font-display mt-5" style={{ fontSize: '2rem', color: 'var(--gold)', fontWeight: 500 }}>
            {fmt(product.price)}
          </p>

          {product.description && (
            <p className="text-ink-2 mt-6" style={{ maxWidth: 'var(--measure)' }}>
              {product.description}
            </p>
          )}

          <hr className="hairline my-8" />

          {soldOut ? (
            <div className="well p-5">
              <p className="font-medium text-ink">This piece is sold out.</p>
              <p className="text-sm text-ink-2 mt-1">
                Most pieces can be remade. Design a near-identical one, or message us.
              </p>
              <Link to="/custom" className="btn btn-outline btn-sm mt-4 no-underline">
                Design something similar
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center" style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ borderRadius: 0 }}
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Decrease quantity"
                  >
                    <Icon name="minus" size={16} />
                  </button>
                  <span className="numeric px-4 text-sm font-semibold" aria-live="polite" aria-label={`Quantity ${qty}`}>
                    {qty}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ borderRadius: 0 }}
                    onClick={() => setQty((q) => Math.min(ceiling, q + 1))}
                    disabled={qty >= ceiling}
                    aria-label="Increase quantity"
                  >
                    <Icon name="plus" size={16} />
                  </button>
                </div>

                {product.stock <= 3 && (
                  <p className="text-sm" style={{ color: 'var(--warn)' }}>
                    Only {product.stock} left
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
                <button type="button" className="btn btn-primary flex-1" onClick={() => addToCart(false)}>
                  Add to cart
                </button>
                <button type="button" className="btn btn-outline flex-1" onClick={() => addToCart(true)}>
                  Buy it now
                </button>
              </div>
            </>
          )}

          <ul className="list-none p-0 mt-8 flex flex-col gap-3">
            <li className="flex gap-3 text-sm text-ink-2">
              <Icon name="package" size={18} className="text-ink-3" />
              Strung by hand after you order — usually ready within a day.
            </li>
            <li className="flex gap-3 text-sm text-ink-2">
              <Icon name="truck" size={18} className="text-ink-3" />
              {CONFIG.delivery.note}
            </li>
            <li className="flex gap-3 text-sm text-ink-2">
              <Icon name="chat" size={18} className="text-ink-3" />
              Questions about sizing or colour? Message us before you buy.
            </li>
          </ul>
        </div>
      </div>

      <ReviewSection productId={product.id} productName={product.name} />

      {related.length > 0 && (
        <section className="mt-20">
          <Rule className="mb-12" />
          <h2 className="h2 mb-8">More {categoryLabel(product.category).toLowerCase()}</h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
