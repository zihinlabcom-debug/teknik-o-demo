-- Disposable PostgreSQL fixture only. Supabase provides these objects in real projects.
create schema if not exists storage;
create table if not exists storage.buckets(
  id text primary key,name text not null,public boolean not null default false,
  file_size_limit bigint,allowed_mime_types text[]
);
create table if not exists storage.objects(
  id uuid primary key default gen_random_uuid(),bucket_id text not null references storage.buckets(id),
  name text not null
);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select on storage.objects to authenticated;
-- Simulate a pre-existing broad policy: the forward migration must still
-- close access to its private bucket, even in this hostile configuration.
grant usage on schema storage to anon;
grant select,insert on storage.objects to anon,authenticated;
create policy preexisting_broad_read on storage.objects for select to anon,authenticated using (true);
create policy preexisting_broad_insert on storage.objects for insert to anon,authenticated with check (true);
