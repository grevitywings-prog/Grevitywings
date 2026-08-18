import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const handlerUrl = new URL(
    "../.vercel/output/functions/__server.func/index.mjs",
    import.meta.url,
  );
  handlerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: handler } = await import(handlerUrl.href);
  return handler.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    { waitUntil() {} },
  );
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

const routes = [
  ["/index.php/sample-page", "Sample Page"],
  ["/index.php/the-new-umoma-opens-its-doors-2", "The New UMoMA Opens its Doors"],
  ["/index.php/blog", "Hello world!"],
  ["/index.php/about-2", "Welcome To Grevitywings Technologies"],
  ["/index.php/contact-2", "Contact Us"],
  ["/index.php/privacy-policy-2", "Your right to privacy is important to us"],
  ["/index.php/terms-and-conditions", "The following terms and conditions apply"],
  ["/index.php/gallery", "Checkout Our Latest Team Gallery"],
  ["/index.php/career", "Jobs at Grevitywings"],
  ["/index.php/our-team", "Our Team"],
  ["/index.php/2020/05/23/hello-world", "Welcome to WordPress"],
  ["/index.php/job/digital-marketing-executive", "Digital Marketing Executive"],
  ["/index.php/job/digital-marketing-executive-2", "UK Agent Representative"],
  ["/index.php/job/digital-marketing-executive-2-2", "UK Agent Representative-Kolkata"],
  ["/index.php/job/digital-marketing-executive-2-2-2", "Survey_International Voice Process"],
  ["/index.php/jobs/ground-operations-executive-fresher", "Ground operations executive"],
];

for (const [path, expected] of routes) {
  test(`renders ${path}`, async () => {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(expected));
  });
}

test("preserves canonical redirects", async () => {
  const response = await render("/index.php/about-2/");
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "/index.php/about-2");
});

test("preserves contact and job form destinations", async () => {
  const contactHtml = await (await render("/index.php/contact-2")).text();
  assert.match(
    contactHtml,
    /action="https:\/\/grevitywings\.com\/index\.php\/contact-2\/#wpcf7-f1799-p39-o1"/,
  );

  const jobHtml = await (
    await render("/index.php/job/digital-marketing-executive-2")
  ).text();
  assert.match(
    jobHtml,
    /action="https:\/\/grevitywings\.com\/index\.php\/job\/digital-marketing-executive-2\/"/,
  );
  assert.match(jobHtml, /encType="multipart\/form-data"/);
});

test("emits a complete Vercel Build Output API artifact", async () => {
  const outputConfig = JSON.parse(
    await readFile(new URL("../.vercel/output/config.json", import.meta.url), "utf8"),
  );
  assert.equal(outputConfig.version, 3);
  assert.equal(outputConfig.framework.name, "nitro");
  assert.match(JSON.stringify(outputConfig.routes), /__server/);

  for (const asset of [
    "../.vercel/output/static/grevitywings-logo.png",
    "../.vercel/output/static/og.png",
    "../.vercel/output/static/gallery/01.jpg",
  ]) {
    await access(new URL(asset, import.meta.url));
  }
});
