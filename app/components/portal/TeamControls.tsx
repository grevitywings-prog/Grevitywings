"use client";

import { FormEvent, useState } from "react";
import type { ClientMemberRole, ClientMemberStatus } from "../../lib/portal/types";

async function updateTeam(method: "POST" | "PATCH", body: unknown) {
  const response = await fetch("/api/portal/team", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The team could not be updated.");
  return payload as { message?: string };
}

export function InviteMemberForm({ canInviteManager }: { canInviteManager: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true); setMessage("Sending invitation…");
    try {
      const result = await updateTeam("POST", { displayName: form.get("displayName"), email: form.get("email"), role: form.get("role") });
      formElement.reset(); setMessage(result.message || "Invitation sent.");
      setTimeout(() => window.location.reload(), 700);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Invitation failed."); setPending(false); }
  }
  return <form className="portal-team-invite" onSubmit={submit}>
    <label>Name<input name="displayName" required maxLength={100}/></label>
    <label>Email<input name="email" type="email" required maxLength={254}/></label>
    <label>Role<select name="role" defaultValue="viewer"><option value="viewer">Viewer</option><option value="contributor">Contributor</option>{canInviteManager && <option value="manager">Manager</option>}</select></label>
    <button className="portal-primary-button" type="submit" disabled={pending}>{pending ? "Sending…" : "Invite teammate"}</button>
    {message && <p className="portal-team-message" role="status">{message}</p>}
  </form>;
}

export function MemberControls({ memberId, role, status, canAssignManager }: { memberId: string; role: ClientMemberRole; status: ClientMemberStatus; canAssignManager: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function patch(body: Record<string, unknown>) {
    setPending(true); setMessage("");
    try { await updateTeam("PATCH", { memberId, ...body }); window.location.reload(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); setPending(false); }
  }
  return <div className="portal-member-controls">
    <select aria-label="Member role" value={role} disabled={pending} onChange={event => void patch({ role: event.target.value })}>
      <option value="viewer">Viewer</option><option value="contributor">Contributor</option>{canAssignManager && <option value="manager">Manager</option>}
    </select>
    <button className="portal-secondary-button" type="button" disabled={pending} onClick={() => void patch({ status: status === "disabled" ? "active" : "disabled" })}>{status === "disabled" ? "Restore" : "Disable"}</button>
    {message && <small role="status">{message}</small>}
  </div>;
}
