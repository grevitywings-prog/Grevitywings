import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../../lib/portal/config";
import { createRouteSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseEnvironment()) return NextResponse.json({ error: "Portal is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });
  const { supabase, applyCookies } = createRouteSupabase(request);
  const origin = new URL(request.url).origin;
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/portal/auth/callback?next=/portal/reset-password` });
  return applyCookies(NextResponse.json({ message: "If the account exists, password reset instructions have been sent." }));
}
