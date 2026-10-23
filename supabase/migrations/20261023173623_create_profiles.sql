-- One profile per auth user. Email stays in auth.users (single source of truth).
create type public.alert_mode as enum ('digest', 'instant', 'off');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  home_zip text check (home_zip ~ '^[0-9]{5}$'),
  -- Approximate only (zip centroid or grid cell). Filled in Phase 1.
  home_point extensions.geography (point, 4326),
  radius_miles integer not null default 10 check (radius_miles between 1 and 50),
  alert_mode public.alert_mode not null default 'digest',
  reputation integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Users may only change their own settings, never reputation or location points.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (home_zip, radius_miles, alert_mode) on public.profiles to authenticated;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile row when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
