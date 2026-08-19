import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../lib/portal/auth";
import { createAdminSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { companyName?: string; contactName?: string; email?: string; temporaryPassword?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!body?.companyName?.trim() || !body.contactName?.trim() || !email || !body.temporaryPassword || body.temporaryPassword.length < 12) {
    return NextResponse.json({ error: "Company, contact, email and a 12-character temporary password are required." }, { status: 400 });
  }
  const admin = createAdminSupabase();
  const { data: created, error: authError } = await admin.auth.admin.createUser({ email, password: body.temporaryPassword, email_confirm: true, user_metadata: { contact_name: body.contactName.trim(), company_name: body.companyName.trim() } });
  if (authError || !created.user) return NextResponse.json({ error: "Client login could not be created. The email may already exist." }, { status: 400 });
  const { data: account, error } = await admin.from("client_accounts").insert({ auth_user_id: created.user.id, company_name: body.companyName.trim(), contact_name: body.contactName.trim(), email, status: "active" }).select("id").single();
  if (error || !account) {
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Client account could not be created." }, { status: 500 });
  }
  await writeAudit({ client_account_id: account.id, auth_user_id: auth.context.user.id, action: "admin_client_created", file_id: null, delivery_id: null, metadata: {} });
  return auth.context.applyCookies(NextResponse.json({ id: account.id }, { status: 201 }));
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { clientId?: string; status?: "active" | "disabled" } | null;
  if (!body?.clientId || !["active", "disabled"].includes(body.status || "")) return NextResponse.json({ error: "A valid client and status are required." }, { status: 400 });
  const admin = createAdminSupabase();
  const { data: account, error } = await admin.from("client_accounts").update({ status: body.status }).eq("id", body.clientId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "Client access could not be updated." }, { status: 500 });
  if (!account) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  await writeAudit({ client_account_id: account.id, auth_user_id: auth.context.user.id, action: body.status === "disabled" ? "access_revoked" : "access_restored", file_id: null, delivery_id: null, metadata: {} });
  return auth.context.applyCookies(NextResponse.json({ ok: true }));
}
