import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET } from "../../../../../lib/portal/config";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { ClientDelivery, DeliveryFile } from "../../../../../lib/portal/types";
import { isSameOrigin } from "../../../../../lib/portal/utils";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request); if (!auth.ok) return auth.response;
  const { deliveryId } = await params;
  const body = await request.json().catch(() => null) as { title?: string; campaign?: string; description?: string; action?: "archive" | "restore" } | null;
  const admin = createAdminSupabase();
  const changes: Record<string, string | null> = {};
  if (body?.title?.trim()) changes.title = body.title.trim();
  if (body?.campaign?.trim()) changes.campaign = body.campaign.trim();
  if (typeof body?.description === "string") changes.description = body.description.trim() || null;
  if (body?.action === "archive") changes.archived_at = new Date().toISOString();
  if (body?.action === "restore") changes.archived_at = null;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "No valid delivery changes were supplied." }, { status: 400 });
  const { data: delivery, error } = await admin.from("client_deliveries").update(changes).eq("id", deliveryId).select("*").maybeSingle<ClientDelivery>();
  if (error) return NextResponse.json({ error: "Delivery could not be updated." }, { status: 500 });
  if (!delivery) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  await writeAudit({ client_account_id: delivery.client_account_id, auth_user_id: auth.context.user.id, action: body?.action === "archive" ? "admin_delivery_archived" : body?.action === "restore" ? "admin_delivery_restored" : "admin_delivery_edited", file_id: null, delivery_id: delivery.id, metadata: {} });
  return auth.context.applyCookies(NextResponse.json({ ok: true }));
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request); if (!auth.ok) return auth.response;
  const { deliveryId } = await params;
  const admin = createAdminSupabase();
  const { data: delivery } = await admin.from("client_deliveries").select("*").eq("id", deliveryId).maybeSingle<ClientDelivery>();
  if (!delivery) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  const { data } = await admin.from("client_delivery_files").select("storage_path").eq("delivery_id", delivery.id);
  const files = (data || []) as Pick<DeliveryFile, "storage_path">[];
  if (files.length) {
    const { error: storageError } = await admin.storage.from(PORTAL_BUCKET).remove(files.map(file => file.storage_path));
    if (storageError) return NextResponse.json({ error: "Delivery files could not be removed safely." }, { status: 500 });
  }
  const { error } = await admin.from("client_deliveries").delete().eq("id", delivery.id);
  if (error) return NextResponse.json({ error: "Delivery could not be deleted." }, { status: 500 });
  await writeAudit({ client_account_id: delivery.client_account_id, auth_user_id: auth.context.user.id, action: "admin_delivery_deleted", file_id: null, delivery_id: null, metadata: { delivery_id: delivery.id, file_count: files.length } });
  return auth.context.applyCookies(NextResponse.json({ ok: true }));
}
