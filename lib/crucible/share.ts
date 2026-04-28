export function buildShareUrl(shareToken: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/share/${shareToken}`;
}

export function buildEmbedUrl(shareToken: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/share/${shareToken}?embed=1`;
}
