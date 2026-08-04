import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const apiBase = (process.env.API_URL ?? "http://localhost:4000").replace(
  /\/$/,
  "",
);

const nextConfig: NextConfig = {
  transpilePackages: ["maplibre-gl", "@canifly/middleware"],
  async rewrites() {
    return [
      {
        source: "/ofm/:path*",
        destination: "https://tiles.openfreemap.org/:path*",
      },
      {
        source: "/:locale/ofm/:path*",
        destination: "https://tiles.openfreemap.org/:path*",
      },
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${apiBase}/uploads/:path*`,
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
