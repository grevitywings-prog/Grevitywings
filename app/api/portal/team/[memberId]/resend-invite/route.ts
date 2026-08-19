import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { getPortalUrl } from "../../../../../lib/portal/site-url";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { ClientMember } from "../../../../../lib/portal/types";
import { isSameOrigin } from "../../../../../lib/portal/utils";
import { canInviteRole, canManageTeam } from "../../../../../lib/portal/workspace";

export async function POST(request: NextRequest, { params }: { params: Promise<{ memberId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  if (!canManageTeam(auth.context.member)) {
    return auth.context.applyCookies(NextResponse.json({ error: "Team management permission is required." }, { status: 403 }));
  }
  const { memberId } = await params;
  const admin = createAdminSupabase();
  const { data: target } = await admin
    .from("client_account_members")
    .select("*")
    .eq("id", memberId)
    .eq("client_account_id", auth.context.account.id)
    .maybeSingle<ClientMember>();
  if (!target || target.status !== "invited" || !target.auth_user_id) {
    return auth.context.applyCookies(NextResponse.json({ error: "A pending invitation was not found." }, { status: 404 }));
  }
  if (!canInviteRole(auth.context.member, target.role)) {
    return auth.context.applyCookies(NextResponse.json({ error: "You cannot resend an invitation for that role." }, { status: 403 }));
  }

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(target.auth_user_id);
  if (authUserError || !authUser.user || authUser.user.email?.toLowerCase() !== target.email.toLowerCase()) {
    return auth.context.applyCookies(NextResponse.json({ error: "The invitation account could not be verified." }, { status: 409 }));
  }
  const redirectTo = getPortalUrl("/portal/invite-recovery");
  const { error: recoveryError } = await admin.auth.resetPasswordForEmail(target.email, { redirectTo });
  if (recoveryError) {
    return auth.context.applyCookies(NextResponse.json({ error: "The invitation could not be resent. Please try again later." }, { status: 400 }));
  }
  await writeAudit({
    client_account_id: auth.context.account.id,
    member_id: target.id,
    auth_user_id: auth.context.user.id,
    action: "team_member_invitation_resent",
    file_id: null,
    delivery_id: null,
    metadata: { role: target.role },
  }, admin);
  return auth.context.applyCookies(NextResponse.json({ message: "Invitation resent securely." }));
}
