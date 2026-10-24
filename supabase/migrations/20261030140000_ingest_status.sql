-- Ingest status with fetch times, so frequent scheduled runs can skip work
-- already done, plus a daily coverage check for admin alerts.

create function public.dnc_ingest_status(p_since date)
returns table (area_code text, day date, total integer, fetched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.area_code, d.day, d.total, d.fetched_at from public.dnc_ingest_days d where d.day >= p_since;
$$;

create function public.dnc_state_ingest_status(p_since date)
returns table (state text, day date, total integer, fetched_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select d.state, d.day, d.total, d.fetched_at from public.dnc_state_ingest_days d where d.day >= p_since;
$$;

-- How many states and market area codes were fetched in the last p_hours.
create function public.dnc_coverage(p_hours integer)
returns table (states_fresh integer, market_codes_stale text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(distinct d.state)::integer from public.dnc_state_ingest_days d
      where d.fetched_at > now() - make_interval(hours => p_hours)),
    coalesce((
      select array_agg(c order by c) from (
        select distinct unnest(m.area_codes) as c from public.markets m where m.active
      ) codes
      where not exists (
        select 1 from public.dnc_ingest_days d
        where d.area_code = codes.c and d.fetched_at > now() - make_interval(hours => p_hours)
      )
    ), '{}');
$$;

revoke execute on function public.dnc_ingest_status(date) from public, anon, authenticated;
revoke execute on function public.dnc_state_ingest_status(date) from public, anon, authenticated;
revoke execute on function public.dnc_coverage(integer) from public, anon, authenticated;
grant execute on function public.dnc_ingest_status(date) to service_role;
grant execute on function public.dnc_state_ingest_status(date) to service_role;
grant execute on function public.dnc_coverage(integer) to service_role;
