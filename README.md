# CanIFly

**[canifly.org](https://canifly.org)** — one-tap UAS airspace status for **Spain, Czechia and Poland**. Tap the map and get **Clear / Limited / Restricted / Prohibited**, filtered by your drone class and planned altitude (Open category).

Spanish is the default language; English, Polish and Czech are available under `/en`, `/pl`, and `/cs`. CanIFly is **not** an official ENAIRE, ANS CR, PANSA or national CAA product — always cross-check official sources before flying.

---

## Live links

| | URL |
|--|-----|
| **Website** | [https://canifly.org](https://canifly.org) |
| **English** | [https://canifly.org/en](https://canifly.org/en) |
| **API health** | [https://canifly-api.onrender.com/health](https://canifly-api.onrender.com/health) |
| **Guide** | [https://canifly.org/guide](https://canifly.org/guide) |
| **FAQ** | [https://canifly.org/faq](https://canifly.org/faq) |

---

## What the app does

| Capability | Description |
|------------|-------------|
| **Airspace status** | Click any point in ES / CZ / PL; API evaluates overlapping UAS zones against your profile |
| **Zone map layers** | Pink ZGUAS-style fills with severity-colored outlines, filtered by altitude/profile |
| **Drone profile** | Weight class (C0–C2) and AGL altitude drive Open-category ceilings |
| **Community obstacles & fly spots** | Report obstacles or places to fly; photo upload; votes |
| **Live traffic** | Aircraft overlay (OpenSky when reachable; community ADS-B fallback) |
| **Weather** | Point weather for the selected location |
| **Accounts** | Register → email verification → login; profile; public pilot pages |
| **Settings** | Language (ES/EN/PL/CS) and theme |
| **i18n & SEO** | Four locales; sitemap, OG image, JSON-LD |

---

## Production infrastructure

| Piece | Provider | Role |
|-------|----------|------|
| **Web** | [Vercel](https://vercel.com) | Next.js UI |
| **API** | [Render](https://render.com) | Hono + auth, zones, obstacles |
| **Shared package** | GitHub | `@canifly/middleware` |
| **Database** | [Supabase](https://supabase.com) | Postgres + PostGIS (Spain fallback, users, obstacles) |
| **Airspace data** | ENAIRE servAIS (ES), ANS CR aimgis (CZ), PANSA DroneMap (PL) | Live API queries |

Full deploy checklist: **[DEPLOY.md](./DEPLOY.md)**.

### Request path

```
Browser  →  https://canifly.org                 (Vercel / Next.js)
                 └── /api/*  and  /uploads/*   →  Render API
                            ├── Supabase PostGIS (ES fallback, users)
                            ├── ENAIRE servAIS / ANS CR aimgis / PANSA
                            └── Resend, OpenSky, Open-Meteo
```

---

## Repositories

```
Sites/GitHub/
├── CanIFly/                 ← this repo — Next.js web
├── CanIFly-api/             ← Hono API
└── CanIFly-middleware/      ← shared schemas, geo, labels
```

---

## Coordinates & coverage

- Coordinates are **WGS84 (EPSG:4326)**.
- Coverage: **Spain**, **Czechia**, **Poland** via `resolveCountry` / `countriesForBbox` in middleware.

---

## Quick start (local)

```bash
# 1) Shared package
cd ../CanIFly-middleware && npm install && npm run build

# 2) API
cd ../CanIFly-api && cp .env.example .env && npm install && npm run dev

# 3) Web
cd ../CanIFly && cp .env.example .env && npm install && npm run dev
```

### Locales

| URL | Locale |
|-----|--------|
| `/`, `/faq`, … | Spanish (`es`, default) |
| `/en`, `/pl`, `/cs`, … | English, Polish, Czech |

---

## Related docs

- Production deploy: **[DEPLOY.md](./DEPLOY.md)**
- API: [`CanIFly-api` README](https://github.com/EugeneKrokhmal/CanIFly-api)
- Middleware: [`CanIFly-middleware` README](https://github.com/EugeneKrokhmal/CanIFly-middleware)

## Disclaimer

Informational tool only. Verify with official national sources (ENAIRE/AESA, ANS CR/CAA, PANSA/ULC) before any flight.
