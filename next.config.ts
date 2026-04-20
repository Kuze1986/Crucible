import type { NextConfig } from "next";

const kuzeProxyTarget =
  process.env.KUZE_PROXY_TARGET?.trim().replace(/\/$/, "") ||
  process.env.NEXT_PUBLIC_KUZE_URL?.trim().replace(/\/$/, "") ||
  "https://ai-twin-production.up.railway.app";

const hasHttpProxyTarget = /^https?:\/\//.test(kuzeProxyTarget);

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    if (!hasHttpProxyTarget) {
      return [];
    }

    return [
      {
        source: "/__kuze/:path*",
        destination: `${kuzeProxyTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
