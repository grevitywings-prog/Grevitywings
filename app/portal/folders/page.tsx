import { CreateFolderForm } from "../../components/portal/WorkspaceControls";
import { PortalShell } from "../../components/portal/PortalShell";
import { requireClientPage } from "../../lib/portal/auth";
import { createAdminSupabase } from "../../lib/portal/supabase";
import { formatPortalDate } from "../../lib/portal/utils";
import { canCreateFolders, listAccessibleFolders } from "../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export default async function FoldersPage() {
  const { account, member } = await requireClientPage();
  const admin = createAdminSupabase();
  const allFolders = await listAccessibleFolders(member, undefined);
  const folders = allFolders.filter(folder => !folder.parent_folder_id);
  const folderIds = allFolders.map(folder => folder.id);
  const folderMap = new Map(allFolders.map(folder => [folder.id, folder]));
  function rootFolderId(folderId: string | null) {
    let folder = folderId ? folderMap.get(folderId) : undefined;
    while (folder?.parent_folder_id) folder = folderMap.get(folder.parent_folder_id);
    return folder?.id || null;
  }
  const { data: fileRows } = folderIds.length ? await admin.from("client_delivery_files").select("id, folder_id, created_at").in("folder_id", folderIds).is("revoked_at", null).order("created_at", { ascending: false }) : { data: [] };
  const counts = new Map<string, number>();
  const latestByRoot = new Map<string, string>();
  (fileRows || []).forEach(file => { const rootId = rootFolderId(file.folder_id); if (rootId) { counts.set(rootId, (counts.get(rootId) || 0) + 1); if (!latestByRoot.has(rootId)) latestByRoot.set(rootId, file.created_at); } });
  const recentRootId = rootFolderId(fileRows?.[0]?.folder_id || null);
  return <PortalShell clientName={member.display_name} companyName={account.company_name}><main className="portal-content"><header className="portal-page-heading"><div><p className="portal-kicker">Private company workspace</p><h1>Folders</h1><p>Organise deliveries and collaborate securely with your team.</p></div><span className="portal-team-count">{folders.length} folders</span></header>
    {canCreateFolders(member) && <section className="portal-panel portal-folder-create-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">New workspace</p><h2>Create a folder</h2></div><span>Private by design</span></div><CreateFolderForm/></section>}
    <section className="portal-folder-grid">{folders.map(folder => { const isRecent = folder.id === recentRootId; return <a className="portal-folder-card" href={`/portal/folders/${folder.id}`} key={folder.id}><div className="portal-folder-card-top"><span className="portal-folder-icon" aria-hidden="true">▰</span>{isRecent && <span className="portal-recent-badge"><span aria-hidden="true">🔥</span> Recent</span>}</div><h2>{folder.name}</h2><p>{folder.access_scope === "restricted" ? "Selected teammates" : "Entire workspace"}</p><footer><span>{counts.get(folder.id) || 0} files</span><time>{formatPortalDate(latestByRoot.get(folder.id) || folder.updated_at)}</time></footer></a>; })}{!folders.length && <div className="portal-panel portal-empty"><span aria-hidden="true">□</span><h3>No folders yet</h3><p>Create your first workspace folder to start collaborating.</p></div>}</section>
  </main></PortalShell>;
}
