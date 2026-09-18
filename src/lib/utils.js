/** ₦8,500 — tabular figures are applied via the .numeric class in CSS. */
export const fmt = (n) => {
  const value = Number(n)
  if (!Number.isFinite(value)) return '₦—'
  return '₦' + value.toLocaleString('en-NG', { maximumFractionDigits: 0 })
}

export const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')

export const clamp = (s, n = 100) => (s?.length > n ? s.slice(0, n).trimEnd() + '…' : s ?? '')

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const formatDate = (value, opts = {}) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

/**
 * Status presentation, in one place. `tone` maps onto the badge classes in
 * index.css so status colour is a token decision, not a per-page decision.
 */
export const STATUS_META = {
  pending:    { label: 'Order received',  tone: 'warn',  blurb: 'We have your order and are checking your payment.' },
  confirmed:  { label: 'Payment confirmed', tone: 'ok',  blurb: 'Payment verified. Your piece is queued to be made.' },
  processing: { label: 'Being made',      tone: 'ok',    blurb: 'Your piece is on the bench being strung by hand.' },
  shipped:    { label: 'On the way',      tone: 'ok',    blurb: 'Your order has left us and is on its way to you.' },
  delivered:  { label: 'Delivered',       tone: 'ok',    blurb: 'Delivered. We hope you love it.' },
  cancelled:  { label: 'Cancelled',       tone: 'bad',   blurb: 'This order was cancelled. Message us if that is a surprise.' },
  open:       { label: 'Open',            tone: 'warn',  blurb: '' },
  in_review:  { label: 'In review',       tone: 'warn',  blurb: '' },
  resolved:   { label: 'Resolved',        tone: 'ok',    blurb: '' },
}

export const statusMeta = (status) =>
  STATUS_META[status] ?? { label: cap(status ?? 'unknown'), tone: 'muted', blurb: '' }

/**
 * Turn a Supabase/Postgres error into something a customer can act on.
 *
 * Our RPCs raise friendly messages deliberately (errcode 22000). Anything
 * else is an internal failure and gets a generic line — leaking raw Postgres
 * text to a shopper is both confusing and a small information disclosure.
 */
export const friendlyError = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback
  const msg = error.message ?? String(error)

  if (error.code === '22000' || /^Please |^Your cart|^Only |^Unknown |no longer/i.test(msg)) {
    return msg.replace(/^ERROR:\s*/i, '')
  }
  if (error.code === 'PGRST301' || /JWT|not authorized|permission denied/i.test(msg)) {
    return 'You do not have permission to do that.'
  }
  if (/Failed to fetch|NetworkError/i.test(msg)) {
    return 'We could not reach the server. Check your connection and try again.'
  }
  return fallback
}

/** Unguessable object name for an uploaded receipt. */
export const receiptPath = (file) => {
  const ext = (file?.name?.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  const now = new Date()
  return `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${id}.${ext}`
}
