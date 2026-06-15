import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { fmt, cap } from '../../lib/utils'
import { useToast, ToastContainer } from '../../components/Toast'

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']

const STATUS_COLORS = {
  pending:    '#EAB308',
  confirmed:  '#3B82F6',
  processing: '#8B5CF6',
  shipped:    '#6366F1',
  delivered:  '#22C55E',
  cancelled:  'var(--pink)',
}

export default function AdminOrders() {
  const { toasts, toast } = useToast()
  const [tab, setTab]       = useState('regular') // 'regular' | 'custom'
  const [orders, setOrders] = useState([])
  const [loading, setLoad]  = useState(true)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const table = tab === 'regular' ? 'orders' : 'custom_orders'

  const load = async () => {
    setLoad(true)
    let q = supabase.from(table).select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setOrders(data || [])
    setLoad(false)
  }

  useEffect(() => { load() }, [tab, filter])

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from(table).update({ status }).eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Status updated!'); load(); if (selected?.id === id) setSelected(s => ({ ...s, status })) }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />

      <div className="mb-8">
        <p className="section-eyebrow">Fulfilment</p>
        <h1 className="section-title">Orders</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {[['regular', 'Regular Orders'], ['custom', 'Custom Orders']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setFilter('all') }}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{
              background: tab === key ? 'var(--gold)' : 'var(--surf)',
              color:      tab === key ? 'white'       : 'var(--tx2)',
              border: '1px solid var(--bd)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', ...STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-semibold transition-all capitalize"
            style={{
              background: filter === s ? (STATUS_COLORS[s] || 'var(--gold)') : 'var(--surf)',
              color:      filter === s ? 'white' : 'var(--tx2)',
              border: '1px solid var(--bd)',
            }}
          >
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Orders list */}
        <div className="md:col-span-2 card overflow-hidden">
          {loading ? (
            <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>Loading…</p>
          ) : orders.length === 0 ? (
            <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>No orders found.</p>
          ) : (
            orders.map((o, i) => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className="w-full text-left p-4 transition-colors"
                style={{
                  borderBottom: i < orders.length - 1 ? '1px solid var(--bd)' : 'none',
                  background: selected?.id === o.id ? 'var(--goldl)' : 'transparent',
                  border: 'none',
                  display: 'block',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>
                    {o.order_number}
                  </span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full text-white capitalize"
                    style={{ background: STATUS_COLORS[o.status] || '#555' }}
                  >
                    {o.status}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{o.customer_name}</p>
                <div className="flex justify-between mt-1">
                  <p className="text-xs" style={{ color: 'var(--tx2)' }}>
                    {tab === 'regular' ? fmt(o.total) : o.piece_type}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tx2)' }}>
                    {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Detail panel */}
        <div className="md:col-span-3">
          {!selected ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--tx2)' }}>Select an order to view details.</p>
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="font-mono text-lg font-bold" style={{ color: 'var(--gold)' }}>{selected.order_number}</p>
                  <p className="text-sm" style={{ color: 'var(--tx2)' }}>
                    {new Date(selected.created_at).toLocaleString('en-NG')}
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full text-white capitalize"
                  style={{ background: STATUS_COLORS[selected.status] || '#555' }}
                >
                  {selected.status}
                </span>
              </div>

              {/* Customer */}
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surf2)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx2)' }}>Customer</p>
                {[
                  ['Name',  selected.customer_name],
                  ['Email', selected.email],
                  ['Phone', selected.phone],
                  ...(selected.address ? [['Address', selected.address], ['State', selected.state]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <span className="text-xs" style={{ color: 'var(--tx2)' }}>{k}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Items (regular) or config (custom) */}
              {tab === 'regular' && selected.items && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx2)' }}>Items</p>
                  {selected.items.map((item, i) => (
                    <div key={i} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--bd)' }}>
                      <span className="text-sm" style={{ color: 'var(--tx)' }}>{item.name} ×{item.quantity}</span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{fmt(item.price * item.quantity)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold">
                    <span className="text-sm" style={{ color: 'var(--tx)' }}>Total</span>
                    <span className="text-sm font-serif" style={{ color: 'var(--tx)' }}>{fmt(selected.total)}</span>
                  </div>
                </div>
              )}

              {tab === 'custom' && selected.configuration && (
                <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surf2)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--tx2)' }}>Configuration</p>
                  {[
                    ['Piece Type',  cap(selected.piece_type)],
                    ['Bead Type',   selected.configuration.bead_type],
                    ['Colour',      selected.configuration.color],
                    ['Charms',      selected.configuration.charms?.join(', ') || 'None'],
                    ['Quantity',    selected.configuration.quantity],
                    ['Est. Price',  selected.estimated_price ? fmt(selected.estimated_price) : '—'],
                    ['Notes',       selected.configuration.notes || '—'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--bd)' }}>
                      <span className="text-xs" style={{ color: 'var(--tx2)' }}>{k}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Receipt */}
              {selected.payment_receipt_url && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx2)' }}>Payment Receipt</p>
                  <a
                    href={selected.payment_receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-outline text-xs w-full text-center no-underline block"
                  >
                    View Receipt ↗
                  </a>
                </div>
              )}

              {/* Notes */}
              {selected.notes && (
                <div className="rounded-xl p-3 mb-4" style={{ background: 'var(--surf2)' }}>
                  <p className="text-xs" style={{ color: 'var(--tx2)' }}><strong>Notes:</strong> {selected.notes}</p>
                </div>
              )}

              {/* Status update */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx2)' }}>Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => updateStatus(selected.id, s)}
                      disabled={selected.status === s}
                      className="text-xs font-bold px-3 py-1.5 rounded-full text-white capitalize transition-opacity"
                      style={{
                        background: STATUS_COLORS[s] || '#555',
                        opacity: selected.status === s ? 0.4 : 1,
                        border: 'none',
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
