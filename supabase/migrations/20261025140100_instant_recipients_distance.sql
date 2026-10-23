-- Include each recipient's distance to the cluster, for the email.
drop function public.instant_alert_recipients(uuid);

create function public.instant_alert_recipients(p_cluster_id uuid)
returns table (
  user_id uuid,
  email text,
  home_zip text,
  instant_last_24h integer,
  distance_miles double precision,
  nearest_zip text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text, p.home_zip,
         (select count(*)::integer from public.alerts_sent a
          where a.user_id = p.id and a.channel = 'instant' and a.sent_at > now() - interval '24 hours'),
         near.d / 1609.344, near.nearest_zip
  from public.profiles p
  join auth.users u on u.id = p.id
  cross join lateral (
    select min(extensions.st_distance(r.point, p.home_point)) as d,
           (array_agg(r.zip order by extensions.st_distance(r.point, p.home_point)))[1] as nearest_zip
    from public.reports r
    where r.cluster_id = p_cluster_id and r.status = 'active'
      and extensions.st_dwithin(r.point, p.home_point, p.radius_miles * 1609.344)
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

revoke execute on function public.instant_alert_recipients(uuid) from public, anon, authenticated;
grant execute on function public.instant_alert_recipients(uuid) to service_role;
