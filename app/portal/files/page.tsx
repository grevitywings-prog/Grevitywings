import { Pagination, PdfPreview } from "../../components/portal/PortalActions";
import { PortalShell } from "../../components/portal/PortalShell";
import { requireClientPage } from "../../lib/portal/auth";
import { PORTAL_PAGE_SIZE } from "../../lib/portal/config";
import { createAdminSupabase } from "../../lib/portal/supabase";
import { clampPage, formatFileSize, formatPortalDate } from "../../lib/portal/utils";
import { listAccessibleFolders } from "../../lib/portal/workspace";

export const dynamic = "force-dynamic";

type FileWithDelivery = { id: string; folder_id: string; filename: string; mime_type: string; file_size: number; created_at: string; client_deliveries: { title: string; campaign: string; delivered_at: string } | null; client_folders: { name: string } };

export default async function FilesPage({ searchParams }: { searchParams: Promise<{ page?: string; sort?: string; q?: string; folder?: string }> }) {
  const [query, { account, member }] = await Promise.all([searchParams, requireClientPage()]);
  const page = clampPage(query.page || null);
  const sort = query.sort === "oldest" ? "oldest" : "newest";
  const search = (query.q || "").trim().slice(0, 80).replace(/[%,()]/g, "");
  const selectedFolder = (query.folder || "").trim();
  const admin = createAdminSupabase();
  const folders = await listAccessibleFolders(member, undefined);
  const folderIds = folders.map(folder => folder.id);
  const latestResult = folderIds.length ? await admin.from("client_delivery_files").select("id").in("folder_id", folderIds).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle() : { data: null };
  const from = (page - 1) * PORTAL_PAGE_SIZE;
  let data: unknown[] = []; let count = 0;
  if (folderIds.length) {
    let fileQuery = admin.from("client_delivery_files").select("id, folder_id, filename, mime_type, file_size, created_at, client_folders!inner(name), client_deliveries(title, campaign, delivered_at)", { count: "exact" }).eq("client_account_id", account.id).in("folder_id", folderIds).is("revoked_at", null);
    if (search) fileQuery = fileQuery.ilike("filename", `%${search}%`);
    if (selectedFolder && folderIds.includes(selectedFolder)) fileQuery = fileQuery.eq("folder_id", selectedFolder);
    const result = await fileQuery.order("created_at", { ascending: sort === "oldest" }).range(from, from + PORTAL_PAGE_SIZE - 1);
    data = result.data || []; count = result.count || 0;
  }
  const files = (data || []) as unknown as FileWithDelivery[];
  const latestId = latestResult.data?.id || null;
  const queryString = new URLSearchParams({ ...(search ? { q: search } : {}), ...(selectedFolder ? { folder: selectedFolder } : {}), sort }).toString();
  return <PortalShell clientName={member.display_name} companyName={account.company_name}><main className="portal-content"><header className="portal-page-heading"><div><p className="portal-kicker">Authorised files</p><h1>All Files</h1><p>Search and filter every active file assigned to your workspace.</p></div></header><section className="portal-panel"><form className="portal-filter-bar" method="get"><label><span className="sr-only">Search files</span><input type="search" name="q" defaultValue={search} placeholder="Search file name"/></label><label><span className="sr-only">Filter by folder</span><select name="folder" defaultValue={selectedFolder}><option value="">All folders</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label><label><span className="sr-only">Sort files</span><select name="sort" defaultValue={sort}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label><button className="portal-secondary-button" type="submit">Apply</button></form><div className="portal-file-table"><div className="portal-file-row portal-all-files-head"><span>File</span><span>Folder</span><span>Uploaded</span><span>Size</span><span>Actions</span></div>{files.map(file => <div className="portal-file-row portal-all-files-row" key={file.id}><div className="portal-file-name"><span aria-hidden="true">{file.mime_type === "application/pdf" ? "▧" : "▤"}</span><div><strong>{file.filename}</strong><small>{file.mime_type}</small></div>{file.id === latestId && <span className="portal-recent-badge"><span aria-hidden="true">🔥</span> Recent</span>}</div><a className="portal-folder-link" href={`/portal/folders/${file.folder_id}`}>{file.client_folders.name}</a><time>{formatPortalDate(file.created_at)}</time><span>{formatFileSize(file.file_size)}</span><div className="portal-file-actions">{file.mime_type === "application/pdf" && <PdfPreview fileId={file.id} filename={file.filename}/>}<a className="portal-primary-button" href={`/api/portal/files/${file.id}/download`}>Download</a></div></div>)}{!files.length && <div className="portal-empty"><h3>No matching files</h3><p>Try removing a filter or search term.</p></div>}</div><Pagination page={page} hasNext={from + files.length < count} basePath="/portal/files" query={queryString}/></section></main></PortalShell>;
}
