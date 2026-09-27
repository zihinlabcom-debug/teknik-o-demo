begin;

update public.boiler_fault_candidates c
set
  official_model_id = m.id,
  updated_at = now()
from public.official_error_codes_raw r
join public.boiler_official_models m
  on m.official_model_name = r.official_model
join public.boiler_model_families f
  on f.id = m.family_id
where c.official_error_record_id = r.id
  and c.official_model_id is null
  and r.brand = 'Vaillant'
  and r.official_model = 'ecoTEC intro VUW 18/24 AS/1-1'
  and f.brand = 'Vaillant'
  and f.family_name = 'ecoTEC intro';

commit;