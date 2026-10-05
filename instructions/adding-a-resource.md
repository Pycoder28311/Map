# Adding a resource (table + API) to the backend

How to add a new database table and its API to `backend/`, using the shared CRUD, pagination and
relationship helpers. Follow these steps for every new table. For setting up the backend (new
project, new machine, new Cloudflare account), see `backend-setup.md`.

## How the backend is organized

```
Map/
├── packages/shared/src/      zod schemas + types shared with the app, APP_NAME (no server code)
└── backend/src/
    ├── lib/                  CORE: the same in every project
    │   ├── crud.ts           crudRoutes(): access modes + filters + pagination + validation + 404s
    │   │                     + toCtx(), ownedOrAdmin(), isAdmin(), hasChanges()
    │   ├── pagination.ts     keyset pagination helpers
    │   ├── relations.ts      replaceLinks(), removedIds(), ownsAll(), assertExists(), runBatch()
    │   ├── errors.ts         HttpError + errorBody(): one error format for everything
    │   ├── validate.ts       validate() / parseOrThrow(): zod with the API error format
    │   ├── env.ts            validated environment (add new variables here)
    │   ├── config.ts         project settings derived from env + APP_NAME
    │   └── email.ts, image-type.ts
    ├── middleware/           CORE: env check, auth (optional/required/role), csrf, rate limit
    ├── resources/<name>/     PROJECT: one folder per resource (repo + routes)
    ├── db/schema.ts          PROJECT: all tables (Drizzle)
    ├── auth.ts, emails.ts    PROJECT: sign-in methods and email texts
    └── index.ts              PROJECT: mounts every resource under /api/<name>
```

## What a new table costs

A normal table with CRUD: **3 new files, 3 small edits, 3 commands.**

| # | What | File |
|---|---|---|
| 1 | The table | `backend/src/db/schema.ts` (edit) |
| 2 | The contract: what clients send (zod) and get back (type) | `packages/shared/src/<name>.ts` (new) |
| 3 | Export the contract | `packages/shared/src/index.ts` (1 line) |
| 4 | The data logic | `backend/src/resources/<name>/<name>.repo.ts` (new) |
| 5 | The routes | `backend/src/resources/<name>/<name>.routes.ts` (new, one `crudRoutes()` call) |
| 6 | Mount it | `backend/src/index.ts` (1 import + 1 line) |

Commands: `npx drizzle-kit generate`, then apply with `--local` and `--remote` (step 2 below).
`lib/`, `middleware/`, `auth.ts`, CORS, CSRF and rate limits are never touched for a new table.

## What `crudRoutes()` gives you

```ts
crudRoutes({ access, paginate?, filter?, create, update, repo })
```

| Route | Does |
|---|---|
| `GET /api/<name>` | list. Paginated by default: `?limit=20&cursor=…` → `{ items, nextCursor }`; plus `filter` parameters |
| `GET /api/<name>/:id` | one row, or `404 NOT_FOUND` |
| `POST /api/<name>` | create (validated with `create`), `201` |
| `PATCH /api/<name>/:id` | update (validated with `update`), or `404` |
| `DELETE /api/<name>/:id` | delete, `204`, or `404` |

**`access`** decides who may read and write:

| Mode | Read | Write | Example |
|---|---|---|---|
| `owner` | signed in, own rows | signed in, own rows | notes, projects |
| `public-owner` | everyone | signed in; change only own rows | posts |
| `public-admin` | everyone | admins only | shared catalogues |
| `admin` | admins only | admins only | moderation |

**`paginate`** (default `true`): keyset pagination, newest first. Each page reads about `limit + 1`
rows through the primary key, however big the table is. `paginate: false` returns a plain array of
everything; use it only for small per-user lists.

**`filter`** (optional): a zod object for list query parameters, e.g. maps of one project
(`?projectId=1`). The parsed values are the third argument of `repo.list(ctx, page, filter)`. Use
`queryId` from shared for ids (`z.object({ projectId: queryId })`); required fields make the filter
mandatory (`400` without it).

**Lighter lists:** `Repo<Create, Update, Out, Filter, ListItem>`. When list rows should carry less than
`get()` (summaries in lists, everything on `GET /:id`), set `ListItem` to the smaller type.

Every error answers `{ code, message, details? }` with a code from `packages/shared/src/errors.ts`.
CSRF protection and rate limiting apply automatically to everything under `/api`.

## Steps

The example adds `projects`: each user's projects (`access: 'owner'`).

### 1. Define the table in `backend/src/db/schema.ts`

`id()`, `owner()` and `createdAt()` are the column helpers at the top of the file.

```ts
export const projects = sqliteTable(
    'projects',
    {
        id: id(),
        userId: owner(),
        title: text('title').notNull(),
        archived: integer('archived', { mode: 'boolean' }).notNull().default(false),
        createdAt: createdAt(),
    },
    (t) => [index('projects_user_id_idx').on(t.userId)],
)
```

Every user-owned table gets `userId` and an index on it. Index every column you filter or join by.

### 2. Create and apply the migration (in `backend/`)

```
npx drizzle-kit generate
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote
```

Read the generated SQL in `drizzle/` before applying it remotely. Adding a required (`notNull`)
column to a table that already has rows fails unless the column has a default.

### 3. Add the contract to `packages/shared/src/projects.ts`

What clients may send (zod) and what they get back (types). Never include `userId`, `id` or other
server-controlled fields in input schemas.

```ts
import { z } from 'zod'

export const projectCreate = z.object({
  title: z.string().trim().min(1).max(200),
})

/** Every field optional: send only what changes */
export const projectUpdate = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  archived: z.boolean().optional(),
})

export type ProjectCreate = z.infer<typeof projectCreate>
export type ProjectUpdate = z.infer<typeof projectUpdate>
export type Project = { id: number; title: string; archived: boolean }
```

Export it from `packages/shared/src/index.ts`: `export * from './projects'`.

### 4. Create `backend/src/resources/projects/`

**`projects.repo.ts`**: the data logic. Every query on user data filters by `userId(ctx)`.

```ts
import type { Project, ProjectCreate, ProjectUpdate } from '@map/shared'
import { and, desc, eq } from 'drizzle-orm'
import { projects } from '../../db/schema'
import { hasChanges, userId, type Ctx, type Repo } from '../../lib/crud'
import { beforeCursor, fetchLimit, mapPage, toPage } from '../../lib/pagination'

type Row = typeof projects.$inferSelect

/** The only fields that leave the server */
const toJson = (p: Row): Project => ({ id: p.id, title: p.title, archived: p.archived })

/** Only rows owned by the signed-in user */
const mine = (ctx: Ctx, id: number) => and(eq(projects.id, id), eq(projects.userId, userId(ctx)))

export const projectsRepo: Repo<ProjectCreate, ProjectUpdate, Project> = {
  async list(ctx, page) {
    const rows = await ctx.db
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId(ctx)), beforeCursor(projects.id, page)))
      .orderBy(desc(projects.id))
      .limit(fetchLimit(page) ?? -1)
    return mapPage(toPage(rows, page, (p) => p.id), toJson)
  },
  async get(ctx, id) {
    const row = await ctx.db.select().from(projects).where(mine(ctx, id)).get()
    return row ? toJson(row) : null
  },
  async create(ctx, input) {
    const row = await ctx.db.insert(projects).values({ ...input, userId: userId(ctx) }).returning().get()
    return toJson(row)
  },
  async update(ctx, id, input) {
    if (!hasChanges(input)) return projectsRepo.get(ctx, id) // Drizzle rejects an empty SET
    const row = await ctx.db.update(projects).set(input).where(mine(ctx, id)).returning().get()
    return row ? toJson(row) : null
  },
  async remove(ctx, id) {
    const row = await ctx.db.delete(projects).where(mine(ctx, id)).returning().get()
    return !!row
  },
}
```

For public resources (`public-owner`, `public-admin`), `list` and `get` must not call `userId(ctx)`
(anonymous readers have no user), while writes in `public-owner` still filter by it: edits by
`userId(ctx)`, deletes by `ownedOrAdmin(ctx, table.userId)` so admins can moderate.

**`projects.routes.ts`**:

```ts
import { projectCreate, projectUpdate } from '@map/shared'
import { crudRoutes } from '../../lib/crud'
import { projectsRepo } from './projects.repo'

export default crudRoutes({ access: 'owner', create: projectCreate, update: projectUpdate, repo: projectsRepo })
```

### 5. Mount it in `backend/src/index.ts`

```ts
import projectsRoutes from './resources/projects/projects.routes'

const routes = app
  .route('/api/notes', notesRoutes)
  .route('/api/images', imagesRoutes)
  .route('/api/projects', projectsRoutes)
```

### 6. Check and deploy

```
npm run typecheck --workspace backend
npm run typecheck --workspace packages/shared
npm run deploy --workspace backend
```

### 7. Use it in the app

Add an API file in `app/src/` (one per resource, the only place that knows the URLs) and the pages
under `app/src/pages/`.

## Relationships

### One-to-many (e.g. a project has many maps)

Add a column that points to the parent, list children through a `filter` (`?projectId=`) and check
the parent on create:

```ts
projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
```

- Parent must exist: `assertExists(ctx.db, projects, projects.id, input.projectId, 'projectId')`
  (`400 UNKNOWN_REFERENCE` otherwise).
- Parent must belong to the user:
  `ownsAll(ctx.db, projects, { id: projects.id, owner: projects.userId }, [projectId], userId(ctx))`.

### Many-to-many (e.g. maps ↔ tags)

1. Add a link table in `schema.ts` (see `noteImages`): two foreign keys with `onDelete: 'cascade'`,
   a composite primary key and, if order matters, a `position` column. Add Drizzle `relations()` for
   both tables so queries can load linked rows with `with`.
2. In the repo, describe the link once:

   ```ts
   const mapTagLinks: LinkTable<typeof mapTags> = {
     table: mapTags,
     parent: mapTags.mapId,
     toRow: (mapId, tagId, position) => ({ mapId, tagId, position }),
   }
   ```

3. When saving, check ownership of the linked ids, then replace the links in the same batch as the
   parent's own update:

   ```ts
   if (!(await ownsAll(ctx.db, tags, { id: tags.id, owner: tags.userId }, tagIds, userId(ctx)))) {
     throw new HttpError(400, 'UNKNOWN_TAG', 'Unknown tag')   // add the code to shared errors.ts
   }
   await ctx.db.batch([
     ctx.db.update(maps).set({ title }).where(eq(maps.id, id)),
     ...replaceLinks(ctx.db, mapTagLinks, id, tagIds),
   ])
   ```

4. Use `removedIds(before, after)` if unlinked rows need cleanup (as notes do with images).
5. Statement lists built at runtime (e.g. "update only if fields were sent"): `runBatch(ctx.db, [...])`.

`resources/notes/notes.repo.ts` is a complete working example.

### Images on a resource

Images are uploaded once (`POST /api/images`, stored in R2 under `IMAGES_FOLDER`) and linked through
a link table per parent (`note_images`, later e.g. `map_images`). `resources/images/images.repo.ts`
has everything a repo needs:

- `assertCanLinkImages(ctx, imageIds, alreadyLinked)`: new images must be the user's own uploads
- `toImageRefs(env, row.images)`: `[{ id, url }]` for the response
- `deleteImages(ctx, ids)`: rows and R2 files, after a delete or for `removedIds(before, after)`

### Counters and "likes"-style tables

- Store counts on the parent row (e.g. `like_count`) and change them in the **same batch** as the row
  they count, **only if** a row was actually inserted or deleted. Never `count(*)` per request.
- Guard the change with a condition inside the same batch, so parallel requests can't count twice.
- Working examples live in GrowMe (`resources/likes`, `resources/post-replies`).

## Routes that are not plain CRUD

For uploads, actions or read-only endpoints, write a normal Hono router in
`resources/<name>/<name>.routes.ts`. Start it with `.use(requireAuth)` (and `requireRole('admin')`
for admin actions), throw `HttpError` with a code for errors, and mount it the same way.
`resources/images/images.routes.ts` (file upload) is an example.

## Rules

- **The owner comes from the session:** `userId(ctx)` in repos, `c.get('user').id` in routers (or
  `toCtx(c)` to call a repo). Never accept `userId` from the request body.
- **Every query on user data filters by owner.** Someone else's row must behave exactly like a
  missing row (404).
- **Validate every input with zod** (in `packages/shared`), with limits (lengths, array sizes).
- **Return data through `toJson`** typed with the shared type. Never send raw database rows.
- **Check ownership of every linked id** (`ownsAll`) before creating links.
- **Group related writes in `db.batch()`** so they succeed or fail together.
- **Errors:** throw `HttpError(status, code, message)` with a code from the shared `ERROR_CODES`
  (add new codes there). Unexpected errors are logged and answered as `INTERNAL`.
- **No domains in code.** URLs come from the environment (`backend-setup.md`); the app name is
  `APP_NAME` in `packages/shared/src/app.ts`.
- **New variables or bindings:** add them to `wrangler.jsonc` (production), `.dev.vars` and
  `.dev.vars.example` (local) **and** to the schema in `lib/env.ts`, then `npm run cf-typegen` in
  `backend/`.
- **Migrations:** apply every new migration with both `--local` and `--remote`, and commit `drizzle/`.

## Checklist

- [ ] Table in `db/schema.ts` (with `userId` and indexes if user-owned)
- [ ] Migration generated, checked, applied locally and remotely
- [ ] Contract in `packages/shared/src/<name>.ts` (create, update, filter, output types), exported from `index.ts`
- [ ] `resources/<name>/` with `<name>.repo.ts` and `<name>.routes.ts` (right `access`)
- [ ] Mounted in `index.ts`
- [ ] Typecheck passes for `backend` and `packages/shared`
- [ ] Deployed
- [ ] App API file and pages
