import { headers } from "next/headers";

/**
 * Public absolute origin for callbacks and IdP hints.
 * Prefer NEXT_PUBLIC_APP_URL; otherwise infer from proxy headers (e.g. Railway).
 */
export async function resolvePublicAppUrl(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const host = (h.get("x-forwarded-host") ?? h.get("host"))?.split(",")[0].trim();
  if (host) return `${proto}://${host}`;

  return "";
}
