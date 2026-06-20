import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Stars({ value, size = 16, onPick }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onPick?.(n)}
          disabled={!onPick}
          style={{ background: 'none', border: 'none', padding: 0, cursor: onPick ? undefined : 'default' }}
        >
          <svg width={size} height={size} viewBox="0 0 24 24" fill={n <= value ? 'var(--gold)' : 'none'} stroke="var(--gold)" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export default function ReviewSection({ productId }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({ name: '', rating: 5, comment: '' })

  const load = () => {
    supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setReviews(data || []); setLoading(false) })
  }

  useEffect(() => { load() }, [productId])

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null

  const submit = async () => {
    if (!form.name || !form.comment) return
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      customer_name: form.name,
      rating: form.rating,
      comment: form.comment,
      status: 'pending',
    })
    setSubmitting(false)
    if (!error) {
      setDone(true)
      setForm({ name: '', rating: 5, comment: '' })
    }
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="section-eyebrow mb-1">What customers say</p>
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-2xl font-semibold" style={{ color: 'var(--tx)' }}>Reviews</h2>
            {avg && (
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--tx2)' }}>
                <Stars value={Math.round(avg)} size={14} /> {avg} ({reviews.length})
              </span>
            )}
          </div>
        </div>
        {!showForm && !done && (
          <button className="btn-outline text-xs" onClick={() => setShowForm(true)}>
            Write a Review
          </button>
        )}
      </div>

      {/* Review form */}
      {showForm && !done && (
        <div className="card p-5 mb-6">
          <label className="label">Your Rating</label>
          <Stars value={form.rating} onPick={r => setForm(f => ({ ...f, rating: r }))} />
          <div className="mt-4">
            <label className="label">Your Name</label>
            <input
              className="input"
              placeholder="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="mt-4">
            <label className="label">Your Review</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Tell us what you thought…"
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-outline flex-1" onClick={() => setShowForm(false)}>Cancel</button>
            <button
              className="btn-gold flex-1"
              onClick={submit}
              disabled={submitting || !form.name || !form.comment}
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {done && (
        <div className="card p-5 mb-6 text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>
            Thank you! Your review is pending approval and will appear once approved.
          </p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--tx2)' }}>Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--tx2)' }}>No reviews yet — be the first to share your thoughts.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {reviews.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{r.customer_name}</p>
                <Stars value={r.rating} size={14} />
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>{r.comment}</p>
              <p className="text-xs mt-2" style={{ color: 'var(--tx2)' }}>
                {new Date(r.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}