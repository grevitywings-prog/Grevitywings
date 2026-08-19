import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET, SIGNED_URL_TTL_SECONDS } from "../../../../../lib/portal/config";
import { decideResourceAccess } from "../../../../../lib/portal/security";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { DeliveryFile } from "../../../../../lib/portal/types";
import { getFolderAccess } from "../../../../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const auth = await requireClientApi(request);
  if (!auth.ok) return auth.response;
  const { fileId } = await params;
  const admin = createAdminSupabase();
  const { data } = await admin.from("client_delivery_files").select("*").eq("id", fileId).maybeSingle<DeliveryFile>();
  const decision = decideResourceAccess({ authenticated: true, accountExists: true, accountStatus: auth.context.account.status, resourceExists: Boolean(data), resourceClientId: data?.client_account_id, clientAccountId: auth.context.account.id, revoked: Boolean(data?.revoked_at) });
  if (!decision.allowed) return NextResponse.json({ error: decision.status === 404 ? "File not found." : decision.status === 410 ? "File access has been revoked." : "File access denied." }, { status: decision.status });
  if (data!.folder_id && !(await getFolderAccess(data!.folder_id, auth.context.member))) return NextResponse.json({ error: "File not found." }, { status: 404 });

  const preview = new URL(request.url).searchParams.get("preview") === "1";
  if (preview && data!.mime_type !== "application/pdf") return NextResponse.json({ error: "Preview is only available for PDF files." }, { status: 400 });
  const { data: signed, error } = await admin.storage.from(PORTAL_BUCKET).createSignedUrl(data!.storage_path, SIGNED_URL_TTL_SECONDS, preview ? undefined : { download: data!.filename });
  if (error || !signed?.signedUrl) return NextResponse.json({ error: "File not found." }, { status: 404 });
  await writeAudit({ client_account_id: auth.context.account.id, member_id: auth.context.member.id, folder_id: data!.folder_id, auth_user_id: auth.context.user.id, action: preview ? "file_preview" : "file_download", file_id: data!.id, delivery_id: data!.delivery_id, metadata: {} });
  return NextResponse.redirect(signed.signedUrl, 307);
}
