-- These read reports by status alone, so they also returned reports from
-- limited accounts that the app hides (see visible_reports). The app no longer
-- calls get_report or nearby_reports (alerts replaced single-report pages).
revoke execute on function public.get_report(uuid, text) from public, anon, authenticated;
revoke execute on function public.nearby_reports(text, integer, integer) from public, anon, authenticated;

-- Old /reports/<id> links: resolve only reports others can see, or the viewer's own.
create or replace function public.report_cluster(p_report_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.cluster_id from public.visible_reports() r where r.id = p_report_id
  union
  select r.cluster_id from public.reports r
  where r.id = p_report_id and r.status = 'active' and r.user_id = auth.uid()
  limit 1;
$$;
