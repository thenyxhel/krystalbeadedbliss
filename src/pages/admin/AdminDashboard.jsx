import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { fmt } from '../../lib/utils'
import { ADMIN_BASE } from '../../lib/adminPath'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [recent, setRecent] = useState([])

  useEffect(() => {
    const load = async () => {
      const [
        { count: totalOrders },
        { count: pendingOrders },
        { count: pendingCustom },
        { count: openComplaints },
        { data: orders },
        { data: recentOrders },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('custom_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('orders').select('total'),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
      ])

      const revenue = (orders || []).reduce((s, o) => s + (o.total || 0), 0)
      setStats({ totalOrders, pendingOrders, pendingCustom, openComplaints, revenue })
      setRecent(recentOrders || [])
    }
    load()
  }, [])

  const CARDS = stats ? [
    { label: 'Total Orders',       value: stats.totalOrders,    sub: 'all time',       link: `${ADMIN_BASE}/orders` },
    { label: 'Pending Orders',     value: stats.pendingOrders,  sub: 'need attention', link: `${ADMIN_BASE}/orders` },
    { label: 'Custom Orders',      value: stats.pendingCustom,  sub: 'pending',        link: `${ADMIN_BASE}/orders` },
    { label: 'Open Complaints',    value: stats.openComplaints, sub: 'unresolved',     link: `${ADMIN_BASE}/complaints` },
    { label: 'Total Revenue',      value: fmt(stats.revenue),   sub: 'from orders',    link: null },
  ] : []

  return (
    <div>
      <div className="mb-8">
        <p className="section-eyebrow">Overview</p>
        <h1 className="section-title">Dashboard</h1>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {!stats
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="card p-5" style={{ height: 90, opacity: 0.4 }} />
            ))
          : CARDS.map(c => (
              <div key={c.label} className="card p-5">
                <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--tx2)' }}>
                  {c.label}
                </p>
                <p className="font-serif text-3xl font-bold" style={{ color: 'var(--tx)' }}>{c.value}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs" style={{ color: 'var(--tx2)' }}>{c.sub}</p>
                  {c.link && (
                    <Link to={c.link} className="text-xs font-semibold no-underline" style={{ color: 'var(--gold)' }}>
                      View →
                    </Link>
                  )}
                </div>
              </div>
            ))
        }
      </div>

      {/* Recent orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold" style={{ color: 'var(--tx)' }}>Recent Orders</h2>
          <Link to="/admin/orders" className="text-sm no-underline" style={{ color: 'var(--gold)' }}>View all →</Link>
        </div>
        <div className="card overflow-hidden">
          {recent.length === 0 ? (
            <p className="p-6 text-sm" style={{ color: 'var(--tx2)' }}>No orders yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {['Order #', 'Customer', 'Total', 'Status', 'Date'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--tx2)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((o, i) => (
                  <tr
                    key={o.id}
                    style={{ borderBottom: i < recent.length - 1 ? '1px solid var(--bd)' : 'none' }}
                  >
                    <td className="px-5 py-3 font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>{o.order_number}</td>
                    <td className="px-5 py-3" style={{ color: 'var(--tx)' }}>{o.customer_name}</td>
                    <td className="px-5 py-3 font-semibold" style={{ color: 'var(--tx)' }}>{fmt(o.total)}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-full capitalize text-white"
                        style={{ background: o.status === 'delivered' ? 'var(--gold)' : o.status === 'cancelled' ? 'var(--pink)' : '#555' }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs" style={{ color: 'var(--tx2)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}