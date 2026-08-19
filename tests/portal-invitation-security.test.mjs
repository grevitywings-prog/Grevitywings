import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPortalSiteUrl, getPortalUrl } from "../app/lib/portal/site-url.ts";

test("production portal URLs use the canonical HTTPS site and never infer the request origin", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(getPortalSiteUrl(), "https://www.grevitywings.com");
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.grevitywings.com/ignored/path";
    assert.equal(getPortalUrl("/portal/invite"), "https://www.grevitywings.com/portal/invite");
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    assert.throws(() => getPortalSiteUrl(), /cannot use a local address|must use HTTPS/);
  } finally {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("local development retains a localhost portal URL fallback", () => {
  const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = "development";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    assert.equal(getPortalSiteUrl(), "http://localhost:3000");
  } finally {
    if (originalSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  }
});

test("teammate invitations use a fixed canonical setup route and no public signup", async () => {
  const team = await readFile(new URL("../app/api/portal/team/route.ts", import.meta.url), "utf8");
  const forgot = await readFile(new URL("../app/api/portal/auth/forgot-password/route.ts", import.meta.url), "utf8");
  assert.match(team, /getPortalUrl\("\/portal\/invite"\)/);
  assert.match(team, /inviteUserByEmail/);
  assert.doesNotMatch(team, /new URL\(request\.url\)\.origin/);
  assert.doesNotMatch(forgot, /new URL\(request\.url\)\.origin/);
  assert.doesNotMatch(`${team}\n${forgot}`, /signUp\s*\(/);
});

test("invite acceptance verifies TokenHash server-side before password and membership activation", async () => {
  const acceptance = await readFile(new URL("../app/api/portal/auth/accept-invite/route.ts", import.meta.url), "utf8");
  const verifyIndex = acceptance.indexOf("verifyOtp");
  const passwordIndex = acceptance.indexOf("updateUser({ password })");
  const activationIndex = acceptance.indexOf('.update({ status: "active", accepted_at: acceptedAt })');
  assert.ok(verifyIndex >= 0 && passwordIndex > verifyIndex && activationIndex > passwordIndex);
  assert.match(acceptance, /type: "invite"/);
  assert.match(acceptance, /invalid, expired or has already been used/);
});

test("invite acceptance preserves tenant, role and disabled-member isolation", async () => {
  const acceptance = await readFile(new URL("../app/api/portal/auth/accept-invite/route.ts", import.meta.url), "utf8");
  assert.match(acceptance, /member\.status !== "invited"/);
  assert.match(acceptance, /account\.status !== "active"/);
  assert.match(acceptance, /\.eq\("client_account_id", member\.client_account_id\)/);
  assert.match(acceptance, /\.eq\("auth_user_id", verified\.user\.id\)/);
  assert.match(acceptance, /\.eq\("status", "invited"\)/);
  assert.doesNotMatch(acceptance, /update\(\{[^}]*role/s);
  assert.match(acceptance, /metadata: \{ role: member\.role \}/);
});

test("invite flow has no recipient-controlled redirect and callback cannot activate members", async () => {
  const acceptance = await readFile(new URL("../app/api/portal/auth/accept-invite/route.ts", import.meta.url), "utf8");
  const callback = await readFile(new URL("../app/portal/auth/callback/route.ts", import.meta.url), "utf8");
  assert.match(acceptance, /redirectTo: "\/portal"/);
  assert.doesNotMatch(acceptance, /body\?\.next|searchParams\.get\("next"\)/);
  assert.match(callback, /requested === "\/portal\/reset-password"/);
  assert.doesNotMatch(callback, /client_account_members|status: "active"/);
});

test("pending-member resend is tenant scoped and cannot change the stored role", async () => {
  const resend = await readFile(new URL("../app/api/portal/team/[memberId]/resend-invite/route.ts", import.meta.url), "utf8");
  assert.match(resend, /isSameOrigin/);
  assert.match(resend, /requireClientApi/);
  assert.match(resend, /canManageTeam/);
  assert.match(resend, /\.eq\("client_account_id", auth\.context\.account\.id\)/);
  assert.match(resend, /target\.status !== "invited"/);
  assert.match(resend, /getUserById\(target\.auth_user_id\)/);
  assert.match(resend, /authUser\.user\.email\?\.toLowerCase\(\) !== target\.email\.toLowerCase\(\)/);
  assert.match(resend, /resetPasswordForEmail/);
  assert.match(resend, /getPortalUrl\("\/portal\/invite-recovery"\)/);
  assert.doesNotMatch(resend, /update\(\{[^}]*role|insert\(|deleteUser|signUp\s*\(/s);
});

test("recovered invitation activates only after authenticated password creation", async () => {
  const completion = await readFile(new URL("../app/api/portal/auth/complete-invite-recovery/route.ts", import.meta.url), "utf8");
  const verificationIndex = completion.indexOf("verifyOtp");
  const passwordIndex = completion.indexOf("updateUser({ password })");
  const activationIndex = completion.indexOf('.update({ status: "active", accepted_at: acceptedAt })');
  assert.ok(verificationIndex >= 0 && passwordIndex > verificationIndex && activationIndex > passwordIndex);
  assert.match(completion, /type: "recovery"/);
  assert.match(completion, /member\.status !== "invited"/);
  assert.match(completion, /account\.status !== "active"/);
  assert.match(completion, /\.eq\("client_account_id", member\.client_account_id\)/);
  assert.match(completion, /\.eq\("auth_user_id", verified\.user\.id\)/);
  assert.match(completion, /\.eq\("status", "invited"\)/);
  assert.doesNotMatch(completion, /update\(\{[^}]*role/s);
  assert.match(completion, /metadata: \{ role: member\.role \}/);
});

test("hosted invitation template uses Supabase one-time variables", async () => {
  const template = await readFile(new URL("../supabase/templates/invite.html", import.meta.url), "utf8");
  assert.match(template, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}/);
  assert.doesNotMatch(template, /localhost|127\.0\.0\.1/);
});

test("hosted recovery template uses one-time Supabase variables", async () => {
  const template = await readFile(new URL("../supabase/templates/recovery.html", import.meta.url), "utf8");
  assert.match(template, /\{\{ \.RedirectTo \}\}\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
  assert.doesNotMatch(template, /localhost|127\.0\.0\.1/);
});
