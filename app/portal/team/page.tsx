import { InviteMemberForm, MemberControls } from "../../components/portal/TeamControls";
import { PortalShell } from "../../components/portal/PortalShell";
import { requireClientPage } from "../../lib/portal/auth";
import { createAdminSupabase } from "../../lib/portal/supabase";
import type { ClientMember } from "../../lib/portal/types";
import { formatPortalDate } from "../../lib/portal/utils";
import { canManageTeam } from "../../lib/portal/workspace";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const { account, member } = await requireClientPage();
  const admin = createAdminSupabase();
  const { data } = await admin.from("client_account_members").select("*").eq("client_account_id", account.id).order("created_at");
  const members = (data || []) as ClientMember[];
  const managesTeam = canManageTeam(member);
  return <PortalShell clientName={member.display_name} companyName={account.company_name}>
    <main className="portal-content"><header className="portal-page-heading"><div><p className="portal-kicker">Workspace access</p><h1>Your Team</h1><p>Invite teammates and control who can view, contribute to, or manage this workspace.</p></div><span className="portal-team-count">{members.length} members</span></header>
      {managesTeam && <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Invitation only</p><h2>Add a teammate</h2></div><span>Secure email invite</span></div><InviteMemberForm canInviteManager={member.role === "owner"}/></section>}
      <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Company workspace</p><h2>Members</h2></div><span>Individual, auditable access</span></div><div className="portal-team-list">{members.map(item => <article key={item.id} className="portal-member-card"><span className="portal-member-avatar" aria-hidden="true">{item.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{item.display_name}</strong><small>{item.email}</small><time>Joined {formatPortalDate(item.accepted_at || item.invited_at)}</time></div><span className={`portal-member-role role-${item.role}`}>{item.role}</span><span className={item.status === "active" ? "portal-status-active" : item.status === "disabled" ? "portal-status-disabled" : "portal-status-invited"}>{item.status}</span>{managesTeam && item.role !== "owner" ? <MemberControls memberId={item.id} role={item.role} status={item.status} canAssignManager={member.role === "owner"}/> : <span/>}</article>)}</div></section>
    </main>
  </PortalShell>;
}
