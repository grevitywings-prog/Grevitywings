import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../lib/portal/auth";
import { PORTAL_BUCKET } from "../../../../lib/portal/config";
import { createAdminSupabase } from "../../../../lib/portal/supabase";
import type { ClientDelivery } from "../../../../lib/portal/types";
import { isSameOrigin, safeFilename, validateUpload } from "../../../../lib/portal/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request); if (!auth.ok) return auth.response;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const clientId = String(form.get("clientId") || "");
  const deliveryId = String(form.get("deliveryId") || "");
  const files = form.getAll("files").filter(value => value instanceof File) as File[];
  if (!clientId || !deliveryId || !files.length || files.length > 20) return NextResponse.json({ error: "Select a client, delivery and between 1 and 20 files." }, { status: 400 });
  const admin = createAdminSupabase();
  const { data: delivery } = await admin.from("client_deliveries").select("*").eq("id", deliveryId).maybeSingle<ClientDelivery>();
  if (!delivery) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  if (delivery.client_account_id !== clientId) return NextResponse.json({ error: "Delivery does not belong to the selected client." }, { status: 403 });
  if (delivery.archived_at) return NextResponse.json({ error: "Archived deliveries cannot accept uploads." }, { status: 410 });
  const { data: folder } = await admin.from("client_folders").select("id").eq("delivery_id", deliveryId).maybeSingle();

  const outcomes = await Promise.all(files.map(async file => {
    const validation = validateUpload(file);
    if (validation) return { filename: file.name, ok: false, error: validation };
    const filename = safeFilename(file.name);
    const storagePath = `clients/${clientId}/${deliveryId}/${crypto.randomUUID()}-${filename}`;
    const { error: uploadError } = await admin.storage.from(PORTAL_BUCKET).upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false, cacheControl: "private, max-age=0" });
    if (uploadError) return { filename: file.name, ok: false, error: "Storage upload failed." };
    const { data: record, error: metadataError } = await admin.from("client_delivery_files").insert({ delivery_id: deliveryId, folder_id: folder?.id || null, client_account_id: clientId, storage_path: storagePath, filename: file.name, mime_type: file.type || "application/octet-stream", file_size: file.size }).select("id").single();
    if (metadataError || !record) {
      await admin.storage.from(PORTAL_BUCKET).remove([storagePath]);
      return { filename: file.name, ok: false, error: "File metadata could not be saved." };
    }
    await writeAudit({ client_account_id: clientId, folder_id: folder?.id || null, auth_user_id: auth.context.user.id, action: "admin_upload", file_id: record.id, delivery_id: deliveryId, metadata: { filename: file.name, file_size: file.size } });
    return { filename: file.name, ok: true, id: record.id };
  }));
  const failed = outcomes.filter(result => !result.ok).length;
  return auth.context.applyCookies(NextResponse.json({ results: outcomes }, { status: failed ? 207 : 201 }));
}
