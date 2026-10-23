create table public.clusters (
  id uuid primary key default gen_random_uuid(),
  scam_type public.scam_type not null,
  report_count integer not null default 0,
  corroboration_count integer not null default 0,
  -- Center of member reports' zip centers. Never an exact location.
  centroid extensions.geography (point, 4326) not null,
  first_seen timestamptz not null,
  last_seen timestamptz not null,
  created_at timestamptz not null default now()
);

create index clusters_last_seen_idx on public.clusters (last_seen desc);

alter table public.clusters enable row level security;
revoke all on public.clusters from anon, authenticated;

alter table public.reports add column cluster_id uuid references public.clusters (id);
create index reports_cluster_id_idx on public.reports (cluster_id);

-- Recompute counts, center, and dates from the cluster's active reports.
create function public.refresh_cluster(p_cluster_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.clusters c
  set report_count = s.n,
      centroid = coalesce(s.centroid, c.centroid),
      first_seen = coalesce(s.first_seen, c.first_seen),
      last_seen = coalesce(s.last_seen, c.last_seen)
  from (
    select count(*)::integer as n,
           extensions.st_centroid(extensions.st_collect(r.point::extensions.geometry))::extensions.geography as centroid,
           min(r.created_at) as first_seen,
           max(r.created_at) as last_seen
    from public.reports r
    where r.cluster_id = p_cluster_id and r.status = 'active'
  ) s
  where c.id = p_cluster_id;
$$;

-- Best existing cluster for a new report: highest text similarity to any
-- active member report within p_max_miles, among clusters seen recently.
-- The app decides whether the score is high enough (src/lib/matching.ts).
create function public.nearest_cluster_candidate(p_report_id uuid, p_max_miles integer, p_active_days integer)
returns table (cluster_id uuid, score real)
language sql
stable
security definer
set search_path = ''
as $$
  select r2.cluster_id, max(extensions.similarity(r.match_text, r2.match_text))::real as score
  from public.reports r
  join public.reports r2
    on r2.id <> r.id
   and r2.status = 'active'
   and r2.cluster_id is not null
   and extensions.st_dwithin(r2.point, r.point, p_max_miles * 1609.344)
  join public.clusters c
    on c.id = r2.cluster_id
   and c.last_seen > now() - make_interval(days => p_active_days)
  where r.id = p_report_id
  group by r2.cluster_id
  order by score desc
  limit 1;
$$;

-- Attach a report to a cluster, or start a new one when p_cluster_id is null.
create function public.attach_report_to_cluster(p_report_id uuid, p_cluster_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cluster uuid := p_cluster_id;
  v_report public.reports;
begin
  select * into strict v_report from public.reports where id = p_report_id;

  if v_cluster is null then
    insert into public.clusters (scam_type, centroid, first_seen, last_seen)
    values (v_report.scam_type, v_report.point, v_report.created_at, v_report.created_at)
    returning id into v_cluster;
  end if;

  update public.reports set cluster_id = v_cluster where id = p_report_id;
  perform public.refresh_cluster(v_cluster);
  return v_cluster;
end;
$$;

-- Existing reports each start their own cluster.
do $$
declare r record;
begin
  for r in select id from public.reports where cluster_id is null order by created_at loop
    perform public.attach_report_to_cluster(r.id, null);
  end loop;
end;
$$;

-- Public reads. None of these return user_id.

create function public.nearby_clusters(origin_zip text, radius_miles integer, max_results integer default 50)
returns table (
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
  with o as (select z.point from public.zip_centroids z where z.zip = origin_zip),
  near as (
    select r.cluster_id,
           min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from public.reports r cross join o
    where r.status = 'active'
      and r.cluster_id is not null
      and extensions.st_dwithin(r.point, o.point, least(greatest(radius_miles, 1), 50) * 1609.344)
    group by r.cluster_id
  )
  select c.id, c.scam_type, c.report_count, c.corroboration_count, c.last_seen,
         near.d / 1609.344, near.nearest_zip, l.description_redacted, l.channel
  from near
  join public.clusters c on c.id = near.cluster_id
  cross join lateral (
    select r.description_redacted, r.channel
    from public.reports r
    where r.cluster_id = c.id and r.status = 'active'
    order by r.created_at desc
    limit 1
  ) l
  order by c.last_seen desc
  limit least(greatest(max_results, 1), 100);
$$;

create function public.get_cluster(p_cluster_id uuid, origin_zip text default null)
returns table (
  cluster_id uuid,
  scam_type public.scam_type,
  report_count integer,
  corroboration_count integer,
  first_seen timestamptz,
  last_seen timestamptz,
  distance_miles double precision,
  nearest_zip text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.scam_type, c.report_count, c.corroboration_count, c.first_seen, c.last_seen,
         n.d / 1609.344, n.nearest_zip
  from public.clusters c
  left join lateral (
    select min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from public.reports r
    join public.zip_centroids o on o.zip = origin_zip
    where r.cluster_id = c.id and r.status = 'active'
  ) n on true
  where c.id = p_cluster_id and c.report_count > 0;
$$;

create function public.cluster_examples(p_cluster_id uuid, max_results integer default 5)
returns table (
  id uuid,
  channel public.report_channel,
  description_redacted text,
  zip text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.channel, r.description_redacted, r.zip, r.created_at
  from public.reports r
  where r.cluster_id = p_cluster_id and r.status = 'active'
  order by r.created_at desc
  limit least(greatest(max_results, 1), 20);
$$;

create function public.report_cluster(p_report_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.cluster_id from public.reports r where r.id = p_report_id and r.status = 'active';
$$;

-- Check: top clusters by similarity to the pasted text, with scores. The app
-- applies the match threshold. origin_zip null means anywhere.
create function public.match_clusters(query text, origin_zip text, radius_miles integer, max_results integer default 3)
returns table (
  cluster_id uuid,
  score real,
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
  with q as (select public.normalize_match_text(left(query, 2000)) as t),
  o as (select z.point from public.zip_centroids z where z.zip = origin_zip),
  cand as (
    select r.cluster_id,
           max(extensions.similarity(q.t, r.match_text))::real as score,
           min(extensions.st_distance(r.point, o.point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, o.point)))[1] as nearest_zip
    from public.reports r
    cross join q
    left join o on true
    where r.status = 'active'
      and r.cluster_id is not null
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
    select r.description_redacted, r.channel
    from public.reports r
    where r.cluster_id = c.id and r.status = 'active'
    order by r.created_at desc
    limit 1
  ) l
  order by cand.score desc;
$$;

revoke execute on function public.refresh_cluster(uuid) from public, anon, authenticated;
revoke execute on function public.nearest_cluster_candidate(uuid, integer, integer) from public, anon, authenticated;
revoke execute on function public.attach_report_to_cluster(uuid, uuid) from public, anon, authenticated;
grant execute on function public.nearest_cluster_candidate(uuid, integer, integer) to service_role;
grant execute on function public.attach_report_to_cluster(uuid, uuid) to service_role;

revoke execute on function public.nearby_clusters(text, integer, integer) from public;
revoke execute on function public.get_cluster(uuid, text) from public;
revoke execute on function public.cluster_examples(uuid, integer) from public;
revoke execute on function public.report_cluster(uuid) from public;
revoke execute on function public.match_clusters(text, text, integer, integer) from public;
grant execute on function public.nearby_clusters(text, integer, integer) to anon, authenticated;
grant execute on function public.get_cluster(uuid, text) to anon, authenticated;
grant execute on function public.cluster_examples(uuid, integer) to anon, authenticated;
grant execute on function public.report_cluster(uuid) to anon, authenticated;
grant execute on function public.match_clusters(text, text, integer, integer) to anon, authenticated;
