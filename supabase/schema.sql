-- ═══════════════════════════════════════════════════════════════════════════
--  Krystal Beaded Bliss — Database Schema
--  Run this whole file in the Supabase SQL Editor (Dashboard → SQL Editor).
--  It is idempotent: safe to re-run.
--
--  SECURITY MODEL
--  ──────────────
--  1. Nothing trusts the browser with money. Orders are created only through
--     place_order() / place_custom_order(), which recompute every price from
--     the products / custom_config tables server-side.
--  2. "Admin" means a row in public.admins — NOT merely "signed in".
--     A random person who signs up gets nothing.
--  3. Payment receipts live in a PRIVATE bucket. Admins read them through
--     short-lived signed URLs. They are not guessable and not public.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";


-- ═══ CLEAR OUT SUPERSEDED FUNCTIONS ════════════════════════════════════════
-- `create or replace function` cannot change a function's return type or its
-- OUT parameters. Any of these that were created by hand in the dashboard —
-- track_order() in particular — must be dropped before they can be redefined,
-- or the run fails with 42P13.
--
-- Deliberately NOT in this list:
--   is_admin()              — every RLS policy depends on it; dropping it
--                             would fail, and CASCADE would take the policies
--                             with it. Its signature never changes, so
--                             `create or replace` is safe.
--   generate_order_number() — used as a column DEFAULT on both order tables,
--                             so it has dependants too. Same reasoning.

do $cleanup$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as signature
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('track_order', 'place_order', 'place_custom_order', 'admin_stats')
  loop
    execute format('drop function if exists %s', fn.signature);
  end loop;
end
$cleanup$;


-- ═══ ADMIN IDENTITY ════════════════════════════════════════════════════════
-- The allow-list. Membership is granted by hand in the SQL editor (see the
-- bootstrap block at the very bottom of this file) and can never be granted
-- through the public API.

create table if not exists admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- is_admin() is SECURITY DEFINER so it can read `admins` from inside the
-- policies that protect `admins` itself, without recursing.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from admins a where a.user_id = auth.uid());
$fn$;

revoke all on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated;

drop policy if exists "admins_self_read" on admins;
create policy "admins_self_read" on admins
  for select to authenticated
  using (user_id = auth.uid());
-- No insert/update/delete policy exists. Admins are added only via SQL editor.


-- ═══ ORDER NUMBERS ═════════════════════════════════════════════════════════
-- Collision-safe: retries until it finds a number unused by BOTH order tables.

create or replace function generate_order_number()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- no I/O/0/1
  candidate text;
  i int;
begin
  loop
    candidate := 'KBB-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from orders        where order_number = candidate)
          and not exists (select 1 from custom_orders where order_number = candidate);
  end loop;
  return candidate;
end;
$fn$;


-- ═══ PRODUCTS ══════════════════════════════════════════════════════════════

-- Two independent axes:
--   category -- what the piece is  (bracelet, watch, keychain, ...)
--   style    -- how it is made     (beaded, chains, or both together)
-- Bracelets and necklaces are one or the other. Keychains and bag charms
-- routinely combine beading and chain, so 'both' is a real value, not a fudge.

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  slug        text,
  name        text not null check (length(trim(name)) between 1 and 120),
  category    text not null,
  style       text not null default 'beaded',
  description text check (length(description) <= 2000),
  price       integer not null check (price >= 0),       -- whole Naira
  stock       integer not null default 0 check (stock >= 0),
  images      text[] not null default '{}',
  available   boolean not null default true,
  featured    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table products add column if not exists slug  text;
alter table products add column if not exists stock integer not null default 0;
alter table products add column if not exists updated_at timestamptz not null default now();
alter table products add column if not exists style text;

-- Taxonomy, applied as a migration so an existing database picks it up too.
-- Constraints are dropped before being re-added because a CHECK cannot be
-- altered in place.
update products set style = 'beaded' where style is null;
alter table products alter column style set default 'beaded';
alter table products alter column style set not null;

alter table products drop constraint if exists products_category_check;
alter table products drop constraint if exists products_style_check;

alter table products add constraint products_category_check
  check (category in ('bracelet','necklace','earrings','set','watch','keychain','bagcharm'));

alter table products add constraint products_style_check
  check (style in ('beaded','chains','both'));

-- Backfill slugs for any rows created before this column existed.
update products
   set slug = regexp_replace(lower(trim(name)), '[^a-z0-9]+', '-', 'g')
             || '-' || substr(id::text, 1, 6)
 where slug is null;

create unique index if not exists products_slug_key on products (slug) where slug is not null;

alter table products enable row level security;

drop policy if exists "products_public_read"  on products;
drop policy if exists "products_admin_write"  on products;
drop policy if exists "products_admin_all"    on products;

create policy "products_public_read" on products
  for select to anon, authenticated using (true);

create policy "products_admin_all" on products
  for all to authenticated using (is_admin()) with check (is_admin());


-- ═══ CUSTOM BUILDER CONFIG ═════════════════════════════════════════════════
-- Single row. Admin edits it; customers read it; prices are read back out of
-- it server-side when a custom order is placed.

create table if not exists custom_config (
  id          uuid primary key default gen_random_uuid(),
  bead_types  jsonb not null default '[]',   -- [{"name","description","price_modifier"}]
  charm_types jsonb not null default '[]',   -- [{"name","price"}]
  colors      jsonb not null default '[]',   -- [{"name","hex"}]
  base_prices jsonb not null default '{"bracelet":5000,"necklace":8000,"earrings":4000}',
  updated_at  timestamptz not null default now()
);

alter table custom_config enable row level security;

drop policy if exists "config_public_read" on custom_config;
drop policy if exists "config_admin_write" on custom_config;
drop policy if exists "config_admin_all"   on custom_config;

create policy "config_public_read" on custom_config
  for select to anon, authenticated using (true);

create policy "config_admin_all" on custom_config
  for all to authenticated using (is_admin()) with check (is_admin());

insert into custom_config (bead_types, charm_types, colors, base_prices)
select
  '[
    {"name":"Seed Bead","description":"Small and delicate, the classic look","price_modifier":0},
    {"name":"Glass Bead","description":"Smooth with a glossy finish","price_modifier":500},
    {"name":"Crystal Bead","description":"Faceted, catches the light","price_modifier":1000},
    {"name":"Wood Bead","description":"Natural, warm, earthy texture","price_modifier":0}
  ]'::jsonb,
  '[
    {"name":"Star Charm","price":500},
    {"name":"Heart Charm","price":500},
    {"name":"Moon Charm","price":700},
    {"name":"Cross Charm","price":500},
    {"name":"Butterfly Charm","price":800}
  ]'::jsonb,
  '[
    {"name":"Brass","hex":"#9A7B3F"},
    {"name":"Clay","hex":"#B4552F"},
    {"name":"Sage","hex":"#5E6B52"},
    {"name":"Bone","hex":"#EDE4D6"},
    {"name":"Ink","hex":"#1A1714"},
    {"name":"Coral","hex":"#D4674A"},
    {"name":"Indigo","hex":"#2F4056"},
    {"name":"Ochre","hex":"#C08A2E"},
    {"name":"Rose","hex":"#C08080"},
    {"name":"Ivory","hex":"#F5F0E8"},
    {"name":"Olive","hex":"#7A7A3F"},
    {"name":"Cocoa","hex":"#6B4A38"}
  ]'::jsonb,
  '{"bracelet":5000,"necklace":8000,"earrings":4000,"set":12000,"watch":10000,"keychain":3500,"bagcharm":4000}'::jsonb
where not exists (select 1 from custom_config);

-- Fill in any piece type added after this row was first created, without
-- disturbing prices that have already been edited in the admin panel.
update custom_config
   set base_prices =
     '{"bracelet":5000,"necklace":8000,"earrings":4000,"set":12000,"watch":10000,"keychain":3500,"bagcharm":4000}'::jsonb
     || coalesce(base_prices, '{}'::jsonb);


-- ═══ ORDERS ════════════════════════════════════════════════════════════════
-- No public INSERT policy. The only way in is place_order().

create table if not exists orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text unique not null default generate_order_number(),
  customer_name        text not null,
  email                text not null,
  phone                text not null,
  address              text not null,
  state                text not null,
  items                jsonb not null,
  subtotal             integer not null check (subtotal >= 0),
  delivery_fee         integer not null default 0 check (delivery_fee >= 0),
  total                integer not null check (total >= 0),
  payment_receipt_path text,          -- storage object path, NOT a public URL
  status               text not null default 'pending'
                       check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table orders add column if not exists payment_receipt_path text;
alter table orders add column if not exists updated_at timestamptz not null default now();

-- Gift orders: the buyer pays, the piece ships to the recipient with an
-- optional handwritten note slipped inside. `address`/`state` are then the
-- recipient's, and `customer_name` stays the buyer.
alter table orders add column if not exists is_gift        boolean not null default false;
alter table orders add column if not exists recipient_name text;
alter table orders add column if not exists gift_note      text;

-- Why an order was cancelled, in the admin's own words. Sent to the customer:
-- a cancellation they cannot explain to themselves reads as the shop going
-- quiet on them.
alter table orders        add column if not exists cancellation_reason text;
alter table custom_orders add column if not exists cancellation_reason text;

alter table orders enable row level security;

drop policy if exists "orders_public_insert" on orders;
drop policy if exists "orders_admin_all"     on orders;

create policy "orders_admin_all" on orders
  for all to authenticated using (is_admin()) with check (is_admin());


-- ═══ CUSTOM ORDERS ═════════════════════════════════════════════════════════

create table if not exists custom_orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text unique not null default generate_order_number(),
  customer_name        text not null,
  email                text not null,
  phone                text not null,
  piece_type           text not null,
  configuration        jsonb not null,
  estimated_price      integer check (estimated_price >= 0),
  payment_receipt_path text,
  status               text not null default 'pending'
                       check (status in ('pending','confirmed','processing','shipped','delivered','cancelled')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table custom_orders add column if not exists payment_receipt_path text;
alter table custom_orders add column if not exists updated_at timestamptz not null default now();

-- A custom piece is shipped and can be a gift, exactly like a shop order.
-- Nullable: requests placed before these existed have no address on file.
alter table custom_orders add column if not exists address        text;
alter table custom_orders add column if not exists state          text;
alter table custom_orders add column if not exists is_gift        boolean not null default false;
alter table custom_orders add column if not exists recipient_name text;
alter table custom_orders add column if not exists gift_note      text;

alter table custom_orders drop constraint if exists custom_orders_piece_type_check;
alter table custom_orders add constraint custom_orders_piece_type_check
  check (piece_type in ('bracelet','necklace','earrings','set','watch','keychain','bagcharm'));

alter table custom_orders enable row level security;

drop policy if exists "custom_orders_public_insert" on custom_orders;
drop policy if exists "custom_orders_admin_all"     on custom_orders;

create policy "custom_orders_admin_all" on custom_orders
  for all to authenticated using (is_admin()) with check (is_admin());


-- ═══ REVIEWS ═══════════════════════════════════════════════════════════════
-- (This table was missing from the previous schema entirely, while the app
--  queried it on every product page.)

create table if not exists reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references products (id) on delete cascade,
  customer_name text not null check (length(trim(customer_name)) between 2 and 60),
  rating        integer not null check (rating between 1 and 5),
  comment       text not null check (length(trim(comment)) between 4 and 1000),
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now()
);

alter table reviews enable row level security;

drop policy if exists "reviews_public_read"   on reviews;
drop policy if exists "reviews_public_insert" on reviews;
drop policy if exists "reviews_admin_all"     on reviews;

-- The public sees only what has been approved.
create policy "reviews_public_read" on reviews
  for select to anon, authenticated using (status = 'approved');

-- Anyone may submit, but only ever as 'pending'. The WITH CHECK is what stops
-- a crafted request from self-approving.
create policy "reviews_public_insert" on reviews
  for insert to anon, authenticated with check (status = 'pending');

create policy "reviews_admin_all" on reviews
  for all to authenticated using (is_admin()) with check (is_admin());


-- ═══ COMPLAINTS ════════════════════════════════════════════════════════════

create table if not exists complaints (
  id             uuid primary key default gen_random_uuid(),
  order_number   text not null check (length(trim(order_number)) between 3 and 32),
  customer_name  text not null check (length(trim(customer_name)) between 2 and 60),
  email          text not null,
  message        text not null check (length(trim(message)) between 10 and 4000),
  status         text not null default 'open' check (status in ('open','in_review','resolved')),
  admin_response text,
  created_at     timestamptz not null default now()
);

alter table complaints enable row level security;

drop policy if exists "complaints_public_insert" on complaints;
drop policy if exists "complaints_admin_all"     on complaints;

create policy "complaints_public_insert" on complaints
  for insert to anon, authenticated with check (status = 'open' and admin_response is null);

create policy "complaints_admin_all" on complaints
  for all to authenticated using (is_admin()) with check (is_admin());


-- ═══ PLACE ORDER ═══════════════════════════════════════════════════════════
-- The browser sends product ids and quantities. Nothing else about money.
-- Every naira in the resulting row is computed here, from the products table.

-- The signature grew (gift params), so the old overload must go or both
-- would exist side by side.
drop function if exists place_order(text,text,text,text,text,jsonb,text,text);

create or replace function place_order(
  p_customer_name text,
  p_email         text,
  p_phone         text,
  p_address       text,
  p_state         text,
  p_items         jsonb,          -- [{"product_id":"uuid","quantity":2}, ...]
  p_receipt_path  text,
  p_notes         text default null,
  p_is_gift         boolean default false,
  p_recipient_name  text    default null,
  p_gift_note       text    default null
)
returns table (order_number text, total integer)
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_item         jsonb;
  v_product      products%rowtype;
  v_qty          integer;
  v_subtotal     integer := 0;
  v_lines        jsonb := '[]'::jsonb;
  v_delivery_fee integer := 0;   -- delivery is arranged after confirmation
  v_number       text;
begin
  -- ── Validate the customer ────────────────────────────────────────────────
  if length(trim(coalesce(p_customer_name,''))) < 2 then
    raise exception 'Please enter your full name.' using errcode = '22000';
  end if;
  if coalesce(p_email,'') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22000';
  end if;
  if length(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')) < 10 then
    raise exception 'Please enter a valid phone number.' using errcode = '22000';
  end if;
  if length(trim(coalesce(p_address,''))) < 8 then
    raise exception 'Please enter a complete delivery address.' using errcode = '22000';
  end if;
  if length(trim(coalesce(p_state,''))) < 2 then
    raise exception 'Please enter your state.' using errcode = '22000';
  end if;
  if coalesce(p_receipt_path,'') = '' then
    raise exception 'A payment receipt is required.' using errcode = '22000';
  end if;
  if coalesce(p_is_gift, false) then
    if length(trim(coalesce(p_recipient_name,''))) < 2 then
      raise exception 'Please enter the recipient''s name.' using errcode = '22000';
    end if;
    if length(coalesce(p_gift_note,'')) > 500 then
      raise exception 'Gift notes are limited to 500 characters.' using errcode = '22000';
    end if;
  end if;

  -- ── Validate the basket ──────────────────────────────────────────────────
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your cart is empty.' using errcode = '22000';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'That is too many different items for one order.' using errcode = '22000';
  end if;

  -- ── Price every line from the database, never from the request ───────────
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := coalesce((v_item ->> 'quantity')::int, 0);

    if v_qty < 1 or v_qty > 20 then
      raise exception 'Quantity must be between 1 and 20.' using errcode = '22000';
    end if;

    select * into v_product
      from products
     where id = (v_item ->> 'product_id')::uuid
     for update;                                  -- lock the row: no oversell

    if not found then
      raise exception 'One of the items in your cart no longer exists.' using errcode = '22000';
    end if;
    if not v_product.available then
      raise exception '% is no longer available.', v_product.name using errcode = '22000';
    end if;
    if v_product.stock < v_qty then
      raise exception 'Only % of "%" left in stock.', v_product.stock, v_product.name using errcode = '22000';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'name',       v_product.name,
      'price',      v_product.price,       -- price as charged, frozen here
      'quantity',   v_qty,
      'image',      coalesce(v_product.images[1], null)
    );

    update products
       set stock = stock - v_qty
     where id = v_product.id;
  end loop;

  v_number := generate_order_number();

  insert into orders (
    order_number, customer_name, email, phone, address, state,
    items, subtotal, delivery_fee, total, payment_receipt_path, status, notes,
    is_gift, recipient_name, gift_note
  ) values (
    v_number, trim(p_customer_name), lower(trim(p_email)), trim(p_phone),
    trim(p_address), trim(p_state),
    v_lines, v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee,
    p_receipt_path, 'pending', nullif(trim(coalesce(p_notes,'')), ''),
    coalesce(p_is_gift, false),
    case when coalesce(p_is_gift, false) then trim(p_recipient_name) end,
    case when coalesce(p_is_gift, false) then nullif(trim(coalesce(p_gift_note,'')), '') end
  );

  return query select v_number, v_subtotal + v_delivery_fee;
end;
$fn$;

revoke all on function place_order(text,text,text,text,text,jsonb,text,text,boolean,text,text) from public;
grant execute on function place_order(text,text,text,text,text,jsonb,text,text,boolean,text,text) to anon, authenticated;


-- ═══ PLACE CUSTOM ORDER ════════════════════════════════════════════════════
-- Same principle: the estimate is derived from custom_config on the server.

-- The signature changed (address, receipt and gift fields), and Postgres treats
-- a different argument list as a different function — so the old one goes.
drop function if exists place_custom_order(text,text,text,text,text,text[],text,text[],integer,text);

create or replace function place_custom_order(
  p_customer_name text,
  p_email         text,
  p_phone         text,
  p_address       text,
  p_state         text,
  p_piece_type    text,
  p_style         text,
  p_bead_types    text[],
  p_color         text,
  p_charms        text[],
  p_quantity      integer,
  p_receipt_path  text,
  p_notes         text default null,
  p_is_gift         boolean default false,
  p_recipient_name  text    default null,
  p_gift_note       text    default null
)
returns table (order_number text, estimated_price integer)
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_cfg    custom_config%rowtype;
  v_base   integer;
  v_extra  integer := 0;
  v_name   text;
  v_total  integer;
  v_number text;
begin
  if length(trim(coalesce(p_customer_name,''))) < 2 then
    raise exception 'Please enter your full name.' using errcode = '22000';
  end if;
  if coalesce(p_email,'') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Please enter a valid email address.' using errcode = '22000';
  end if;
  if length(regexp_replace(coalesce(p_phone,''), '[^0-9]', '', 'g')) < 10 then
    raise exception 'Please enter a valid phone number.' using errcode = '22000';
  end if;
  if length(trim(coalesce(p_address,''))) < 8 then
    raise exception 'Please enter a complete delivery address.' using errcode = '22000';
  end if;
  if length(trim(coalesce(p_state,''))) < 2 then
    raise exception 'Please enter your state.' using errcode = '22000';
  end if;
  if coalesce(p_receipt_path,'') = '' then
    raise exception 'A payment receipt is required.' using errcode = '22000';
  end if;
  if coalesce(p_is_gift, false) then
    if length(trim(coalesce(p_recipient_name,''))) < 2 then
      raise exception 'Please enter the recipient''s name.' using errcode = '22000';
    end if;
    if length(coalesce(p_gift_note,'')) > 500 then
      raise exception 'Gift notes are limited to 500 characters.' using errcode = '22000';
    end if;
  end if;
  if p_piece_type not in ('bracelet','necklace','earrings','set','watch','keychain','bagcharm') then
    raise exception 'Please choose a piece type.' using errcode = '22000';
  end if;
  if p_style not in ('beaded','chains','both') then
    raise exception 'Please choose beaded, chains, or both.' using errcode = '22000';
  end if;

  -- Beads are only required on a piece that actually has beads. A chains-only
  -- keychain has no bead type to choose, and demanding one would be nonsense.
  if p_style in ('beaded','both')
     and (p_bead_types is null or array_length(p_bead_types, 1) is null) then
    raise exception 'Please choose at least one bead type.' using errcode = '22000';
  end if;
  if coalesce(p_quantity, 0) < 1 or p_quantity > 20 then
    raise exception 'Quantity must be between 1 and 20.' using errcode = '22000';
  end if;

  select * into v_cfg from custom_config limit 1;
  if not found then
    raise exception 'The custom builder is not configured yet.' using errcode = '22000';
  end if;

  v_base := coalesce((v_cfg.base_prices ->> p_piece_type)::int, 0);

  -- Bead surcharges — unknown names are rejected rather than silently free.
  if p_bead_types is not null then
    foreach v_name in array p_bead_types loop
      if not exists (select 1 from jsonb_array_elements(v_cfg.bead_types) b
                      where b ->> 'name' = v_name) then
        raise exception 'Unknown bead type: %', v_name using errcode = '22000';
      end if;
      v_extra := v_extra + coalesce((
        select (b ->> 'price_modifier')::int
          from jsonb_array_elements(v_cfg.bead_types) b
         where b ->> 'name' = v_name limit 1), 0);
    end loop;
  end if;

  -- Charm surcharges.
  if p_charms is not null then
    foreach v_name in array p_charms loop
      if not exists (select 1 from jsonb_array_elements(v_cfg.charm_types) c
                      where c ->> 'name' = v_name) then
        raise exception 'Unknown charm: %', v_name using errcode = '22000';
      end if;
      v_extra := v_extra + coalesce((
        select (c ->> 'price')::int
          from jsonb_array_elements(v_cfg.charm_types) c
         where c ->> 'name' = v_name limit 1), 0);
    end loop;
  end if;

  if p_color is not null and p_color <> ''
     and not exists (select 1 from jsonb_array_elements(v_cfg.colors) c
                      where c ->> 'name' = p_color) then
    raise exception 'Unknown colour: %', p_color using errcode = '22000';
  end if;

  v_total  := (v_base + v_extra) * p_quantity;
  v_number := generate_order_number();

  insert into custom_orders (
    order_number, customer_name, email, phone, address, state, piece_type, configuration,
    estimated_price, payment_receipt_path, status,
    is_gift, recipient_name, gift_note
  ) values (
    v_number, trim(p_customer_name), lower(trim(p_email)), trim(p_phone),
    trim(p_address), trim(p_state), p_piece_type,
    jsonb_build_object(
      'style',      p_style,
      'bead_types', to_jsonb(coalesce(p_bead_types, '{}'::text[])),
      'color',      p_color,
      'charms',     to_jsonb(coalesce(p_charms, '{}'::text[])),
      'quantity',   p_quantity,
      'notes',      nullif(trim(coalesce(p_notes,'')), '')
    ),
    v_total, p_receipt_path, 'pending',
    coalesce(p_is_gift, false),
    case when coalesce(p_is_gift, false) then trim(p_recipient_name) end,
    case when coalesce(p_is_gift, false) then nullif(trim(coalesce(p_gift_note,'')), '') end
  );

  return query select v_number, v_total;
end;
$fn$;

revoke all on function place_custom_order(text,text,text,text,text,text,text,text[],text,text[],integer,text,text,boolean,text,text) from public;
grant execute on function place_custom_order(text,text,text,text,text,text,text,text[],text,text[],integer,text,text,boolean,text,text) to anon, authenticated;


-- ═══ TRACK ORDER ═══════════════════════════════════════════════════════════
-- (Also missing from the previous schema, while the app called it by name.)
-- Deliberately narrow: an order number reveals status and a first name.
-- It never reveals email, phone, address or the receipt.

-- Return type changed (two flags added), which `create or replace` refuses.
drop function if exists track_order(text);

create or replace function track_order(p_order_number text)
returns table (
  order_number    text,
  status          text,
  first_name      text,
  total           integer,
  estimated_price integer,
  is_custom       boolean,
  created_at      timestamptz,
  needs_details   boolean,   -- no delivery address on file yet
  needs_payment   boolean    -- no payment receipt on file yet
)
language sql
stable
security definer
set search_path = public
as $fn$
  select * from (
    select o.order_number, o.status, split_part(o.customer_name, ' ', 1) as first_name,
           o.total, null::integer as estimated_price, false as is_custom, o.created_at,
           false as needs_details, false as needs_payment
      from orders o
     where upper(trim(o.order_number)) = upper(trim(p_order_number))
    union all
    select c.order_number, c.status, split_part(c.customer_name, ' ', 1),
           null::integer, c.estimated_price, true, c.created_at,
           c.address is null, c.payment_receipt_path is null
      from custom_orders c
     where upper(trim(c.order_number)) = upper(trim(p_order_number))
  ) hits
  limit 1;
$fn$;

revoke all on function track_order(text) from public;
grant execute on function track_order(text) to anon, authenticated;


-- ═══ COMPLETE A CUSTOM ORDER ═══════════════════════════════════════════════
-- Custom requests placed before delivery details and payment were part of the
-- builder have neither. This lets that customer supply them from the track page.
--
-- An order number is a weak secret (track_order says as much), so it is not
-- enough on its own to WRITE to an order: the email it was placed with must
-- match too. And it only ever fills a gap — an address or receipt already on
-- file can never be overwritten, so a guessed number plus a guessed email
-- still cannot redirect someone's parcel.

create or replace function complete_custom_order(
  p_order_number    text,
  p_email           text,
  p_address         text    default null,
  p_state           text    default null,
  p_is_gift         boolean default false,
  p_recipient_name  text    default null,
  p_gift_note       text    default null,
  p_receipt_path    text    default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_order     custom_orders%rowtype;
  v_has_addr  boolean := length(trim(coalesce(p_address,''))) > 0;
  v_has_pay   boolean := coalesce(p_receipt_path,'') <> '';
begin
  select * into v_order
    from custom_orders
   where upper(trim(order_number)) = upper(trim(coalesce(p_order_number,'')))
     and lower(trim(email)) = lower(trim(coalesce(p_email,'')))
   for update;

  -- One message for both "no such order" and "wrong email": telling them apart
  -- would let anyone probe which order numbers exist.
  if not found then
    raise exception 'We could not match that order number and email.' using errcode = '22000';
  end if;

  if v_order.status in ('cancelled', 'delivered') then
    raise exception 'This order is closed, so it cannot be changed. Message us if something is wrong.' using errcode = '22000';
  end if;

  if not v_has_addr and not v_has_pay then
    raise exception 'There is nothing to add.' using errcode = '22000';
  end if;

  if v_has_addr then
    if v_order.address is not null then
      raise exception 'Delivery details are already on this order. Message us to change them.' using errcode = '22000';
    end if;
    if length(trim(p_address)) < 8 then
      raise exception 'Please enter a complete delivery address.' using errcode = '22000';
    end if;
    if length(trim(coalesce(p_state,''))) < 2 then
      raise exception 'Please enter your state.' using errcode = '22000';
    end if;
    if coalesce(p_is_gift, false) then
      if length(trim(coalesce(p_recipient_name,''))) < 2 then
        raise exception 'Please enter the recipient''s name.' using errcode = '22000';
      end if;
      if length(coalesce(p_gift_note,'')) > 500 then
        raise exception 'Gift notes are limited to 500 characters.' using errcode = '22000';
      end if;
    end if;

    update custom_orders set
      address        = trim(p_address),
      state          = trim(p_state),
      is_gift        = coalesce(p_is_gift, false),
      recipient_name = case when coalesce(p_is_gift, false) then trim(p_recipient_name) end,
      gift_note      = case when coalesce(p_is_gift, false) then nullif(trim(coalesce(p_gift_note,'')), '') end
    where id = v_order.id;
  end if;

  if v_has_pay then
    if v_order.payment_receipt_path is not null then
      raise exception 'A payment receipt is already on this order. Message us if there is a problem with it.' using errcode = '22000';
    end if;
    update custom_orders set payment_receipt_path = p_receipt_path where id = v_order.id;
  end if;
end;
$fn$;

revoke all on function complete_custom_order(text,text,text,text,boolean,text,text,text) from public;
grant execute on function complete_custom_order(text,text,text,text,boolean,text,text,text) to anon, authenticated;


-- ═══ ADMIN DASHBOARD STATS ═════════════════════════════════════════════════
-- Aggregates in Postgres. The dashboard used to select every order row just
-- to sum a column in JavaScript, and counted cancelled orders as revenue.

create or replace function admin_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  result json;
begin
  if not is_admin() then
    raise exception 'Not authorised.' using errcode = '42501';
  end if;

  select json_build_object(
    'orders_total',      (select count(*) from orders),
    'orders_pending',    (select count(*) from orders where status = 'pending'),
    'custom_pending',    (select count(*) from custom_orders where status = 'pending'),
    'complaints_open',   (select count(*) from complaints where status = 'open'),
    'reviews_pending',   (select count(*) from reviews where status = 'pending'),
    'products_live',     (select count(*) from products where available and stock > 0),
    'products_soldout',  (select count(*) from products where available and stock = 0),
    -- Revenue counts confirmed money only. A cancelled order is not income.
    'revenue_confirmed', (select coalesce(sum(total), 0) from orders
                           where status in ('confirmed','processing','shipped','delivered')),
    'revenue_pending',   (select coalesce(sum(total), 0) from orders where status = 'pending'),
    'orders_last_7d',    (select count(*) from orders where created_at > now() - interval '7 days')
  ) into result;

  return result;
end;
$fn$;

revoke all on function admin_stats() from public;
grant execute on function admin_stats() to authenticated;


-- ═══ KEEP updated_at HONEST ════════════════════════════════════════════════

create or replace function touch_updated_at()
returns trigger language plpgsql as $fn$
begin
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists products_touch      on products;
drop trigger if exists orders_touch        on orders;
drop trigger if exists custom_orders_touch on custom_orders;
drop trigger if exists custom_config_touch on custom_config;

create trigger products_touch      before update on products      for each row execute function touch_updated_at();
create trigger orders_touch        before update on orders        for each row execute function touch_updated_at();
create trigger custom_orders_touch before update on custom_orders for each row execute function touch_updated_at();
create trigger custom_config_touch before update on custom_config for each row execute function touch_updated_at();


-- ═══ INDEXES ═══════════════════════════════════════════════════════════════

create index if not exists products_category_idx   on products (category) where available;
create index if not exists products_featured_idx    on products (featured) where featured;
create index if not exists products_created_idx     on products (created_at desc);
create index if not exists orders_status_idx        on orders (status);
create index if not exists orders_created_idx       on orders (created_at desc);
create index if not exists orders_number_idx        on orders (order_number);
create index if not exists custom_orders_number_idx on custom_orders (order_number);
create index if not exists custom_orders_status_idx on custom_orders (status);
create index if not exists complaints_status_idx    on complaints (status);
create index if not exists reviews_product_idx      on reviews (product_id, status);


-- ═══ STORAGE ═══════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','image/avif'];

-- PRIVATE. Customers write; only admins read, via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-receipts', 'payment-receipts', false, 5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf'];

drop policy if exists "product_images_public_read"  on storage.objects;
drop policy if exists "product_images_admin_write"  on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;
drop policy if exists "receipts_public_read"        on storage.objects;
drop policy if exists "receipts_public_insert"      on storage.objects;
drop policy if exists "receipts_admin_read"         on storage.objects;

create policy "product_images_public_read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');

create policy "product_images_admin_write" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and is_admin());

create policy "product_images_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and is_admin());

-- Customers may drop a receipt in, and may never read one back out —
-- not even their own, and not even if they guess the filename.
create policy "receipts_public_insert" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'payment-receipts');

create policy "receipts_admin_read" on storage.objects
  for select to authenticated using (bucket_id = 'payment-receipts' and is_admin());



-- ═══ EMAIL NOTIFICATIONS ═══════════════════════════════════════════════════
-- AFTER INSERT on orders / custom_orders / complaints, hand the new row to
-- the `notify` Edge Function (supabase/functions/notify/index.ts), which
-- sends the mail through Resend.
--
-- WHY A TRIGGER, AND NOT A CALL FROM THE BROWSER
-- ──────────────────────────────────────────────
-- The browser can close, lose signal or be killed the instant after checkout
-- succeeds. A trigger fires inside the same transaction that created the
-- order, so a paid order can never exist without its receipt having been
-- queued.
--
-- WHY pg_net
-- ──────────
-- net.http_post() only *queues* the request; a background worker sends it
-- after commit. The customer therefore never waits on an HTTP round trip to
-- see their confirmation, and a slow Resend cannot slow down checkout.

create extension if not exists pg_net;

-- The function URL and the shared secret live in Vault, NOT in this file, so
-- this schema stays safe to commit. See the EMAIL SETUP block at the bottom
-- for the two statements that put them there.
create or replace function notify_email()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $fn$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'notify_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'notify_hook_secret';

  -- Not configured yet? Stay silent rather than break checkout.
  if v_url is null or v_secret is null then
    return null;
  end if;

  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'x-hook-secret', v_secret
               ),
    body    := jsonb_build_object(
                 'type',   tg_op,
                 'table',  tg_table_name,
                 'record', to_jsonb(new),
                 -- Lets the function see what an UPDATE actually changed.
                 'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) end
               ),
    timeout_milliseconds := 5000
  );

  return null;

-- An order that has been paid for must never be lost because an email could
-- not be queued. Warn into the Postgres log and let the insert stand.
exception when others then
  raise warning 'notify_email(%) failed: %', tg_table_name, sqlerrm;
  return null;
end;
$fn$;

-- Nothing calls this directly; it runs only as a trigger.
revoke all on function notify_email() from public, anon, authenticated;

drop trigger if exists orders_notify        on orders;
drop trigger if exists custom_orders_notify on custom_orders;
drop trigger if exists complaints_notify    on complaints;

create trigger orders_notify
  after insert on orders
  for each row execute function notify_email();

create trigger custom_orders_notify
  after insert on custom_orders
  for each row execute function notify_email();

create trigger complaints_notify
  after insert on complaints
  for each row execute function notify_email();

-- The reply the admin writes in the panel. ComplaintPage promises an answer
-- "on the email you gave us" within 24-48 hours; without this the response
-- was saved to the row and the customer was never told.
--
-- The WHEN clause stops the common double-send: the admin panel saves status
-- and admin_response together, so moving a complaint open -> in_review ->
-- resolved would otherwise re-send the same reply each time. Note that editing
-- the reply text itself DOES send again -- deliberately, so a corrected answer
-- reaches the customer rather than sitting unseen in the database.
drop trigger if exists complaints_reply_notify on complaints;

create trigger complaints_reply_notify
  after update on complaints
  for each row
  when (
    new.admin_response is not null
    and length(trim(new.admin_response)) > 0
    and old.admin_response is distinct from new.admin_response
  )
  execute function notify_email();

-- Status changes. A customer who pays and then hears nothing until the parcel
-- arrives writes to the complaint form instead, so these two mails are cheaper
-- than the complaint they prevent.
--
-- Only 'confirmed' and 'shipped' are listed: 'processing' tells the customer
-- nothing they can act on, and 'delivered' reaches them after they already
-- have the box. Filtering here as well as in the function means a careless
-- edit to either one cannot start mailing people about every status.
drop trigger if exists orders_status_notify        on orders;
drop trigger if exists custom_orders_status_notify on custom_orders;

create trigger orders_status_notify
  after update on orders
  for each row
  when (
    old.status is distinct from new.status
    and new.status in ('confirmed', 'shipped', 'cancelled')
  )
  execute function notify_email();

create trigger custom_orders_status_notify
  after update on custom_orders
  for each row
  when (
    old.status is distinct from new.status
    and new.status in ('confirmed', 'shipped', 'cancelled')
  )
  execute function notify_email();

-- A customer adding their address or receipt from the track page. Only the
-- null -> value transition fires it, so an admin editing a row never mails anyone.
drop trigger if exists custom_orders_complete_notify on custom_orders;

create trigger custom_orders_complete_notify
  after update on custom_orders
  for each row
  when (
    (old.address is null and new.address is not null)
    or (old.payment_receipt_path is null and new.payment_receipt_path is not null)
  )
  execute function notify_email();

-- ═══ EMAIL EVENTS ══════════════════════════════════════════════════════════
-- What Resend did with each message after we handed it over. Without this, a
-- receipt that silently failed left no trace anywhere in the database — the
-- only record was a dashboard someone had to go and look at.
--
-- Written by the `resend-webhook` Edge Function using the service role, so
-- there is deliberately no insert policy: nothing reachable from a browser
-- may write delivery history.

create table if not exists email_events (
  id          uuid primary key default gen_random_uuid(),
  resend_id   text,                  -- Resend's message id, for joining events
  type        text not null,         -- email.delivered, email.bounced, ...
  recipient   text,
  subject     text,
  occurred_at timestamptz,           -- when Resend says it happened
  payload     jsonb not null,        -- the whole event, so nothing is lost
  created_at  timestamptz not null default now()
);

create index if not exists email_events_resend_id_idx  on email_events (resend_id);
create index if not exists email_events_created_at_idx on email_events (created_at desc);
create index if not exists email_events_type_idx       on email_events (type);

alter table email_events enable row level security;

drop policy if exists "email_events_admin_read" on email_events;

-- Who was emailed what is customer data. Admins only, and read-only even for
-- them — this is a log, not something to edit.
create policy "email_events_admin_read" on email_events
  for select to authenticated using (is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
--  BOOTSTRAP — do this once, by hand, after creating your admin user in
--  Dashboard → Authentication → Users → Add user.
--
--    insert into admins (user_id, email)
--    select id, email from auth.users where email = 'you@example.com'
--    on conflict (user_id) do nothing;
--
--  Then verify — this must return true while signed in as that user:
--    select is_admin();
--
--  And turn OFF public signups:
--    Dashboard → Authentication → Providers → Email → "Allow new users to
--    sign up" = off. You are the only account this project ever needs.
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
--  EMAIL SETUP — do this once, by hand, to switch the triggers above on.
--
--  Until both secrets exist, notify_email() returns quietly and no mail is
--  sent. Nothing else breaks.
--
--  1. Deploy the Edge Function:
--       supabase functions deploy notify --no-verify-jwt
--
--  2. In Dashboard -> Edge Functions -> Secrets, add:
--       RESEND_API_KEY      your Resend API key (re_...)
--       NOTIFY_HOOK_SECRET  the same random value used in step 3
--
--     Optional overrides (the function has sensible defaults):
--       RESEND_FROM   Krystal Beaded Bliss <support@kbbjewelries.com>
--       ADMIN_EMAIL   where new-order and complaint alerts land
--       REPLY_TO      where customer replies land
--       SITE_URL      https://kbbjewelries.com
--
--  3. Put the URL and that same secret into Vault:
--
--       select vault.create_secret(
--         'https://<project-ref>.supabase.co/functions/v1/notify',
--         'notify_function_url',
--         'Endpoint for order and complaint email'
--       );
--
--       select vault.create_secret(
--         '<the same random value as NOTIFY_HOOK_SECRET>',
--         'notify_hook_secret',
--         'Shared secret proving the caller is this database'
--       );
--
--     To rotate later, replace rather than re-create:
--       select vault.update_secret(id, '<new value>')
--         from vault.secrets where name = 'notify_hook_secret';
--
--  4. Verify — place a test order, then check:
--       select id, status_code, created
--         from net._http_response order by created desc limit 5;
--     202/200 means delivered. 401 means the two secrets disagree.
-- ═══════════════════════════════════════════════════════════════════════════
