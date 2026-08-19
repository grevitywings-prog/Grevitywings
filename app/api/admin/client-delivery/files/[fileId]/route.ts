import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET } from "../../../../../lib/portal/config";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { DeliveryFile } from "../../../../../lib/portal/types";
import { isSameOrigin } from "../../../../../lib/portal/utils";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request); if (!auth.ok) return auth.response;
  const { fileId } = await params;
  const admin = createAdminSupabase();
  const { data: file } = await admin.from("client_delivery_files").select("*").eq("id", fileId).maybeSingle<DeliveryFile>();
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  const { error: storageError } = await admin.storage.from(PORTAL_BUCKET).remove([file.storage_path]);
  if (storageError) return NextResponse.json({ error: "File could not be removed safely." }, { status: 500 });
  const { error } = await admin.from("client_delivery_files").delete().eq("id", file.id);
  if (error) return NextResponse.json({ error: "File metadata could not be deleted." }, { status: 500 });
  await writeAudit({ client_account_id: file.client_account_id, folder_id: file.folder_id, auth_user_id: auth.context.user.id, action: "admin_file_deleted", file_id: null, delivery_id: file.delivery_id, metadata: { filename: file.filename } });
  return auth.context.applyCookies(NextResponse.json({ ok: true }));
}
