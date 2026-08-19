import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET } from "../../../../../lib/portal/config";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import { isSameOrigin, safeFilename, validateUpload } from "../../../../../lib/portal/utils";
import { canContribute, getFolderAccess } from "../../../../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request); if (!auth.ok) return auth.response;
  const { folderId } = await params;
  const access = await getFolderAccess(folderId, auth.context.member);
  if (!access) return auth.context.applyCookies(NextResponse.json({ error: "Folder not found." }, { status: 404 }));
  if (!canContribute(access.permission)) return auth.context.applyCookies(NextResponse.json({ error: "Upload permission is required." }, { status: 403 }));
  const form = await request.formData().catch(() => null);
  const files = form?.getAll("files").filter(value => value instanceof File) as File[] | undefined;
  if (!files?.length || files.length > 20) return auth.context.applyCookies(NextResponse.json({ error: "Choose between 1 and 20 files." }, { status: 400 }));
  const admin = createAdminSupabase();
  const outcomes = await Promise.all(files.map(async file => {
    const validation = validateUpload(file);
    if (validation) return { filename: file.name, ok: false, error: validation };
    const filename = safeFilename(file.name);
    const storagePath = `clients/${auth.context.account.id}/folders/${access.folder.id}/${crypto.randomUUID()}-${filename}`;
    const { error: uploadError } = await admin.storage.from(PORTAL_BUCKET).upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false, cacheControl: "private, max-age=0" });
    if (uploadError) return { filename: file.name, ok: false, error: "Storage upload failed." };
    const { data: record, error: metadataError } = await admin.from("client_delivery_files").insert({ delivery_id: access.folder.delivery_id, folder_id: access.folder.id, client_account_id: auth.context.account.id, storage_path: storagePath, filename: file.name, mime_type: file.type || "application/octet-stream", file_size: file.size }).select("id").single();
    if (metadataError || !record) { await admin.storage.from(PORTAL_BUCKET).remove([storagePath]); return { filename: file.name, ok: false, error: "File metadata could not be saved." }; }
    await writeAudit({ client_account_id: auth.context.account.id, member_id: auth.context.member.id, folder_id: access.folder.id, auth_user_id: auth.context.user.id, action: "client_upload", file_id: record.id, delivery_id: access.folder.delivery_id, metadata: { filename: file.name, file_size: file.size } });
    return { filename: file.name, ok: true, id: record.id };
  }));
  await admin.from("client_folders").update({ updated_at: new Date().toISOString() }).eq("id", access.folder.id);
  const failed = outcomes.some(result => !result.ok);
  return auth.context.applyCookies(NextResponse.json({ results: outcomes }, { status: failed ? 207 : 201 }));
}
