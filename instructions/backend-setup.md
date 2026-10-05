# Backend setup (new machine, new project or new Cloudflare account)

How to run Map's backend (Hono + Drizzle + Better Auth on Cloudflare Workers with D1 and R2), set it
up on a new computer, start another project from it, or move it to another Cloudflare account. To add
tables, see `adding-a-resource.md`.

## What runs where

One Worker (`map`) serves both the website and the API on the same domain:

```
request ─┬─ /api/*, /images/* → backend/src/index.ts (checkEnv → CORS → CSRF → rate limit → route)
         └─ everything else   → the website, built into app/dist (SPA fallback)
```

The desktop app (Tauri) calls the same API from `tauri://localhost` (Linux/macOS) or
`http://tauri.localhost` (Windows) and signs in with a bearer token (Better Auth `bearer()` plugin;
the token comes in the `set-auth-token` response header).

## Core vs project files

Copy the **core** into a new project; rewrite the **project** files.

| Core (the same everywhere) | Project (per app) |
|---|---|
| `backend/src/lib/*` | `packages/shared/src/app.ts` (`APP_NAME`) |
| `backend/src/middleware/*` | `backend/src/db/schema.ts`, `db/auth-schema.ts` (generated) |
| `backend/better-auth.config.ts` (keep in sync with `auth.ts`) | `backend/src/resources/*` |
| `packages/shared/src/errors.ts`, `pagination.ts`, `common.ts` | `backend/src/auth.ts` (sign-in methods), `emails.ts` (texts) |
| root `package.json` (workspaces) | `backend/src/index.ts` (mounted resources) |
| | `backend/wrangler.jsonc`, `.dev.vars.example` (names, IDs, domains) |

Starting a new project: rename `@map/shared` (in `packages/shared/package.json`, the backend
dependency and all imports) and set `APP_NAME`.

## 1. Install

```
npm install            # at the repo root: installs app + backend + packages/shared together
```

One lockfile and one `node_modules` at the root. A workspace only gets its own `node_modules` for
packages whose version differs (the backend's TypeScript 5.9 vs the app's 6.0). Add packages with
`npm install <pkg> --workspace backend` (or `--workspace app`).

## 2. Configuration: one place per environment

The app name is not configuration: it is `APP_NAME` in `packages/shared/src/app.ts`. Everything that
changes per environment is listed here; the code contains no domains.

| Name | Kind | Production (`wrangler.jsonc` / secret) | Local (`.dev.vars`) |
|---|---|---|---|
| `BETTER_AUTH_URL` | var | `https://map.kopotitore.workers.dev` | `http://localhost:8787` |
| `WEB_ORIGINS` | var | `https://map.kopotitore.workers.dev,tauri://localhost,http://tauri.localhost` | `http://localhost:5173` |
| `IMAGES_URL` | var | `https://images.testingggg.lol` | `http://localhost:8787/images` |
| `IMAGES_FOLDER` | var | `map` | `map` |
| `EMAIL_FROM` | var | `no-reply@testingggg.lol` (address only; the name is `APP_NAME`) | same |
| `APP_SCHEME` | var | empty (set when desktop deep links exist) | empty |
| `BETTER_AUTH_SECRET` | secret | `.secrets.production.json` | its own value (`openssl rand -base64 32`) |
| `RESEND_API_KEY` | secret | `.secrets.production.json` | a Resend key |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | secrets, optional | `.secrets.production.json` | optional; Google is off without both |

| File | In git | Holds |
|---|---|---|
| `backend/wrangler.jsonc` | yes | production domains (`vars`), bindings, IDs |
| `backend/.dev.vars.example` | yes | every name, placeholders only: the template |
| `backend/.dev.vars` | **no** | all local values, domains and secrets together |
| `backend/.secrets.production.json` | **no** | production secrets: `{ "BETTER_AUTH_SECRET": "…", … }` |

- **Local:** `cp backend/.dev.vars.example backend/.dev.vars`, fill it in. Values there override
  `vars`.
- **Production secrets:** fill `backend/.secrets.production.json`, then
  `npm run secrets:production --workspace backend` (uploads all of them in one request). Keep a copy
  in a password manager; the file can be deleted afterwards.
- Every variable is checked by `backend/src/lib/env.ts` on the first request. A missing one answers
  `500 SERVER_MISCONFIGURED` and logs the variable's **name** (never its value).
- After changing `wrangler.jsonc` or `.dev.vars`: `npm run cf-typegen --workspace backend`.
- With `BETTER_AUTH_URL` on localhost the backend treats itself as **development** (`isDev`): the
  local `/images/*` route works only then, and only for keys inside `IMAGES_FOLDER`.

Values that live outside these files: Google OAuth redirect URIs (Google Cloud Console),
`app/src-tauri/tauri.conf.json` (`devUrl`, `productName`, `identifier`), the Vite and Wrangler default
ports (5173, 8787).

## 3. Cloudflare resources

```
npx wrangler login
npx wrangler d1 create map-db               # copy the database_id into wrangler.jsonc
```

- **Images:** the R2 bucket `growme-images` (custom domain `images.testingggg.lol`) is shared with
  GrowMe. Map writes only under `IMAGES_FOLDER` (`map/img/<uuid>.<ext>`); keys are stored in full in
  the database. Bucket-wide settings (lifecycle rules, CORS, the domain) affect both apps.
- **Rate limits:** `namespace_id`s are account-wide. Map uses `2001`/`2002`; GrowMe uses
  `1001`/`1002`.
- **Logs:** `observability` is on: Workers Logs show `cpuTimeMs` per request.
- **compatibility_date** must not be newer than the installed `workerd` supports (`wrangler dev`
  refuses "future" dates).

## 4. Database

```
cd backend
npx @better-auth/cli generate --config better-auth.config.ts --output src/db/auth-schema.ts --yes
npx drizzle-kit generate
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote
```

`better-auth.config.ts` must list the same plugins as `src/auth.ts` (they decide the auth tables).
`bearer()` adds no tables.

**First admin** (every new user gets the role `user`):

```
npx wrangler d1 execute map-db --remote --command "UPDATE user SET role='admin' WHERE email='<your email>'"
```

Roles reach existing sessions within 5 minutes (session cookie cache), or immediately after signing in
again.

## 5. External services

- **Email (Resend):** the domain `testingggg.lol` is verified (shared with GrowMe). Use a separate API
  key per app, so one can be revoked alone. For a production launch, give Map its own sending domain.
- **Google sign-in:** a **Web application** OAuth client named "Map", redirect URIs
  `https://map.kopotitore.workers.dev/api/auth/callback/google` and
  `http://localhost:8787/api/auth/callback/google`.

## 6. Run and deploy

```
npm run dev --workspace app              # website, http://localhost:5173
npm run dev --workspace backend          # API (and app/dist), http://localhost:8787
npm run typecheck --workspace backend
npm run build --workspace app            # the Worker serves app/dist: build before deploying
npm run deploy --workspace backend       # manual deploy
```

**Automatic deploys (Cloudflare Workers Builds):** the build must run from the repo root (workspaces).
In the Worker → Settings → Build: **root directory** `/`, **build command**
`npm run build --workspace app`, **deploy command** `npm run deploy --workspace backend`.
Apply new migrations with `--remote` **before** pushing code that uses them.

## 7. Moving to another Cloudflare account

| Item | Action | Changes in |
|---|---|---|
| Login | `npx wrangler logout`, `npx wrangler login` with the new account | — |
| D1 | old account: `npx wrangler d1 export map-db --remote --output map.sql`; new: `d1 create map-db`, `d1 execute map-db --remote --file map.sql` | `wrangler.jsonc` `database_id` |
| R2 images | copy every object under `map/` to the new bucket **with the same keys** (rclone or Cloudflare's R2 data migration), connect the new image domain | `wrangler.jsonc` `bucket_name`, `IMAGES_URL` |
| Rate limits | ids are per account: `2001`/`2002` can stay | — |
| Secrets | `npm run secrets:production --workspace backend` | — |
| Domains | new `workers.dev` subdomain or a custom domain | `wrangler.jsonc` `vars` (`BETTER_AUTH_URL`, `WEB_ORIGINS`), Google redirect URIs |
| Builds | connect the repo in the new account (settings in §6) | Cloudflare dashboard |

When `BETTER_AUTH_URL`'s domain changes, sessions end once (cookies belong to the old domain). Image
keys and database rows don't change.

## 8. Security defaults included

CSRF protection (untrusted website origins are rejected; the production origin must be in
`WEB_ORIGINS` because browsers send `Origin` on same-site POSTs too), rate limits (strict on sign-in and
email actions), env validation, owner filtering in every repo, image signature checks, one error
format, cookies `SameSite=Lax` (website and API share a site), bearer tokens for the desktop app, and
the local image route limited to development and to this app's folder.
