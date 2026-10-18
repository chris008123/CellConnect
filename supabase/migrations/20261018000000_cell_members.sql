-- CellConnect: new cell member registration
-- Run this once in the Supabase SQL editor (or via the Supabase CLI) BEFORE using
-- the "Register" page. It has NOT been applied to any database by the code change.
--
-- Design notes
--  * The app has no per-user login, so the table is locked down completely
--    (RLS on, no policies, no grants for anon/authenticated). Members can't be
--    read or written directly with the public anon key.
--  * All writes go through register_cell_member(), a SECURITY DEFINER function
--    that re-validates every field on the server, enforces the existing shared
--    settings PIN (app_config.settings_pin) when one is set, flags probable
--    duplicates by phone number, and never overwrites an existing member.

create table if not exists public.cell_members (
  id                uuid primary key default gen_random_uuid(),
  full_name         text not null,
  date_of_birth     date not null,
  phone             text not null,
  email             text,
  hall_hostel       text not null,
  home_location     text not null,
  membership_status text not null,
  created_at        timestamptz not null default now(),

  constraint cell_members_full_name_chk
    check (char_length(btrim(full_name)) between 1 and 120),
  constraint cell_members_dob_chk
    check (date_of_birth <= current_date and date_of_birth >= date '1900-01-01'),
  constraint cell_members_phone_chk
    check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  constraint cell_members_email_chk
    check (email is null or (char_length(email) <= 254 and email ~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$')),
  constraint cell_members_hall_hostel_chk
    check (char_length(btrim(hall_hostel)) between 1 and 120),
  constraint cell_members_home_location_chk
    check (char_length(btrim(home_location)) between 1 and 120),
  constraint cell_members_status_chk
    check (membership_status in ('STAYING', 'VISITING'))
);

-- Non-unique on purpose: a shared phone number is a *possible* duplicate, not proof.
create index if not exists cell_members_phone_idx on public.cell_members (phone);

alter table public.cell_members enable row level security;
revoke all on public.cell_members from anon, authenticated;

create or replace function public.register_cell_member(
  p_id                uuid,
  p_full_name         text,
  p_date_of_birth     date,
  p_phone             text,
  p_email             text,
  p_hall_hostel       text,
  p_home_location     text,
  p_membership_status text,
  p_pin               text default '',
  p_allow_duplicate   boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin   text;
  v_name  text := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_hall  text := regexp_replace(btrim(coalesce(p_hall_hostel, '')), '\s+', ' ', 'g');
  v_home  text := regexp_replace(btrim(coalesce(p_home_location, '')), '\s+', ' ', 'g');
  v_email text := nullif(lower(btrim(coalesce(p_email, ''))), '');
begin
  -- Authorization: reuse the shared PIN the app already keeps in app_config.
  select settings_pin into v_pin from public.app_config where id = 'default';
  if coalesce(btrim(v_pin), '') <> '' and coalesce(btrim(p_pin), '') <> btrim(v_pin) then
    return jsonb_build_object('status', 'unauthorized');
  end if;

  if p_id is null then
    return jsonb_build_object('status', 'invalid', 'message', 'Missing request id.');
  end if;

  -- Idempotent retry: the same request id was already saved (e.g. double tap).
  if exists (select 1 from public.cell_members where id = p_id) then
    return jsonb_build_object('status', 'created', 'id', p_id, 'already', true);
  end if;

  -- Server-side validation (mirrors the table constraints, with friendly messages).
  if v_name = '' or char_length(v_name) > 120 then
    return jsonb_build_object('status', 'invalid', 'field', 'fullName', 'message', 'Please enter a valid full name.');
  end if;
  if p_date_of_birth is null or p_date_of_birth > current_date or p_date_of_birth < date '1900-01-01' then
    return jsonb_build_object('status', 'invalid', 'field', 'dateOfBirth', 'message', 'Please enter a valid date of birth.');
  end if;
  if p_phone is null or p_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return jsonb_build_object('status', 'invalid', 'field', 'phone', 'message', 'Please enter a valid phone number.');
  end if;
  if v_email is not null and (char_length(v_email) > 254 or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$') then
    return jsonb_build_object('status', 'invalid', 'field', 'email', 'message', 'Please enter a valid email address.');
  end if;
  if v_hall = '' or char_length(v_hall) > 120 then
    return jsonb_build_object('status', 'invalid', 'field', 'hallHostel', 'message', 'Please enter the hall or hostel.');
  end if;
  if v_home = '' or char_length(v_home) > 120 then
    return jsonb_build_object('status', 'invalid', 'field', 'homeLocation', 'message', 'Please enter the home location.');
  end if;
  if p_membership_status is null or p_membership_status not in ('STAYING', 'VISITING') then
    return jsonb_build_object('status', 'invalid', 'field', 'membershipStatus', 'message', 'Membership status must be Staying or Visiting.');
  end if;

  -- Probable duplicate: same phone number. Never overwrites; the caller decides.
  if not coalesce(p_allow_duplicate, false)
     and exists (select 1 from public.cell_members where phone = p_phone) then
    return jsonb_build_object('status', 'duplicate');
  end if;

  insert into public.cell_members
    (id, full_name, date_of_birth, phone, email, hall_hostel, home_location, membership_status)
  values
    (p_id, v_name, p_date_of_birth, p_phone, v_email, v_hall, v_home, p_membership_status);

  return jsonb_build_object('status', 'created', 'id', p_id);
end;
$$;

revoke all on function public.register_cell_member(uuid, text, date, text, text, text, text, text, text, boolean) from public;
grant execute on function public.register_cell_member(uuid, text, date, text, text, text, text, text, text, boolean) to anon, authenticated;
