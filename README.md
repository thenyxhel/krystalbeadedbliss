# Krystal Beaded Bliss

Hand-strung bead jewellery from Lagos. React + Vite + Tailwind on the front,
Supabase (Postgres, Auth, Storage) on the back, deployed to Vercel.

---

## Read this first if you are upgrading

The previous version had three problems that are not fixed by deploying new
code. You have to act on them.

### 1. `.env` was committed to git

Real Supabase keys and real bank account details are in the history of commits
`b3fba66`, `bfa9774` and `b08de1f`. `.gitignore` now excludes it and the file
has been untracked, but **git history still contains the old values.**

- Move to the new-format publishable key, then **disable the legacy API keys**:
  Dashboard, Settings, API Keys, Legacy API keys, Disable. Switching keys does
  not revoke the old one by itself, and until it is disabled the key sitting in
  those commits still works.
- If this repo was ever pushed anywhere public, treat the bank details as
  published. They are not a secret that can be rotated, so decide whether that
  matters to you.
- To scrub the history entirely you would need `git filter-repo` and a force
  push, which rewrites every commit hash. For a private repo, disabling the old
  key is usually enough.

### 2. Customer payment receipts were world-readable

They were stored in a **public** bucket under `KBB-XXXXXX.jpg` -- the order
number. Anyone who guessed six characters could read a stranger's bank receipt.
`schema.sql` now flips that bucket to private, but **the existing objects are
still there**. Review `payment-receipts` in the Storage dashboard and delete
anything you no longer need.

### 3. Anyone who signed up was an admin

Every RLS policy said `auth.role() = 'authenticated'`, which means *any*
signed-in user, not *your* user. If email signups were enabled, a stranger
could have read every customer's name, phone, email and home address.

- Run the new `supabase/schema.sql`, which scopes everything to an `admins`
  allow-list.
- Then turn signups **off**: Dashboard, Authentication, Providers, Email,
  "Allow new users to sign up" = off.
- Check for accounts you do not recognise under Authentication, Users.

---

## Setup

```bash
npm install
cp .env.example .env     # then fill it in
npm run dev
```

### Environment

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | The publishable key (`sb_publishable_...`). Safe in the browser; RLS is what protects you |
| `VITE_WHATSAPP_NUMBER` | Country code, no `+`, e.g. `2348012345678` |
| `VITE_INSTAGRAM_URL` | Optional; the footer link hides itself if unset |
| `VITE_BANK_NAME` / `_ACCOUNT_NAME` / `_ACCOUNT_NUMBER` | Shown at checkout |
| `VITE_SWEET_SOIREE_URL` | Sister store link |

There is deliberately **no** `VITE_ADMIN_EMAIL`. Admin access is a row in a
database table, not a string the browser can read.

### Database

Run `supabase/schema.sql` in the Supabase SQL editor. It is idempotent, so it is
safe to re-run after edits. The block at the top drops any superseded function
before redefining it, which is what makes a re-run survive a changed signature.

### Make yourself an admin

1. Dashboard, Authentication, Users, *Add user*. Use a strong password.
2. In the SQL editor:

   ```sql
   insert into admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

3. Sign in at `/admin/login` and confirm you land on the dashboard.
4. Turn off public signups.

---

## How this is put together

### Money is decided by the server, never the browser

This is the single most important thing in the codebase.

The cart holds `{ product_id, quantity }` and a display snapshot. Checkout calls
`place_order()`, a `SECURITY DEFINER` Postgres function that looks every price
up in the `products` table, locks the rows (`FOR UPDATE`, so two people cannot
buy the last one), checks stock, decrements it, and writes the order with totals
it computed itself. The same is true of `place_custom_order()`, which prices a
custom piece from `custom_config`.

Consequently the `orders` table has **no public INSERT policy at all**. Editing
localStorage, or posting a handcrafted request, changes nothing.

To prove it to yourself: put something in the cart, set its price to 1 in
localStorage, check out, and look at what the admin panel recorded.

### Authorization is one function

`is_admin()` checks for a row in `admins`. Every admin policy calls it, and so
does the React route guard, so the UI and the database agree on who you are and
the database is the one that decides.

### Receipts are private

Uploaded to a private bucket under a random UUID path. Customers may write and
may never read. Admins view them through 60-second signed URLs minted on demand.

### The design system

Tokens live in `src/index.css` as CSS custom properties and are exposed to
Tailwind in `tailwind.config.js`. **No component should contain a hex code.**
Every text/background pair in both themes meets WCAG AA; the light-mode gold
button in the old design sat at 2.3:1, which is unreadable in daylight.

| | Dark (default) | Light |
|---|---|---|
| `--bg` | `#16120E` | `#FBF7F0` cream |
| `--ink` | `#F2EBDF` | `#1A1714` |
| `--ink-2` | `#BDB2A2` (8.9:1) | `#5C544C` (7.0:1) |
| `--clay` | `#E07A4E` (6.3:1) | `#B4552F` (4.6:1) |
| `--brass` | `#D9B368` (9.4:1) | `#7A6231` (5.4:1) |
| `--sage` | `#9DAB8E` | `#4F5C43` |
| `--band` | `#E8CDB8` (identical in both) | `#E8CDB8` |

Dark is the default. Beads and metal read better against a dark ground, and
light stays one tap away in the header with the choice remembered. The initial
class is set by an inline script in `index.html`, before first paint, so there
is no flash of the wrong theme.

`--band` is the one bright warm strip on the page, used for the reassurance row
under the hero. It carries its own ink tokens so it reads identically in both
themes without anything being re-checked at the call site.

Type is **Fraunces** (display) and **Inter** (UI), two variable families, down
from four. Icons are drawn in `src/components/Icon.jsx`; there are no emoji
anywhere in the product, because emoji cannot take a brand colour and render as
a different picture on every device.

### Designing around the photography

Product shots are taken on a phone, on whatever surface was to hand, so their
backgrounds and white balance vary. Three things in the design exist only to
make an inconsistent set read as a deliberate grid:

- **`.frame::after`** draws a hairline on top of every image, so a bright photo
  never looks like a hole punched in a dark page.
- **Three across, not four or five.** Larger frames flatter amateur photography;
  small dense tiles make it look like clutter.
- **Category tiles carry their own scrim gradient**, so the label stays legible
  over a photo nobody has vetted.

If the photography ever gets upgraded to cut-outs on a seamless background, all
three can be relaxed.

### Routes

| Path | |
|---|---|
| `/` | Home |
| `/shop` | Collection; filter, search, sort and paging all happen in Postgres |
| `/product/:handle` | By slug or by id, so old links keep working |
| `/custom` | Five-step builder |
| `/cart`, `/checkout`, `/order-confirmation` | Purchase flow |
| `/track` | Look up an order; returns status and a first name only |
| `/complaint` | Report a problem |
| `/admin/*` | Admin panel, lazy-loaded, so shoppers never download it |

`/admin` is a plain path on purpose. The previous "secret" URL shipped in the
JavaScript bundle in plain text, so it protected nothing while costing you a
bookmarkable login.

---

## Accessibility

Held to WCAG 2.1 AA:

- Visible `:focus-visible` rings everywhere; no `outline: none` without a
  replacement.
- Product cards are links, so they are focusable, crawlable and can be opened
  in a new tab.
- Skip-to-content link; `aria-live` regions for toasts, search results and
  order lookups; labelled form fields with real error text.
- The mobile menu traps scroll, closes on Escape and returns focus.
- `prefers-reduced-motion` is honoured.
- Every image has fixed dimensions, so the grid does not reflow as it loads.
- No custom cursor. The operating system already knows what a text field
  looks like.

---

## Known limits

- **Orphaned receipts.** If the upload succeeds but `place_order()` then fails,
  the file stays in storage unreferenced. It is private and harmless; sweep the
  bucket occasionally if it bothers you.
- **No transactional email.** Confirmation happens over WhatsApp by design.
  Complaint responses are recorded for your reference, not sent automatically.
- **No payment gateway.** Bank transfer plus a receipt, which is what the
  business actually does.
- **No tests.** The highest-value additions would be around `place_order()`:
  stock limits, price integrity, concurrent purchase of the last item.

---

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build
npm run preview   # serve the build locally
```

`build` calls Vite through `node node_modules/vite/bin/vite.js` to work around
a Windows binary-resolution bug. It behaves identically on Vercel.

---

## A note for whoever edits this file next

Do not run `sed -i` or `perl -pi` over the Markdown or the SQL in this repo.
Both are full of multi-byte characters, and those tools will happily re-encode
the whole file as a side effect of a one-line change. Use an editor.
