import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../../lib/portal/config";
import { createRouteSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseEnvironment()) return NextResponse.json({ error: "Portal is not configured." }, { status: 503 });
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || body.password.length < 12) return NextResponse.json({ error: "Use at least 12 characters." }, { status: 400 });
  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return applyCookies(NextResponse.json({ error: "Your reset session has expired." }, { status: 401 }));
  const { error } = await supabase.auth.updateUser({ password: body.password });
  if (error) return applyCookies(NextResponse.json({ error: "Password could not be updated." }, { status: 400 }));
  return applyCookies(NextResponse.json({ redirectTo: "/portal" }));
}
