# 38 — Maps on the server: one R2 file per map, branches, and notes attached to one thing

**Goal:** maps stop being a mock. Each map is a row of a new D1 table `maps`, and everything drawn on it (its nodes) is **one brotli
file in a new private R2 bucket**, written when **Save** is pressed. A branch is a new row plus a copy of the file, with no per-node
writes. A note is attached to **one** thing (a map, a node of a map, or an article) through three columns on `notes`. That replaces
the local `articleNotes` / `mapNotes` stores, and picking a note for a node attaches it. Every request reads and writes as little as
possible (§9).
**Depends on:** 17a (board codec), 26 (config-driven tables), 34 (shared tables, `accessOf`), the Notes button of the map's title bar.
**Blocks:** sharing maps (a later plan: it rebuilds `object_rights`), converting a point into an article / object card (a later plan:
this one only writes `ref` in the file format).
**Not in this plan:** sharing maps, the conversion itself, real-time co-editing, applying the migration, creating the bucket or
deploying (the user does them, §10), any request to the live server.

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | **One file per map** in R2, holding all its nodes (the board codec's file, brotli) |
| U2 | **A new private bucket** (`map-boards`), no public domain: files are read and written only through the Worker, after the access check |
| U3 | **Maps are the owner's only** in this plan (no `share: true`: adding maps to sharing changes `object_rights`' CHECK, a table rebuild) |
| U4 | **A note is attached to one thing at most**: a map, a node of a map, or an article. Columns on `notes`, no link table |
| U5 | **Deleting the thing a note is attached to never deletes or changes the note** (0 writes); it shows as not connected |
| U6 | The note columns serve **maps, nodes and articles** now: the map's Notes panel, a node's notes and the article's Notes panel; `articleNotes.ts` and `mapNotes.ts` go |
| U7 | **Picking a note for a node attaches it** (it moves from wherever it was). Links to other kinds (articles, projects…) stay in the file as today |
| U8 | **Branches carry no per-node rows**: a node's `ref` lives only in the file, so a branch is one row and one file copy |
| U9 | The file format gets the fields of the later conversion now (`ref`, and `locked` / `hidden` flags), **with no UI** |
| U10 | **Saving is a Save button only** (no autosave) |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | The file's state is **columns on `maps`** (`file_key`, `file_version`, `file_size`, `saved_at`, plus `forked_from`, `forked_version`), added by `ownedTable(DATA.maps, extraColumns)`: not config fields, so no client can write them | One row read opens a map; a save is one write; a branch is 2 writes (a `map_files` table would make it 3) |
| P2 | **A new key for every save** (`boards/<mapId>/<uuid>.bin`): the new file is written first, then the row is moved to it with `WHERE file_version = <base>`. On success the old key is deleted, on a conflict the new one | A save is all or nothing; two tabs can never overwrite each other silently; R2 deletes are free operations, so no lifecycle rule is needed |
| P3 | `branchOf` stays an int field of the config (0 = none), set by the server's branch route | The branches' UI code (`branches.ts`, `BranchesPopout`, `MapPicker`) keeps working unchanged |
| P4 | **A branch uploads the board the client has open** (unsaved changes included): `POST /api/maps/:id/branches` (multipart: `title`, `file`) | No R2 read of the source, and the branch is what the user sees |
| P5 | **Duplicate** (the generic copy, `effects.copied`) copies the file on the server: `POST /api/maps/:id/file/copy { from }` (R2 get, then put) | The source map may not be open, so the client may not hold its board |
| P6 | Deleting a map for good deletes its file too: a new `RepoOverrides.removed(ctx, row)` hook; `remove` returns the deleted row | The Trash (archived) keeps the file; deleting for good leaves nothing in R2 |
| P7 | The server checks the upload's **size only** (at most 4 MB), not its contents | The owner is the only one who reads and writes it (U3); decoding brotli in the Worker costs CPU. Revisit with sharing |
| P8 | brotli quality stays 11 (`compress.ts`) | Saves are manual (U10), so the best compression costs nothing noticeable |
| P9 | The note columns are **checked by zod, not a SQL CHECK** (`attached_type` in the config's list; `attached_type`/`attached_id` set together; `attached_node` only with `maps`) | `ALTER TABLE … ADD` cannot add a CHECK: a CHECK would rebuild `notes` |
| P10 | **One partial index**: `notes_attached_idx (user_id, attached_type, attached_id, attached_node) WHERE attached_type IS NOT NULL` | Only attached notes are in it: attaching a free note is the row + 1 entry, detaching is the row + 1 entry |
| P11 | Attaching a note checks the target once: a map must be the user's (1 read); an article must be readable by them (`accessOf`, 1 read). A node's id is not checked: it lives in the file | A wrong node id only shows nothing |
| P12 | **A map's notes are read once per open map**: `?attachedType=maps&attachedId=<map>` (the map's own and every node's); the node lists and the Notes panel group that one list in memory | K reads per map open, 0 per selected node |
| P13 | The map's Notes panel shows the map's own notes, then each node's notes under the node's name | Everything attached to the map, in one place |
| P14 | Notes connected on this device (`articleNotes`, `mapNotes`) are **moved to the server once**: when an article or map page opens, each local connection becomes one note update, then the local entry is cleared | Nothing the user connected so far is lost; a few writes, once |
| P15 | Unsaved changes: a dot and "Save" in the title bar, **Ctrl/⌘+S**, and the browser's leave warning (`beforeunload`) while there are any | Save button only (U10) means a closed tab would lose them otherwise |
| P16 | A 409 (saved meanwhile on another tab or device) opens a modal: **Load the saved one** (yours is dropped) or **Save mine over it** (sent again with the new version) | Like articles' `ItemConflictModal` |
| P17 | The presenter reads a map's file only when it is near (its existing `near` rule); a thumbnail shows the placeholder until its map is loaded | No N file reads when the presenter opens |

## 1 — Risks and blockers

1. **The bucket must exist before deploying**: `npx wrangler r2 bucket create map-boards` (the user, §10). Without it, `/api/maps/*/file`
   answers 500 `SERVER_MISCONFIGURED` (`checkEnv`).
2. **Bucket privacy:** `map-boards` must never get a public domain or `r2.dev` access. Files are served only by `GET /api/maps/:id/file`.
3. **Unsaved work** lives only in memory (U10). The leave warning (P15) covers closing the tab, not a crash.
4. **Upload size:** a keepalive request can't carry a board (64 KB limit), so nothing is saved while the page closes. That is why
   P15 warns.
5. **`firstPosition` reads one row of every ordered table on each create** (`ownedRepo`). Adding `maps` (ordered) costs **+1 read on
   every create of every table**. Accepted here; Open item 1.
6. **Mock maps go away:** the seed maps (`MOCK_SEED`) and anything drawn in this session are not on the server. Nothing was ever saved,
   so nothing is lost.
7. An R2 write that succeeds while its D1 update fails for another reason than a conflict (a network error) leaves an unreferenced file.
   It is rare and harmless; Open item 2.

## 2 — Architecture

```
open a map ── GET /api/maps/:id/file ─► Worker: maps row (owner, file_key, file_version) ─► R2 get ─► bytes + X-File-Version
              boardFromFile ─► boardStore.loadBoard (no history step, saved = loaded)

Save ──────── boardToFile ─► PUT /api/maps/:id/file  (If-Match: <file_version>)
              Worker: owner check ─► R2 put new key ─► UPDATE maps … WHERE file_version = base
                      ├─ 1 row: delete the old key, answer the new version
                      └─ 0 rows: delete the new key, 409 { version }

branch ────── POST /api/maps/:id/branches (title + the open board) ─► R2 put ─► one batch: INSERT maps (+ UPDATE root's branch_of)

notes ─────── notes.attached_type / attached_id / attached_node ─► GET /api/notes?attachedType=maps&attachedId=<map>  (once per map)
              attach / move / detach = PATCH /api/notes/:id { attachedType, attachedId, attachedNode }
```

## 3 — Data: `packages/shared`

- **`data.config.ts`**:
  - `maps` moves here from `app/src/resources/mock.config.ts`: `{ access: 'owner', order: ORDERED, fields: { title: field.text(200),
    branchOf: field.int() }, requireOneOf: ['title'] }`. It is not `share: true` (U3).
  - `notes` gets `attach: { types: { map: 'maps', article: 'articles' } }`.
- **`table.ts`**: a new optional `attach` config, next to `link`. When present:
  - the contract's input/update take `attachedType` (a key of `attach.types`, or `null`), `attachedId` (`entityId | null`) and
    `attachedNode` (`entityId | null`), refined: type and id both set or both null; node only with `map`;
  - the filter takes `attachedType` / `attachedId` / `attachedNode` (`none` = the map itself, no node). The filter's type follows
    (`Filter<'notes'>`).
- **`boardFile.ts`** (new): `BOARD_FILE_MAX = 4 * 1024 * 1024`, the header name `X-File-Version`, and the types of the map routes'
  answers (`MapFileSaved = { version: number; savedAt: string }`, `BranchMade = { map: …; root: … | null }`).
- **`index.ts`** exports it.

## 4 — Backend

### 4.1 Tables (`backend/src/db/schema.ts`, `lib/ownedTable.ts`)

- `ownedTable(config, extra = {})`: an optional set of extra columns, written after the config's fields. `maps` uses it:
  ```ts
  export const maps = ownedTable(DATA.maps, {
    fileKey: text('file_key'),                                        // null: never saved (an empty board)
    fileVersion: integer('file_version').notNull().default(0),
    fileSize: integer('file_size').notNull().default(0),
    savedAt: integer('saved_at', { mode: 'timestamp' }),
    forkedFrom: integer('forked_from'),                               // the map it was branched from (no foreign key: it may be deleted)
    forkedVersion: integer('forked_version'),
  })
  ```
  None of them is in any index: a save changes no index entry.
- `ownedTable` for a config with `attach`: `attached_type text`, `attached_id integer`, `attached_node integer` (nullable, so the
  migration is three `ALTER TABLE notes ADD`), and the partial index of P10
  (`index(...).on(t.userId, t.attachedType, t.attachedId, t.attachedNode).where(sql\`${t.attachedType} IS NOT NULL\`)`).
- `npx drizzle-kit generate --name maps_and_note_attachments` → `backend/drizzle/0015_…sql`: `CREATE TABLE maps` + its list index,
  three `ALTER TABLE notes ADD`, `CREATE INDEX notes_attached_idx … WHERE …`. **Read it: it must not rebuild `notes`.**

### 4.2 Bindings

- `wrangler.jsonc`: `r2_buckets` gets `{ "binding": "BOARDS", "bucket_name": "map-boards" }`.
- `lib/env.ts`: `BOARDS: binding`. `worker-configuration.d.ts`: `BOARDS: R2Bucket;`.

### 4.3 Maps routes (`backend/src/resources/maps/`)

`/api/maps` CRUD comes from the data-config loop in `index.ts`. `maps.routes.ts` adds routes **before** it (`app.route('/api/maps', mapsFileRoutes)`
ahead of the loop), all signed in, all on the owner's row by `(id, user_id)`:

| Route | What it does |
|---|---|
| `GET /:id/file` | the row (1 read); no `file_key` → `204` with `X-File-Version: 0`; else the R2 object's bytes (`application/octet-stream`, `Cache-Control: private, no-store`) with `X-File-Version` |
| `PUT /:id/file` | body = the file (≤ `BOARD_FILE_MAX`, else 413), header `If-Match: <version>` (missing → 400). R2 `put` of a new key, then `UPDATE maps SET file_key, file_version = file_version + 1, file_size, saved_at WHERE id = ? AND user_id = ? AND file_version = ?`. 1 row → R2 `delete` of the old key, `200 { version, savedAt }`. 0 rows → R2 `delete` of the new key, then one read says why: 404 (not theirs / gone) or 409 `CONFLICT` with the current version |
| `POST /:id/branches` | multipart `title` + `file`. Reads the source row (1). R2 `put` of the file, then **one batch**: `INSERT maps (title, branch_of = root, position = source's, forked_from = id, forked_version = source's file_version, file_key, file_version = 1, …)` and, when the source had no group yet, `UPDATE maps SET branch_of = id WHERE id = ?`. `201 { map, root }` (`root` only when it changed) |
| `POST /:id/file/copy` | `{ from }` (Duplicate, P5). Reads both rows (2). R2 `get` of `from`'s file, `put` under a new key, `UPDATE` the target's file columns. Nothing to copy (never saved) → `204` |

- `maps.repo.ts`: the helpers (`mapRow(ctx, id)`, `newKey(mapId)`), and the override `removed: (ctx, row) => row.fileKey && ctx.env.BOARDS.delete(row.fileKey)`,
  passed to `ownedRepo(schema.maps, DATA.maps, { removed })` in the `index.ts` loop (a small per-table overrides map there).
- `lib/ownedRepo.ts`: `RepoOverrides.removed?(ctx, row)`. `remove` returns the whole row (`.returning()`) and calls it after
  `orphanChildren`.

### 4.4 Notes attached to one thing (`lib/ownedRepo.ts`)

- `checkAttach(ctx, fields)`, run like `checkParent` and **only when a write sets `attachedType`**: a `map` must be the user's
  (1 read by `(id, user_id)`); an `article` must be readable (`accessOf`, 1 read). Else 400 `UNKNOWN_REFERENCE` (`attachedId`).
  `attachedNode` is not checked (P11).
- The list filter (`attachFilter`): `attachedType` + `attachedId` (+ `attachedNode`, or `none` → `attached_node IS NULL`), so the
  list uses `notes_attached_idx`.
- **Nothing happens to notes when a map or article is deleted** (U5): `orphanChildren` is about `link` only and stays so.
- `notes` is a shared table: `updateShared` treats the three columns as **owner fields** (added to `OWNER_FIELDS` and
  `HIDDEN_FROM_OTHERS`). An editor of a shared note can't move it, and others don't see where it is attached.

## 5 — File format v2 (`app/src/features/board/boardCodec.ts`, `types.ts`)

- `VERSION = 2`. A reader for **1 and 2** (`decodeBoard` branches on the byte). `encodeBoard` writes 2.
- **Header** after `nextId count`: `extrasLength` then extras bytes (none yet). Later header fields (units, background, layers) are
  added there without another version bump; a reader skips what it doesn't know.
- **Every record's common part**, after `links`: `flags` byte (bit 0 `locked`, bit 1 `hidden`, bit 2 has `ref`), then
  `[ref type byte][ref id]` when bit 2 is set. `ref.type`: `1` articles, `2` objectCards (only added to, never renumbered).
- `types.ts`: `Base` gets `locked?: boolean`, `hidden?: boolean`, `ref?: { type: 'articles' | 'objectCards'; id: number }`.
  No UI reads them yet (U9).
- `Link` keeps `{ to: 'sidebar'; id }` for non-note items. Links to notes are no longer made (U7). A v1 file never existed on the
  server, so there is nothing to convert.

## 6 — Frontend: maps

### 6.1 The resource

- `resources/mock.config.ts`: `maps` and its seed go. `MOCK_DATA` stays (empty) for future mocks, and the registry keeps working.
- `resources/resources.config.ts` `maps`: its comment ("in memory only") changes. `effects.copied` → `copyMapFile(fromId, toId)`;
  `effects.deleted` → `dropBoard(id)` (the server deletes the file, P6).
- `lib/api/maps.ts` (new): `getMapFile(id)` → `{ bytes | null, version }`, `saveMapFile(id, blob, version)`,
  `createBranchOnServer(id, title, blob)`, `copyMapFile(from, to)` (on `request` from `client.ts`).

### 6.2 `features/board/boardStore.ts`

The same exports, plus loading and saving:

- `type Saved = { board: Board; version: number }` per map; `loadState(mapId): 'idle' | 'loading' | 'ready' | 'error' | 'gone'`.
- `loadBoard(mapId)`: reads the file once (two calls at the same time are one request), `boardFromFile`, sets it **without a history
  step**, and `saved = { board, version }`. `useBoardLoad(mapId)` for the screens.
- `isDirty(mapId)` = `getBoard(mapId) !== saved.board` (boards are immutable, so a reference compare; undoing back to the saved board
  is clean again). `useIsDirty(mapId)`.
- `saveBoard(mapId)`: `boardToFile` → `saveMapFile` with `saved.version` → `saved = { board: the one sent, version }`. Changes made
  while it was sending stay dirty. A 409 throws `MapConflict { version }` for the modal (P16).
- `copyBoard` stays for the branch's in-memory copy: the new map is shown at once, `saved` = the uploaded board, version 1.

### 6.3 Screens

- `features/maps/MapPanel.tsx`: `useBoardLoad(id)`. "Loading…", an error with Try again, or the editor. Opening a map someone deleted
  answers 404 → "Map not found".
- `features/board/MapTitleBar.tsx`: a **Save** button (`Button variant="text"`, shown while dirty, "Saving…" while sending, a dot
  beside the name while dirty). Ctrl/⌘+S in `BoardEditor`'s key handler. `beforeunload` while any map is dirty (one listener in
  `boardStore`).
- `features/board/MapConflictModal.tsx` (new, on `Modal`): P16's two choices.
- `features/maps/maps.ts` `createBranch`: `createBranchOnServer(mapId, name, await boardToFile(getBoard(mapId)))`, then the lists take
  the new map (and the changed root) through `notifyChanged` (`lib/resource/changes.ts`), and `copyBoard` + `saved` for the new id.
  `BranchesPopout` is unchanged.
- `features/board/presenter/Presenter.tsx`: `loadBoard(m.id)` for the maps that are `near` (P17); `BoardCanvas` / thumbnails show the
  empty board until then.

## 7 — Frontend: notes attached to one thing

- **One list per open map or article page** (P12): `useResourceList(notes, { filter: { attachedType: 'maps', attachedId } })`.
  For an article it is `{ attachedType: 'articles', attachedId }`.
- **Attach / move / detach** = `actions.update(noteId, { attachedType, attachedId, attachedNode })` (or all three `null`). The shared
  list store moves the note between the lists on screen without reading again.
- `features/articles/side/NotesPanel.tsx`: its connected list is the article's list. Connect / Disconnect are the updates above. "Other
  notes" are the user's notes not attached here; connecting one that is attached elsewhere moves it, and its card says "Moves it from
  <where>".
- `features/board/MapNotesPanel.tsx`: the map's list. The map's own notes first, then a group per node (its `layerLabel`, P13). Connect
  attaches to the map (`attachedNode: null`).
- `features/links/linkPick.ts`: for a **note**, `isLinked` reads the map's list (the note's `attached*`) and `toggleSidebarLink` attaches
  the note to the node, or detaches it. Other kinds keep the file link. The sidebar's link icon (`Sidebar.tsx`) is unchanged.
- `features/board/sidebar/common/ObjectLinksSection.tsx` and `PointLinks.tsx`: a node's notes (from the map's list, grouped by
  `attachedNode`) are shown with its links, and their ✕ detaches.
- **The local stores go** (P14): `features/articles/side/articleNotes.ts` and `features/board/mapNotes.ts` become a one-time
  `moveLocalNotes(kind, id)`. It reads the old local entry, sends one update per note, and clears it, run when the page opens.
  `noteConnections` goes with them.

## 8 — Errors and edge cases

- A map in the Trash: the owner still opens and saves it (owner only). Restoring keeps its file and its notes (U5).
- A note attached to a deleted map or article: it is in no list anyone reads. Its own page shows no attachment (the target answers 404).
  Attaching it again overwrites the columns.
- A node deleted from the board while notes are attached: they stay attached to that node id (ids are never reused: `nextId`) and
  show under "Deleted object" in the map's Notes panel, where they can be detached or moved.
- A branch of a branch: `branch_of` is the group's root (as today); `forked_from` is the direct parent.
- `PUT` with a stale version after the map was deleted: 404, "Map not found".

## 9 — Reads and writes (D1) and R2 operations

K = notes in the list. Writes count the row and each index entry that changes.

| Request | D1 reads | D1 writes | R2 |
|---|---|---|---|
| Open a map (`GET /:id/file`) | 1 | 0 | 1 get (none for a never-saved map) |
| The map's notes (once per open map) | K | 0 | 0 |
| Save (`PUT /:id/file`) | 1 | 1 | 1 put + 1 delete (free) |
| Save that conflicts | 1 + 1 | 0 | 1 put + 1 delete |
| New map (generic create) | 1 per ordered table (`firstPosition`) | 2 | 0 |
| Branch | 1 | 2 (+1 the first branch of a group) | 1 put |
| Duplicate's file copy | 2 | 1 | 1 get + 1 put |
| Rename, pin, Trash, restore | 0–1 | 1–2 | 0 |
| Delete for good | 0 | 2 | 1 delete (free) |
| Attach a free note | 1 (target) | 2 | 0 |
| Move a note (to another node, map or article) | 1 (target) | 3 | 0 |
| Detach a note | 0 | 2 | 0 |
| Delete a map / article that has notes | as today | as today (notes untouched) | — |

## Testing

- **Backend** (`vitest`, in-memory SQLite as today, plus a fake `BOARDS` object for `get` / `put` / `delete` in `ownedRepo.suite.ts`):
  - `maps` passes the shared `describeOwnedRepo` suite, which runs for every config table.
  - `maps.routes.test.ts` (on `app.request` with a test env):
    - a file round-trips and its version goes up;
    - a stale `If-Match` → 409, and the new key is deleted;
    - another user's map → 404; over 4 MB → 413;
    - a never-saved map → 204;
    - a branch makes 1 row (2 for the first branch of a group) with `forked_from` / `forked_version`;
    - Duplicate copies the file;
    - deleting for good deletes the file, and the Trash keeps it.
  - Notes:
    - attach to own map / readable article;
    - attach to someone else's map → 400;
    - type without id, or node with `article` → 400;
    - the list by map / node / `none`;
    - deleting the map leaves the note unchanged;
    - an editor of a shared note can't change `attached*`.
  - `migrations.test.ts`:
    - 0015 keeps the old notes' data (`attached_*` null);
    - `EXPLAIN QUERY PLAN` of the map's notes list uses `notes_attached_idx`;
    - `notes` was not rebuilt (its rows keep their ids).
- **App:**
  - `boardCodec.test.ts`: v2 round trip with `locked` / `hidden` / `ref`, a v1 file still reads, header extras are skipped.
  - `boardStore.test.ts`: load once, dirty / clean (undo back to saved is clean), save keeps later changes dirty, 409 → `MapConflict`.
  - `linkPick` (a note attaches, other kinds link).
  - `NotesPanel` / `MapNotesPanel` grouping (pure helpers).
  - `buttons.test.ts` still passes.
- No request to the live server. The first real check is after §10.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `attach` config + contract + filter; `maps` in the data config; `boardFile.ts` | `packages/shared/src/table.ts`, `data.config.ts`, `boardFile.ts`, `index.ts` (+ tests) |
| 2 | `ownedTable` extra columns + attach columns + partial index; `maps` in the schema; generate and read 0015 | `backend/src/lib/ownedTable.ts`, `db/schema.ts`, `drizzle/0015_*.sql`, `db/migrations.test.ts` |
| 3 | `BOARDS` binding | `backend/wrangler.jsonc`, `lib/env.ts`, `worker-configuration.d.ts` |
| 4 | `ownedRepo`: `removed` hook, `checkAttach`, attach filter, owner fields | `backend/src/lib/ownedRepo.ts`, `ownedRepo.suite.ts` (+ fake bucket) |
| 5 | Map file routes, branch, copy; mount before the loop | `backend/src/resources/maps/*`, `backend/src/index.ts` (+ tests) |
| 6 | File format v2 | `app/src/features/board/types.ts`, `boardCodec.ts` (+ test) |
| 7 | Maps API + `boardStore` load / dirty / save | `app/src/lib/api/maps.ts`, `features/board/boardStore.ts` (+ test) |
| 8 | Map out of the mocks; effects | `app/src/resources/mock.config.ts`, `resources.config.ts` |
| 9 | Loading, Save, Ctrl+S, leave warning, conflict modal | `features/maps/MapPanel.tsx`, `features/board/MapTitleBar.tsx`, `BoardEditor.tsx`, `MapConflictModal.tsx` |
| 10 | Branch on the server; presenter loads near maps | `features/maps/maps.ts`, `features/board/presenter/Presenter.tsx` |
| 11 | Notes: article panel, map panel, node notes, link pick, local stores moved once | `features/articles/side/NotesPanel.tsx`, `articleNotes.ts`, `features/board/MapNotesPanel.tsx`, `mapNotes.ts`, `features/links/linkPick.ts`, `ObjectLinksSection.tsx`, `PointLinks.tsx` |
| 12 | Docs | `instructions/data-config.md` (maps, `attach`), `instructions/backend-setup.md` (the bucket), `COMMANDS.md` (§10) |
| 13 | All checks: `npx tsc`, `oxlint`, `vitest` in `backend/`, `app/`, `packages/shared/` | — |

Files **not** touched: the auth code (`backend/src/auth.ts`, `db/auth-schema.ts`, `middleware/auth.ts`, `app/src/lib/auth-client.ts`),
the `images` routes and the `growme-images` bucket, `object_rights` and its triggers (0012), the messages and comments (34, 37),
`docs/plans/01`–`37`. No package installed, no bucket created, no migration applied, no deploy.

### 10 — What the user runs (after the code)

```bash
# Map/backend/
npx wrangler r2 bucket create map-boards                 # once: the private bucket (no public access)
npx wrangler d1 migrations apply map-db --local          # optional, local database
npx wrangler d1 migrations apply map-db --remote         # after reading drizzle/0015_*.sql
# Map/
npm run build --workspace app && npm run deploy --workspace backend
```

## Open items

1. `firstPosition` (+1 read on every create of any table, §1.5): leave it, or keep maps out of it (maps never share a list with
   other tables), which needs a flag in the config?
2. Unreferenced files after a failed D1 update (§1.7): ignore them, or add a rare cleanup later?
3. P13: should the map's Notes panel show the nodes' notes too, or only the map's own?
4. Should a map in the Trash still be saveable, or read-only until restored?
