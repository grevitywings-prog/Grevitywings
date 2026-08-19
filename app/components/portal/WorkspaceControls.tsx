"use client";

import { FormEvent, useState } from "react";
import type { ClientMember } from "../../lib/portal/types";

async function jsonRequest(url: string, method: string, body: unknown) {
  const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export function CreateFolderForm({ parentFolderId }: { parentFolderId?: string }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const formElement = event.currentTarget; const form = new FormData(formElement); setPending(true); setMessage("Creating folder…");
    try {
      const result = await jsonRequest("/api/portal/folders", "POST", { name: form.get("name"), accessScope: form.get("accessScope"), parentFolderId });
      formElement.reset(); window.location.assign(`/portal/folders/${result.id}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Folder creation failed."); setPending(false); }
  }
  return <form className="portal-folder-create" onSubmit={submit}><label>Folder name<input name="name" required maxLength={120} placeholder="Campaign or project name"/></label><label>Access<select name="accessScope" defaultValue="workspace"><option value="workspace">Entire workspace</option><option value="restricted">Selected teammates</option></select></label><button className="portal-primary-button" type="submit" disabled={pending}>{pending ? "Creating…" : "Create folder"}</button>{message && <p role="status">{message}</p>}</form>;
}

export function FolderUploadManager({ folderId }: { folderId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<{ filename: string; ok: boolean; error?: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  function accept(list: FileList | null) { if (list) { setFiles(Array.from(list).slice(0, 20)); setResults([]); setProgress(0); } }
  function upload() {
    if (!files.length || uploading) return;
    setUploading(true); setResults([]); setProgress(0);
    const data = new FormData(); files.forEach(file => data.append("files", file));
    const request = new XMLHttpRequest(); request.open("POST", `/api/portal/folders/${folderId}/upload`);
    request.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(event.loaded / event.total * 100)); };
    request.onload = () => {
      const payload = JSON.parse(request.responseText || "{}");
      setResults(payload.results || [{ filename: "Upload", ok: false, error: payload.error || "Upload failed." }]); setUploading(false);
      if (request.status < 300 && !(payload.results || []).some((item: { ok: boolean }) => !item.ok)) setTimeout(() => window.location.reload(), 650);
    };
    request.onerror = () => { setResults([{ filename: "Upload", ok: false, error: "Network upload failed." }]); setUploading(false); };
    request.send(data);
  }
  return <div className="portal-folder-upload"><label className="portal-folder-drop"><span aria-hidden="true">⇧</span><strong>Choose files to upload</strong><small>CSV, XLSX, PDF or ZIP · up to 20 files · 50 MB each</small><input type="file" multiple accept=".csv,.xlsx,.pdf,.zip" onChange={event => accept(event.target.files)}/></label>{files.length > 0 && <ul>{files.map(file => <li key={`${file.name}-${file.size}`}><span>{file.name}</span><small>{(file.size / 1024 / 1024).toFixed(2)} MB</small></li>)}</ul>}{uploading && <div className="portal-progress" aria-label={`Upload ${progress}% complete`}><span style={{ width: `${progress}%` }}/></div>}<button className="portal-primary-button" type="button" onClick={upload} disabled={!files.length || uploading}>{uploading ? `Uploading ${progress}%` : "Upload files"}</button>{results.length > 0 && <ul className="portal-upload-results">{results.map(result => <li className={result.ok ? "ok" : "failed"} key={result.filename}>{result.ok ? "✓" : "!"} {result.filename}{result.error ? ` — ${result.error}` : ""}</li>)}</ul>}</div>;
}

type SharedMember = Pick<ClientMember, "id" | "display_name" | "email" | "role" | "status">;
type FolderGrant = { member_id: string; permission: "manager" | "contributor" | "viewer" };

export function FolderSharing({ folderId, accessScope, members, grants }: { folderId: string; accessScope: "workspace" | "restricted"; members: SharedMember[]; grants: FolderGrant[] }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const shared = new Map(grants.map(grant => [grant.member_id, grant.permission]));
  async function changeScope(scope: "workspace" | "restricted") {
    setPending(true); setMessage(""); try { await jsonRequest(`/api/portal/folders/${folderId}`, "PATCH", { accessScope: scope }); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Access could not be updated."); setPending(false); }
  }
  async function share(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); setPending(true); setMessage("");
    try { await jsonRequest(`/api/portal/folders/${folderId}/members`, "POST", { memberId: form.get("memberId"), permission: form.get("permission") }); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Access could not be updated."); setPending(false); }
  }
  async function remove(memberId: string) {
    setPending(true); setMessage(""); try { await jsonRequest(`/api/portal/folders/${folderId}/members`, "DELETE", { memberId }); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Access could not be removed."); setPending(false); }
  }
  const available = members.filter(member => member.role !== "owner" && member.status !== "disabled");
  return <div className="portal-folder-sharing"><div className="portal-scope-toggle"><button type="button" className={accessScope === "workspace" ? "active" : ""} onClick={() => void changeScope("workspace")} disabled={pending}>Entire workspace</button><button type="button" className={accessScope === "restricted" ? "active" : ""} onClick={() => void changeScope("restricted")} disabled={pending}>Selected teammates</button></div>{accessScope === "restricted" && <><form onSubmit={share}><select name="memberId" aria-label="Team member" required defaultValue=""><option value="" disabled>Select teammate</option>{available.map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}</select><select name="permission" aria-label="Folder permission" defaultValue="viewer"><option value="viewer">Viewer</option><option value="contributor">Contributor</option><option value="manager">Manager</option></select><button className="portal-secondary-button" type="submit" disabled={pending}>Share</button></form><ul>{available.filter(member => shared.has(member.id)).map(member => <li key={member.id}><div><strong>{member.display_name}</strong><small>{member.email}</small></div><span>{shared.get(member.id)}</span><button type="button" onClick={() => void remove(member.id)} disabled={pending}>Remove</button></li>)}</ul></>}{message && <p role="status">{message}</p>}</div>;
}
