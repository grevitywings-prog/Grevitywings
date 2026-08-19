import { ClientAccessButton, CreateClientForm, CreateDeliveryForm, DeliveryActions, FileDeleteButton, UploadManager } from "../../components/portal/AdminControls";
import { PortalShell } from "../../components/portal/PortalShell";
import { requireAdminPage } from "../../lib/portal/auth";
import { createAdminSupabase } from "../../lib/portal/supabase";
import { formatFileSize, formatPortalDate } from "../../lib/portal/utils";

export const dynamic = "force-dynamic";

type AdminClient = { id: string; company_name: string; contact_name: string; email: string; status: "active" | "disabled"; created_at: string };
type AdminFile = { id: string; filename: string; file_size: number; mime_type: string };
type AdminDelivery = { id: string; client_account_id: string; title: string; campaign: string; description: string | null; delivered_at: string; archived_at: string | null; notification_status: string; client_accounts: { company_name: string } | null; client_delivery_files: AdminFile[] };
type AdminAudit = { id: string; action: string; created_at: string; metadata: Record<string, unknown>; client_accounts: { company_name: string } | null };

export default async function ClientDeliveryAdminPage() {
  const { user, admin: adminProfile } = await requireAdminPage();
  const supabase = createAdminSupabase();
  const [clientsResult, deliveriesResult, auditResult] = await Promise.all([
    supabase.from("client_accounts").select("id, company_name, contact_name, email, status, created_at").order("company_name"),
    supabase.from("client_deliveries").select("id, client_account_id, title, campaign, description, delivered_at, archived_at, notification_status, client_accounts(company_name), client_delivery_files(id, filename, file_size, mime_type)").order("delivered_at", { ascending: false }).limit(50),
    supabase.from("client_portal_audit_logs").select("id, action, created_at, metadata, client_accounts(company_name)").order("created_at", { ascending: false }).limit(50),
  ]);
  const clients = (clientsResult.data || []) as AdminClient[];
  const deliveries = (deliveriesResult.data || []) as unknown as AdminDelivery[];
  const audit = (auditResult.data || []) as unknown as AdminAudit[];
  return <PortalShell admin clientName={adminProfile.display_name || user.email || "Administrator"}><main className="portal-content portal-admin-content"><header className="portal-page-heading"><div><p className="portal-kicker">Grevitywings operations</p><h1>Client Delivery Administration</h1><p>Create clients, publish deliveries and review secure download activity.</p></div><span className="portal-admin-badge">Administrator</span></header>
    <section className="portal-admin-grid"><article className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Account provisioning</p><h2>Create client</h2></div></div><CreateClientForm/></article><article className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Campaign batch</p><h2>Create delivery</h2></div></div><CreateDeliveryForm clients={clients}/></article></section>
    <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Private storage</p><h2>Upload delivery files</h2></div><span>Independent file results</span></div><UploadManager clients={clients} deliveries={deliveries}/></section>
    <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Client access</p><h2>Clients</h2></div><span>{clients.length} accounts</span></div><div className="portal-admin-table"><div className="portal-admin-row portal-admin-head"><span>Client</span><span>Contact</span><span>Status</span><span>Action</span></div>{clients.map(client=><div className="portal-admin-row" key={client.id}><div><strong>{client.company_name}</strong><small>Created {formatPortalDate(client.created_at)}</small></div><div><span>{client.contact_name}</span><small>{client.email}</small></div><span className={client.status === "active" ? "portal-status-active" : "portal-status-disabled"}>{client.status}</span><ClientAccessButton client={client}/></div>)}</div></section>
    <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Delivery management</p><h2>Deliveries</h2></div><span>{deliveries.length} latest batches</span></div><div className="portal-admin-deliveries">{deliveries.map(delivery=><article key={delivery.id} className={delivery.archived_at ? "archived" : ""}><header><div><span className="portal-campaign">{delivery.client_accounts?.company_name} · {delivery.campaign}</span><h3>{delivery.title}</h3><p>Delivered {formatPortalDate(delivery.delivered_at)} · {delivery.client_delivery_files.length} files {delivery.archived_at ? "· Archived" : ""}</p></div><DeliveryActions delivery={delivery}/></header>{delivery.client_delivery_files.length > 0 && <ul>{delivery.client_delivery_files.map(file=><li key={file.id}><span>{file.filename}</span><small>{formatFileSize(file.file_size)} · {file.mime_type}</small><FileDeleteButton fileId={file.id}/></li>)}</ul>}</article>)}</div></section>
    <section className="portal-panel"><div className="portal-panel-heading"><div><p className="portal-kicker">Security record</p><h2>Download &amp; administration activity</h2></div><span>Latest 50 events</span></div><div className="portal-audit-list">{audit.map(entry=><div key={entry.id}><span className="portal-audit-icon" aria-hidden="true">◎</span><div><strong>{entry.action.replaceAll("_", " ")}</strong><small>{entry.client_accounts?.company_name || "Administration"}</small></div><time>{formatPortalDate(entry.created_at, true)}</time></div>)}</div></section>
  </main></PortalShell>;
}
