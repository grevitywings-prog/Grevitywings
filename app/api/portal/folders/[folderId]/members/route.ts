import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { ClientMember } from "../../../../../lib/portal/types";
import { isSameOrigin } from "../../../../../lib/portal/utils";
import { getFolderAccess } from "../../../../../lib/portal/workspace";

const permissions = ["manager", "contributor", "viewer"] as const;

async function authorize(request: NextRequest, folderId: string) {
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth;
  const access = await getFolderAccess(folderId, auth.context.member);
  if (!access) return { ok: false as const, response: auth.context.applyCookies(NextResponse.json({ error: "Folder not found." }, { status: 404 })) };
  if (access.permission !== "manager") return { ok: false as const, response: auth.context.applyCookies(NextResponse.json({ error: "Folder management permission is required." }, { status: 403 })) };
  return { ok: true as const, context: auth.context, folder: access.folder };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { folderId } = await params;
  const auth = await authorize(request, folderId); if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { memberId?: string; permission?: typeof permissions[number] } | null;
  if (!body?.memberId || !body.permission || !permissions.includes(body.permission)) return auth.context.applyCookies(NextResponse.json({ error: "Member and permission are required." }, { status: 400 }));
  const admin = createAdminSupabase();
  const { data: member } = await admin.from("client_account_members").select("*").eq("id", body.memberId).maybeSingle<ClientMember>();
  if (!member || member.client_account_id !== auth.context.account.id || member.status === "disabled") return auth.context.applyCookies(NextResponse.json({ error: "Team member not found." }, { status: 404 }));
  if (member.role === "owner") return auth.context.applyCookies(NextResponse.json({ message: "The workspace owner already has full access." }));
  await admin.from("client_folders").update({ access_scope: "restricted" }).eq("id", folderId);
  const { error } = await admin.from("client_folder_members").upsert({ folder_id: folderId, member_id: member.id, client_account_id: auth.context.account.id, permission: body.permission, created_by_auth_user_id: auth.context.user.id }, { onConflict: "folder_id,member_id" });
  if (error) return auth.context.applyCookies(NextResponse.json({ error: "Folder access could not be updated." }, { status: 500 }));
  await writeAudit({ client_account_id: auth.context.account.id, member_id: member.id, folder_id: folderId, auth_user_id: auth.context.user.id, action: "folder_member_shared", file_id: null, delivery_id: auth.folder.delivery_id, metadata: { permission: body.permission } });
  return auth.context.applyCookies(NextResponse.json({ message: "Folder access updated." }));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { folderId } = await params;
  const auth = await authorize(request, folderId); if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { memberId?: string } | null;
  if (!body?.memberId || body.memberId === auth.context.member.id) return auth.context.applyCookies(NextResponse.json({ error: "Select another team member." }, { status: 400 }));
  const admin = createAdminSupabase();
  const { error } = await admin.from("client_folder_members").delete().eq("folder_id", folderId).eq("member_id", body.memberId).eq("client_account_id", auth.context.account.id);
  if (error) return auth.context.applyCookies(NextResponse.json({ error: "Folder access could not be removed." }, { status: 500 }));
  await writeAudit({ client_account_id: auth.context.account.id, member_id: body.memberId, folder_id: folderId, auth_user_id: auth.context.user.id, action: "folder_member_removed", file_id: null, delivery_id: auth.folder.delivery_id, metadata: {} });
  return auth.context.applyCookies(NextResponse.json({ message: "Folder access removed." }));
}
