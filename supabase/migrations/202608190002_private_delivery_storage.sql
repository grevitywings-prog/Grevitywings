begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'client-deliveries',
  'client-deliveries',
  false,
  52428800,
  array[
    'text/csv',
    'application/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/pdf',
    'application/zip',
    'application/x-zip-compressed',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy delivery_storage_read_admin
on storage.objects for select to authenticated
using (bucket_id = 'client-deliveries' and (select public.is_portal_admin()));

create policy delivery_storage_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'client-deliveries'
  and (select public.is_portal_admin())
  and (storage.foldername(name))[1] = 'clients'
);

create policy delivery_storage_admin_update
on storage.objects for update to authenticated
using (bucket_id = 'client-deliveries' and (select public.is_portal_admin()))
with check (bucket_id = 'client-deliveries' and (select public.is_portal_admin()));

create policy delivery_storage_admin_delete
on storage.objects for delete to authenticated
using (bucket_id = 'client-deliveries' and (select public.is_portal_admin()));

commit;
