import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmt } from '../lib/utils'
import { categoryLabel } from '../lib/config'
import Icon from './Icon'
import { Mark } from './Brand'

/**
 * A product card is a link, not a <div onClick>.
 *
 * That one change gives it: keyboard focus, Enter to open, middle-click and
 * ⌘-click to open in a new tab, a real href for Google to crawl, and a status
 * line for screen readers. The Add-to-cart button sits *beside* the link
 * rather than inside it, because a button nested in an anchor is invalid HTML
 * and behaves differently in every browser.
 */
export default function ProductCard({ product, priority = false }) {
  const cart = useCart()
  const [justAdded, setJustAdded] = useState(false)

  const href = `/product/${product.slug || product.id}`
  const image = product.images?.[0] ?? null
  const soldOut = !product.available || product.stock <= 0
  const lowStock = !soldOut && product.stock <= 3

  const handleAdd = () => {
    cart.add(product, 1)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1800)
  }

  return (
    <article className="group flex flex-col">
      <Link to={href} className="frame block no-underline" tabIndex={-1} aria-hidden="true">
        {image ? (
          <img
            src={image}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            width="800"
            height="1000"
            className="group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center opacity-40">
            <Mark size={44} />
          </span>
        )}

        {(soldOut || product.featured) && (
          <span className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
            {soldOut && <span className="badge badge-muted">Sold out</span>}
            {!soldOut && product.featured && <span className="badge badge-accent">Featured</span>}
          </span>
        )}
      </Link>

      <div className="pt-3.5 flex flex-col flex-1">
        <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
          {categoryLabel(product.category)}
        </p>

        <h3 className="h3 mt-1.5">
          <Link to={href} className="no-underline text-ink hover:text-clay transition-colors">
            {product.name}
            {/* Everything a screen reader needs, without cluttering the design. */}
            <span className="sr-only">
              {soldOut ? ' — sold out' : ` — ${fmt(product.price)}`}
            </span>
          </Link>
        </h3>

        {product.description && (
          <p className="text-sm text-ink-3 mt-1.5 line-clamp-2 hidden sm:block">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between gap-3">
          <div>
            <p className="numeric font-display text-lg" style={{ color: 'var(--brass)', fontWeight: 500 }}>
              {fmt(product.price)}
            </p>
            {lowStock && (
              <p className="meta mt-0.5" style={{ color: 'var(--warn)' }}>
                Only {product.stock} left
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className={`btn btn-sm ${justAdded ? 'btn-outline' : 'btn-primary'}`}
            aria-label={soldOut ? `${product.name} is sold out` : `Add ${product.name} to cart`}
          >
            {soldOut ? (
              'Sold out'
            ) : justAdded ? (
              <>
                <Icon name="check" size={15} /> Added
              </>
            ) : (
              'Add'
            )}
          </button>
        </div>
      </div>
    </article>
  )
}
