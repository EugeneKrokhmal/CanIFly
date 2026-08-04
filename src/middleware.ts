import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip API, tile proxy, static assets, and Next metadata routes (no file extension).
  matcher: [
    "/((?!api|uploads|ofm|_next|_vercel|opengraph-image|twitter-image|sitemap|robots|icon|apple-icon|.*\\..*).*)",
  ],
};
