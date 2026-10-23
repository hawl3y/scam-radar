-- PostGIS for radius queries, pgvector for similarity search (brief §6).
create extension if not exists postgis with schema extensions;
create extension if not exists vector with schema extensions;
