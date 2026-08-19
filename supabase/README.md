# Supabase setup for the Grevitywings Client Delivery Portal

Apply migrations in filename order before enabling the portal in production:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

Alternatively, paste each migration into the Supabase SQL Editor in this order:

1. `202608190001_client_delivery_portal.sql`
2. `202608190002_private_delivery_storage.sql`
3. `202608200003_client_workspaces.sql`

Then complete these one-time steps:

1. In **Authentication → URL Configuration**, set the Site URL to the production origin and add `https://YOUR_DOMAIN/portal/auth/callback` to Redirect URLs.
2. In **Authentication → Providers → Email**, keep email/password enabled and disable public sign-ups.
3. Create the first administrator in **Authentication → Users**.
4. Copy that user's UUID and run:

```sql
insert into public.portal_admins (auth_user_id, display_name)
values ('AUTH_USER_UUID', 'Portal Administrator');
```

5. Confirm **Storage → client-deliveries** is private. The second migration creates it with a 50 MB per-file limit.
6. Add the variables from `.env.example` to local development and to Vercel Production, Preview and Development environments.
7. Configure Supabase Auth email delivery for teammate invitations. Invitations are sent only by authenticated workspace Owners or Managers and direct recipients through `/portal/auth/callback` to password setup.

The workspace migration preserves existing data: current client users become workspace Owners, existing deliveries become workspace folders, and existing delivery files are linked to those folders without moving storage objects.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code, screenshots, logs, or client-visible error messages.
