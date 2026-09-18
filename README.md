# Krystal Beaded Bliss

Handmade beaded and chain jewellery from Lagos. React + Vite + Tailwind on the
front, Supabase (Postgres, Auth, Storage) on the back, deployed to Vercel at
[kbbjewelries.com](https://kbbjewelries.com).

---

## Read this first if you are upgrading

The previous version had three problems that are not fixed by deploying new
code. You have to act on them.

### 1. `.env` was committed to git, and the repo is public

Real Supabase keys and bank account details are in the history of commits
`b3fba66`, `bfa9774` and `b08de1f`. `.gitignore` now excludes the file and it
has been untracked, but git history still contains the old values.

What actually mattered, and is now closed:

- The old anon key has been superseded by a publishable key, and the **legacy
  API keys are disabled**, so the leaked one is dead.
- The RLS policies that made that key dangerous have been replaced.

What does not need fixing: the bank account name and number are displayed to
every customer on the checkout page by design, so their presence in git adds
no exposure. Rewriting history with `git filter-repo` would break every clone
and buy nothing.

### 2. Customer payment receipts were world-readable

They were stored in a **public** bucket under `KBB-XXXXXX.jpg`, the order
number. Anyone who guessed six characters could read a stranger's bank
receipt. `schema.sql` now makes that bucket private; the old objects have been
deleted.

### 3. Anyone who signed up was an admin

Every RLS policy said `auth.role() = 'authenticated'`, which means *any*
signed-in user. Run the new `supabase/schema.sql`, which scopes everything to
an `admins` allow-list, then turn signups off under Authentication, Providers,
Email.

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
| `VITE_SUPABASE_ANON_KEY` | The publishable key (`sb_publishable_...`) |
| `VITE_WHATSAPP_NUMBER` | Country code, no `+`, e.g. `2348012345678` |
| `VITE_INSTAGRAM_URL` | Optional; the footer link hides itself if unset |
| `VITE_BANK_NAME` / `_ACCOUNT_NAME` / `_ACCOUNT_NUMBER` | Shown at checkout |
| `VITE_SWEET_SOIREE_URL` | Sister store link |

There is deliberately **no** `VITE_ADMIN_EMAIL`. Admin access is a row in a
database table, not a string the browser can read.

**Vite bakes these into the bundle at build time.** Changing one in Vercel does
nothing until something rebuilds. Values must not contain trailing newlines.

### Database

Run `supabase/schema.sql` in the Supabase SQL editor. It is idempotent. The
block at the top drops superseded functions before redefining them, which is
what lets a re-run survive a changed signature.

### Make yourself an admin

1. Dashboard, Authentication, Users, *Add user*.
2. In the SQL editor:

   ```sql
   insert into admins (user_id, email)
   select id, email from auth.users where email = 'you@example.com'
   on conflict (user_id) do nothing;
   ```

3. Sign in at `/admin/login`, then turn off public signups.

---

## The catalogue has two axes

This is the part most likely to trip up a future change.

**`category`** — what the piece is:
`bracelet`, `necklace`, `set`, `watch`, `keychain`, `bagcharm`, `earrings`

**`style`** — how it is made:
`beaded`, `chains`, `both`

Bracelets and necklaces are one or the other. Keychains and bag charms
routinely combine beading and chain, so `both` is a real value rather than a
fudge. The shop filters on each independently, because "beaded bracelets" and
"all keychains" are different questions.

Both lists live in `src/lib/config.js` and are mirrored by CHECK constraints in
`schema.sql`. **Change them together.** The admin product form, the shop
filters, the custom builder's piece types and the base-price fields all derive
from the config, so adding a category there is otherwise enough.

---

## How this is put together

### Money is decided by the server, never the browser

The cart holds `{ product_id, quantity }` and a display snapshot. Checkout
calls `place_order()`, a `SECURITY DEFINER` function that looks every price up
in `products`, locks rows with `FOR UPDATE` so the last item cannot be
oversold, checks and decrements stock, and writes totals it computed itself.

The `orders` table has **no public INSERT policy at all**.

To prove it: put something in the cart, set its price to 1 in localStorage,
check out, and look at what the admin panel recorded.

`place_custom_order()` works the same way, and only demands a bead type when
the chosen style actually has beads.

### Authorization is one function

`is_admin()` checks for a row in `admins`. Every admin policy calls it, and so
does the React route guard, so the UI and the database agree on who you are and
the database decides.

### Receipts are private

Uploaded to a private bucket under a random UUID path. Customers may write and
may never read. Admins view them through 60-second signed URLs.

---

## Design

### The mark

A coil of beads, drawn as SVG in `src/components/Brand.jsx` — not a PNG. It
exists in two variants of the same gesture: 26 beads spiralling inward where
there is room, and an even ring of 7 below 44px, because the fine beads merge
into a smudge at favicon size. `<Mark size={n} />` picks the variant; pass
`detail="full"` or `"compact"` to force one.

Its colours are theme tokens, so the mark follows the site rather than sitting
on top of it as a fixed image.

### Tokens

In `src/index.css`, exposed to Tailwind in `tailwind.config.js`.
**No component should contain a hex code.**

`--brand-*` are the mark's own colours and are identical in both themes,
because the logo is one object and should not appear to be two. They are for
graphics. For text, use `--accent`, which is tuned per theme.

| | Dark (default) | Light |
|---|---|---|
| `--bg` | `#150A1F` | `#FFFDFA` |
| `--ink` | `#F7F2FB` (17.4:1) | `#14101C` (18.5:1) |
| `--ink-2` | `#C9B8DC` (10.4:1) | `#544B63` (8.1:1) |
| `--accent` | `#FF2E8B` (5.5:1) | `#D1005F` (5.3:1) |
| `--gold` | `#FFC814` (12.4:1) | `#8A5A00` (5.8:1) |
| `--teal` | `#26C6D1` (9.2:1) | `#00707F` (5.7:1) |
| `--band` | `#5B1A8C` (identical) | `#5B1A8C` |

Every pair meets WCAG AA in both themes. Two rules worth keeping:

- **Dark ink on neon fills, never white.** White on `#FF2E8B` is 3.1:1.
- **`--brand-purple` is a background only.** As text on the dark ground it is
  1.8:1.

Type is **Outfit** (display, 700–800) and **Inter** (UI). Dark is the default;
light is one tap away and the choice is remembered. The initial class is set by
an inline script in `index.html`, before first paint.

### Designing around the photography

Product shots are taken on a phone, on whatever surface was to hand. Three
things exist only to make an inconsistent set read as a deliberate grid:

- **`.frame::after`** draws a hairline on top of every image, so a bright photo
  never looks like a hole punched in a dark page.
- **Three across, not four or five.** Larger frames flatter amateur
  photography; small dense tiles make it look like clutter.
- **Category tiles carry their own scrim gradient**, so the label stays legible
  over a photo nobody has vetted.

If the photography is ever upgraded to cut-outs on a seamless, all three can be
relaxed.

---

## Routes

| Path | |
|---|---|
| `/` | Home |
| `/shop` | Filter, search, sort and paging all happen in Postgres |
| `/product/:handle` | By slug or id, so old links keep working |
| `/custom` | Builder; steps are computed from the chosen style |
| `/cart`, `/checkout`, `/order-confirmation` | Purchase flow |
| `/track` | Status and a first name only |
| `/complaint` | Report a problem |
| `/admin/*` | Lazy-loaded, so shoppers never download it |

`/admin` is a plain path on purpose. The previous "secret" URL shipped in the
JavaScript bundle in plain text.

---

## Accessibility

Held to WCAG 2.1 AA: visible `:focus-visible` rings, product cards as real
links, a skip link, `aria-live` regions, labelled fields with real error text,
a mobile menu that traps scroll and closes on Escape, `prefers-reduced-motion`,
fixed image dimensions, and no custom cursor.

---

## Deployment

Pushing to `master` deploys. **Do not deploy with `vercel --prod` as well** —
once the CLI has built a given tree, Vercel treats a later push of the same
tree as already deployed and skips it, and you then need a fresh commit to get
unstuck.

---

## Known limits

- **Orphaned receipts.** If the upload succeeds but `place_order()` fails, the
  file stays in storage unreferenced. Private and harmless; sweep occasionally.
- **No transactional email.** Confirmation happens over WhatsApp by design.
- **No payment gateway.** Bank transfer plus a receipt.
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
Both are full of multi-byte characters, and those tools will re-encode the
whole file as a side effect of a one-line change. Use an editor.
