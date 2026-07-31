import type { NextConfig } from "next";

const apiUpstream =
  process.env.API_URL?.replace(/\/+$/, "") ||
  `http://127.0.0.1:${process.env.API_PORT ?? 3333}`;

const nextConfig: NextConfig = {
  transpilePackages: ["@xingyu/config"],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        // Same-origin proxy so HttpOnly auth cookies bind to the web origin.
        source: "/api/:path*",
        destination: `${apiUpstream}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
