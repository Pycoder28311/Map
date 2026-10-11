# 05 — Sidebar structure: sections, Pinned, Notes, flat object model, rail column

**Goal:** the sidebar is split into labelled sections: Layouts (filled in 07), Pinned, Dashboard,
Projects and Notes. A reusable divider separates them. The sidebar's objects become one flat mock list
with `parentId`, `draggable`, `locked`, `pinned` and `archived`. Notes are a new kind of object with no
parent. An object that is open (as the page or as a pane) stays visible under its collapsed parent.
When the sidebar shrinks to the rail, every row lines up in one column, and nothing changes height.

**Depends on:** 04 (mock store, in-place rename, dialogs). **Blocks:** 06 (drag & drop and trash use
the flat model and the sections), 07 (saved layouts go in the Layouts section).

### Plan index (this request, in build order)

| Plan | What |
|---|---|
| **05** (this) | sections + divider, flat object model, Pinned, Notes, open items under collapsed parents, rail column |
| [06](06-zen-drag-drop-trash.md) | Zen-style drag & drop in the tree, `draggable` / `locked` rules, trash bin with archive and restore |
| [07](07-saved-layouts.md) | save/create pane layouts, layout tiles grid, hover labels, first-run hints |

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Order, top to bottom: **Layouts → Pinned → Dashboard → Projects → Notes**. The trash bin is stuck to the bottom (06) | User |
| D2 | One reusable divider (a line, with an optional label and an optional button **left** of the label), used between every section | User |
| D3 | Pinning adds a **shortcut row** under Pinned. The object also stays in its place. Unpin works from either row | User |
| D4 | Notes: a flat list of objects with no parent and no children. It has a "Show more" button, and a create (+) button left of its title | User |
| D5 | Rail (closed sidebar): every visible row sits in one column (no indent for children). Every section keeps its height, so nothing below moves up or down | User |
| D6 | An object shown on screen (as the page or as a pane) stays visible under its parent when that parent is collapsed | User |
| D7 | Data: **one flat list** `MockObject[]` in document order, each object naming its parent (the Zen sidebar's model, `TREE` in the Portfolio's `zen-sidebar/config.js`). Moving an object is one field change. It replaces the nested `MockProject.maps` in `projectsStore.ts`. `useMockProjects()` / `findProject` / `findMap` keep their shapes (derived from the list), so pages and panels don't change | Default |
| D8 | Fields: `{ id, kind: 'project' \| 'map' \| 'note', name, parentId, draggable, locked, pinned, archived, description? }`. Projects: `draggable: true, locked: false`. Maps and notes: `draggable: true, locked: true` (nothing can be dropped *into* them). Dashboard isn't an object: it's a fixed node with `draggable: false, locked: true` | Default (from the request) |
| D9 | Notes section = objects with `parentId: null` that are not projects (a map moved out of its project in 06 shows here too). Notes get a panel type `note` (placeholder panel: name + "Note text comes later") | Default |
| D10 | Notes shows the first **5**, then "Show more" / "Show less" | Default |
| D11 | Pinned rows are leaves: clicking opens the object's panel (a project opens its Overview panel). They're listed in pin order. Pinned is hidden when empty (with its divider) | Default |
| D12 | Archived objects (06) are left out of every section | Default |
| D13 | The kept-visible open item shows **directly under** the collapsed parent, one indent step in, even when it's deeper (a map under a collapsed Projects row). It's drawn in its normal style, and it disappears when the parent opens (it's then in its real place) | Default |
| D14 | Rail: divider labels and the Notes "Show more" text fade out, but keep their height. Buttons become icon-only, at the same height | Default |
| D15 | The ⋯ menu's **Pin** becomes Pin/Unpin and works. "Add note", "Add in screen" and "Archive" stay as they are here (Archive is wired in 06) | Default |
| D16 | Still in memory only: a reload resets everything | Default (same as 04) |

## 1 — Risks

1. **Three lists, one editing state.** Pinned, Projects and Notes are separate `TreeView`s. The
   in-place rename state (`editingId`) stays in `SidebarTree` and is shared by all of them. Node ids
   must be unique across them, so Pinned rows get a `pin:` prefix.
2. **Height must not change in the rail** (D5). Every section must keep its height, including dividers,
   the Notes button and (in 07) the layout tiles. Check by toggling the sidebar and comparing the Notes
   divider's `getBoundingClientRect().top`.
3. **Kept-visible rows vs expand state.** TreeView owns `expanded`. The kept-visible rule must only read
   it, never open folders.

## 2 — Architecture

```
mocks/projects.ts        seed (PROJECTS + NOTES) → flat SEED_OBJECTS
mocks/projectsStore.ts   flat MockObject[] + CRUD (+ togglePin, createNote); derived useMockProjects()
mocks/sidebarTree.ts     buildSidebarSections(objects) → { pinned, dashboard, projects, notes, items }

components/ui/Divider.tsx                 NEW: line + optional label + optional leading button
components/ui/tree/TreeView/TreeItem      + keepVisible(node), compact = no indent
components/layout/sidebar/
  Sidebar.tsx            scroll area (sections) + bottom slot (trash, 06)
  SidebarTree.tsx        renders the sections in order (D1) with Dividers
  SidebarNotes.tsx       NEW: Notes list with +, show more/less
features/notes/NotePanel.tsx + panels.ts `note` entry
```

## 3 — Flat object model (`mocks/projectsStore.ts`, `mocks/projects.ts`)

- `projects.ts`: keep `PROJECTS` as the readable seed and add `NOTES` (3 or 4 notes, e.g. "Shopping
  list", "Ideas", "Meeting notes", "Todo"). `SEED_OBJECTS` flattens both in document order (each
  project, then its maps).
- `projectsStore.ts`: the state becomes `MockObject[]`. `useMockObjects()` is the raw hook.
  `useMockProjects()` / `getProjects()` stay and are **derived and memoised per snapshot**: each
  project gets `maps` = its non-archived children. So `DashboardPage`, `ProjectsPage`,
  `ProjectPanel`, `MapPanel` and the `findX` helpers keep working unchanged.
- The existing functions keep their names and behaviour, rewritten on the flat list. `duplicateProject`
  copies the subtree right after the original. `moveMap` sets `parentId`. `deleteProject` removes the
  subtree. New: `createNote(name)`, `togglePin(id)`, `findObject(id)`, plus
  `moveObject(id, { parentId, beforeId })` (used in 06; written and tested here).
- `projectsStore.test.ts`: the existing cases are adapted, and new ones cover notes, pin, `moveObject`
  (into a project, before a sibling, to the root), and derived `maps`.

## 4 — Divider (`components/ui/Divider.tsx`, new)

```tsx
<Divider label="Notes" action={{ icon: LuPlus, label: 'New note', onClick }} compact={compact} />
<Divider />  // a plain line (Dashboard ↔ Projects)
```

- One fixed height whether it has a label or not (same height in the rail). It's a 1px line
  (`bg-line`). When there's a label, it shows `text-small text-fg-muted` before the line. The optional
  action is a small icon button (the tree's `ICON_BOX` look) **left** of the label.
- `compact`: the label and the action fade out (`opacity-0`, the space kept, `pointer-events-none`) over
  `--sidebar-duration`. Only the line stays, sized to the rail's row width (`--tree-row-max`).
- Tokens added to `styles/tokens.css`: `--divider-h` and `--divider-gap`.

## 5 — Sections in `SidebarTree.tsx`

`buildSidebarSections(objects)` (in `mocks/sidebarTree.ts`, which replaces `buildSidebarTree`) returns
the nodes for each section, plus the `items` map (node id → `SidebarItem`), as before:

1. **Layouts**: an empty slot for 07 (a `<section>` with its own divider, rendered by 07).
2. **Pinned**: `<Divider label="Pinned" />` + `TreeView` of `pin:<id>` leaves (D11). Hidden when no
   object is pinned.
3. **Dashboard**: `<Divider />` + a `TreeView` with the Dashboard node (`draggable: false`,
   `locked: true`).
4. **Projects**: `<Divider label="Projects" action={+ New project} />` + the project tree. The old
   "Projects" root row goes away: the divider's + takes over its job. Its page (`/projects`) stays
   reachable from the dashboard's link. Each project row keeps its `+` (new map) and ⋯ menu.
5. **Notes**: `SidebarNotes.tsx` (new): `<Divider label="Notes" action={+ New note} />`, a `TreeView`
   of the first 5 notes (or all of them), then a ghost "Show more (N)" / "Show less" row button. In
   the rail it shows an icon (`LuChevronsDown` / `LuChevronsUp`) at the same height.

- `TreeNode` (`components/ui/tree/types.ts`) gets `locked?: boolean`, and `draggable` gets a JSDoc note:
  "can be picked up at all (tree and panes)". `PanelDragLink` already uses `node.draggable`, so Dashboard
  stops being draggable onto panes.
- New notes use the create dialog from 04 (`SidebarDialogs`, `parent: { kind: 'notes' }` →
  `createNote`).
- Notes get the same ⋯ menu as maps (Rename, Pin, Duplicate, Move to, Delete). Their "Move to" list
  adds "Notes (no project)" when the object has a parent.
- The menu's Pin label is `item.pinned ? 'Unpin' : 'Pin'` (from `findObject`), calling `togglePin`.

## 6 — Open items stay visible under collapsed parents (D6, D13)

- `TreeView` / `TreeItem` get a new prop: `keepVisible?: (node) => boolean`. When a folder is
  collapsed, `TreeItem` walks its descendants. Those for which `keepVisible` is true are drawn as a
  `<ul role="group">` under it (normal indent, `aria-label="Open items"`), in document order.
- `SidebarTree` passes `keepVisible={(node) => !!node.panel && workspace.isOpen(node.panel)}`
  (`useWorkspace().isOpen`, which covers both a single page and the panes).
- Project Overview rows count too: an open project panel keeps "Overview" visible under the collapsed
  project.

## 7 — Rail: one column, same heights (D5, D14)

- `TreeItem`'s children `<ul>`: `ms-(--tree-indent)` becomes
  `ms-[var(--tree-indent-now,var(--tree-indent))]`, and TreeView's `COMPACT` style sets
  `--tree-indent-now: 0px`. A `transition-[margin]` over `--tree-compact-duration` makes children
  slide into the column together with the width animation.
- `Sidebar.tsx`: the inner box becomes `flex h-full flex-col`. The scroll area holds the sections
  (`flex-1 overflow-y-auto`), and a `shrink-0` bottom slot is reserved for the trash (06).
- Every section element uses fixed heights from tokens (rows already do). Divider, Notes button and
  Layouts (07) follow the same rule.

## Testing

- `npm run test --workspace app`: store tests (flat model, notes, pin, `moveObject`, derived projects).
- `npm run build --workspace app`.
- Manual:
  - Sections are in order with dividers. Pinned appears and disappears with Pin/Unpin.
  - Notes: create (+), Show more/less with 6 or more notes.
  - Open a map as a pane, collapse its project, then collapse Projects: the map row stays visible.
  - Toggle the sidebar: children line up in one column, and the top of the Notes divider doesn't move.
  - Dashboard can't be dragged onto a pane any more. Its open-as-panel button still works.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Seed notes + flat seed | `app/src/mocks/projects.ts` |
| 2 | Flat store, derived projects, new functions, tests | `app/src/mocks/projectsStore.ts`, `projectsStore.test.ts` |
| 3 | `locked` on TreeNode, `keepVisible`, compact indent | `components/ui/tree/types.ts`, `TreeView.tsx`, `TreeItem.tsx` |
| 4 | Divider + tokens | `components/ui/Divider.tsx` (new), `styles/tokens.css` |
| 5 | Note panel | `features/notes/NotePanel.tsx` (new), `app/src/panels.ts` |
| 6 | Sections builder | `app/src/mocks/sidebarTree.ts` |
| 7 | Sections, Pinned, Pin/Unpin, Notes | `components/layout/sidebar/SidebarTree.tsx`, `SidebarNotes.tsx` (new), `SidebarDialogs.tsx` |
| 8 | Sidebar column + bottom slot | `components/layout/sidebar/Sidebar.tsx` |
| 9 | Docs: sidebar items now come from `buildSidebarSections` | `instructions/adding-a-panel.md` (the sidebar paragraph) |
| 10 | Test, build, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, `features/workspace/*` (only `useWorkspace` is
read), `TreeMenu.tsx`, `Modal.tsx`.

## Open items

- None blocking. D10 (5 notes before "Show more") and D11 (Pinned hidden when empty) can be changed.
