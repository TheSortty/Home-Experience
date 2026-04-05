-- Migration: 000001_open_access
-- Description: Open access policies and grants for development/testing.

-- Schema usage
grant usage on schema public to anon, authenticated;

-- Table permissions
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- Sequence permissions (for serial/bigserial)
grant usage, select on all sequences in schema public to anon, authenticated;

-- RLS open policies for all public tables
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
    execute format('drop policy if exists open_select on public.%I', r.tablename);
    execute format('drop policy if exists open_insert on public.%I', r.tablename);
    execute format('drop policy if exists open_update on public.%I', r.tablename);
    execute format('drop policy if exists open_delete on public.%I', r.tablename);

    execute format('create policy open_select on public.%I for select using (true)', r.tablename);
    execute format('create policy open_insert on public.%I for insert with check (true)', r.tablename);
    execute format('create policy open_update on public.%I for update using (true)', r.tablename);
    execute format('create policy open_delete on public.%I for delete using (true)', r.tablename);
  end loop;
end $$;
