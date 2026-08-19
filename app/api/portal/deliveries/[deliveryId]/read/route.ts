import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { ClientDelivery } from "../../../../../lib/portal/types";
import { isSameOrigin } from "../../../../../lib/portal/utils";

export async function POST(request: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  const { deliveryId } = await params;
  const admin = createAdminSupabase();
  const { data: delivery } = await admin.from("client_deliveries").select("*").eq("id", deliveryId).maybeSingle<ClientDelivery>();
  if (!delivery) return NextResponse.json({ error: "Delivery not found." }, { status: 404 });
  if (delivery.client_account_id !== auth.context.account.id) return NextResponse.json({ error: "Delivery access denied." }, { status: 403 });
  if (delivery.archived_at) return NextResponse.json({ error: "Delivery is no longer available." }, { status: 410 });
  if (!delivery.read_at) {
    await admin.from("client_deliveries").update({ read_at: new Date().toISOString() }).eq("id", delivery.id).eq("client_account_id", auth.context.account.id);
    await writeAudit({ client_account_id: auth.context.account.id, auth_user_id: auth.context.user.id, action: "delivery_read", file_id: null, delivery_id: delivery.id, metadata: {} });
  }
  return auth.context.applyCookies(NextResponse.json({ ok: true }));
}
