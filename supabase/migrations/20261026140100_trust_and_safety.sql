-- Phase 4: ratings, flags, admin takedown, reputation, and visibility rules.

------------------------------------------------------------------------------
-- Admins (owner-only). Add rows by hand in the dashboard; see README.
------------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

------------------------------------------------------------------------------
-- Ratings (private; feed reputation only)
------------------------------------------------------------------------------
create table public.ratings (
  user_id uuid not null references auth.users (id) on delete cascade,
  report_id uuid not null references public.reports (id) on delete cascade,
  helpful boolean not null,
  created_at timestamptz not null default now(),
  primary key (user_id, report_id)
);
create index ratings_report_id_idx on public.ratings (report_id);
alter table public.ratings enable row level security;
create policy "Users can read their own ratings"
  on public.ratings for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.ratings from anon, authenticated;
grant select on public.ratings to authenticated;

------------------------------------------------------------------------------
-- Flags
------------------------------------------------------------------------------
create type public.flag_reason as enum ('personal_info', 'private_person', 'not_a_scam', 'spam', 'other');
create type public.flag_status as enum ('open', 'removed', 'dismissed');

create table public.flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reason public.flag_reason not null,
  -- Redacted by the app before insert.
  details text check (char_length(details) <= 600),
  status public.flag_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null,
  unique (report_id, user_id)
);
create index flags_open_idx on public.flags (report_id) where status = 'open';
alter table public.flags enable row level security;
create policy "Users can read their own flags"
  on public.flags for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.flags from anon, authenticated;
grant select on public.flags to authenticated;

------------------------------------------------------------------------------
-- Reputation (brief §4). Computed live; tune the numbers here.
------------------------------------------------------------------------------

-- Non-recursive "good standing" used when counting other people's support:
-- account older than a day and no reports removed by an admin.
create function public.basic_standing(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from auth.users u where u.id = p_user and u.created_at < now() - interval '1 day')
     and not exists (select 1 from public.reports r where r.user_id = p_user and r.status = 'removed');
$$;

--   +1 per week of account age (max +4)
--   +2 per own active report that someone else joined or corroborated (max +10)
--   +1 / -1 per helpful / not-helpful rating received (max +10, no floor)
--   -5 per report removed by an admin
-- Only support from accounts in basic standing counts.
create function public.reputation(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select (
    coalesce((select least(4, floor(extract(epoch from (now() - u.created_at)) / 604800))::integer
              from auth.users u where u.id = p_user), 0)
    + least(10, 2 * (
        select count(*) from public.reports r
        where r.user_id = p_user and r.status = 'active' and r.cluster_id is not null
          and (exists (select 1 from public.reports o
                       where o.cluster_id = r.cluster_id and o.user_id <> p_user and o.status = 'active'
                         and public.basic_standing(o.user_id))
               or exists (select 1 from public.corroborations k
                          where k.cluster_id = r.cluster_id and k.user_id <> p_user
                            and public.basic_standing(k.user_id)))
      ))::integer
    + least(10, coalesce((
        select sum(case when g.helpful then 1 else -1 end)
        from public.ratings g join public.reports r on r.id = g.report_id
        where r.user_id = p_user and g.user_id <> p_user and public.basic_standing(g.user_id)
      ), 0))::integer
    - 5 * (select count(*) from public.reports r where r.user_id = p_user and r.status = 'removed')::integer
  );
$$;

-- Limited accounts' reports and corroborations are hidden from others and
-- don't count toward alerts.
create function public.is_limited(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.reputation(p_user) < 0;
$$;

-- Weight toward the instant-alert threshold: established accounts count 1, others 0.5.
create function public.alert_weight(p_user uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.reputation(p_user) >= 3 then 1.0 else 0.5 end;
$$;

-- Reports others can see: active and not from a limited account.
-- Reputation is computed once per distinct author.
create function public.visible_reports()
returns setof public.reports
language sql
stable
security definer
set search_path = ''
as $$
  with authors as (select distinct r.user_id from public.reports r where r.status = 'active'),
  limited as (select a.user_id from authors a where public.is_limited(a.user_id))
  select r.* from public.reports r
  where r.status = 'active' and r.user_id not in (select l.user_id from limited l);
$$;

------------------------------------------------------------------------------
-- Cluster counts now reflect only visible reports and non-limited corroborators
------------------------------------------------------------------------------
create or replace function public.refresh_cluster(p_cluster_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clusters c
  set report_count = s.n,
      corroboration_count = (
        select count(*)::integer from public.corroborations k
        where k.cluster_id = p_cluster_id and not public.is_limited(k.user_id)
      ),
      centroid = coalesce(s.centroid, c.centroid),
      first_seen = coalesce(s.first_seen, c.first_seen),
      last_seen = coalesce(s.last_seen, c.last_seen)
  from (
    select count(*)::integer as n,
           extensions.st_centroid(extensions.st_collect(r.point::extensions.geometry))::extensions.geography as centroid,
           min(r.created_at) as first_seen,
           max(r.created_at) as last_seen
    from public.visible_reports() r
    where r.cluster_id = p_cluster_id
  ) s
  where c.id = p_cluster_id;
$$;

-- Recount every cluster a user touched (their reputation may have changed).
create function public.refresh_user_clusters(p_user uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select public.refresh_cluster(x.cluster_id)
  from (
    select r.cluster_id from public.reports r where r.user_id = p_user and r.cluster_id is not null
    union
    select k.cluster_id from public.corroborations k where k.user_id = p_user
  ) x;
$$;

create function public.refresh_clusters(p_cluster_ids uuid[])
returns void
language sql
security definer
set search_path = ''
as $$
  select public.refresh_cluster(x) from unnest(p_cluster_ids) as x;
$$;

-- Weighted support for instant alerts (app compares to ALERT_INSTANT_THRESHOLD).
create function public.cluster_alert_signal(p_cluster_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select
    coalesce((select sum(public.alert_weight(r.user_id)) from public.visible_reports() r where r.cluster_id = p_cluster_id), 0)
    + coalesce((select sum(public.alert_weight(k.user_id)) from public.corroborations k
                where k.cluster_id = p_cluster_id and not public.is_limited(k.user_id)), 0);
$$;

------------------------------------------------------------------------------
-- Public reads: same signatures as before, now using visible_reports().
-- A limited reporter still sees their own cluster and report.
------------------------------------------------------------------------------
create or replace function public.nearby_clusters(origin_zip text, radius_miles integer, max_results integer default 50)
returns table (
  cluster_id uuid, scam_type public.scam_type, report_count integer, corroboration_count integer,
  last_seen timestamptz, distance_miles double precision, nearest_zip text,
  latest_description text, latest_channel public.report_channel
)
language sql
stable
security definer
set search_path = ''
as $$
  with o as (select z.point from public.zip_centroids z where z.zip = origin_zip),
  vis as (select * from public.visible_reports()),
  near as (
    select r.cluster_id,
           min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from vis r cross join o
    where r.cluster_id is not null
      and extensions.st_dwithin(r.point, o.point, least(greatest(radius_miles, 1), 50) * 1609.344)
    group by r.cluster_id
  )
  select c.id, c.scam_type, c.report_count, c.corroboration_count, c.last_seen,
         near.d / 1609.344, near.nearest_zip, l.description_redacted, l.channel
  from near
  join public.clusters c on c.id = near.cluster_id
  cross join lateral (
    select r.description_redacted, r.channel from vis r
    where r.cluster_id = c.id order by r.created_at desc limit 1
  ) l
  order by c.last_seen desc
  limit least(greatest(max_results, 1), 100);
$$;

create or replace function public.get_cluster(p_cluster_id uuid, origin_zip text default null)
returns table (
  cluster_id uuid, scam_type public.scam_type, report_count integer, corroboration_count integer,
  first_seen timestamptz, last_seen timestamptz, distance_miles double precision, nearest_zip text
)
language sql
stable
security definer
set search_path = ''
as $$
  with mine_or_visible as (
    select r.* from public.visible_reports() r where r.cluster_id = p_cluster_id
    union
    select r.* from public.reports r
    where r.cluster_id = p_cluster_id and r.status = 'active' and r.user_id = auth.uid()
  )
  select c.id, c.scam_type, c.report_count, c.corroboration_count, c.first_seen, c.last_seen,
         n.d / 1609.344, n.nearest_zip
  from public.clusters c
  left join lateral (
    select min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from mine_or_visible r
    join public.zip_centroids o on o.zip = origin_zip
  ) n on true
  where c.id = p_cluster_id and exists (select 1 from mine_or_visible);
$$;

create or replace function public.cluster_examples(p_cluster_id uuid, max_results integer default 5)
returns table (id uuid, channel public.report_channel, description_redacted text, zip text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select x.id, x.channel, x.description_redacted, x.zip, x.created_at
  from (
    select r.* from public.visible_reports() r where r.cluster_id = p_cluster_id
    union
    select r.* from public.reports r
    where r.cluster_id = p_cluster_id and r.status = 'active' and r.user_id = auth.uid()
  ) x
  order by x.created_at desc
  limit least(greatest(max_results, 1), 20);
$$;

create or replace function public.match_clusters(query text, origin_zip text, radius_miles integer, max_results integer default 3)
returns table (
  cluster_id uuid, score real, scam_type public.scam_type, report_count integer, corroboration_count integer,
  last_seen timestamptz, distance_miles double precision, nearest_zip text,
  latest_description text, latest_channel public.report_channel
)
language sql
stable
security definer
set search_path = ''
as $$
  with q as (select public.normalize_match_text(left(query, 2000)) as t),
  o as (select z.point from public.zip_centroids z where z.zip = origin_zip),
  vis as (select * from public.visible_reports()),
  cand as (
    select r.cluster_id,
           max(extensions.similarity(q.t, r.match_text))::real as score,
           min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from vis r
    cross join q
    left join o on true
    where r.cluster_id is not null
      and (origin_zip is null
           or extensions.st_dwithin(r.point, o.point, least(greatest(radius_miles, 1), 100) * 1609.344))
    group by r.cluster_id
    order by score desc
    limit least(greatest(max_results, 1), 10)
  )
  select c.id, cand.score, c.scam_type, c.report_count, c.corroboration_count, c.last_seen,
         cand.d / 1609.344, cand.nearest_zip, l.description_redacted, l.channel
  from cand
  join public.clusters c on c.id = cand.cluster_id
  cross join lateral (
    select r.description_redacted, r.channel from vis r
    where r.cluster_id = c.id order by r.created_at desc limit 1
  ) l
  order by cand.score desc;
$$;

create or replace function public.instant_alert_recipients(p_cluster_id uuid)
returns table (
  user_id uuid, email text, home_zip text, instant_last_24h integer,
  distance_miles double precision, nearest_zip text
)
language sql
stable
security definer
set search_path = ''
as $$
  with vis as (select * from public.visible_reports() r where r.cluster_id = p_cluster_id)
  select p.id, u.email::text, p.home_zip,
         (select count(*)::integer from public.alerts_sent a
          where a.user_id = p.id and a.channel = 'instant' and a.sent_at > now() - interval '24 hours'),
         near.d / 1609.344, near.nearest_zip
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (
    select min(extensions.st_distance(r.point, p.home_point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, p.home_point)))[1] as nearest_zip
    from vis r
    where extensions.st_dwithin(r.point, p.home_point, p.radius_miles * 1609.344)
  ) near
  where p.alert_mode = 'instant'
    and p.home_point is not null
    and u.email is not null
    and u.email_confirmed_at is not null
    and near.d is not null
    and not exists (select 1 from public.reports r where r.cluster_id = p_cluster_id and r.user_id = p.id)
    and not exists (select 1 from public.corroborations k where k.cluster_id = p_cluster_id and k.user_id = p.id)
    and not exists (
      select 1 from public.alerts_sent a
      where a.cluster_id = p_cluster_id and a.user_id = p.id and a.channel = 'instant'
    );
$$;

create or replace function public.digest_candidates(p_since timestamptz)
returns table (
  user_id uuid, email text, home_zip text, cluster_id uuid, scam_type public.scam_type,
  report_count integer, corroboration_count integer, last_seen timestamptz,
  distance_miles double precision, nearest_zip text, latest_description text, latest_channel public.report_channel
)
language sql
stable
security definer
set search_path = ''
as $$
  with vis as (select * from public.visible_reports())
  select p.id, u.email::text, p.home_zip,
         c.id, c.scam_type, c.report_count, c.corroboration_count, c.last_seen,
         near.d / 1609.344, near.nearest_zip, l.description_redacted, l.channel
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.clusters c on c.last_seen >= p_since and c.report_count > 0
  cross join lateral (
    select min(extensions.st_distance(r.point, p.home_point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, p.home_point)))[1] as nearest_zip
    from vis r
    where r.cluster_id = c.id
      and extensions.st_dwithin(r.point, p.home_point, p.radius_miles * 1609.344)
  ) near
  cross join lateral (
    select r.description_redacted, r.channel from vis r
    where r.cluster_id = c.id order by r.created_at desc limit 1
  ) l
  where p.alert_mode in ('digest', 'instant')
    and p.home_point is not null
    and u.email is not null
    and u.email_confirmed_at is not null
    and near.d is not null
    and not exists (select 1 from public.reports r where r.cluster_id = c.id and r.user_id = p.id)
    and not exists (select 1 from public.corroborations k where k.cluster_id = c.id and k.user_id = p.id)
    and not exists (
      select 1 from public.alerts_sent a
      where a.cluster_id = c.id and a.user_id = p.id and a.sent_at >= c.last_seen
    )
  order by p.id, c.last_seen desc;
$$;

------------------------------------------------------------------------------
-- User actions
------------------------------------------------------------------------------
create function public.rate_report(p_report_id uuid, p_helpful boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_author uuid;
begin
  if v_user is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select r.user_id into v_author from public.reports r where r.id = p_report_id and r.status = 'active';
  if v_author is null then raise exception 'Report not found' using errcode = 'P0002'; end if;
  if v_author = v_user then raise exception 'Cannot rate your own report' using errcode = '42501'; end if;

  insert into public.ratings (user_id, report_id, helpful) values (v_user, p_report_id, p_helpful)
  on conflict (user_id, report_id) do update set helpful = excluded.helpful, created_at = now();

  perform public.refresh_user_clusters(v_author);
end;
$$;

-- Returns 'flagged', 'already_flagged', or 'hidden' (this flag hid the report).
create function public.flag_report(p_report_id uuid, p_reason public.flag_reason, p_details text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_report public.reports;
  v_support integer;
begin
  if v_user is null then raise exception 'Sign in required' using errcode = '42501'; end if;
  select * into v_report from public.reports r where r.id = p_report_id and r.status in ('active', 'hidden');
  if v_report.id is null then raise exception 'Report not found' using errcode = 'P0002'; end if;
  if v_report.user_id = v_user then raise exception 'Cannot flag your own report' using errcode = '42501'; end if;

  insert into public.flags (report_id, user_id, reason, details)
  values (p_report_id, v_user, p_reason, nullif(btrim(p_details), ''))
  on conflict (report_id, user_id) do nothing;
  if not found then return 'already_flagged'; end if;

  -- Auto-hide at 3 open flags from different accounts in good standing.
  select count(*) into v_support from public.flags f
  where f.report_id = p_report_id and f.status = 'open' and not public.is_limited(f.user_id);

  if v_report.status = 'active' and v_support >= 3 then
    update public.reports set status = 'hidden', status_changed_at = now() where id = p_report_id;
    perform public.refresh_cluster(v_report.cluster_id);
    return 'hidden';
  end if;
  return 'flagged';
end;
$$;

-- The signed-in user's relationship to each example in a cluster.
create function public.my_example_state(p_cluster_id uuid)
returns table (report_id uuid, mine boolean, my_rating boolean, my_flagged boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id,
         r.user_id = auth.uid(),
         (select g.helpful from public.ratings g where g.report_id = r.id and g.user_id = auth.uid()),
         exists (select 1 from public.flags f where f.report_id = r.id and f.user_id = auth.uid())
  from public.reports r
  where r.cluster_id = p_cluster_id and r.status = 'active' and auth.uid() is not null;
$$;

------------------------------------------------------------------------------
-- Admin
------------------------------------------------------------------------------
create function public.admin_reports(p_view text)
returns table (
  report_id uuid, cluster_id uuid, scam_type public.scam_type, channel public.report_channel,
  description_redacted text, zip text, status public.report_status, created_at timestamptz,
  status_changed_at timestamptz, reporter_reputation integer,
  open_flags integer, reasons public.flag_reason[], notes text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;

  return query
  select r.id, r.cluster_id, r.scam_type, r.channel, r.description_redacted, r.zip, r.status,
         r.created_at, r.status_changed_at, public.reputation(r.user_id),
         (select count(*)::integer from public.flags f where f.report_id = r.id and f.status = 'open'),
         (select array_agg(f.reason order by f.created_at) from public.flags f where f.report_id = r.id and f.status = 'open'),
         (select array_agg(f.details order by f.created_at) from public.flags f
          where f.report_id = r.id and f.status = 'open' and f.details is not null)
  from public.reports r
  where case p_view
          when 'flagged' then exists (select 1 from public.flags f where f.report_id = r.id and f.status = 'open')
          when 'limited' then r.status = 'active' and public.is_limited(r.user_id)
          when 'removed' then r.status = 'removed'
          else false
        end
  order by coalesce(r.status_changed_at, r.created_at) desc
  limit 100;
end;
$$;

-- p_status: 'removed' (take down) or 'active' (dismiss flags / restore).
create function public.admin_set_report_status(p_report_id uuid, p_status public.report_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := auth.uid();
  v_report public.reports;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_status not in ('removed', 'active') then raise exception 'Invalid status' using errcode = '22023'; end if;

  update public.reports set status = p_status, status_changed_at = now()
  where id = p_report_id
  returning * into v_report;
  if v_report.id is null then raise exception 'Report not found' using errcode = 'P0002'; end if;

  update public.flags
  set status = case when p_status = 'removed' then 'removed'::public.flag_status else 'dismissed'::public.flag_status end,
      resolved_at = now(), resolved_by = v_admin
  where report_id = p_report_id and status = 'open';

  -- The reporter's reputation changed, which can change other clusters' counts.
  perform public.refresh_user_clusters(v_report.user_id);
end;
$$;

create function public.admin_emails()
returns table (email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text from public.admins a join auth.users u on u.id = a.user_id where u.email is not null;
$$;

------------------------------------------------------------------------------
-- Grants
------------------------------------------------------------------------------
revoke execute on function public.basic_standing(uuid) from public, anon, authenticated;
revoke execute on function public.reputation(uuid) from public, anon, authenticated;
revoke execute on function public.is_limited(uuid) from public, anon, authenticated;
revoke execute on function public.alert_weight(uuid) from public, anon, authenticated;
revoke execute on function public.visible_reports() from public, anon, authenticated;
revoke execute on function public.refresh_user_clusters(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_clusters(uuid[]) from public, anon, authenticated;
revoke execute on function public.cluster_alert_signal(uuid) from public, anon, authenticated;
revoke execute on function public.admin_emails() from public, anon, authenticated;
grant execute on function public.refresh_clusters(uuid[]) to service_role;
grant execute on function public.cluster_alert_signal(uuid) to service_role;
grant execute on function public.admin_emails() to service_role;

revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.rate_report(uuid, boolean) from public, anon;
revoke execute on function public.flag_report(uuid, public.flag_reason, text) from public, anon;
revoke execute on function public.my_example_state(uuid) from public, anon;
revoke execute on function public.admin_reports(text) from public, anon;
revoke execute on function public.admin_set_report_status(uuid, public.report_status) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.rate_report(uuid, boolean) to authenticated;
grant execute on function public.flag_report(uuid, public.flag_reason, text) to authenticated;
grant execute on function public.my_example_state(uuid) to authenticated;
grant execute on function public.admin_reports(text) to authenticated;
grant execute on function public.admin_set_report_status(uuid, public.report_status) to authenticated;

-- Existing counts now exclude limited accounts.
select public.refresh_cluster(c.id) from public.clusters c;
