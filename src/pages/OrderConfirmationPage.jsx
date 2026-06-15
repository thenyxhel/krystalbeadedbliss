import { useLocation, Link } from 'react-router-dom'
import { whatsappLink } from '../lib/config'
import { fmt } from '../lib/utils'
import BeadDivider from '../components/BeadDivider'

export default function OrderConfirmationPage() {
  const { state } = useLocation()

  if (!state?.orderNumber) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="font-serif text-2xl" style={{ color: 'var(--tx)' }}>No order found</p>
        <Link to="/" className="btn-gold">Go Home</Link>
      </div>
    )
  }

  const { orderNumber, isCustom, customerName, total, estimatedPrice, summary } = state

  const waMessage = isCustom
    ? `Hi! I just placed a custom order — Order #${orderNumber}. Piece: ${summary?.pieceType}, Bead: ${summary?.beadType}, Colour: ${summary?.color}. Please confirm.`
    : `Hi! I just placed order #${orderNumber} for ${fmt(total)}. Please confirm receipt.`

  return (
    <div className="max-w-2xl mx-auto px-6 pb-24 text-center">
      <div className="pt-8 pb-6">
        <div className="text-5xl mb-4">🎉</div>
        <p className="section-eyebrow mb-2">Order placed</p>
        <h1 className="font-serif text-4xl font-semibold mb-3" style={{ color: 'var(--tx)' }}>
          Thank you{customerName ? `, ${customerName.split(' ')[0]}` : ''}!
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
          {isCustom
            ? 'Your custom order has been received. We\'ll reach out via WhatsApp to confirm the details and finalise pricing before production begins.'
            : 'Your order has been placed. We\'ll confirm via WhatsApp once we\'ve verified your payment.'}
        </p>
      </div>

      <BeadDivider className="my-6" />

      {/* Order number */}
      <div className="card p-6 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--tx2)' }}>Your order number</p>
        <p className="font-serif text-3xl font-bold" style={{ color: 'var(--gold)' }}>{orderNumber}</p>
        <p className="text-xs mt-2" style={{ color: 'var(--tx2)' }}>Keep this safe — you'll need it to track your order.</p>

        {isCustom && estimatedPrice && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--bd)' }}>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Estimated price</p>
            <p className="font-serif text-2xl font-bold mt-0.5" style={{ color: 'var(--tx)' }}>{fmt(estimatedPrice)}</p>
          </div>
        )}
        {!isCustom && total && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--bd)' }}>
            <p className="text-xs" style={{ color: 'var(--tx2)' }}>Total paid</p>
            <p className="font-serif text-2xl font-bold mt-0.5" style={{ color: 'var(--tx)' }}>{fmt(total)}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <a href={whatsappLink(waMessage)} target="_blank" rel="noreferrer" className="btn-gold w-full">
          Contact us on WhatsApp
        </a>
        <Link to="/track" className="btn-outline w-full">
          Track this Order
        </Link>
        <Link to="/shop" className="btn-primary w-full">
          Continue Shopping
        </Link>
      </div>
    </div>
  )
}
