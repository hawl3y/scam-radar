-- Zip code centers. All locations in the app are snapped to these (brief §7).
create table public.zip_centroids (
  zip text primary key check (zip ~ '^[0-9]{5}$'),
  lat double precision not null,
  lng double precision not null,
  point extensions.geography (point, 4326)
);

alter table public.zip_centroids enable row level security;

create policy "Zip centers are public"
  on public.zip_centroids for select
  to anon, authenticated
  using (true);

revoke all on public.zip_centroids from anon, authenticated;
grant select on public.zip_centroids to anon, authenticated;
