import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../lib/portal/auth";
import { createAdminSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";
import { getFolderAccess } from "../../../../lib/portal/workspace";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  const { folderId } = await params;
  const access = await getFolderAccess(folderId, auth.context.member);
  if (!access) return auth.context.applyCookies(NextResponse.json({ error: "Folder not found." }, { status: 404 }));
  if (access.permission !== "manager") return auth.context.applyCookies(NextResponse.json({ error: "Folder management permission is required." }, { status: 403 }));
  const body = await request.json().catch(() => null) as { name?: string; accessScope?: "workspace" | "restricted" } | null;
  const updates: { name?: string; access_scope?: "workspace" | "restricted" } = {};
  if (body?.name !== undefined) {
    const name = body.name.trim().replaceAll("/", "-").slice(0, 120);
    if (!name) return auth.context.applyCookies(NextResponse.json({ error: "Folder name is required." }, { status: 400 }));
    updates.name = name;
  }
  if (body?.accessScope) updates.access_scope = body.accessScope;
  if (!Object.keys(updates).length) return auth.context.applyCookies(NextResponse.json({ error: "No folder update was provided." }, { status: 400 }));
  const admin = createAdminSupabase();
  const { error } = await admin.from("client_folders").update(updates).eq("id", access.folder.id).eq("client_account_id", auth.context.account.id);
  if (error) return auth.context.applyCookies(NextResponse.json({ error: error.code === "23505" ? "A folder with this name already exists here." : "The folder could not be updated." }, { status: error.code === "23505" ? 409 : 500 }));
  if (updates.access_scope === "restricted") {
    await admin.from("client_folder_members").upsert({ folder_id: access.folder.id, member_id: auth.context.member.id, client_account_id: auth.context.account.id, permission: "manager", created_by_auth_user_id: auth.context.user.id }, { onConflict: "folder_id,member_id" });
  }
  await writeAudit({ client_account_id: auth.context.account.id, member_id: auth.context.member.id, folder_id: access.folder.id, auth_user_id: auth.context.user.id, action: "folder_updated", file_id: null, delivery_id: access.folder.delivery_id, metadata: updates });
  return auth.context.applyCookies(NextResponse.json({ message: "Folder updated." }));
}
