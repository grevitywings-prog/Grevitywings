import { notFound } from "next/navigation";
import { PdfPreview } from "../../../components/portal/PortalActions";
import { PortalShell } from "../../../components/portal/PortalShell";
import { CreateFolderForm, FolderSharing, FolderUploadManager } from "../../../components/portal/WorkspaceControls";
import { requireClientPage } from "../../../lib/portal/auth";
import { createAdminSupabase } from "../../../lib/portal/supabase";
import type { ClientFolderMember, ClientMember, DeliveryFile } from "../../../lib/portal/types";
import { formatFileSize, formatPortalDate } from "../../../lib/portal/utils";
import { canContribute, getFolderAccess, listAccessibleFolders } from "../../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export default async function FolderPage({ params }: { params: Promise<{ folderId: string }> }) {
  const [{ folderId }, { account, member }] = await Promise.all([params, requireClientPage()]);
  const access = await getFolderAccess(folderId, member); if (!access) notFound();
  const admin = createAdminSupabase();
  const accessibleFolders = await listAccessibleFolders(member, undefined);
  const accessibleFolderIds = accessibleFolders.map(folder => folder.id);
  const children = accessibleFolders.filter(folder => folder.parent_folder_id === folderId);
  const [filesResult, latestResult, membersResult, grantsResult] = await Promise.all([
    admin.from("client_delivery_files").select("*").eq("folder_id", folderId).eq("client_account_id", account.id).is("revoked_at", null).order("created_at", { ascending: false }),
    accessibleFolderIds.length ? admin.from("client_delivery_files").select("id").in("folder_id", accessibleFolderIds).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    access.permission === "manager" ? admin.from("client_account_members").select("id, display_name, email, role, status").eq("client_account_id", account.id).order("display_name") : Promise.resolve({ data: [] }),
    access.permission === "manager" ? admin.from("client_folder_members").select("member_id, permission").eq("folder_id", folderId) : Promise.resolve({ data: [] }),
  ]);
  const files = (filesResult.data || []) as DeliveryFile[];
  const members = (membersResult.data || []) as Pick<ClientMember, "id" | "display_name" | "email" | "role" | "status">[];
  const grants = (grantsResult.data || []) as Pick<ClientFolderMember, "member_id" | "permission">[];
  return <PortalShell clientName={member.display_name} companyName={account.company_name}><main className="portal-content"><a className="portal-back-link" href={access.folder.parent_folder_id ? `/portal/folders/${access.folder.parent_folder_id}` : "/portal/folders"}>← Back to folders</a><header className="portal-page-heading"><div><p className="portal-kicker">{access.folder.access_scope === "restricted" ? "Restricted folder" : "Workspace folder"}</p><h1>{access.folder.name}</h1><p>{files.length} files · Updated {formatPortalDate(access.folder.updated_at)}</p></div>{files.length > 0 && <a className="portal-primary-button portal-download-all" href={`/api/portal/folders/${folderId}/download`}>Download folder</a>}</header>
    {canContribute(access.permission) && <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Fast upload</p><h2>Add files</h2></div><span>Private storage</span></div><FolderUploadManager folderId={folderId}/></section>}
    {children.length > 0 && <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Organisation</p><h2>Subfolders</h2></div><span>{children.length} folders</span></div><div className="portal-subfolder-grid">{children.map(folder => <a href={`/portal/folders/${folder.id}`} key={folder.id}><span aria-hidden="true">▰</span><strong>{folder.name}</strong></a>)}</div></section>}
    {canContribute(access.permission) && <details className="portal-panel portal-subfolder-create"><summary>Create a subfolder</summary><CreateFolderForm parentFolderId={folderId}/></details>}
    <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Folder contents</p><h2>Files</h2></div><span>Newest first</span></div><div className="portal-file-table"><div className="portal-file-row portal-file-head"><span>File</span><span>Uploaded</span><span>Size</span><span>Actions</span></div>{files.map(file => <div className="portal-file-row" key={file.id}><div className="portal-file-name"><span aria-hidden="true">{file.mime_type === "application/pdf" ? "▧" : "▤"}</span><div><strong>{file.filename}</strong><small>{file.mime_type}</small></div>{file.id === latestResult.data?.id && <span className="portal-recent-badge"><span aria-hidden="true">🔥</span> Recent</span>}</div><time>{formatPortalDate(file.created_at)}</time><span>{formatFileSize(file.file_size)}</span><div className="portal-file-actions">{file.mime_type === "application/pdf" && <PdfPreview fileId={file.id} filename={file.filename}/>}<a className="portal-primary-button" href={`/api/portal/files/${file.id}/download`}>Download</a></div></div>)}{!files.length && <div className="portal-empty"><h3>This folder is empty</h3><p>Upload the first file when it is ready.</p></div>}</div></section>
    {access.permission === "manager" && <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Folder permissions</p><h2>Share securely</h2></div><span>{access.folder.access_scope === "restricted" ? "Selected teammates" : "Entire workspace"}</span></div><FolderSharing folderId={folderId} accessScope={access.folder.access_scope} members={members} grants={grants}/></section>}
  </main></PortalShell>;
}
