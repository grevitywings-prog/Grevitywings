import { LoginForm } from "../../components/portal/AuthForms";
import { hasSupabaseEnvironment } from "../../lib/portal/config";

export const dynamic = "force-dynamic";

const notices: Record<string, string> = {
  disabled: "This client account has been disabled. Please contact Grevitywings.",
  forbidden: "Your account does not have access to this area.",
  "reset-error": "The password reset link is invalid or has expired.",
  setup: "The portal is awaiting its secure Supabase connection.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string; next?: string }> }) {
  const params = await searchParams;
  const notice = params.status ? notices[params.status] : null;
  const configured = hasSupabaseEnvironment();
  return <main className="portal-auth-page"><section className="portal-auth-card"><a href="/" className="portal-auth-brand"><img src="/grevitywings-logo.png" alt="Grevitywings" /></a><div className="portal-auth-lock" aria-hidden="true">◇</div><p className="portal-kicker">Client Delivery Portal</p><h1>Welcome back</h1><p className="portal-auth-intro">Access your private campaign deliveries and authorised files.</p>{notice && <p className="portal-form-alert" role="status">{notice}</p>}{configured ? <LoginForm next={params.next} /> : <p className="portal-setup-note">Add the required Supabase environment variables to enable secure sign-in.</p>}<footer><span>Encrypted session</span><span>Private storage</span><span>Audited access</span></footer></section></main>;
}
