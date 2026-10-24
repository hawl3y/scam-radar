-- Limited below -2 (was below 0), so a single "not helpful" doesn't limit a new account.
create or replace function public.is_limited(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.reputation(p_user) < -2;
$$;

do $$
declare v_cluster uuid;
begin
  for v_cluster in select id from public.clusters loop
    perform public.refresh_cluster(v_cluster);
  end loop;
end;
$$;
