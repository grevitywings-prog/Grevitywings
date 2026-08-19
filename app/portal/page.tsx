import { PortalShell } from "../components/portal/PortalShell";
import { requireClientPage } from "../lib/portal/auth";
import { createAdminSupabase } from "../lib/portal/supabase";
import { formatPortalDate } from "../lib/portal/utils";
import type { ClientDelivery } from "../lib/portal/types";

export const dynamic = "force-dynamic";

type RecentDelivery = ClientDelivery & { client_delivery_files: { count: number }[] };

export default async function PortalDashboard() {
  const { account } = await requireClientPage();
  const admin = createAdminSupabase();
  const [newResult, filesResult, lastResult, recentResult] = await Promise.all([
    admin.from("client_deliveries").select("id", { count: "exact", head: true }).eq("client_account_id", account.id).is("read_at", null).is("archived_at", null),
    admin.from("client_delivery_files").select("id", { count: "exact", head: true }).eq("client_account_id", account.id).is("revoked_at", null),
    admin.from("client_deliveries").select("delivered_at").eq("client_account_id", account.id).is("archived_at", null).order("delivered_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("client_deliveries").select("*, client_delivery_files(count)").eq("client_account_id", account.id).is("archived_at", null).order("delivered_at", { ascending: false }).limit(5),
  ]);
  const recent = (recentResult.data || []) as RecentDelivery[];
  return <PortalShell clientName={account.contact_name} companyName={account.company_name}>
    <main className="portal-content"><header className="portal-page-heading"><div><p className="portal-kicker">Secure client workspace</p><h1>Welcome, {account.contact_name}</h1><p>Your latest Grevitywings campaign deliveries are ready below.</p></div><a className="portal-secondary-button" href="/portal/files">Browse all files</a></header>
      <section className="portal-stat-grid" aria-label="Delivery summary">
        <article><span>New Deliveries</span><strong>{newResult.count || 0}</strong><small>Awaiting review</small></article>
        <article><span>Total Files</span><strong>{filesResult.count || 0}</strong><small>Available to your account</small></article>
        <article><span>Last Delivery</span><strong className="portal-stat-date">{formatPortalDate(lastResult.data?.delivered_at || null)}</strong><small>Most recent batch</small></article>
        <article><span>Last Login</span><strong className="portal-stat-date">{formatPortalDate(account.last_login_at, true)}</strong><small>Secure session activity</small></article>
      </section>
      <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Delivery activity</p><h2>Recent Deliveries</h2></div><span>{recent.length} recent batches</span></div>
        <div className="portal-delivery-list">{recent.length ? recent.map(delivery => <a className="portal-delivery-card" href={`/portal/deliveries/${delivery.id}`} key={delivery.id}><span className="portal-folder" aria-hidden="true">▰</span><div><span className="portal-campaign">{delivery.campaign}</span><h3>{delivery.title}</h3><p>{delivery.description || "Campaign delivery files"}</p></div><div className="portal-delivery-meta"><span className={!delivery.read_at ? "portal-new-badge" : "portal-read-badge"}>{delivery.read_at ? "Read" : "New"}</span><strong>{delivery.client_delivery_files?.[0]?.count || 0} files</strong><time>{formatPortalDate(delivery.delivered_at)}</time></div></a>) : <div className="portal-empty"><span aria-hidden="true">□</span><h3>No deliveries yet</h3><p>Your authorised campaign files will appear here when Grevitywings publishes them.</p></div>}</div>
      </section>
    </main>
  </PortalShell>;
}
