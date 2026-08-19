import { redirect } from "next/navigation";
import { createAdminSupabase, createServerSupabase } from "./supabase";
import { hasSupabaseEnvironment } from "./config";
import type { AuditLog, ClientAccount, ClientMember } from "./types";

export type ClientAuthContext = {
  user: { id: string; email?: string };
  account: ClientAccount;
  member: ClientMember;
};

export async function getClientAuthContext(): Promise<
  | { ok: true; context: ClientAuthContext }
  | { ok: false; reason: "setup" | "unauthenticated" | "forbidden" | "disabled" }
> {
  if (!hasSupabaseEnvironment()) return { ok: false, reason: "setup" };
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  const { data: member } = await supabase
    .from("client_account_members")
    .select("*")
    .eq("auth_user_id", user.id)
    .maybeSingle<ClientMember>();
  if (!member) return { ok: false, reason: "forbidden" };
  if (member.status !== "active") return { ok: false, reason: member.status === "disabled" ? "disabled" : "forbidden" };
  const { data: account } = await supabase
    .from("client_accounts")
    .select("*")
    .eq("id", member.client_account_id)
    .maybeSingle<ClientAccount>();
  if (!account) return { ok: false, reason: "forbidden" };
  if (account.status !== "active") return { ok: false, reason: "disabled" };
  return { ok: true, context: { user: { id: user.id, email: user.email }, account, member } };
}

export async function requireClientPage() {
  const result = await getClientAuthContext();
  if (!result.ok) {
    const query = result.reason === "disabled" ? "?status=disabled" : result.reason === "setup" ? "?status=setup" : "";
    redirect(`/portal/login${query}`);
  }
  return result.context;
}

export async function getAdminAuthContext() {
  if (!hasSupabaseEnvironment()) return { ok: false as const, reason: "setup" as const };
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, reason: "unauthenticated" as const };
  const { data: admin } = await supabase
    .from("portal_admins")
    .select("id, display_name, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!admin) return { ok: false as const, reason: "forbidden" as const };
  return { ok: true as const, context: { user, admin } };
}

export async function requireAdminPage() {
  const result = await getAdminAuthContext();
  if (!result.ok) redirect(result.reason === "unauthenticated" ? "/portal/login?next=/admin/client-delivery" : "/portal/login?status=forbidden");
  return result.context;
}

export async function writeAudit(entry: Omit<AuditLog, "id" | "created_at">) {
  if (!hasSupabaseEnvironment()) return;
  const admin = createAdminSupabase();
  await admin.from("client_portal_audit_logs").insert(entry);
}
