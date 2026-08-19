import { notFound } from "next/navigation";
import { DeliveryReadMarker, Pagination, PdfPreview } from "../../../components/portal/PortalActions";
import { PortalShell } from "../../../components/portal/PortalShell";
import { requireClientPage } from "../../../lib/portal/auth";
import { PORTAL_PAGE_SIZE } from "../../../lib/portal/config";
import { createAdminSupabase } from "../../../lib/portal/supabase";
import type { ClientDelivery, DeliveryFile } from "../../../lib/portal/types";
import { clampPage, formatFileSize, formatPortalDate } from "../../../lib/portal/utils";
import { getFolderAccess } from "../../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({ params, searchParams }: { params: Promise<{ deliveryId: string }>; searchParams: Promise<{ page?: string; sort?: string; q?: string }> }) {
  const [{ deliveryId }, query, { account, member }] = await Promise.all([params, searchParams, requireClientPage()]);
  const page = clampPage(query.page || null);
  const sort = query.sort === "oldest" ? "oldest" : "newest";
  const search = (query.q || "").trim().slice(0, 80).replace(/[%,()]/g, "");
  const admin = createAdminSupabase();
  const { data: delivery } = await admin.from("client_deliveries").select("*").eq("id", deliveryId).maybeSingle<ClientDelivery>();
  if (!delivery || delivery.client_account_id !== account.id || delivery.archived_at) notFound();
  const { data: folder } = await admin.from("client_folders").select("id").eq("delivery_id", delivery.id).maybeSingle();
  if (!folder || !(await getFolderAccess(folder.id, member))) notFound();
  let filesQuery = admin.from("client_delivery_files").select("*", { count: "exact" }).eq("delivery_id", delivery.id).eq("client_account_id", account.id).is("revoked_at", null);
  if (search) filesQuery = filesQuery.ilike("filename", `%${search}%`);
  const from = (page - 1) * PORTAL_PAGE_SIZE;
  const { data, count } = await filesQuery.order("created_at", { ascending: sort === "oldest" }).range(from, from + PORTAL_PAGE_SIZE - 1);
  const files = (data || []) as DeliveryFile[];
  const queryString = new URLSearchParams({ ...(search ? { q: search } : {}), sort }).toString();
  return <PortalShell clientName={member.display_name} companyName={account.company_name}><DeliveryReadMarker deliveryId={delivery.id}/><main className="portal-content"><a className="portal-back-link" href="/portal">← Back to dashboard</a><header className="portal-page-heading"><div><p className="portal-kicker">{delivery.campaign}</p><h1>{delivery.title}</h1><p>{delivery.description || "Campaign delivery files"} · Delivered {formatPortalDate(delivery.delivered_at)}</p></div><a className="portal-primary-button" href={`/api/portal/deliveries/${delivery.id}/download`}>Download All</a></header>
    <section className="portal-panel"><form className="portal-filter-bar" method="get"><label><span className="sr-only">Search files</span><input type="search" name="q" defaultValue={search} placeholder="Search file name"/></label><label><span className="sr-only">Sort files</span><select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button className="portal-secondary-button" type="submit">Apply</button></form>
      <div className="portal-file-table"><div className="portal-file-row portal-file-head"><span>File</span><span>Uploaded</span><span>Size</span><span>Actions</span></div>{files.map(file => <div className="portal-file-row" key={file.id}><div className="portal-file-name"><span aria-hidden="true">{file.mime_type === "application/pdf" ? "▧" : "▤"}</span><div><strong>{file.filename}</strong><small>{file.mime_type}</small></div></div><time>{formatPortalDate(file.created_at)}</time><span>{formatFileSize(file.file_size)}</span><div className="portal-file-actions">{file.mime_type === "application/pdf" && <PdfPreview fileId={file.id} filename={file.filename}/>}<a className="portal-primary-button" href={`/api/portal/files/${file.id}/download`}>Download</a></div></div>)}{!files.length && <div className="portal-empty"><h3>No matching files</h3><p>Try a different search or contact your Grevitywings account manager.</p></div>}</div>
      <Pagination page={page} hasNext={from + files.length < (count || 0)} basePath={`/portal/deliveries/${delivery.id}`} query={queryString}/>
    </section></main></PortalShell>;
}
