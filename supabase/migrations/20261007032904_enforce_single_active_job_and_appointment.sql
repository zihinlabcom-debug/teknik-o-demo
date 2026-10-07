create unique index service_jobs_one_active_per_request_idx
  on public.service_jobs (service_request_id)
  where status in ('assigned', 'in_progress');

create unique index service_appointments_one_active_per_job_idx
  on public.service_appointments (job_id)
  where status in ('scheduled', 'confirmed');
