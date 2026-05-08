/**
 * CORS for POST /api/crucible/evaluate so browser clients on other NEXUS hosts
 * can call Crucible with preflight. API key auth is unchanged.
 */
export function evaluateCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin) {
    return {};
  }

  const configured = process.env.CRUCIBLE_EVALUATE_CORS_ORIGINS?.trim();
  const list = configured
    ? configured
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : null;

  let allowOrigin: string | null = null;

  if (!list || list.length === 0) {
    allowOrigin = "*";
  } else if (list.includes("*")) {
    allowOrigin = "*";
  } else if (list.includes(origin)) {
    allowOrigin = origin;
  }

  if (!allowOrigin) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, x-bioloop-key",
    "Access-Control-Max-Age": "86400",
    ...(allowOrigin !== "*" ? { Vary: "Origin" } : {}),
  };
}
