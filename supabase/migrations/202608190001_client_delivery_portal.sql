begin;

create extension if not exists pgcrypto;

create table public.portal_admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  contact_name text not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'disabled')),
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index idx_client_accounts_email_lower on public.client_accounts (lower(email));
create index idx_client_accounts_status on public.client_accounts (status);

create table public.client_deliveries (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  title text not null,
  campaign text not null,
  description text,
  delivered_at timestamptz not null default now(),
  read_at timestamptz,
  archived_at timestamptz,
  notification_status text not null default 'not_sent'
    check (notification_status in ('not_sent', 'pending', 'sent', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_account_id)
);

create index idx_client_deliveries_client_date
  on public.client_deliveries (client_account_id, delivered_at desc);
create index idx_client_deliveries_client_unread
  on public.client_deliveries (client_account_id, delivered_at desc)
  where read_at is null and archived_at is null;
create index idx_client_deliveries_campaign
  on public.client_deliveries (client_account_id, campaign);

create table public.client_delivery_files (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null,
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  storage_path text not null unique,
  filename text not null,
  mime_type text not null,
  file_size bigint not null check (file_size > 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint client_delivery_files_delivery_client_fk
    foreign key (delivery_id, client_account_id)
    references public.client_deliveries(id, client_account_id) on delete cascade
);

create index idx_delivery_files_delivery_date
  on public.client_delivery_files (delivery_id, created_at desc);
create index idx_delivery_files_client_date
  on public.client_delivery_files (client_account_id, created_at desc);
create index idx_delivery_files_client_type
  on public.client_delivery_files (client_account_id, mime_type);

create table public.client_portal_audit_logs (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid references public.client_accounts(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  file_id uuid references public.client_delivery_files(id) on delete set null,
  delivery_id uuid references public.client_deliveries(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_portal_audit_client_date
  on public.client_portal_audit_logs (client_account_id, created_at desc);
create index idx_portal_audit_action_date
  on public.client_portal_audit_logs (action, created_at desc);
create index idx_portal_audit_file on public.client_portal_audit_logs (file_id);
create index idx_portal_audit_delivery on public.client_portal_audit_logs (delivery_id);

create or replace function public.portal_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger portal_admins_updated_at
before update on public.portal_admins
for each row execute function public.portal_set_updated_at();

create trigger client_accounts_updated_at
before update on public.client_accounts
for each row execute function public.portal_set_updated_at();

create trigger client_deliveries_updated_at
before update on public.client_deliveries
for each row execute function public.portal_set_updated_at();

create or replace function public.is_portal_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.portal_admins
    where auth_user_id = check_user_id and status = 'active'
  );
$$;

revoke all on function public.is_portal_admin(uuid) from public;
grant execute on function public.is_portal_admin(uuid) to authenticated, service_role;

alter table public.portal_admins enable row level security;
alter table public.client_accounts enable row level security;
alter table public.client_deliveries enable row level security;
alter table public.client_delivery_files enable row level security;
alter table public.client_portal_audit_logs enable row level security;

create policy portal_admins_read_self
on public.portal_admins for select to authenticated
using (auth_user_id = (select auth.uid()));

create policy client_accounts_read_self_or_admin
on public.client_accounts for select to authenticated
using (auth_user_id = (select auth.uid()) or (select public.is_portal_admin()));

create policy client_deliveries_read_own_or_admin
on public.client_deliveries for select to authenticated
using (
  (select public.is_portal_admin()) or exists (
    select 1 from public.client_accounts account
    where account.id = client_deliveries.client_account_id
      and account.auth_user_id = (select auth.uid())
      and account.status = 'active'
  )
);

create policy client_delivery_files_admin_read
on public.client_delivery_files for select to authenticated
using ((select public.is_portal_admin()));

create policy client_audit_logs_read_own_or_admin
on public.client_portal_audit_logs for select to authenticated
using (
  (select public.is_portal_admin()) or exists (
    select 1 from public.client_accounts account
    where account.id = client_portal_audit_logs.client_account_id
      and account.auth_user_id = (select auth.uid())
      and account.status = 'active'
  )
);

revoke all on public.portal_admins from anon, authenticated;
revoke all on public.client_accounts from anon, authenticated;
revoke all on public.client_deliveries from anon, authenticated;
revoke all on public.client_delivery_files from anon, authenticated;
revoke all on public.client_portal_audit_logs from anon, authenticated;

grant select on public.portal_admins to authenticated;
grant select on public.client_accounts to authenticated;
grant select on public.client_deliveries to authenticated;
grant select on public.client_delivery_files to authenticated;
grant select on public.client_portal_audit_logs to authenticated;

grant all on public.portal_admins to service_role;
grant all on public.client_accounts to service_role;
grant all on public.client_deliveries to service_role;
grant all on public.client_delivery_files to service_role;
grant all on public.client_portal_audit_logs to service_role;

commit;
