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

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  slug        text,
  name        text not null check (length(trim(name)) between 1 and 120),
  category    text not null check (category in ('bracelet','necklace','earrings','anklet','set')),
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
  '{"bracelet":5000,"necklace":8000,"earrings":4000}'::jsonb
where not exists (select 1 from custom_config);


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
  piece_type           text not null check (piece_type in ('bracelet','necklace','earrings')),
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

create or replace function place_order(
  p_customer_name text,
  p_email         text,
  p_phone         text,
  p_address       text,
  p_state         text,
  p_items         jsonb,          -- [{"product_id":"uuid","quantity":2}, ...]
  p_receipt_path  text,
  p_notes         text default null
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
    items, subtotal, delivery_fee, total, payment_receipt_path, status, notes
  ) values (
    v_number, trim(p_customer_name), lower(trim(p_email)), trim(p_phone),
    trim(p_address), trim(p_state),
    v_lines, v_subtotal, v_delivery_fee, v_subtotal + v_delivery_fee,
    p_receipt_path, 'pending', nullif(trim(coalesce(p_notes,'')), '')
  );

  return query select v_number, v_subtotal + v_delivery_fee;
end;
$fn$;

revoke all on function place_order(text,text,text,text,text,jsonb,text,text) from public;
grant execute on function place_order(text,text,text,text,text,jsonb,text,text) to anon, authenticated;


-- ═══ PLACE CUSTOM ORDER ════════════════════════════════════════════════════
-- Same principle: the estimate is derived from custom_config on the server.

create or replace function place_custom_order(
  p_customer_name text,
  p_email         text,
  p_phone         text,
  p_piece_type    text,
  p_bead_types    text[],
  p_color         text,
  p_charms        text[],
  p_quantity      integer,
  p_notes         text default null
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
  if p_piece_type not in ('bracelet','necklace','earrings') then
    raise exception 'Please choose a piece type.' using errcode = '22000';
  end if;
  if p_bead_types is null or array_length(p_bead_types, 1) is null then
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
    order_number, customer_name, email, phone, piece_type, configuration,
    estimated_price, status
  ) values (
    v_number, trim(p_customer_name), lower(trim(p_email)), trim(p_phone), p_piece_type,
    jsonb_build_object(
      'bead_types', to_jsonb(p_bead_types),
      'color',      p_color,
      'charms',     to_jsonb(coalesce(p_charms, '{}'::text[])),
      'quantity',   p_quantity,
      'notes',      nullif(trim(coalesce(p_notes,'')), '')
    ),
    v_total, 'pending'
  );

  return query select v_number, v_total;
end;
$fn$;

revoke all on function place_custom_order(text,text,text,text,text[],text,text[],integer,text) from public;
grant execute on function place_custom_order(text,text,text,text,text[],text,text[],integer,text) to anon, authenticated;


-- ═══ TRACK ORDER ═══════════════════════════════════════════════════════════
-- (Also missing from the previous schema, while the app called it by name.)
-- Deliberately narrow: an order number reveals status and a first name.
-- It never reveals email, phone, address or the receipt.

create or replace function track_order(p_order_number text)
returns table (
  order_number    text,
  status          text,
  first_name      text,
  total           integer,
  estimated_price integer,
  is_custom       boolean,
  created_at      timestamptz
)
language sql
stable
security definer
set search_path = public
as $fn$
  select * from (
    select o.order_number, o.status, split_part(o.customer_name, ' ', 1) as first_name,
           o.total, null::integer as estimated_price, false as is_custom, o.created_at
      from orders o
     where upper(trim(o.order_number)) = upper(trim(p_order_number))
    union all
    select c.order_number, c.status, split_part(c.customer_name, ' ', 1),
           null::integer, c.estimated_price, true, c.created_at
      from custom_orders c
     where upper(trim(c.order_number)) = upper(trim(p_order_number))
  ) hits
  limit 1;
$fn$;

revoke all on function track_order(text) from public;
grant execute on function track_order(text) to anon, authenticated;


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
