import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeo } from '../lib/useSeo'
import { fmt, formatDate, statusMeta } from '../lib/utils'
import { whatsappLink } from '../lib/config'
import { useToast } from '../components/Toast'
import Icon from '../components/Icon'

const TIMELINE = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function TrackOrderPage() {
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()

  useSeo({
    title: 'Track your order',
    description: 'Enter your order number to see where your piece has got to.',
  })

  const [input, setInput] = useState(params.get('order') ?? '')
  const [order, setOrder] = useState(null)
  const [state, setState] = useState('idle') // idle | searching | found | missing | error

  const search = async (e) => {
    e?.preventDefault()
    const value = input.trim().toUpperCase()
    if (!value) return

    setState('searching')
    setOrder(null)
    setParams({ order: value }, { replace: true })

    const { data, error } = await supabase.rpc('track_order', { p_order_number: value })

    if (error) {
      console.error('[KBB] track_order:', error)
      setState('error')
      return
    }

    const hit = Array.isArray(data) ? data[0] : data
    if (!hit) {
      setState('missing')
      return
    }

    setOrder(hit)
    setState('found')
  }

  const meta = order ? statusMeta(order.status) : null
  const stepIndex = order ? TIMELINE.indexOf(order.status) : -1
  const wa = order ? whatsappLink(`Hi! I am asking about order ${order.order_number}.`) : null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(order.order_number)
      toast('Order number copied.')
    } catch {
      toast('Could not copy.', 'warn')
    }
  }

  return (
    <div className="page-narrow py-12">
      <header className="mb-8">
        <p className="eyebrow mb-2">Where is it?</p>
        <h1 className="h1">Track your order</h1>
      </header>

      <form onSubmit={search} className="card p-6">
        <label className="label" htmlFor="order-number">
          Order number
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="order-number"
            className="field flex-1"
            style={{ textTransform: 'uppercase' }}
            placeholder="KBB-A3X9PQ"
            value={input}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={state === 'searching' || !input.trim()}>
            {state === 'searching' ? <Icon name="spinner" size={17} className="animate-spin" /> : 'Track'}
          </button>
        </div>
        <p className="help">
          It was on your confirmation page and looks like <span className="numeric">KBB-XXXXXX</span>.
        </p>
      </form>

      <div aria-live="polite" className="mt-6">
        {state === 'missing' && (
          <div className="well p-6 text-center">
            <Icon name="search" size={24} className="mx-auto text-ink-3" />
            <p className="h3 mt-3">We cannot find that order.</p>
            <p className="text-sm text-ink-2 mt-1.5">
              Check the number for a stray character — or message us and we will look it up.
            </p>
            {whatsappLink('Hi! I cannot find my order number.') && (
              <a
                href={whatsappLink('Hi! I cannot find my order number.')}
                target="_blank"
                rel="noreferrer"
                className="btn btn-outline btn-sm mt-5 no-underline"
              >
                <Icon name="whatsapp" size={15} />
                Ask us
              </a>
            )}
          </div>
        )}

        {state === 'error' && (
          <div className="well p-6 text-center" style={{ borderColor: 'var(--bad)' }}>
            <p className="text-sm" style={{ color: 'var(--bad)' }}>
              We could not reach the order system. Please try again in a moment.
            </p>
          </div>
        )}

        {state === 'found' && order && (
          <article className="card p-6 sm:p-7 animate-rise">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow mb-1.5">{order.is_custom ? 'Custom order' : 'Order'}</p>
                <div className="flex items-center gap-2">
                  <h2 className="numeric font-display" style={{ fontSize: '1.625rem', fontWeight: 500, color: 'var(--brass)' }}>
                    {order.order_number}
                  </h2>
                  <button type="button" onClick={copy} className="btn btn-ghost btn-sm" style={{ padding: '0.375rem' }} aria-label="Copy order number">
                    <Icon name="copy" size={15} />
                  </button>
                </div>
              </div>
              <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
            </div>

            {order.status !== 'cancelled' && (
              <ol className="list-none p-0 mt-8 mb-2 flex justify-between relative">
                {/* Rail behind the dots. */}
                <span
                  aria-hidden="true"
                  className="absolute"
                  style={{ top: 13, left: 12, right: 12, height: 1, background: 'var(--line-strong)' }}
                />
                <span
                  aria-hidden="true"
                  className="absolute"
                  style={{
                    top: 13,
                    left: 12,
                    height: 1,
                    background: 'var(--clay)',
                    width: stepIndex <= 0 ? 0 : `calc((100% - 24px) * ${stepIndex / (TIMELINE.length - 1)})`,
                    transition: 'width 0.5s ease',
                  }}
                />
                {TIMELINE.map((s, i) => {
                  const done = i <= stepIndex
                  return (
                    <li key={s} className="relative flex flex-col items-center gap-2" style={{ flex: 1 }}>
                      <span
                        className="flex items-center justify-center"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: done ? 'var(--clay)' : 'var(--surface)',
                          border: `1px solid ${done ? 'var(--clay)' : 'var(--line-strong)'}`,
                          color: '#fff',
                          zIndex: 1,
                        }}
                      >
                        {i < stepIndex ? <Icon name="check" size={14} /> : null}
                      </span>
                      <span
                        className="text-center hidden sm:block"
                        style={{ fontSize: '0.6875rem', color: done ? 'var(--ink)' : 'var(--ink-3)', maxWidth: 72 }}
                      >
                        {statusMeta(s).label}
                      </span>
                    </li>
                  )
                })}
              </ol>
            )}

            <div className="well p-5 mt-7">
              <p className="font-medium">{meta.label}</p>
              <p className="text-sm text-ink-2 mt-1">{meta.blurb}</p>
            </div>

            <dl className="m-0 mt-6 text-sm">
              {[
                ['Name on the order', order.first_name],
                order.total != null ? ['Total', fmt(order.total)] : null,
                order.estimated_price != null ? ['Estimated price', fmt(order.estimated_price)] : null,
                ['Placed', formatDate(order.created_at)],
              ]
                .filter(Boolean)
                .map(([key, value], i, arr) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 py-2.5"
                    style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}
                  >
                    <dt className="text-ink-2">{key}</dt>
                    <dd className="numeric font-medium m-0">{value}</dd>
                  </div>
                ))}
            </dl>

            {/* Only a first name is ever returned here — an order number is a
                weak secret, so it must not unlock an address or a phone. */}
            <p className="help mt-4">
              For your privacy we only show a first name. Message us if you need the full details.
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5 mt-6">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="btn btn-outline flex-1 no-underline">
                  <Icon name="whatsapp" size={16} />
                  Ask about this order
                </a>
              )}
              <Link to={`/complaint?order=${order.order_number}`} className="btn btn-ghost flex-1 no-underline">
                Report a problem
              </Link>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
