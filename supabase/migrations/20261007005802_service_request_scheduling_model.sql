-- Service request scheduling data model.
-- Existing requests remain immediate. Date-selection capability is category-specific.

alter table public.service_categories
  add column customer_can_select_date boolean not null default false;

alter table public.service_requests
  add column requested_service_mode text not null default 'immediate',
  add column requested_service_date date;

alter table public.service_requests
  add constraint service_requests_requested_service_mode_check
  check (requested_service_mode in ('immediate', 'scheduled'));

alter table public.service_requests
  add constraint service_requests_requested_service_date_check
  check (
    (requested_service_mode = 'immediate' and requested_service_date is null)
    or
    (requested_service_mode = 'scheduled' and requested_service_date is not null)
  );

update public.service_categories
set customer_can_select_date = true
where code in ('cleaning', 'painting', 'upholstery_carpet');

update public.service_categories
set customer_can_select_date = false
where code = 'boiler';
