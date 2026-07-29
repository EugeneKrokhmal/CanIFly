# CanIFly — cheap go-live

Recommended stack (~€0–5/mo to start):

| Piece | Host | Notes |
|-------|------|--------|
| Web (`CanIFly`) | [Vercel](https://vercel.com) Hobby | Free Next.js |
| API (`CanIFly-api`) | [Render](https://render.com) free web service | Cold starts OK at first |
| PostGIS | [Supabase](https://supabase.com) free | Enable PostGIS extension |
| Email | [Resend](https://resend.com) free | Verification emails |

## 1. Supabase PostGIS

1. Create a project.
2. SQL editor: `create extension if not exists postgis;`
3. Copy the **URI** connection string → `DATABASE_URL` (use the pooler URI if offered; prefer session mode for migrations).
4. Deploy/start the API once so `ensurePostgisSchema()` creates tables.

## 2. Resend (email verification)

1. Create a Resend account.
2. Add and verify your domain (or use `onboarding@resend.dev` only for testing to your own inbox).
3. Create an API key → `RESEND_API_KEY`.
4. Set `MAIL_FROM` to something on your verified domain, e.g. `CanIFly <noreply@canifly.es>`.
5. Set `APP_URL` to the public site origin (same as Vercel URL / custom domain).

## 3. Render API

Create a **Web Service** from `CanIFly-middleware` sibling layout:

- Root: `CanIFly-api` repo
- Build: `npm install`
- Start: `npm run start`
- Env:

```
DATABASE_URL=...
JWT_SECRET=...long random...
ENAIRE_INGEST_SECRET=...long random...
CORS_ORIGIN=https://canifly.es
APP_URL=https://canifly.es
RESEND_API_KEY=re_...
MAIL_FROM=CanIFly <noreply@canifly.es>
OPENSKY_CLIENT_ID=...
OPENSKY_CLIENT_SECRET=...
NODE_ENV=production
PORT=4000
```

Note: Render free tier sleeps. Upgrade later if cold starts annoy users.

Because `@canifly/middleware` is `file:../CanIFly-middleware`, either:

- publish middleware to npm / GitHub Packages, or
- monorepo / vendor a copy on Render, or
- use a Docker build that includes both folders.

## 4. Vercel web

Import `CanIFly` repo.

Env:

```
API_URL=https://your-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://canifly.es
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/bright
```

`next.config.ts` rewrites `/api/*` and `/uploads/*` to `API_URL`, so auth cookies stay first-party on the web domain.

## 5. Smoke test

1. Open the site → Register → check inbox → open verify link → land on `/verify-email` signed in.
2. Log out → log in with same credentials.
3. Unverified login should show “resend verification”.
4. Tap a pilot pin → **View on map** should center that pin (not GPS).
