import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API, static assets, and Next metadata routes (no file extension).
  matcher: [
    "/((?!api|uploads|_next|_vercel|opengraph-image|twitter-image|sitemap|robots|icon|apple-icon|.*\\..*).*)",
  ],
};
