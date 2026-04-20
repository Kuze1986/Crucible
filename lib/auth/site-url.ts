import type { NextRequest } from "next/server";

/** Prefer configured public URL so redirects match the browser origin (Railway / proxies). */
export function getSiteUrl(request: Request | NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const h = "headers" in request ? request.headers : null;
  const proto = h?.get("x-forwarded-proto") ?? "https";
  const host = h?.get("x-forwarded-host") ?? h?.get("host");
  if (host) return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;

  return new URL(request.url).origin;
}

/** Allow only same-origin relative paths to avoid open redirects. */
export function sanitizeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next || typeof next !== "string") return fallback;
  const t = next.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.includes("://")) return fallback;
  return t;
}
