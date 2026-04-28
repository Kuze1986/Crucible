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
  async headers() {
    return [
      {
        source: "/compare",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
      {
        source: "/share/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
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
