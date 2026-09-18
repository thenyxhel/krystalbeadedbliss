import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { CONFIG, categoryLabel } from '../lib/config'
import { useSeo } from '../lib/useSeo'
import { fmt, friendlyError } from '../lib/utils'
import Icon from '../components/Icon'
import { Mark } from '../components/Brand'

/**
 * The steps are computed, not fixed.
 *
 * A chains-only keychain has no bead type and no bead colour to choose, so
 * asking would be nonsense. When the style is 'chains' those two steps drop
 * out entirely and the progress bar shortens to match. place_custom_order()
 * applies the same rule server-side, so the two can never disagree.
 */
const stepsFor = (style) => {
  const beads = style === 'beaded' || style === 'both'
  return [
    { key: 'piece', label: 'Piece', title: 'What are we making?' },
    { key: 'style', label: 'Style', title: 'Beaded, chains, or both?' },
    ...(beads
      ? [
          { key: 'beads', label: 'Beads', title: 'Which beads?' },
          { key: 'colour', label: 'Colour', title: 'What colour?' },
        ]
      : []),
    { key: 'charms', label: 'Charms', title: 'Any charms?' },
    { key: 'details', label: 'You', title: 'How do we reach you?' },
  ]
}

export default function CustomBuilderPage() {
  const navigate = useNavigate()

  useSeo({
    title: 'Design your own',
    description:
      'Pick the piece, the beads or chains, the colour and the charms. Made by hand, with the price confirmed before anything starts.',
  })

  const [config, setConfig] = useState(null)
  const [state, setState] = useState('loading')
  const [index, setIndex] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    pieceType: '',
    style: '',
    beadTypes: [],
    color: '',
    charms: [],
    qty: 1,
    notes: '',
    name: '',
    email: '',
    phone: '',
  })

  const steps = stepsFor(form.style)
  const step = steps[Math.min(index, steps.length - 1)]

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

  /** Indicative only. place_custom_order() recomputes this from the database. */
  const estimate = useMemo(() => {
    if (!config || !form.pieceType) return 0
    const base = Number(config.base_prices?.[form.pieceType] ?? 0)
    const beads = form.beadTypes.reduce(
      (sum, n) => sum + Number(config.bead_types?.find((b) => b.name === n)?.price_modifier ?? 0),
      0
    )
    const charms = form.charms.reduce(
      (sum, n) => sum + Number(config.charm_types?.find((c) => c.name === n)?.price ?? 0),
      0
    )
    return (base + beads + charms) * form.qty
  }, [config, form])

  const canAdvance = {
    piece: () => !!form.pieceType,
    style: () => !!form.style,
    beads: () => form.beadTypes.length > 0,
    colour: () => !!form.color,
    charms: () => true,
    details: () =>
      form.name.trim().length >= 2 &&
      /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) &&
      form.phone.replace(/\D/g, '').length >= 10,
  }[step.key]()

  const submit = async () => {
    setSubmitting(true)
    setError('')

    const { data, error: err } = await supabase.rpc('place_custom_order', {
      p_customer_name: form.name,
      p_email: form.email,
      p_phone: form.phone,
      p_piece_type: form.pieceType,
      p_style: form.style,
      p_bead_types: form.beadTypes,
      p_color: form.color || null,
      p_charms: form.charms,
      p_quantity: form.qty,
      p_notes: form.notes || null,
    })

    if (err) {
      setSubmitting(false)
      setError(friendlyError(err, 'We could not send your design. Please try again.'))
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
        <div className="skeleton" style={{ height: 30, width: '45%' }} />
        <div className="skeleton mt-6" style={{ height: 340 }} />
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="page-narrow py-24 text-center">
        <Icon name="alert" size={28} className="mx-auto" style={{ color: 'var(--bad)' }} />
        <h1 className="h1 mt-5">The builder is not available.</h1>
        <p className="text-ink-2 mt-3">We could not load the options. Please try again shortly.</p>
        <button type="button" className="btn btn-outline mt-7" onClick={() => window.location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  const selectable = (active) => ({
    border: `2px solid ${active ? 'var(--accent)' : 'var(--line-strong)'}`,
    background: active ? 'var(--accent-wash)' : 'transparent',
    borderRadius: 'var(--r-md)',
  })

  return (
    <div className="page-narrow py-12">
      <header className="mb-8">
        <p className="eyebrow mb-2">One of one</p>
        <h1 className="h1">Design your own</h1>
        <p className="lede mt-4">
          Nothing is charged here. We confirm the final price with you on WhatsApp before a
          single bead is strung.
        </p>
      </header>

      <ol className="flex items-center gap-1.5 mb-8 list-none p-0 m-0">
        {steps.map((s, i) => (
          <li key={s.key} className="flex-1 flex flex-col gap-2">
            <span
              className="block"
              style={{
                height: 4,
                borderRadius: 999,
                background: i <= index ? 'var(--accent)' : 'var(--line-strong)',
                transition: 'background 0.3s',
              }}
            />
            <span
              className="hidden sm:block"
              style={{ fontSize: '0.6875rem', fontWeight: 600, color: i <= index ? 'var(--ink)' : 'var(--ink-3)' }}
              aria-current={i === index ? 'step' : undefined}
            >
              {s.label}
            </span>
          </li>
        ))}
      </ol>

      <div className="card p-6 sm:p-7">
        <p className="eyebrow mb-1">
          Step {index + 1} of {steps.length}
        </p>
        <h2 className="h2 mb-6">{step.title}</h2>

        {/* ── Piece ─────────────────────────────────────────────────────── */}
        {step.key === 'piece' && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="sr-only">Piece type</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CONFIG.categories.map((c) => (
                <label
                  key={c.key}
                  className="flex flex-col items-center gap-3 py-6 cursor-pointer transition-colors"
                  style={selectable(form.pieceType === c.key)}
                >
                  <input
                    type="radio"
                    name="pieceType"
                    className="sr-only"
                    checked={form.pieceType === c.key}
                    onChange={() => set('pieceType', c.key)}
                  />
                  <Icon
                    name={c.key}
                    size={28}
                    className={form.pieceType === c.key ? 'text-accent' : 'text-ink-2'}
                  />
                  <span className="text-sm font-semibold text-center">{c.singular}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Style ─────────────────────────────────────────────────────── */}
        {step.key === 'style' && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm text-ink-2 mb-4">
              Keychains and bag charms often use both together.
            </legend>
            <div className="flex flex-col gap-2.5">
              {CONFIG.styles.map((s) => (
                <label
                  key={s.key}
                  className="flex items-center gap-3.5 p-4 cursor-pointer transition-colors"
                  style={selectable(form.style === s.key)}
                >
                  <input
                    type="radio"
                    name="style"
                    className="sr-only"
                    checked={form.style === s.key}
                    onChange={() => {
                      set('style', s.key)
                      if (s.key === 'chains') setForm((f) => ({ ...f, beadTypes: [], color: '' }))
                    }}
                  />
                  <Icon
                    name={s.key === 'both' ? 'set' : s.key}
                    size={22}
                    className={form.style === s.key ? 'text-accent' : 'text-ink-2'}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{s.label}</span>
                    <span className="block meta">
                      {s.key === 'beaded' && 'Strung beads throughout'}
                      {s.key === 'chains' && 'Metal chain, no beads'}
                      {s.key === 'both' && 'Chain with beaded sections'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Beads ─────────────────────────────────────────────────────── */}
        {step.key === 'beads' && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm text-ink-2 mb-4">Pick as many as you like — we will mix them.</legend>
            <div className="flex flex-col gap-2.5">
              {(config.bead_types ?? []).map((b) => {
                const on = form.beadTypes.includes(b.name)
                return (
                  <label
                    key={b.name}
                    className="flex items-center gap-3.5 p-4 cursor-pointer transition-colors"
                    style={selectable(on)}
                  >
                    <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle('beadTypes', b.name)} />
                    <span
                      className="flex items-center justify-center flex-shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 6,
                        border: `2px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                        background: on ? 'var(--accent)' : 'transparent',
                        color: 'var(--on-accent)',
                      }}
                    >
                      {on && <Icon name="check" size={13} />}
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold">{b.name}</span>
                      {b.description && <span className="block meta">{b.description}</span>}
                    </span>
                    {b.price_modifier > 0 && (
                      <span className="numeric text-sm font-bold" style={{ color: 'var(--gold)' }}>
                        +{fmt(b.price_modifier)}
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Colour ────────────────────────────────────────────────────── */}
        {step.key === 'colour' && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="text-sm text-ink-2 mb-4">
              The main colour. Anything more specific goes in the notes.
            </legend>
            <div className="flex flex-wrap gap-4">
              {(config.colors ?? []).map((c) => {
                const on = form.color === c.name
                return (
                  <label key={c.name} className="flex flex-col items-center gap-2 cursor-pointer" style={{ width: 68 }}>
                    <input
                      type="radio"
                      name="color"
                      className="sr-only"
                      checked={on}
                      onChange={() => set('color', c.name)}
                    />
                    <span
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        background: c.hex,
                        boxShadow: on
                          ? '0 0 0 3px var(--surface), 0 0 0 6px var(--accent)'
                          : 'inset 0 0 0 1px rgba(0,0,0,0.18)',
                      }}
                    />
                    <span
                      className="text-center"
                      style={{ fontSize: '0.75rem', fontWeight: on ? 700 : 400, color: on ? 'var(--ink)' : 'var(--ink-2)' }}
                    >
                      {c.name}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        )}

        {/* ── Charms + quantity ─────────────────────────────────────────── */}
        {step.key === 'charms' && (
          <>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="text-sm text-ink-2 mb-4">Optional — skip if you want it plain.</legend>
              <div className="flex flex-col gap-2.5">
                {(config.charm_types ?? []).map((c) => {
                  const on = form.charms.includes(c.name)
                  return (
                    <label
                      key={c.name}
                      className="flex items-center gap-3.5 p-4 cursor-pointer transition-colors"
                      style={selectable(on)}
                    >
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle('charms', c.name)} />
                      <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: `2px solid ${on ? 'var(--accent)' : 'var(--line-strong)'}`,
                          background: on ? 'var(--accent)' : 'transparent',
                          color: 'var(--on-accent)',
                        }}
                      >
                        {on && <Icon name="check" size={13} />}
                      </span>
                      <span className="flex-1 text-sm font-semibold">{c.name}</span>
                      <span className="numeric text-sm font-bold" style={{ color: 'var(--gold)' }}>
                        +{fmt(c.price)}
                      </span>
                    </label>
                  )
                })}
              </div>
            </fieldset>

            <div className="flex items-center gap-4 mt-7">
              <span className="label mb-0">Quantity</span>
              <div className="flex items-center" style={{ border: '1px solid var(--line-strong)', borderRadius: 'var(--r-pill)' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => set('qty', Math.max(1, form.qty - 1))}
                  disabled={form.qty <= 1}
                  aria-label="Decrease quantity"
                >
                  <Icon name="minus" size={15} />
                </button>
                <span className="numeric px-4 text-sm font-bold">{form.qty}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
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
                placeholder="Size, a colour you saw somewhere, who it is for…"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </div>
          </>
        )}

        {/* ── Details ───────────────────────────────────────────────────── */}
        {step.key === 'details' && (
          <>
            <div className="well p-5 mb-6">
              <p className="eyebrow mb-1.5">Your design</p>
              <p className="text-sm text-ink-2">
                {[
                  categoryLabel(form.pieceType),
                  CONFIG.styles.find((s) => s.key === form.style)?.label,
                  form.beadTypes.join(' + ') || null,
                  form.color || null,
                  form.charms.length ? `${form.charms.length} charm${form.charms.length > 1 ? 's' : ''}` : null,
                  form.qty > 1 ? `× ${form.qty}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>

              <hr className="hairline my-4" />

              <p className="eyebrow mb-1">Estimated price</p>
              <p className="numeric font-display" style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--gold)' }}>
                {fmt(estimate)}
              </p>
              <p className="help mt-1">Confirmed with you before we begin. Nothing is charged now.</p>
            </div>

            <div className="flex flex-col gap-5">
              <div>
                <label className="label" htmlFor="cb-name">
                  Full name
                </label>
                <input id="cb-name" className="field" autoComplete="name" value={form.name} onChange={(e) => set('name', e.target.value)} required />
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="label" htmlFor="cb-email">
                    Email
                  </label>
                  <input id="cb-email" type="email" inputMode="email" className="field" autoComplete="email" value={form.email} onChange={(e) => set('email', e.target.value)} required />
                </div>
                <div>
                  <label className="label" htmlFor="cb-phone">
                    WhatsApp number
                  </label>
                  <input id="cb-phone" type="tel" inputMode="tel" className="field" autoComplete="tel" placeholder="0801 234 5678" value={form.phone} onChange={(e) => set('phone', e.target.value)} required />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {index > 0 && index < steps.length - 1 && form.pieceType && (
        <p className="flex items-center justify-between gap-3 mt-4 px-1" aria-live="polite">
          <span className="meta">Estimate so far</span>
          <span className="numeric font-bold" style={{ color: 'var(--gold)' }}>
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

      <div className="flex gap-2.5 mt-6">
        {index > 0 && (
          <button type="button" className="btn btn-outline" onClick={() => setIndex((i) => i - 1)}>
            <Icon name="arrowLeft" size={16} />
            Back
          </button>
        )}
        {index < steps.length - 1 ? (
          <button type="button" className="btn btn-primary flex-1" disabled={!canAdvance} onClick={() => setIndex((i) => i + 1)}>
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

      {index === 0 && (
        <p className="flex items-center gap-2 meta mt-6">
          <Mark size={20} />
          Made to order, by hand. Usually ready within a few days.
        </p>
      )}
    </div>
  )
}
