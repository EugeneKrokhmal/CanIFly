import type { MetadataRoute } from "next";
import { getSiteUrl, localePath } from "@/lib/seo";
import { routing } from "@/i18n/routing";

const PATHS = [
  "/",
  "/faq",
  "/guide",
  ...(process.env.VERCEL_ENV === "production" ? [] : (["/landing"] as const)),
  "/contacts",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const path of PATHS) {
    for (const locale of routing.locales) {
      const loc = localePath(locale, path);
      entries.push({
        url: `${base}${loc === "/" ? "" : loc}`,
        lastModified,
        changeFrequency: path === "/" || path === "/guide" ? "daily" : "weekly",
        priority: path === "/" ? 1 : path === "/guide" ? 0.95 : path === "/faq" ? 0.85 : 0.6,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => {
              const p = localePath(l, path);
              return [l, `${base}${p === "/" ? "" : p}`];
            }),
          ),
        },
      });
    }
  }

  return entries;
}
