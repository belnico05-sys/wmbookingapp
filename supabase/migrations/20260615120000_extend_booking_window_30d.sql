-- Extend the booking window from 14 to 30 days ahead.
-- Replaces create_booking: the only change vs the initial migration is the
-- "too far ahead" guard, now 31 days. We use 31 (not 30) so that evening
-- slots on day +30 are not rejected by the time-of-day component of now()
-- (a 22:00 slot on the last day is < now() + 31 days regardless of the hour).
-- Keep in sync with WINDOW_DAYS = 30 in src/lib/config.ts.

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

  if p_slot_start > now() + interval '31 days' then
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
