import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { fmt, cap } from '../lib/utils'
import { Link } from 'react-router-dom'

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

const STATUS_LABELS = {
  pending:    { label: 'Order Received',    desc: 'We\'ve received your order and are reviewing it.' },
  confirmed:  { label: 'Payment Confirmed', desc: 'Payment verified. Your order is queued for production.' },
  processing: { label: 'Being Made',        desc: 'Your piece is being hand-strung with love.' },
  shipped:    { label: 'On the Way',        desc: 'Your order is on its way to you.' },
  delivered:  { label: 'Delivered',         desc: 'Your order has been delivered. Enjoy!' },
  cancelled:  { label: 'Cancelled',         desc: 'This order was cancelled. Contact us for help.' },
}

export default function TrackOrderPage() {
  const [input, setInput]   = useState('')
  const [order, setOrder]   = useState(null)
  const [loading, setLoad]  = useState(false)
  const [notFound, setNF]   = useState(false)

  const search = async () => {
    const q = input.trim().toUpperCase()
    if (!q) return
    setLoad(true); setOrder(null); setNF(false)

    // Check both orders and custom_orders
    const [{ data: reg }, { data: custom }] = await Promise.all([
      supabase.from('orders').select('*').eq('order_number', q).single(),
      supabase.from('custom_orders').select('*').eq('order_number', q).single(),
    ])

    const found = reg || custom
    if (found) setOrder({ ...found, isCustom: !!custom })
    else setNF(true)
    setLoad(false)
  }

  const stepIndex = order ? STATUS_STEPS.indexOf(order.status) : -1

  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">Where's my order?</p>
        <h1 className="section-title">Track Order</h1>
      </div>

      {/* Search */}
      <div className="card p-6 mb-6">
        <label className="label">Order Number</label>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="e.g. KBB-A3X9PQ"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            className="btn-gold px-5 flex-shrink-0"
            onClick={search}
            disabled={loading || !input.trim()}
          >
            {loading ? '…' : 'Track'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'var(--tx2)' }}>
          Your order number was shown on the confirmation page — format: KBB-XXXXXX
        </p>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="card p-6 text-center">
          <p className="font-serif text-xl mb-1" style={{ color: 'var(--tx)' }}>Order not found</p>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>
            Double-check the number or{' '}
            <a href="#" style={{ color: 'var(--gold)', textDecoration: 'none' }}>contact us on WhatsApp</a>.
          </p>
        </div>
      )}

      {/* Result */}
      {order && (
        <div className="card p-6 animate-fade-up">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--tx2)' }}>
                {order.isCustom ? 'Custom Order' : 'Order'}
              </p>
              <p className="font-serif text-2xl font-bold" style={{ color: 'var(--gold)' }}>
                {order.order_number}
              </p>
            </div>
            <span
              className="text-xs font-bold px-3 py-1.5 rounded-full text-white capitalize"
              style={{ background: order.status === 'cancelled' ? 'var(--pink)' : 'var(--gold)' }}
            >
              {STATUS_LABELS[order.status]?.label || cap(order.status)}
            </span>
          </div>

          {/* Timeline — not shown for cancelled */}
          {order.status !== 'cancelled' && (
            <div className="mb-6">
              <div className="flex items-center justify-between relative">
                {/* Line */}
                <div
                  className="absolute top-3.5 left-0 right-0 h-px"
                  style={{ background: 'var(--bd)', zIndex: 0 }}
                />
                <div
                  className="absolute top-3.5 left-0 h-px transition-all duration-500"
                  style={{
                    background: 'var(--gold)',
                    width: stepIndex < 0 ? '0%' : `${(stepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                    zIndex: 1,
                  }}
                />

                {STATUS_STEPS.map((s, i) => (
                  <div key={s} className="flex flex-col items-center gap-1.5 relative z-10">
                    <div
                      className="rounded-full flex items-center justify-center text-xs font-bold transition-all"
                      style={{
                        width: 28, height: 28,
                        background: i <= stepIndex ? 'var(--gold)' : 'var(--surf2)',
                        color:      i <= stepIndex ? 'white' : 'var(--tx2)',
                        border:     `2px solid ${i <= stepIndex ? 'var(--gold)' : 'var(--bd)'}`,
                      }}
                    >
                      {i < stepIndex ? '✓' : i + 1}
                    </div>
                    <p className="text-xs text-center hidden sm:block" style={{ color: i <= stepIndex ? 'var(--gold)' : 'var(--tx2)', maxWidth: 64 }}>
                      {STATUS_LABELS[s].label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status message */}
          <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surf2)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tx)' }}>
              {STATUS_LABELS[order.status]?.label}
            </p>
            <p className="text-sm" style={{ color: 'var(--tx2)' }}>
              {STATUS_LABELS[order.status]?.desc}
            </p>
          </div>

          {/* Order details */}
          <div className="text-sm" style={{ color: 'var(--tx2)' }}>
            <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
              <span>Customer</span>
              <span className="font-semibold" style={{ color: 'var(--tx)' }}>{order.customer_name}</span>
            </div>
            {order.total && (
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
                <span>Total</span>
                <span className="font-semibold" style={{ color: 'var(--tx)' }}>{fmt(order.total)}</span>
              </div>
            )}
            {order.estimated_price && (
              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
                <span>Estimated Price</span>
                <span className="font-semibold" style={{ color: 'var(--tx)' }}>{fmt(order.estimated_price)}</span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span>Placed</span>
              <span className="font-semibold" style={{ color: 'var(--tx)' }}>
                {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <Link to="/complaint" className="btn-outline flex-1 text-xs text-center no-underline">
              File a Complaint
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
