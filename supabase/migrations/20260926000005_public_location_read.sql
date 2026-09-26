create policy "anon_read_active_cities"
on public.cities
for select
to anon
using (is_active = true);

create policy "anon_read_active_districts"
on public.districts
for select
to anon
using (is_active = true);
