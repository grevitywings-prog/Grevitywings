"use client";

import { FormEvent, useState } from "react";

async function postJson(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export function LoginForm({ next }: { next?: string }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await postJson("/api/portal/auth/login", { email: form.get("email"), password: form.get("password"), next });
      window.location.assign(result.redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
      setPending(false);
    }
  }
  return <form className="portal-auth-form" onSubmit={submit}>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
    {message && <p className="portal-form-alert" role="alert">{message}</p>}
    <button className="portal-primary-button" type="submit" disabled={pending}>{pending ? "Signing in…" : "Secure sign in"}</button>
    <a className="portal-text-link" href="/portal/forgot-password">Forgot your password?</a>
  </form>;
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage(""); setError(false);
    const form = new FormData(event.currentTarget);
    try {
      const result = await postJson("/api/portal/auth/forgot-password", { email: form.get("email") });
      setMessage(result.message); setPending(false);
    } catch (reason) {
      setError(true); setMessage(reason instanceof Error ? reason.message : "Request failed."); setPending(false);
    }
  }
  return <form className="portal-auth-form" onSubmit={submit}>
    <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
    {message && <p className={error ? "portal-form-alert" : "portal-form-success"} role="status">{message}</p>}
    <button className="portal-primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Send reset instructions"}</button>
    <a className="portal-text-link" href="/portal/login">Back to sign in</a>
  </form>;
}

export function ResetPasswordForm() {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    if (password !== form.get("confirm")) { setMessage("Passwords do not match."); setPending(false); return; }
    try {
      const result = await postJson("/api/portal/auth/update-password", { password });
      window.location.assign(result.redirectTo);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Password update failed."); setPending(false);
    }
  }
  return <form className="portal-auth-form" onSubmit={submit}>
    <label>New password<input name="password" type="password" minLength={12} autoComplete="new-password" required /></label>
    <label>Confirm password<input name="confirm" type="password" minLength={12} autoComplete="new-password" required /></label>
    <p className="portal-help">Use at least 12 characters.</p>
    {message && <p className="portal-form-alert" role="alert">{message}</p>}
    <button className="portal-primary-button" type="submit" disabled={pending}>{pending ? "Updating…" : "Update password"}</button>
  </form>;
}
