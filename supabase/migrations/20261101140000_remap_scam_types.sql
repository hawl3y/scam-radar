-- Move existing reports and clusters to the 7 scam groups (see LEGACY_SCAM_TYPES
-- in src/lib/scam-types.ts). Safe alongside the deploy: the live app already
-- reads and writes the new values. Old enum values stay defined but unused.
create temporary table scam_type_map (old_type public.scam_type, new_type public.scam_type) on commit drop;
insert into scam_type_map values
  ('government', 'impersonation'),
  ('bank', 'impersonation'),
  ('utility', 'impersonation'),
  ('delivery', 'fake_fee'),
  ('toll', 'fake_fee'),
  ('prize', 'too_good'),
  ('job', 'too_good'),
  ('investment', 'too_good'),
  ('home_repair', 'in_person');

update public.reports r set scam_type = m.new_type from scam_type_map m where r.scam_type = m.old_type;
update public.clusters c set scam_type = m.new_type from scam_type_map m where c.scam_type = m.old_type;
