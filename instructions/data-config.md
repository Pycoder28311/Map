# The data config: tables, fields and screens from two files

Every table of the app is described **once**, in two config files. Everything else (database columns, list index, contract,
TypeScript types, repo, API routes, frontend API calls, cached lists, form, sidebar, list page, panel, Dashboard, Create modal, Trash,
search, Recent) is generic code that reads them. A change to the data structure is an edit of these files, plus a migration.

| File | What it says |
|---|---|
| `packages/shared/src/data.config.ts` | **Data:** each table's fields, who may access it, list order, list filters, parent link, preview |
| `app/src/resources/resources.config.ts` | **Screens:** each table's names, icon, panel type, card look, field labels, which screens it is on |
| `app/src/resources/mock.config.ts` | Tables that have no server table yet (the maps): same shape as the data config, kept in memory |

The design is in `docs/plans/26-config-driven-tables.md`. Backend rules that still apply (owner checks, errors, secrets) are in
`adding-a-resource.md`.

## How it fits together

```
packages/shared/src/
├── fields.ts         field kinds: field.text(max), field.plainText(max), field.richText(), field.int({min,max}), field.bool()
├── table.ts          defineTables(): names, zod rules (input/update/filter) and types (ItemOf, ListItemOf…) per table; matchesFilter()
└── data.config.ts    ★ DATA: every table. Types: Item<'notes'>, ListItem<'notes'>, Input<'notes'>, Filter<'notes'>

backend/src/
├── lib/ownedTable.ts       a Drizzle table from a config: id, owner, fields, preview, object_type/object_id, dates, archived, order + index
├── lib/ownedRepo.ts        list/get/create/update/remove from a config (owner only, order, filters, preview); overrides
├── lib/ownedRepo.suite.ts  the tests every table passes (ownedRepo.test.ts runs them for each table)
├── db/schema.ts            export const notes = ownedTable(DATA.notes) … one line per table (drizzle-kit reads these)
└── index.ts                mounts every table at /api/<path> in a loop (GET / · GET /:id · POST / · PATCH /:id · DELETE /:id)

app/src/
├── resources/resources.config.ts   ★ RESOURCE_UI: every table's screens (and the mock tables')
├── resources/mock.config.ts        MOCK_DATA + MOCK_SEED: tables kept in memory (createMockApi)
├── resources/createResource.ts     DATA[name] + RESOURCE_UI[name] → a resource (api, form fields, row names, list order, panel)
├── resources/registry.ts           RESOURCES, resourcesWith(surface), resourcePanels(), resourcePages()
├── lib/api/mockApi.ts              createMockApi(table, seed): the API in memory, same answers as the backend
├── lib/resource/                   hooks + the shared list store (one request per list; writes go in without reading again)
└── components/ui/resource/         ResourceEditor, ResourceModal, ResourcePanel, ResourceListPage, ResourcePage, FieldRenderer…
```

Data flow: **screen → `useResourceList` / `useResourceItem` / `useResourceActions` → shared store → `resource.api` →
`/api/<table>` → `ownedRepo` → D1**. A write that succeeded goes into every cached list and open item (`store.apply`); nothing reads
again.

## One table in the two files

```ts
// packages/shared/src/data.config.ts
articles: {
  access: 'owner',                                     // owner | public-owner | public-admin | admin (table.ts)
  order: ORDERED,                                      // { pinned, position }: pinned first, then position, then id
  fields: { title: field.text(200), content: field.richText() },
  preview: 'content',                                  // lists send `preview` (its first words) instead of `content`
  requireOneOf: ['title', 'content'],                  // a new row needs one of them
  link: PARENT,                                        // object_type ('project' | 'folder') + object_id: its parent (PARENT names the table of each type)
},

// app/src/resources/resources.config.ts
articles: {
  panelType: 'article',                                // panel refs and URLs: article:5
  label: 'Article', plural: 'Articles', icon: LuFileText, untitled: 'Untitled article',
  fields: { content: { label: 'Text', placeholder: 'Write the article…' } },   // optional: labels, placeholders, widget, hidden
  surfaces: { ...EVERYWHERE },
},
```

Every table also gets, without listing them: `id`, `user_id` (the owner), `created_at`, `updated_at`, `archived`, and the
`order` columns (`pinned`, `position`). Names: the config key is camelCase (`objectCards`); the database uses snake_case
(`object_cards`, `created_at`); the API path is kebab-case (`/api/object-cards`); the JSON and TypeScript use camelCase
(`objectCards`, `createdAt`).

### Field kinds

| Kind | Column | Rule | Form widget | Default |
|---|---|---|---|---|
| `field.text(max)` | `text NOT NULL ''` | trimmed, at most `max` | one line (`text`); the first one is the heading | `''` |
| `field.plainText(max)` | `text NOT NULL ''` | at most `max`, lines kept | `textarea` | `''` |
| `field.richText()` | `text NOT NULL ''` | HTML cleaned (`rich-text.ts`), `RICH_TEXT_MAX` | rich-text editor | `''` |
| `field.int({ min, max })` | `integer NOT NULL` | whole number in range | none (set `widget` to show one) | `max(0, min)` |
| `field.bool()` | `integer` 0/1 | boolean | none | `false` |

A new kind: add it to `fields.ts` (its zod rule), to `columnOf` in `backend/src/lib/ownedTable.ts` (its column), to `WIDGET_OF` in
`app/src/resources/createResource.ts` and, if it needs a new widget, to `FIELD_WIDGET_NAMES` (`resources/types.ts`) and
`FIELD_WIDGETS` (`FieldRenderer.tsx`).

### Surfaces (where a table shows up)

| Surface | Screen |
|---|---|
| `sidebar: { limit }` | its own sidebar section, with `limit` rows before "Show more" (without it, the table is not in the sidebar: its items are on the Dashboard, in their project's row) |
| `page: true` | a list page at `/<path>` (also a workspace panel) |
| `panel: true` | an item opens as a workspace panel (`<panelType>:<id>`); `panel: { load, fill }` gives it its own (a map's board) |
| `dashboard: true` | a Dashboard column (⋯ on a column) and its items as cards in their project's row (or the Orphans row) below the columns; `card: 'plain' \| 'image' \| 'map'` |
| `create: true` | a tab of the floating Create button's modal (its title and first text field) |
| `quickCreate: true` | the Dashboard's "Take a note…" input makes one (one table only) |
| `search: true` | the navbar search finds it (title + preview or description) |
| `recent: true` | opening one is kept in Recent |
| `trash: true` | its archived items show in the Trash |

## Recipes

Each recipe ends with **Check** (below). Commands run in the folder named.

### Add a field to a table

1. `data.config.ts`: add it to the table's `fields`, e.g. `subtitle: field.text(120)`.
2. Optional, `resources.config.ts`: `fields: { subtitle: { placeholder: 'Subtitle' } }` (it shows with its kind's widget anyway).
3. `backend/`: `npx drizzle-kit generate`, read the SQL (one `ALTER TABLE … ADD … DEFAULT …`), apply it (see Database).

A field added to a table that has rows must have a default: every field kind has one.

### Rename a field

1. Rename the key in `data.config.ts` (and in `resources.config.ts` `fields`, if listed there).
2. `npx drizzle-kit generate`: it asks whether the column was renamed or is new. Answer **renamed**, or the data is lost.
3. Fix the TypeScript errors `npx tsc -b` shows (code that reads the old name). Apply the migration.

### Change a field's kind or limit

- Only a limit (`text(200)` → `text(300)`): the contract changes, no migration.
- Another kind with the same column (`text` → `plainText`): no migration; the form widget changes.
- Another column type (`text` → `int`): a migration; SQLite cannot change a column's type in place, so drizzle-kit recreates the
  table. Read the SQL, and convert the data by hand if needed.

### Remove a field

1. Remove it from `data.config.ts` (and `resources.config.ts`). 2. `npx drizzle-kit generate` (a `DROP COLUMN`; the data is
gone). 3. Apply it **after** deploying code that no longer sends or reads the field.

### Add a table

1. `data.config.ts`: a new entry in `defineTables({ … })`.
2. `backend/src/db/schema.ts`: `export const <name> = ownedTable(DATA.<name>)` (drizzle-kit only sees exported tables).
3. `resources.config.ts`: its entry in `RESOURCE_UI` (the order there is the sidebar's, the Dashboard's and the Create modal's).
4. `backend/`: `npx drizzle-kit generate`, read the SQL: it must only create the new table and its index. Apply it, deploy.

That is all: its routes, tests (the shared suite runs for every table), API calls, lists, form and every screen of its surfaces
come from the configs. The registry test fails if a table is missing from either file.

### Remove a table

Remove its entries from the three files above (data config, `schema.ts`, UI config), generate the migration (`DROP TABLE`), deploy the
code first, then apply it. Saved Recent entries and layouts that point at it are skipped by the app.

### Show a table in the sidebar or only on the Dashboard

`resources.config.ts`: `sidebar: { limit: 5 }` gives it a sidebar section; without `sidebar` its items show only on the Dashboard (in
the row of their project, or in the Orphans row), in the columns (⋯ on a column), on its list page and in search.

### Parent / child (projects and their folders, articles, cards, notes)

A table with a `link` can have a parent: `objectType` (a key of `link.types`) + `objectId`, both set or both `null`. `link.types` maps
each type to the table it is: `{ project: 'projects', folder: 'folders' }`.

- **Read the children of a project:** the Dashboard reads each resource's one list and groups it by parent (`features/dashboard/tree.ts`:
  an item is in the row of the project it is in, also through folders; the rest is Orphans). To read them from the API:
  `GET /api/articles?objectType=project&objectId=5` (`?objectType=none` = no parent). In the app, `useResourceList(res, { filter: { objectType, objectId } })` is
  a list of its own in the store (one request); prefer grouping the list you already hold.
- **Create a child:** `create({ ..., objectType: 'project', objectId: 5 })` (the Dashboard's Add in a project's row does this).
- **Change the parent:** `update(id, { objectType, objectId })`, or `{ objectType: null, objectId: null }` for none. "Move to…" in the ⋯ menu
  (`ResourceMoveDialog`) does this for any table with a `link`, and the lists in the store follow without reading again.
- **Drag and drop:** see "Order (position) and reordering" below: a drop in another list also sets that list's parent, in the same update.
- **What the server checks** (`ownedRepo`, only when a write sets a parent): the parent exists in the table of its type, is the user's, and
  is not the row itself or one of its own children (a recursive query up the chain, at most 20 levels). A write that sets no parent
  reads nothing for this. A failed check is `400` (`UNKNOWN_REFERENCE` or `VALIDATION_FAILED`) with the field `objectId`.
- **Deleting a parent** sets the parent of its children (rows of every table that can point at it) to none: they become orphans. Archiving
  a parent keeps them as they are; the Dashboard shows them in the Orphans row while it is in the Trash.
- **A new kind of parent:** add it to `PARENT.types` in `data.config.ts` (and, for a table of its own, give that table a `link` to nest it).

### Order (position) and reordering

- **`position` is a string:** a fractional-indexing key (`a0`, `a1`, `a0V`…), compared byte by byte (never `localeCompare`). Lists are
  ordered pinned first, then `position`, then id. Keys of every table compare with each other, so a Dashboard row that mixes tables is
  sorted with `compareEntries` (`app/src/lib/resource/reorder.ts`).
- **One place makes keys:** `packages/shared/src/position.ts` (on the `fractional-indexing` library): `positionBetween`, `positionsBetween`,
  `positionAfter`, `positionBefore`, `isPosition`, `comparePositions`, and `positionField` (the contract's rule). Do not make keys anywhere else.
- **Moving an item writes that row only:** `placement(list, index, moved)` gives the key between the new neighbours (when they have equal
  keys it also gives new keys to the tied run: `fixes`), `moveItem(...)` sends it through the resource's `update` (with the new parent when
  the list has one). It shows at once and goes back if the server refuses, like every update.
- **A new row without a `position`** goes last in its group (same parent, same pinned flag): `ownedRepo.create` reads the group's last
  key through the list index (one row read). The Dashboard's Add sends the key itself when its row holds all of its items.
- **Drop targets** (`features/drag/placeDrop.ts`, zone `place`): a droppable gives `placeDropData({ kind, list, entry, parent, only, into })`.
  Dashboard cards (before/after: left/right half), Dashboard rows (the end), sidebar rows (before/after: top/bottom; into a project or
  folder: the middle). The rules are one pure function, `resolvePlace` (tested). Pinned items stay among the pinned; a row sorted by date
  takes no drops on its cards.
- **Orphans in the sidebar:** the Projects section also lists the orphans (no parent) of the resources that can have a parent but no section
  of their own (folders, articles, object cards), among the projects by `position` (keys compare across tables). An item of those let go
  by a project row's edge loses its parent and takes the place where it was let go. Turn it off with `ORPHANS_IN_SIDEBAR` in
  `components/layout/sidebar/ResourceRows.tsx` (they stay on the Dashboard's Orphans row).
- **Leaving a parent:** an item that is inside a parent and is let go by the top or bottom edge of a project row in the sidebar (between two
  parents, not between children) loses its parent: one update of `objectType`/`objectId` to none, its place unchanged (`side: 'out'`).
  Let go by the row's middle it goes inside that project; between two children it moves among them. On the Dashboard, the Orphans row does it.
- **After a drop** the item's faded copy (what it left in its place) slides to where it landed and turns solid (`features/drag/glide.ts`),
  unless it falls into its new parent's icon (a move into a project or folder). A surface takes part by marking its elements
  `data-glide="<panelType>:<id>"` and `data-glide-in="sidebar|dashboard"` (sidebar rows, Dashboard cards).
- **Migration `0008`** turned the integer positions into keys (`a0, a1, …` per user, in the old order) without copying the tables; it is
  written by hand (drizzle-kit would rebuild every table). Its test runs it on an in-memory SQLite (`backend/src/db/migrations.test.ts`).

### Saved layouts (the `layouts` table)

- One row per layout: `template`, its lines (`splitX`, `splitY`, and `splitX2`/`splitY2` for the uneven halves of a 2×2; thousandths, 0 = joined),
  and its up to four panes as panel keys in `panelA`…`panelD` (`note:5`, `dashboard`, empty = none). Newest first (`order`: neither flag).
  Field options used: `field.text(max, { pattern, default })` and `field.int({ min, max, default })` (`fields.ts`).
- Its resource shows only in the Trash (`surfaces: { trash: true }`); the sidebar's Layouts section is its own screen
  (`app/src/features/layouts`). `layoutsStore.ts` turns a row into a `SavedLayout` (`fromRow`) and back (`toFields`), keeps what only this
  tab knows (the layout last opened, the unsaved changes kept per layout) and makes each change one request through the resource's actions
  (`saveLayout` = create, `updateLayout` = update shown at once and undone on a refusal, `archiveLayout`/`restoreLayout`, `deleteLayout`).
- Clicking a tile opens its panes through the workspace URL (`/workspace?layout=…&panels=…`): no endpoint of its own; each pane reads
  its own item. A pane whose item is gone is left out when the layout opens.
- Migration `0009_layouts.sql` creates the table.

### Something a table does its own way

- **One repo method:** in `backend/src/index.ts`, give that table `ownedRepo(schema.x, DATA.x, { toJson, beforeCreate, beforeUpdate })`.
- **A route that is not CRUD:** `crudRoutes(…)` returns a Hono router: add `.get('/:id/export', requireAuth, …)` to it, or mount
  a hand-written router like `images` (see `adding-a-resource.md`, "Routes that are not plain CRUD").
- **Its own panel:** `panel: { load: () => import('…'), fill: true }` in the UI config (the maps' board). It then opens as a page,
  not in the modal.
- **Side effects of copy / delete:** `effects: { copied(from, to), deleted(id) }` in the UI config (the maps copy and drop their board).

### Move a mock table to the server

Move its entry from `MOCK_DATA` (`mock.config.ts`) to `DATA` (`data.config.ts`), drop its seed, add its `schema.ts` line, generate
and apply the migration, deploy. The app then calls `/api/<path>` instead of `createMockApi`; no screen changes.

### Change who may access a table

`access` in `data.config.ts`: `owner` (each user their own rows, the default here), `public-owner`, `public-admin`, `admin`.
`ownedRepo` always filters by owner: a public table needs a repo of its own (read without `userId`, see `adding-a-resource.md`).

## Database

Dev uses the **live** API (the Vite proxy sends `/api` to the Worker), so the live database must have the migration before the app
can use a new table or field.

```
cd backend
npx drizzle-kit generate                              # writes drizzle/NNNN_*.sql from schema.ts
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote      # production: only after reading the SQL
npm run deploy                                        # (or: npm run build --workspace app && npm run deploy --workspace backend)
```

Always read the generated SQL. It must never recreate or alter a table you did not change.

A table that gets a `preview` while it has rows: `npm run backfill:previews -- --remote --table <table> --column <field>`.

## Check

```
cd packages/shared && npx tsc --noEmit && npx vitest run
cd backend && npx tsc --noEmit && npx vitest run
cd app && npx tsc -b && npx vitest run && npx oxlint src
```

`npx tsc -p .` in `app/` checks **nothing** (its `tsconfig.json` only references the others): use `npx tsc -b`.

## Requests (they cost)

- Lists are shared: every screen that shows the same list (a table and its filter) reads it once (`lib/resource/listStore.ts`).
  A screen that needs more reads only the rest, after the cursor.
- Writes go into the cached lists and open items with the server's answer: no read after a create, update or delete.
- The Trash reads its lists only when it is opened; search and Recent use what the lists already hold first.
- Do not add a `useResourceList` with a new filter where an existing list would do: each filter is a list of its own.

## Rules

- Never accept `userId`, `id`, `createdAt`, `updatedAt` or `preview` from a client: the contract leaves them out (`table.ts`).
- Do not edit the auth code (`backend/src/auth.ts`, `db/auth-schema.ts`, `middleware/auth.ts`, `app/src/lib/auth-client.ts`,
  `features/auth/`) for a table change.
- Do not edit existing migrations; generate a new one.
- Keep the UI config's order meaningful: it is the order of the sidebar, the Dashboard and the Create modal.
