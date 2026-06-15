# Krystal's Beaded Bliss v2

Handcrafted bead jewellery store — React + Vite + Tailwind CSS + Supabase.

---

## Stack

- **Frontend** — React 18, React Router v6, Tailwind CSS
- **Backend** — Supabase (Postgres + Auth + Storage)
- **Deployment** — Vercel

---

## Setup

### 1. Clone & install

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon public key |
| `VITE_WHATSAPP_NUMBER` | WhatsApp number with country code, no `+` (e.g. `2348012345678`) |
| `VITE_BANK_NAME` | Bank name for payment |
| `VITE_BANK_ACCOUNT_NAME` | Account name |
| `VITE_BANK_ACCOUNT_NUMBER` | Account number |
| `VITE_ADMIN_EMAIL` | Email used to log into the admin panel |
| `VITE_SWEET_SOIREE_URL` | Link to The Sweet Soirée |

### 3. Database

Run `supabase/schema.sql` in your Supabase SQL Editor. This creates all tables, RLS policies, indexes, and storage buckets.

### 4. Admin account

In your Supabase dashboard → Authentication → Users → Invite user.
Use the email you set as `VITE_ADMIN_EMAIL`. Set a strong password.

### 5. Run locally

```bash
npm run dev
```

### 6. Deploy to Vercel

Connect repo to Vercel, add the environment variables, deploy. Done.

---

## Pages

| Route | Page |
|---|---|
| `/` | Home |
| `/shop` | Shop (filter by category, search) |
| `/product/:id` | Product detail |
| `/custom` | Custom piece builder |
| `/cart` | Cart |
| `/checkout` | Checkout (bank transfer + receipt upload) |
| `/order-confirmation` | Order confirmation |
| `/track` | Track order by ID |
| `/complaint` | File a complaint |
| `/admin` | Admin dashboard — stats overview |
| `/admin/products` | Add / edit / delete products, upload images |
| `/admin/orders` | Regular + custom orders, status updates, receipt viewer |
| `/admin/complaints` | View, respond to, and resolve complaints |
| `/admin/custom` | Configure bead types, colours, charms, base prices |

---

## Features

- Dark mode by default, toggleable to light
- Gold bead cursor
- Floating glassmorphism navbar with mobile hamburger
- Full product management with image uploads
- Custom piece builder (bead type, colour, charms, qty)
- Cart persisted across page refreshes
- Bank transfer + receipt upload checkout flow
- Order tracking by order ID
- Admin panel with Supabase Auth

---

## Design tokens

Defined as CSS variables in `src/index.css`, toggled by adding/removing the `dark` class on `<html>`.

| Token | Light | Dark |
|---|---|---|
| `--bg` | `#FAF5EE` | `#08131C` |
| `--surf` | `#FFFFFF` | `#0E2030` |
| `--tx` | `#0C2D3D` | `#EBE0CC` |
| `--gold` | `#C8921A` | `#D4A830` |
| `--pink` | `#CC1F6E` | `#E83B8A` |
 
