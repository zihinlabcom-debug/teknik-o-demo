-- Canonical account flags and public-signup provisioning. Run only after review.
begin;

alter table public.users add column if not exists is_test boolean not null default false;
alter table public.users enable row level security;
revoke all on public.users from anon, authenticated;
grant select on public.users to authenticated;
grant update (name) on public.users to authenticated;

create or replace function public.create_customer_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.users(id,name,role,phone,email,is_test)
  values(new.id, coalesce(nullif(left(trim(new.raw_user_meta_data->>'full_name'),200),''),'Müşteri'),
         'customer',new.phone,new.email,false);
  return new;
end;
$$;
revoke all on function public.create_customer_account() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_tekniko on auth.users;
create trigger on_auth_user_created_tekniko after insert on auth.users
for each row execute function public.create_customer_account();

commit;
