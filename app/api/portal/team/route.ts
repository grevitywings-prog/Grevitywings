import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../lib/portal/api-auth";
import { writeAudit } from "../../../lib/portal/auth";
import { createAdminSupabase } from "../../../lib/portal/supabase";
import type { ClientMember, ClientMemberRole } from "../../../lib/portal/types";
import { isSameOrigin } from "../../../lib/portal/utils";
import { canInviteRole, canManageTeam } from "../../../lib/portal/workspace";

const inviteRoles: ClientMemberRole[] = ["manager", "contributor", "viewer"];

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  if (!canManageTeam(auth.context.member)) return auth.context.applyCookies(NextResponse.json({ error: "Team management permission is required." }, { status: 403 }));
  const body = await request.json().catch(() => null) as { displayName?: string; email?: string; role?: ClientMemberRole } | null;
  const displayName = body?.displayName?.trim().slice(0, 100);
  const email = body?.email?.trim().toLowerCase().slice(0, 254);
  const role = body?.role;
  if (!displayName || !email || !email.includes("@") || !role || !inviteRoles.includes(role)) {
    return auth.context.applyCookies(NextResponse.json({ error: "Name, valid email and role are required." }, { status: 400 }));
  }
  if (!canInviteRole(auth.context.member, role)) {
    return auth.context.applyCookies(NextResponse.json({ error: "You cannot assign that role." }, { status: 403 }));
  }
  const admin = createAdminSupabase();
  const { data: existing } = await admin.from("client_account_members").select("id, client_account_id, status").ilike("email", email).maybeSingle();
  if (existing) {
    const message = existing.client_account_id === auth.context.account.id
      ? "This person is already part of your workspace."
      : "This email is already assigned to another workspace.";
    return auth.context.applyCookies(NextResponse.json({ error: message }, { status: 409 }));
  }
  const redirectTo = `${new URL(request.url).origin}/portal/auth/callback?next=/portal/reset-password`;
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo, data: { display_name: displayName } });
  if (inviteError || !invited.user) {
    return auth.context.applyCookies(NextResponse.json({ error: "The invitation could not be sent. Confirm Supabase email delivery is configured and try again." }, { status: 400 }));
  }
  const { data: member, error } = await admin.from("client_account_members").insert({
    client_account_id: auth.context.account.id,
    auth_user_id: invited.user.id,
    display_name: displayName,
    email,
    role,
    status: "invited",
    invited_by_auth_user_id: auth.context.user.id,
  }).select("id").single();
  if (error || !member) {
    await admin.auth.admin.deleteUser(invited.user.id);
    return auth.context.applyCookies(NextResponse.json({ error: "The workspace invitation could not be saved." }, { status: 500 }));
  }
  await writeAudit({ client_account_id: auth.context.account.id, member_id: member.id, auth_user_id: auth.context.user.id, action: "team_member_invited", file_id: null, delivery_id: null, metadata: { role } });
  return auth.context.applyCookies(NextResponse.json({ message: "Invitation sent securely." }, { status: 201 }));
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  if (!canManageTeam(auth.context.member)) return auth.context.applyCookies(NextResponse.json({ error: "Team management permission is required." }, { status: 403 }));
  const body = await request.json().catch(() => null) as { memberId?: string; status?: "active" | "disabled"; role?: ClientMemberRole } | null;
  if (!body?.memberId || (!body.status && !body.role)) return auth.context.applyCookies(NextResponse.json({ error: "Member and update are required." }, { status: 400 }));
  const admin = createAdminSupabase();
  const { data: target } = await admin.from("client_account_members").select("*").eq("id", body.memberId).maybeSingle<ClientMember>();
  if (!target || target.client_account_id !== auth.context.account.id) return auth.context.applyCookies(NextResponse.json({ error: "Team member not found." }, { status: 404 }));
  if (target.role === "owner" || target.id === auth.context.member.id) return auth.context.applyCookies(NextResponse.json({ error: "The workspace owner cannot be changed here." }, { status: 403 }));
  if (auth.context.member.role === "manager" && (target.role === "manager" || body.role === "manager")) return auth.context.applyCookies(NextResponse.json({ error: "Only the workspace owner can manage Managers." }, { status: 403 }));
  if (body.role && (!inviteRoles.includes(body.role) || !canInviteRole(auth.context.member, body.role))) return auth.context.applyCookies(NextResponse.json({ error: "You cannot assign that role." }, { status: 403 }));
  const updates: { status?: "active" | "disabled"; role?: ClientMemberRole } = {};
  if (body.status) updates.status = body.status;
  if (body.role) updates.role = body.role;
  const { error } = await admin.from("client_account_members").update(updates).eq("id", target.id).eq("client_account_id", auth.context.account.id);
  if (error) return auth.context.applyCookies(NextResponse.json({ error: "The member could not be updated." }, { status: 500 }));
  await writeAudit({ client_account_id: auth.context.account.id, member_id: target.id, auth_user_id: auth.context.user.id, action: body.status === "disabled" ? "team_member_disabled" : body.status === "active" ? "team_member_restored" : "team_member_role_changed", file_id: null, delivery_id: null, metadata: { role: body.role } });
  return auth.context.applyCookies(NextResponse.json({ message: "Team member updated." }));
}
