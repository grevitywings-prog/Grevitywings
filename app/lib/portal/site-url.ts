const PRODUCTION_SITE_URL = "https://www.grevitywings.com";
const DEVELOPMENT_SITE_URL = "http://localhost:3000";

function normaliseSiteUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS.");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
  }
  if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)) {
    throw new Error("NEXT_PUBLIC_SITE_URL cannot use a local address in production.");
  }
  return url.origin;
}

export function getPortalSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normaliseSiteUrl(configured);
  return process.env.NODE_ENV === "production" ? PRODUCTION_SITE_URL : DEVELOPMENT_SITE_URL;
}

export function getPortalUrl(path: `/${string}`) {
  return new URL(path, `${getPortalSiteUrl()}/`).toString();
}
