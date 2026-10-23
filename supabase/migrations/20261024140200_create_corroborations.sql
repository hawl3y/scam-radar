-- "I got this too": one per user per cluster.
create table public.corroborations (
  user_id uuid not null references auth.users (id) on delete cascade,
  cluster_id uuid not null references public.clusters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, cluster_id)
);

create index corroborations_cluster_id_idx on public.corroborations (cluster_id);

alter table public.corroborations enable row level security;

create policy "Users can read their own corroborations"
  on public.corroborations for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Writes only through corroborate(), which enforces the rules and keeps counts.
revoke all on public.corroborations from anon, authenticated;
grant select on public.corroborations to authenticated;

-- status: 'corroborated' (now or before) or 'reporter' (has a report in this cluster).
create function public.corroborate(p_cluster_id uuid)
returns table (corroboration_count integer, status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Sign in required' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clusters c where c.id = p_cluster_id and c.report_count > 0) then
    raise exception 'Cluster not found' using errcode = 'P0002';
  end if;

  if exists (
    select 1 from public.reports r
    where r.cluster_id = p_cluster_id and r.user_id = v_user and r.status = 'active'
  ) then
    return query select c.corroboration_count, 'reporter'::text from public.clusters c where c.id = p_cluster_id;
    return;
  end if;

  insert into public.corroborations (user_id, cluster_id) values (v_user, p_cluster_id)
  on conflict do nothing;
  if found then
    -- Increment (not recount) so concurrent presses can't lose updates.
    update public.clusters c set corroboration_count = c.corroboration_count + 1 where c.id = p_cluster_id;
  end if;

  return query select c.corroboration_count, 'corroborated'::text from public.clusters c where c.id = p_cluster_id;
end;
$$;

create function public.my_cluster_status(p_cluster_id uuid)
returns table (reported boolean, corroborated boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (select 1 from public.reports r
            where r.cluster_id = p_cluster_id and r.user_id = auth.uid() and r.status = 'active'),
    exists (select 1 from public.corroborations k
            where k.cluster_id = p_cluster_id and k.user_id = auth.uid());
$$;

revoke execute on function public.corroborate(uuid) from public, anon;
revoke execute on function public.my_cluster_status(uuid) from public, anon;
grant execute on function public.corroborate(uuid) to authenticated;
grant execute on function public.my_cluster_status(uuid) to authenticated;
