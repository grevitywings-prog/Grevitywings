import { NextResponse, type NextRequest } from "next/server";
import { requireAdminApi } from "../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../lib/portal/auth";
import { createAdminSupabase } from "../../../../lib/portal/supabase";
import { isSameOrigin } from "../../../../lib/portal/utils";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const auth = await requireAdminApi(request);
  if (!auth.ok) return auth.response;
  const body = await request.json().catch(() => null) as { clientId?: string; title?: string; campaign?: string; description?: string; deliveredAt?: string } | null;
  if (!body?.clientId || !body.title?.trim() || !body.campaign?.trim()) return NextResponse.json({ error: "Client, delivery title and campaign are required." }, { status: 400 });
  const admin = createAdminSupabase();
  const { data: client } = await admin.from("client_accounts").select("id").eq("id", body.clientId).maybeSingle();
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  const { data: delivery, error } = await admin.from("client_deliveries").insert({ client_account_id: body.clientId, title: body.title.trim(), campaign: body.campaign.trim(), description: body.description?.trim() || null, delivered_at: body.deliveredAt || new Date().toISOString(), notification_status: "not_sent" }).select("id").single();
  if (error || !delivery) return NextResponse.json({ error: "Delivery could not be created." }, { status: 500 });
  await writeAudit({ client_account_id: body.clientId, auth_user_id: auth.context.user.id, action: "admin_delivery_created", file_id: null, delivery_id: delivery.id, metadata: {} });
  return auth.context.applyCookies(NextResponse.json({ id: delivery.id }, { status: 201 }));
}
