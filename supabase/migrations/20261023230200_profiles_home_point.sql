-- Keep profiles.home_point in sync with home_zip (zip center, never an exact location).
create function public.set_home_point()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.home_zip is null then
    new.home_point := null;
    return new;
  end if;

  select z.point into new.home_point
  from public.zip_centroids z
  where z.zip = new.home_zip;

  if not found then
    raise exception 'Unknown zip code: %', new.home_zip using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_set_home_point
  before insert or update of home_zip on public.profiles
  for each row execute function public.set_home_point();

update public.profiles p
set home_point = z.point
from public.zip_centroids z
where z.zip = p.home_zip;
