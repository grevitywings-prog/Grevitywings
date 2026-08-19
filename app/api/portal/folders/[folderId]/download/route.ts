import { ZipArchive } from "archiver";
import { Readable } from "node:stream";
import { NextResponse, type NextRequest } from "next/server";
import { requireClientApi } from "../../../../../lib/portal/api-auth";
import { writeAudit } from "../../../../../lib/portal/auth";
import { PORTAL_BUCKET, SIGNED_URL_TTL_SECONDS } from "../../../../../lib/portal/config";
import { createAdminSupabase } from "../../../../../lib/portal/supabase";
import type { DeliveryFile } from "../../../../../lib/portal/types";
import { contentDispositionFilename, safeFilename } from "../../../../../lib/portal/utils";
import { getFolderAccess } from "../../../../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ folderId: string }> }) {
  const auth = await requireClientApi(request); if (!auth.ok) return auth.response;
  const { folderId } = await params;
  const access = await getFolderAccess(folderId, auth.context.member);
  if (!access) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  const admin = createAdminSupabase();
  const { data } = await admin.from("client_delivery_files").select("*").eq("folder_id", folderId).eq("client_account_id", auth.context.account.id).is("revoked_at", null).order("created_at");
  const files = (data || []) as DeliveryFile[];
  if (!files.length) return NextResponse.json({ error: "No downloadable files were found." }, { status: 404 });
  const { data: signed, error } = await admin.storage.from(PORTAL_BUCKET).createSignedUrls(files.map(file => file.storage_path), SIGNED_URL_TTL_SECONDS);
  if (error || !signed) return NextResponse.json({ error: "Folder download is temporarily unavailable." }, { status: 500 });
  const upstreams = await Promise.all(signed.map(item => item.signedUrl ? fetch(item.signedUrl, { cache: "no-store" }) : null));
  if (upstreams.some(response => !response?.ok || !response.body)) return NextResponse.json({ error: "One or more folder files are missing." }, { status: 404 });
  const archive = new ZipArchive({ zlib: { level: 1 } });
  const used = new Map<string, number>();
  files.forEach((file, index) => {
    const clean = safeFilename(file.filename); const seen = used.get(clean) || 0; used.set(clean, seen + 1);
    archive.append(Readable.fromWeb(upstreams[index]!.body! as never), { name: seen ? `${seen + 1}-${clean}` : clean });
  });
  void archive.finalize();
  await writeAudit({ client_account_id: auth.context.account.id, member_id: auth.context.member.id, folder_id: folderId, auth_user_id: auth.context.user.id, action: "folder_download", file_id: null, delivery_id: access.folder.delivery_id, metadata: { file_count: files.length } });
  const zipName = `${safeFilename(access.folder.name)}-${access.folder.id.slice(0, 8)}.zip`;
  return new Response(Readable.toWeb(archive) as ReadableStream, { headers: { "content-type": "application/zip", "content-disposition": `attachment; ${contentDispositionFilename(zipName)}`, "cache-control": "private, no-store, max-age=0", "x-content-type-options": "nosniff" } });
}
