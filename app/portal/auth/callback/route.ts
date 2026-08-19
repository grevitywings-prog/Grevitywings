import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../lib/portal/config";
import { createAdminSupabase, createRouteSupabase } from "../../../lib/portal/supabase";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!hasSupabaseEnvironment()) return NextResponse.redirect(new URL("/portal/login?status=setup", url));
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/portal";
  if (!code) return NextResponse.redirect(new URL("/portal/login?status=reset-error", url));
  const { supabase, applyCookies } = createRouteSupabase(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (!error) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminSupabase();
      await admin.from("client_account_members").update({ status: "active", accepted_at: new Date().toISOString() }).eq("auth_user_id", user.id).eq("status", "invited");
    }
  }
  return applyCookies(NextResponse.redirect(new URL(error ? "/portal/login?status=reset-error" : next, url)));
}
