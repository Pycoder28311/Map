# 12 — Dashboard columns and sections

**Goal:** below the quick note input, the Dashboard gets **three columns** (Cloudflare-homepage style),
by default **Recent**, **Notes** and **Maps**. Under them are **horizontal sections**: **Orphans**, then
one per project. Each column's label has a 6-dot **grip** on its left, to drag the column to another
place, and a **⋯** button on its right, to show something else in that column. Picking another column
makes the two slide and trade places. Picking a section from below lifts that section up into the
column; its items turn into column rows, and the column that was there goes away.

**Depends on:** 10 (object drag, links), 11 (QuickCreate, `Dropdown`, the `article` kind).
**Blocks:** nothing. Only the Dashboard area below the input changes. The navbar and sidebar in the
mockup are **not** part of this plan.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Build the mockup's sections under the columns: **Orphans** (top-level notes and articles), then **one horizontal row of object cards per project**. They replace today's `ProjectList` card grid. The mockup's Sort by / Create buttons and the cards' ⋯ menus are not part of this plan | User |
| D2 | A column replaced by a section **goes back where it belongs**. Orphans and Project N return to their usual place among the sections below. Recent, Notes, Maps and Projects simply stop showing; they can be picked again from any ⋯ menu. A section shown as a column is hidden below, so nothing ever shows twice | User |
| D3 | **Recent** is kept **in this browser** (`localStorage`, per signed-in user id): the last 20 things opened, newest first. That covers objects, pages (Notes, Projects, Dashboard), pane combinations and saved layouts | User |
| D4 | Always **3 columns**. The ⋯ list holds Recent, Notes, Maps, Projects, Orphans and each project, by name. The column's own entry is shown but can't be clicked (checked, disabled). Entries already in another column say so ("· column 2") | User |
| D5 | The column choice and order are kept **in this browser** too (`localStorage`, per user). Defaults: `['recent', 'notes', 'maps']` | Default |
| D6 | **Picking** an entry for column *i*: one already in column *j* → the two **trade places** (slide). A section from below → it **leaves the sections and moves up** into column *i* (its rect glides to the column's), and the old column goes away per D2 | User |
| D7 | **Dragging** by the grip: the columns re-order live while the column is held (like dragging panes), and dropping keeps that order. Columns only: a column can't be dropped on the sidebar, panes or the trash, and dragging one shows no pane drop zones | User (+ live preview default) |
| D8 | **Column rows** (all kinds): icon, name, a small hint (a note's project; a map's project; a pane combination's panel count), and the row opens its target on click. Object rows are draggable like everywhere else (`useObjectDrag`, `source: 'pane'`, so no pane drop zones, as in the earlier change), and project and map rows take note links (`useLinkNode`). At most 8 rows, then a "Show all" link (Notes → `/notes`, Projects → `/projects`) or a "Show more" toggle | Default |
| D9 | **Section cards** (as in the mockup): a fixed-width card with a gray preview area, the name, and the kind and link count. The row scrolls sideways when it's too long, and cards are draggable like their sidebar rows. "Open" on hover opens the object (`OpenAsPanelButton` also shows) | Default |
| D10 | Widths follow the mockup: the input and the columns share a ~54rem column; the sections are wider (~65rem). Below `md` the columns stack (one per row) and the drag still works vertically | Default |
| D11 | Today's header ("Signed in as…" + Sign out) moves to the bottom of the page, unchanged. The count card and the "Go to projects" link go away | Default |
| D12 | A column whose source is gone (an archived or deleted project) falls back to the first default (Recent / Notes / Maps) that isn't already shown | Default |

## 1 — Risks

1. **One `DndContext`.** Column drags join the shared context (`WorkspaceProvider`). They need their
   own drag kind (`'column'`), so object drop zones (`objectOf` → undefined), `dropSpots` and the trash
   ignore them. The generic DragOverlay label (`!objectOf(dragging)`) is fine as their floating look.
2. **Recording "Recent" from URLs.** Everything that opens something ends in a navigation
   (`useWorkspace().go`, links, layout tiles), so recording from `useLocation` catches all of it in
   one place. Opening a saved layout is recorded from `selectedId` (layoutsStore), because its URL
   alone looks like any other combination.
3. **Animations between two different elements** (a section's card row → a column). Both get the same
   `data-dash-block` key, so a FLIP from the old rect to the new one works across them (like
   `paneFlip.ts`). With reduced motion it simply swaps.

## 2 — Architecture

```
DashboardPage
 ├─ QuickCreate                          (plan 11)
 ├─ DashboardColumns                     3 × Column, order + choices: useDashboardColumns (localStorage)
 │    Column ─ ColumnHeader: grip (useDraggable kind 'column') · label · ⋯ (Dropdown, trigger = dots)
 │           └─ ColumnBody by source: RecentList · NotesList · MapsList · ProjectsList · OrphansList · ProjectItems
 │                                    (all render ColumnRow)
 ├─ DashboardSections                    Orphans + each project not shown as a column: SectionRow of SectionCard
 └─ header (signed in as… / Sign out)    moved from the top (D11)

features/recent/   recentStore.ts (+test)   useRecordRecent() in AppLayout
features/dashboard/ columns.ts (+test)      useDashboardColumns.ts   blockFlip.ts
```

### Column sources (`features/dashboard/columns.ts`, pure, tested)

```ts
export type ColumnId = 'recent' | 'notes' | 'maps' | 'projects' | 'orphans' | `project:${string}`
export const DEFAULT_COLUMNS: ColumnId[] = ['recent', 'notes', 'maps']
/** Section kinds: they live below when not a column */
export const isSection = (id: ColumnId) => id === 'orphans' || id.startsWith('project:')
/** Column i shows `choice`: already shown → swap; else replace (the old one goes back / away, D2) */
export function pickColumn(columns: ColumnId[], i: number, choice: ColumnId): ColumnId[]
/** Drag: column `from` placed at `to`, the others shift */
export function moveColumn(columns: ColumnId[], from: number, to: number): ColumnId[]
/** Sections shown below: Orphans, then each project, minus those that are columns */
export function sectionsBelow(columns: ColumnId[], projectIds: string[]): ColumnId[]
/** Stored columns made valid: unknown or gone ones replaced (D12), duplicates removed, always 3 */
export function validColumns(stored: unknown, projectIds: string[]): ColumnId[]
/** The ⋯ menu's entries for column i: label, whether it's this column, which column has it */
export function menuEntries(columns: ColumnId[], i: number, projects: { id: string; name: string }[])
```

## 3 — Recent (`features/recent/`)

- `recentStore.ts`: `RecentEntry = { key: string; kind: 'object' | 'page' | 'workspace' | 'layout'; href: string; ref: PanelRef | { layoutId: string } | { panels: PanelRef[] }; at: number }`.
  Pure helpers `addRecent(list, entry)` (dedupe by `key`, newest first, cap 20) and
  `entryForLocation(pathname, search, registry)`:
  - a page route (`/notes`, `/projects`, `/dashboard`) → `page`;
  - `/workspace` with one panel → `object` (or `page` for registry pages);
  - two or more panels → `workspace` (key = the canonical `workspaceHref`).

  It also keeps `load(userId)` / `save(userId, list)` (`localStorage` key `map:recent:<userId>`, wrapped
  in try/catch) and a small subscribe/`useRecent()` like the other stores.
- `useRecordRecent()` (called once in `AppLayout`): on every location change it records
  `entryForLocation`. When `useLayoutsState().selectedId` changes to an id, it records a `layout` entry.
  The user id comes from `authClient.useSession()`.
- **RecentList** resolves each entry live:
  - objects: name and icon via `findObject` and `KIND_ICON`; missing objects are skipped;
  - pages: the registry title and icon;
  - layouts: "Layout · A, B", or skipped if deleted;
  - combinations: the panels' titles joined with " · ".

  Clicking a row navigates to `href` (layouts: the same `open` as the sidebar tile, so it's selected).

## 4 — Columns (`features/dashboard/`)

- `useDashboardColumns()`: reads `validColumns(localStorage['map:dash-columns:<userId>'], projectIds)` and
  returns `{ columns, pick(i, id), move(from, to) }`. Each change calls `snapshotBlocks()` first (FLIP) and
  then saves.
- `DashboardColumns.tsx`: a `grid md:grid-cols-3 gap-6`. Each `Column` has `data-dash-block={id}`.
- **ColumnHeader**:
  - `LuGripVertical` (the 6 dots) on the left, as the drag handle. It shows on header hover or focus,
    with `cursor-grab`.
  - The label (`text-body font-medium text-fg-muted`) and a count.
  - `⋯` on the right: the `Dropdown` from plan 11, extended with an optional `trigger` (icon-only
    `LuEllipsis` button) and `disabled` / `hint` per option. Its entries come from `menuEntries`.
- **Drag** (D7): `useDraggable({ id: 'column:<i>', data: { kind: 'column', index, label } })` on the grip.
  Each column is a `useDroppable({ id: 'column-slot:<i>', data: { priority: 2 } })`. A monitor
  (`useDndMonitor`, like `usePaneRearrange`) keeps a `preview` order while the column is held, after a
  100ms dwell, so the columns slide live (FLIP), and commits `move()` on drop. Cancelling restores the order.
- **ColumnRow**: one look for every list. It reuses `ObjectRow` for objects (it already drags and takes
  `end` / `hint`), with a lighter variant (`variant="plain"`: no fill, `hover:bg-fill`, a divider
  between rows, as in the mockup's "Name ───" rows). Non-object entries (pages, layouts, combinations)
  are a plain link row with the same look.
- Bodies:

  | Source | Rows |
  |---|---|
  | Recent | the resolved entries |
  | Notes | all notes and articles (`isNoteLike`), with their project as hint |
  | Maps | all maps, with their project as hint |
  | Projects | the projects (rows open the Overview panel; they take links) |
  | Orphans | top-level notes and articles |
  | Project N | its children, the same objects as its section, as rows |

  Empty bodies show a one-line hint ("Nothing opened yet", "No maps yet").

## 5 — Sections (`features/dashboard/DashboardSections.tsx`)

- `sectionsBelow(columns, projectIds)`, each a `<section data-dash-block={id}>` with an `h2` (`text-title`
  like the mockup) and a sideways-scrolling row (`flex gap-3 overflow-x-auto`, snap) of `SectionCard`s.
- `SectionCard` (D9): `w-40` card (`bg-fill` preview area, name, small meta). It drags with
  `useObjectDrag` (`source: 'pane'`) and registers `useDragSurface('dash-sections', …)` so a dragged
  object over it looks like a card. Project and map cards carry a link node (`DropIcon`, as in
  `ProjectList`).
- A project with no children shows an empty dashed card "Nothing here yet".
- `ProjectList.tsx` is no longer used by the Dashboard. It is deleted, and its card drag and link-node
  code moves into `SectionCard`.

## 6 — Glides (`features/dashboard/blockFlip.ts`)

- `snapshotBlocks()` (stores the rects of `[data-dash-block]`) and `useBlockFlip(rootRef, key)` play
  the FLIP after the columns change. It is a copy of `paneFlip.ts`'s approach, keyed by
  `data-dash-block` instead of `data-pane`:
  - **swap / drag:** both columns translate from their old places;
  - **section → column:** the new column starts at the section's old rect (translate + scale from its
    size) and settles; the sections under it close the gap with their own translate;
  - **column going away:** it fades out (a short opacity animation on a clone, like `fallInto`'s
    clone). A section coming back below fades in at its place.
- 250ms with the same easing as the panes; nothing with reduced motion.

## Testing

- `npm test`:
  - `columns.test.ts`: pick = swap when shown, replace otherwise; moveColumn; sectionsBelow hides
    columns; validColumns fixes junk, duplicates and gone projects;
  - `recentStore.test.ts`: dedupe, cap, newest first, `entryForLocation` for each URL shape.
- By hand (`npm run dev`, signed in):
  - open a note, the Notes page, a combination and a saved layout → all four show in Recent, newest
    first, and survive a reload;
  - ⋯ → pick Maps in the Notes column → the two slide and swap;
  - ⋯ → pick Project 1 → its section lifts into the column, its cards become rows, and the old
    column goes away; then pick Notes there → Project 1 slides back down among the sections;
  - drag a column by its grip → the others make room live; Esc cancels; no pane zones show; a
    column can't be dropped on the sidebar or the trash;
  - drag a note from a column or a section onto a project row or card → it gets linked; onto the
    sidebar → it moves;
  - narrow window: the columns stack, and the sections scroll sideways.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Column logic + tests | `features/dashboard/columns.ts`, `columns.test.ts` |
| 2 | Recent store + tests, recorder in AppLayout | `features/recent/recentStore.ts`, `recentStore.test.ts`, `features/recent/useRecordRecent.ts`, `components/layout/AppLayout.tsx` |
| 3 | `Dropdown`: custom trigger, disabled options and hints | `components/ui/overlays/Dropdown.tsx` |
| 4 | `ObjectRow` plain variant | `features/objects/ObjectRow.tsx` |
| 5 | `'column'` drag kind; ignored by `dropSpots` | `features/workspace/types.ts`, `features/workspace/useWorkspace.ts` |
| 6 | Glides | `features/dashboard/blockFlip.ts` |
| 7 | Columns: storage hook, header (grip, ⋯), bodies, live drag | `features/dashboard/useDashboardColumns.ts`, `DashboardColumns.tsx`, `ColumnHeader.tsx`, `ColumnBodies.tsx`, `useColumnDrag.ts` |
| 8 | Sections and cards; remove `ProjectList` | `features/dashboard/DashboardSections.tsx`, `SectionCard.tsx`, `features/projects/ProjectList.tsx` (deleted) |
| 9 | Dashboard page layout (widths, header to the bottom) | `pages/Dashboard/DashboardPage.tsx` |

Files **not** touched: the navbar and sidebar (`components/layout/Navbar.tsx`, `components/layout/sidebar/*`),
`backend/`, `packages/shared/`, routes.

## Open items

- None blocking. D5 and D8–D12 are defaults; say if any should change.
