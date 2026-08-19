import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { decideAccountAccess, decideResourceAccess } from "../app/lib/portal/security.ts";

test("rejects unauthenticated portal access", () => {
  assert.deepEqual(decideAccountAccess({ authenticated: false, accountExists: false }), { allowed: false, status: 401 });
});

test("accepts a valid active client account", () => {
  assert.deepEqual(decideAccountAccess({ authenticated: true, accountExists: true, accountStatus: "active" }), { allowed: true, status: 200 });
});

test("rejects disabled and unassigned accounts", () => {
  assert.deepEqual(decideAccountAccess({ authenticated: true, accountExists: true, accountStatus: "disabled" }), { allowed: false, status: 403 });
  assert.deepEqual(decideAccountAccess({ authenticated: true, accountExists: false }), { allowed: false, status: 403 });
});

test("enforces tenant ownership for individual and bulk downloads", () => {
  const valid = { authenticated: true, accountExists: true, accountStatus: "active", resourceExists: true, resourceClientId: "client-a", clientAccountId: "client-a" };
  assert.deepEqual(decideResourceAccess(valid), { allowed: true, status: 200 });
  assert.deepEqual(decideResourceAccess({ ...valid, resourceClientId: "client-b" }), { allowed: false, status: 403 });
  assert.deepEqual(decideResourceAccess({ ...valid, resourceExists: false }), { allowed: false, status: 404 });
  assert.deepEqual(decideResourceAccess({ ...valid, revoked: true }), { allowed: false, status: 410 });
});

test("private storage and database migrations enforce RLS", async () => {
  const database = await readFile(new URL("../supabase/migrations/202608190001_client_delivery_portal.sql", import.meta.url), "utf8");
  const storage = await readFile(new URL("../supabase/migrations/202608190002_private_delivery_storage.sql", import.meta.url), "utf8");
  for (const table of ["client_accounts", "client_deliveries", "client_delivery_files", "client_portal_audit_logs"]) {
    assert.match(database, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(storage, /values \(\s*'client-deliveries',\s*'client-deliveries',\s*false/i);
  assert.match(storage, /storage\.objects/i);
  assert.match(storage, /bucket_id = 'client-deliveries'/i);
});

test("upload and password-reset contracts are present without public registration", async () => {
  const upload = await readFile(new URL("../app/api/admin/client-delivery/upload/route.ts", import.meta.url), "utf8");
  const passwordReset = await readFile(new URL("../app/api/portal/auth/forgot-password/route.ts", import.meta.url), "utf8");
  const authFiles = await Promise.all([
    "../app/api/portal/auth/login/route.ts",
    "../app/api/portal/auth/logout/route.ts",
    "../app/api/portal/auth/update-password/route.ts",
  ].map(path => readFile(new URL(path, import.meta.url), "utf8")));
  assert.match(upload, /form\.getAll\("files"\)/);
  assert.match(upload, /Promise\.all/);
  assert.match(upload, /status: failed \? 207 : 201/);
  assert.match(passwordReset, /resetPasswordForEmail/);
  assert.doesNotMatch([upload, passwordReset, ...authFiles].join("\n"), /signUp\s*\(/);
});

test("download routes use short-lived server-created URLs and never redirect clients", async () => {
  for (const path of [
    "../app/api/portal/files/[fileId]/download/route.ts",
    "../app/api/portal/deliveries/[deliveryId]/download/route.ts",
  ]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /SIGNED_URL_TTL_SECONDS/);
    assert.match(source, /fetch\(/);
    assert.doesNotMatch(source, /NextResponse\.redirect\(.*signed/i);
  }
});
