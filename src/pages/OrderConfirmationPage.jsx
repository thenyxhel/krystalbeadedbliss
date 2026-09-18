import { Link, Navigate, useLocation } from 'react-router-dom'
import { whatsappLink } from '../lib/config'
import { useSeo } from '../lib/useSeo'
import { fmt } from '../lib/utils'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon'
import Rule from '../components/Rule'

export default function OrderConfirmationPage() {
  const { state } = useLocation()
  const { toast } = useToast()

  useSeo({ title: 'Order placed', noindex: true })

  // Arriving here directly (a refresh, a bookmark) means there is no order in
  // history to show. Send them somewhere useful rather than rendering a page
  // about an order that does not exist.
  if (!state?.orderNumber) {
    return <Navigate to="/track" replace />
  }

  const { orderNumber, isCustom, customerName, total, estimatedPrice, summary } = state
  const firstName = customerName?.trim().split(/\s+/)[0]

  // The custom summary used to read `summary.beadType`, singular, while the
  // builder wrote `beadTypes`, an array — so every custom order's WhatsApp
  // message said "Bead: undefined".
  const beads = Array.isArray(summary?.beadTypes) ? summary.beadTypes.join(', ') : null

  const message = isCustom
    ? `Hi! I just placed custom order ${orderNumber}.` +
      (summary?.pieceType ? ` Piece: ${summary.pieceType}.` : '') +
      (beads ? ` Beads: ${beads}.` : '') +
      (summary?.color ? ` Colour: ${summary.color}.` : '') +
      ' Please confirm the details.'
    : `Hi! I just placed order ${orderNumber} for ${fmt(total)} and uploaded my receipt. Please confirm.`

  const wa = whatsappLink(message)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber)
      toast('Order number copied.')
    } catch {
      toast('Could not copy — please write it down.', 'warn')
    }
  }

  return (
    <div className="page-narrow py-14 text-center">
      <span
        className="inline-flex items-center justify-center mb-6"
        style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent-wash)' }}
      >
        <Icon name="check" size={26} className="text-accent" />
      </span>

      <p className="eyebrow mb-3">Order placed</p>
      <h1 className="h1">{firstName ? `Thank you, ${firstName}.` : 'Thank you.'}</h1>

      <p className="text-ink-2 mt-4 mx-auto" style={{ maxWidth: '46ch' }}>
        {isCustom
          ? 'We have your design. We will message you on WhatsApp to confirm the details and the final price before anything is made.'
          : 'We have your order and your receipt. We will confirm on WhatsApp as soon as the payment is verified.'}
      </p>

      <Rule className="my-10" />

      <div className="card p-7">
        <p className="eyebrow mb-3">Your order number</p>
        <div className="flex items-center justify-center gap-3">
          <p className="numeric font-display" style={{ fontSize: '2rem', fontWeight: 500, color: 'var(--gold)' }}>
            {orderNumber}
          </p>
          <button type="button" onClick={copy} className="btn btn-ghost btn-sm" style={{ padding: '0.5rem' }} aria-label="Copy order number">
            <Icon name="copy" size={17} />
          </button>
        </div>
        <p className="help mt-2">Keep this — it is how you track the order.</p>

        {(total != null || estimatedPrice != null) && (
          <>
            <hr className="hairline my-5" />
            <p className="eyebrow mb-1.5">{isCustom ? 'Estimated price' : 'Total'}</p>
            <p className="numeric font-display" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
              {fmt(isCustom ? estimatedPrice : total)}
            </p>
            {isCustom && <p className="help mt-1">Confirmed with you before we begin.</p>}
          </>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mt-7">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn btn-primary flex-1 no-underline">
            <Icon name="whatsapp" size={17} />
            Message us on WhatsApp
          </a>
        )}
        <Link to="/track" className="btn btn-outline flex-1 no-underline">
          Track this order
        </Link>
      </div>

      <Link to="/shop" className="btn btn-ghost mt-3 no-underline">
        Keep shopping
      </Link>
    </div>
  )
}
