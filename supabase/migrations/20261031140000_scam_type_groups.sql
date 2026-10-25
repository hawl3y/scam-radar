-- Condensed scam groups (report flow). New enum values only; existing rows are
-- remapped in a later migration, after app code that understands both is live.
-- (Separate migration: a new enum value can't be used in the transaction that adds it.)
alter type public.scam_type add value if not exists 'fake_fee';
alter type public.scam_type add value if not exists 'impersonation';
alter type public.scam_type add value if not exists 'too_good';
alter type public.scam_type add value if not exists 'in_person';
