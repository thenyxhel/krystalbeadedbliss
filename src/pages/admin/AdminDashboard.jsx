import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt, formatDate, statusMeta } from '../../lib/utils'
import Icon from '../../components/Icon'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      // One aggregate call instead of six table scans in the browser.
      const [{ data: s, error: statsError }, { data: orders }] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase
          .from('orders')
          .select('id, order_number, customer_name, total, status, created_at')
          .order('created_at', { ascending: false })
          .limit(8),
      ])

      if (cancelled) return
      if (statsError) {
        setError('Could not load the dashboard figures.')
        console.error('[KBB] admin_stats:', statsError)
      }
      setStats(s ?? null)
      setRecent(orders ?? [])
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const cards = stats
    ? [
        { label: 'Confirmed revenue', value: fmt(stats.revenue_confirmed), note: 'excludes pending & cancelled' },
        { label: 'Awaiting confirmation', value: fmt(stats.revenue_pending), note: `${stats.orders_pending} order(s)`, to: '/admin/orders' },
        { label: 'Orders, all time', value: stats.orders_total, note: `${stats.orders_last_7d} in the last 7 days`, to: '/admin/orders' },
        { label: 'Custom requests', value: stats.custom_pending, note: 'pending', to: '/admin/orders' },
        { label: 'Reviews to approve', value: stats.reviews_pending, note: 'waiting on you', to: '/admin/reviews' },
        { label: 'Open complaints', value: stats.complaints_open, note: 'unresolved', to: '/admin/complaints' },
        { label: 'Live products', value: stats.products_live, note: `${stats.products_soldout} sold out`, to: '/admin/products' },
      ]
    : []

  return (
    <div>
      <header className="mb-8">
        <p className="eyebrow mb-2">Overview</p>
        <h1 className="h1">Dashboard</h1>
      </header>

      {error && (
        <p className="error-text mb-6 flex items-center gap-2">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {!stats
          ? Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 104 }} />)
          : cards.map((c) => {
              const body = (
                <>
                  <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
                    {c.label}
                  </p>
                  <p className="numeric font-display mt-2" style={{ fontSize: '1.625rem', fontWeight: 500 }}>
                    {c.value}
                  </p>
                  <p className="meta mt-1">{c.note}</p>
                </>
              )
              return c.to ? (
                <Link key={c.label} to={c.to} className="card p-5 no-underline hover:border-line-strong transition-colors">
                  {body}
                </Link>
              ) : (
                <div key={c.label} className="card p-5">
                  {body}
                </div>
              )
            })}
      </div>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="h3">Recent orders</h2>
          <Link to="/admin/orders" className="link text-sm no-underline">
            All orders →
          </Link>
        </div>

        <div className="card overflow-x-auto">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-ink-3">No orders yet.</p>
          ) : (
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 560 }}>
              <caption className="sr-only">The eight most recent orders</caption>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  {['Order', 'Customer', 'Total', 'Status', 'Placed'].map((h) => (
                    <th key={h} scope="col" className="eyebrow text-left px-5 py-3" style={{ fontSize: '0.625rem' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((o, i) => {
                  const meta = statusMeta(o.status)
                  return (
                    <tr key={o.id} style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <td className="px-5 py-3 numeric font-semibold" style={{ color: 'var(--brass)' }}>
                        {o.order_number}
                      </td>
                      <td className="px-5 py-3">{o.customer_name}</td>
                      <td className="px-5 py-3 numeric font-semibold">{fmt(o.total)}</td>
                      <td className="px-5 py-3">
                        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                      </td>
                      <td className="px-5 py-3 meta">{formatDate(o.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
