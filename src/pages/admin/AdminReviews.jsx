import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast, ToastContainer } from '../../components/Toast'

const STATUS_COLORS = { pending: '#EAB308', approved: '#22C55E', rejected: 'var(--pink)' }

function Stars({ value, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <svg key={n} width={size} height={size} viewBox="0 0 24 24"
          fill={n <= value ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export default function AdminReviews() {
  const { toasts, toast } = useToast()
  const [reviews, setReviews] = useState([])
  const [loading, setLoad]    = useState(true)
  const [filter, setFilter]   = useState('pending')
  const [products, setProducts] = useState({})

  const load = async () => {
    setLoad(true)
    let q = supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setReviews(data || [])

    // Fetch product names for context
    const ids = [...new Set((data || []).map(r => r.product_id))]
    if (ids.length) {
      const { data: prods } = await supabase.from('products').select('id, name').in('id', ids)
      const map = {}
      ;(prods || []).forEach(p => { map[p.id] = p.name })
      setProducts(map)
    }
    setLoad(false)
  }

  useEffect(() => { load() }, [filter])

  const updateStatus = async (id, status) => {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast(`Review ${status}!`); load() }
  }

  const deleteReview = async (id) => {
    if (!confirm('Delete this review permanently?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) toast(error.message, 'error')
    else { toast('Review deleted.'); load() }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />

      <div className="mb-8">
        <p className="section-eyebrow">Customer feedback</p>
        <h1 className="section-title">Reviews</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all"
            style={{
              background: filter === s ? (STATUS_COLORS[s] || 'var(--gold)') : 'var(--surf)',
              color:      filter === s ? 'white' : 'var(--tx2)',
              border: '1px solid var(--bd)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>Loading…</p>
        ) : reviews.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>No reviews found.</p>
        ) : (
          reviews.map((r, i) => (
            <div
              key={r.id}
              className="p-5"
              style={{ borderBottom: i < reviews.length - 1 ? '1px solid var(--bd)' : 'none' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{r.customer_name}</p>
                  <p className="text-xs" style={{ color: 'var(--tx2)' }}>
                    on <span style={{ color: 'var(--gold)' }}>{products[r.product_id] || 'Unknown product'}</span>
                  </p>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white capitalize"
                  style={{ background: STATUS_COLORS[r.status] }}
                >
                  {r.status}
                </span>
              </div>

              <Stars value={r.rating} />
              <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--tx)' }}>{r.comment}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--tx2)' }}>
                {new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              <div className="flex gap-2 mt-3">
                {r.status !== 'approved' && (
                  <button
                    onClick={() => updateStatus(r.id, 'approved')}
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                    style={{ background: STATUS_COLORS.approved, border: 'none' }}
                  >
                    Approve
                  </button>
                )}
                {r.status !== 'rejected' && (
                  <button
                    onClick={() => updateStatus(r.id, 'rejected')}
                    className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
                    style={{ background: STATUS_COLORS.rejected, border: 'none' }}
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => deleteReview(r.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full"
                  style={{ background: 'var(--surf2)', color: 'var(--tx2)', border: 'none' }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}