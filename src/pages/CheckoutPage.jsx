import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { CONFIG } from '../lib/config'
import { fmt, generateOrderNumber } from '../lib/utils'

export default function CheckoutPage() {
  const { items, total, clear } = useCart()
  const nav = useNavigate()

  const [step, setStep]       = useState(0) // 0: details, 1: payment
  const [submitting, setSub]  = useState(false)
  const [error, setError]     = useState('')
  const [receiptFile, setReceipt] = useState(null)

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', state: '', notes: '',
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <p className="font-serif text-2xl" style={{ color: 'var(--tx)' }}>Your cart is empty</p>
        <Link to="/shop" className="btn-gold">Browse Shop</Link>
      </div>
    )
  }

  const detailsValid = form.name && form.email && form.phone && form.address && form.state

  const handleSubmit = async () => {
    if (!receiptFile) { setError('Please upload your payment receipt.'); return }
    setSub(true); setError('')

    const orderNumber = generateOrderNumber()

    // Upload receipt
    const ext  = receiptFile.name.split('.').pop()
    const path = `${orderNumber}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('payment-receipts')
      .upload(path, receiptFile)

    if (upErr) { setError('Receipt upload failed: ' + upErr.message); setSub(false); return }

    const { data: urlData } = supabase.storage.from('payment-receipts').getPublicUrl(path)

    // Insert order
    const { error: ordErr } = await supabase.from('orders').insert({
      order_number:        orderNumber,
      customer_name:       form.name,
      email:               form.email,
      phone:               form.phone,
      address:             form.address,
      state:               form.state,
      items:               items.map(i => ({
        product_id: i.id, name: i.name, price: i.price,
        quantity: i.qty, image: i.images?.[0] || null,
      })),
      subtotal:            total,
      delivery_fee:        CONFIG.delivery.fee,
      total:               total + CONFIG.delivery.fee,
      payment_receipt_url: urlData?.publicUrl || '',
      status:              'pending',
      notes:               form.notes || null,
    })

    if (ordErr) { setError(ordErr.message); setSub(false); return }

    clear()
    nav('/order-confirmation', {
      state: { orderNumber, isCustom: false, customerName: form.name, total }
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-6 pb-24">
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">Almost there</p>
        <h1 className="section-title">Checkout</h1>
      </div>

      <div className="grid md:grid-cols-5 gap-8">
        {/* Form */}
        <div className="md:col-span-3">
          {/* Step 0: Details */}
          {step === 0 && (
            <div className="card p-6">
              <h2 className="font-semibold mb-5" style={{ color: 'var(--tx)' }}>Your details</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={e => set('email', e.target.value)} />
                </div>
                <div>
                  <label className="label">WhatsApp / Phone</label>
                  <input className="input" type="tel" placeholder="08XXXXXXXXX" value={form.phone} onChange={e => set('phone', e.target.value)} />
                </div>
                <div>
                  <label className="label">Delivery Address</label>
                  <textarea className="input resize-none" rows={2} placeholder="House number, street name, area…" value={form.address} onChange={e => set('address', e.target.value)} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" placeholder="Lagos, Abuja…" value={form.state} onChange={e => set('state', e.target.value)} />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <textarea className="input resize-none" rows={2} placeholder="Any special instructions…" value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>

              <button
                className="btn-gold w-full mt-6"
                disabled={!detailsValid}
                onClick={() => setStep(1)}
                style={{ opacity: detailsValid ? 1 : 0.45 }}
              >
                Continue to Payment →
              </button>
            </div>
          )}

          {/* Step 1: Payment */}
          {step === 1 && (
            <div className="card p-6">
              <button
                onClick={() => setStep(0)}
                className="text-xs mb-5 flex items-center gap-1"
                style={{ background: 'none', border: 'none', color: 'var(--tx2)' }}
              >
                ← Edit details
              </button>

              <h2 className="font-semibold mb-2" style={{ color: 'var(--tx)' }}>Bank Transfer</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--tx2)' }}>
                Transfer {fmt(total)} to the account below, then upload your receipt.
              </p>

              {/* Bank details */}
              <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surf2)' }}>
                {[
                  ['Bank',           CONFIG.bank.name],
                  ['Account Name',   CONFIG.bank.accountName],
                  ['Account Number', CONFIG.bank.accountNumber],
                  ['Amount',         fmt(total)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <span className="text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{k}</span>
                    <span className="text-xs font-bold" style={{ color: 'var(--tx)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Receipt upload */}
              <div>
                <label className="label">Upload Payment Receipt</label>
                <label
                  className="flex flex-col items-center justify-center gap-2 rounded-xl py-8 transition-colors"
                  style={{
                    border: `2px dashed ${receiptFile ? 'var(--gold)' : 'var(--bd)'}`,
                    background: receiptFile ? 'var(--goldl)' : 'var(--surf2)',
                  }}
                >
                  <span style={{ fontSize: 28 }}>{receiptFile ? '✅' : '📎'}</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                    {receiptFile ? receiptFile.name : 'Tap to upload receipt'}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--tx2)' }}>JPG, PNG or PDF</span>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => setReceipt(e.target.files[0])}
                  />
                </label>
              </div>

              {error && <p className="text-sm mt-3" style={{ color: 'var(--pink)' }}>{error}</p>}

              <button
                className="btn-gold w-full mt-5"
                onClick={handleSubmit}
                disabled={submitting || !receiptFile}
                style={{ opacity: submitting || !receiptFile ? 0.5 : 1 }}
              >
                {submitting ? 'Placing order…' : 'Confirm Order'}
              </button>
            </div>
          )}
        </div>

        {/* Order summary */}
        <div className="md:col-span-2">
          <div className="card p-5 sticky top-24">
            <h3 className="font-semibold mb-4 text-sm" style={{ color: 'var(--tx)' }}>Order Summary</h3>
            <div className="flex flex-col gap-3 mb-4">
              {items.map(i => (
                <div key={i.id} className="flex gap-3 items-center">
                  <div
                    className="flex-shrink-0 rounded-lg flex items-center justify-center text-base"
                    style={{ width: 40, height: 40, background: 'var(--surf2)' }}
                  >
                    {i.images?.[0]
                      ? <img src={i.images[0]} alt="" className="w-full h-full object-cover rounded-lg" />
                      : '📿'
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--tx)' }}>{i.name}</p>
                    <p className="text-xs" style={{ color: 'var(--tx2)' }}>×{i.qty}</p>
                  </div>
                  <p className="text-xs font-bold flex-shrink-0" style={{ color: 'var(--tx)' }}>{fmt(i.price * i.qty)}</p>
                </div>
              ))}
            </div>
            <div className="pt-3" style={{ borderTop: '1px solid var(--bd)' }}>
              <div className="flex justify-between mb-1">
                <span className="text-xs" style={{ color: 'var(--tx2)' }}>Delivery</span>
                <span className="text-xs" style={{ color: 'var(--tx2)' }}>TBD</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-sm font-bold" style={{ color: 'var(--tx)' }}>Total</span>
                <span className="font-serif text-lg font-bold" style={{ color: 'var(--tx)' }}>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
