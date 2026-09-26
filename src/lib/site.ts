const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");

export function getSiteOrigin(request?: Request): string {
  if (request) {
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const forwardedProto = request.headers.get("x-forwarded-proto") ?? requestUrl.protocol.replace(":", "");

    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    return requestUrl.origin;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
}

export function getAuthCallbackUrl(origin?: string): string {
  return `${trimTrailingSlash(origin ?? getSiteOrigin())}/auth/callback`;
}

export function getSiteUrl(path = "", origin?: string): string {
  return `${trimTrailingSlash(origin ?? getSiteOrigin())}${path.startsWith("/") ? path : `/${path}`}`;
}
