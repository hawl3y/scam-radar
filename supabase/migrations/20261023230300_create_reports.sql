create type public.report_channel as enum ('text', 'call', 'email', 'website', 'visit', 'other');

create type public.scam_type as enum (
  'government', 'bank', 'delivery', 'tech_support', 'utility', 'prize',
  'family_emergency', 'job', 'investment', 'home_repair', 'toll', 'other'
);

create type public.report_status as enum ('active', 'removed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scam_type public.scam_type not null,
  channel public.report_channel not null,
  -- Redacted by the app server before insert. Raw text is never stored.
  description_redacted text not null check (char_length(description_redacted) between 1 and 2500),
  zip text not null references public.zip_centroids (zip),
  -- Zip center, set by trigger. Never an exact location.
  point extensions.geography (point, 4326) not null,
  status public.report_status not null default 'active',
  created_at timestamptz not null default now()
);

create index reports_point_idx on public.reports using gist (point);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_user_id_idx on public.reports (user_id);

create function public.set_report_point()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select z.point into strict new.point from public.zip_centroids z where z.zip = new.zip;
  return new;
end;
$$;

create trigger reports_set_point
  before insert or update of zip on public.reports
  for each row execute function public.set_report_point();

-- No direct access for app users. Inserts go through the app server (secret
-- key) after redaction; reads go through the functions below, which never
-- return user_id.
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create function public.nearby_reports(origin_zip text, radius_miles integer, max_results integer default 50)
returns table (
  id uuid,
  scam_type public.scam_type,
  channel public.report_channel,
  description_redacted text,
  zip text,
  created_at timestamptz,
  distance_miles double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.scam_type, r.channel, r.description_redacted, r.zip, r.created_at,
         extensions.st_distance(r.point, o.point) / 1609.344
  from public.reports r
  cross join (select z.point from public.zip_centroids z where z.zip = origin_zip) o
  where r.status = 'active'
    and extensions.st_dwithin(r.point, o.point, least(greatest(radius_miles, 1), 50) * 1609.344)
  order by r.created_at desc
  limit least(greatest(max_results, 1), 100);
$$;

create function public.get_report(report_id uuid, origin_zip text default null)
returns table (
  id uuid,
  scam_type public.scam_type,
  channel public.report_channel,
  description_redacted text,
  zip text,
  created_at timestamptz,
  distance_miles double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.scam_type, r.channel, r.description_redacted, r.zip, r.created_at,
         extensions.st_distance(r.point, o.point) / 1609.344
  from public.reports r
  left join public.zip_centroids o on o.zip = origin_zip
  where r.id = report_id and r.status = 'active';
$$;

revoke execute on function public.nearby_reports(text, integer, integer) from public;
revoke execute on function public.get_report(uuid, text) from public;
grant execute on function public.nearby_reports(text, integer, integer) to anon, authenticated;
grant execute on function public.get_report(uuid, text) to anon, authenticated;
revoke execute on function public.set_report_point() from public, anon, authenticated;
revoke execute on function public.set_home_point() from public, anon, authenticated;
