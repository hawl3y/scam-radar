-- Phase 3 alerts: dedupe/throttle records, recipient queries, "new near you".

alter table public.profiles add column last_feed_visit_at timestamptz;
grant update (last_feed_visit_at) on public.profiles to authenticated;

create type public.alert_channel as enum ('instant', 'digest');

-- One row per (user, cluster) per email. A claim is recorded before sending;
-- a failed send releases its batch so it can be retried.
create table public.alerts_sent (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  cluster_id uuid not null references public.clusters (id) on delete cascade,
  channel public.alert_channel not null,
  batch_id uuid not null,
  sent_at timestamptz not null default now()
);

-- At most one instant email per user per cluster.
create unique index alerts_sent_instant_once on public.alerts_sent (user_id, cluster_id) where channel = 'instant';
create index alerts_sent_user_sent_at_idx on public.alerts_sent (user_id, sent_at desc);
create index alerts_sent_batch_idx on public.alerts_sent (batch_id);

-- At most one digest per user per day (Eastern date, computed by the app).
create table public.digests_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  digest_date date not null,
  batch_id uuid not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, digest_date)
);

alter table public.alerts_sent enable row level security;
alter table public.digests_sent enable row level security;
revoke all on public.alerts_sent from anon, authenticated;
revoke all on public.digests_sent from anon, authenticated;

-- Instant-mode users within their radius of a cluster who haven't had an
-- instant email for it. Reporters and corroborators already know about it.
create function public.instant_alert_recipients(p_cluster_id uuid)
returns table (user_id uuid, email text, home_zip text, instant_last_24h integer)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text, p.home_zip,
         (select count(*)::integer from public.alerts_sent a
          where a.user_id = p.id and a.channel = 'instant' and a.sent_at > now() - interval '24 hours')
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.alert_mode = 'instant'
    and p.home_point is not null
    and u.email is not null
    and u.email_confirmed_at is not null
    and exists (
      select 1 from public.reports r
      where r.cluster_id = p_cluster_id and r.status = 'active'
        and extensions.st_dwithin(r.point, p.home_point, p.radius_miles * 1609.344)
    )
    and not exists (select 1 from public.reports r where r.cluster_id = p_cluster_id and r.user_id = p.id)
    and not exists (select 1 from public.corroborations k where k.cluster_id = p_cluster_id and k.user_id = p.id)
    and not exists (
      select 1 from public.alerts_sent a
      where a.cluster_id = p_cluster_id and a.user_id = p.id and a.channel = 'instant'
    );
$$;

-- Record an instant email before sending. Returns the batch id, or null if the
-- user already had one for this cluster or hit p_daily_limit in 24 hours.
create function public.claim_instant_alert(p_user_id uuid, p_cluster_id uuid, p_daily_limit integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
begin
  -- Serialize claims per user so concurrent alerts can't exceed the limit.
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  if (select count(*) from public.alerts_sent a
      where a.user_id = p_user_id and a.channel = 'instant' and a.sent_at > now() - interval '24 hours') >= p_daily_limit then
    return null;
  end if;

  insert into public.alerts_sent (user_id, cluster_id, channel, batch_id)
  values (p_user_id, p_cluster_id, 'instant', v_batch)
  on conflict do nothing;

  return case when found then v_batch else null end;
end;
$$;

-- Digest rows: for each digest/instant user, clusters within their radius with
-- activity since p_since that they haven't been emailed about since that activity.
create function public.digest_candidates(p_since timestamptz)
returns table (
  user_id uuid,
  email text,
  home_zip text,
  cluster_id uuid,
  scam_type public.scam_type,
  report_count integer,
  corroboration_count integer,
  last_seen timestamptz,
  distance_miles double precision,
  nearest_zip text,
  latest_description text,
  latest_channel public.report_channel
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text, p.home_zip,
         c.id, c.scam_type, c.report_count, c.corroboration_count, c.last_seen,
         near.d / 1609.344, near.nearest_zip, l.description_redacted, l.channel
  from public.profiles p
  join auth.users u on u.id = p.id
  join public.clusters c on c.last_seen >= p_since and c.report_count > 0
  cross join lateral (
    select min(extensions.st_distance(r.point, p.home_point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, p.home_point)))[1] as nearest_zip
    from public.reports r
    where r.cluster_id = c.id and r.status = 'active'
      and extensions.st_dwithin(r.point, p.home_point, p.radius_miles * 1609.344)
  ) near
  cross join lateral (
    select r.description_redacted, r.channel
    from public.reports r
    where r.cluster_id = c.id and r.status = 'active'
    order by r.created_at desc
    limit 1
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

-- Record a digest before sending. Returns the batch id, or null if this user
-- already has a digest for p_digest_date.
create function public.claim_digest(p_user_id uuid, p_digest_date date, p_cluster_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_batch uuid := gen_random_uuid();
begin
  insert into public.digests_sent (user_id, digest_date, batch_id)
  values (p_user_id, p_digest_date, v_batch)
  on conflict do nothing;
  if not found then
    return null;
  end if;

  insert into public.alerts_sent (user_id, cluster_id, channel, batch_id)
  select p_user_id, unnest(p_cluster_ids), 'digest', v_batch;
  return v_batch;
end;
$$;

-- Undo a claim after a failed send so it can be retried.
create function public.release_alert_batch(p_batch_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.alerts_sent where batch_id = p_batch_id;
  delete from public.digests_sent where batch_id = p_batch_id;
$$;

revoke execute on function public.instant_alert_recipients(uuid) from public, anon, authenticated;
revoke execute on function public.claim_instant_alert(uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.digest_candidates(timestamptz) from public, anon, authenticated;
revoke execute on function public.claim_digest(uuid, date, uuid[]) from public, anon, authenticated;
revoke execute on function public.release_alert_batch(uuid) from public, anon, authenticated;
grant execute on function public.instant_alert_recipients(uuid) to service_role;
grant execute on function public.claim_instant_alert(uuid, uuid, integer) to service_role;
grant execute on function public.digest_candidates(timestamptz) to service_role;
grant execute on function public.claim_digest(uuid, date, uuid[]) to service_role;
grant execute on function public.release_alert_batch(uuid) to service_role;
