import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDate, friendlyError, statusMeta } from '../../lib/utils'
import { useToast } from '../../components/Toast'
import Icon from '../../components/Icon'

const FILTERS = ['open', 'in_review', 'resolved', 'all']

export default function AdminComplaints() {
  const { toast } = useToast()

  const [filter, setFilter] = useState('open')
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [response, setResponse] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    let query = supabase.from('complaints').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter !== 'all') query = query.eq('status', filter)

    const { data, error } = await query
    if (error) toast(friendlyError(error, 'Could not load complaints.'), 'bad')
    setComplaints(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    setSelected(null)
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  useEffect(() => {
    setResponse(selected?.admin_response ?? '')
  }, [selected])

  const save = async (status) => {
    setSaving(true)
    const { error } = await supabase
      .from('complaints')
      .update({ status, admin_response: response.trim() || null })
      .eq('id', selected.id)
    setSaving(false)

    if (error) {
      toast(friendlyError(error, 'Could not save.'), 'bad')
      return
    }
    toast('Complaint updated.')
    setSelected((s) => ({ ...s, status, admin_response: response.trim() || null }))
    load()
  }

  return (
    <div>
      <header className="mb-7">
        <p className="eyebrow mb-2">Support</p>
        <h1 className="h1">Complaints</h1>
      </header>

      <div className="flex gap-2 flex-wrap mb-6" role="group" aria-label="Filter complaints">
        {FILTERS.map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'Everything' : statusMeta(f).label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 card overflow-hidden">
          {loading ? (
            <p className="p-5 text-sm text-ink-3">Loading…</p>
          ) : complaints.length === 0 ? (
            <p className="p-5 text-sm text-ink-3">
              {filter === 'open' ? 'No open complaints. Good day.' : 'Nothing here.'}
            </p>
          ) : (
            <ul className="list-none p-0 m-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {complaints.map((c, i) => {
                const meta = statusMeta(c.status)
                const active = selected?.id === c.id
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      aria-current={active}
                      className="w-full text-left px-5 py-4"
                      style={{
                        background: active ? 'var(--surface-2)' : 'transparent',
                        border: 'none',
                        borderBottom: i < complaints.length - 1 ? '1px solid var(--line)' : undefined,
                        borderLeft: `2px solid ${active ? 'var(--clay)' : 'transparent'}`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="numeric text-sm font-semibold" style={{ color: 'var(--brass)' }}>
                          {c.order_number}
                        </span>
                        <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                      </div>
                      <p className="text-sm mt-1.5">{c.customer_name}</p>
                      <p className="meta mt-0.5 line-clamp-1">{c.message}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="lg:col-span-7">
          {!selected ? (
            <div className="card p-10 text-center">
              <Icon name="chat" size={26} className="mx-auto text-ink-3" />
              <p className="text-sm text-ink-3 mt-3">Choose a complaint to read it.</p>
            </div>
          ) : (
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow mb-1">Order</p>
                  <p className="numeric font-display" style={{ fontSize: '1.375rem', fontWeight: 500, color: 'var(--brass)' }}>
                    {selected.order_number}
                  </p>
                </div>
                <span className={`badge badge-${statusMeta(selected.status).tone}`}>
                  {statusMeta(selected.status).label}
                </span>
              </div>

              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 mt-5 text-sm">
                <div>
                  <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
                    From
                  </p>
                  <p>{selected.customer_name}</p>
                </div>
                <div>
                  <p className="eyebrow" style={{ fontSize: '0.625rem' }}>
                    Email
                  </p>
                  <a href={`mailto:${selected.email}`} className="link no-underline break-words">
                    {selected.email}
                  </a>
                </div>
              </div>

              <hr className="hairline my-5" />

              <p className="label">What they said</p>
              <div className="well p-4">
                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>
                  {selected.message}
                </p>
              </div>
              <p className="meta mt-2">Received {formatDate(selected.created_at, { weekday: 'short' })}</p>

              <hr className="hairline my-5" />

              <label className="label" htmlFor="response">
                Internal notes / your response
              </label>
              <textarea
                id="response"
                className="field"
                rows={4}
                style={{ resize: 'vertical' }}
                placeholder="What you did about it, what you told them…"
                value={response}
                onChange={(e) => setResponse(e.target.value)}
              />
              <p className="help">
                This is not emailed automatically — reply to them directly, then record it here.
              </p>

              <div className="flex gap-2 flex-wrap mt-5">
                <button type="button" className="btn btn-outline btn-sm" disabled={saving} onClick={() => save('in_review')}>
                  Mark in review
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={saving} onClick={() => save('resolved')}>
                  <Icon name="check" size={14} />
                  Mark resolved
                </button>
                <a href={`mailto:${selected.email}?subject=Your order ${selected.order_number}`} className="btn btn-ghost btn-sm no-underline">
                  <Icon name="mail" size={15} />
                  Email them
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
