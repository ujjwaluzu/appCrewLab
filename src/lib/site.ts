const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

function parseTrustedOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.includes("://") ? value : `https://${value}`);
    const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function configuredOrigins(): Set<string> {
  const origins = [
    parseTrustedOrigin(process.env.NEXT_PUBLIC_SITE_URL),
    parseTrustedOrigin(process.env.VERCEL_URL),
    parseTrustedOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL),
  ];
  return new Set(origins.filter((origin): origin is string => Boolean(origin)));
}

/** Resolve callback origins only from the request URL when it matches trusted deployment configuration. */
export function getTrustedSiteOrigin(request: Request): string | null {
  let requestOrigin: string;
  try {
    requestOrigin = new URL(request.url).origin;
  } catch {
    return null;
  }

  if (configuredOrigins().has(requestOrigin)) return requestOrigin;

  if (process.env.NODE_ENV !== "production") {
    const hostname = new URL(requestOrigin).hostname;
    if (["localhost", "127.0.0.1", "[::1]"].includes(hostname)) return requestOrigin;
  }

  return null;
}

export function getSiteOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  const configured = parseTrustedOrigin(process.env.NEXT_PUBLIC_SITE_URL)
    ?? parseTrustedOrigin(process.env.VERCEL_URL)
    ?? parseTrustedOrigin(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  throw new Error("The site origin is not configured.");
}

export function getAuthCallbackUrl(origin?: string): string {
  return `${trimTrailingSlash(origin ?? getSiteOrigin())}/auth/callback`;
}

export function getSiteUrl(path = "", origin?: string): string {
  return `${trimTrailingSlash(origin ?? getSiteOrigin())}${path.startsWith("/") ? path : `/${path}`}`;
}
