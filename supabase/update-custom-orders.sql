alter table custom_orders add column if not exists address        text;
alter table custom_orders add column if not exists state          text;
alter table custom_orders add column if not exists is_gift        boolean not null default false;
alter table custom_orders add column if not exists recipient_name text;
alter table custom_orders add column if not exists gift_note      text;

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

drop trigger if exists custom_orders_complete_notify on custom_orders;

create trigger custom_orders_complete_notify
  after update on custom_orders
  for each row
  when (
    (old.address is null and new.address is not null)
    or (old.payment_receipt_path is null and new.payment_receipt_path is not null)
  )
  execute function notify_email();
