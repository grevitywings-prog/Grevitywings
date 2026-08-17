import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the enterprise homepage", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Welcome to Grevitywings/);
  assert.match(html, /We Work/);
  assert.match(html, /Lead Generation/);
  assert.match(html, /Data Protection Regulations/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|react-loading-skeleton/);
});

for (const [path, expected] of [
  ["/index.php/about-2", "Welcome To Grevitywings Technologies"],
  ["/index.php/privacy-policy-2", "Your right to privacy is important to us"],
  ["/index.php/terms-and-conditions", "The following terms and conditions apply"],
  ["/index.php/job/digital-marketing-executive-2", "UK Agent Representative"],
]) {
  test(`renders ${path}`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(expected));
  });
}
