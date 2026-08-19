export const PORTAL_BUCKET = "client-deliveries";
export const SIGNED_URL_TTL_SECONDS = 60;
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const PORTAL_PAGE_SIZE = 10;

export const ALLOWED_UPLOADS: Record<string, string[]> = {
  ".csv": ["text/csv", "application/csv", "application/vnd.ms-excel", "application/octet-stream"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"],
  ".pdf": ["application/pdf"],
  ".zip": ["application/zip", "application/x-zip-compressed", "application/octet-stream"],
};

export function hasSupabaseEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function getPublicSupabaseEnvironment() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Supabase public environment is not configured");
  return { url, anonKey };
}

export function getServiceSupabaseEnvironment() {
  const { url } = getPublicSupabaseEnvironment();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("Supabase service environment is not configured");
  return { url, serviceRoleKey };
}
