import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, friendlyError } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import Icon from '../../components/Icon'

const FILTERS = [
  { key: 'pending', label: 'Waiting on you' },
  { key: 'approved', label: 'Published' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'all', label: 'Everything' },
]

export default function AdminReviews() {
  const { toast } = useToast()
  const [filter, setFilter] = useState('pending')
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    setLoading(true)
    let query = supabase
      .from('reviews')
      .select('*, products(name, slug)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (filter !== 'all') query = query.eq('status', filter)

    const { data, error } = await query
    if (error) toast(friendlyError(error, 'Could not load reviews.'), 'bad')
    setReviews(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const setStatus = async (review, status) => {
    setBusyId(review.id)
    const { error } = await supabase.from('reviews').update({ status }).eq('id', review.id)
    setBusyId(null)

    if (error) {
      toast(friendlyError(error, 'Could not update that review.'), 'bad')
      return
    }
    toast(status === 'approved' ? 'Review published.' : 'Review rejected.')
    load()
  }

  const remove = async (review) => {
    if (!confirm('Delete this review permanently?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', review.id)
    if (error) toast(friendlyError(error), 'bad')
    else {
      toast('Review deleted.')
      load()
    }
  }

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow mb-2">Moderation</p>
        <h1 className="h1">Reviews</h1>
        <p className="text-sm text-ink-2 mt-2">
          Nothing appears on the shop until you approve it.
        </p>
      </header>

      <div className="flex gap-2 flex-wrap mb-6" role="group" aria-label="Filter reviews">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" className="chip" aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 120 }} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="card p-10 text-center">
          <Icon name="star" size={24} className="mx-auto text-ink-3" />
          <p className="text-sm text-ink-3 mt-3">
            {filter === 'pending' ? 'Nothing waiting. All caught up.' : 'Nothing here.'}
          </p>
        </div>
      ) : (
        <ul className="list-none p-0 m-0 grid lg:grid-cols-2 gap-4">
          {reviews.map((r) => (
            <li key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.customer_name}</p>
                  <p className="meta">on {r.products?.name ?? 'a deleted product'}</p>
                </div>
                <span className="inline-flex gap-0.5" role="img" aria-label={`${r.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Icon
                      key={n}
                      name="star"
                      size={14}
                      style={{ color: 'var(--brass)', fill: n <= r.rating ? 'var(--brass)' : 'none' }}
                    />
                  ))}
                </span>
              </div>

              <p className="text-sm text-ink-2 mt-3">{r.comment}</p>

              <div className="flex items-center justify-between gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                <p className="meta">{formatDate(r.created_at)}</p>
                <div className="flex gap-1.5">
                  {r.status !== 'approved' && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r, 'approved')}
                    >
                      <Icon name="check" size={14} />
                      Publish
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      disabled={busyId === r.id}
                      onClick={() => setStatus(r, 'rejected')}
                    >
                      Reject
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--bad)' }}
                    onClick={() => remove(r)}
                    aria-label="Delete review"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
