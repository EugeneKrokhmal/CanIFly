import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  const privatePaths = ["/account", "/verify-email", "/settings"];
  const disallow = [
    ...privatePaths.flatMap((p) => [
      p,
      ...routing.locales
        .filter((l) => l !== routing.defaultLocale)
        .map((l) => `/${l}${p}`),
    ]),
    "/api/",
    "/uploads/",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
