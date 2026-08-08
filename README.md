# CanIFly

**[canifly.org](https://canifly.org)** — one-tap UAS airspace status for **Europe**. Tap the map and get **Clear / Limited / Restricted / Prohibited**, filtered by your drone class and planned altitude (Open category).

Spanish is the default language; English, German, French, Polish and Czech are available under `/en`, `/de`, `/fr`, `/pl`, and `/cs`. CanIFly is **not** an official ANSP or national CAA product — always cross-check official sources before flying.

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
| **Airspace status** | Click any point in coverage; API evaluates overlapping UAS zones against your profile |
| **Zone map layers** | Pink ZGUAS-style fills with severity-colored outlines, filtered by altitude/profile |
| **Drone profile** | Weight class (C0–C2) and AGL altitude drive Open-category ceilings |
| **Community obstacles & fly spots** | Report obstacles or places to fly; photo upload; votes |
| **Flight tracks** | Sync DJI flight records; altitude-coloured paths on the map; All / Mine filter |
| **Live traffic** | Aircraft overlay toggle (OpenSky when reachable; community ADS-B fallback) |
| **Pilot ranks** | Aviation epaulette ranks (Student → Instructor) from airtime + achievements |
| **Top pilots** | Desktop map stack ranked by effective hours; avatar + rank mark |
| **Weather** | Point weather for the selected location |
| **Accounts** | Register → email verification → login; profile; public pilot pages with badges |
| **Settings** | Language (ES/EN/DE/FR/PL/CS) and theme |
| **i18n & SEO** | Six locales; sitemap, OG image, JSON-LD |

---

## Pilot ranks & achievements

Ranks follow an aviation epaulette ladder (thresholds in **effective hours**):

| Hours (eq.) | Rank | Insignia |
|------------:|------|----------|
| 0–20 | Student Pilot | 1 silver bar |
| 20–40 | Amateur Pilot | 2 silver |
| 40–70 | Private Pilot | 3 silver |
| 70–100 | First Officer | 2 gold |
| 100–140 | Senior First Officer | 3 gold |
| 140–200 | Captain | 4 gold |
| 200–300 | Flight Captain | chevron + star |
| 300–400 | Senior Flight Captain | 2 chevrons + star |
| 400–500 | Commercial Captain | chevron + 2 stars |
| 500+ | Instructor | 2 chevrons + 2 stars |

**Effective hours** = synced airtime + boosts from flights, distance, pins, fly spots, operator number, and **+4 h per earned achievement**. Ladder math lives in `@canifly/middleware` (`computePilotProgress`) so web and API stay aligned.

On the map: Top pilots and flight popups show the epaulette on the **bottom-right of the avatar**. Profile pages show the full rank plate plus achievement epaulettes (not chevrons).

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
└── CanIFly-middleware/      ← shared schemas, geo, labels, pilot ranks
```

---

## Coordinates & coverage

- Coordinates are **WGS84 (EPSG:4326)**.
- Coverage: **Europe** (live country providers via `resolveCountry` / `countriesForBbox` in middleware).

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
| `/en`, `/de`, `/fr`, `/pl`, `/cs`, … | English, German, French, Polish, Czech |

---

## Related docs

- Production deploy: **[DEPLOY.md](./DEPLOY.md)**
- API: [`CanIFly-api` README](https://github.com/EugeneKrokhmal/CanIFly-api)
- Middleware: [`CanIFly-middleware` README](https://github.com/EugeneKrokhmal/CanIFly-middleware)

## Disclaimer

Informational tool only. Verify with official national sources (ENAIRE/AESA, ANS CR/CAA, PANSA/ULC) before any flight.
