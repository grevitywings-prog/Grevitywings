import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../lib/portal/api-auth";
import { writeAudit } from "../../../lib/portal/auth";
import { createAdminSupabase } from "../../../lib/portal/supabase";
import { isSameOrigin } from "../../../lib/portal/utils";
import { canContribute, canCreateFolders, getFolderAccess } from "../../../lib/portal/workspace";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  if (!canCreateFolders(auth.context.member)) return auth.context.applyCookies(NextResponse.json({ error: "Folder creation permission is required." }, { status: 403 }));
  const body = await request.json().catch(() => null) as { name?: string; parentFolderId?: string; accessScope?: "workspace" | "restricted" } | null;
  const name = body?.name?.trim().replaceAll("/", "-").slice(0, 120);
  const accessScope = body?.accessScope === "restricted" ? "restricted" : "workspace";
  if (!name) return auth.context.applyCookies(NextResponse.json({ error: "Folder name is required." }, { status: 400 }));
  if (body?.parentFolderId) {
    const parent = await getFolderAccess(body.parentFolderId, auth.context.member);
    if (!parent || !canContribute(parent.permission)) return auth.context.applyCookies(NextResponse.json({ error: "You cannot create a folder in that location." }, { status: 403 }));
  }
  const admin = createAdminSupabase();
  const { data: folder, error } = await admin.from("client_folders").insert({
    client_account_id: auth.context.account.id,
    parent_folder_id: body?.parentFolderId || null,
    name,
    access_scope: accessScope,
    created_by_auth_user_id: auth.context.user.id,
  }).select("id").single();
  if (error || !folder) {
    const duplicate = error?.code === "23505";
    return auth.context.applyCookies(NextResponse.json({ error: duplicate ? "A folder with this name already exists here." : "The folder could not be created." }, { status: duplicate ? 409 : 500 }));
  }
  if (accessScope === "restricted") {
    await admin.from("client_folder_members").insert({ folder_id: folder.id, member_id: auth.context.member.id, client_account_id: auth.context.account.id, permission: "manager", created_by_auth_user_id: auth.context.user.id });
  }
  await writeAudit({ client_account_id: auth.context.account.id, member_id: auth.context.member.id, folder_id: folder.id, auth_user_id: auth.context.user.id, action: "folder_created", file_id: null, delivery_id: null, metadata: { access_scope: accessScope } });
  return auth.context.applyCookies(NextResponse.json({ id: folder.id }, { status: 201 }));
}
