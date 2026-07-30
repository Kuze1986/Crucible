/**
 * Vantage portfolio marketing consumer for Crucible landing copy.
 */

export type VantageProductSlug =
  | "shift"
  | "keystone"
  | "scripta"
  | "demoforge"
  | "crucible"
  | "vantage";

export interface VantageMarketingBrand {
  name: string;
  essence: string;
  captions?: Array<{ tag: string; title: string; body: string }>;
  launch?: {
    eyebrow?: string;
    sqHeadline?: string;
    sqSub?: string;
    liHeadline?: string;
    liSub?: string;
    cta?: string;
    metrics?: Array<{ label: string; value: string; unit?: string; color?: string }>;
  };
  insight?: {
    sqHeadline?: string;
    sqBody?: string;
  };
}

export interface VantageMarketingPack {
  product: VantageProductSlug;
  brand: VantageMarketingBrand;
  pieces: Array<Record<string, unknown>>;
  assets: Array<{ id: string; kind: string; public_url: string }>;
}

function config() {
  const base = (process.env.VANTAGE_API_URL ?? "").replace(/\/$/, "");
  const key = process.env.VANTAGE_SERVICE_KEY?.trim() ?? "";
  return { base, key };
}

export async function getMarketingPack(
  product: VantageProductSlug,
): Promise<VantageMarketingPack | null> {
  const { base, key } = config();
  if (!base || !key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4_000);
  try {
    const res = await fetch(`${base}/v1/marketing/${product}`, {
      headers: {
        Accept: "application/json",
        "x-vantage-key": key,
        ...(process.env.VANTAGE_WORKSPACE_ID
          ? { "x-workspace-id": process.env.VANTAGE_WORKSPACE_ID }
          : {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`[vantage] marketing/${product} → ${res.status}`);
      return null;
    }
    return (await res.json()) as VantageMarketingPack;
  } catch (err) {
    console.warn("[vantage] fetch failed", err instanceof Error ? err.message : err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
