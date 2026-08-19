import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "./config";
import { createRouteSupabase } from "./supabase";
import type { ClientAccount } from "./types";

export type ClientApiContext = {
  user: { id: string; email?: string };
  account: ClientAccount;
  supabase: ReturnType<typeof createRouteSupabase>["supabase"];
  applyCookies: ReturnType<typeof createRouteSupabase>["applyCookies"];
};

export async function requireClientApi(request: NextRequest): Promise<
  | { ok: true; context: ClientApiContext }
  | { ok: false; response: NextResponse }
> {
  if (!hasSupabaseEnvironment()) {
    return { ok: false, response: NextResponse.json({ error: "Portal is not configured." }, { status: 503 }) };
  }
  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: applyCookies(NextResponse.json({ error: "Authentication required." }, { status: 401 })) };
  const { data: account } = await supabase
    .from("client_accounts")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<ClientAccount>();
  if (!account || account.status !== "active") {
    return { ok: false, response: applyCookies(NextResponse.json({ error: "Client access is not available." }, { status: 403 })) };
  }
  return { ok: true, context: { user: { id: user.id, email: user.email }, account, supabase, applyCookies } };
}

export async function requireAdminApi(request: NextRequest) {
  if (!hasSupabaseEnvironment()) {
    return { ok: false as const, response: NextResponse.json({ error: "Portal is not configured." }, { status: 503 }) };
  }
  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, response: applyCookies(NextResponse.json({ error: "Authentication required." }, { status: 401 })) };
  const { data: admin } = await supabase
    .from("portal_admins")
    .select("id, display_name, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!admin) return { ok: false as const, response: applyCookies(NextResponse.json({ error: "Administrator access required." }, { status: 403 })) };
  return { ok: true as const, context: { user, admin, supabase, applyCookies } };
}

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
