import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { CONFIG } from '../../lib/config'
import { fmt, formatDate, friendlyError, statusMeta } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import Icon from '../../components/Icon'

const TABS = [
  { key: 'orders', label: 'Shop orders' },
  { key: 'custom_orders', label: 'Custom requests' },
]

export default function AdminOrders() {
  const { toast } = useToast()

  const [table, setTable] = useState('orders')
  const [status, setStatus] = useState('all')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [receiptUrl, setReceiptUrl] = useState(null)
  const [receiptState, setReceiptState] = useState('idle') // idle | loading | ready | none

  const load = async () => {
    setLoading(true)
    let query = supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200)
    if (status !== 'all') query = query.eq('status', status)

    const { data, error } = await query
    if (error) toast(friendlyError(error, 'Could not load orders.'), 'bad')
    setRows(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    setSelected(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, status])

  /**
   * Receipts live in a private bucket now, so there is no public URL to link.
   * We mint a signed URL that expires in a minute, only for an admin, only
   * when one is actually being looked at.
   */
  useEffect(() => {
    setReceiptUrl(null)
    const path = selected?.payment_receipt_path
    if (!path) {
      setReceiptState('none')
      return
    }

    let cancelled = false
    setReceiptState('loading')

    supabase.storage
      .from('payment-receipts')
      .createSignedUrl(path, 60)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error || !data?.signedUrl) {
          console.error('[KBB] signed receipt url:', error)
          setReceiptState('none')
          return
        }
        setReceiptUrl(data.signedUrl)
        setReceiptState('ready')
      })

    return () => {
      cancelled = true
    }
  }, [selected])

  const updateStatus = async (nextStatus) => {
    const { error } = await supabase.from(table).update({ status: nextStatus }).eq('id', selected.id)
    if (error) {
      toast(friendlyError(error, 'Could not update the status.'), 'bad')
      return
    }
    toast(`Marked as ${statusMeta(nextStatus).label.toLowerCase()}.`)
    setSelected((s) => ({ ...s, status: nextStatus }))
    load()
  }

  const isCustom = table === 'custom_orders'

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow mb-2">Fulfilment</p>
        <h1 className="h1">Orders</h1>
      </header>

      <div className="flex gap-2 mb-4" role="tablist" aria-label="Order type">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={table === t.key}
            className="chip"
            onClick={() => {
              setTable(t.key)
              setStatus('all')
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap mb-6" role="group" aria-label="Filter by status">
        <button type="button" className="chip" aria-pressed={status === 'all'} onClick={() => setStatus('all')}>
          All
        </button>
        {CONFIG.orderStatuses.map((s) => (
          <button key={s} type="button" className="chip" aria-pressed={status === s} onClick={() => setStatus(s)}>
            {statusMeta(s).label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* ── List ────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 card overflow-hidden">
          {loading ? (
            <p className="p-5 text-sm text-ink-3">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="p-5 text-sm text-ink-3">Nothing here.</p>
          ) : (
            <ul className="list-none p-0 m-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {rows.map((o, i) => {
                const meta = statusMeta(o.status)
                const active = selected?.id === o.id
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(o)}
                      aria-current={active}
                      className="w-full text-left px-5 py-4 transition-colors"
                      style={{
                        background: active ? 'var(--surface-2)' : 'transparent',
                        border: 'none',
                        borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : undefined,
                        borderLeft: `2px solid ${active ? 'var(--clay)' : 'transparent'}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="numeric text-sm font-semibold" style={{ color: 'var(--brass)' }}>
                          {o.order_number}
                        </span>
                        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                      </div>
                      <p className="text-sm mt-1.5">{o.customer_name}</p>
                      <p className="meta numeric mt-0.5">
                        {fmt(isCustom ? o.estimated_price : o.total)} · {formatDate(o.created_at)}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* ── Detail ──────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7">
          {!selected ? (
            <div className="card p-10 text-center">
              <Icon name="package" size={26} className="mx-auto text-ink-3" />
              <p className="text-sm text-ink-3 mt-3">Choose an order to see the details.</p>
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
                <div>
                  <p className="eyebrow mb-1">{isCustom ? 'Custom request' : 'Order'}</p>
                  <h2 className="numeric font-display" style={{ fontSize: '1.5rem', fontWeight: 500, color: 'var(--brass)' }}>
                    {selected.order_number}
                  </h2>
                  <p className="meta mt-1">Placed {formatDate(selected.created_at, { weekday: 'short' })}</p>
                </div>
                <span className={`badge badge-${statusMeta(selected.status).tone}`}>
                  {statusMeta(selected.status).label}
                </span>
              </div>

              {/* Status controls */}
              <div className="mb-6">
                <p className="label">Move this order to</p>
                <div className="flex gap-2 flex-wrap">
                  {CONFIG.orderStatuses.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chip"
                      aria-pressed={selected.status === s}
                      disabled={selected.status === s}
                      onClick={() => updateStatus(s)}
                    >
                      {statusMeta(s).label}
                    </button>
                  ))}
                </div>
              </div>

              <hr className="hairline my-5" />

              {/* Customer */}
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <Detail label="Name" value={selected.customer_name} />
                <Detail label="Phone" value={selected.phone} href={`tel:${selected.phone}`} />
                <Detail label="Email" value={selected.email} href={`mailto:${selected.email}`} />
                {!isCustom && <Detail label="State" value={selected.state} />}
                {!isCustom && <Detail label="Address" value={selected.address} full />}
                {selected.notes && <Detail label="Notes" value={selected.notes} full />}
              </div>

              <hr className="hairline my-5" />

              {/* What was ordered */}
              {isCustom ? (
                <div>
                  <p className="label">The design</p>
                  <dl className="well p-4 m-0 text-sm">
                    {Object.entries(selected.configuration ?? {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-4 py-1.5">
                        <dt className="text-ink-2 capitalize">{key.replace(/_/g, ' ')}</dt>
                        <dd className="m-0 text-right font-medium">
                          {Array.isArray(value) ? value.join(', ') || '—' : String(value ?? '—')}
                        </dd>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 py-1.5" style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 10 }}>
                      <dt className="font-semibold">Estimated price</dt>
                      <dd className="numeric m-0 font-semibold">{fmt(selected.estimated_price)}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div>
                  <p className="label">Items</p>
                  <ul className="list-none p-0 m-0 flex flex-col gap-3">
                    {(selected.items ?? []).map((item, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <div className="frame frame-square flex-shrink-0" style={{ width: 40 }}>
                          {item.image ? (
                            <img src={item.image} alt="" loading="lazy" width="80" height="80" />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-ink-3">
                              <Icon name="image" size={15} />
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="meta numeric">
                            {fmt(item.price)} × {item.quantity}
                          </p>
                        </div>
                        <p className="numeric text-sm font-semibold">{fmt(item.price * item.quantity)}</p>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-between items-baseline mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                    <span className="font-semibold">Total</span>
                    <span className="numeric font-display" style={{ fontSize: '1.375rem', fontWeight: 500 }}>
                      {fmt(selected.total)}
                    </span>
                  </div>
                </div>
              )}

              {/* Receipt */}
              {!isCustom && (
                <>
                  <hr className="hairline my-5" />
                  <p className="label">Payment receipt</p>
                  {receiptState === 'loading' && (
                    <p className="text-sm text-ink-3 flex items-center gap-2">
                      <Icon name="spinner" size={15} className="animate-spin" /> Preparing a secure link…
                    </p>
                  )}
                  {receiptState === 'none' && <p className="text-sm text-ink-3">No receipt was attached.</p>}
                  {receiptState === 'ready' && receiptUrl && (
                    <>
                      <a href={receiptUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm no-underline">
                        <Icon name="image" size={15} />
                        Open receipt
                      </a>
                      <p className="help">
                        This link is signed and expires in 60 seconds. Receipts are never public.
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value, href, full = false }) {
  if (!value) return null
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
        {label}
      </p>
      {href ? (
        <a href={href} className="link text-sm no-underline break-words">
          {value}
        </a>
      ) : (
        <p className="text-sm break-words">{value}</p>
      )}
    </div>
  )
}
