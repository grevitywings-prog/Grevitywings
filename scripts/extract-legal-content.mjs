import { readFileSync, writeFileSync } from "node:fs";

const extract = (name) => {
  const source = readFileSync(`/private/tmp/grevity-live/${name}.html`, "utf8");
  const match = source.match(/<div class="entry-content clear"[^>]*>([\s\S]*?)<\/div><!-- \.entry-content \.clear -->/);
  if (!match) throw new Error(`Could not extract ${name}`);
  return match[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\s(?:data-[\w-]+|itemprop|itemscope|itemtype|style|class|id)=(?:"[^"]*"|'[^']*')/gi, "")
    .trim();
};

const output = `// Generated from the live Grevitywings legal pages. Do not edit manually.\nexport const privacyHtml = ${JSON.stringify(extract("privacy"))};\n\nexport const termsHtml = ${JSON.stringify(extract("terms"))};\n`;
writeFileSync(new URL("../app/content/legal.ts", import.meta.url), output);

const extractMain = (name) => {
  const source = readFileSync(`/private/tmp/grevity-live/${name}.html`, "utf8");
  const match = source.match(/<main[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error(`Could not extract main content for ${name}`);
  return match[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s(?:data-[\w-]+|itemprop|itemscope|itemtype|style|class|id|width|height)=(?:"[^"]*"|'[^']*')/gi, "")
    .replace(/<img\b[^>]*>/gi, "")
    .trim();
};

const legacy = {
  sample: extractMain("sample-page"),
  umoma: extractMain("umoma"),
  blog: extractMain("blog"),
  hello: extractMain("post-hello"),
};
writeFileSync(new URL("../app/content/legacy-html.ts", import.meta.url), `// Generated from the live Grevitywings site.\nexport const legacyHtml = ${JSON.stringify(legacy)} as const;\n`);

const decodeHtml = (value) => value
  .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&").replaceAll("&quot;", '"')
  .replaceAll("&#039;", "'").replaceAll("&nbsp;", " ");
const jobSources = [
  ["job/digital-marketing-executive", "job-1"],
  ["job/digital-marketing-executive-2", "job-2"],
  ["job/digital-marketing-executive-2-2", "job-3"],
  ["job/digital-marketing-executive-2-2-2", "job-4"],
];
const jobRecords = Object.fromEntries(jobSources.map(([slug, file]) => {
  const source = readFileSync(`/private/tmp/grevity-live/${file}.html`, "utf8");
  const scripts = [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const schema = scripts.map((match) => JSON.parse(match[1])).find((item) => item["@type"] === "JobPosting");
  if (!schema) throw new Error(`Could not extract job schema for ${file}`);
  return [slug, { slug, title: schema.title, datePosted: schema.datePosted, descriptionHtml: decodeHtml(schema.description), qualifications: schema.qualifications ?? "", employmentType: schema.employmentType?.[0] ?? "", industry: schema.industry ?? "", location: schema.applicantLocationRequirements?.name ?? (schema.jobLocationType === "TELECOMMUTE" ? "Remote work possible" : ""), workHours: schema.workHours ?? "", action: `/index.php/${slug}/` }];
}));
writeFileSync(new URL("../app/content/jobs.ts", import.meta.url), `// Generated from live JobPosting schema.\nexport const jobRecords = ${JSON.stringify(jobRecords)} as const;\n`);
