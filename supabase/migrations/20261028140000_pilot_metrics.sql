-- Phase 6: first-party, privacy-respecting pilot metrics. No tracking cookies,
-- no third parties. Anonymous counts are aggregate only.

create table public.usage_daily (
  day date not null,
  metric text not null check (metric in (
    'feed_view', 'check', 'share', 'email_visit_digest', 'email_visit_instant', 'unsubscribe'
  )),
  count integer not null default 0,
  primary key (day, metric)
);
alter table public.usage_daily enable row level security;
revoke all on public.usage_daily from anon, authenticated;

create function public.eastern_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/New_York')::date;
$$;

create function public.bump_usage(p_metric text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.usage_daily (day, metric, count) values (public.eastern_today(), p_metric, 1)
  on conflict (day, metric) do update set count = public.usage_daily.count + 1;
$$;

-- Signed-in activity, one row per user per day. Only used for weekly actives
-- and returning users. Deleted with the account.
create table public.user_activity_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
create index user_activity_days_day_idx on public.user_activity_days (day);
alter table public.user_activity_days enable row level security;
revoke all on public.user_activity_days from anon, authenticated;

create function public.touch_activity()
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.user_activity_days (user_id, day)
  select auth.uid(), public.eastern_today() where auth.uid() is not null
  on conflict do nothing;
$$;

-- Count every switch to "no emails", wherever it happens.
create function public.count_unsubscribe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.alert_mode = 'off' and old.alert_mode is distinct from 'off' then
    perform public.bump_usage('unsubscribe');
  end if;
  return new;
end;
$$;

create trigger profiles_count_unsubscribe
  after update of alert_mode on public.profiles
  for each row execute function public.count_unsubscribe();

-- Alert emails (distinct sends) since the start of today, Eastern. Used by the
-- daily email budget guard.
create function public.alert_emails_sent_today()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(distinct a.batch_id)::integer
  from public.alerts_sent a
  where a.sent_at >= (public.eastern_today()::timestamp at time zone 'America/New_York');
$$;

-- Week-by-week metrics (weeks start Monday, Eastern), newest first.
create function public.pilot_weekly_metrics(p_weeks integer)
returns table (
  week_start date,
  signups integer,
  active_users integer,
  returning_users integer,
  reports integer,
  new_clusters integer,
  corroborations integer,
  checks integer,
  feed_views integer,
  shares integer,
  instant_emails integer,
  digest_emails integer,
  email_visits integer,
  unsubscribes integer,
  flags integer,
  removals integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with weeks as (
    select (date_trunc('week', public.eastern_today()::timestamp) - make_interval(weeks => g))::date as ws
    from generate_series(0, least(greatest(p_weeks, 1), 26) - 1) as g
  ),
  b as (
    select ws,
           (ws::timestamp at time zone 'America/New_York') as t0,
           ((ws + 7)::timestamp at time zone 'America/New_York') as t1
    from weeks
  )
  select b.ws,
    (select count(*) from auth.users u where u.created_at >= b.t0 and u.created_at < b.t1)::integer,
    (select count(distinct a.user_id) from public.user_activity_days a where a.day >= b.ws and a.day < b.ws + 7)::integer,
    (select count(distinct a.user_id) from public.user_activity_days a
      where a.day >= b.ws and a.day < b.ws + 7
        and exists (select 1 from public.user_activity_days e where e.user_id = a.user_id and e.day < b.ws))::integer,
    (select count(*) from public.reports r where r.created_at >= b.t0 and r.created_at < b.t1)::integer,
    (select count(*) from public.clusters c where c.created_at >= b.t0 and c.created_at < b.t1)::integer,
    (select count(*) from public.corroborations k where k.created_at >= b.t0 and k.created_at < b.t1)::integer,
    (select coalesce(sum(u.count), 0) from public.usage_daily u where u.metric = 'check' and u.day >= b.ws and u.day < b.ws + 7)::integer,
    (select coalesce(sum(u.count), 0) from public.usage_daily u where u.metric = 'feed_view' and u.day >= b.ws and u.day < b.ws + 7)::integer,
    (select coalesce(sum(u.count), 0) from public.usage_daily u where u.metric = 'share' and u.day >= b.ws and u.day < b.ws + 7)::integer,
    (select count(distinct a.batch_id) from public.alerts_sent a where a.channel = 'instant' and a.sent_at >= b.t0 and a.sent_at < b.t1)::integer,
    (select count(distinct a.batch_id) from public.alerts_sent a where a.channel = 'digest' and a.sent_at >= b.t0 and a.sent_at < b.t1)::integer,
    (select coalesce(sum(u.count), 0) from public.usage_daily u
      where u.metric in ('email_visit_digest', 'email_visit_instant') and u.day >= b.ws and u.day < b.ws + 7)::integer,
    (select coalesce(sum(u.count), 0) from public.usage_daily u where u.metric = 'unsubscribe' and u.day >= b.ws and u.day < b.ws + 7)::integer,
    (select count(*) from public.flags f where f.created_at >= b.t0 and f.created_at < b.t1)::integer,
    (select count(*) from public.reports r where r.status = 'removed' and r.status_changed_at >= b.t0 and r.status_changed_at < b.t1)::integer
  from b
  order by b.ws desc;
$$;

-- Totals for the pilot success criteria (targets live in src/lib/pilot.ts).
create function public.pilot_summary()
returns table (
  signups_in_market integer,
  total_signups integer,
  clusters_with_reports integer,
  clusters_corroborated integer,
  users_with_activity integer,
  users_returning integer,
  profiles_total integer,
  profiles_off integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*) from public.profiles p
      where p.home_point is not null and exists (
        select 1 from public.markets m join public.zip_centroids c on c.zip = m.center_zip
        where m.active and extensions.st_dwithin(p.home_point, c.point, m.radius_miles * 1609.344)))::integer,
    (select count(*) from public.profiles)::integer,
    (select count(*) from public.clusters c where c.report_count > 0)::integer,
    (select count(*) from public.clusters c where c.report_count > 0 and c.corroboration_count > 0)::integer,
    (select count(distinct a.user_id) from public.user_activity_days a)::integer,
    (select count(*) from (
       select a.user_id from public.user_activity_days a
       group by a.user_id having count(distinct date_trunc('week', a.day::timestamp)) >= 2) x)::integer,
    (select count(*) from public.profiles)::integer,
    (select count(*) from public.profiles p where p.alert_mode = 'off')::integer;
$$;

-- Server key only. The admin page checks is_admin() before reading these.
revoke execute on function public.bump_usage(text) from public, anon, authenticated;
revoke execute on function public.alert_emails_sent_today() from public, anon, authenticated;
revoke execute on function public.pilot_weekly_metrics(integer) from public, anon, authenticated;
revoke execute on function public.pilot_summary() from public, anon, authenticated;
revoke execute on function public.count_unsubscribe() from public, anon, authenticated;
grant execute on function public.bump_usage(text) to service_role;
grant execute on function public.alert_emails_sent_today() to service_role;
grant execute on function public.pilot_weekly_metrics(integer) to service_role;
grant execute on function public.pilot_summary() to service_role;

revoke execute on function public.touch_activity() from public, anon;
grant execute on function public.touch_activity() to authenticated;
