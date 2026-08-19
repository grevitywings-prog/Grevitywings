import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnvironment } from "../../../../lib/portal/config";
import { writeAudit } from "../../../../lib/portal/auth";
import { createAdminSupabase, createRouteSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";

type InvitationBody = {
  tokenHash?: string;
  password?: string;
  confirmPassword?: string;
};

const invalidInvitation = "This invitation is invalid, expired or has already been used.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasSupabaseEnvironment()) return NextResponse.json({ error: "Portal is not configured." }, { status: 503 });

  const body = await request.json().catch(() => null) as InvitationBody | null;
  const tokenHash = body?.tokenHash?.trim();
  const password = body?.password;
  if (!tokenHash || tokenHash.length > 1024) return NextResponse.json({ error: invalidInvitation }, { status: 400 });
  if (!password || password.length < 12 || password.length > 128) {
    return NextResponse.json({ error: "Use a password between 12 and 128 characters." }, { status: 400 });
  }
  if (password !== body?.confirmPassword) {
    return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
  }

  const { supabase, applyCookies } = createRouteSupabase(request);
  const { data: verified, error: verificationError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });
  if (verificationError || !verified.user) {
    return applyCookies(NextResponse.json({ error: invalidInvitation }, { status: 400 }));
  }

  const admin = createAdminSupabase();
  const { data: member } = await admin
    .from("client_account_members")
    .select("id, client_account_id, auth_user_id, role, status")
    .eq("auth_user_id", verified.user.id)
    .maybeSingle();
  if (!member || member.status !== "invited") {
    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ error: invalidInvitation }, { status: 403 }));
  }

  const { data: account } = await admin
    .from("client_accounts")
    .select("id, status")
    .eq("id", member.client_account_id)
    .maybeSingle();
  if (!account || account.status !== "active") {
    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ error: "This client workspace is not available." }, { status: 403 }));
  }

  const { error: passwordError } = await supabase.auth.updateUser({ password });
  if (passwordError) {
    return applyCookies(NextResponse.json({ error: "Your password could not be created." }, { status: 400 }));
  }

  const acceptedAt = new Date().toISOString();
  const { data: activated, error: activationError } = await admin
    .from("client_account_members")
    .update({ status: "active", accepted_at: acceptedAt })
    .eq("id", member.id)
    .eq("client_account_id", member.client_account_id)
    .eq("auth_user_id", verified.user.id)
    .eq("status", "invited")
    .select("id")
    .maybeSingle();
  if (activationError || !activated) {
    await supabase.auth.signOut();
    return applyCookies(NextResponse.json({ error: "Your workspace access could not be activated." }, { status: 500 }));
  }

  await writeAudit({
    client_account_id: member.client_account_id,
    member_id: member.id,
    auth_user_id: verified.user.id,
    action: "team_member_invitation_accepted",
    file_id: null,
    delivery_id: null,
    metadata: { role: member.role },
  }, admin);
  return applyCookies(NextResponse.json({ redirectTo: "/portal" }));
}
