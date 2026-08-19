begin;

create table public.client_account_members (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'manager', 'contributor', 'viewer')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  invited_by_auth_user_id uuid references auth.users(id) on delete set null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_account_id)
);

create unique index idx_client_members_email_lower
on public.client_account_members (lower(email));
create index idx_client_members_account_status
on public.client_account_members (client_account_id, status, role);

create table public.client_folders (
  id uuid primary key default gen_random_uuid(),
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  parent_folder_id uuid,
  delivery_id uuid unique references public.client_deliveries(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  access_scope text not null default 'workspace' check (access_scope in ('workspace', 'restricted')),
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, client_account_id),
  constraint client_folders_parent_fk
    foreign key (parent_folder_id, client_account_id)
    references public.client_folders(id, client_account_id) on delete cascade
);

create unique index idx_client_folders_name_parent
on public.client_folders (
  client_account_id,
  coalesce(parent_folder_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);
create index idx_client_folders_account_date
on public.client_folders (client_account_id, created_at desc);

create table public.client_folder_members (
  folder_id uuid not null,
  member_id uuid not null,
  client_account_id uuid not null references public.client_accounts(id) on delete cascade,
  permission text not null default 'viewer' check (permission in ('manager', 'contributor', 'viewer')),
  created_by_auth_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (folder_id, member_id),
  constraint client_folder_members_folder_fk
    foreign key (folder_id, client_account_id)
    references public.client_folders(id, client_account_id) on delete cascade,
  constraint client_folder_members_member_fk
    foreign key (member_id, client_account_id)
    references public.client_account_members(id, client_account_id) on delete cascade
);

create index idx_client_folder_members_account
on public.client_folder_members (client_account_id, member_id);

alter table public.client_delivery_files
  add column folder_id uuid references public.client_folders(id) on delete set null;
alter table public.client_delivery_files
  alter column delivery_id drop not null;
create index idx_delivery_files_folder_date
on public.client_delivery_files (folder_id, created_at desc)
where revoked_at is null;

alter table public.client_portal_audit_logs
  add column member_id uuid references public.client_account_members(id) on delete set null,
  add column folder_id uuid references public.client_folders(id) on delete set null;
create index idx_portal_audit_member_date
on public.client_portal_audit_logs (member_id, created_at desc);
create index idx_portal_audit_folder_date
on public.client_portal_audit_logs (folder_id, created_at desc);

create trigger client_account_members_updated_at
before update on public.client_account_members
for each row execute function public.portal_set_updated_at();

create trigger client_folders_updated_at
before update on public.client_folders
for each row execute function public.portal_set_updated_at();

insert into public.client_account_members (
  client_account_id,
  auth_user_id,
  display_name,
  email,
  role,
  status,
  accepted_at,
  last_login_at,
  created_at,
  updated_at
)
select
  id,
  auth_user_id,
  contact_name,
  email,
  'owner',
  case when status = 'active' then 'active' else 'disabled' end,
  created_at,
  last_login_at,
  created_at,
  updated_at
from public.client_accounts
on conflict (auth_user_id) do nothing;

insert into public.client_folders (
  client_account_id,
  delivery_id,
  name,
  access_scope,
  created_by_auth_user_id,
  created_at,
  updated_at
)
select
  delivery.client_account_id,
  delivery.id,
  delivery.title,
  'workspace',
  account.auth_user_id,
  delivery.created_at,
  delivery.created_at
from public.client_deliveries delivery
join public.client_accounts account on account.id = delivery.client_account_id
on conflict (delivery_id) do nothing;

update public.client_delivery_files file
set folder_id = folder.id
from public.client_folders folder
where folder.delivery_id = file.delivery_id
  and file.folder_id is null;

create or replace function public.portal_sync_delivery_folder()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_user_id uuid;
begin
  select auth_user_id into owner_user_id
  from public.client_accounts
  where id = new.client_account_id;

  insert into public.client_folders (
    client_account_id,
    delivery_id,
    name,
    access_scope,
    created_by_auth_user_id,
    created_at,
    updated_at
  ) values (
    new.client_account_id,
    new.id,
    new.title,
    'workspace',
    owner_user_id,
    new.created_at,
    now()
  )
  on conflict (delivery_id) do update
  set name = excluded.name,
      updated_at = now();

  return new;
end;
$$;

create trigger client_delivery_folder_sync
after insert or update of title on public.client_deliveries
for each row execute function public.portal_sync_delivery_folder();

create or replace function public.portal_member_account_id(check_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select client_account_id
  from public.client_account_members
  where auth_user_id = check_user_id and status = 'active'
  limit 1;
$$;

create or replace function public.portal_member_role(check_user_id uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.client_account_members
  where auth_user_id = check_user_id and status = 'active'
  limit 1;
$$;

create or replace function public.is_client_workspace_member(
  check_account_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_account_members
    where client_account_id = check_account_id
      and auth_user_id = check_user_id
      and status = 'active'
  );
$$;

create or replace function public.can_manage_client_team(
  check_account_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_account_members
    where client_account_id = check_account_id
      and auth_user_id = check_user_id
      and status = 'active'
      and role in ('owner', 'manager')
  );
$$;

create or replace function public.can_access_client_folder(
  check_folder_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_folders folder
    join public.client_account_members member
      on member.client_account_id = folder.client_account_id
     and member.auth_user_id = check_user_id
     and member.status = 'active'
    left join public.client_folder_members permission
      on permission.folder_id = folder.id
     and permission.member_id = member.id
    where folder.id = check_folder_id
      and (
        folder.access_scope = 'workspace'
        or member.role = 'owner'
        or permission.member_id is not null
      )
  );
$$;

create or replace function public.can_contribute_client_folder(
  check_folder_id uuid,
  check_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.client_folders folder
    join public.client_account_members member
      on member.client_account_id = folder.client_account_id
     and member.auth_user_id = check_user_id
     and member.status = 'active'
    left join public.client_folder_members permission
      on permission.folder_id = folder.id
     and permission.member_id = member.id
    where folder.id = check_folder_id
      and (
        member.role = 'owner'
        or (folder.access_scope = 'workspace' and member.role in ('manager', 'contributor'))
        or permission.permission in ('manager', 'contributor')
      )
  );
$$;

revoke all on function public.portal_member_account_id(uuid) from public;
revoke all on function public.portal_member_role(uuid) from public;
revoke all on function public.is_client_workspace_member(uuid, uuid) from public;
revoke all on function public.can_manage_client_team(uuid, uuid) from public;
revoke all on function public.can_access_client_folder(uuid, uuid) from public;
revoke all on function public.can_contribute_client_folder(uuid, uuid) from public;
grant execute on function public.portal_member_account_id(uuid) to authenticated, service_role;
grant execute on function public.portal_member_role(uuid) to authenticated, service_role;
grant execute on function public.is_client_workspace_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_manage_client_team(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_access_client_folder(uuid, uuid) to authenticated, service_role;
grant execute on function public.can_contribute_client_folder(uuid, uuid) to authenticated, service_role;

alter table public.client_account_members enable row level security;
alter table public.client_folders enable row level security;
alter table public.client_folder_members enable row level security;

drop policy if exists client_accounts_read_self_or_admin on public.client_accounts;
create policy client_accounts_read_workspace_or_admin
on public.client_accounts for select to authenticated
using (
  (select public.is_portal_admin())
  or (select public.is_client_workspace_member(id))
);

drop policy if exists client_deliveries_read_own_or_admin on public.client_deliveries;
create policy client_deliveries_read_workspace_or_admin
on public.client_deliveries for select to authenticated
using (
  (select public.is_portal_admin())
  or (select public.is_client_workspace_member(client_account_id))
);

drop policy if exists client_delivery_files_admin_read on public.client_delivery_files;
create policy client_delivery_files_read_workspace_or_admin
on public.client_delivery_files for select to authenticated
using (
  (select public.is_portal_admin())
  or (
    (select public.is_client_workspace_member(client_account_id))
    and (folder_id is null or (select public.can_access_client_folder(folder_id)))
  )
);

drop policy if exists client_audit_logs_read_own_or_admin on public.client_portal_audit_logs;
create policy client_audit_logs_read_workspace_or_admin
on public.client_portal_audit_logs for select to authenticated
using (
  (select public.is_portal_admin())
  or (client_account_id is not null and (select public.is_client_workspace_member(client_account_id)))
);

create policy client_members_read_workspace
on public.client_account_members for select to authenticated
using (
  (select public.is_portal_admin())
  or auth_user_id = (select auth.uid())
  or (select public.can_manage_client_team(client_account_id))
);

create policy client_folders_read_accessible
on public.client_folders for select to authenticated
using (
  (select public.is_portal_admin())
  or (select public.can_access_client_folder(id))
);

create policy client_folder_members_read_accessible
on public.client_folder_members for select to authenticated
using (
  (select public.is_portal_admin())
  or (select public.can_access_client_folder(folder_id))
);

revoke all on public.client_account_members from anon, authenticated;
revoke all on public.client_folders from anon, authenticated;
revoke all on public.client_folder_members from anon, authenticated;
grant select on public.client_account_members to authenticated;
grant select on public.client_folders to authenticated;
grant select on public.client_folder_members to authenticated;
grant all on public.client_account_members to service_role;
grant all on public.client_folders to service_role;
grant all on public.client_folder_members to service_role;

commit;
