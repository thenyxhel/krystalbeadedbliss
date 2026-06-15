-- ─────────────────────────────────────────────────────────────
-- Krystal's Beaded Bliss — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ─────────────────────────────────────────────────────────────

-- ── Extensions ────────────────────────────────────────────────
create extension if not exists "pgcrypto";


-- ── Helper: generate order number ─────────────────────────────
create or replace function generate_order_number()
returns text language sql as $$
  select 'KBB-' || upper(substring(encode(gen_random_bytes(4), 'hex') from 1 for 6));
$$;


-- ── PRODUCTS ──────────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text not null check (category in ('bracelet','necklace','earrings','anklet','set')),
  description text,
  price       integer not null, -- in Naira
  images      text[]  default '{}',
  available   boolean default true,
  featured    boolean default false,
  created_at  timestamptz default now()
);

alter table products enable row level security;

-- Anyone can read available products
create policy "products_public_read" on products
  for select using (true);

-- Only authenticated admin can write
create policy "products_admin_write" on products
  for all using (auth.role() = 'authenticated');


-- ── CUSTOM CONFIG ─────────────────────────────────────────────
-- Single-row table — admin edits it, customers read it
create table if not exists custom_config (
  id          uuid primary key default gen_random_uuid(),
  bead_types  jsonb default '[]',
  -- e.g. [{"name":"Seed Bead","description":"Small & classic","price_modifier":0},...]
  charm_types jsonb default '[]',
  -- e.g. [{"name":"Star Charm","price":500},...]
  colors      jsonb default '[]',
  -- e.g. [{"name":"Gold","hex":"#D4A830"},...]
  base_prices jsonb default '{"bracelet":5000,"necklace":8000,"earrings":4000}',
  updated_at  timestamptz default now()
);

alter table custom_config enable row level security;

create policy "config_public_read" on custom_config
  for select using (true);

create policy "config_admin_write" on custom_config
  for all using (auth.role() = 'authenticated');

-- Seed a default config row if none exists
insert into custom_config (bead_types, charm_types, colors, base_prices)
select
  '[
    {"name":"Seed Bead","description":"Small & delicate, classic look","price_modifier":0},
    {"name":"Glass Bead","description":"Smooth, glossy finish","price_modifier":500},
    {"name":"Crystal Bead","description":"Faceted, catches the light","price_modifier":1000},
    {"name":"Wood Bead","description":"Natural, earthy texture","price_modifier":0}
  ]'::jsonb,
  '[
    {"name":"Star Charm","price":500},
    {"name":"Heart Charm","price":500},
    {"name":"Moon Charm","price":700},
    {"name":"Cross Charm","price":500},
    {"name":"Butterfly Charm","price":800}
  ]'::jsonb,
  '[
    {"name":"Gold","hex":"#D4A830"},
    {"name":"Rose Gold","hex":"#C08080"},
    {"name":"Silver","hex":"#A8A8B0"},
    {"name":"Black","hex":"#1A1A2E"},
    {"name":"White","hex":"#F5F0E8"},
    {"name":"Red","hex":"#C0392B"},
    {"name":"Blue","hex":"#2980B9"},
    {"name":"Green","hex":"#27AE60"},
    {"name":"Purple","hex":"#8E44AD"},
    {"name":"Pink","hex":"#E83B8A"},
    {"name":"Orange","hex":"#E67E22"},
    {"name":"Brown","hex":"#795548"},
    {"name":"Mixed","hex":"linear-gradient(135deg,#D4A830,#E83B8A,#2980B9)"}
  ]'::jsonb,
  '{"bracelet":5000,"necklace":8000,"earrings":4000}'::jsonb
where not exists (select 1 from custom_config);


-- ── ORDERS ────────────────────────────────────────────────────
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text unique not null default generate_order_number(),
  customer_name       text not null,
  email               text not null,
  phone               text not null,
  address             text not null,
  state               text not null,
  items               jsonb not null,
  -- [{"product_id":"...","name":"...","price":8500,"quantity":1,"image":"..."}]
  subtotal            integer not null,
  delivery_fee        integer default 0,
  total               integer not null,
  payment_receipt_url text,
  status              text default 'pending'
                      check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  notes               text,
  created_at          timestamptz default now()
);

alter table orders enable row level security;

-- Anyone can insert (place an order)
create policy "orders_public_insert" on orders
  for insert with check (true);

-- Only admin can read / update
create policy "orders_admin_all" on orders
  for all using (auth.role() = 'authenticated');


-- ── CUSTOM ORDERS ─────────────────────────────────────────────
create table if not exists custom_orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text unique not null default generate_order_number(),
  customer_name       text not null,
  email               text not null,
  phone               text not null,
  piece_type          text not null check (piece_type in ('bracelet','necklace','earrings')),
  configuration       jsonb not null,
  -- {"bead_type":"...","color":"...","charms":[...],"quantity":1,"notes":"..."}
  estimated_price     integer,
  payment_receipt_url text,
  status              text default 'pending'
                      check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at          timestamptz default now()
);

alter table custom_orders enable row level security;

create policy "custom_orders_public_insert" on custom_orders
  for insert with check (true);

create policy "custom_orders_admin_all" on custom_orders
  for all using (auth.role() = 'authenticated');


-- ── COMPLAINTS ────────────────────────────────────────────────
create table if not exists complaints (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null,
  customer_name  text not null,
  email          text not null,
  message        text not null,
  status         text default 'open'
                 check (status in ('open','in_review','resolved')),
  admin_response text,
  created_at     timestamptz default now()
);

alter table complaints enable row level security;

create policy "complaints_public_insert" on complaints
  for insert with check (true);

create policy "complaints_admin_all" on complaints
  for all using (auth.role() = 'authenticated');


-- ── INDEXES ───────────────────────────────────────────────────
create index if not exists products_category_idx  on products (category);
create index if not exists products_featured_idx  on products (featured);
create index if not exists orders_status_idx       on orders (status);
create index if not exists orders_email_idx        on orders (email);
create index if not exists orders_number_idx       on orders (order_number);
create index if not exists custom_orders_number_idx on custom_orders (order_number);
create index if not exists complaints_status_idx   on complaints (status);


-- ── STORAGE ───────────────────────────────────────────────────
-- Run these separately in Storage section, or via the Dashboard:
--
-- 1. Create bucket: "product-images"
--    Public: true
--    Allowed MIME types: image/*
--
-- 2. Create bucket: "payment-receipts"
--    Public: true
--    Allowed MIME types: image/*, application/pdf
--
-- Storage policies (after creating buckets):

-- product-images: public read, admin write
insert into storage.buckets (id, name, public) values ('product-images',    'product-images',    true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('payment-receipts',  'payment-receipts',  true) on conflict do nothing;

create policy "product_images_public_read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "product_images_admin_write" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

create policy "product_images_admin_delete" on storage.objects
  for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

-- payment-receipts: public read (admin needs to view), anyone can insert
create policy "receipts_public_read" on storage.objects
  for select using (bucket_id = 'payment-receipts');

create policy "receipts_public_insert" on storage.objects
  for insert with check (bucket_id = 'payment-receipts');
