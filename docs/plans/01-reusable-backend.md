# 01 — Reusable backend (from the GrowMe template)

**Goal:** turn Map's `backend/` from a single `/api/hello` route into the same reusable structure as
GrowMe's backend: Hono + Drizzle (D1) + Better Auth on Cloudflare Workers, with the core (`lib/`,
`middleware/`) copied from GrowMe, all sign-in methods, the notes + images example resources, and request
contracts in a shared workspace package. The Worker keeps serving the website (`app/dist`) on the same
domain, and the backend also accepts bearer tokens so the Tauri desktop app can sign in later. Every
domain and secret lives in one place per environment, and the app name is one constant, so the setup can
be reused and moved to another Cloudflare account later.

**Source template:** `~/Workspace/Coding/Production/GrowMe` (`backend/`, `packages/shared/`,
`instructions/`, `docs/plans/01-reusable-backend.md`).
**Depends on:** nothing. **Blocks:** a frontend plan (auth pages + API client in `app/`, the app's own
URLs and name usage), a desktop auth plan (Tauri sign-in with bearer + deep links), and replacing
notes/images with Map's own resources.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Plans live in `docs/plans/`, written in English | User |
| D2 | Resources: copy **notes + images** from GrowMe as working examples | User |
| D3 | Sign-in: **everything GrowMe has**: email + password with email verification, password reset, email code (OTP), Google (on only when its keys are set), admin plugin (roles) | User |
| D4 | npm workspaces at the repo root: **`app`, `backend`, `packages/*`**. One root lockfile | User |
| D5 | Add Better Auth's **`bearer()` plugin** now (backend only). Desktop sign-in UI is a later plan | User |
| D6 | **Cache the Better Auth instance per isolate** (`WeakMap`, same pattern as `getEnv`/`getConfig`) instead of building it on every request | User |
| D7 | Worker name `map` in `wrangler.jsonc` (matches `map.kopotitore.workers.dev`) | User |
| D8 | Workers **paid plan** (no 10 ms CPU limit) | User |
| D9 | Shared package name **`@map/shared`** (GrowMe's `@growme/shared` renamed everywhere) | User |
| D10 | Images go in GrowMe's existing R2 bucket **`growme-images`** (custom domain `images.testingggg.lol`) under the folder **`map/`**. No new bucket | User |
| D11 | Config layout: **one file per environment** (§5). Local: everything in `backend/.dev.vars`. Production: domains in `wrangler.jsonc` `vars`, secrets uploaded from one git-ignored file with `wrangler secret bulk`. A committed `backend/.dev.vars.example` lists every name | User |
| D12 | App name is **one constant**, `APP_NAME = 'Map'` in `@map/shared`. It is the same in every environment, so it is a constant and not an env variable | User |
| D13 | The whole setup will later **move to another Cloudflare account** (§10). Nothing may depend on account-specific values outside the config files of D11 | User |
| D14 | Copy core files from GrowMe, with only the changes listed in §6 (auth cache, app name, image folder, email sender) | Default |
| D15 | **No Expo:** drop `@better-auth/expo` and the `expo()` plugin. `APP_SCHEME` stays empty until the desktop deep-link plan | Default |
| D16 | Cookies `sameSite: 'lax'` (GrowMe uses `'none'`). Map's website and API are the same site, and the desktop app uses bearer tokens (D5), so the stricter setting is safe | Default |
| D17 | New, separate D1 database `map-db`; rate-limit namespaces **`2001` / `2002`** (GrowMe uses 1001/1002, which are account-wide) | Default |
| D18 | Same versions as GrowMe's working install: `better-auth` 1.7.7, `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, `zod` 4.6.5, `@hono/zod-validator` 0.9.1, `hono` 4.13.x, `wrangler` 4.147, backend `typescript` 5.9.3 (the app keeps its own ~6.0.2) | Default |
| D19 | Fresh migrations for Map. GrowMe's `drizzle/0000`–`0004` are **not** copied | Default |
| D20 | Turn on Workers Logs (`observability`) to measure CPU time per request (D6) | Default |
| D21 | Remove the demo route `GET /api/hello` | Default |
| D22 | Image keys are stored **with** the folder (`map/img/<uuid>.jpg`). Moving to another bucket then means copying the files with the same keys and changing `IMAGES_URL`; the database stays unchanged | Default |

## 1 — Risks and blockers

1. **Cloudflare Workers Builds settings must change (user, dashboard).** With workspaces the build has
   to run from the repo root: root directory `/`, build command `npm run build --workspace app`,
   deploy command `npm run deploy --workspace backend`. Until this is changed, pushes after task 1 fail
   to build.
2. **Same-site requests still need the production origin in `WEB_ORIGINS`.** Browsers send an `Origin`
   header on same-site POSTs, and `middleware/csrf.ts` rejects origins that aren't listed. Without
   `https://map.kopotitore.workers.dev` in `WEB_ORIGINS`, every sign-in and write on the live site
   answers `403 FORBIDDEN_ORIGIN`.
3. **The bucket is shared with GrowMe (D10).** Bucket-wide settings (lifecycle rules, CORS, public
   access, custom domain) affect both apps. Each app only deletes the keys stored in its own database, so
   one app can't delete the other's files through normal use. The local image route must not expose
   GrowMe's files (§6).
4. **`node_modules` and lockfiles move to the root.** `app/package-lock.json`,
   `backend/package-lock.json`, `backend/pnpm-workspace.yaml` and both per-project `node_modules/` are
   replaced by one root install. Paths that point into `node_modules` must be updated:
   `app/src-tauri/tauri.conf.json` `$schema` and `backend/wrangler.jsonc` `$schema`. `npm run tauri dev`
   must be re-checked after the move.
5. **Secrets come from the user.** `BETTER_AUTH_SECRET` (new, never GrowMe's), `RESEND_API_KEY`,
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. This plan only names them; values never go into files
   that git tracks.
6. **External accounts (user):** a new Google OAuth client for "Map" (redirect URIs in §8). Resend
   reuses GrowMe's verified domain `testingggg.lol`.
7. **Local tests send real emails** through Resend (quota), and the strict rate limit (5/min) applies
   while testing sign-in.
8. **Core files differ slightly from GrowMe** (§6: `env.ts`, `config.ts`, `email.ts`, images key
   folder). Each change is backward compatible in intent (an empty folder = GrowMe's behavior), so
   GrowMe can adopt the same files later. Until then, fixes to the core must be applied in both projects.

## 2 — Architecture

```
Map/
├── package.json                  NEW  workspaces: ["app", "backend", "packages/*"]
├── package-lock.json             NEW  replaces app/ and backend/ lockfiles
├── .gitignore                    NEW  node_modules/, .DS_Store
├── packages/shared/              NEW  @map/shared: zod schemas + types + APP_NAME
│   └── src/ app.ts · errors.ts · pagination.ts · notes.ts · index.ts
├── instructions/                 NEW  backend-setup.md, adding-a-resource.md (adapted)
├── app/                               unchanged code; only tauri.conf.json $schema path
└── backend/
    ├── wrangler.jsonc            CHG  production config: name map, D1, R2, rate limits, vars, observability; keeps assets
    ├── .dev.vars.example         NEW  committed: every variable and secret name, placeholders only
    ├── .dev.vars                 NEW  git-ignored: local values (localhost + local secrets)
    ├── .secrets.production.json  NEW  git-ignored: production secrets, uploaded with `wrangler secret bulk`
    ├── better-auth.config.ts     NEW  CLI-only config: admin(), emailOTP(), bearer()
    ├── drizzle.config.ts         NEW  copied
    ├── drizzle/                  NEW  Map's own migrations
    ├── worker-configuration.d.ts NEW  generated by cf-typegen
    └── src/
        ├── index.ts              CHG  GrowMe's index.ts, adapted (§6)
        ├── auth.ts               NEW  GrowMe's auth.ts minus expo, plus bearer, cached (D6)
        ├── emails.ts             NEW  copied
        ├── db/                   NEW  index.ts, schema.ts (notes, images, note_images), auth-schema.ts (generated)
        ├── lib/                  NEW  CORE, copied (env/config/email changed, §6)
        ├── middleware/           NEW  CORE, copied
        └── resources/            NEW  notes/, images/ copied (images key folder, §6)
```

Request flow (same as GrowMe). Only `/api/*` and `/images/*` reach the Worker code; every other path
is answered by the static assets (`app/dist`, SPA fallback):

```
request ─┬─ /api/*, /images/* → checkEnv → CORS → CSRF → rate limit → route → onError
         └─ everything else   → static assets (app/dist)
```

## 3 — Workspace and shared package

- **Root `package.json`:** `"name": "map-workspace"`, `"private": true`,
  `"workspaces": ["app", "backend", "packages/*"]`.
- **Root `.gitignore`:** `node_modules/`, `.DS_Store` (as GrowMe's root `.gitignore`).
- **Delete:** `app/package-lock.json`, `backend/package-lock.json`, `backend/pnpm-workspace.yaml`,
  `app/node_modules/`, `backend/node_modules/`. Then `npm install` once at the root.
- **`packages/shared/`:** copy GrowMe's `package.json`, `tsconfig.json` and `src/*`. Rename
  `@growme/shared` → `@map/shared` in its `package.json`, in `backend/package.json` and in every import
  (`lib/crud.ts`, `lib/errors.ts`, `lib/pagination.ts`, `resources/notes/*`).
- **New `packages/shared/src/app.ts`:** `export const APP_NAME = 'Map'` (D12), exported from
  `index.ts`. The only place the display name is written in code.
- **Path fixes:** `app/src-tauri/tauri.conf.json` `$schema` →
  `../../node_modules/@tauri-apps/cli/config.schema.json`; `backend/wrangler.jsonc` `$schema` →
  `../node_modules/wrangler/config-schema.json`.
- **`backend/tsconfig.json`:** copy GrowMe's, including `"types": []`. This matters more now: the app's
  React and Node types are hoisted into the root `node_modules`, and without it they leak into the
  Worker's type check.

## 4 — Packages

Installed from the repo root (`--workspace backend`), versions per D18:

| Kind | Packages |
|---|---|
| dependencies | `hono`, `better-auth`, `drizzle-orm`, `zod`, `@hono/zod-validator`, `@map/shared` (`"*"`) |
| devDependencies | `wrangler`, `drizzle-kit`, `typescript` |
| **not** installed | `@better-auth/expo` (D15) |

`backend/package.json` scripts: GrowMe's (`dev`, `deploy`, `cf-typegen`, `typecheck`), plus
`"secrets:production": "wrangler secret bulk .secrets.production.json"`. `app/` gets no new packages in
this plan.

## 5 — Configuration: one place per environment (D11)

### Inventory: every domain, localhost and secret

| Name | Kind | Production value (in `wrangler.jsonc` or secret) | Local value (in `.dev.vars`) |
|---|---|---|---|
| `BETTER_AUTH_URL` | var | `https://map.kopotitore.workers.dev` | `http://localhost:8787` |
| `WEB_ORIGINS` | var | `https://map.kopotitore.workers.dev,tauri://localhost,http://tauri.localhost` | `http://localhost:5173` |
| `IMAGES_URL` | var | `https://images.testingggg.lol` | `http://localhost:8787/images` |
| `IMAGES_FOLDER` | var | `map` | `map` |
| `EMAIL_FROM` | var | `no-reply@testingggg.lol` (address only; the name comes from `APP_NAME`) | same |
| `APP_SCHEME` | var | empty | empty |
| `BETTER_AUTH_SECRET` | secret | in `.secrets.production.json` | its own local value |
| `RESEND_API_KEY` | secret | in `.secrets.production.json` | same or a separate key |
| `GOOGLE_CLIENT_ID` | secret, optional | in `.secrets.production.json` | optional |
| `GOOGLE_CLIENT_SECRET` | secret, optional | in `.secrets.production.json` | optional |

`tauri://localhost` is the desktop app's origin on Linux/macOS, `http://tauri.localhost` on Windows.

**Values that can't come from these files** (documented, not moved):
- Google OAuth redirect URIs: entered in Google Cloud Console (§8).
- `app/src-tauri/tauri.conf.json` `devUrl` (`http://localhost:5173`): JSON read by the Tauri CLI.
- Ports `5173` (Vite) and `8787` (`wrangler dev`): tool defaults.
- The app's own URLs (download link, desktop API URL): frontend plan.

### Files

- **`backend/wrangler.jsonc`** (committed): production non-secret values in `vars`. One place for every
  production domain.
- **`backend/.dev.vars`** (git-ignored, already in `backend/.gitignore`): **all** local values in one
  file, domains and secrets together. Overrides `vars` when running `wrangler dev`.
- **`backend/.dev.vars.example`** (committed): every name from the inventory, with placeholders and a
  one-line comment each. New project or new machine: copy to `.dev.vars` and fill in.
- **`backend/.secrets.production.json`** (git-ignored; add to `backend/.gitignore`): the four production
  secrets. Uploaded in one step with `npm run secrets:production`. Keep a copy in a password manager;
  the file itself can be deleted after upload.
- After every change to `wrangler.jsonc` or `.dev.vars`: `npm run cf-typegen --workspace backend`.

### `backend/wrangler.jsonc`

Merge GrowMe's bindings into Map's file. **Keep Map's `assets` block**, with one addition:

```jsonc
{
  "$schema": "../node_modules/wrangler/config-schema.json",
  "name": "map",
  "main": "src/index.ts",
  "compatibility_date": "<today>",
  "assets": {
    "directory": "../app/dist",
    "not_found_handling": "single-page-application",
    "run_worker_first": ["/api/*", "/images/*"]   // /images/* added: local image serving
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "map-db", "database_id": "<from d1 create>", "migrations_dir": "drizzle" }
  ],
  "r2_buckets": [{ "binding": "BUCKET", "bucket_name": "growme-images" }],
  "ratelimits": [
    { "name": "AUTH_STRICT", "namespace_id": "2001", "simple": { "limit": 5, "period": 60 } },
    { "name": "API_GENERAL", "namespace_id": "2002", "simple": { "limit": 120, "period": 60 } }
  ],
  "observability": { "enabled": true },
  "vars": {
    "APP_SCHEME": "",
    "WEB_ORIGINS": "https://map.kopotitore.workers.dev,tauri://localhost,http://tauri.localhost",
    "IMAGES_URL": "https://images.testingggg.lol",
    "IMAGES_FOLDER": "map",
    "BETTER_AUTH_URL": "https://map.kopotitore.workers.dev",
    "EMAIL_FROM": "no-reply@testingggg.lol"
  }
}
```

## 6 — Backend code

**Copied unchanged:** `lib/crud.ts`, `pagination.ts`, `relations.ts`, `errors.ts`, `validate.ts`,
`image-type.ts`, `middleware/*`, `emails.ts`, `db/index.ts`, `resources/notes/*`,
`resources/images/images.repo.ts`, `drizzle.config.ts`. Only the `@map/shared` import rename applies.

**Core files with small changes:**
- **`lib/env.ts`:** remove `APP_NAME` (D12). Add `IMAGES_FOLDER` as optional text (empty = files at the
  bucket root, GrowMe's behavior). `EMAIL_FROM` validated as an email address (`z.email()`).
- **`lib/config.ts`:** `appName: APP_NAME` imported from `@map/shared` instead of the env. Add
  `imagesFolder` (from `IMAGES_FOLDER`, without slashes). Everything else unchanged, including the
  harmless `exp://` dev entry.
- **`lib/email.ts`:** sender becomes `` `${config.appName} <${env.EMAIL_FROM}>` `` (via `getConfig`), so
  the name in the inbox comes from `APP_NAME`.
- **`resources/images/images.routes.ts`:** keys become
  `` `${imagesFolder}/img/${uuid}.${ext}` `` (just `img/...` when the folder is empty). The full key is
  stored in the database (D22).

**`src/auth.ts`** (GrowMe's, changed):
- Remove the `expo` import and the `...(config.appScheme ? [expo()] : [])` line (D15).
- Add `bearer()` from `better-auth/plugins` to `plugins` (D5).
- `advanced.defaultCookieAttributes`: `{ sameSite: 'lax', secure: true }` (D16).
- **Cache (D6):** keep the `createAuth(env)` signature, but return the instance from a module-level
  `WeakMap<object, Auth>` keyed by `env`, built on first use. Same pattern as `getEnv` in
  `lib/env.ts`. Callers (`middleware/auth.ts`, `index.ts`) don't change.

**`better-auth.config.ts`:** GrowMe's, with `expo()` removed and `bearer()` added, so the plugin list
matches `auth.ts`.

**`src/index.ts`** (GrowMe's, adapted):
- Remove `app.get('/')`. `/` is served by the assets.
- In `cors(...)`, add `exposeHeaders: ['set-auth-token']`. The bearer plugin returns the session token
  in that header, and a cross-origin client (the desktop app) can only read it if CORS exposes it.
- **`/images/*` route:** answer `404` unless `config.isDev` **and** the key starts with
  `config.imagesFolder + '/'`. Production images are served by `images.testingggg.lol`, and the
  Worker must never serve GrowMe's files from the shared bucket.
- Everything else as GrowMe: `checkEnv`, CORS from `config.webOrigins`, `csrfProtection`, `rateLimit`,
  `/api/auth/*` → Better Auth, `/api/notes`, `/api/images`, `notFound`, `onError`.
- After this plan, `backend/src/` contains **no hardcoded domain**: today's CORS list in `index.ts` is
  replaced by `WEB_ORIGINS`.

## 7 — Database

1. `npx wrangler d1 create map-db` → put the printed `database_id` in `wrangler.jsonc`.
2. Generate the auth tables:
   `npx @better-auth/cli generate --config better-auth.config.ts --output src/db/auth-schema.ts --yes`.
3. Copy `db/schema.ts` (notes, images, note_images, relations). It re-exports `auth-schema.ts`.
4. `npx drizzle-kit generate` → `drizzle/0000_*.sql`. Read the SQL.
5. Apply: `npx wrangler d1 migrations apply map-db --local`, then `--remote`.
6. **User:** after signing up, promote your account:
   `npx wrangler d1 execute map-db --remote --command "UPDATE user SET role='admin' WHERE email='<your email>'"`.

No R2 step: the bucket `growme-images` and its domain already exist (D10).

## 8 — External services (user tasks)

- **Secrets:** fill `backend/.secrets.production.json` (`BETTER_AUTH_SECRET` from
  `openssl rand -base64 32`, `RESEND_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), run
  `npm run secrets:production --workspace backend`. Fill `backend/.dev.vars` from the example.
- **Google:** new OAuth client (type *Web application*, name "Map"). Redirect URIs:
  `https://map.kopotitore.workers.dev/api/auth/callback/google` and
  `http://localhost:8787/api/auth/callback/google`.
- **Resend:** reuse the verified `testingggg.lol` domain (no DNS changes). A separate API key for Map
  is recommended, so it can be revoked without affecting GrowMe.
- **Workers Builds:** settings from §1 risk 1.

## 9 — Documentation

- Copy GrowMe's `instructions/backend-setup.md` and `instructions/adding-a-resource.md` to
  `Map/instructions/`. Adapt: `@map/shared` and `APP_NAME`, the config layout of §5 (inventory, files,
  `secrets:production`), the assets block and `run_worker_first`, `IMAGES_FOLDER`, the Tauri origins,
  the bearer plugin, the auth cache, Workers Builds commands from §1, and the move checklist of §10.
- Replace `backend/README.md` (Hono template text) with GrowMe's short README pointing to both files.

## 10 — Moving to another Cloudflare account later (D13)

Kept as a checklist in `instructions/backend-setup.md`. What changes and where:

| Item | Action | Where it changes |
|---|---|---|
| Worker + Workers Builds | Connect the repo in the new account (settings from §1) | Cloudflare dashboard |
| D1 | `wrangler d1 export map-db --remote --output map.sql` (old account) → `d1 create` + `d1 execute --file map.sql` (new) | `wrangler.jsonc` `database_id` |
| R2 images | Copy everything under `map/` to the new bucket **with the same keys** (rclone or R2 data migration), connect the new image domain | `wrangler.jsonc` `bucket_name`, `IMAGES_URL` (+ `IMAGES_FOLDER` stays or is emptied only together with a key rewrite) |
| Rate limits | Namespace ids are per account: keep `2001`/`2002` | nothing |
| Secrets | `npm run secrets:production` with the new account logged in | none (same file) |
| Domains | New `workers.dev` subdomain or custom domain | `wrangler.jsonc` `vars` (`BETTER_AUTH_URL`, `WEB_ORIGINS`), Google redirect URIs |

If `BETTER_AUTH_URL`'s domain changes, existing sessions end (cookies belong to the old domain) and users
sign in again. Image keys and database rows don't change.

## Testing

- `npm run typecheck --workspace backend` and `--workspace packages/shared` after every code task.
- `npx wrangler deploy --dry-run` (in `backend/`) to prove the Worker and `@map/shared` still bundle.
- `npm run build --workspace app` and `npm run tauri dev` (in `app/`) after the workspace move.
- Local check against `npm run dev --workspace backend` (port 8787) with `curl`:
  - sign up → verification email arrives, **sender shows "Map"** → link signs in
  - sign in with password, with an email code, and password reset
  - notes CRUD with images; **uploaded keys start with `map/img/`**; pagination (`?limit=2` →
    `nextCursor`, last page `null`)
  - `GET /images/img/<a GrowMe-style key>` → `404` (outside the `map/` folder)
  - fake image (text renamed `.png`) → `415`
  - no session → `401`; POST with `Origin: https://evil.example` → `403 FORBIDDEN_ORIGIN`
  - invalid body → `400 VALIDATION_FAILED` with `details`; unknown `/api/x` → `404 NOT_FOUND` JSON
  - **bearer:** sign-in response has a `set-auth-token` header; `GET /api/notes` with
    `Authorization: Bearer <token>` and no cookie → `200`
  - remove `BETTER_AUTH_URL` from `.dev.vars` and `vars` → `500 SERVER_MISCONFIGURED`
- `grep` in `backend/src/` for `http`, `localhost` and `testingggg` finds nothing (all from config).
- After deploy: the website still loads at `/` and `/dashboard` (assets), sign-in works on the live
  site (proves risk 2 is handled), uploaded images load from `https://images.testingggg.lol/map/img/...`,
  `https://map.kopotitore.workers.dev/images/...` answers `404`, GrowMe's images still load, Google
  sign-in, and **Workers Logs** show `cpuTimeMs` per request (D6, D20).

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Root workspace: root `package.json` + `.gitignore`; delete per-project lockfiles, `pnpm-workspace.yaml` and `node_modules`; install at root; fix both `$schema` paths; check `app` build and `tauri dev` | `package.json`, `.gitignore`, `package-lock.json`, `app/src-tauri/tauri.conf.json`, `backend/wrangler.jsonc` |
| 2 | **User:** Workers Builds settings (root `/`, build `npm run build --workspace app`, deploy `npm run deploy --workspace backend`) | Cloudflare dashboard |
| 3 | Copy `packages/shared` as `@map/shared`; add `app.ts` with `APP_NAME` | `packages/shared/*` |
| 4 | Install backend packages (D18); GrowMe's scripts + `secrets:production`; `tsconfig.json` | `backend/package.json`, `backend/tsconfig.json` |
| 5 | Create D1 `map-db`; write `wrangler.jsonc` (§5); `.dev.vars.example`; ignore `.secrets.production.json`; `cf-typegen` | `backend/wrangler.jsonc`, `backend/.dev.vars.example`, `backend/.gitignore`, `backend/worker-configuration.d.ts` |
| 6 | Copy core; apply the §6 core changes (`env.ts`, `config.ts`, `email.ts`); rename imports | `backend/src/lib/*`, `backend/src/middleware/*`, `backend/src/emails.ts`, `backend/src/db/index.ts`, `backend/drizzle.config.ts` |
| 7 | `auth.ts` (no expo, bearer, `lax`, cache) and `better-auth.config.ts` | `backend/src/auth.ts`, `backend/better-auth.config.ts` |
| 8 | Generate auth schema; copy `schema.ts`; generate migration; apply local | `backend/src/db/*`, `backend/drizzle/*` |
| 9 | Copy notes + images resources (images key folder); write `index.ts` (§6, guarded `/images/*`) | `backend/src/resources/*`, `backend/src/index.ts` |
| 10 | **User:** fill `.dev.vars` | `backend/.dev.vars` |
| 11 | Local check (Testing list) | — |
| 12 | **User:** production secrets file + `npm run secrets:production`; Google OAuth client; Resend key | `backend/.secrets.production.json`, Cloudflare, Google Cloud, Resend |
| 13 | Apply migration `--remote`; deploy; live checks | `backend/drizzle/*` |
| 14 | **User:** promote own account to admin | remote D1 |
| 15 | Docs: `instructions/*` (incl. §5 layout and §10 checklist), `backend/README.md` | `instructions/*`, `backend/README.md` |

Files **not** touched: all code in `app/src/` (pages, routes, context, `HomePage.tsx`'s fetch and
download link), `app/index.html`, `app/vite.config.ts`, `app/src-tauri/src/*`, `Cargo.toml`, and
everything in the GrowMe project (read only; its bucket is only written to under `map/`).
`backend/src/db/auth-schema.ts` is changed only by the Better Auth CLI, never by hand. Secret values are
never written into files that git tracks.

## Open items

None. Answered by the user:

1. **`HomePage.tsx`'s demo fetch:** accepted that it stops working with D21 (it already fails because of
   its `http://https://...` URL). Fixed in the frontend plan, together with the download link (its file
   `app-0.1.0-1.x86_64.rpm` doesn't exist in release `test01`) and the use of `APP_NAME` in
   `index.html` and the pages.
2. **Images domain:** `images.testingggg.lol` with the `map/` folder (D10).
3. **Workers plan:** paid (D8).
4. **Shared package name:** `@map/shared` (D9).
5. **Tauri display name and identifier** (`productName`, window `title`, `identifier: "com.map.dev"` in
   `tauri.conf.json`) stay outside the `APP_NAME` constant because the Tauri CLI reads plain JSON. The
   identifier should get its final value (e.g. `com.kopotitore.map`) before the first public release;
   that belongs to the frontend/desktop plan.
