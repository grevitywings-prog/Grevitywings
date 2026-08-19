"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

export function PortalShell({ children, clientName, companyName, admin = false }: { children: React.ReactNode; clientName: string; companyName?: string; admin?: boolean }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const nav = admin
    ? [["/admin/client-delivery", "Delivery administration"]]
    : [["/portal", "Dashboard"], ["/portal/folders", "Folders"], ["/portal/files", "All files"], ["/portal/team", "Team"]];
  async function logout() {
    setLoggingOut(true);
    await fetch("/api/portal/auth/logout", { method: "POST" });
    window.location.assign("/portal/login");
  }
  return <div className="portal-app">
    <aside className="portal-sidebar">
      <a className="portal-brand" href={admin ? "/admin/client-delivery" : "/portal"}><span className="portal-brand-surface"><img src="/grevitywings-logo.png" alt="Grevitywings" /></span><span className="portal-brand-label">{admin ? "Delivery Admin" : "Client Workspace"}</span></a>
      <nav aria-label={admin ? "Administration" : "Client portal"}>{nav.map(([href,label])=><a key={href} className={pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`)) ? "active" : ""} href={href}><span aria-hidden="true">{href.endsWith("files") ? "▤" : href.endsWith("folders") ? "▰" : href.endsWith("team") ? "◎" : "◫"}</span>{label}</a>)}</nav>
      <div className="portal-security-note"><span aria-hidden="true">◈</span><div><strong>Secure workspace</strong><small>Private, account-scoped delivery access</small></div></div>
    </aside>
    <div className="portal-main">
      <header className="portal-topbar"><div><span className="portal-company">{companyName || "Grevitywings"}</span><strong>{clientName}</strong></div><button type="button" onClick={logout} disabled={loggingOut}>{loggingOut ? "Signing out…" : "Sign out"}</button></header>
      {children}
    </div>
  </div>;
}
