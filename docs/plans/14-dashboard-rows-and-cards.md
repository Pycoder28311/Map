# 14 — Dashboard rows: five card types, folders, Sort by / Create, drag to reorder

**Goal:** the horizontal sections under the Dashboard columns become the mockup's rows.
- **Rows:** first **Orphans** (every object at the sidebar's root that isn't a project), then one row per **project**.
- **Row header:**
  - **left:** the row's name, which can be edited in place for projects;
  - **right:** a small **Sort by** button (Newest / Oldest / Most liked) and a small split **Create** button
    (Object card / Article / Note / Map / Folder). Their menus grow out of the button like an extension of it.
- **Cards:** each kind has its own card: **object**, **article**, **map**, **note**, and **folder**, which shows its first 4 articles in a 2×2 grid. Each card has the sidebar's ⋯ menu.
- **Drag:** cards reorder by drag within a row, and move to another row or into a folder. After a drop, a small note tells you where the card went, with **Undo**.

**Depends on:** 12 (Dashboard columns and sections), 10 (object drag, links), 05/06 (sidebar tree and drag & drop).
**Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Folder** = a new kind `'folder'` that holds **articles only**. It can sit in a project or at the root. In the sidebar it's a nested folder row (Project › Folder › articles). Its card shows its first 4 articles' images, 2×2 | User |
| D2 | **Object card** = a new kind `'object'`: a generic item with an image, a name, a description and its date (e.g. a character, a place). It has its own panel | User |
| D3 | **Images are placeholders** for now: each object and article gets a generated picture from its id (a soft colour pattern with its icon). Real images (upload to R2) come in a later plan | User |
| D4 | **Likes:** a mock like count on every object (seeded), with a ♡ on cards to like / unlike. Objects also get a **created date**. Sort: Newest / Oldest use it; Most liked uses the count | User |
| D5 | **Create** is a split button (`Create │ ▾`), but **both parts open the menu** (the split is only visual) | User |
| D6 | **Card drag:** reorder within the row (the other cards make room live), move into another row (to that project, or the root), or drop on a folder card to put an article in it. It still works onto the sidebar, panes, link nodes and the trash | User |
| D7 | **Sort and drag:** rows start in manual order (the sidebar's). Picking a sort sorts that row. Dragging a card into a sorted row switches it back to manual (the button shows "Sort by" again). After any drop, a small note under the row's header says where the card went (e.g. "Moved to 3rd in manual order", "Moved to City parks") with **Undo**, which puts it back and restores the sort. It disappears after 6s | User |
| D8 | Each card has the **⋯ menu** of the mockup: Rename, Pin, Duplicate, Move to, Add Note, Archive, Delete (the same actions and dialogs as the sidebar's row menu, shared). Rename edits the card's name in place | User |
| D9 | **Row names:** on hover, the text cursor shows and a ✎ appears on the name's left. A click edits it in place (Enter or blur saves, Esc cancels; `renameObject`). **Only for projects**: Orphans can't be renamed | User |
| D10 | Sort by is **secondary**, Create is **primary**, both small (`text-small`, `py-1 px-2.5`). Their menus are "extensions": the menu hangs from the button's bottom edge, at least as wide, in the button's colour. While open, the button's bottom corners are square and the menu's top corners are square, and it grows down (`clip-path`, 200ms) | User (+ size default) |
| D11 | Each row's sort choice is remembered in this browser, per user (`localStorage`, like the columns) | Default |
| D12 | **Create:** the new object goes at the start of the row (manual order), named "Untitled <kind>", with its card's name in edit mode. **Orphans' Create** has no Map (maps live in projects) | Default |
| D13 | **Links:** object cards take note links (like maps and projects). Folders don't. Notes and articles are linked as before | Default |
| D14 | **Icons:** object `LuBox`, folder `LuFolders` (to tell it apart from a project's `LuFolder`) | Default |
| D15 | **Card sizes:** every card is `w-44` and the same height (`h-52`), so rows line up; each kind arranges its own content in it (§5) | Default |

## 1 — Risks

1. **Nesting in the sidebar.** Today the tree has one level under a project (`buildSidebarSections`,
   `treeDrop.ts`). Folders add a second level (Project › Folder › Article) and folders at the root. The
   drop rules need to learn it: into a folder, only articles; before or after rows inside a folder; a
   folder only in a project or the root; never a project into anything. These rules are pure and tested
   (`treeDrop.test.ts` or a new file).
2. **Row drops in the shared `DndContext`.** Row reordering registers a new zone with
   `ObjectDropProvider` (`'row-card'`, priority 2). Link nodes (3) still win, and pane zones (1) lose. The
   live "make room" preview must come from frozen card rects (measured when the drag starts), like
   `useColumnDrag`, so re-ordering never changes what's under the pointer.
3. **Shared ⋯ menu and dialogs.** `menuOf` and the dialogs live in `SidebarTree` / `SidebarDialogs`. They
   move to a shared `useObjectActions()` hook plus an `<ObjectDialogs/>` host, so the cards and the
   sidebar use the same code. This is a refactor of working code, so the sidebar must behave the same.

## 2 — Architecture

```
mocks/projects.ts        ObjectKind + 'object' | 'folder'; MockObject + createdAt, likes, liked
mocks/projectsStore.ts   createObject/createFolder/createArticle(parentId…), toggleLike, moveObject rules
mocks/sidebarTree.ts     folders as nested nodes (projects and root), icons
features/objects/        placeholderArt.ts (+test) · useObjectActions.tsx (menu + dialogs, shared)
features/dashboard/
  rows.ts (+test)        row ids, sortCards(), dropPlan() rules, undo snapshots (pure)
  useRowSort.ts          per-row sort, localStorage
  DashboardSections.tsx  rows (header + cards), the drop zone, the undo note
  RowHeader.tsx          editable name, Sort by, Create
  cards/                 ObjectCard, ArticleCard, MapCard, NoteCard, FolderCard (+ CardShell)
  useRowDrop.ts          live reorder / move / into-folder, via ObjectDropProvider
components/ui/overlays/ButtonMenu.tsx   the "extension" menu for Sort by / Create
```

## 3 — Data (`mocks/`)

- `ObjectKind = 'project' | 'map' | 'note' | 'article' | 'object' | 'folder'`.
- `MockObject` gets `createdAt: number`, `likes: number` and `liked?: boolean`. The seed gets spread-out
  dates and like counts, plus a few objects, articles and one folder, so every card type shows up.
- `projectsStore.ts`:
  - `createObjectOf(kind, parentId, name)` replaces `createNote` / `createArticle` / `createMap`, which
    stay as thin wrappers. A new one is created with `createdAt: Date.now()` and `likes: 0`, at the
    start of its parent (D12);
  - `toggleLike(id)`;
  - `moveObject` checks the new rules (`canPlace(kind, parent)`: an article may go into a folder; a
    folder only into a project or the root; a map only into a project; never a project into anything);
  - `getProjects` lists folders too.
- `isNoteLike` stays (notes and articles). `canLink` targets gain `'object'` (D13).
- `sidebarTree.ts`:
  - `KIND_ICON.object = LuBox`, `KIND_ICON.folder = LuFolders`;
  - a folder is a node with `children` (its articles) and `openIcon`, both in a project's children and
    in the Notes section;
  - `rowData` (`data-share-id`) on folder rows too.
- `panels.ts`: `object` (`features/objects/ObjectPanel.tsx`: picture, name, description, date, likes,
  linked notes) and `folder` (`features/objects/FolderPanel.tsx`: its articles as a grid of article cards).
  Both draggable.
- Search (`features/search/search.ts` `KINDS`), the delete dialog's `KIND_NAME` and the cards'
  `KIND_NAME` gain the two kinds.

## 4 — Placeholder pictures (`features/objects/placeholderArt.ts`)

`placeholderArt(id): { background: string }` (pure, tested: same id → same picture; different ids →
different hues). A hash of the id picks a hue. The background is two soft radial gradients in that hue over
`--fill`, which works in light and dark (via `color-mix` with the theme's colours). Used by object,
article and folder cards, and by `ObjectPanel`.

## 5 — Cards (`features/dashboard/cards/`)

All share `CardShell`:
- size (D15) and the drag (`useObjectDrag`, `source: 'pane'`);
- `data-share-id` and `data-card-id` (for row drops), and click to open;
- the ⋯ button (top right, on hover or focus; a `TreeMenu` with `useObjectActions` groups);
- the ♡ count (bottom right; a click toggles, without opening the card);
- a link node where it applies (D13).

| Card | Look |
|---|---|
| **Object** | Picture (top, `h-24`, rounded) · name + date on one line (`date` right-aligned, small) · description, 2 lines |
| **Article** | Taller picture (`h-28`) · title (2 lines) · the first line of its text, faint |
| **Map** | A map-like preview (`h-24`: a faint grid pattern with a pin icon, tinted by its id) · name · its project and linked count |
| **Note** | A paper look (`bg-note`, a new soft-yellow token for light and dark) · name (bold) · its text, up to 6 lines, fading out at the bottom |
| **Folder** | Name + ⋯ on top · a 2×2 grid of its first 4 articles' pictures (empty places dashed) · "N articles". When an article is dragged over it, it lights up `--drop` and the article falls in (`fallInto`) |

Rename from the ⋯ menu turns the name into an input on the card (Enter / blur / Esc as D9).

## 6 — Row header (`RowHeader.tsx`) and `ButtonMenu`

- **Name** (`text-title`):
  - projects (D9): `group` hover shows `LuPencil` (`size-4`, faint) on its left and `cursor-text`;
    a click swaps it for an input with the same font (`field-sizing: content` where it's supported, a
    measured width otherwise);
  - Orphans: plain text.
- **`ButtonMenu.tsx`** (new, reusable): `trigger` (rendered with `buttonClass(variant, …)`), `items` and
  `value?`. It uses the native `popover` (top layer, closes on an outside click or Esc), placed at the
  button's bottom-left with `min-width` = the button's width. The colours come from the variant
  (`secondary`: `bg-fill`; `primary`: `bg-accent text-accent-fg`, with items that hover a shade darker). While
  open, the trigger gets `rounded-b-none` and the menu `rounded-t-none`. Opening plays `animate-menu-extend`
  (`clip-path: inset(0 0 100% 0)` → `inset(0)`, 200ms).
- **Sort by** (secondary, small): its items are Newest, Oldest and Most liked (the current one checked).
  The trigger reads "Sort by" in manual order, or the choice ("Newest ▾"). Picking the current one again
  goes back to manual.
- **Create** (primary, small, split): `Create` │ `LuChevronDown`, with a 1px `border-accent-fg/30` line
  between them, and both parts open the same menu (D5). Its items are Object card, Article, Note, Map
  (not for Orphans) and Folder, each with its kind's icon.

## 7 — Rows: order, drop, undo (`rows.ts`, `useRowSort.ts`, `useRowDrop.ts`)

- `rows.ts` (pure, tested):
  - `rowItems(objects, rowId)`: Orphans (root, not projects) or a project's direct children, in manual
    (store) order;
  - `sortCards(items, sort)`: Newest / Oldest by `createdAt`, Most liked by `likes` then name;
  - `dropPlan(dragged, target)`: one of
    - `{ kind: 'reorder', parentId, beforeId }`;
    - `{ kind: 'move', parentId, beforeId }`;
    - `{ kind: 'into-folder', folderId }`;
    - `null` (not allowed: e.g. a map to Orphans, a note into a folder, a project);
  - `describe(plan, rowName, index)`: the undo note's text ("Moved to 3rd in manual order", "Moved to
    City parks", "Put in Characters").
- `useRowSort()`: `{ sortOf(rowId), setSort(rowId, sort | null) }`, in `localStorage`
  (`map:row-sort:<userId>`).
- `useRowDrop()` registers the `'row-card'` zone with `ObjectDropProvider`:
  - **while a drag is over a row:** the insertion point comes from frozen card rects (the nearest gap by
    x). The dragged card shows there (a placeholder gap opens, and the cards slide with a FLIP, as in
    `blockFlip.ts`). Over a folder card's middle, the folder lights up instead (into-folder, articles
    only);
  - **on drop:** it takes a snapshot `{ id, parentId, beforeId, sort }`, applies the plan through
    `moveObject`, sets the row to manual if it was sorted (D7), and shows the undo note.
- **Undo note:** a small pill under the row's header (`text-small`, `bg-fill`): the text plus **Undo**,
  which restores the snapshot (`moveObject` back, `setSort` back). It goes away after 6s, or when another
  drop happens.

## 8 — Shared ⋯ actions (`features/objects/useObjectActions.tsx`)

- It moves `menuOf` (Rename via a callback, Pin, Duplicate, Move to, Add Note, Add in screen, Archive,
  Delete) out of `SidebarTree.tsx`, and the dialog state out of `SidebarDialogs` into an
  `<ObjectDialogs/>` it returns.
- The sidebar uses it unchanged in behaviour. Each section on the Dashboard renders one
  `<ObjectDialogs/>` for its cards.
- On a card, Archive uses `archiveWithEffect` with the card's element (it falls into the trash bin like a
  row).

## Testing

- `npm test`:
  - `placeholderArt.test.ts`;
  - `rows.test.ts`: row items, every sort, every `dropPlan` case, the undo text;
  - store tests: create of each kind at the row start, `toggleLike`, the move rules, getProjects with
    folders;
  - tree tests: nested folder nodes, and drop rules into and inside folders.
- By hand (`npm run dev`, signed in):
  - **Rows and cards:** Orphans shows every root object; each card type looks as in §5; a folder shows
    its first 4 articles.
  - **Row header:** hovering a project name shows ✎, a click edits it, and Orphans doesn't edit. Sort
    by and Create open as extensions of their buttons.
  - **Sort and Create:** each sort works and is remembered after a reload; Create makes each kind at
    the row's start, ready to rename.
  - **Drag:** reorder within a row (the others make room); move to another row; an article into a
    folder; a note can't go into a folder. Dragging in a sorted row switches it to manual and shows
    the note; Undo restores both.
  - **⋯ menu:** each action works on a card as it does in the sidebar.
  - **Sidebar:** folders nest under projects and at the root; dragging articles into folders there
    works too.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Kinds, dates, likes, create/move rules + store tests | `mocks/projects.ts`, `mocks/projectsStore.ts`, `.test.ts` |
| 2 | Sidebar: nested folders, icons, drop rules + tests | `mocks/sidebarTree.ts`, `components/layout/sidebar/treeDrop.ts`, `SidebarTree.tsx` |
| 3 | Shared ⋯ actions and dialogs (sidebar unchanged) | `features/objects/useObjectActions.tsx`, `SidebarTree.tsx`, `SidebarDialogs.tsx` |
| 4 | Placeholder pictures + test | `features/objects/placeholderArt.ts`, `.test.ts` |
| 5 | Object and folder panels, registry | `features/objects/ObjectPanel.tsx`, `FolderPanel.tsx`, `panels.ts` |
| 6 | `ButtonMenu` + extend animation | `components/ui/overlays/ButtonMenu.tsx`, `styles/animations.css` |
| 7 | Row logic + tests, sort storage | `features/dashboard/rows.ts`, `rows.test.ts`, `useRowSort.ts` |
| 8 | Card shell + five cards, note token | `features/dashboard/cards/*`, `styles/colors.css` |
| 9 | Row header (editable name, Sort by, Create) | `features/dashboard/RowHeader.tsx` |
| 10 | Row drops: live reorder, move, into folder, undo note | `features/dashboard/useRowDrop.ts`, `DashboardSections.tsx` |
| 11 | Orphans = every root object; the columns follow | `features/dashboard/DashboardSections.tsx`, `ColumnBodies.tsx` |
| 12 | Search and other kind lists | `features/search/search.ts`, `SearchPanel.tsx`, `SidebarDialogs.tsx` |

Files **not** touched: `backend/`, `packages/shared/`, routes, the navbar.

## Open items

- None blocking. D10–D15 are defaults; say if any should change.
