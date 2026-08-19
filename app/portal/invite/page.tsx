import type { Metadata } from "next";
import { InvitePasswordForm } from "../../components/portal/AuthForms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token_hash?: string | string[] }> }) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  return <main className="portal-auth-page"><section className="portal-auth-card"><a href="/" className="portal-auth-brand"><img src="/grevitywings-logo.png" alt="Grevitywings" /></a><p className="portal-kicker">Secure invitation</p><h1>Create your portal password</h1><p className="portal-auth-intro">Complete your invitation to enter your organisation's Grevitywings delivery workspace.</p>{tokenHash ? <InvitePasswordForm tokenHash={tokenHash} /> : <><p className="portal-form-alert" role="alert">This invitation link is incomplete or invalid.</p><a className="portal-text-link" href="/portal/login">Return to secure sign in</a></>}</section></main>;
}
