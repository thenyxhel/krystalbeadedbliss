import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeo } from '../lib/useSeo'
import { fmt, friendlyError } from '../lib/utils'
import Icon from '../components/Icon'
import { Mark } from '../components/Brand'

const STEPS = [
  { key: 'piece', label: 'Piece' },
  { key: 'beads', label: 'Beads' },
  { key: 'colour', label: 'Colour' },
  { key: 'charms', label: 'Charms' },
  { key: 'details', label: 'Your details' },
]

const PIECE_TYPES = [
  { key: 'bracelet', label: 'Bracelet' },
  { key: 'necklace', label: 'Necklace' },
  { key: 'earrings', label: 'Earrings' },
]

export default function CustomBuilderPage() {
  const navigate = useNavigate()

  useSeo({
    title: 'Design your own',
    description:
      'Pick the bead, the colour and the charms. We string it by hand and confirm the price with you before we start.',
  })

  const [config, setConfig] = useState(null)
  const [state, setState] = useState('loading') // loading | ready | error
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    pieceType: '',
    beadTypes: [],
    color: '',
    charms: [],
    qty: 1,
    notes: '',
    name: '',
    email: '',
    phone: '',
  })

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))
  const toggle = (key, value) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }))

  useEffect(() => {
    let cancelled = false

    supabase
      .from('custom_config')
      .select('bead_types, charm_types, colors, base_prices')
      .limit(1)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return
        if (err || !data) {
          console.error('[KBB] custom_config:', err)
          setState('error')
          return
        }
        setConfig(data)
        setState('ready')
      })

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * An *estimate*, shown so the visitor is not designing blind. The binding
   * number comes back from place_custom_order(), which recomputes it from
   * custom_config on the server — so editing this arithmetic in devtools
   * changes nothing but what you personally see.
   */
  const estimate = useMemo(() => {
    if (!config || !form.pieceType) return 0
    const base = Number(config.base_prices?.[form.pieceType] ?? 0)
    const beads = form.beadTypes.reduce(
      (sum, name) => sum + Number(config.bead_types?.find((b) => b.name === name)?.price_modifier ?? 0),
      0
    )
    const charms = form.charms.reduce(
      (sum, name) => sum + Number(config.charm_types?.find((c) => c.name === name)?.price ?? 0),
      0
    )
    return (base + beads + charms) * form.qty
  }, [config, form])

  const canAdvance = {
    0: () => !!form.pieceType,
    1: () => form.beadTypes.length > 0,
    2: () => !!form.color,
    3: () => true,
    4: () =>
      form.name.trim().length >= 2 &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) &&
      form.phone.replace(/\D/g, '').length >= 10,
  }[step]()

  const submit = async () => {
    setSubmitting(true)
    setError('')

    const { data, error: err } = await supabase.rpc('place_custom_order', {
      p_customer_name: form.name,
      p_email: form.email,
      p_phone: form.phone,
      p_piece_type: form.pieceType,
      p_bead_types: form.beadTypes,
      p_color: form.color,
      p_charms: form.charms,
      p_quantity: form.qty,
      p_notes: form.notes || null,
    })

    if (err) {
      setSubmitting(false)
      setError(friendlyError(err, 'We could not place your order. Please try again.'))
      return
    }

    const placed = Array.isArray(data) ? data[0] : data
    navigate('/order-confirmation', {
      replace: true,
      state: {
        orderNumber: placed.order_number,
        estimatedPrice: placed.estimated_price,
        isCustom: true,
        customerName: form.name,
        summary: form,
      },
    })
  }

  if (state === 'loading') {
    return (
      <div className="page-narrow py-16">
        <div className="skeleton" style={{ height: 28, width: '45%' }} />
        <div className="skeleton mt-6" style={{ height: 320 }} />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="page-narrow py-24 text-center">
        <Icon name="alert" size={28} className="mx-auto" style={{ color: 'var(--bad)' }} />
        <h1 className="h1 mt-5">The builder is not available.</h1>
        <p className="text-ink-2 mt-3">We could not load the bead and charm options. Please try again shortly.</p>
        <button type="button" className="btn btn-outline mt-7" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="page-narrow py-12">
      <header className="mb-9">
        <p className="eyebrow mb-2">One of one</p>
        <h1 className="h1">Design your own</h1>
        <p className="lede mt-4">
          Five short steps. Nothing is charged here — we confirm the final price with you on
          WhatsApp before a single bead is strung.
        </p>
      </header>

      {/* ── Progress ──────────────────────────────────────────────────────── */}
      <ol className="flex items-center gap-1.5 mb-9 list-none p-0 m-0">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex-1 flex flex-col gap-2">
            <span
              className="h-0.5 block"
              style={{ background: i <= step ? 'var(--clay)' : 'var(--line-strong)', transition: 'background 0.3s' }}
            />
            <span
              className="hidden sm:block"
              style={{ fontSize: '0.6875rem', color: i <= step ? 'var(--ink)' : 'var(--ink-3)' }}
              aria-current={i === step ? 'step' : undefined}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-7">
        <p className="eyebrow mb-1">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="h2 mb-6">
          {
            [
              'What are we making?',
              'Which beads?',
              'What colour?',
              'Any charms?',
              'How do we reach you?',
            ][step]
          }
        </h2>

        {/* ── Step 0: piece type ──────────────────────────────────────────── */}
        {step === 0 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Piece type</legend>
            <div className="grid grid-cols-3 gap-3">
              {PIECE_TYPES.map((p) => (
                <label
                  key={p.key}
                  className="flex flex-col items-center gap-3 py-7 cursor-pointer transition-colors"
                  style={{
                    border: `1.5px solid ${form.pieceType === p.key ? 'var(--clay)' : 'var(--line-strong)'}`,
                    background: form.pieceType === p.key ? 'var(--clay-wash)' : 'transparent',
                    borderRadius: 'var(--r-md)',
                  }}
                >
                  <input
                    type="radio"
                    name="pieceType"
                    className="sr-only"
                    checked={form.pieceType === p.key}
                    onChange={() => set('pieceType', p.key)}
                  />
                  <Icon name={p.key} size={30} className={form.pieceType === p.key ? 'text-clay' : 'text-ink-2'} />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Step 1: bead types ──────────────────────────────────────────── */}
        {step === 1 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm text-ink-2 mb-4">
              Pick as many as you like — we will mix them.
            </legend>
            <div className="flex flex-col gap-2.5">
              {(config.bead_types ?? []).map((b) => {
                const selected = form.beadTypes.includes(b.name)
                return (
                  <label
                    key={b.name}
                    className="flex items-center gap-3.5 p-4 cursor-pointer transition-colors"
                    style={{
                      border: `1.5px solid ${selected ? 'var(--clay)' : 'var(--line-strong)'}`,
                      background: selected ? 'var(--clay-wash)' : 'transparent',
                      borderRadius: 'var(--r-md)',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selected}
                      onChange={() => toggle('beadTypes', b.name)}
                    />
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 3,
                        border: `1.5px solid ${selected ? 'var(--clay)' : 'var(--line-strong)'}`,
                        background: selected ? 'var(--clay)' : 'transparent',
                        color: '#fff',
                      }}
                    >
                      {selected && <Icon name="check" size={13} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{b.name}</span>
                      {b.description && <span className="block meta">{b.description}</span>}
                    </span>
                    {b.price_modifier > 0 && (
                      <span className="numeric text-sm font-semibold" style={{ color: 'var(--brass)' }}>
                        +{fmt(b.price_modifier)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Step 2: colour ──────────────────────────────────────────────── */}
        {step === 2 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm text-ink-2 mb-4">
              The main colour. Mention anything more specific in the notes.
            </legend>
            <div className="flex flex-wrap gap-4">
              {(config.colors ?? []).map((c) => {
                const selected = form.color === c.name
                return (
                  <label key={c.name} className="flex flex-col items-center gap-2 cursor-pointer" style={{ width: 66 }}>
                    <input
                      type="radio"
                      name="color"
                      className="sr-only"
                      checked={selected}
                      onChange={() => set('color', c.name)}
                    />
                    <span
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: c.hex,
                        boxShadow: selected
                          ? '0 0 0 2px var(--surface), 0 0 0 4px var(--clay)'
                          : 'inset 0 0 0 1px rgba(0,0,0,0.12)',
                      }}
                    />
                    <span
                      className="text-center"
                      style={{ fontSize: '0.75rem', color: selected ? 'var(--ink)' : 'var(--ink-2)' }}
                    >
                      {c.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Step 3: charms + quantity ───────────────────────────────────── */}
        {step === 3 && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="text-sm text-ink-2 mb-4">Optional. Skip this if you would rather keep it plain.</legend>
              <div className="flex flex-col gap-2.5">
                {(config.charm_types ?? []).map((c) => {
                  const selected = form.charms.includes(c.name)
                  return (
                    <label
                      key={c.name}
                      className="flex items-center gap-3.5 p-4 cursor-pointer transition-colors"
                      style={{
                        border: `1.5px solid ${selected ? 'var(--clay)' : 'var(--line-strong)'}`,
                        background: selected ? 'var(--clay-wash)' : 'transparent',
                        borderRadius: 'var(--r-md)',
                      }}
                    >
                      <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggle('charms', c.name)} />
                      <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 3,
                          border: `1.5px solid ${selected ? 'var(--clay)' : 'var(--line-strong)'}`,
                          background: selected ? 'var(--clay)' : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {selected && <Icon name="check" size={13} />}
                      </span>
                      <span className="flex-1 text-sm font-medium">{c.name}</span>
                      <span className="numeric text-sm font-semibold" style={{ color: 'var(--brass)' }}>
                        +{fmt(c.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex items-center gap-4 mt-7">
              <span className="label mb-0">Quantity</span>
              <div className="flex items-center" style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-md)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ borderRadius: 0 }}
                  onClick={() => set('qty', Math.max(1, form.qty - 1))}
                  disabled={form.qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={15} />
                </button>
                <span className="numeric px-4 text-sm font-semibold">{form.qty}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ borderRadius: 0 }}
                  onClick={() => set('qty', Math.min(20, form.qty + 1))}
                  disabled={form.qty >= 20}
                  aria-label="Increase quantity"
                >
                  <Icon name="plus" size={15} />
                </button>
              </div>
            </div>

            <div className="mt-6">
              <label className="label" htmlFor="cb-notes">
                Notes (optional)
              </label>
              <textarea
                id="cb-notes"
                className="field"
                rows={3}
                maxLength={1000}
                style={{ resize: 'vertical' }}
                placeholder="Wrist or neck size, a colour you saw somewhere, who it is for…"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </>
        )}

        {/* ── Step 4: details ─────────────────────────────────────────────── */}
        {step === 4 && (
          <>
            <div className="well p-5 mb-6">
              <p className="eyebrow mb-1.5">Your design</p>
              <p className="text-sm text-ink-2">
                {[
                  PIECE_TYPES.find((p) => p.key === form.pieceType)?.label,
                  form.beadTypes.join(' + '),
                  form.color,
                  form.charms.length ? `${form.charms.length} charm${form.charms.length > 1 ? 's' : ''}` : null,
                  form.qty > 1 ? `× ${form.qty}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <hr className="hairline my-4" />

              <p className="eyebrow mb-1">Estimated price</p>
              <p className="numeric font-display" style={{ fontSize: '1.75rem', fontWeight: 500, color: 'var(--brass)' }}>
                {fmt(estimate)}
              </p>
              <p className="help mt-1">
                Confirmed with you on WhatsApp before we begin. Nothing is charged now.
              </p>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="cb-name">
                  Full name
                </label>
                <input
                  id="cb-name"
                  className="field"
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="label" htmlFor="cb-email">
                    Email
                  </label>
                  <input
                    id="cb-email"
                    type="email"
                    inputMode="email"
                    className="field"
                    autoComplete="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="cb-phone">
                    WhatsApp number
                  </label>
                  <input
                    id="cb-phone"
                    type="tel"
                    inputMode="tel"
                    className="field"
                    autoComplete="tel"
                    placeholder="0801 234 5678"
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Running estimate ──────────────────────────────────────────────── */}
      {step > 0 && step < 4 && form.pieceType && (
        <p className="flex items-center justify-between gap-3 mt-4 px-1" aria-live="polite">
          <span className="meta">Estimate so far</span>
          <span className="numeric font-semibold" style={{ color: 'var(--brass)' }}>
            {fmt(estimate)}
          </span>
        </p>
      )}

      {error && (
        <p className="error-text mt-4 flex items-start gap-2" role="alert">
          <Icon name="alert" size={16} style={{ marginTop: 2 }} />
          {error}
        </p>
      )}

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <div className="flex gap-2.5 mt-6">
        {step > 0 && (
          <button type="button" className="btn btn-outline" onClick={() => setStep((s) => s - 1)}>
            <Icon name="arrowLeft" size={16} />
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="btn btn-primary flex-1"
            disabled={!canAdvance}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
            <Icon name="arrowRight" size={16} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary flex-1" disabled={!canAdvance || submitting} onClick={submit}>
            {submitting ? (
              <>
                <Icon name="spinner" size={17} className="animate-spin" /> Sending…
              </>
            ) : (
              'Send my design'
            )}
          </button>
        )}
      </div>

      {step === 0 && (
        <p className="flex items-center gap-2 meta mt-6">
          <Mark size={18} />
          Made to order, by hand. Usually ready within a few days.
        </p>
      )}
    </div>
  )
}
