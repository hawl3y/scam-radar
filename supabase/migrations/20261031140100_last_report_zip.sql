-- Prefill the report form's zip from the signed-in user's most recent report.
create function public.my_last_report_zip()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.zip from public.reports r
  where r.user_id = auth.uid()
  order by r.created_at desc
  limit 1;
$$;

revoke execute on function public.my_last_report_zip() from public, anon;
grant execute on function public.my_last_report_zip() to authenticated;
