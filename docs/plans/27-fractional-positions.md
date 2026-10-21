# 27 — Reordering with fractional indexing (string positions)

**Goal:** every ordered table keeps its order in a **string** `position` (a fractional-indexing key), so moving an object writes
**one row** and never renumbers others. One shared module (in `packages/shared`, on top of the `fractional-indexing` library)
makes and checks keys for both the app and the backend. Objects are reordered by drag and drop in the Dashboard's project rows
and in the sidebar; a move shows **at once** (the same optimistic `update` the app uses today) and goes back if the server refuses.
**Depends on:** 26 (config-driven tables), the parent/child work (link pair, `parentDrop.ts`, rows per project), the optimistic
`update` in `app/src/lib/resource/hooks.ts` (`patchChanged` / `undo`).
**Blocks:** dragging project rows on the Dashboard (open item), a real `maps` table.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Fractional indexing** (keys like `a0`, `a1`, `a0V`; base-62 digits, compared byte by byte), not integers with gaps and not Jira's LexoRank: one row written per move, no renumbering, no background job | User |
| D2 | **`position` becomes a string** in every ordered table (`projects`, `notes`, `folders`, `articles`, `object_cards`) and in the mock tables (`maps`). Changing the remote values is allowed (the migration rewrites them once) | User |
| D3 | **Use the existing library** `fractional-indexing` (MIT; `generateKeyBetween`, `generateNKeysBetween`), installed in `packages/shared` | User + default |
| D4 | **The key logic lives once in `packages/shared/src/position.ts`**, used by the backend (contract, create default, cursor) and the app (store order, drop placement, mock API). Thin helpers on each side build on it | User |
| D5 | **A move is the existing `update`**: `actionsOf(resource).update(id, { position })` (plus `objectType`/`objectId` when the parent changes). It shows at once through `patchChanged`; a refusal takes the fields back through `undo` (per field, a later move is not undone). No new route | User |
| D6 | **"If the request fails, redo it"** is read as **put it back where it was** (undo). No automatic retry | Default (confirm) |
| D7 | **New objects go at the end** of their list: the client sends a key after the last item it shows **when it holds the whole list**; otherwise (a list with more to load, the Create modal, Quick create) the server picks a key after the last item of the same table, parent and pinned group (one indexed read) | User |
| D8 | **Dashboard project rows follow the projects' position** (the sidebar's Projects order), replacing today's newest-first sort. Reordering projects is done in the sidebar | User |
| D9 | **Pinned stay first; a drag stays in its group.** Drop targets that would put a pinned item among unpinned ones (or the reverse) are refused; Pin/Unpin stays in the ⋯ menu | User |
| D10 | **One position per object, shared by every screen.** A row mixes tables: its cards are sorted by `(pinned desc, position, table name, id)` across tables (keys of all tables are comparable). Moving a note inside a project also changes its relative order in the sidebar's Notes list | Default |
| D11 | **Drop rules (Dashboard rows):** before/after a card → that place in the row; on the empty part of a row → the end. A drop in the row the object already belongs to changes **only** `position` (an item inside a folder stays in its folder); a drop in another row also sets the parent (that project, or none for Orphans), in the same PATCH | Default |
| D12 | **Drop rules (sidebar):** before/after a node → that node's parent and that place; into a project/folder node → its last child. Projects only among projects (top level); notes in the Notes section only among notes (parent unchanged). The Pinned section takes no drops | Default |
| D13 | **Reordering is off while a row is sorted by date** (Sort by Newest/Oldest); it works in "Manual order" | Default |
| D14 | **Key validation on the server** with the library itself (`isPosition`: it must be a valid key, at most 64 chars) in the zod contract; equal keys are allowed (ties fall back to id) | Default |
| D15 | **Existing rows get keys in the migration**, in SQL, in today's order per user and table (`pinned desc, id`): `a0, a1, …` (the library's own integer keys). One UPDATE per table, N rows written once | Default |
| D16 | **Typecheck the app with `npx tsc -b`**; tests only in memory; `--remote` migration and deploy are the user's steps | Default |
| D17 | **Auth code is not touched** | User (standing) |

## 1 — Risks and blockers

- **Production migration on `notes`** (real data). The column type cannot change in place in SQLite. The migration is written by
  hand (D15, §3.3): drop the list index, add a text column, fill it, drop the old column, rename, recreate the index. No table
  copy. It is tested on an in-memory database with the old schema before anything runs on D1. Read the SQL before `--remote`.
- **Old app vs new Worker:** between the migration and the deploy, an old app sends numeric positions (it never does today: no
  screen writes `position` except mock maps) and old cursors (numbers). After the deploy, old cursors fail with `400 Invalid
  cursor`; the store reloads the list. Apply `--remote`, then deploy right away (as in plan 26).
- **The library must be installed** (`npm install fractional-indexing --workspace packages/shared`), and checked to bundle in the
  Worker (ESM, no Node APIs). Pin the exact version.
- **The SQL key formula must equal the library's keys.** A test compares `integerKey(n)` (the TS twin of the SQL) with
  `generateNKeysBetween(null, null, n)` for n up to 10 000 (§3.1).
- **Partial lists in merged rows:** each table loads its first page; a row may lack an item of another table that belongs between
  two visible cards. The new key is still between the two visible neighbours (the order stays consistent); its place relative to
  the hidden item is only known after "Load more". Accepted.

## 2 — Architecture

```
packages/shared/src/position.ts      ★ the key logic, once (wraps fractional-indexing)
  positionAfter(last) / positionBefore(first) / positionBetween(a, b) / positionsBetween(a, b, n)
  comparePositions(a, b)   byte order, the same as SQLite's BINARY collation (never localeCompare)
  isPosition(key)          the library accepts it, ≤ 64 chars
  integerKey(n)            the n-th key a0, a1, … (the migration's formula, for its test)
  positionField            zod: string refined by isPosition
        │
        ├── backend: order.ts contract → ownedTable column (text) → sort.ts cursor (strings) → ownedRepo.create default
        └── app:     lib/resource/order.ts (compareFor) → listStore placement (instant)
                     lib/resource/reorder.ts (where a drop lands → { position, parent? }) → actionsOf().update
                     features/drag/placeDrop.ts (the drop zone, replaces parentDrop.ts) ← Dashboard cards/rows, sidebar nodes
```

**A move, end to end:** drop → `placeDrop` zone computes the neighbours from the target's ordered list → `reorder.placement()`
gives `position` (and the parent when it changes) → `actionsOf(resource).update(id, patch)` → `patchChanged` moves the item in
every list at once (`compareFor` knows string positions) → `PATCH /api/<table>/:id` → success: the server's row replaces it;
failure: `undo` puts `position` (and parent) back.

## 3 — Details

### 3.1 Shared (`packages/shared`)

- `package.json`: dependency `fractional-indexing` (exact version).
- New `src/position.ts` (exports above) and `src/position.test.ts`:
  - `positionBetween(a, b)` returns `null` when `a >= b` (ties, bad input) instead of throwing; callers handle ties (§3.4).
  - `integerKey(n)`: `n < 62` → `'a' + D[n]`; `n < 62 + 62²` → `'b' + 2 digits`; else `'c' + 3 digits` (D = the library's
    base-62 digits `0-9A-Za-z`). Test: equal to `generateNKeysBetween(null, null, 10000)`.
  - `comparePositions` vs `Array.sort` default and vs SQLite order (shared test vectors).
- `src/order.ts`: `position: positionField` (was `z.number().int().min(0).max(POSITION_MAX)`), `OrderOutput` → `position: string`;
  `POSITION_MAX` removed. `src/index.ts` exports `position.ts`.
- `src/table.test.ts`: contract tests for valid/invalid keys.

### 3.2 Backend

- `backend/src/lib/sort.ts`:
  - `positionColumn = () => text('position').notNull().default('a0')` (the server always sets it; the default only matters to
    raw SQL).
  - Cursor values may be strings: `decodeValues` accepts a number or a string per key (the position key must be a string that
    passes `isPosition`); `cursorOf` keeps `position` as is (no `Number()`).
  - `positionBetween` and `POSITION_STEP` (the integer helpers) are removed with their tests.
- `backend/src/lib/ownedRepo.ts`, `create`: when the table has `position` and the input has none, read the last key of the same
  group and use `positionAfter(last)`:
  `SELECT position FROM t WHERE user_id = ? AND archived = 0 [AND object_type IS ? AND object_id IS ?] AND pinned = ?
  ORDER BY position DESC, id DESC LIMIT 1` (served by the list index: one row read). Inputs that carry `position` read nothing
  more. `update` is unchanged (the contract checks the key).
- `ownedRepo.suite.ts` (runs for every table): create without position goes last in its group; create with a position keeps it;
  update moves one row only; paging with string positions and ties; a bad key is `400`.

### 3.3 Migration (`backend/drizzle/0008_*.sql`)

Generated by `npx drizzle-kit generate` (for the snapshot), then its SQL body is replaced by hand, per table
(`projects`, `notes`, `folders`, `articles`, `object_cards`):

```sql
DROP INDEX `notes_list_idx`;
ALTER TABLE `notes` ADD `position_key` text DEFAULT 'a0' NOT NULL;
UPDATE `notes` SET `position_key` = k.key FROM (
  SELECT id, <integerKey(row_number() OVER (PARTITION BY user_id ORDER BY pinned DESC, id) - 1)> AS key FROM `notes`
) AS k WHERE `notes`.id = k.id;
ALTER TABLE `notes` DROP COLUMN `position`;
ALTER TABLE `notes` RENAME COLUMN `position_key` TO `position`;
CREATE INDEX `notes_list_idx` ON `notes` (… same columns as now …);
```

`<integerKey(…)>` is the CASE expression of §3.1 with `substr('0123…xyz', d + 1, 1)` per digit. A backend test applies the old
schema (migrations up to `0007`), inserts rows, runs `0008` on `node:sqlite`, and checks: keys equal `integerKey`, the list order
is the same as before, the index exists. Then `drizzle-kit generate` must report no changes.

### 3.4 App: order, placement, mock

- `app/src/lib/resource/order.ts` `compareFor`: `comparePositions(a.position ?? '', b.position ?? '')` instead of number subtraction.
  `order.test.ts` updated.
- New `app/src/lib/resource/reorder.ts` (pure, `reorder.test.ts`), defined once for the Dashboard and the sidebar:
  - `compareEntries(a, b)`: `(pinned desc, position, resource name, id)`, for lists that mix tables (rows, a project's children).
  - `placement(list, movedKey, index)`: `list` is the ordered target list without the moved item; returns
    `{ position }`, or `{ position, fixes }` when the two neighbours have equal keys (it gives the tied run new keys with
    `positionsBetween` and returns them as extra updates; rare, two tabs), or `null` when the place crosses the pinned boundary.
  - `endOf(list)`: the key for "at the end", used by create when the list is complete (D7).
- `app/src/lib/resource/hooks.ts`: no change to `update` (it already shows at once and undoes per field). A small
  `moveItem(resource, id, patch, fixes?)` sends the main update and the fixes through the same `actionsOf().update`.
- `app/src/lib/api/mockApi.ts`: a new row gets `positionAfter(last)` (the server's rule); `features/maps/maps.ts` `reorderMaps`
  uses `positionsBetween(null, null, n)` instead of `(i + 1) * 1024`.
- Creates that know their whole list send `position: endOf(list)`: `ResourceCreateDialog` from a Dashboard row (`initial`), the
  sidebar "+" (`SidebarTree`). Others send none (server default).

### 3.5 App: drop zone and targets

- `features/drag/parentDrop.ts` becomes `features/drag/placeDrop.ts` (zone `place`):
  - Droppable data: `{ zone: 'place', priority: 2, kind: 'card' | 'row' | 'node', parent, nodeId?, entry?, list: () => Entry[] }`
    (`list` gives the target's current ordered siblings; `entry` is the card/node under the pointer).
  - `target(e, item)`: side from the pointer (cards: left/right half; sidebar nodes: `rowDropPosition` — before / into (25–78% on
    a project or folder) / after, revived from `treeDrop.ts` in git history), then the rules D9–D13; returns
    `{ key, side, parent, index }` or null.
  - `drop`: `placement(...)` → `moveItem(...)`; fall-into effect for "into" as today.
  - `ObjectDragInfo` keeps `parent` (exists) and gains `pinned`, so targets can refuse a group change without reading the store.
- **Dashboard** (`DashboardSections.tsx`, `ResourceCard.tsx`): cards are also droppables (`kind: 'card'`); the row strip keeps its
  droppable (`kind: 'row'` = end of row). An insertion bar between cards shows the target (`useObjectDrop`). Row cards and the
  project rows sort with `compareEntries` / `compareFor` (D8, D10); `sortByDate` stays for the date sorts (D13).
- **Sidebar** (`ResourceRows.tsx`): `dnd.dropData` for every node except Pinned copies; `dnd.target` takes
  `{ nodeId, position: 'before' | 'after' | 'into' }` (the TreeView already draws the line and the ring). Children under a project
  sort with `compareEntries`.
- `components/layout/sidebar/SidebarDrop.tsx` registers `place` instead of `parent`; `sidebarDropState.ts` exposes the side.

## Testing

- `packages/shared`: `position.test.ts` (library wrapper, `integerKey` = library, byte order), `table.test.ts` (contract).
- `backend`: `sort.test.ts` (string cursors, ties), `ownedRepo.suite.ts` (create default, move one row, bad key), migration test
  on `node:sqlite` (§3.3). In memory only.
- `app`: `order.test.ts`, `reorder.test.ts` (placement, ties, pinned boundary, end of list, mixed tables), `optimistic.test.ts`
  (a position move shows at once and goes back on a refusal; parent + position in one update), `placeDrop` rules as pure functions,
  `tree.test.ts` order.
- Each phase ends with `npx tsc -b` (app), backend/shared typecheck, all tests, `vite build`.
- Browser check with the **local** backend (`wrangler dev`, migration `--local`), never against the live Worker.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Install `fractional-indexing` in shared; add `position.ts` + tests (`integerKey` = library) | `packages/shared/package.json`, `src/position.ts`, `src/position.test.ts`, `src/index.ts` |
| 2 | Contract: `position` string (`positionField`), types | `packages/shared/src/order.ts`, `src/table.test.ts` |
| 3 | Backend column text, string cursors, remove integer helpers | `backend/src/lib/sort.ts`, `sort.test.ts` |
| 4 | Create default (last key of the group, one indexed read) + suite tests | `backend/src/lib/ownedRepo.ts`, `ownedRepo.suite.ts` |
| 5 | Migration `0008` (hand-written body, snapshot from drizzle-kit) + migration test; `drizzle-kit generate` clean | `backend/drizzle/0008_*.sql`, `backend/drizzle/meta/*`, a migration test file |
| 6 | App order: `compareFor` with string keys; mock API default; maps reorder | `app/src/lib/resource/order.ts`, `lib/api/mockApi.ts`, `features/maps/maps.ts` |
| 7 | `reorder.ts` (compareEntries, placement, endOf) + `moveItem` + tests (incl. optimistic move/undo) | `app/src/lib/resource/reorder.ts`, `hooks.ts`, tests |
| 8 | Merged order in rows, sidebar children and project rows (D8, D10) | `features/dashboard/DashboardSections.tsx`, `tree.ts`, `components/layout/sidebar/ResourceRows.tsx` |
| 9 | `placeDrop.ts` zone (replaces `parentDrop.ts`) with pure rule functions + tests | `features/drag/placeDrop.ts`, `features/workspace/types.ts`, `SidebarDrop.tsx`, `sidebarDropState.ts` |
| 10 | Dashboard targets: cards before/after, row end, insertion bar; off under date sorts | `DashboardSections.tsx`, `ResourceCard.tsx`, `ItemCard.tsx` |
| 11 | Sidebar targets: before/after/into, rules per section | `ResourceRows.tsx`, `SidebarTree.tsx` |
| 12 | Creates send `position` when the list is complete | `ResourceCreateDialog.tsx`, `DashboardSections.tsx`, `SidebarTree.tsx` |
| 13 | Docs: positions and reordering | `instructions/data-config.md`, `COMMANDS.md` (migration note) |
| 14 | User: `migrations apply map-db --local`, browser check with the local backend; then `--remote` and deploy | — |

Files **not** touched: auth code (`backend/src/auth*`, `backend/src/db/auth-schema.ts`, the sign-in/up pages), images routes,
`wrangler.jsonc`.

## Open items

- D6: is "redo it" really "put it back" (current plan), or should a failed move be **retried** first?
- Dragging **project rows** on the Dashboard (by their header) to reorder projects: later, or in this plan?
