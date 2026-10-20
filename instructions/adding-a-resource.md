# Adding a resource (table + API)

**A normal table is added through the data config: see [`data-config.md`](data-config.md)** (two config files, one line in
`schema.ts`, a migration; routes, repo, contract, types and every screen follow). This file keeps what the generic code builds on:
how the backend is organized, what `crudRoutes()` does, formatted text, relationships, routes that are not plain CRUD and the rules.
For setting up the backend (new project, new machine, new Cloudflare account), see `backend-setup.md`.

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
    ├── lib/ownedTable.ts     tables from the data config (shared/src/data.config.ts)
    ├── lib/ownedRepo.ts      the repo of every user-owned table, from its config (+ overrides)
    ├── resources/<name>/     PROJECT: only what is not plain CRUD (images: uploads)
    ├── db/schema.ts          PROJECT: one ownedTable() line per table, plus images and auth
    ├── auth.ts, emails.ts    PROJECT: sign-in methods and email texts
    └── index.ts              PROJECT: mounts every table under /api/<path> (a loop) and the other routers
```

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

**`access`** (the table's config) decides who may read and write:

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

## Fields that hold formatted text (HTML)

Declare the field with `field.richText()` in `data.config.ts`: every route validates its input with the contract, so the text is
length-limited (`RICH_TEXT_MAX`) and cleaned to the allowed tags, attributes and links (`sanitize-html.ts`) before the repo sees it.
Show it in the app with `RichTextField` (`editable={false}` to read); never with `dangerouslySetInnerHTML` (lint error). The rules live
in `rich-text-policy.ts`; the website's CSP is `app/public/_headers`.

Pictures in such a text are `<img>` tags of images uploaded through `/api/images`: the sanitizer keeps only those (their address must
be a stored image's). Nothing deletes the files when a picture leaves the text or the row is removed, so they stay in R2 and the
`images` table until a clean-up job removes them.

Lists should not send the whole text: `preview: '<field>'` in the table's config adds a `preview` column (plain text, `previewOf`),
written by `ownedRepo` with the field; lists leave the field out and send the preview. Rows made before the column existed:
`npm run backfill:previews -- --local|--remote --table <table> --column <field>` (in `backend/`).

## Relationships

The tables of the data config point at a parent with the `link` pair (`object_type` + `object_id`, see `data-config.md`). What
follows is for relations the generic code does not make yet (a real foreign key, link tables): the helpers exist in
`lib/relations.ts`, and such a table passes overrides to `ownedRepo` or has a repo of its own.

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

## Checklist (a table through the data config)

- [ ] Entry in `packages/shared/src/data.config.ts`, line in `backend/src/db/schema.ts`, entry in `app/src/resources/resources.config.ts`
- [ ] Migration generated, read (only the new table), applied locally and remotely
- [ ] Checks pass: `npx tsc --noEmit` + `npx vitest run` in `packages/shared` and `backend`; `npx tsc -b` + `npx vitest run` in `app`
- [ ] Deployed
