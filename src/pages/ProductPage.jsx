import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../context/CartContext'
import { fmt, cap } from '../lib/utils'
import { useToast, ToastContainer } from '../components/Toast'

export default function ProductPage() {
  const { id } = useParams()
  const nav = useNavigate()
  const cart = useCart()
  const { toasts, toast } = useToast()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [qty, setQty] = useState(1)

  useEffect(() => {
    supabase.from('products').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) nav('/shop')
        else { setProduct(data); setLoading(false) }
      })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm" style={{ color: 'var(--tx2)' }}>Loading…</div>
      </div>
    )
  }

  const images = product.images?.length ? product.images : [null]

  const handleAdd = () => {
    cart.add(product, qty)
    toast(`${qty}× ${product.name} added to cart!`)
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24">
      <ToastContainer toasts={toasts} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs mb-8" style={{ color: 'var(--tx2)' }}>
        <Link to="/shop" style={{ color: 'var(--tx2)', textDecoration: 'none' }}>Shop</Link>
        <span>/</span>
        <span className="capitalize">{product.category}</span>
        <span>/</span>
        <span style={{ color: 'var(--tx)' }}>{product.name}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        {/* Images */}
        <div>
          {/* Main image */}
          <div
            className="rounded-2xl overflow-hidden mb-3 flex items-center justify-center"
            style={{ aspectRatio: '1', background: 'var(--surf2)' }}
          >
            {images[activeImg] ? (
              <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <svg width="100" height="100" viewBox="0 0 80 80" opacity="0.4">
                <line x1="22" y1="32" x2="40" y2="20" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="58" y1="32" x2="40" y2="20" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="15" y1="48" x2="22" y2="32" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="65" y1="48" x2="58" y2="32" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="40" y1="58" x2="15" y2="48" stroke="var(--tx2)" strokeWidth="1"/>
                <line x1="40" y1="58" x2="65" y2="48" stroke="var(--tx2)" strokeWidth="1"/>
                <circle cx="40" cy="20" r="8" fill="var(--gold)"/>
                <circle cx="22" cy="32" r="6" fill="var(--pink)"/>
                <circle cx="58" cy="32" r="6" fill="var(--pink)"/>
                <circle cx="15" cy="48" r="5" fill="var(--tx)" opacity="0.4"/>
                <circle cx="65" cy="48" r="5" fill="var(--tx)" opacity="0.4"/>
                <circle cx="40" cy="58" r="9" fill="var(--gold)"/>
              </svg>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{
                    width: 64, height: 64,
                    background: 'var(--surf2)',
                    border: `2px solid ${i === activeImg ? 'var(--gold)' : 'transparent'}`,
                    padding: 0,
                  }}
                >
                  {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col">
          <p className="section-eyebrow mb-1">{cap(product.category)}</p>
          <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--tx)' }}>
            {product.name}
          </h1>
          <p className="font-serif text-4xl font-bold mb-6" style={{ color: 'var(--tx)' }}>
            {fmt(product.price)}
          </p>

          {product.description && (
            <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--tx2)' }}>
              {product.description}
            </p>
          )}

          {product.available ? (
            <>
              {/* Qty */}
              <div className="flex items-center gap-3 mb-5">
                <label className="label mb-0">Qty</label>
                <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="px-4 py-2 text-sm font-bold transition-colors"
                    style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                  >−</button>
                  <span className="px-5 py-2 text-sm font-semibold" style={{ color: 'var(--tx)', background: 'var(--surf)' }}>{qty}</span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="px-4 py-2 text-sm font-bold transition-colors"
                    style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                  >+</button>
                </div>
              </div>

              <button className="btn-gold w-full mb-3 text-sm" onClick={handleAdd}>
                Add to Cart
              </button>
              <button className="btn-outline w-full text-sm" onClick={() => { handleAdd(); nav('/cart') }}>
                Buy Now
              </button>
            </>
          ) : (
            <div
              className="rounded-xl px-4 py-3 text-sm font-semibold text-center"
              style={{ background: 'var(--surf2)', color: 'var(--tx2)' }}
            >
              Currently out of stock
            </div>
          )}

          {/* Free delivery note */}
          <p className="text-xs mt-5" style={{ color: 'var(--tx2)' }}>
            🚚 Delivery arranged after order confirmation
          </p>
        </div>
      </div>
    </div>
  )
}
