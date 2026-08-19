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

1. In **Authentication → URL Configuration**, set Site URL to `https://www.grevitywings.com` and add these exact Redirect URLs:
   - `https://www.grevitywings.com/portal/invite`
   - `https://www.grevitywings.com/portal/auth/callback?next=/portal/reset-password`
2. In **Authentication → Providers → Email**, keep email/password enabled and disable public sign-ups.
3. Create the first administrator in **Authentication → Users**.
4. Copy that user's UUID and run:

```sql
insert into public.portal_admins (auth_user_id, display_name)
values ('AUTH_USER_UUID', 'Portal Administrator');
```

5. Confirm **Storage → client-deliveries** is private. The second migration creates it with a 50 MB per-file limit.
6. Add the variables from `.env.example` to local development and to Vercel Production, Preview and Development environments. Set Vercel Production `NEXT_PUBLIC_SITE_URL` to `https://www.grevitywings.com`.
7. In **Authentication → Emails → SMTP Settings**, configure Custom SMTP with sender name `Grevitywings Client Portal` and a verified Grevitywings sender such as `portal@grevitywings.com`.
8. In **Authentication → Email Templates → Invite user**, set the subject to `You're invited to the Grevitywings Client Portal` and paste `supabase/templates/invite.html` as the template body. The template uses Supabase's one-time `TokenHash`; `/portal/invite` verifies it server-side only when the recipient submits a password.

Already-sent invitations containing an old or localhost redirect are not rewritten by configuration changes. Cancel and reissue those invitations after this application code, URL configuration and email template are active.

The workspace migration preserves existing data: current client users become workspace Owners, existing deliveries become workspace folders, and existing delivery files are linked to those folders without moving storage objects.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in browser code, screenshots, logs, or client-visible error messages.
