-- Initial schema: machines, bookings, booking secrets, booking RPCs.
--
-- Access model (no user accounts, anon key only):
--   - anyone can read machines and bookings (the schedule is public, like
--     the paper sheet it replaces)
--   - all writes go through security-definer functions; the cancel token
--     lives in booking_secrets, which is not readable by anyone but the
--     functions themselves.

-- ---------------------------------------------------------------------------
-- machines
-- ---------------------------------------------------------------------------

create table public.machines (
  id smallint primary key,
  code text not null unique,
  type text not null check (type in ('washer', 'dryer')),
  location text not null check (location in ('internal', 'external')),
  active boolean not null default true
);

alter table public.machines enable row level security;

create policy "machines_public_read"
  on public.machines for select
  to anon, authenticated
  using (true);

-- Writes only via migrations / dashboard service role: no write policies.
revoke insert, update, delete on public.machines from anon, authenticated;

insert into public.machines (id, code, type, location) values
  (1, 'washer_int_1', 'washer', 'internal'),
  (2, 'washer_int_2', 'washer', 'internal'),
  (3, 'washer_ext_1', 'washer', 'external'),
  (4, 'dryer_int_1', 'dryer', 'internal'),
  (5, 'dryer_ext_1', 'dryer', 'external');

-- ---------------------------------------------------------------------------
-- bookings (public part: what the schedule shows)
-- ---------------------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  machine_id smallint not null references public.machines (id),
  slot_start timestamptz not null,
  name text not null check (char_length(btrim(name)) between 2 and 60),
  apartment text not null check (char_length(btrim(apartment)) between 1 and 20),
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  -- The no-double-booking guarantee: one booking per machine per slot.
  constraint bookings_machine_slot_unique unique (machine_id, slot_start)
);

alter table public.bookings enable row level security;

create policy "bookings_public_read"
  on public.bookings for select
  to anon, authenticated
  using (true);

-- All writes go through the RPCs below.
revoke insert, update, delete on public.bookings from anon, authenticated;

-- Live schedule updates. The bookings row contains no secrets, so the
-- realtime payload is safe.
alter publication supabase_realtime add table public.bookings;

-- ---------------------------------------------------------------------------
-- booking_secrets (cancel tokens — readable by no one)
-- ---------------------------------------------------------------------------

create table public.booking_secrets (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  cancel_token uuid not null default gen_random_uuid()
);

alter table public.booking_secrets enable row level security;
-- No policies at all: invisible to anon/authenticated even for select.
revoke all on public.booking_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: create_booking
-- ---------------------------------------------------------------------------
-- Booking rules (keep in sync with src/lib/config.ts):
--   1-hour slots on the hour, Europe/Rome; first slot 08:00, last slot 22:00
--   (ends 23:00); bookable up to 14 days ahead; a slot already in progress
--   can still be booked until it ends.
-- The consent flag must be true: the UI checkbox is mandatory and the rule
-- is enforced here, not only client-side.

create or replace function public.create_booking(
  p_machine_id smallint,
  p_slot_start timestamptz,
  p_name text,
  p_apartment text,
  p_consent boolean,
  p_note text default null
) returns table (booking_id uuid, cancel_token uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_local timestamp;
  v_id uuid;
  v_token uuid;
begin
  if p_consent is distinct from true then
    raise exception 'consent_required';
  end if;

  if not exists (
    select 1 from machines m where m.id = p_machine_id and m.active
  ) then
    raise exception 'machine_not_available';
  end if;

  v_local := p_slot_start at time zone 'Europe/Rome';

  if extract(minute from v_local) <> 0 or extract(second from v_local) <> 0 then
    raise exception 'slot_not_aligned';
  end if;

  if extract(hour from v_local) < 8 or extract(hour from v_local) > 22 then
    raise exception 'slot_out_of_hours';
  end if;

  if p_slot_start + interval '1 hour' <= now() then
    raise exception 'slot_in_past';
  end if;

  if p_slot_start > now() + interval '14 days' then
    raise exception 'slot_too_far_ahead';
  end if;

  begin
    insert into bookings (machine_id, slot_start, name, apartment, note)
    values (
      p_machine_id,
      p_slot_start,
      btrim(p_name),
      btrim(p_apartment),
      nullif(btrim(coalesce(p_note, '')), '')
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  insert into booking_secrets (booking_id)
  values (v_id)
  returning booking_secrets.cancel_token into v_token;

  return query select v_id, v_token;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: cancel_booking
-- ---------------------------------------------------------------------------
-- Deletes the booking only if the caller holds the matching cancel token
-- (stored in the booking device's localStorage). Returns true on success.

create or replace function public.cancel_booking(
  p_booking_id uuid,
  p_cancel_token uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_deleted integer;
begin
  delete from bookings b
  using booking_secrets s
  where b.id = p_booking_id
    and s.booking_id = b.id
    and s.cancel_token = p_cancel_token;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

-- Functions are callable by anyone; everything else is locked down above.
revoke execute on function public.create_booking from public;
revoke execute on function public.cancel_booking from public;
grant execute on function public.create_booking to anon, authenticated;
grant execute on function public.cancel_booking to anon, authenticated;
