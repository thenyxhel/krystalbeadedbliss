import { useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmt, cap } from '../lib/utils'

export default function ProductCard({ product, onAdded }) {
  const nav  = useNavigate()
  const cart = useCart()

  const image = product.images?.[0] || null

  const handleAdd = (e) => {
    e.stopPropagation()
    cart.add(product)
    onAdded?.()
  }

  return (
    <div className="card overflow-hidden" onClick={() => nav(`/product/${product.id}`)}>
      {/* Image */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '1', background: 'var(--surf2)' }}
      >
        {image
          ? <img src={image} alt={product.name} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex items-center justify-center">
              <svg width="72" height="72" viewBox="0 0 80 80" opacity="0.5">
                <line x1="22" y1="32" x2="40" y2="20" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="58" y1="32" x2="40" y2="20" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="15" y1="48" x2="22" y2="32" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="65" y1="48" x2="58" y2="32" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="40" y1="58" x2="15" y2="48" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="40" y1="58" x2="65" y2="48" stroke="var(--tx2)" strokeWidth="1"/>
                <circle cx="40" cy="20" r="8"  fill="var(--gold)"/>
                <circle cx="22" cy="32" r="6"  fill="var(--pink)"/>
                <circle cx="58" cy="32" r="6"  fill="var(--pink)"/>
                <circle cx="15" cy="48" r="5"  fill="var(--tx)" opacity="0.4"/>
                <circle cx="65" cy="48" r="5"  fill="var(--tx)" opacity="0.4"/>
                <circle cx="40" cy="58" r="9"  fill="var(--gold)"/>
              </svg>
            </div>
          )
        }

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          {product.featured && <span className="badge">Featured</span>}
          {!product.available && <span className="badge-pink">Sold Out</span>}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 sm:p-4">
        <p className="section-eyebrow text-xs mb-1">{cap(product.category)}</p>
        <h3 className="font-serif text-lg font-semibold leading-snug mb-1" style={{ color: 'var(--tx)' }}>
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs leading-relaxed mb-2 hidden sm:block" style={{ color: 'var(--tx2)' }}>
            {product.description.length > 80
              ? product.description.slice(0, 80) + '…'
              : product.description}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-serif text-lg font-bold flex-shrink-0" style={{ color: 'var(--tx)' }}>
            {fmt(product.price)}
          </span>
          <button
            className="btn-gold text-xs px-3 py-2 flex-shrink-0"
            style={{ fontSize: 11 }}
            onClick={handleAdd}
            disabled={!product.available}
          >
            {product.available ? 'Add to Cart' : 'Sold Out'}
          </button>
        </div>
      </div>
    </div>
  )
}