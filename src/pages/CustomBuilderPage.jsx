import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateOrderNumber, fmt } from '../lib/utils'
import { CONFIG } from '../lib/config'

const STEPS = ['Piece Type', 'Bead Type', 'Colour', 'Charms', 'Your Details']

const PIECE_TYPES = [
  { key: 'bracelet', label: 'Bracelet', icon: '📿' },
  { key: 'necklace', label: 'Necklace', icon: '💫' },
  { key: 'earrings', label: 'Earrings', icon: '✨' },
]

export default function CustomBuilderPage() {
  const nav = useNavigate()
  const [step, setStep]   = useState(0)
  const [config, setCfg]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    pieceType: '',
    beadType:  '',
    color:     '',
    charms:    [],
    qty:       1,
    notes:     '',
    name:      '',
    email:     '',
    phone:     '',
  })

  useEffect(() => {
    supabase.from('custom_config').select('*').limit(1).single()
      .then(({ data }) => { setCfg(data); setLoading(false) })
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleCharm = (c) => {
    setForm(f => ({
      ...f,
      charms: f.charms.includes(c) ? f.charms.filter(x => x !== c) : [...f.charms, c]
    }))
  }

  const estimatedPrice = () => {
    if (!config || !form.pieceType) return 0
    const base = config.base_prices?.[form.pieceType] || 0
    const beadExtra = config.bead_types?.find(b => b.name === form.beadType)?.price_modifier || 0
    const charmExtra = form.charms.reduce((s, c) => {
      return s + (config.charm_types?.find(x => x.name === c)?.price || 0)
    }, 0)
    return (base + beadExtra + charmExtra) * form.qty
  }

  const canNext = () => {
    if (step === 0) return !!form.pieceType
    if (step === 1) return !!form.beadType
    if (step === 2) return !!form.color
    if (step === 3) return true // charms optional
    if (step === 4) return form.name && form.email && form.phone
    return false
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    const orderNumber = generateOrderNumber()
    const { error: err } = await supabase.from('custom_orders').insert({
      order_number:    orderNumber,
      customer_name:   form.name,
      email:           form.email,
      phone:           form.phone,
      piece_type:      form.pieceType,
      configuration:   {
        bead_type: form.beadType,
        color:     form.color,
        charms:    form.charms,
        quantity:  form.qty,
        notes:     form.notes,
      },
      estimated_price: estimatedPrice(),
      status: 'pending',
    })
    if (err) { setError(err.message); setSubmitting(false); return }

    nav('/order-confirmation', {
      state: {
        orderNumber,
        isCustom: true,
        summary: form,
        estimatedPrice: estimatedPrice(),
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--tx2)' }}>Loading builder…</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 pb-24">
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">One of a kind</p>
        <h1 className="section-title">Build your piece</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-10">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div
              className="flex items-center justify-center text-xs font-bold rounded-full flex-shrink-0"
              style={{
                width: 28, height: 28,
                background: i <= step ? 'var(--gold)' : 'var(--surf2)',
                color: i <= step ? 'white' : 'var(--tx2)',
              }}
            >
              {i < step ? '✓' : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px" style={{ background: i < step ? 'var(--gold)' : 'var(--bd)' }} />
            )}
          </div>
        ))}
      </div>

      <div className="card p-6 mb-6">
        <h2 className="font-semibold text-base mb-5" style={{ color: 'var(--tx)' }}>
          Step {step + 1}: {STEPS[step]}
        </h2>

        {/* Step 0: Piece type */}
        {step === 0 && (
          <div className="grid grid-cols-3 gap-3">
            {PIECE_TYPES.map(p => (
              <button
                key={p.key}
                onClick={() => set('pieceType', p.key)}
                className="flex flex-col items-center gap-2 py-6 rounded-2xl transition-all"
                style={{
                  background: form.pieceType === p.key ? 'var(--goldl)' : 'var(--surf2)',
                  border: `2px solid ${form.pieceType === p.key ? 'var(--gold)' : 'transparent'}`,
                }}
              >
                <span style={{ fontSize: 32 }}>{p.icon}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{p.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Bead type */}
        {step === 1 && (
          <div className="flex flex-col gap-2">
            {(config?.bead_types || []).map(b => (
              <button
                key={b.name}
                onClick={() => set('beadType', b.name)}
                className="flex items-center justify-between p-4 rounded-xl text-left transition-all"
                style={{
                  background: form.beadType === b.name ? 'var(--goldl)' : 'var(--surf2)',
                  border: `2px solid ${form.beadType === b.name ? 'var(--gold)' : 'transparent'}`,
                }}
              >
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{b.name}</p>
                  {b.description && <p className="text-xs" style={{ color: 'var(--tx2)' }}>{b.description}</p>}
                </div>
                {b.price_modifier > 0 && (
                  <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>+{fmt(b.price_modifier)}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Colour */}
        {step === 2 && (
          <div className="flex flex-wrap gap-3">
            {(config?.colors || []).map(c => (
              <button
                key={c.name}
                onClick={() => set('color', c.name)}
                title={c.name}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: 40, height: 40,
                    background: c.hex,
                    border: `3px solid ${form.color === c.name ? 'var(--gold)' : 'transparent'}`,
                    boxShadow: form.color === c.name ? '0 0 0 2px var(--gold)' : 'none',
                  }}
                />
                <span className="text-xs" style={{ color: 'var(--tx2)' }}>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Step 3: Charms */}
        {step === 3 && (
          <div>
            <p className="text-sm mb-4" style={{ color: 'var(--tx2)' }}>Optional — add charms to your piece.</p>
            <div className="flex flex-col gap-2">
              {(config?.charm_types || []).map(c => (
                <button
                  key={c.name}
                  onClick={() => toggleCharm(c.name)}
                  className="flex items-center justify-between p-4 rounded-xl text-left transition-all"
                  style={{
                    background: form.charms.includes(c.name) ? 'var(--goldl)' : 'var(--surf2)',
                    border: `2px solid ${form.charms.includes(c.name) ? 'var(--gold)' : 'transparent'}`,
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{c.name}</span>
                  <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>+{fmt(c.price)}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="label mb-0 whitespace-nowrap">Quantity</label>
              <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
                <button onClick={() => set('qty', Math.max(1, form.qty - 1))}
                  className="px-4 py-2 text-sm font-bold"
                  style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}>−</button>
                <span className="px-5 py-2 text-sm font-semibold" style={{ color: 'var(--tx)', background: 'var(--surf)' }}>{form.qty}</span>
                <button onClick={() => set('qty', form.qty + 1)}
                  className="px-4 py-2 text-sm font-bold"
                  style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}>+</button>
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Notes (optional)</label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Any specific instructions…"
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <div className="flex flex-col gap-4">
            {/* Estimated price */}
            <div className="rounded-xl p-4 mb-2" style={{ background: 'var(--surf2)' }}>
              <p className="text-xs font-semibold mb-1" style={{ color: 'var(--tx2)' }}>Estimated price</p>
              <p className="font-serif text-2xl font-bold" style={{ color: 'var(--gold)' }}>{fmt(estimatedPrice())}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--tx2)' }}>Final price confirmed via WhatsApp before payment.</p>
            </div>

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
          </div>
        )}
      </div>

      {/* Nav buttons */}
      {error && <p className="text-sm mb-3" style={{ color: 'var(--pink)' }}>{error}</p>}
      <div className="flex gap-3">
        {step > 0 && (
          <button className="btn-outline flex-1" onClick={() => setStep(s => s - 1)}>← Back</button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            className="btn-gold flex-1"
            disabled={!canNext()}
            onClick={() => setStep(s => s + 1)}
            style={{ opacity: canNext() ? 1 : 0.45 }}
          >
            Next →
          </button>
        ) : (
          <button
            className="btn-gold flex-1"
            disabled={!canNext() || submitting}
            onClick={handleSubmit}
          >
            {submitting ? 'Placing order…' : 'Place Custom Order'}
          </button>
        )}
      </div>
    </div>
  )
}
