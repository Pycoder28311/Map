# 26 — Config-driven tables: folders, articles, object cards, and no more mock data

**Goal:** every table is described **once**, in two central config files (data in `packages/shared`, screens in `app`), and the
backend columns, zod contract, TypeScript types, repo, routes, frontend API, store lists, editor, sidebar, Dashboard, Create
modal, Trash, search and Recent all follow from it. On top of that, three new tables (`folders`, `articles`, `object_cards`)
replace the mock object cards; the mock maps and saved layouts stay in memory but go through the same resource interface as the
server tables. `notes` and `projects` move onto the new structure with no change to their database. A guide for future agents
goes in `instructions/`.
**Depends on:** 25 (resources, registry, hooks), the shared list store (`app/src/lib/resource/listStore.ts`), the
`projects` table (migration `0005`).
**Blocks:** the parent/child relations (folders in projects, articles in folders, images under object cards), a real `maps` table.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **New tables** `folders` (title, description), `articles` (title, content) and `object_cards` (title, content), each with `id`, `user_id`, `object_type`, `object_id`, `pinned`, `archived`, `position`, `created_at`, `updated_at` | User |
| D2 | **`parent_id` is replaced by a link pair** `object_type` + `object_id` on folders, articles and object cards: `object_type` is `'project'` or `'folder'` (the parent's table), `object_id` its id; both set or both empty (a CHECK, like `notes_object_pair`). **Minimal for now:** stored and validated (allowed type, positive id, pair rule), no existence or ownership check, no tree in the UI. Relations come later | User |
| D3 | **`user_id` on every table** (also articles and object cards): access `'owner'`, every query filters by owner | User |
| D4 | **Names:** lower-case `snake_case` in the database (`object_type`, `created_at`); `camelCase` in the API JSON and in TypeScript (`objectType`, `createdAt`), as today. The config keys are camelCase; the column and table names are derived (`objectCards` → `object_cards`) | User |
| D5 | **No image fields on object cards.** Pictures go in the rich-text content as `<img>` of `/api/images` uploads, like notes. Images as children of a card come with the relations later | User |
| D6 | **Text:** folder `description` is plain text (max 2000, no preview); article and object card `content` is rich text (`richText`) with a `preview` column, like notes | User |
| D7 | **Two central config files:** `packages/shared/src/data.config.ts` (tables, fields, access, order, filters, link, preview) and `app/src/resources/resources.config.ts` (labels, icons, surfaces, sidebar group, card look). The shared one cannot import React, so icons stay in the app file | User |
| D8 | **Notes get the same link** (`project` \| `folder`) in the contract and config. Their columns `object_type`/`object_id` and the CHECK already exist: no migration for notes. Projects get no link | User |
| D9 | **Mock maps and saved layouts stay in memory** but become resources with a mock API (`createMockApi`): same hooks, store and screens as the server tables; moving one to the server later is changing its `api`. The mock object cards are removed (they become `object_cards`) | User |
| D10 | **Sidebar "Orphans"** replaces "Objects": folders, articles, object cards and maps, **grouped by table** (each group is one store list, server order), showing **only items without a parent** (`objectType=none`) | User |
| D11 | **Everywhere like notes:** folders, articles and object cards get a panel/editor, a list page, a Dashboard column and row, a Create tab, the Trash, search and Recent | User |
| D12 | **One plan file**, phases A–G inside it, each ending with green typecheck, tests and lint | User |
| D13 | **Auth code is not touched** (see "Files not touched") | User |
| D14 | **Typecheck the app with `npx tsc -b`** (or `-p tsconfig.app.json`). `npx tsc -p .` in `app/` checks nothing (`"files": []`) | Default |
| D15 | **One field = one descriptor** carrying both its zod rule and its column kind (`text(200)`, `plainText(2000)`, `richText()`, `int()`, `bool()`): the shared side builds zod from it, the backend builds Drizzle columns from it. Changing a field is one line + a migration | Default |
| D16 | **Generic backend:** `ownedTable(name, config)` (columns, CHECK, list index), `ownedRepo(table, config)` (list/get/create/update/remove, preview, link, list without heavy columns) with optional overrides, mounted from one list. `projects.repo.ts` and `notes.repo.ts` are deleted | Default |
| D17 | **Mount by loop** over the tables in `backend/src/index.ts`. `AppType` loses the per-table route types; nothing in the app imports it today (no `hc` client) | Default |
| D18 | **Generic frontend:** `createResource(name)` builds each `ResourceDefinition` from both configs; one generic `ResourcePanel` and one generic list page replace `NotePanel`, `ProjectPanel`, `NotesPage`, `ProjectsPage`; Dashboard columns, Create tabs, page routes and panel entries are read from the registry. `RESOURCE_COLUMNS`, `RESOURCE_OF`, `ModalKind` go away | Default |
| D19 | **List filters are generic:** the store key holds the whole filter (`archived`, `objectType`/`objectId`, `none` = no parent); one shared `matchesFilter` decides both the query string and whether a written item belongs in a cached list (`apply`) | Default |
| D20 | **Pinned section:** built from the resources' own `pinned` field (the pinned items found in each sidebar list, which come first). The mock pin store and pin drag-reordering are removed; Pin/Unpin stays in the ⋯ menu | Default |
| D21 | **Dashboard rows show server order** (with Sort by); the mock-only manual drag-reorder of cards (`useRowDrop`, `rows.ts`) is removed. Reordering by `position` comes with the relations plan | Default |
| D22 | **Board links** (`features/board`) become `{ to: 'item'; type: panelType; id: string }` (was `to: 'sidebar'`), names read through the store. The board itself stays in memory (`boardStore.ts`) | Default |
| D23 | **The dormant note-linking code** (`features/links`) is kept dormant and only re-typed to `{ type, id }`; it is not wired to the new link pair | Default |
| D24 | **Mock ids are numbers** (`createMockApi` counts from 1), so Recent's "resource ids are numbers" rule (`RecentList.exists`) holds for every resource | Default |
| D25 | **Guide:** a new `instructions/data-config.md` (how to add/change/remove a field or a table, how surfaces work, overrides, mocks); `instructions/adding-a-resource.md` keeps the backend rules and relations and points to it; `COMMANDS.md` links it | Default |
| D26 | **Previews backfill** script becomes generic: `npm run backfill:previews -- --local\|--remote [--table notes]`, every table with `preview` | Default |
| D27 | **Language of this plan:** English, like plans 01–25 | Default |

## 1 — Risks and blockers

- **Dev uses the live Worker** (`/api` is proxied to `map.kopotitore.workers.dev`, plan 25 D7). The new tables need their
  migration applied with `--local` and `--remote` and a Worker deploy **before** the frontend phases can be checked in the browser.
  Applying `--remote` and deploying are the user's steps (production data).
- **The migration must not touch `notes` or `projects`.** `ownedTable` must produce exactly today's columns, CHECK
  (`notes_object_pair`) and indexes (`notes_list_idx`, `projects_list_idx`). Phase B checks this: `npx drizzle-kit generate`
  after B must produce **only** `CREATE TABLE folders/articles/object_cards` + their indexes. If it alters or recreates `notes` or
  `projects`, fix the helper; never ship that migration.
- **Generic typing is the hard part.** `defineTables` must infer `Item`/`ListItem`/`Input` per table from field descriptors
  (mapped and conditional types). Type tests (`expectTypeOf`) guard it; keep the helpers small.
- **Wide frontend refactor** (≈40 files use the mock store or hand-written resource lists). Each phase ends green; do not start the
  next on a red build.
- **Recent and saved layouts** stored in `localStorage` keep old mock ids (`map:m1`, `object:o2`); they are skipped (as today for
  `project:p1`), so old entries disappear. Not migrated.
- **Mock maps restart empty of boards on reload** (as today); their ids change from `m1` to numbers, so old board links to maps break.
  Acceptable for mock data.
- **Rate limit** (`API_GENERAL`, 120/min/IP): three more lists on Dashboard load (folders, articles, cards). The shared store keeps
  it to one request per list.

## 2 — Architecture

```
packages/shared/src/
├── fields.ts          field descriptors: text(), plainText(), richText(), int(), bool() → { kind, zod, … }
├── table.ts           defineTables(): per table → input/update/filter zod, Item/ListItem/Input/Update types, matchesFilter()
├── data.config.ts     ★ THE data config: every table, its fields, access, order, listFilters, link, preview
└── index.ts           exports (notes.ts and projects.ts are deleted: their contract comes from data.config.ts)

backend/src/
├── lib/ownedTable.ts  Drizzle columns + CHECK + list index from a table config
├── lib/ownedRepo.ts   list / get / create / update / remove from a table config (+ overrides)
├── lib/ownedRepo.suite.ts   the shared test suite, run for every table
├── db/schema.ts       export const notes = ownedTable('notes', DATA.notes) … (auth tables and images untouched)
└── index.ts           for (const name of TABLE_NAMES) app.route(`/api/${slug(name)}`, crudRoutes(…))

app/src/
├── resources/resources.config.ts   ★ THE UI config: label, plural, icon, untitled, surfaces, sidebar group, card, widgets overrides
├── resources/createResource.ts     DATA[name] + UI[name] → ResourceDefinition (api, list order/toItem, fields, row, panel)
├── resources/registry.ts           RESOURCES from the UI config (order = sidebar/Dashboard order)
├── lib/api/mockApi.ts              createMockApi(seed): ResourceApi in memory (maps, layouts)
├── lib/resource/…                  hooks/store take any filter (D19)
└── components/ui/resource/         ResourcePanel, ResourceListPage, ResourceCard (generic), Editor, Modal…
```

**Data flow is unchanged:** component → `useResource*` → shared store → `resource.api` → `/api/<table>` (or the mock API) →
`ownedRepo` → D1. Writes go through `useResourceActions` → `notifyChanged` → `store.apply` (no read, as now).

**What one table looks like in the data config** (illustrative; exact helper names may change in phase A):

```ts
const LINK = { types: ['project', 'folder'] } as const

export const DATA = defineTables({
  projects:    { access: 'owner', order: ORDERED, fields: { title: text(200), content: richText() }, preview: 'content', requireOneOf: ['title', 'content'] },
  notes:       { access: 'owner', order: ORDERED, fields: { title: text(200), content: richText() }, preview: 'content', requireOneOf: ['title', 'content'], link: LINK },
  folders:     { access: 'owner', order: ORDERED, fields: { title: text(200), description: plainText(2000) }, requireOneOf: ['title'], link: LINK },
  articles:    { access: 'owner', order: ORDERED, fields: { title: text(200), content: richText() }, preview: 'content', requireOneOf: ['title', 'content'], link: LINK },
  objectCards: { access: 'owner', order: ORDERED, fields: { title: text(200), content: richText() }, preview: 'content', requireOneOf: ['title', 'content'], link: LINK },
})
```

Every table gets `id`, `userId` (owner), `createdAt`, `updatedAt`, `archived` and the `order` columns without listing them.
`listFilters` defaults to `['archived']`, plus `'link'` when `link` is set.

## 3 — Phase A: shared config and contract

- **`packages/shared/src/fields.ts`** (new): descriptors `text(max)`, `plainText(max)`, `richText()`, `int({ min, max })`,
  `bool()`, each `{ kind, zod, default }`. `richText()` wraps the existing `richText` (sanitizer, `RICH_TEXT_MAX`).
- **`packages/shared/src/table.ts`** (new): `defineTables(config)` → per table: `input` (partial + `requireOneOf` refine, like
  `noteInput`), `update` (partial), `filter` (`archived` as today's `noteFilter`; with `link`: `objectType` = `'project' | 'folder'
  | 'none'` and `objectId` = `queryId`, `objectId` only with a real type), the link pair rule (both or none, type in `link.types`),
  `orderFields` reused from `order.ts`. Types `ItemOf<T>`, `ListItemOf<T>` (Item minus `preview`'s source field), `InputOf<T>`,
  `UpdateOf<T>`, `FilterOf<T>`. `matchesFilter(table, filter, item)` (D19). `tableName(key)` / `columnName(key)` (camel → snake).
- **`packages/shared/src/data.config.ts`** (new): the five tables (section 2). `ORDERED = { pinned: true, position: true }`.
- **Replace** `packages/shared/src/notes.ts` and `projects.ts`: delete them; keep the exported names the rest of the code uses
  (`Note`, `NoteListItem`, `noteInput`, `Project`, …) as aliases in `data.config.ts` until phase F removes their last users, then drop
  the aliases.
- **Tests** (`packages/shared`, vitest): zod per field kind; input/update/filter per table (requireOneOf, link pair, `none`);
  `matchesFilter`; `expectTypeOf` on `ItemOf<'folders'>` (has `description`, no `content`), `ListItemOf<'articles'>` (no `content`).

## 4 — Phase B: backend tables, repo, routes

- **`backend/src/lib/ownedTable.ts`** (new): `ownedTable(name, config)` → `sqliteTable(tableName(name), …)` with `id()`,
  `owner()`, the field columns by kind (`text` / `plainText` / `richText` → `text(...).notNull().default('')`, `int`, `bool`),
  `preview` when set, `objectType`/`objectId` + CHECK `${table}_object_pair` when `link` is set, `createdAt`, `updatedAt`,
  `archived`, `orderColumns(order)`, and `listIndex('${table}_list_idx', …, { filters: listFilters })` (the link filter adds
  `object_type`, `object_id` to the index for the tables that list by it). The column helpers move from `schema.ts` into it.
- **`backend/src/db/schema.ts`**: `export const projects = ownedTable('projects', DATA.projects)`, same for notes, folders,
  articles, objectCards. `images` and the auth export stay as they are.
- **Migration:** `npx drizzle-kit generate` → `0006_…sql`. Check it contains only the three new tables and their indexes (§1).
- **`backend/src/lib/ownedRepo.ts`** (new): the body of today's `notes.repo.ts` / `projects.repo.ts`, generic: `listSort` from
  the config order, `columns: { [source]: false }` for tables with `preview`, `withPreview`, the link filter (`none` →
  `isNull(object_id)`), `toListItem`/`toJson` from the config's field list. Overrides: `ownedRepo(table, config, { toJson?,
  beforeCreate?, beforeUpdate? })` for later special cases.
- **`backend/src/index.ts`**: one loop over `Object.keys(DATA)` mounting `crudRoutes({ access, create, update, filter, repo })` at
  `/api/<table-name-with-dashes>` (`/api/object-cards`). Images stay hand-mounted.
- **Delete** `backend/src/resources/notes/` and `backend/src/resources/projects/` (repos, routes, tests).
- **`backend/src/lib/ownedRepo.suite.ts`** + **`ownedRepo.test.ts`**: the in-memory SQLite harness from today's
  `notes.repo.test.ts`, then `describeOwnedRepo(name)` for every table: create/get/update/remove, owner isolation (404 for
  others), preview rules (only for tables with preview), list without the heavy column, order (pinned, position, id), pagination
  cursor, link pair and `objectType=none`, archived filter.
- **`backend/scripts/backfill-previews.mjs`**: every table with `preview` (from the config), `--table` to pick one (D26).

## 5 — Phase C: frontend config, registry, generic screens (notes + projects only)

- **`app/src/resources/resources.config.ts`** (new): per table `{ panelType, label, plural, icon, untitled, surfaces, sidebar:
  { group: 'own' | 'orphans', limit }, card?, fields? }`. `fields` is optional: by default the form shows every config field with
  the widget of its kind (`text` → `text`, `plainText` → new `textarea` widget, `richText` → `richText`), the first `text` field as
  heading. Placeholders and labels can be overridden per field.
- **`app/src/resources/createResource.ts`** (new): `createResource(name)` → `ResourceDefinition` with `api:
  createResourceApi('/api/<table>')`, `list: { order, toItem }` (omit the preview source), `ui.row` defaults (title or untitled,
  preview as subtitle, pinned), `loadPanel` = the generic panel. Replaces `notes.resource.ts`, `projects.resource.ts`.
- **`app/src/resources/registry.ts`**: `RESOURCES` from the UI config order; `resourcePanels()` binds the generic panel to each
  resource (`lazy(() => import('../components/ui/resource/ResourcePanel'))` with the resource from `resourceByPanelType`);
  new `resourcePages()` for `panels.ts` and `routes/index.tsx`.
- **Generic screens:** `components/ui/resource/ResourcePanel.tsx` (wraps `ResourceEditor`), `ResourceListPage.tsx`
  (`ResourcePage` + `ResourceModal`). Delete `resources/notes/NotePanel.tsx`, `resources/projects/ProjectPanel.tsx`,
  `pages/Notes/NotesPage.tsx`, `pages/Projects/ProjectsPage.tsx`. `panels.ts` spreads `resourcePages()`; `routes/index.tsx` maps
  them inside the existing `<RequireAuth>`/`<AppLayout>` routes (those elements are not changed).
- **`FieldRenderer.tsx`**: add the `textarea` widget (plain text, `TextAreaField`); `FIELD_WIDGET_NAMES` in `resources/types.ts`.
- **Filters (D19):** `useResourceList(resource, { trashed, filter, limit, enabled })`; `listKey` already serializes the filter;
  `listStore.apply` uses `matchesFilter` instead of its local `fits`; `createResourceApi.list` sends the filter through `toQuery`.
- **Dashboard from the registry:** `ColumnId = 'recent' | ResourceName`; `FIXED` = Recent + `resourcesWith('dashboard')`;
  `sectionsBelow` = dashboard resources not shown as columns; `ColumnBody` and `DashboardSections` render `ResourceColumn` /
  `ResourceSection` for any resource. Remove `RESOURCE_COLUMNS`.
- **Create modal from the registry:** tabs = `resourcesWith('create')` (new surface; `quickCreate` stays for the Dashboard input);
  the form = the title field + the first body field of the config; remove `RESOURCE_OF`, `ModalKind`, `PLACEHOLDER`, the mock branch.
- **Tests:** `registry.test.ts` (every resource has config in both files, a page route when `surfaces.page`, a panel when
  `surfaces.panel`, a Dashboard entry when `surfaces.dashboard`), `createResource.test.ts`, `columns.test.ts`, `listStore.test.ts`
  (filtered lists, `none`, apply with a link change moving an item out of Orphans), `lib/api/resource.test.ts` (query string).

## 6 — Phase D: folders, articles, object cards in the app

- `resources.config.ts`: three entries — folders (`LuFolderClosed`, sidebar group `orphans`), articles (`LuFileText`, `orphans`),
  object cards (`LuBox`, `orphans`, `card: 'image'`: the first `<img>` of the content as the picture, else `placeholderArt`), all
  with every surface (D11). Nothing else to write for them: that is the test of phases A–C.
- **Sidebar "Orphans"** (replaces `SidebarObjects`): one section, a `+` menu with the orphan kinds, then one group per resource of
  group `orphans` (`useResourceList(resource, { filter: { objectType: 'none' } })`), each with its rows, ⋯ menu, drag to panes and to
  the Trash (`ResourceSidebarSection`'s row code, extracted into a shared `ResourceRows`).
- **Object card look:** `ResourceCard` and `ObjectPanel` styles move to a `card` option of the UI config (`'plain' | 'image' |
  'map'`); `features/objects/ObjectPanel.tsx` and `placeholderArt` reused by the generic card.

## 7 — Phase E: mock maps and layouts behind the resource interface; mock cards removed

- **`app/src/lib/api/mockApi.ts`** (new): `createMockApi<T>(seed, { order })` → `ResourceApi` (list with filter + cursor
  pagination by index, get, create, update, remove), in memory, numeric ids (D24), small artificial delay off by default.
- **Maps** become a resource (`maps`, `panelType: 'map'`, `api: createMockApi(SEED_MAPS)`, fields `title`, `branchOf` hidden,
  sidebar group `orphans`, `card: 'map'` with `MapPreview`, panel = the board editor `MapPanel` via a `panel` override in the UI
  config). Branches: `createBranch` becomes a maps-only action in `features/board/branches.ts` using `useResourceActions(maps)`
  + `copyBoard`; duplicate and delete call `copyBoard` / `dropBoard` through `onDuplicated` / `onDeleted` hooks of the UI config.
- **Saved layouts** become a resource `layouts` with `createMockApi`, surfaces `trash` only, a `trashRow` override for the thumbnail;
  `LayoutsSection` reads `useResourceList(layouts)` and writes with `useResourceActions(layouts)`; `selectedId` and pending changes
  stay a small local store.
- **Removed:** `mocks/projects.ts`, `mocks/projectsStore.ts` (+ test), `mocks/sidebarTree.ts`, `features/objects/ObjectDialogs.tsx`,
  `useObjectActions.tsx`, `features/create/createFromModal.ts` (+ test), `components/layout/sidebar/treeDrop.ts` (+ test, pins
  move to D20), `features/dashboard/rows.ts`, `useRowDrop.ts`, `useRowSort` users of mock rows, the mock branches in
  `RecentList`, `TrashModal`, `TrashBin`, `sidebarDropState` (trash zone keeps only the resource path), `search.ts` (mock
  objects argument), `ListRows.ObjectListRow`, `CardShell` mock rename.
- **Board (D22):** `Link` → `{ to: 'item'; type; id }`; `linkName`, `PointLinks`, `ForwardLink`, `MapTitleBar`, `MapActions`,
  `MapPicker`, `Presenter`, `BranchesPopout` read maps through the maps resource (`useResourceList(maps)` / store snapshot) and
  other items with a small `useItemTitle(type, id)` hook over `useResourceItem`.
- **Others:** `ShareOptions` (`useItemTitle`), `LayoutsSection.createRandom` (candidates from the loaded orphan lists),
  `features/links/*` re-typed only (D23), `features/search/kinds.ts` (registry only).
- **Tests:** `mockApi.test.ts` (CRUD, filter, cursor, archived), `branches.test.ts` (on resource items), `search.test.ts`
  (items only), `layouts` (mock resource), `columns`/`registry` updated.

## 8 — Phase F: clean-up of the old structure

- Drop the temporary aliases from phase A; grep for `mocks/`, `findObject`, `useMockObjects`, `Note\b`/`Project\b` imports from
  deleted files: none left.
- `features/projects/` keeps only `MapPanel.tsx` and `strokeCodec.ts`; move them to `features/maps/` if nothing else is left.
- Remove dead CSS/classes only if lint/tsc flag them; no restyling.

## 9 — Phase G: guide for future agents

- **`instructions/data-config.md`** (new): how the two config files drive everything (diagram of section 2); recipes with the exact
  edits: add a field, rename a field (column rename migration), change a field's kind, remove a field, add a table, remove a
  table, turn a surface on/off, put a table in Orphans or its own section, give a table a link, override one repo method, add a
  non-CRUD route, move a mock resource to the server; the commands (`drizzle-kit generate`, apply `--local`/`--remote`, deploy,
  `npx tsc -b`, tests, lint) and the migration review rule (§1); what never to do (accept `userId` from the body, edit auth code,
  ship a migration that recreates an existing table).
- **`instructions/adding-a-resource.md`**: replace the step-by-step (schema / contract / repo / routes / mount) with a pointer to
  `data-config.md`; keep "Rules", "Relationships", "Images", "Routes that are not plain CRUD".
- **`COMMANDS.md`**: link `data-config.md` next to `adding-a-resource.md`.

## Testing

- After every phase: `npx tsc -b` in `app/` (D14), `npx tsc --noEmit` in `backend/` and `packages/shared/`, `npx vitest run` in
  all three, `npx oxlint src` in `app/` (no new warnings).
- Phase B: read the generated SQL; it must only create the three new tables (§1). Run the shared repo suite for all five tables.
- Phases C–E by hand, **after** the user applied the migration remotely and deployed (§1), with a throwaway account:
  1. Sidebar: Projects, Notes, Orphans (Folders, Articles, Object cards, Maps groups); create one of each from the section `+`.
  2. Open each in a panel and in its modal; edit, wait for the autosave; reload: the change is there.
  3. Delete one from the editor and one from the ⋯ menu: one `DELETE` request, the row disappears everywhere, no `GET` after it.
  4. Trash: move one of each to the Trash (menu and drag); the Trash opens with one `GET ?archived=true` per resource; restore.
  5. Dashboard: every resource as a column via ⋯ and as a row below; Create modal tabs for every resource.
  6. Search finds items of every resource; Recent lists opened items; Pinned shows pinned items.
  7. Maps: create, open the board, draw, branch, present, duplicate (board copied), delete.
  8. Network tab (`/api/ method:GET`): one list request per resource on Dashboard load, none on a second Trash/search open.
- Limits: dev hits the live Worker and the 120 requests/min limit; nothing is load-tested.

## Task list

| # | Task | Files |
|---|---|---|
| A1 | Field descriptors + tests | `packages/shared/src/fields.ts`, `fields.test.ts` |
| A2 | `defineTables`, types, filters, `matchesFilter` + type tests | `packages/shared/src/table.ts`, `table.test.ts` |
| A3 | The data config; notes/projects contract from it (aliases) | `packages/shared/src/data.config.ts`, `index.ts`; delete `notes.ts`, `projects.ts` |
| B1 | `ownedTable` + schema from the config; generate and review migration `0006` | `backend/src/lib/ownedTable.ts`, `db/schema.ts`, `drizzle/0006_*.sql` |
| B2 | `ownedRepo` + shared suite for all tables | `backend/src/lib/ownedRepo.ts`, `ownedRepo.suite.ts`, `ownedRepo.test.ts` |
| B3 | Mount by loop; delete per-table repos/routes/tests | `backend/src/index.ts`, `backend/src/resources/{notes,projects}/` |
| B4 | Generic previews backfill | `backend/scripts/backfill-previews.mjs`, `backend/package.json` (script args only) |
| C1 | UI config + `createResource` + registry | `app/src/resources/resources.config.ts`, `createResource.ts`, `registry.ts`, `types.ts` |
| C2 | Generic panel and list page; pages and panels from the registry | `components/ui/resource/ResourcePanel.tsx`, `ResourceListPage.tsx`, `panels.ts`, `routes/index.tsx`; delete Note/Project panel and page files |
| C3 | `textarea` widget | `components/ui/resource/FieldRenderer.tsx` |
| C4 | Generic list filters in hooks, store, API | `lib/resource/hooks.ts`, `listStore.ts`, `lib/api/resource.ts` + tests |
| C5 | Dashboard and Create modal from the registry | `features/dashboard/columns.ts`, `ColumnBodies.tsx`, `DashboardSections.tsx`, `useDashboardColumns.ts`, `features/create/CreateModal.tsx` + tests |
| D1 | Folders, articles, object cards in the UI config | `resources/resources.config.ts` |
| D2 | Sidebar Orphans section (grouped, `objectType=none`) | `components/layout/sidebar/SidebarOrphans.tsx` (new), `SidebarTree.tsx`, `ResourceSidebarSection.tsx`, `ResourceRows.tsx` (new) |
| D3 | Card looks from the config | `features/dashboard/ResourceCard.tsx`, `features/objects/placeholderArt.ts` |
| E1 | `createMockApi` + tests | `lib/api/mockApi.ts`, `mockApi.test.ts` |
| E2 | Maps as a mock resource; branches, boards, presenter, picker | `resources/resources.config.ts`, `features/board/*`, `features/projects/MapPanel.tsx` |
| E3 | Layouts as a mock resource | `mocks/layoutsStore.ts` → `features/layouts/*`, `TrashModal.tsx` |
| E4 | Remove the mock object store and everything only it used | files listed in §7 |
| E5 | Board links, share, links (re-typed), search kinds, Recent | `features/board/types.ts`, `linkName.ts`, `PointLinks.tsx`, `ForwardLink.tsx`, `features/share/ShareOptions.tsx`, `features/links/*`, `features/search/*`, `features/recent/RecentList.tsx` |
| F1 | Drop aliases, dead code, move map files | as found |
| G1 | Agent guide | `instructions/data-config.md` (new), `instructions/adding-a-resource.md`, `COMMANDS.md` |

**Files not touched:** `backend/src/auth.ts`, `backend/src/db/auth-schema.ts`, `backend/src/middleware/auth.ts`,
`backend/src/emails.ts`, `app/src/lib/auth-client.ts`, `app/src/lib/session-token.ts`, `app/src/features/auth/*`
(`RequireAuth`, `GuestOnly`), the sign-in/up/reset pages, CSRF and rate-limit middleware, `wrangler.jsonc`, the images routes and
repo (only read), the existing migrations `0000`–`0005`.

## Open items

- None blocking. Later plans: parent/child relations (tree in the sidebar, ownership check of the link, images under object
  cards), a real `maps` table and board saving, manual reordering by `position` on the Dashboard and in the sidebar.
