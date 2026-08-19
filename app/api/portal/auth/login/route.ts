import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../../lib/portal/config";
import { createAdminSupabase, createRouteSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";
import { writeAudit } from "../../../../lib/portal/auth";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseEnvironment()) return NextResponse.json({ error: "Portal is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: string; password?: string; next?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !body?.password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: body.password });
  if (error || !data.user) return applyCookies(NextResponse.json({ error: "Invalid email or password." }, { status: 401 }));

  const [{ data: client }, { data: portalAdmin }] = await Promise.all([
    supabase.from("client_accounts").select("id, status").eq("auth_user_id", data.user.id).maybeSingle(),
    supabase.from("portal_admins").select("id, status").eq("auth_user_id", data.user.id).maybeSingle(),
  ]);
  const isAdmin = portalAdmin?.status === "active";
  if (!isAdmin && (!client || client.status !== "active")) {
    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ error: client?.status === "disabled" ? "This client account is disabled." : "Client access has not been assigned." }, { status: 403 }));
  }

  if (client) {
    const admin = createAdminSupabase();
    await admin.from("client_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", client.id);
    await writeAudit({ client_account_id: client.id, auth_user_id: data.user.id, action: "client_login", file_id: null, delivery_id: null, metadata: {} });
  }
  const requested = body.next && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : null;
  const redirectTo = requested || (isAdmin ? "/admin/client-delivery" : "/portal");
  return applyCookies(NextResponse.json({ redirectTo }));
}
