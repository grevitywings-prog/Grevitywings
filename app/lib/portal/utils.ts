import { ALLOWED_UPLOADS, MAX_UPLOAD_BYTES } from "./config";

export function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 1) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

export function formatPortalDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

export function safeFilename(filename: string) {
  const cleaned = filename.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned.slice(0, 180) || "file";
}

export function contentDispositionFilename(filename: string) {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function validateUpload(file: File) {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  const allowedTypes = ALLOWED_UPLOADS[extension];
  if (!allowedTypes || !allowedTypes.includes(file.type || "application/octet-stream")) {
    return "Only CSV, XLSX, PDF and ZIP files are allowed.";
  }
  if (file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
    return "Files must be between 1 byte and 50 MB.";
  }
  return null;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export function clampPage(value: string | null) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
