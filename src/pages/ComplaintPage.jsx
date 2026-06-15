import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ComplaintPage() {
  const [form, setForm] = useState({ orderNumber: '', name: '', email: '', message: '' })
  const [submitting, setSub] = useState(false)
  const [done, setDone]      = useState(false)
  const [error, setError]    = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const valid = form.orderNumber && form.name && form.email && form.message

  const handleSubmit = async () => {
    setSub(true); setError('')
    const { error: err } = await supabase.from('complaints').insert({
      order_number:  form.orderNumber.trim().toUpperCase(),
      customer_name: form.name,
      email:         form.email,
      message:       form.message,
      status:        'open',
    })
    if (err) { setError(err.message); setSub(false); return }
    setDone(true)
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-6 pb-24 text-center">
        <div className="pt-16 pb-8">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: 'var(--tx)' }}>
            Complaint received
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--tx2)' }}>
            We're sorry for the trouble. We'll review your complaint and get back to you
            within 24–48 hours.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 pb-24">
      <div className="pt-4 pb-8">
        <p className="section-eyebrow">Something went wrong?</p>
        <h1 className="section-title">File a Complaint</h1>
        <p className="text-sm mt-2" style={{ color: 'var(--tx2)' }}>
          We'll look into it and get back to you as soon as possible.
        </p>
      </div>

      <div className="card p-6 flex flex-col gap-4">
        <div>
          <label className="label">Order Number</label>
          <input
            className="input"
            placeholder="KBB-XXXXXX"
            value={form.orderNumber}
            onChange={e => set('orderNumber', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Your Name</label>
          <input
            className="input"
            placeholder="Full name"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>
        <div>
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            placeholder="you@email.com"
            value={form.email}
            onChange={e => set('email', e.target.value)}
          />
        </div>
        <div>
          <label className="label">What happened?</label>
          <textarea
            className="input resize-none"
            rows={5}
            placeholder="Describe the issue in as much detail as possible…"
            value={form.message}
            onChange={e => set('message', e.target.value)}
          />
        </div>

        {error && <p className="text-sm" style={{ color: 'var(--pink)' }}>{error}</p>}

        <button
          className="btn-gold w-full"
          disabled={!valid || submitting}
          onClick={handleSubmit}
          style={{ opacity: valid && !submitting ? 1 : 0.45 }}
        >
          {submitting ? 'Submitting…' : 'Submit Complaint'}
        </button>
      </div>
    </div>
  )
}
