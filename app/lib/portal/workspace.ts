import { createAdminSupabase } from "./supabase";
import type { ClientFolder, ClientFolderMember, ClientMember, ClientMemberRole } from "./types";

export type FolderPermission = "manager" | "contributor" | "viewer";

const rolePermission: Record<ClientMemberRole, FolderPermission> = {
  owner: "manager",
  manager: "manager",
  contributor: "contributor",
  viewer: "viewer",
};

export function canManageTeam(member: ClientMember) {
  return member.role === "owner" || member.role === "manager";
}

export function canInviteRole(member: ClientMember, role: ClientMemberRole) {
  if (member.role === "owner") return role !== "owner";
  return member.role === "manager" && (role === "contributor" || role === "viewer");
}

export function canCreateFolders(member: ClientMember) {
  return member.role !== "viewer";
}

export function canContribute(permission: FolderPermission | null) {
  return permission === "manager" || permission === "contributor";
}

export async function getFolderAccess(folderId: string, member: ClientMember) {
  const admin = createAdminSupabase();
  const { data: folder } = await admin.from("client_folders").select("*").eq("id", folderId).maybeSingle<ClientFolder>();
  if (!folder || folder.client_account_id !== member.client_account_id) return null;
  if (member.role === "owner") return { folder, permission: "manager" as const };
  if (folder.access_scope === "workspace") return { folder, permission: rolePermission[member.role] };
  const { data } = await admin.from("client_folder_members").select("permission").eq("folder_id", folder.id).eq("member_id", member.id).maybeSingle<Pick<ClientFolderMember, "permission">>();
  return data ? { folder, permission: data.permission } : null;
}

export async function listAccessibleFolders(member: ClientMember, parentFolderId: string | null | undefined = null) {
  const admin = createAdminSupabase();
  let query = admin.from("client_folders").select("*").eq("client_account_id", member.client_account_id);
  if (parentFolderId !== undefined) query = parentFolderId ? query.eq("parent_folder_id", parentFolderId) : query.is("parent_folder_id", null);
  const { data } = await query.order("updated_at", { ascending: false });
  const folders = (data || []) as ClientFolder[];
  if (member.role === "owner") return folders;
  const restricted = folders.filter(folder => folder.access_scope === "restricted").map(folder => folder.id);
  if (!restricted.length) return folders;
  const { data: permissions } = await admin.from("client_folder_members").select("folder_id").eq("member_id", member.id).in("folder_id", restricted);
  const allowed = new Set((permissions || []).map(row => row.folder_id));
  return folders.filter(folder => folder.access_scope === "workspace" || allowed.has(folder.id));
}
