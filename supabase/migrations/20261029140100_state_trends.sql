-- Trending by state: markets match only zips in the same state; state-level
-- FTC complaint counts for every state; trend windows end at the latest day
-- that has data (the FTC publishes weekdays around noon Eastern).

------------------------------------------------------------------------------
-- Markets must be in the state of their center zip.
------------------------------------------------------------------------------
create function public.check_market_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.zip_centroids z where z.zip = new.center_zip and z.state = new.state) then
    raise exception 'Market center zip % is not in %', new.center_zip, new.state using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger markets_check_state
  before insert or update of state, center_zip on public.markets
  for each row execute function public.check_market_state();

insert into public.markets (name, state, area_codes, center_zip, radius_miles)
values ('NJ Bergen', 'NJ', '{201,551}', '07601', 18);

-- Same state as the zip, then within the radius.
create or replace function public.market_for_zip(p_zip text)
returns table (id integer, name text, state text, area_codes text[], police_contact text)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.name, m.state, m.area_codes, m.police_contact
  from public.markets m
  join public.zip_centroids c on c.zip = m.center_zip
  join public.zip_centroids z on z.zip = p_zip
  where m.active
    and z.state = m.state
    and extensions.st_dwithin(z.point, c.point, m.radius_miles * 1609.344)
  order by extensions.st_distance(z.point, c.point)
  limit 1;
$$;

create function public.zip_state(p_zip text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select z.state from public.zip_centroids z where z.zip = p_zip;
$$;

------------------------------------------------------------------------------
-- Market counts are now limited to complaints from the market's state.
-- Clear the old (unfiltered) counts; the next ingest re-fetches them.
------------------------------------------------------------------------------
delete from public.dnc_daily_counts;
delete from public.dnc_ingest_days;

-- Windows end at the latest day with complaints; zero days (weekends) still count as days.
create or replace function public.market_trends(p_market_id integer)
returns table (
  subject text, this_week integer, last_week integer, week_ending date, this_week_days integer, last_week_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with m as (select area_codes from public.markets where id = p_market_id and active),
  ingested as (
    select d.day, sum(d.total) as total from public.dnc_ingest_days d, m
    where d.area_code = any (m.area_codes) group by d.day
  ),
  latest as (select max(i.day) as day from ingested i where i.total > 0),
  days as (
    select
      count(*) filter (where i.day > l.day - 7 and i.day <= l.day)::integer as this_days,
      count(*) filter (where i.day <= l.day - 7 and i.day > l.day - 14)::integer as last_days
    from ingested i, latest l
  )
  select c.subject,
         coalesce(sum(c.complaints) filter (where c.day > l.day - 7), 0)::integer,
         coalesce(sum(c.complaints) filter (where c.day <= l.day - 7), 0)::integer,
         l.day, days.this_days, days.last_days
  from public.dnc_daily_counts c, m, latest l, days
  where c.area_code = any (m.area_codes) and c.day > l.day - 14 and c.day <= l.day
  group by c.subject, l.day, days.this_days, days.last_days
  order by 2 desc;
$$;

------------------------------------------------------------------------------
-- State-level counts (every state). No phone numbers, cities, or area codes.
------------------------------------------------------------------------------
create table public.dnc_state_daily_counts (
  day date not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  subject text not null,
  robocall boolean not null,
  complaints integer not null check (complaints > 0),
  primary key (day, state, subject, robocall)
);

-- A (state, day) row means that day was fully fetched for the state.
create table public.dnc_state_ingest_days (
  state text not null check (state ~ '^[A-Z]{2}$'),
  day date not null,
  total integer not null,
  fetched_at timestamptz not null default now(),
  primary key (state, day)
);

alter table public.dnc_state_daily_counts enable row level security;
alter table public.dnc_state_ingest_days enable row level security;
revoke all on public.dnc_state_daily_counts from anon, authenticated;
revoke all on public.dnc_state_ingest_days from anon, authenticated;

-- Replace one state's day (re-running a day overwrites it).
-- p_counts: [{"subject": text, "robocall": bool, "complaints": int}, ...]
create function public.replace_dnc_state_day(p_state text, p_day date, p_counts jsonb, p_total integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.dnc_state_daily_counts where state = p_state and day = p_day;
  insert into public.dnc_state_daily_counts (day, state, subject, robocall, complaints)
  select p_day, p_state, c.subject, c.robocall, c.complaints
  from jsonb_to_recordset(p_counts) as c(subject text, robocall boolean, complaints integer)
  where c.complaints > 0;
  insert into public.dnc_state_ingest_days (state, day, total) values (p_state, p_day, p_total)
  on conflict (state, day) do update set total = excluded.total, fetched_at = now();
end;
$$;

create function public.state_trends(p_state text)
returns table (
  subject text, this_week integer, last_week integer, week_ending date, this_week_days integer, last_week_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with ingested as (select d.day, d.total from public.dnc_state_ingest_days d where d.state = p_state),
  latest as (select max(i.day) as day from ingested i where i.total > 0),
  days as (
    select
      count(*) filter (where i.day > l.day - 7 and i.day <= l.day)::integer as this_days,
      count(*) filter (where i.day <= l.day - 7 and i.day > l.day - 14)::integer as last_days
    from ingested i, latest l
  )
  select c.subject,
         coalesce(sum(c.complaints) filter (where c.day > l.day - 7), 0)::integer,
         coalesce(sum(c.complaints) filter (where c.day <= l.day - 7), 0)::integer,
         l.day, days.this_days, days.last_days
  from public.dnc_state_daily_counts c, latest l, days
  where c.state = p_state and c.day > l.day - 14 and c.day <= l.day
  group by c.subject, l.day, days.this_days, days.last_days
  order by 2 desc;
$$;

revoke execute on function public.check_market_state() from public, anon, authenticated;
revoke execute on function public.replace_dnc_state_day(text, date, jsonb, integer) from public, anon, authenticated;
grant execute on function public.replace_dnc_state_day(text, date, jsonb, integer) to service_role;

revoke execute on function public.zip_state(text) from public;
revoke execute on function public.state_trends(text) from public;
grant execute on function public.zip_state(text) to anon, authenticated;
grant execute on function public.state_trends(text) to anon, authenticated;
