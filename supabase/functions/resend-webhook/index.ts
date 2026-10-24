// ═══════════════════════════════════════════════════════════════════════════
//  resend-webhook — records what Resend did with each message
//
//  Resend POSTs an event here whenever a message is delivered, bounces, is
//  marked as spam, or is delayed. Each one lands in public.email_events, so
//  "did that receipt arrive?" becomes a SQL question instead of a trip to a
//  dashboard — and a send that silently failed finally leaves a trace.
//
//  WHY THIS IS A SEPARATE FUNCTION
//  ───────────────────────────────
//  `notify` is called by our own database and authenticates with a shared
//  secret we chose. This one is called by Resend, which authenticates with
//  Svix signatures over the raw body. Different caller, different trust
//  model, so they do not share an entrypoint.
//
//  verify_jwt is OFF: Resend has no Supabase JWT to offer. The signature is
//  the authentication, and an unsigned request is refused.
// ═══════════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const WEBHOOK_SECRET = Deno.env.get('RESEND_WEBHOOK_SECRET') ?? ''
// Injected into every Edge Function by Supabase; never set these by hand.
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

/** Constant time: a plain === on a signature leaks it byte by byte. */
const safeEqual = (a: string, b: string) => {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

const b64ToBytes = (b64: string) =>
  Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

const bytesToB64 = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))

/**
 * Svix signature check, which is what Resend uses.
 *
 * The signature covers `${id}.${timestamp}.${body}` — the RAW body, which is
 * why this reads req.text() and parses afterwards. Re-serialising the JSON
 * first would change a byte somewhere and fail every time.
 */
async function verify(raw: string, headers: Headers): Promise<boolean> {
  const id = headers.get('svix-id')
  const ts = headers.get('svix-timestamp')
  const sigHeader = headers.get('svix-signature')
  if (!id || !ts || !sigHeader) return false

  // Reject replays. Svix recommends a five minute tolerance.
  const age = Math.abs(Date.now() / 1000 - Number(ts))
  if (!Number.isFinite(age) || age > 300) return false

  const secret = WEBHOOK_SECRET.startsWith('whsec_')
    ? WEBHOOK_SECRET.slice(6)
    : WEBHOOK_SECRET

  const key = await crypto.subtle.importKey(
    'raw',
    b64ToBytes(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${ts}.${raw}`),
  )
  const expected = bytesToB64(signature)

  // The header carries one or more space-separated `v1,<base64>` pairs —
  // more than one while a secret is being rotated.
  return sigHeader
    .split(' ')
    .some((part) => {
      const [version, value] = part.split(',')
      return version === 'v1' && value !== undefined && safeEqual(value, expected)
    })
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!WEBHOOK_SECRET) {
    console.error('RESEND_WEBHOOK_SECRET is not set')
    return new Response('Not configured', { status: 500 })
  }

  const raw = await req.text()

  if (!(await verify(raw, req.headers))) {
    return new Response('Bad signature', { status: 401 })
  }

  let event: Record<string, any>
  try {
    event = JSON.parse(raw)
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  const data = event?.data ?? {}
  const row = {
    resend_id: data.email_id ?? null,
    type: event?.type ?? 'unknown',
    recipient: Array.isArray(data.to) ? data.to.join(', ') : (data.to ?? null),
    subject: data.subject ?? null,
    occurred_at: event?.created_at ?? null,
    payload: event,
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  })

  if (!res.ok) {
    // A non-2xx makes Resend retry, which is what we want: better a
    // duplicate row later than a delivery event lost for good.
    const detail = await res.text().catch(() => '')
    console.error('email_events insert failed:', res.status, detail)
    return new Response('Insert failed', { status: 500 })
  }

  return new Response(JSON.stringify({ ok: true, type: row.type }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
