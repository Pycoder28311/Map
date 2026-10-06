# Commands

The 5 commands you need most. Paths are relative to the repo root (`Map/`).

| # | What | Where | Command |
|---|---|---|---|
| 1 | Install everything (app, backend, shared) | `Map/` | `npm install` |
| 2 | Run the website (or the desktop app) | `Map/app/` | `npm run dev` → http://localhost:5173 <br> desktop: `npm run tauri dev` |
| 3 | Run the API locally (optional) | `Map/backend/` | `npm run dev` → http://localhost:8787 |
| 4 | Update the database after changing `backend/src/db/schema.ts` | `Map/backend/` | `npx drizzle-kit generate` <br> `npx wrangler d1 migrations apply map-db --local` <br> `npx wrangler d1 migrations apply map-db --remote` |
| 5 | Deploy (website + API) | `Map/` | `npm run build --workspace app && npm run deploy --workspace backend` |

- **1:** run it again after pulling changes or after editing a `package.json`. Add packages with
  `npm install <pkg> --workspace backend` (or `--workspace app`), never inside the folders.
- **2:** the website uses the **live** API: `/api` is proxied to `https://map.kopotitore.workers.dev`,
  so no local backend is needed (data and sign-ups are real). Google sign-in only works on the live site.
  The desktop app must not be started while `npm run dev` is already running on port 5173.
- **3:** only for backend work. Needs `backend/.dev.vars` filled in (copy `backend/.dev.vars.example`), otherwise every
  `/api` request answers `500 SERVER_MISCONFIGURED`.
- **4:** read the new SQL file in `backend/drizzle/` before the `--remote` line, and apply it
  before deploying code that uses the new table.
- **5:** pushing to GitHub does the same automatically through Workers Builds, once its settings
  point to the repo root (see `instructions/backend-setup.md` §6).

More: [`instructions/backend-setup.md`](instructions/backend-setup.md) (setup, secrets, domains) and
[`instructions/adding-a-resource.md`](instructions/adding-a-resource.md) (new tables).
