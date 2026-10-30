import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { bankConfigured } from '../lib/config'
import { friendlyError, receiptPath } from '../lib/utils'
import { useToast } from './Toast'
import Icon from './Icon'
import PaymentPanel from './PaymentPanel'

/**
 * Lets someone finish a custom order from the track page — add the delivery
 * details and/or the payment receipt that the order was placed without.
 *
 * It only appears for the parts that are actually missing, and the server
 * (complete_custom_order) refuses to overwrite anything already on file. The
 * email is asked for because an order number alone is too weak a secret to
 * write to an order with.
 */
export default function CompleteOrderPanel({ order, onDone }) {
  const { toast } = useToast()
  const { needs_details: needsDetails, needs_payment: needsPayment } = order

  const [email, setEmail] = useState('')
  const [form, setForm] = useState({ address: '', state: '', isGift: false, recipientName: '', giftNote: '' })
  const [receipt, setReceipt] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  const detailsOk =
    !needsDetails ||
    (form.address.trim().length >= 8 &&
      form.state.trim().length >= 2 &&
      (!form.isGift || form.recipientName.trim().length >= 2))
  const paymentOk = !needsPayment || (!!receipt && bankConfigured)
  const canSubmit = emailOk && detailsOk && paymentOk && !submitting

  const submit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setError('')

    let path = null
    if (needsPayment && receipt) {
      path = receiptPath(receipt)
      const { error: uploadError } = await supabase.storage
        .from('payment-receipts')
        .upload(path, receipt, { contentType: receipt.type, upsert: false })
      if (uploadError) {
        setSubmitting(false)
        setError(friendlyError(uploadError, 'We could not upload your receipt. Please try again.'))
        return
      }
    }

    const { error: rpcError } = await supabase.rpc('complete_custom_order', {
      p_order_number: order.order_number,
      p_email: email,
      p_address: needsDetails ? form.address : null,
      p_state: needsDetails ? form.state : null,
      p_is_gift: needsDetails ? form.isGift : false,
      p_recipient_name: needsDetails && form.isGift ? form.recipientName : null,
      p_gift_note: needsDetails && form.isGift ? form.giftNote || null : null,
      p_receipt_path: path,
    })

    setSubmitting(false)
    if (rpcError) {
      setError(friendlyError(rpcError, 'We could not save that. Please try again.'))
      return
    }

    toast('Thank you — we have it.')
    onDone()
  }

  const parts = [needsDetails ? 'delivery details' : null, needsPayment ? 'payment' : null].filter(Boolean)

  return (
    <form onSubmit={submit} className="well p-5 mt-7" noValidate>
      <p className="font-medium">Finish your order</p>
      <p className="text-sm text-ink-2 mt-1 mb-5">
        This order still needs your {parts.join(' and ')}. Add {parts.length > 1 ? 'them' : 'it'} here and we
        will carry on.
      </p>

      <div className="flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="co-email">
            Email you ordered with
          </label>
          <input
            id="co-email"
            type="email"
            inputMode="email"
            className="field"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <p className="help">We ask so that only you can add to this order.</p>
        </div>

        {needsDetails && (
          <>
            <label
              className="flex items-start gap-3 p-4 cursor-pointer"
              style={{
                border: `1px solid ${form.isGift ? 'var(--accent)' : 'var(--line-strong)'}`,
                borderRadius: 'var(--r-md)',
                background: form.isGift ? 'var(--accent-wash)' : 'transparent',
              }}
            >
              <input type="checkbox" className="mt-1" checked={form.isGift} onChange={(e) => set('isGift', e.target.checked)} />
              <span>
                <span className="block text-sm font-semibold">This is a gift</span>
                <span className="block help m-0">We ship it straight to them, with a note from you inside if you like.</span>
              </span>
            </label>

            {form.isGift && (
              <div>
                <label className="label" htmlFor="co-recipient">
                  Recipient&rsquo;s full name
                </label>
                <input id="co-recipient" className="field" value={form.recipientName} onChange={(e) => set('recipientName', e.target.value)} />
              </div>
            )}

            <div>
              <label className="label" htmlFor="co-address">
                {form.isGift ? "Recipient's delivery address" : 'Delivery address'}
              </label>
              <textarea
                id="co-address"
                className="field"
                rows={2}
                style={{ resize: 'vertical' }}
                autoComplete="street-address"
                placeholder="House number, street, area"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="co-state">
                {form.isGift ? "Recipient's state" : 'State'}
              </label>
              <input id="co-state" className="field" autoComplete="address-level1" placeholder="Lagos" value={form.state} onChange={(e) => set('state', e.target.value)} />
            </div>

            {form.isGift && (
              <div>
                <label className="label" htmlFor="co-giftnote">
                  Note for inside the package (optional)
                </label>
                <textarea
                  id="co-giftnote"
                  className="field"
                  rows={3}
                  maxLength={500}
                  style={{ resize: 'vertical' }}
                  value={form.giftNote}
                  onChange={(e) => set('giftNote', e.target.value)}
                />
              </div>
            )}
          </>
        )}

        {needsPayment && (
          <div>
            <p className="text-sm text-ink-2 mb-4">
              Send the amount below to this account, then upload the receipt.
            </p>
            <PaymentPanel amount={order.estimated_price} receipt={receipt} onReceipt={setReceipt} onError={setError} />
          </div>
        )}
      </div>

      {error && (
        <p className="error-text mt-4 flex items-start gap-2" role="alert">
          <Icon name="alert" size={16} style={{ marginTop: 2 }} />
          {error}
        </p>
      )}

      <button type="submit" className="btn btn-primary btn-block mt-6" disabled={!canSubmit}>
        {submitting ? (
          <>
            <Icon name="spinner" size={17} className="animate-spin" />
            Saving…
          </>
        ) : (
          'Save'
        )}
      </button>
    </form>
  )
}
