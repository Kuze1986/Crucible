import type { NextRequest } from "next/server";

/** Anything with `.get(name)` — `Request.headers`, `next/headers` `headers()`, etc. */
export type HeaderGetter = Pick<Headers, "get">;

/**
 * Public origin for the *current* request (Railway / reverse proxies).
 * Prefer proxy headers over NEXT_PUBLIC_APP_URL so cookies and redirects match the URL
 * the browser actually used (e.g. *.up.railway.app vs a stale custom domain in env).
 */
export function publicOriginFromHeaders(h: HeaderGetter): string | null {
  const xfHost = h.get("x-forwarded-host");
  const rawHost = xfHost ?? h.get("host");
  if (!rawHost) return null;
  const host = rawHost.split(",")[0].trim();

  const rawProto = h.get("x-forwarded-proto");
  let proto = rawProto?.split(",")[0].trim();
  if (!proto) {
    const isLocal =
      host.startsWith("localhost") ||
      host.startsWith("127.0.0.1") ||
      host.endsWith(".local");
    proto = isLocal ? "http" : "https";
  }
  return `${proto}://${host}`;
}

/** Resolve site origin for redirects (auth callback, errors). */
export function getSiteUrl(request: Request | NextRequest): string {
  const h = request.headers;
  const fromHeaders = publicOriginFromHeaders(h);
  if (fromHeaders) return fromHeaders;

  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  return new URL(request.url).origin;
}

/** Allow only same-origin relative paths to avoid open redirects. */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}
