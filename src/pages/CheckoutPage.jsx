import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { CONFIG, bankConfigured } from '../lib/config'
import { useSeo } from '../lib/useSeo'
import { fmt, friendlyError, receiptPath } from '../lib/utils'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon'
import { Mark } from '../components/Brand'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const STEPS = ['Your details', 'Payment']

/**
 * Defined at module scope on purpose. Declaring a component inside another
 * component gives it a new identity on every render, so React unmounts and
 * remounts the <input> it wraps — which drops focus after each keystroke.
 */
function Field({ id, label, hint, error, showError, children }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {showError && error ? (
        <p className="error-text mt-1.5" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="help">{hint}</p>
      ) : null}
    </div>
  )
}

export default function CheckoutPage() {
  const { items, subtotal, clear, serverLines } = useCart()
  const navigate = useNavigate()
  const { toast } = useToast()

  useSeo({ title: 'Checkout', noindex: true })

  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [touched, setTouched] = useState({})
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    state: '',
    notes: '',
  })

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const blur = (key) => setTouched((t) => ({ ...t, [key]: true }))

  // Client-side validation exists to be *helpful*, not to be trusted. The same
  // rules are enforced again inside place_order().
  const errors = {
    name: form.name.trim().length < 2 ? 'Please enter your full name.' : null,
    email: !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) ? 'Please enter a valid email address.' : null,
    phone: form.phone.replace(/\D/g, '').length < 10 ? 'Please enter a valid phone number.' : null,
    address: form.address.trim().length < 8 ? 'Please give a complete address.' : null,
    state: form.state.trim().length < 2 ? 'Please enter your state.' : null,
  }
  const detailsValid = Object.values(errors).every((e) => e === null)

  if (items.length === 0 && !submitting) {
    return (
      <div className="page-narrow py-24 text-center">
        <Mark size={44} className="mx-auto opacity-60" />
        <h1 className="h1 mt-6">There is nothing to check out.</h1>
        <Link to="/shop" className="btn btn-primary mt-7 no-underline">
          Browse the collection
        </Link>
      </div>
    )
  }

  const pickReceipt = (file) => {
    setError('')
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      setError('Please upload a JPG, PNG, WebP or PDF.')
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      setError('That file is larger than 5MB. Please upload a smaller one.')
      return
    }
    setReceipt(file)
  }

  const submit = async () => {
    if (!receipt) {
      setError('Please upload your payment receipt.')
      return
    }
    setSubmitting(true)
    setError('')

    // 1. The receipt goes to a private bucket under an unguessable name.
    //    The old code named it after the order number in a *public* bucket,
    //    so anyone who guessed six characters could read a stranger's
    //    bank receipt.
    const path = receiptPath(receipt)
    const { error: uploadError } = await supabase.storage
      .from('payment-receipts')
      .upload(path, receipt, { contentType: receipt.type, upsert: false })

    if (uploadError) {
      setSubmitting(false)
      setError(friendlyError(uploadError, 'We could not upload your receipt. Please try again.'))
      return
    }

    // 2. The server prices the order. We send ids and quantities — no money.
    const { data, error: orderError } = await supabase.rpc('place_order', {
      p_customer_name: form.name,
      p_email: form.email,
      p_phone: form.phone,
      p_address: form.address,
      p_state: form.state,
      p_items: serverLines(),
      p_receipt_path: path,
      p_notes: form.notes || null,
    })

    if (orderError) {
      setSubmitting(false)
      setError(friendlyError(orderError, 'We could not place your order. Please try again.'))
      return
    }

    const placed = Array.isArray(data) ? data[0] : data
    clear()
    navigate('/order-confirmation', {
      replace: true,
      state: {
        orderNumber: placed.order_number,
        total: placed.total,
        customerName: form.name,
        isCustom: false,
      },
    })
  }

  return (
    <div className="page py-10">
      <header className="mb-8">
        <p className="eyebrow mb-2">Almost there</p>
        <h1 className="h1">Checkout</h1>
      </header>

      {/* Progress — two steps, stated plainly. */}
      <ol className="flex items-center gap-3 mb-10 list-none p-0 m-0">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-3">
            <span
              className="numeric flex items-center justify-center text-xs font-bold"
              style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                background: i <= step ? 'var(--ink)' : 'transparent',
                color: i <= step ? 'var(--bg)' : 'var(--ink-3)',
                border: `1px solid ${i <= step ? 'var(--ink)' : 'var(--line-strong)'}`,
              }}
            >
              {i + 1}
            </span>
            <span className="text-sm" style={{ color: i <= step ? 'var(--ink)' : 'var(--ink-3)' }} aria-current={i === step ? 'step' : undefined}>
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="w-8 h-px" style={{ background: 'var(--line-strong)' }} />}
          </li>
        ))}
      </ol>

      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          {step === 0 && (
            <div className="card p-6 sm:p-7 animate-fade">
              <h2 className="h3 mb-6">Where are we sending it?</h2>

              <div className="flex flex-col gap-5">
                <Field id="name" error={errors.name} showError={touched.name} label="Full name">
                  <input
                    id="name"
                    className="field"
                    autoComplete="name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    onBlur={() => blur('name')}
                    aria-invalid={touched.name && !!errors.name}
                    aria-describedby={touched.name && errors.name ? 'name-error' : undefined}
                  />
                </Field>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field id="email" error={errors.email} showError={touched.email} label="Email" hint="For your receipt.">
                    <input
                      id="email"
                      type="email"
                      inputMode="email"
                      className="field"
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      onBlur={() => blur('email')}
                      aria-invalid={touched.email && !!errors.email}
                    />
                  </Field>

                  <Field id="phone" error={errors.phone} showError={touched.phone} label="WhatsApp number" hint="This is how we confirm your order.">
                    <input
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      className="field"
                      autoComplete="tel"
                      placeholder="0801 234 5678"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      onBlur={() => blur('phone')}
                      aria-invalid={touched.phone && !!errors.phone}
                    />
                  </Field>
                </div>

                <Field id="address" error={errors.address} showError={touched.address} label="Delivery address">
                  <textarea
                    id="address"
                    className="field"
                    rows={2}
                    style={{ resize: 'vertical' }}
                    autoComplete="street-address"
                    placeholder="House number, street, area"
                    value={form.address}
                    onChange={(e) => set('address', e.target.value)}
                    onBlur={() => blur('address')}
                    aria-invalid={touched.address && !!errors.address}
                  />
                </Field>

                <Field id="state" error={errors.state} showError={touched.state} label="State">
                  <input
                    id="state"
                    className="field"
                    autoComplete="address-level1"
                    placeholder="Lagos"
                    value={form.state}
                    onChange={(e) => set('state', e.target.value)}
                    onBlur={() => blur('state')}
                    aria-invalid={touched.state && !!errors.state}
                  />
                </Field>

                <Field id="notes" label="Anything we should know? (optional)">
                  <textarea
                    id="notes"
                    className="field"
                    rows={2}
                    style={{ resize: 'vertical' }}
                    placeholder="Wrist size, a gift note, delivery timing…"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                  />
                </Field>
              </div>

              <button
                type="button"
                className="btn btn-primary btn-block mt-7"
                disabled={!detailsValid}
                onClick={() => {
                  setTouched({ name: true, email: true, phone: true, address: true, state: true })
                  if (detailsValid) setStep(1)
                }}
              >
                Continue to payment
                <Icon name="arrowRight" size={17} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="card p-6 sm:p-7 animate-fade">
              <button type="button" className="btn btn-ghost btn-sm mb-5" style={{ marginLeft: '-0.5rem' }} onClick={() => setStep(0)}>
                <Icon name="arrowLeft" size={15} />
                Edit details
              </button>

              <h2 className="h3 mb-2">Pay by bank transfer</h2>
              <p className="text-sm text-ink-2 mb-6">
                Send <span className="numeric font-semibold text-ink">{fmt(subtotal)}</span> to the
                account below, then upload the receipt. We confirm on WhatsApp once the payment
                lands.
              </p>

              {bankConfigured ? (
                <dl className="well p-5 m-0">
                  {[
                    ['Bank', CONFIG.bank.name],
                    ['Account name', CONFIG.bank.accountName],
                    ['Account number', CONFIG.bank.accountNumber],
                    ['Amount', fmt(subtotal)],
                  ].map(([key, value], i, arr) => (
                    <div
                      key={key}
                      className="flex justify-between items-center gap-4 py-2.5"
                      style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}
                    >
                      <dt className="text-sm text-ink-2">{key}</dt>
                      <dd className="numeric text-sm font-semibold m-0 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="well p-5" style={{ borderColor: 'var(--bad)' }}>
                  <p className="text-sm" style={{ color: 'var(--bad)' }}>
                    Bank details are not configured. Set VITE_BANK_NAME, VITE_BANK_ACCOUNT_NAME and
                    VITE_BANK_ACCOUNT_NUMBER in your environment.
                  </p>
                </div>
              )}

              <div className="mt-6">
                <span className="label">Payment receipt</span>
                <label
                  className="flex flex-col items-center justify-center gap-2 py-9 px-4 text-center cursor-pointer"
                  style={{
                    border: `1.5px dashed ${receipt ? 'var(--accent)' : 'var(--line-strong)'}`,
                    borderRadius: 'var(--r-md)',
                    background: receipt ? 'var(--accent-wash)' : 'var(--surface-2)',
                  }}
                >
                  <Icon name={receipt ? 'check' : 'upload'} size={22} className={receipt ? 'text-accent' : 'text-ink-3'} />
                  <span className="text-sm font-medium text-ink">
                    {receipt ? receipt.name : 'Choose a file or take a photo'}
                  </span>
                  <span className="help m-0">JPG, PNG, WebP or PDF · up to 5MB</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="sr-only"
                    onChange={(e) => pickReceipt(e.target.files?.[0])}
                  />
                </label>
                <p className="help">
                  Your receipt is stored privately and is only ever seen by us.
                </p>
              </div>

              {error && (
                <p className="error-text mt-4 flex items-start gap-2" role="alert">
                  <Icon name="alert" size={16} style={{ marginTop: 2 }} />
                  {error}
                </p>
              )}

              <button
                type="button"
                className="btn btn-primary btn-block mt-6"
                onClick={submit}
                disabled={submitting || !receipt || !bankConfigured}
              >
                {submitting ? (
                  <>
                    <Icon name="spinner" size={17} className="animate-spin" />
                    Placing your order…
                  </>
                ) : (
                  'Place order'
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Summary ───────────────────────────────────────────────────────── */}
        <aside className="lg:col-span-5">
          <div className="card p-6 lg:sticky" style={{ top: 88 }}>
            <h2 className="h3 mb-5">Your order</h2>

            <ul className="list-none p-0 m-0 flex flex-col gap-4">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3 items-center">
                  <div className="frame frame-square flex-shrink-0" style={{ width: 46 }}>
                    {item.image ? (
                      <img src={item.image} alt="" loading="lazy" width="92" height="92" />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center opacity-40">
                        <Mark size={18} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="meta numeric">× {item.qty}</p>
                  </div>
                  <p className="numeric text-sm font-semibold">{fmt(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>

            <hr className="hairline my-5" />

            <div className="flex justify-between text-sm py-1">
              <span className="text-ink-2">Subtotal</span>
              <span className="numeric font-semibold">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm py-1">
              <span className="text-ink-2">Delivery</span>
              <span className="text-ink-3">Arranged after confirmation</span>
            </div>

            <hr className="hairline my-4" />

            <div className="flex justify-between items-baseline">
              <span className="font-semibold">Total</span>
              <span className="numeric font-display" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
                {fmt(subtotal)}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
