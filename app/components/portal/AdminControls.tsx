"use client";

import { DragEvent, FormEvent, useMemo, useState } from "react";

type ClientOption = { id: string; company_name: string; contact_name: string; email: string; status: "active" | "disabled" };
type DeliveryOption = { id: string; client_account_id: string; title: string; campaign: string; description: string | null; archived_at: string | null };

async function mutate(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "The request could not be completed.");
  return payload;
}

export function CreateClientForm() {
  const [state, setState] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("Creating…"); const form = new FormData(event.currentTarget);
    try { await mutate("/api/admin/client-delivery/clients", "POST", { companyName: form.get("companyName"), contactName: form.get("contactName"), email: form.get("email"), temporaryPassword: form.get("temporaryPassword") }); setState("Client created securely."); event.currentTarget.reset(); setTimeout(() => window.location.reload(), 500); }
    catch (error) { setState(error instanceof Error ? error.message : "Client creation failed."); }
  }
  return <form className="portal-admin-form" onSubmit={submit}><label>Company name<input name="companyName" required /></label><label>Contact name<input name="contactName" required /></label><label>Email<input name="email" type="email" required /></label><label>Temporary password<input name="temporaryPassword" type="password" minLength={12} required /></label><button className="portal-primary-button" type="submit">Create client</button>{state && <p role="status">{state}</p>}</form>;
}

export function CreateDeliveryForm({ clients }: { clients: ClientOption[] }) {
  const [state, setState] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("Creating…"); const form = new FormData(event.currentTarget);
    try { await mutate("/api/admin/client-delivery/deliveries", "POST", { clientId: form.get("clientId"), title: form.get("title"), campaign: form.get("campaign"), description: form.get("description"), deliveredAt: form.get("deliveredAt") || undefined }); setState("Delivery created."); event.currentTarget.reset(); setTimeout(() => window.location.reload(), 500); }
    catch (error) { setState(error instanceof Error ? error.message : "Delivery creation failed."); }
  }
  return <form className="portal-admin-form" onSubmit={submit}><label>Client<select name="clientId" required defaultValue=""><option value="" disabled>Select client</option>{clients.map(client=><option value={client.id} key={client.id}>{client.company_name}</option>)}</select></label><label>Delivery title<input name="title" required placeholder="Life Insurance"/></label><label>Campaign<input name="campaign" required placeholder="Life Insurance"/></label><label>Delivery date<input name="deliveredAt" type="datetime-local"/></label><label className="portal-admin-wide">Description<textarea name="description" rows={3}/></label><button className="portal-primary-button" type="submit">Create delivery</button>{state && <p role="status">{state}</p>}</form>;
}

export function ClientAccessButton({ client }: { client: ClientOption }) {
  const [pending, setPending] = useState(false);
  async function toggle() { setPending(true); try { await mutate("/api/admin/client-delivery/clients", "PATCH", { clientId: client.id, status: client.status === "active" ? "disabled" : "active" }); window.location.reload(); } catch { setPending(false); } }
  return <button className="portal-secondary-button" type="button" onClick={toggle} disabled={pending}>{pending ? "Updating…" : client.status === "active" ? "Disable access" : "Restore access"}</button>;
}

export function DeliveryActions({ delivery }: { delivery: DeliveryOption }) {
  const [message, setMessage] = useState("");
  async function action(body: unknown) { setMessage("Updating…"); try { await mutate(`/api/admin/client-delivery/deliveries/${delivery.id}`, "PATCH", body); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Update failed."); } }
  async function remove() { if (!window.confirm("Permanently delete this delivery and every stored file? This cannot be undone.")) return; setMessage("Deleting…"); try { await mutate(`/api/admin/client-delivery/deliveries/${delivery.id}`, "DELETE"); window.location.reload(); } catch (error) { setMessage(error instanceof Error ? error.message : "Delete failed."); } }
  async function edit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await action({ title: form.get("title"), campaign: form.get("campaign"), description: form.get("description") }); }
  return <div className="portal-admin-actions"><button className="portal-secondary-button" type="button" onClick={() => action({ action: delivery.archived_at ? "restore" : "archive" })}>{delivery.archived_at ? "Restore" : "Archive"}</button><details><summary>Edit</summary><form className="portal-inline-edit" onSubmit={edit}><label>Title<input name="title" defaultValue={delivery.title}/></label><label>Campaign<input name="campaign" defaultValue={delivery.campaign}/></label><label>Description<textarea name="description" defaultValue={delivery.description || ""}/></label><button className="portal-primary-button">Save</button></form></details><button className="portal-danger-button" type="button" onClick={remove}>Delete</button><button className="portal-muted-button" type="button" disabled title="Email provider will be connected in a future phase">Notify client — coming soon</button>{message && <span role="status">{message}</span>}</div>;
}

export function FileDeleteButton({ fileId }: { fileId: string }) {
  const [pending, setPending] = useState(false);
  async function remove() { if (!window.confirm("Permanently delete this file?")) return; setPending(true); try { await mutate(`/api/admin/client-delivery/files/${fileId}`, "DELETE"); window.location.reload(); } catch { setPending(false); } }
  return <button className="portal-danger-link" type="button" onClick={remove} disabled={pending}>{pending ? "Deleting…" : "Delete"}</button>;
}

export function UploadManager({ clients, deliveries }: { clients: ClientOption[]; deliveries: DeliveryOption[] }) {
  const [clientId, setClientId] = useState("");
  const [deliveryId, setDeliveryId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<{ filename: string; ok: boolean; error?: string }[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const available = useMemo(() => deliveries.filter(delivery => delivery.client_account_id === clientId && !delivery.archived_at), [clientId, deliveries]);
  function accept(incoming: FileList | File[]) { setFiles(Array.from(incoming).slice(0, 20)); setResults([]); setProgress(0); }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); accept(event.dataTransfer.files); }
  function upload(selected = files) {
    if (!clientId || !deliveryId || !selected.length) return;
    setUploading(true); setResults([]); setProgress(0);
    const data = new FormData(); data.set("clientId", clientId); data.set("deliveryId", deliveryId); selected.forEach(file => data.append("files", file));
    const request = new XMLHttpRequest(); request.open("POST", "/api/admin/client-delivery/upload");
    request.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => { const payload = JSON.parse(request.responseText || "{}"); setResults(payload.results || [{ filename: "Upload", ok: false, error: payload.error || "Upload failed." }]); setUploading(false); if (request.status < 300 && !(payload.results || []).some((item: { ok: boolean }) => !item.ok)) setTimeout(() => window.location.reload(), 700); };
    request.onerror = () => { setResults([{ filename: "Upload", ok: false, error: "Network upload failed." }]); setUploading(false); };
    request.send(data);
  }
  const failedFiles = files.filter(file => results.some(result => !result.ok && result.filename === file.name));
  return <section className="portal-upload-manager"><div className="portal-upload-selects"><label>Client<select value={clientId} onChange={event => { setClientId(event.target.value); setDeliveryId(""); }}><option value="">Select client</option>{clients.map(client=><option key={client.id} value={client.id}>{client.company_name}</option>)}</select></label><label>Delivery<select value={deliveryId} onChange={event => setDeliveryId(event.target.value)} disabled={!clientId}><option value="">Select delivery</option>{available.map(delivery=><option key={delivery.id} value={delivery.id}>{delivery.title} — {delivery.campaign}</option>)}</select></label></div><div className="portal-dropzone" onDragOver={event => event.preventDefault()} onDrop={drop}><span aria-hidden="true">⇧</span><strong>Drag and drop delivery files</strong><p>CSV, XLSX, PDF or ZIP · up to 20 files · 50 MB each</p><label className="portal-secondary-button">Choose files<input type="file" multiple accept=".csv,.xlsx,.pdf,.zip" onChange={event => event.target.files && accept(event.target.files)}/></label></div>{files.length > 0 && <ul className="portal-upload-list">{files.map(file=><li key={`${file.name}-${file.size}`}><span>{file.name}</span><small>{(file.size/1024/1024).toFixed(2)} MB</small></li>)}</ul>}{uploading && <div className="portal-progress" aria-label={`Upload ${progress}% complete`}><span style={{width:`${progress}%`}}/></div>}{results.length > 0 && <ul className="portal-upload-results">{results.map(result=><li className={result.ok ? "ok" : "failed"} key={result.filename}>{result.ok ? "✓" : "!"} {result.filename}{result.error ? ` — ${result.error}` : ""}</li>)}</ul>}<div className="portal-upload-actions"><button className="portal-primary-button" type="button" onClick={() => upload()} disabled={uploading || !clientId || !deliveryId || !files.length}>{uploading ? `Uploading ${progress}%` : "Upload files"}</button>{failedFiles.length > 0 && <button className="portal-secondary-button" type="button" onClick={() => upload(failedFiles)} disabled={uploading}>Retry failed files</button>}</div></section>;
}
