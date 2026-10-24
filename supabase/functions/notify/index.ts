// ═══════════════════════════════════════════════════════════════════════════
//  notify — transactional email for Krystal Beaded Bliss
//
//  Fired by an AFTER INSERT trigger on orders, custom_orders and complaints
//  (see supabase/schema.sql, "EMAIL NOTIFICATIONS"). Sends through Resend.
//
//  AUTH
//  ────
//  verify_jwt is OFF, because the caller is Postgres, not a signed-in user,
//  and the only JWT the database could offer is the anon key — which ships
//  in the browser bundle and therefore proves nothing. Instead the trigger
//  sends a shared secret in x-hook-secret, compared here in constant time.
//
//  FAILURE
//  ───────
//  A failed send must never fail the order. pg_net is fire-and-forget, so the
//  insert has already committed by the time we run; we log loudly and return
//  a non-2xx so the failure shows up in the Edge Function logs.
// ═══════════════════════════════════════════════════════════════════════════

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const RESEND_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const HOOK_SECRET = Deno.env.get('NOTIFY_HOOK_SECRET') ?? ''

// Overridable without a redeploy, but sensible out of the box.
const FROM = Deno.env.get('RESEND_FROM') ?? 'Krystal Beaded Bliss <support@kbbjewelries.com>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') ?? 'thenyxhel@gmail.com'
// Until a real mailbox exists on the domain, replies need somewhere to land.
const REPLY_TO = Deno.env.get('REPLY_TO') ?? ADMIN_EMAIL
const SITE = Deno.env.get('SITE_URL') ?? 'https://kbbjewelries.com'

/** ₦8,500 — matches formatNaira() in src/lib/utils.js. */
const naira = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? '₦' + n.toLocaleString('en-NG', { maximumFractionDigits: 0 }) : '₦—'
}

/** Bodies interpolate customer-supplied text, so every value is escaped. */
const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/** Length-independent comparison: a plain === leaks the secret byte by byte. */
const safeEqual = (a: string, b: string) => {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i]
  return diff === 0
}

// ── Shared chrome ──────────────────────────────────────────────────────────

const BRAND = '#8c6239'

const shell = (title: string, body: string) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#faf7f4;font-family:ui-sans-serif,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#2b2320;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #ece4dc;border-radius:14px;">
    <tr><td style="padding:28px 28px 0;text-align:center;">
      <div style="font-size:19px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:${BRAND};">Krystal Beaded Bliss</div>
      <div style="height:1px;background:#ece4dc;margin:20px 0 0;"></div>
    </td></tr>
    <tr><td style="padding:26px 28px 30px;font-size:15px;line-height:1.65;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;">${title}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:0 28px 26px;">
      <div style="height:1px;background:#ece4dc;margin-bottom:16px;"></div>
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8b7d72;">
        <a href="${SITE}" style="color:${BRAND};text-decoration:none;">kbbjewelries.com</a>
        &nbsp;·&nbsp; Handmade beaded jewellery, made to order.
      </p>
    </td></tr>
  </table>
</body></html>`

const row = (label: string, value: string) =>
  `<tr>
     <td style="padding:7px 0;color:#8b7d72;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(label)}</td>
     <td style="padding:7px 0 7px 18px;font-size:14px;vertical-align:top;">${value}</td>
   </tr>`

const table = (rows: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 18px;">${rows}</table>`

const callout = (text: string) =>
  `<div style="margin:18px 0;padding:14px 16px;background:#faf7f4;border-left:3px solid ${BRAND};border-radius:0 8px 8px 0;font-size:14px;line-height:1.6;">${text}</div>`

// ── Line items ─────────────────────────────────────────────────────────────

type Line = { name?: string; price?: number; quantity?: number }

const itemsTable = (items: Line[], subtotal: unknown, delivery: unknown, total: unknown) => {
  const lines = items
    .map(
      (i) => `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #f2ebe4;font-size:14px;">
          ${esc(i.name)}<span style="color:#8b7d72;"> × ${esc(i.quantity)}</span>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #f2ebe4;font-size:14px;text-align:right;white-space:nowrap;">
          ${naira(Number(i.price) * Number(i.quantity))}
        </td>
      </tr>`,
    )
    .join('')

  const totalRow = (label: string, value: string, bold = false) =>
    `<tr>
       <td style="padding:${bold ? '12' : '6'}px 0 0;font-size:14px;${bold ? 'font-weight:700;' : 'color:#8b7d72;'}">${label}</td>
       <td style="padding:${bold ? '12' : '6'}px 0 0;font-size:${bold ? '16' : '14'}px;text-align:right;white-space:nowrap;${bold ? `font-weight:700;color:${BRAND};` : 'color:#8b7d72;'}">${value}</td>
     </tr>`

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 18px;">
    ${lines}
    ${totalRow('Subtotal', naira(subtotal))}
    ${totalRow('Delivery', Number(delivery) === 0 ? 'Free' : naira(delivery))}
    ${totalRow('Total', naira(total), true)}
  </table>`
}

/** custom_orders.configuration — built by place_custom_order(). */
const configRows = (cfg: Record<string, unknown>) => {
  const list = (v: unknown) => (Array.isArray(v) && v.length ? v.map(esc).join(', ') : null)
  return [
    cfg.style ? row('Style', esc(cfg.style)) : '',
    list(cfg.bead_types) ? row('Beads', list(cfg.bead_types)!) : '',
    cfg.color ? row('Colour', esc(cfg.color)) : '',
    list(cfg.charms) ? row('Charms', list(cfg.charms)!) : '',
    cfg.quantity ? row('Quantity', esc(cfg.quantity)) : '',
    cfg.notes ? row('Notes', esc(cfg.notes)) : '',
  ].join('')
}

// ── The emails ─────────────────────────────────────────────────────────────

type Mail = { to: string; subject: string; html: string; replyTo?: string }

function buildOrderMails(r: Record<string, any>, custom: boolean): Mail[] {
  const num = esc(r.order_number)
  const isGift = r.is_gift === true

  const detail = custom
    ? table(
        row('Order number', `<strong>${num}</strong>`) +
          row('Piece', esc(r.piece_type)) +
          configRows(r.configuration ?? {}) +
          row('Estimate', `<strong style="color:${BRAND};">${naira(r.estimated_price)}</strong>`),
      )
    : itemsTable(Array.isArray(r.items) ? r.items : [], r.subtotal, r.delivery_fee, r.total)

  const giftBlock = isGift
    ? callout(
        `This one ships as a gift to <strong>${esc(r.recipient_name)}</strong>` +
          (r.gift_note
            ? `, with your note tucked inside:<br><em style="color:#5c514a;">&ldquo;${esc(r.gift_note)}&rdquo;</em>`
            : '.'),
      )
    : ''

  const orderNumberBlock = custom
    ? ''
    : `<p style="margin:0 0 4px;color:#8b7d72;font-size:13px;">Order number</p>
       <p style="margin:0 0 14px;font-size:18px;font-weight:700;letter-spacing:.04em;">${num}</p>`

  const intro = custom
    ? `We have your custom ${esc(r.piece_type)} request. The estimate below is confirmed by hand before we begin &mdash; we&rsquo;ll be in touch shortly.`
    : 'We have your order and your payment receipt. Here is what you bought.'

  // 1 ─ Customer receipt
  const customerHtml = shell(
    custom ? 'Your custom request is in' : 'Thank you for your order',
    `<p style="margin:0 0 6px;">Hi ${esc(r.customer_name)},</p>
     <p style="margin:0 0 18px;color:#5c514a;">${intro}</p>
     ${orderNumberBlock}
     ${detail}
     ${giftBlock}
     ${callout(
       `<strong>What happens next.</strong><br>We confirm your payment, then your piece is made and dispatched. Keep order number <strong>${num}</strong> &mdash; you can track it any time at <a href="${SITE}/track" style="color:${BRAND};">kbbjewelries.com/track</a>.`,
     )}
     <p style="margin:18px 0 0;color:#5c514a;">Thank you for supporting handmade. &#10024;</p>`,
  )

  // 2 ─ Admin alert
  const shipping = custom
    ? ''
    : row('Deliver to', `${esc(r.address)}<br>${esc(r.state)}`) +
      (isGift ? row('Gift for', esc(r.recipient_name)) : '') +
      (r.gift_note ? row('Gift note', `<em>&ldquo;${esc(r.gift_note)}&rdquo;</em>`) : '') +
      (r.notes ? row('Notes', esc(r.notes)) : '')

  const contact = table(
    row('Order number', `<strong>${num}</strong>`) +
      row('Customer', esc(r.customer_name)) +
      row('Email', `<a href="mailto:${esc(r.email)}" style="color:${BRAND};">${esc(r.email)}</a>`) +
      row('Phone', `<a href="tel:${esc(r.phone)}" style="color:${BRAND};">${esc(r.phone)}</a>`) +
      shipping,
  )

  const value = custom ? r.estimated_price : r.total

  const adminHtml = shell(
    custom ? `New custom request &mdash; ${naira(value)}` : `New order &mdash; ${naira(value)}`,
    `${contact}
     ${detail}
     ${callout(
       custom
         ? `Confirm the estimate, then move it along in <a href="${SITE}/admin/custom-orders" style="color:${BRAND};">the admin panel</a>.`
         : `Check the payment receipt and confirm it in <a href="${SITE}/admin/orders" style="color:${BRAND};">the admin panel</a>.`,
     )}`,
  )

  return [
    {
      to: r.email,
      replyTo: REPLY_TO,
      subject: custom
        ? `Your custom request ${num} — Krystal Beaded Bliss`
        : `Order ${num} confirmed — Krystal Beaded Bliss`,
      html: customerHtml,
    },
    {
      to: ADMIN_EMAIL,
      replyTo: r.email,
      subject: custom ? `Custom request ${num} · ${naira(value)}` : `New order ${num} · ${naira(value)}`,
      html: adminHtml,
    },
  ]
}

// 5 ─ Status changes. A customer who pays and then hears nothing until the
//     parcel lands writes to the complaint form instead; these two mails are
//     cheaper than the complaint they prevent.
//
//     Only 'confirmed' and 'shipped' are worth an email. 'processing' says
//     nothing the customer can act on, and 'delivered' arrives after they
//     already have the box in their hands. The trigger filters too, but this
//     returns [] for anything else so neither side has to be trusted alone.
function buildStatusMails(r: Record<string, any>, custom: boolean): Mail[] {
  const num = esc(r.order_number)
  const status = String(r.status ?? '')

  const what = custom
    ? `your custom ${esc(r.piece_type)}`
    : 'your order'

  let title: string
  let subject: string
  let body: string

  if (status === 'confirmed') {
    title = 'Payment confirmed'
    subject = `Order ${num} confirmed — we're making it`
    body = `<p style="margin:0 0 16px;color:#5c514a;">
        Your payment for <strong>${num}</strong> has been checked and confirmed, and ${what}
        is now being made by hand. We&rsquo;ll email you again the moment it&rsquo;s on its way.
      </p>`
  } else if (status === 'shipped') {
    title = 'On its way'
    subject = `Order ${num} is on its way`
    body = `<p style="margin:0 0 16px;color:#5c514a;">
        Good news &mdash; ${what} has left us and is on its way to you.
      </p>
      ${
        r.is_gift === true && r.recipient_name
          ? `<p style="margin:0 0 16px;color:#5c514a;">It&rsquo;s heading to <strong>${esc(r.recipient_name)}</strong>, with your note inside.</p>`
          : ''
      }`
  } else {
    return []
  }

  const html = shell(
    title,
    `<p style="margin:0 0 6px;">Hi ${esc(r.customer_name)},</p>
     ${body}
     ${table(
       row('Order number', `<strong>${num}</strong>`) +
         row('Status', esc(status)) +
         (custom ? row('Piece', esc(r.piece_type)) : row('Total', naira(r.total))),
     )}
     ${callout(
       `Track it any time at <a href="${SITE}/track" style="color:${BRAND};">kbbjewelries.com/track</a> with order number <strong>${num}</strong>.`,
     )}
     <p style="margin:18px 0 0;color:#5c514a;">
       Anything not right? Just reply to this email.
     </p>`,
  )

  // Customer only: the admin changed the status, so they already know.
  return [{ to: r.email, replyTo: REPLY_TO, subject, html }]
}

// 3 ─ Complaint acknowledgement, plus an alert — a complaint nobody is told
//     about is worse than having no complaint form at all.
function buildComplaintMails(r: Record<string, any>): Mail[] {
  const num = esc(r.order_number)

  const customerHtml = shell(
    'We&rsquo;ve got your message',
    `<p style="margin:0 0 6px;">Hi ${esc(r.customer_name)},</p>
     <p style="margin:0 0 16px;color:#5c514a;">
       Thank you for telling us &mdash; we&rsquo;d rather hear it than not. Your message about order
       <strong>${num}</strong> is with us now, and you&rsquo;ll get a reply on this address within 24&ndash;48 hours.
     </p>
     ${callout(`<strong>What you told us</strong><br><em style="color:#5c514a;">&ldquo;${esc(r.message)}&rdquo;</em>`)}
     <p style="margin:16px 0 0;color:#5c514a;">We&rsquo;ll make it right.</p>`,
  )

  const adminHtml = shell(
    `Complaint &mdash; order ${num}`,
    `${table(
      row('Order number', `<strong>${num}</strong>`) +
        row('Customer', esc(r.customer_name)) +
        row('Email', `<a href="mailto:${esc(r.email)}" style="color:${BRAND};">${esc(r.email)}</a>`),
    )}
     ${callout(`<em style="color:#5c514a;">&ldquo;${esc(r.message)}&rdquo;</em>`)}
     <p style="margin:16px 0 0;font-size:14px;">
       Respond in <a href="${SITE}/admin/complaints" style="color:${BRAND};">the admin panel</a> &mdash; the customer was promised 24&ndash;48 hours.
     </p>`,
  )

  return [
    {
      to: r.email,
      replyTo: REPLY_TO,
      subject: `We received your message about order ${num}`,
      html: customerHtml,
    },
    { to: ADMIN_EMAIL, replyTo: r.email, subject: `Complaint · order ${num}`, html: adminHtml },
  ]
}

// 4 ─ The reply itself. ComplaintPage promises an answer "on the email you
//     gave us" within 24–48 hours; until this existed, the admin's response
//     was written to the database and the customer was never told.
//     Fired by UPDATE, only when admin_response first becomes non-empty.
function buildComplaintReplyMails(r: Record<string, any>): Mail[] {
  const num = esc(r.order_number)

  const html = shell(
    'About your order',
    `<p style="margin:0 0 6px;">Hi ${esc(r.customer_name)},</p>
     <p style="margin:0 0 16px;color:#5c514a;">
       Thank you for your patience. Here is our reply about order <strong>${num}</strong>.
     </p>
     ${callout(esc(r.admin_response).replace(/\n/g, '<br>'))}
     <p style="margin:18px 0 8px;font-size:13px;color:#8b7d72;">What you told us</p>
     <p style="margin:0 0 16px;font-size:14px;color:#8b7d72;">
       <em>&ldquo;${esc(r.message)}&rdquo;</em>
     </p>
     <p style="margin:16px 0 0;color:#5c514a;">
       If this hasn&rsquo;t settled it, just reply to this email and we&rsquo;ll keep going until it&rsquo;s right.
     </p>`,
  )

  return [
    {
      to: r.email,
      replyTo: REPLY_TO,
      subject: `Re: your message about order ${num}`,
      html,
    },
  ]
}

// ── Send ───────────────────────────────────────────────────────────────────

async function send(mail: Mail) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [mail.to],
      subject: mail.subject,
      html: mail.html,
      ...(mail.replyTo ? { reply_to: [mail.replyTo] } : {}),
    }),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(body)}`)
  return body?.id as string | undefined
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  if (!HOOK_SECRET || !safeEqual(req.headers.get('x-hook-secret') ?? '', HOOK_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!RESEND_KEY) {
    console.error('RESEND_API_KEY is not set')
    return new Response('Not configured', { status: 500 })
  }

  let payload: { table?: string; type?: string; record?: Record<string, any> }
  try {
    payload = await req.json()
  } catch {
    return new Response('Bad JSON', { status: 400 })
  }

  const { table: tbl, type, record } = payload
  if (!record) return new Response('No record', { status: 400 })

  let mails: Mail[]
  switch (tbl) {
    // INSERT is the receipt; UPDATE is a status change.
    case 'orders':
      mails = type === 'UPDATE' ? buildStatusMails(record, false) : buildOrderMails(record, false)
      break
    case 'custom_orders':
      mails = type === 'UPDATE' ? buildStatusMails(record, true) : buildOrderMails(record, true)
      break
    case 'complaints':
      // INSERT is the acknowledgement; UPDATE is the admin's actual reply.
      // The trigger's WHEN clause guarantees admin_response is set here.
      mails = type === 'UPDATE' ? buildComplaintReplyMails(record) : buildComplaintMails(record)
      break
    default:
      return new Response(`Unhandled table: ${tbl}`, { status: 400 })
  }

  // A status with no email of its own (processing, delivered) lands here.
  // Not an error — there was simply nothing worth saying.
  if (mails.length === 0) {
    return new Response(JSON.stringify({ table: tbl, sent: 0, skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Settled, not all: the admin alert must still go out if the customer's
  // address bounces, and the other way round.
  const results = await Promise.allSettled(mails.map(send))
  const failed = results.filter((r) => r.status === 'rejected')

  for (const f of failed) console.error(`[${tbl}] send failed:`, (f as PromiseRejectedResult).reason)

  return new Response(
    JSON.stringify({ table: tbl, sent: results.length - failed.length, failed: failed.length }),
    { status: failed.length ? 500 : 200, headers: { 'Content-Type': 'application/json' } },
  )
})
