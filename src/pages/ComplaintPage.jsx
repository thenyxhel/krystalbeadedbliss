import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSeo } from '../lib/useSeo'
import { friendlyError } from '../lib/utils'
import { whatsappLink } from '../lib/config'
import Icon from '../components/Icon'

export default function ComplaintPage() {
  const [params] = useSearchParams()

  useSeo({
    title: 'Report a problem',
    description: 'Something not right with your order? Tell us and we will put it right.',
  })

  const [form, setForm] = useState({
    orderNumber: params.get('order') ?? '',
    name: '',
    email: '',
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }))

  const valid =
    form.orderNumber.trim().length >= 3 &&
    form.name.trim().length >= 2 &&
    /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email) &&
    form.message.trim().length >= 10

  const submit = async (e) => {
    e.preventDefault()
    if (!valid || submitting) return

    setSubmitting(true)
    setError('')

    const { error: err } = await supabase.from('complaints').insert({
      order_number: form.orderNumber.trim().toUpperCase(),
      customer_name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      message: form.message.trim(),
      status: 'open',
    })

    setSubmitting(false)
    if (err) {
      setError(friendlyError(err, 'We could not send that. Please try again, or message us on WhatsApp.'))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="page-narrow py-20 text-center">
        <span
          className="inline-flex items-center justify-center mb-6"
          style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--clay-wash)' }}
        >
          <Icon name="mail" size={24} className="text-clay" />
        </span>
        <h1 className="h1">We have it.</h1>
        <p className="text-ink-2 mt-4 mx-auto" style={{ maxWidth: '44ch' }}>
          Sorry for the trouble. We read these ourselves and will get back to you within
          24–48 hours on the email you gave us.
        </p>
        <div className="flex gap-2 justify-center mt-8">
          <Link to="/shop" className="btn btn-outline no-underline">
            Back to the shop
          </Link>
          {whatsappLink('Hi! I just reported a problem with my order.') && (
            <a
              href={whatsappLink('Hi! I just reported a problem with my order.')}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost no-underline"
            >
              <Icon name="whatsapp" size={16} />
              Message us too
            </a>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="page-narrow py-12">
      <header className="mb-8">
        <p className="eyebrow mb-2">Something wrong?</p>
        <h1 className="h1">Tell us about it</h1>
        <p className="lede mt-4">
          A missing piece, a broken clasp, the wrong colour — say what happened and we will
          put it right.
        </p>
      </header>

      <form onSubmit={submit} className="card p-6 sm:p-7 flex flex-col gap-5">
        <div>
          <label className="label" htmlFor="order">
            Order number
          </label>
          <input
            id="order"
            className="field"
            style={{ textTransform: 'uppercase' }}
            placeholder="KBB-XXXXXX"
            value={form.orderNumber}
            onChange={(e) => set('orderNumber', e.target.value)}
            required
          />
          <p className="help">
            Not sure? <Link to="/track" className="link">Look it up here.</Link>
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="c-name">
              Your name
            </label>
            <input
              id="c-name"
              className="field"
              autoComplete="name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="c-email">
              Email
            </label>
            <input
              id="c-email"
              type="email"
              inputMode="email"
              className="field"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="c-message">
            What happened?
          </label>
          <textarea
            id="c-message"
            className="field"
            rows={6}
            maxLength={4000}
            style={{ resize: 'vertical' }}
            placeholder="As much detail as you can give us — it helps us fix it faster."
            value={form.message}
            onChange={(e) => set('message', e.target.value)}
            required
          />
          <p className="help">{form.message.length}/4000</p>
        </div>

        {error && (
          <p className="error-text flex items-start gap-2" role="alert">
            <Icon name="alert" size={16} style={{ marginTop: 2 }} />
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={!valid || submitting}>
          {submitting ? (
            <>
              <Icon name="spinner" size={17} className="animate-spin" /> Sending…
            </>
          ) : (
            'Send it'
          )}
        </button>
      </form>
    </div>
  )
}
