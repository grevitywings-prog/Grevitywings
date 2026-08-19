import { ResetPasswordForm } from "../../components/portal/AuthForms";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() { return <main className="portal-auth-page"><section className="portal-auth-card"><a href="/" className="portal-auth-brand"><img src="/grevitywings-logo.png" alt="Grevitywings" /></a><p className="portal-kicker">Secure account</p><h1>Choose a new password</h1><p className="portal-auth-intro">Create a strong password for your Grevitywings delivery portal.</p><ResetPasswordForm /></section></main>; }
