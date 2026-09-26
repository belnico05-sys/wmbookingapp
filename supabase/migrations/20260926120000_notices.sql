-- Notice board ("Bacheca") + push notification subscriptions.
--
-- A student can post a short notice on their own booking ("finishing late",
-- "finished early", or a free text up to 100 characters). People booked on
-- the same machine in the following 3 hours get a push notification on the
-- devices where they accepted notifications. The admin turns the whole
-- feature on/off (settings.notices_enabled, off by default).
--
-- Push notifications are sent by the Vercel function api/notify.ts, which
-- calls claim_notice_push with the service role key.
--
-- Additive: the currently deployed frontend keeps working (it calls
-- admin_update_settings without the new parameter, which is optional).
-- Wrapped in a transaction: if anything fails, nothing is applied.

begin;

-- ---------------------------------------------------------------------------
-- settings: on/off switch
-- ---------------------------------------------------------------------------

alter table public.settings
  add column notices_enabled boolean not null default false;

-- ---------------------------------------------------------------------------
-- notices (public while the feature is on)
-- ---------------------------------------------------------------------------

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  kind text not null check (kind in ('late', 'early', 'custom')),
  -- Only custom notices have a text; the preset ones are translated in the UI.
  message text,
  created_at timestamptz not null default now(),
  -- Set once when the push notifications for this notice have been sent.
  notified_at timestamptz,
  constraint notices_message_check check (
    (kind = 'custom' and message is not null and char_length(message) between 1 and 100)
    or (kind <> 'custom' and message is null)
  )
);

create index notices_booking_id_idx on public.notices (booking_id);

alter table public.notices enable row level security;

create policy "notices_public_read_when_enabled"
  on public.notices for select
  to anon, authenticated
  using (exists (select 1 from public.settings s where s.notices_enabled));

-- Read-only for clients; writes only via post_notice / admin_delete_notice.
revoke all on public.notices from anon, authenticated;
grant select on public.notices to anon, authenticated;

-- Live board updates (payload = the notice row, which is public anyway).
alter publication supabase_realtime add table public.notices;

-- ---------------------------------------------------------------------------
-- push_subscriptions (readable by no client)
-- ---------------------------------------------------------------------------
-- A browser's Web Push subscription, linked to a booking made on that
-- browser. Opt-in (the user accepts a permission pop-up). Rows go away with
-- the booking, and are cleaned up about a day after the slot.

create table public.push_subscriptions (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  lang text not null default 'it' check (lang in ('it', 'en')),
  created_at timestamptz not null default now(),
  primary key (booking_id, endpoint)
);

alter table public.push_subscriptions enable row level security;
-- No policies: only the functions below (and the service role) touch it.
revoke all on public.push_subscriptions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC: post_notice
-- ---------------------------------------------------------------------------
-- Only the device that made the booking (it holds the cancel token) can post,
-- from 1 hour before the slot starts until the slot ends (slots are 1 hour),
-- at most 3 notices per booking.

create or replace function public.post_notice(
  p_booking_id uuid,
  p_cancel_token uuid,
  p_kind text,
  p_message text default null
) returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_slot timestamptz;
  v_message text;
  v_count integer;
  v_id uuid;
begin
  if not exists (select 1 from settings where notices_enabled) then
    raise exception 'notices_disabled';
  end if;

  -- Lock the booking row so two simultaneous posts can't both pass the limit.
  select b.slot_start into v_slot
  from bookings b
  join booking_secrets s on s.booking_id = b.id
  where b.id = p_booking_id and s.cancel_token = p_cancel_token
  for no key update of b;
  if not found then
    raise exception 'not_your_booking';
  end if;

  if now() < v_slot - interval '1 hour' then
    raise exception 'notice_too_early';
  end if;
  if now() > v_slot + interval '1 hour' then
    raise exception 'notice_too_late';
  end if;

  if p_kind is null or p_kind not in ('late', 'early', 'custom') then
    raise exception 'notice_invalid';
  end if;
  if p_kind = 'custom' then
    v_message := nullif(btrim(coalesce(p_message, '')), '');
    if v_message is null or char_length(v_message) > 100 then
      raise exception 'notice_invalid';
    end if;
  end if;

  select count(*) into v_count from notices where booking_id = p_booking_id;
  if v_count >= 3 then
    raise exception 'notice_limit';
  end if;

  insert into notices (booking_id, kind, message)
  values (p_booking_id, p_kind, v_message)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: register_push
-- ---------------------------------------------------------------------------
-- Links this browser's push subscription to one of its bookings (proved by
-- the cancel token). Only real push-service addresses are accepted, so the
-- sending function can never be pointed at an arbitrary server.

create or replace function public.register_push(
  p_booking_id uuid,
  p_cancel_token uuid,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_lang text
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from booking_secrets
    where booking_id = p_booking_id and cancel_token = p_cancel_token
  ) then
    raise exception 'not_your_booking';
  end if;

  if p_endpoint is null or p_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com)/' then
    raise exception 'push_invalid';
  end if;

  -- At most 5 devices per booking, so nobody can flood the table (the lock
  -- makes the count reliable when two calls arrive together).
  perform 1 from bookings where id = p_booking_id for no key update;
  if (
    select count(*) from push_subscriptions
    where booking_id = p_booking_id and endpoint <> p_endpoint
  ) >= 5 then
    raise exception 'push_limit';
  end if;

  -- Opportunistic cleanup: subscriptions of slots that ended over a day ago.
  delete from push_subscriptions ps
  using bookings b
  where ps.booking_id = b.id and b.slot_start < now() - interval '1 day';

  insert into push_subscriptions (booking_id, endpoint, p256dh, auth, lang)
  values (
    p_booking_id,
    p_endpoint,
    p_p256dh,
    p_auth,
    case when p_lang = 'en' then 'en' else 'it' end
  )
  on conflict (booking_id, endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: claim_notice_push (service role only: called by api/notify.ts)
-- ---------------------------------------------------------------------------
-- Marks the notice as notified (only the first call does anything) and
-- returns who to notify: subscriptions of bookings on the same machine that
-- start in the 3 hours after the notice's slot. One row per device; the
-- poster's own devices are left out. Output columns are prefixed with r_ so
-- they can't clash with table columns inside the function.

create or replace function public.claim_notice_push(
  p_notice_id uuid
) returns table (
  r_machine_type text,
  r_machine_label text,
  r_machine_location text,
  r_slot_start timestamptz,
  r_kind text,
  r_message text,
  r_endpoint text,
  r_p256dh text,
  r_auth text,
  r_lang text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_notice notices%rowtype;
  v_machine_id smallint;
  v_slot timestamptz;
begin
  update notices set notified_at = now()
  where id = p_notice_id and notified_at is null
  returning * into v_notice;
  if not found then
    return; -- unknown notice, or already sent
  end if;

  if not exists (select 1 from settings where notices_enabled) then
    return;
  end if;

  select b.machine_id, b.slot_start into v_machine_id, v_slot
  from bookings b where b.id = v_notice.booking_id;

  return query
  select distinct on (ps.endpoint)
    m.type, m.label, m.location, v_slot, v_notice.kind, v_notice.message,
    ps.endpoint, ps.p256dh, ps.auth, ps.lang
  from bookings b
  join push_subscriptions ps on ps.booking_id = b.id
  join machines m on m.id = b.machine_id
  where b.machine_id = v_machine_id
    and b.slot_start >= v_slot + interval '1 hour'
    and b.slot_start < v_slot + interval '4 hours'
    and b.id <> v_notice.booking_id
    and ps.endpoint not in (
      select endpoint from push_subscriptions where booking_id = v_notice.booking_id
    )
  order by ps.endpoint
  limit 200;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: settings switch (replaces the function from 20260924120000) + delete
-- ---------------------------------------------------------------------------
-- The new parameter is optional (null = leave unchanged), so the previously
-- deployed admin panel, which does not send it, keeps working.

drop function public.admin_update_settings(text, integer, integer, integer, integer);

create function public.admin_update_settings(
  p_residence_name text,
  p_apartment_count integer,
  p_first_slot_hour integer,
  p_last_slot_hour integer,
  p_window_days integer,
  p_notices_enabled boolean default null
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
    notices_enabled = coalesce(p_notices_enabled, notices_enabled),
    updated_at = now()
  where id;

  if not found then
    raise exception 'settings_missing';
  end if;
end;
$$;

create or replace function public.admin_delete_notice(
  p_notice_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not is_admin() then
    raise exception 'not_admin';
  end if;

  delete from notices where id = p_notice_id;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (Supabase grants execute to anon by default: be explicit)
-- ---------------------------------------------------------------------------

revoke execute on function public.post_notice(uuid, uuid, text, text) from public;
revoke execute on function public.register_push(uuid, uuid, text, text, text, text) from public;
grant execute on function public.post_notice(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.register_push(uuid, uuid, text, text, text, text) to anon, authenticated;

revoke execute on function public.claim_notice_push(uuid) from public, anon, authenticated;
grant execute on function public.claim_notice_push(uuid) to service_role;

revoke execute on function public.admin_update_settings(text, integer, integer, integer, integer, boolean) from public, anon;
revoke execute on function public.admin_delete_notice(uuid) from public, anon;
grant execute on function public.admin_update_settings(text, integer, integer, integer, integer, boolean) to authenticated;
grant execute on function public.admin_delete_notice(uuid) to authenticated;

commit;
