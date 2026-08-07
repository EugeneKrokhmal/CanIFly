import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import {
  countryFromRequestHeaders,
  localeFromCountryCode,
} from "./lib/i18n/preferred-locale";

const handleI18n = createMiddleware(routing);

const LOCALE_COOKIE = "NEXT_LOCALE";

/** True for `/pl`, `/es/contacts`, etc. — including the default locale prefix. */
function pathnameHasLocalePrefix(pathname: string): boolean {
  return routing.locales.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
}

/**
 * Poles (and other non-ES markets) often land on bare canifly.org → default `es`.
 * Only geo-redirect when there is no locale cookie yet, so an explicit Spanish
 * (or any) choice in Settings is never overridden.
 */
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathnameHasLocalePrefix(pathname)) {
    const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
    const geoLocale = localeFromCountryCode(
      countryFromRequestHeaders(request.headers),
    );

    if (!cookie && geoLocale && geoLocale !== routing.defaultLocale) {
      const url = request.nextUrl.clone();
      url.pathname =
        pathname === "/" ? `/${geoLocale}` : `/${geoLocale}${pathname}`;
      const response = NextResponse.redirect(url);
      response.cookies.set(LOCALE_COOKIE, geoLocale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return response;
    }
  }

  return handleI18n(request);
}

export const config = {
  // Skip API, tile proxy, static assets, and Next metadata routes (no file extension).
  matcher: [
    "/((?!api|uploads|ofm|_next|_vercel|opengraph-image|twitter-image|sitemap|robots|icon|apple-icon|.*\\..*).*)",
  ],
};
