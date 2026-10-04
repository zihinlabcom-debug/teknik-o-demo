-- Forward-only guard for an extensible category catalog and request/type integrity.
-- Historical migrations are left intact because they have already been applied.
begin;

do $$
begin
  -- The four original seeds must remain available; additional active categories
  -- are valid catalog entries.
  if exists (
    select 1
    from (values
      ('boiler','Kombi'), ('painting','Boya'), ('cleaning','Temizlik'),
      ('upholstery_carpet','Koltuk & Halı Yıkama')
    ) as required(code,name)
    left join public.service_categories c on c.code=required.code
    where c.id is null or c.name is distinct from required.name
      or c.is_active is distinct from true
  ) then
    raise exception 'A required service category seed is missing or inactive';
  end if;

  -- Preserve the reviewed 1,422-row Vaillant baseline without rejecting later
  -- manufacturer imports or newly added error codes.
  if (select count(*) from public.official_error_codes_raw) < 1422
     or (select count(*) from public.official_error_codes_raw where brand='Vaillant') < 1422 then
    raise exception 'The original manufacturer error-code baseline is incomplete';
  end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.service_types'::regclass and c.contype='u'
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid='public.service_types'::regclass and attname='id'),
        (select attnum from pg_attribute where attrelid='public.service_types'::regclass and attname='category_id')
      ]::smallint[]
  ) then
    raise exception 'service_types must have UNIQUE (id, category_id)';
  end if;

  -- Do not silently adopt inconsistent legacy requests. The transaction must
  -- stop for review instead of rewriting their category or service type.
  if exists (
    select 1 from public.service_requests r
    left join public.service_types t on t.id=r.service_type_id
    where r.service_type_id is not null and r.category_id is not null
      and (t.id is null or t.category_id is distinct from r.category_id)
  ) then
    raise exception 'Existing service_requests contain mismatched category/service type pairs';
  end if;
end $$;

do $$
declare
  existing pg_constraint%rowtype;
begin
  select * into existing from pg_constraint
  where conrelid='public.service_requests'::regclass
    and conname='service_requests_service_type_category_fk';

  if found then
    if existing.contype <> 'f'
       or existing.confrelid <> 'public.service_types'::regclass
       or existing.confmatchtype <> 's'
       or existing.confdeltype <> 'a'
       or existing.conkey <> array[
         (select attnum from pg_attribute where attrelid='public.service_requests'::regclass and attname='service_type_id'),
         (select attnum from pg_attribute where attrelid='public.service_requests'::regclass and attname='category_id')
       ]::smallint[]
       or existing.confkey <> array[
         (select attnum from pg_attribute where attrelid='public.service_types'::regclass and attname='id'),
         (select attnum from pg_attribute where attrelid='public.service_types'::regclass and attname='category_id')
       ]::smallint[] then
      raise exception 'Conflicting service_requests_service_type_category_fk definition';
    end if;
  else
    -- MATCH SIMPLE preserves legacy rows with either nullable reference unset.
    -- The existing single-column category/type FKs remain in place.
    alter table public.service_requests
      add constraint service_requests_service_type_category_fk
      foreign key (service_type_id, category_id)
      references public.service_types(id, category_id)
      match simple on delete no action not valid;
  end if;

  -- Validation checks historical rows; a failure rolls back the entire file.
  alter table public.service_requests
    validate constraint service_requests_service_type_category_fk;
end $$;

commit;
