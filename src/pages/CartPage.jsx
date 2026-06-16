import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { fmt } from '../lib/utils'

export default function CartPage() {
  const { items, remove, updateQty, total } = useCart()
  const nav = useNavigate()

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6">
        <p className="font-serif text-3xl" style={{ color: 'var(--tx)' }}>Your cart is empty</p>
        <p className="text-sm" style={{ color: 'var(--tx2)' }}>Add some pieces and come back.</p>
        <Link to="/shop" className="btn-gold mt-2">Browse Shop</Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">Your selection</p>
        <h1 className="section-title">Cart</h1>
      </div>

      <div className="flex flex-col gap-3 mb-8">
        {items.map(item => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 rounded-2xl"
            style={{ background: 'var(--surf)', border: '1px solid var(--bd)' }}
          >
            {/* Image */}
            <div
              className="flex-shrink-0 rounded-xl overflow-hidden flex items-center justify-center"
              style={{ width: 60, height: 60, background: 'var(--surf2)', flexShrink: 0 }}
            >
              {item.images?.[0]
                ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                : <span style={{ fontSize: 24 }}>📿</span>
              }
            </div>

            {/* Info + controls */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{item.name}</p>
                <p className="text-xs capitalize" style={{ color: 'var(--tx2)' }}>{item.category}</p>
              </div>
              <div className="flex items-center justify-between gap-2">
                {/* Qty */}
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
                  <button
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="px-3 py-2 text-sm font-bold"
                    style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                  >−</button>
                  <span className="px-3 py-2 text-sm font-semibold" style={{ color: 'var(--tx)', background: 'var(--surf)' }}>
                    {item.qty}
                  </span>
                  <button
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="px-3 py-2 text-sm font-bold"
                    style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                  >+</button>
                </div>
                {/* Subtotal + remove */}
                <div className="text-right">
                  <p className="font-serif text-base font-bold" style={{ color: 'var(--tx)' }}>
                    {fmt(item.price * item.qty)}
                  </p>
                  <button
                    onClick={() => remove(item.id)}
                    className="text-xs transition-colors"
                    style={{ background: 'none', border: 'none', color: 'var(--tx2)' }}
                    onMouseEnter={e => e.target.style.color = 'var(--pink)'}
                    onMouseLeave={e => e.target.style.color = 'var(--tx2)'}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="card p-6">
        <div className="flex justify-between mb-2">
          <span className="text-sm" style={{ color: 'var(--tx2)' }}>Subtotal</span>
          <span className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{fmt(total)}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-sm" style={{ color: 'var(--tx2)' }}>Delivery</span>
          <span className="text-sm" style={{ color: 'var(--tx2)' }}>Arranged after order</span>
        </div>
        <div className="flex justify-between mb-6 pb-4" style={{ borderTop: '1px solid var(--bd)', paddingTop: 16 }}>
          <span className="font-semibold" style={{ color: 'var(--tx)' }}>Total</span>
          <span className="font-serif text-xl font-bold" style={{ color: 'var(--tx)' }}>{fmt(total)}</span>
        </div>
        <button className="btn-gold w-full" onClick={() => nav('/checkout')}>
          Proceed to Checkout
        </button>
        <Link to="/shop" className="btn-outline w-full mt-2 text-center no-underline block">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}