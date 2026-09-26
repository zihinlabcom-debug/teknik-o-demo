alter table public.customer_addresses
add column if not exists city_id bigint,
add column if not exists district_id bigint;

alter table public.districts
add constraint districts_city_id_id_unique
unique (city_id, id);

alter table public.customer_addresses
add constraint customer_addresses_city_id_fkey
foreign key (city_id)
references public.cities(id)
on delete restrict;

alter table public.customer_addresses
add constraint customer_addresses_city_district_fkey
foreign key (city_id, district_id)
references public.districts(city_id, id)
on delete restrict;

create index if not exists idx_customer_addresses_city_id
on public.customer_addresses(city_id);

create index if not exists idx_customer_addresses_district_id
on public.customer_addresses(district_id);
