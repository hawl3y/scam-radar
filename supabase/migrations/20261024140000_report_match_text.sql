-- Text similarity for clustering and Check (brief §8 Phase 2). Matching goes
-- through functions so embeddings can replace pg_trgm later (brief §11).
create extension if not exists pg_trgm with schema extensions;

-- Lowercase, drop redaction placeholders, collapse whitespace.
create function public.normalize_match_text(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select btrim(regexp_replace(
    regexp_replace(lower(t), '\[(phone|email|card number|account number|ssn|code|address|name)\]', ' ', 'g'),
    '\s+', ' ', 'g'
  ));
$$;

alter table public.reports
  add column match_text text generated always as (public.normalize_match_text(description_redacted)) stored;

create index reports_match_text_trgm_idx on public.reports using gin (match_text extensions.gin_trgm_ops);
