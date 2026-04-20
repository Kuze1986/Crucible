import { headers } from "next/headers";

import { publicOriginFromHeaders } from "@/lib/auth/site-url";

/**
 * Public absolute origin for callbacks and IdP hints.
 * Prefer the incoming request host (Railway / proxies), then NEXT_PUBLIC_APP_URL.
 */
export async function resolvePublicAppUrl(): Promise<string> {
  const h = await headers();
  const fromHeaders = publicOriginFromHeaders(h);
  if (fromHeaders) return fromHeaders;

  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}
