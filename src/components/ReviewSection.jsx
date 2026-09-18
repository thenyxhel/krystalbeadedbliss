import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError, formatDate } from '../lib/utils'
import { useToast } from './Toast'
import Icon from './Icon'

function Stars({ value, size = 16 }) {
  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon
          key={n}
          name="star"
          size={size}
          style={{ color: 'var(--brass)', fill: n <= value ? 'var(--brass)' : 'none' }}
        />
      ))}
    </span>
  )
}

/**
 * A real radio group, not five buttons.
 *
 * The old star picker was a row of <button>s with no grouping, no label and
 * no selected state exposed — a keyboard user could tab through five
 * identical unlabelled controls and never learn which one was chosen.
 */
function StarPicker({ value, onChange }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="label">Rating</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <label
            key={n}
            className="cursor-pointer"
            style={{ lineHeight: 0, padding: 2 }}
            title={`${n} star${n === 1 ? '' : 's'}`}
          >
            <input
              type="radio"
              name="rating"
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
              className="sr-only"
            />
            <Icon
              name="star"
              size={26}
              style={{ color: 'var(--brass)', fill: n <= value ? 'var(--brass)' : 'none' }}
            />
            <span className="sr-only">
              {n} star{n === 1 ? '' : 's'}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function ReviewSection({ productId, productName }) {
  const { toast } = useToast()

  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', rating: 5, comment: '' })

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    supabase
      .from('reviews')
      .select('id, customer_name, rating, comment, created_at')
      .eq('product_id', productId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('[KBB] reviews:', error)
        setReviews(data ?? [])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null

  const valid = form.name.trim().length >= 2 && form.comment.trim().length >= 4

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || submitting) return

    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      product_id: productId,
      customer_name: form.name.trim(),
      rating: form.rating,
      comment: form.comment.trim(),
      status: 'pending', // RLS enforces this too — belt and braces.
    })
    setSubmitting(false)

    if (error) {
      toast(friendlyError(error, 'We could not save your review. Please try again.'), 'bad')
      return
    }

    setSubmitted(true)
    setShowForm(false)
    setForm({ name: '', rating: 5, comment: '' })
    toast('Thank you — your review will appear once we have read it.')
  }

  return (
    <section className="mt-20" aria-labelledby="reviews-heading">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <p className="eyebrow mb-2">In their words</p>
          <h2 className="h2" id="reviews-heading">
            Reviews
          </h2>
          {average !== null && (
            <p className="flex items-center gap-2 mt-2 text-sm text-ink-2">
              <Stars value={Math.round(average)} size={15} />
              <span className="numeric font-semibold text-ink">{average.toFixed(1)}</span>
              <span className="text-ink-3">
                ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
              </span>
            </p>
          )}
        </div>

        {!showForm && !submitted && (
          <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(true)}>
            Write a review
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={submit} className="card p-6 mb-8 animate-rise">
          <p className="text-sm text-ink-2 mb-5">
            Reviewing <span className="text-ink font-medium">{productName}</span>. We read every
            one before it goes up.
          </p>

          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="review-name">
                Your name
              </label>
              <input
                id="review-name"
                className="field"
                value={form.name}
                maxLength={60}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="How you want to be credited"
                required
              />
            </div>
            <StarPicker value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
          </div>

          <div className="mt-5">
            <label className="label" htmlFor="review-comment">
              Your review
            </label>
            <textarea
              id="review-comment"
              className="field"
              rows={4}
              maxLength={1000}
              style={{ resize: 'vertical' }}
              value={form.comment}
              onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
              placeholder="What did you think of it?"
              required
            />
            <p className="help">{form.comment.length}/1000</p>
          </div>

          <div className="flex gap-2 mt-5">
            <button type="submit" className="btn btn-primary btn-sm" disabled={!valid || submitting}>
              {submitting ? 'Sending…' : 'Submit review'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 92 }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-ink-3">
          No reviews yet. If you have one of these, you would be the first.
        </p>
      ) : (
        <ul className="list-none p-0 m-0 grid sm:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{r.customer_name}</p>
                <Stars value={r.rating} size={14} />
              </div>
              <p className="text-sm text-ink-2 mt-2.5">{r.comment}</p>
              <p className="meta mt-3">{formatDate(r.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
