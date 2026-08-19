import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET, SIGNED_URL_TTL_SECONDS } from "../../../../../lib/portal/config";
import { decideResourceAccess } from "../../../../../lib/portal/security";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { ClientDelivery, DeliveryFile } from "../../../../../lib/portal/types";
import { contentDispositionFilename, safeFilename } from "../../../../../lib/portal/utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ deliveryId: string }> }) {
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  const { deliveryId } = await params;
  const admin = createAdminSupabase();
  const { data: delivery } = await admin.from("client_deliveries").select("*").eq("id", deliveryId).maybeSingle<ClientDelivery>();
  const decision = decideResourceAccess({ authenticated: true, accountExists: true, accountStatus: auth.context.account.status, resourceExists: Boolean(delivery), resourceClientId: delivery?.client_account_id, clientAccountId: auth.context.account.id, revoked: Boolean(delivery?.archived_at) });
  if (!decision.allowed) return NextResponse.json({ error: decision.status === 404 ? "Delivery not found." : decision.status === 410 ? "Delivery is no longer available." : "Delivery access denied." }, { status: decision.status });
  const { data } = await admin.from("client_delivery_files").select("*").eq("delivery_id", deliveryId).eq("client_account_id", auth.context.account.id).is("revoked_at", null).order("created_at");
  const files = (data || []) as DeliveryFile[];
  if (!files.length) return NextResponse.json({ error: "No downloadable files were found." }, { status: 404 });
  const { data: signed, error } = await admin.storage.from(PORTAL_BUCKET).createSignedUrls(files.map(file => file.storage_path), SIGNED_URL_TTL_SECONDS);
  if (error || !signed) return NextResponse.json({ error: "Delivery download is temporarily unavailable." }, { status: 500 });
  const upstreams = await Promise.all(signed.map(item => item.signedUrl ? fetch(item.signedUrl, { cache: "no-store" }) : null));
  if (upstreams.some(response => !response?.ok || !response.body)) return NextResponse.json({ error: "One or more delivery files are missing." }, { status: 404 });

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const used = new Map<string, number>();
  files.forEach((file, index) => {
    const clean = safeFilename(file.filename);
    const seen = used.get(clean) || 0;
    used.set(clean, seen + 1);
    const name = seen ? `${seen + 1}-${clean}` : clean;
    archive.append(Readable.fromWeb(upstreams[index]!.body! as never), { name });
  });
  void archive.finalize();
  await writeAudit({ client_account_id: auth.context.account.id, auth_user_id: auth.context.user.id, action: "bulk_download", file_id: null, delivery_id: delivery!.id, metadata: { file_count: files.length } });
  const zipName = `${safeFilename(delivery!.title)}-${delivery!.id.slice(0, 8)}.zip`;
  return new Response(Readable.toWeb(archive) as ReadableStream, { headers: { "content-type": "application/zip", "content-disposition": `attachment; ${contentDispositionFilename(zipName)}`, "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" } });
}
