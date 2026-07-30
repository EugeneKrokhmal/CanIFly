# CanIFly — production deploy guide

Cheap go-live stack for the three GitHub repos:

| Piece | Repo | Host | Live URL (current) |
|-------|------|------|--------------------|
| Web (Next.js) | [`CanIFly`](https://github.com/EugeneKrokhmal/CanIFly) | [Vercel](https://vercel.com) Hobby | `https://canifly.org` |
| API (Hono) | [`CanIFly-api`](https://github.com/EugeneKrokhmal/CanIFly-api) | [Render](https://render.com) free Docker | `https://canifly-api.onrender.com` |
| Shared package | [`CanIFly-middleware`](https://github.com/EugeneKrokhmal/CanIFly-middleware) | GitHub only (dependency) | — |
| PostGIS | — | [Supabase](https://supabase.com) free | pooler in `eu-west-1` |
| Email | — | [Resend](https://resend.com) free | verification mail |
| Domain | — | [Cloudflare Registrar](https://www.cloudflare.com) | `canifly.org` |

Rough cost: **€0–12/yr** for the domain + free tiers elsewhere. Render free tier **sleeps** after idle (cold starts).

---

## Releases & versioning

All three packages share the same semver for a coordinated release (`package.json` + git tag `vX.Y.Z`).

| Version | Tag | Coverage | Notes |
|---------|-----|----------|--------|
| `0.2.0` | `v0.2.0` | Spain + **Poland** | PANSA live API; set `PANSA_API_KEY` on Render |
| `0.1.0` | — | Spain | Initial prod |

**Ship order:** middleware (`dist/` committed) → API → web. Tag each repo after push:

```bash
git tag -a v0.2.0 -m "v0.2.0"
git push origin v0.2.0
```

Changelog: each repo has `CHANGELOG.md`. Bump the three versions together when cutting a release.

**Before Poland works in prod:** add `PANSA_API_KEY` on the Render API service and redeploy.

### Coverage roadmap (investigation only — not in this release)

| Country | Source candidate | Status |
|---------|------------------|--------|
| ES | ENAIRE servAIS / PostGIS | **Live** |
| PL | PANSA DroneMap API | **Live** (0.2.0) |
| NL | PDOK LVNL drone no-fly WMS/WFS | **Retired** (out of production 2026-07-01); look at GoDrone / rijksoverheid |
| DE | dipul / DFS WMS or open data | Investigate |
| CZ | ED-318 style / ANS CR | Investigate |
| FR | DSAC / Géoportail drone | Investigate |

Next country ships only after a durable public (or licensed) feed + accuracy audit — same bar as Poland.

---

## Architecture

```
Browser  →  https://canifly.org          (Vercel / Next.js)
                │
                ├── pages, map UI, i18n
                └── /api/*  and  /uploads/*   rewritten to API_URL
                           │
                           ▼
              https://canifly-api.onrender.com  (Render / Docker)
                           │
                           ├── Supabase PostGIS
                           ├── Resend (verify email)
                           └── OpenSky (optional traffic auth)
```

Auth cookies are set on the **site origin** because the browser only talks to `canifly.org`; Vercel proxies `/api` to Render.

Shared code `@canifly/middleware` is installed from GitHub (`github:EugeneKrokhmal/CanIFly-middleware#main`). The middleware repo commits a built `dist/` so Vercel/Render installs work. The API `Dockerfile` also clones and builds middleware.

---

## Repos checklist before deploy

- [x] Middleware publishes `dist/` and can be installed from GitHub
- [x] API has `Dockerfile` + email verification + OpenSky OAuth support
- [x] Web depends on middleware via GitHub, not `file:../`
- [ ] Production env vars set on Render + Vercel
- [ ] Domain DNS + SSL valid
- [ ] Resend domain verified (for real inbox delivery beyond test)

---

## 1. Supabase (PostGIS)

1. Create project **CanIFly** (free). Prefer an EU region near users (`eu-west-1` is fine).
2. **SQL Editor** → run:

```sql
create extension if not exists postgis;
```

Success looks like: `Success. No rows returned`.

3. **Connect** → copy the **URI**.
   - Pooler host example: `aws-0-eu-west-1.pooler.supabase.com`
   - Port **6543** = transaction pooler; **5432** = session/direct (prefer session if schema bootstrap fails).
4. Build `DATABASE_URL`:

```
postgresql://postgres.<PROJECT_REF>:<PASSWORD>@aws-0-….pooler.supabase.com:6543/postgres?sslmode=require
```

URL-encode special characters in the password (e.g. `!` → `%21`).

5. Tables are created automatically on first API boot via `ensurePostgisSchema()` (users, obstacles, zones, email verification columns, etc.).
6. Existing users created before email verification are marked verified by a one-time SQL update in that bootstrap.

**Do not commit** `DATABASE_URL` or the DB password.

---

## 2. Resend (email verification)

Flow:

1. User registers → API creates unverified user + token → Resend sends link  
2. Link opens `https://canifly.org/verify-email?token=…` → API verifies → session cookie  
3. Login rejected until verified (`EMAIL_NOT_VERIFIED`); UI can resend

Setup:

1. Create account at [resend.com](https://resend.com).
2. Create API key → `RESEND_API_KEY`.
3. **Testing:** `MAIL_FROM=CanIFly <onboarding@resend.dev>` only delivers to **your** Resend account email.
4. **Production inboxes:** Domains → add `canifly.org` → add the DNS records Resend shows (SPF/DKIM) in Cloudflare → then:

```
MAIL_FROM=CanIFly <noreply@canifly.org>
```

5. `APP_URL` must be the public site (`https://canifly.org`) so links in the email are correct.

Without `RESEND_API_KEY`, the API logs the email body to the server console (local/dev only).

---

## 3. Render — API (`CanIFly-api`)

### Create service

1. **New → Web Service**
2. Connect GitHub repo **`EugeneKrokhmal/CanIFly-api`** (not middleware)
3. Settings:
   - **Language:** Docker  
   - **Dockerfile path:** `Dockerfile`  
   - **Branch:** `main`  
   - Region: close to Supabase (e.g. Frankfurt / EU)
4. Paste environment variables (below) → Deploy
5. Health check: `https://<service>.onrender.com/health`  
   Expected: `{"ok":true,"service":"canifly-api"}`

Current production API: **`https://canifly-api.onrender.com`**

### Common mistake

Deploying **`CanIFly-middleware`** fails with `Missing script: "start"`. Middleware is a library only.

### Render env (copy template)

```
DATABASE_URL=postgresql://postgres.<REF>:<PASSWORD_URLENCODED>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET=<openssl rand -base64 32>
ENAIRE_INGEST_SECRET=<openssl rand -base64 32>
RESEND_API_KEY=re_...
MAIL_FROM=CanIFly <onboarding@resend.dev>
CORS_ORIGIN=https://canifly.org
APP_URL=https://canifly.org
NODE_ENV=production
PORT=4000
```

Optional traffic:

```
OPENSKY_CLIENT_ID=...
OPENSKY_CLIENT_SECRET=...
```

Poland UAS zones (PANSA DroneMap) — required for `/api/airspace/status` and `/api/zones/bbox` over Poland:

```
PANSA_API_KEY=...
```

Generate secrets locally:

```bash
openssl rand -base64 32
```

After changing env vars, **Manual Deploy → Clear build cache & deploy** or restart the service.

Free tier notes:

- Service sleeps when idle; first request after sleep is slow.
- Upgrade later if cold starts bother users.

---

## 4. Vercel — web (`CanIFly`)

### Create project

1. Import **`EugeneKrokhmal/CanIFly`**
2. Framework: Next.js (auto)
3. Set env vars (below) **before** or right after first successful build
4. Redeploy after adding/changing env

### Vercel env

```
API_URL=https://canifly-api.onrender.com
NEXT_PUBLIC_SITE_URL=https://canifly.org
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/bright
```

`next.config.ts` rewrites:

- `/api/:path*` → `${API_URL}/api/:path*`
- `/uploads/:path*` → `${API_URL}/uploads/:path*`

So the browser never needs the Render hostname for normal use.

### Middleware dependency

`package.json` uses:

```json
"@canifly/middleware": "github:EugeneKrokhmal/CanIFly-middleware#main"
```

If Vercel fails with `Can't resolve '@canifly/middleware'`:

1. Confirm middleware `main` has committed `dist/`
2. Confirm web `package.json` / lockfile use the GitHub dependency (not `file:../`)
3. Redeploy

Local monorepo tip: for active middleware edits, temporarily `npm install ../CanIFly-middleware`, then switch back to GitHub before push.

---

## 5. Domain — `canifly.org` (Cloudflare → Vercel)

### Cloudflare DNS

| Type | Name | Content | Proxy |
|------|------|---------|--------|
| A | `@` | `76.76.21.21` (or value Vercel shows) | **DNS only** (grey) first |
| CNAME | `www` | `cname.vercel-dns.com` | DNS only |

Use **DNS only** until Vercel SSL shows **Valid**; then you can turn Cloudflare proxy (orange) on if you want, with SSL mode **Full**.

### Vercel Domains

1. Open the **project** `can-i-fly` (not account-level Domains)
2. **Domains** → **Add** / **Connect an existing domain**
3. Add `canifly.org`
4. Optionally add `www.canifly.org` → redirect to apex
5. **Do not** check “Redirect apex → www” if you want bare `canifly.org` as canonical
6. Wait until status is **Valid Configuration**

### After domain is live

Update both:

| Where | Key | Value |
|-------|-----|--------|
| Vercel | `NEXT_PUBLIC_SITE_URL` | `https://canifly.org` |
| Render | `CORS_ORIGIN` | `https://canifly.org` |
| Render | `APP_URL` | `https://canifly.org` |

Redeploy Vercel + restart Render.

SEO / sitemap / OG / verification emails all use these URLs.

---

## Photos / uploads (important)

Render’s disk is **ephemeral**. Files under `./uploads` are wiped on every deploy — DB still has `/uploads/...` paths, so images 404.

**Production:** use Supabase Storage.

1. Supabase → **Storage** → New bucket `canifly-uploads` → enable **Public bucket**
2. Project Settings → API → copy:
   - Project URL → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret)
3. Render env:

```
SUPABASE_URL=https://uszeqnbvxkkoxmbqyisq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=canifly-uploads
```

4. Redeploy API. **New** uploads go to Supabase and survive redeploys. Old `/uploads/...` links stay broken unless you re-upload.

Locally, without those env vars, photos still save to `./uploads` as before.


| Step | Expected |
|------|----------|
| Register | Modal says check email; **no** instant session |
| Inbox | Resend message with “Verify email” |
| Open link | `/verify-email?token=…` → success → signed in |
| Log out / log in | Works with same password |
| Unverified login | Error + **Resend verification email** |
| Legacy DB users | Already verified by bootstrap SQL |

Resend dashboard → **Emails** shows delivery status if something fails.

---

## 7. Smoke test (full)

1. `https://canifly-api.onrender.com/health` → `ok`
2. `https://canifly.org` → map loads (may be slow if Render is cold)
3. Settings → language ES/EN + theme
4. Register → verify → account page
5. Add a pin (obstacle / fly spot) while logged in
6. Pilot public profile → **View on map** centers that pin (not GPS)
7. FAQ / Guide / Contacts / Privacy / sitemap.xml / robots.txt

---

## 8. Local development (unchanged)

```bash
# Terminal 1 — DB
cd CanIFly-api && npm run db:up

# Terminal 2 — API
cd CanIFly-api && cp .env.example .env   # edit secrets
npm run dev                              # :4000

# Terminal 3 — Web
cd CanIFly && cp .env.example .env.local
npm run dev                              # :3000
```

Web `.env.local`:

```
API_URL=http://localhost:4000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_MAP_STYLE=https://tiles.openfreemap.org/styles/bright
```

API `.env` mirrors `.env.example` (`CORS_ORIGIN` / `APP_URL` = `http://localhost:3000`).

---

## 9. Secrets hygiene

- Never commit `.env`, Render/Vercel dashboards only.
- If a password or API key was pasted in chat/email, **rotate** it (Supabase DB password, Resend key, JWT secrets).
- Prefer different `JWT_SECRET` in production vs local.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Vercel: `Can't resolve '@canifly/middleware'` | `file:` dep or missing `dist/` | GitHub dep + middleware `dist` on `main` |
| Render: `Missing script: "start"` | Wrong repo (middleware) | Deploy **CanIFly-api** with Docker |
| Register: no email | Resend test from / domain | Verify domain or check Resend logs; `APP_URL` correct |
| Login CORS / cookie issues | `CORS_ORIGIN` ≠ site | Set to `https://canifly.org`, restart API |
| Verify link wrong host | `APP_URL` wrong | Set Render `APP_URL` to site origin |
| Map empty / API errors after idle | Render sleep | Wait for wake; upgrade plan later |
| DB connection errors | Password encoding / SSL | `%21` for `!`; add `?sslmode=require` |
| Domain SSL pending | Cloudflare orange proxy | Grey cloud (DNS only) until Valid |
| View on map → my GPS | Old deep-link/geolocate race | Fixed on `main`; hard refresh |

---

## 11. Optional next hardening

- [ ] Verify `canifly.org` in Resend; switch `MAIL_FROM` to `noreply@canifly.org`
- [ ] Add OpenSky client id/secret on Render for better traffic limits
- [ ] Custom domain or paid Render if cold starts hurt UX
- [ ] Password reset emails (same Resend path)
- [ ] Rotate any secrets shared during setup
- [ ] Cloudflare proxy + Full SSL once Vercel domain is Valid
- [ ] Monitoring (Vercel Analytics / Render metrics)

---

## Quick reference — current production values

| Item | Value |
|------|--------|
| Site | `https://canifly.org` |
| Vercel preview (example) | `https://can-i-fly-seven.vercel.app` |
| API | `https://canifly-api.onrender.com` |
| API health | `https://canifly-api.onrender.com/health` |
| Domain DNS | Cloudflare |
| DB | Supabase PostGIS (EU pooler) |
| Mail | Resend |

Keep this file updated when URLs or hosts change.
