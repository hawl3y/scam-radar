-- Explicit loops: a SQL function ending in SELECT may stop after the first row.
create or replace function public.refresh_user_clusters(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_cluster uuid;
begin
  for v_cluster in
    select r.cluster_id from public.reports r where r.user_id = p_user and r.cluster_id is not null
    union
    select k.cluster_id from public.corroborations k where k.user_id = p_user
  loop
    perform public.refresh_cluster(v_cluster);
  end loop;
end;
$$;

create or replace function public.refresh_clusters(p_cluster_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_cluster uuid;
begin
  foreach v_cluster in array coalesce(p_cluster_ids, '{}') loop
    perform public.refresh_cluster(v_cluster);
  end loop;
end;
$$;

do $$
declare v_cluster uuid;
begin
  for v_cluster in select id from public.clusters loop
    perform public.refresh_cluster(v_cluster);
  end loop;
end;
$$;
