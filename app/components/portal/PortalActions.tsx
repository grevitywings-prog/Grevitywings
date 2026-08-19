"use client";

import { useEffect, useState } from "react";

export function DeliveryReadMarker({ deliveryId }: { deliveryId: string }) {
  useEffect(() => { void fetch(`/api/portal/deliveries/${deliveryId}/read`, { method: "POST" }); }, [deliveryId]);
  return null;
}

export function PdfPreview({ fileId, filename }: { fileId: string; filename: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="portal-secondary-button" type="button" onClick={() => setOpen(true)}>Preview</button>
    {open && <div className="portal-preview-backdrop" role="dialog" aria-modal="true" aria-label={`Preview ${filename}`}>
      <div className="portal-preview"><div><strong>{filename}</strong><button type="button" onClick={() => setOpen(false)} aria-label="Close preview">×</button></div><iframe loading="lazy" title={`Preview ${filename}`} src={`/api/portal/files/${fileId}/download?preview=1`} /></div>
    </div>}
  </>;
}

export function Pagination({ page, hasNext, basePath, query = "" }: { page: number; hasNext: boolean; basePath: string; query?: string }) {
  const suffix = query ? `&${query}` : "";
  return <nav className="portal-pagination" aria-label="Pagination">
    {page > 1 ? <a href={`${basePath}?page=${page - 1}${suffix}`}>← Previous</a> : <span />}
    <span>Page {page}</span>
    {hasNext ? <a href={`${basePath}?page=${page + 1}${suffix}`}>Next →</a> : <span />}
  </nav>;
}
