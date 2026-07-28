# CanIFly

Modern one-tap UAS airspace status for Spain — Clear / Restricted / Prohibited — filtered by drone class and altitude.

This package is the **Next.js web frontend**. API traffic is proxied to a separate backend via `API_URL`.

## Stack

- Next.js 15 (App Router), React, TypeScript, Tailwind CSS, MapLibre GL 4.x, Zustand
- Shared types & geo helpers: `@canifly/middleware` (`file:../CanIFly-middleware`)
- i18n: `next-intl` with locales **es** (default) and **en** under `app/[locale]`

## Quick start

```bash
# Build shared middleware first (once)
cd ../CanIFly-middleware && npm install && npm run build && cd -

cp .env.example .env
npm install
npm run dev   # http://localhost:3000
```

Set `API_URL` to your CanIFly API (default `http://localhost:4000`). The Next.js config rewrites:

- `/api/:path*` → `$API_URL/api/:path*`
- `/uploads/:path*` → `$API_URL/uploads/:path*`

## Locales

| URL | Locale |
|-----|--------|
| `/`, `/faq`, … | Spanish (`es`, default, no prefix) |
| `/en`, `/en/faq`, … | English |

Toggle **ES | EN** in the header. Messages live in `messages/es.json` and `messages/en.json`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

## Notes

- Coordinates are always **WGS84 (EPSG:4326)**.
- This is **not** an official ENAIRE / AESA product. Always verify with official sources before flying.
