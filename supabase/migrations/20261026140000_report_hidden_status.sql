-- 'hidden': auto-hidden after enough flags, pending admin review. Separate
-- migration because a new enum value can't be used in the transaction that adds it.
alter type public.report_status add value if not exists 'hidden';

alter table public.reports add column status_changed_at timestamptz;
