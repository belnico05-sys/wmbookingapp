-- Per-residence settings, admin accounts and admin functions.
--
-- Each residence runs its own copy of the app (its own Supabase project), so
-- everything that differs between residences lives in the single-row
-- `settings` table and is edited from the admin panel (/#/admin).
--
-- Additive only: the previous frontend keeps working while this is applied.
-- (It simply gets a generic error if someone types a non-numeric apartment.)

-- ---------------------------------------------------------------------------
-- settings (exactly one row)
-- ---------------------------------------------------------------------------

create table public.settings (
  -- Always true: the primary key + check make a second row impossible.
  id boolean primary key default true check (id),
  residence_name text not null default '' check (char_length(residence_name) <= 80),
  apartment_count smallint not null default 34 check (apartment_count between 1 and 999),
  -- Local (Europe/Rome) hour at which the first / last 1-hour slot starts.
  first_slot_hour smallint not null default 8 check (first_slot_hour between 0 and 23),
  last_slot_hour smallint not null default 22 check (last_slot_hour between 0 and 23),
  -- Bookable days: today + window_days.
  window_days smallint not null default 30 check (window_days between 1 and 90),
  updated_at timestamptz not null default now(),
  constraint settings_hours_order check (first_slot_hour <= last_slot_hour)
);

insert into public.settings default values;

alter table public.settings enable row level security;

-- The app needs these values to draw the calendar and the booking form.
create policy "settings_public_read"
  on public.settings for select
  to anon, authenticated
  using (true);

-- Read-only for clients; writes only via admin_update_settings below.
-- (Supabase grants ALL on new tables by default, so start from nothing.)
revoke all on public.settings from anon, authenticated;
grant select on public.settings to anon, authenticated;

-- Same hardening for the tables from the init migration, which only revoked
-- insert/update/delete. Clients keep exactly what they had: select.
revoke truncate, references, trigger on public.machines, public.bookings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- admins (Supabase Auth users allowed to use the admin panel)
-- ---------------------------------------------------------------------------
-- Add one with:
--   insert into admins (user_id) select id from auth.users where email = '...';

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;
-- No policies at all: readable by no one except the functions below.
revoke all on public.admins from anon, authenticated;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Callable by everyone: it only ever answers about the caller (false for anon).
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- machines: display label + retired flag
-- ---------------------------------------------------------------------------
-- Name shown in the app = type + label + location, translated in the UI
-- (e.g. "Lavatrice 1 (interna)"). active = false means "under maintenance"
-- (visible, not bookable); retired = true hides the machine completely while
-- keeping its past bookings.

alter table public.machines
  add column label text not null default '' check (char_length(label) <= 30),
  add column retired boolean not null default false;

-- Keep the names the app showed before this migration.
update public.machines set label = '1' where code = 'washer_int_1';
update public.machines set label = '2' where code = 'washer_int_2';

-- ---------------------------------------------------------------------------
-- RPC: create_booking (replaces 20260615120000_extend_booking_window_30d.sql)
-- ---------------------------------------------------------------------------
-- Changes: opening hours and booking window now come from `settings`; the
-- apartment must be a number between 1 and settings.apartment_count; retired
-- machines cannot be booked. Slots stay 1 hour long, on the hour.

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
  v_settings settings%rowtype;
  v_local timestamp;
  v_apartment text;
  v_id uuid;
  v_token uuid;
begin
  if p_consent is distinct from true then
    raise exception 'consent_required';
  end if;

  select * into v_settings from settings where id;
  -- Without the row every check below would compare with null and pass.
  if not found then
    raise exception 'settings_missing';
  end if;

  if not exists (
    select 1 from machines m
    where m.id = p_machine_id and m.active and not m.retired
  ) then
    raise exception 'machine_not_available';
  end if;

  -- Two separate checks: SQL does not guarantee left-to-right evaluation of
  -- OR, so the cast must only run once the text is known to be numeric.
  v_apartment := btrim(coalesce(p_apartment, ''));
  if v_apartment !~ '^[0-9]{1,4}$' then
    raise exception 'apartment_invalid';
  end if;
  if v_apartment::int not between 1 and v_settings.apartment_count then
    raise exception 'apartment_invalid';
  end if;
  v_apartment := (v_apartment::int)::text; -- '07' -> '7'

  v_local := p_slot_start at time zone 'Europe/Rome';

  if extract(minute from v_local) <> 0 or extract(second from v_local) <> 0 then
    raise exception 'slot_not_aligned';
  end if;

  if extract(hour from v_local) < v_settings.first_slot_hour
     or extract(hour from v_local) > v_settings.last_slot_hour then
    raise exception 'slot_out_of_hours';
  end if;

  if p_slot_start + interval '1 hour' <= now() then
    raise exception 'slot_in_past';
  end if;

  -- +1 day so that evening slots on the last bookable day are not rejected
  -- because of the time-of-day part of now() (see the 30-day migration).
  if p_slot_start > now() + make_interval(days => v_settings.window_days + 1) then
    raise exception 'slot_too_far_ahead';
  end if;

  begin
    insert into bookings (machine_id, slot_start, name, apartment, note)
    values (
      p_machine_id,
      p_slot_start,
      btrim(p_name),
      v_apartment,
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
-- Admin RPCs: each one refuses callers that are not in `admins`
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_settings(
  p_residence_name text,
  p_apartment_count integer,
  p_first_slot_hour integer,
  p_last_slot_hour integer,
  p_window_days integer
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  -- Existing bookings are kept even if they fall outside the new values.
  update settings set
    residence_name = btrim(coalesce(p_residence_name, '')),
    apartment_count = p_apartment_count,
    first_slot_hour = p_first_slot_hour,
    last_slot_hour = p_last_slot_hour,
    window_days = p_window_days,
    updated_at = now()
  where id;

  if not found then
    raise exception 'settings_missing';
  end if;
end;
$$;

create or replace function public.admin_add_machine(
  p_type text,
  p_location text,
  p_label text
) returns smallint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id smallint;
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  select coalesce(max(id), 0) + 1 into v_id from machines;

  -- type/location are validated by the table's check constraints.
  insert into machines (id, code, type, location, label)
  values (
    v_id,
    -- Same format as the original machines, e.g. washer_int_6.
    p_type || '_' || case p_location when 'internal' then 'int' else 'ext' end || '_' || v_id,
    p_type,
    p_location,
    btrim(coalesce(p_label, ''))
  );

  return v_id;
end;
$$;

create or replace function public.admin_update_machine(
  p_machine_id integer,
  p_label text,
  p_active boolean,
  p_retired boolean
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  -- Existing bookings on a machine put under maintenance or retired are
  -- kept; the admin can delete them from the bookings list if needed.
  update machines set
    label = btrim(coalesce(p_label, '')),
    active = p_active,
    retired = p_retired
  where id = p_machine_id;

  if not found then
    raise exception 'machine_not_found';
  end if;
end;
$$;

create or replace function public.admin_delete_booking(
  p_booking_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  -- booking_secrets row goes with it (on delete cascade).
  delete from bookings where id = p_booking_id;
  return found;
end;
$$;

-- Admin functions: signed-in users only (the is_admin() check does the rest).
-- Supabase grants execute to anon by default, so revoke it explicitly.
revoke execute on function public.admin_update_settings(text, integer, integer, integer, integer) from public, anon;
revoke execute on function public.admin_add_machine(text, text, text) from public, anon;
revoke execute on function public.admin_update_machine(integer, text, boolean, boolean) from public, anon;
revoke execute on function public.admin_delete_booking(uuid) from public, anon;
grant execute on function public.admin_update_settings(text, integer, integer, integer, integer) to authenticated;
grant execute on function public.admin_add_machine(text, text, text) to authenticated;
grant execute on function public.admin_update_machine(integer, text, boolean, boolean) to authenticated;
grant execute on function public.admin_delete_booking(uuid) to authenticated;
