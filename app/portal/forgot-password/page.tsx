import { ForgotPasswordForm } from "../../components/portal/AuthForms";

export default function ForgotPasswordPage() { return <main className="portal-auth-page"><section className="portal-auth-card"><a href="/" className="portal-auth-brand"><img src="/grevitywings-logo.png" alt="Grevitywings" /></a><p className="portal-kicker">Account recovery</p><h1>Reset your password</h1><p className="portal-auth-intro">Enter the email address assigned to your client account.</p><ForgotPasswordForm /></section></main>; }
