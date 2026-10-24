-- Phase 5: test markets, FTC Do Not Call complaint counts, public headlines.

------------------------------------------------------------------------------
-- Markets: areas with "Trending near you". Add or edit rows in the dashboard
-- (SQL Editor); no code change needed. See README.
------------------------------------------------------------------------------
create table public.markets (
  id integer generated always as identity primary key,
  name text not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  area_codes text[] not null check (cardinality(area_codes) > 0 and array_to_string(area_codes, ',') ~ '^[0-9]{3}(,[0-9]{3})*$'),
  center_zip text not null references public.zip_centroids (zip),
  radius_miles integer not null default 30 check (radius_miles between 1 and 150),
  -- Shown on Next steps; null uses the generic "your local police non-emergency line".
  police_contact text check (char_length(police_contact) <= 200),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.markets enable row level security;
revoke all on public.markets from anon, authenticated;

insert into public.markets (name, state, area_codes, center_zip, radius_miles)
values ('NY 845', 'NY', '{845}', '10989', 30);

------------------------------------------------------------------------------
-- FTC Do Not Call complaints, aggregated. No phone numbers or cities stored.
------------------------------------------------------------------------------
create table public.dnc_daily_counts (
  day date not null,
  area_code text not null check (area_code ~ '^[0-9]{3}$'),
  subject text not null,
  robocall boolean not null,
  complaints integer not null check (complaints > 0),
  primary key (day, area_code, subject, robocall)
);

-- Which (area code, day) pairs have been fetched, and how many complaints.
create table public.dnc_ingest_days (
  area_code text not null check (area_code ~ '^[0-9]{3}$'),
  day date not null,
  total integer not null,
  fetched_at timestamptz not null default now(),
  primary key (area_code, day)
);

alter table public.dnc_daily_counts enable row level security;
alter table public.dnc_ingest_days enable row level security;
revoke all on public.dnc_daily_counts from anon, authenticated;
revoke all on public.dnc_ingest_days from anon, authenticated;

-- Replace one day's counts for an area code (re-running a day overwrites it).
-- p_counts: [{"subject": text, "robocall": bool, "complaints": int}, ...]
create function public.replace_dnc_day(p_area_code text, p_day date, p_counts jsonb, p_total integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.dnc_daily_counts where area_code = p_area_code and day = p_day;
  insert into public.dnc_daily_counts (day, area_code, subject, robocall, complaints)
  select p_day, p_area_code, c.subject, c.robocall, c.complaints
  from jsonb_to_recordset(p_counts) as c(subject text, robocall boolean, complaints integer)
  where c.complaints > 0;
  insert into public.dnc_ingest_days (area_code, day, total) values (p_area_code, p_day, p_total)
  on conflict (area_code, day) do update set total = excluded.total, fetched_at = now();
end;
$$;

create function public.dnc_ingested_days(p_since date)
returns table (area_code text, day date)
language sql
stable
security definer
set search_path = ''
as $$
  select d.area_code, d.day from public.dnc_ingest_days d where d.day >= p_since;
$$;

------------------------------------------------------------------------------
-- Public headlines (IC3 PSAs; FTC alerts if a feed appears later).
------------------------------------------------------------------------------
create table public.public_scams (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('ic3', 'ftc')),
  title text not null check (char_length(title) <= 500),
  summary text check (char_length(summary) <= 2000),
  region text not null default 'US',
  published_at timestamptz not null,
  url text not null unique check (url ~ '^https://'),
  created_at timestamptz not null default now()
);
create index public_scams_published_idx on public.public_scams (published_at desc);
alter table public.public_scams enable row level security;
revoke all on public.public_scams from anon, authenticated;

------------------------------------------------------------------------------
-- Public reads
------------------------------------------------------------------------------

-- The nearest active market whose center is within its radius of the zip.
create function public.market_for_zip(p_zip text)
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
    and extensions.st_dwithin(z.point, c.point, m.radius_miles * 1609.344)
  order by extensions.st_distance(z.point, c.point)
  limit 1;
$$;

-- Complaints per subject in the latest 7 ingested days vs the 7 before,
-- for a market's area codes. *_days = how many days each window has data for.
create function public.market_trends(p_market_id integer)
returns table (
  subject text,
  this_week integer,
  last_week integer,
  week_ending date,
  this_week_days integer,
  last_week_days integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with m as (select area_codes from public.markets where id = p_market_id and active),
  latest as (
    select max(d.day) as day from public.dnc_ingest_days d, m where d.area_code = any (m.area_codes)
  ),
  days as (
    select
      count(distinct d.day) filter (where d.day > l.day - 7)::integer as this_days,
      count(distinct d.day) filter (where d.day <= l.day - 7 and d.day > l.day - 14)::integer as last_days
    from public.dnc_ingest_days d, m, latest l
    where d.area_code = any (m.area_codes)
  )
  select c.subject,
         coalesce(sum(c.complaints) filter (where c.day > l.day - 7), 0)::integer,
         coalesce(sum(c.complaints) filter (where c.day <= l.day - 7 and c.day > l.day - 14), 0)::integer,
         l.day, days.this_days, days.last_days
  from public.dnc_daily_counts c, m, latest l, days
  where c.area_code = any (m.area_codes) and c.day > l.day - 14
  group by c.subject, l.day, days.this_days, days.last_days
  order by 2 desc;
$$;

create function public.latest_public_scams(p_limit integer default 3)
returns table (source text, title text, published_at timestamptz, url text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.source, s.title, s.published_at, s.url
  from public.public_scams s
  order by s.published_at desc
  limit least(greatest(p_limit, 1), 10);
$$;

revoke execute on function public.replace_dnc_day(text, date, jsonb, integer) from public, anon, authenticated;
revoke execute on function public.dnc_ingested_days(date) from public, anon, authenticated;
grant execute on function public.replace_dnc_day(text, date, jsonb, integer) to service_role;
grant execute on function public.dnc_ingested_days(date) to service_role;

revoke execute on function public.market_for_zip(text) from public;
revoke execute on function public.market_trends(integer) from public;
revoke execute on function public.latest_public_scams(integer) from public;
grant execute on function public.market_for_zip(text) to anon, authenticated;
grant execute on function public.market_trends(integer) to anon, authenticated;
grant execute on function public.latest_public_scams(integer) to anon, authenticated;
