import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast, ToastContainer } from '../../components/Toast'

const STATUS_COLORS = { open: '#EAB308', in_review: '#3B82F6', resolved: '#22C55E' }

export default function AdminComplaints() {
  const { toasts, toast } = useToast()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoad]          = useState(true)
  const [selected, setSelected]     = useState(null)
  const [response, setResponse]     = useState('')
  const [filter, setFilter]         = useState('all')
  const [saving, setSaving]         = useState(false)

  const load = async () => {
    setLoad(true)
    let q = supabase.from('complaints').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') q = q.eq('status', filter)
    const { data } = await q
    setComplaints(data || [])
    setLoad(false)
  }

  useEffect(() => { load() }, [filter])

  const open = (c) => { setSelected(c); setResponse(c.admin_response || '') }

  const handleSave = async (status) => {
    setSaving(true)
    const { error } = await supabase.from('complaints')
      .update({ status, admin_response: response || null })
      .eq('id', selected.id)
    setSaving(false)
    if (error) toast(error.message, 'error')
    else { toast('Complaint updated!'); load(); setSelected(s => ({ ...s, status, admin_response: response })) }
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />

      <div className="mb-8">
        <p className="section-eyebrow">Support</p>
        <h1 className="section-title">Complaints</h1>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['all', 'open', 'in_review', 'resolved'].map(s => (
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
            {s === 'all' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* List */}
        <div className="md:col-span-2 card overflow-hidden">
          {loading ? (
            <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>Loading…</p>
          ) : complaints.length === 0 ? (
            <p className="p-5 text-sm" style={{ color: 'var(--tx2)' }}>No complaints found.</p>
          ) : complaints.map((c, i) => (
            <button
              key={c.id}
              onClick={() => open(c)}
              className="w-full text-left p-4 transition-colors"
              style={{
                borderBottom: i < complaints.length - 1 ? '1px solid var(--bd)' : 'none',
                background: selected?.id === c.id ? 'var(--goldl)' : 'transparent',
                border: 'none', display: 'block',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--gold)' }}>{c.order_number}</span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full text-white capitalize"
                  style={{ background: STATUS_COLORS[c.status] || '#555' }}
                >
                  {c.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{c.customer_name}</p>
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--tx2)' }}>{c.message}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--tx2)' }}>
                {new Date(c.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
              </p>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="md:col-span-3">
          {!selected ? (
            <div className="card p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--tx2)' }}>Select a complaint to view and respond.</p>
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
                  {selected.status.replace('_', ' ')}
                </span>
              </div>

              {/* Customer */}
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--surf2)' }}>
                {[['Name', selected.customer_name], ['Email', selected.email]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--bd)' }}>
                    <span className="text-xs" style={{ color: 'var(--tx2)' }}>{k}</span>
                    <span className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Message */}
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx2)' }}>
                  Customer's Message
                </p>
                <div className="rounded-xl p-4" style={{ background: 'var(--surf2)' }}>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tx)' }}>{selected.message}</p>
                </div>
              </div>

              {/* Response */}
              <div className="mb-5">
                <label className="label">Your Response (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={4}
                  placeholder="Write a response to the customer…"
                  value={response}
                  onChange={e => setResponse(e.target.value)}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSave('in_review')}
                  disabled={saving}
                  className="text-xs font-bold px-3 py-2 rounded-full text-white"
                  style={{ background: STATUS_COLORS.in_review, border: 'none' }}
                >
                  Mark In Review
                </button>
                <button
                  onClick={() => handleSave('resolved')}
                  disabled={saving}
                  className="text-xs font-bold px-3 py-2 rounded-full text-white"
                  style={{ background: STATUS_COLORS.resolved, border: 'none' }}
                >
                  Mark Resolved
                </button>
                {response && (
                  <button
                    onClick={() => handleSave(selected.status)}
                    disabled={saving}
                    className="text-xs font-bold px-3 py-2 rounded-full"
                    style={{ background: 'var(--surf2)', color: 'var(--tx)', border: 'none' }}
                  >
                    Save Response
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
