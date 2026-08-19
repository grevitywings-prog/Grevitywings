import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../../lib/portal/config";
import { createRouteSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";
import { writeAudit } from "../../../../lib/portal/auth";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseEnvironment()) return NextResponse.json({ error: "Portal is not configured." }, { status: 503 });
  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: client } = await supabase.from("client_accounts").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (client) await writeAudit({ client_account_id: client.id, auth_user_id: user.id, action: "client_logout", file_id: null, delivery_id: null, metadata: {} });
  }
  await supabase.auth.signOut();
  return applyCookies(NextResponse.json({ redirectTo: "/portal/login" }));
}
