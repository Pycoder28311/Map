# 10 — Object drag & drop everywhere, link drop nodes, Notes page

**Goal:** one reusable drag system for sidebar objects, wherever they're shown:
- the sidebar, a Notes page, and the Dashboard's project list;
- from the sidebar to a pane, from a pane to the sidebar, and from one pane to another.

Dragging a **note** makes every sidebar object slide a **link circle** out of its right side. Dropping the
note on it **links** the two; nothing moves. The note falls into the circle with the same effect as
into a folder or the trash, now one reusable piece. The floating copy keeps the pointer exactly where
it was grabbed, and it takes the look of the surface it's over: a sidebar row over the sidebar, a list
row over the Dashboard, and so on.

**Depends on:** 05–08 (sidebar, Zen drag & drop, trash, the swallow effect). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Dropping a note on a link target **adds a link**; nothing moves. Links are many-to-many. A linked object's row shows a small link count, and its panel lists its links (with unlink) | User |
| D2 | **Only notes are linked** (dragged onto targets). Targets are projects and maps. Link circles appear only while a note is dragged (and faintly on the Notes page, D6) | User |
| D3 | An object dragged **from a pane** over the sidebar does both, like a sidebar drag: a drop on a row moves it (the existing rules, with the fall-into-folder effect), a drop on the circle links it | User |
| D4 | One plan file | User |
| D5 | **Link circles:** a circle as tall as the row slides out of the row's right edge, over the right icons (they hide during the drag), with a link icon (`LuLink`). The targeted one grows a little and turns `--drop`. Not on Dashboard, Overview rows or the dragged note itself | User (+ look default) |
| D6 | The circles also show at **low opacity** (30%, no pointer events) whenever the Notes page is on screen (as the page or as a pane) | User |
| D7 | **Notes page:** route `/notes` and a panel type `notes` (draggable, so it can be a pane). It's a simple list of all notes (top-level ones and ones inside projects, with their project's name). The sidebar's Notes label links to it | User (+ route default) |
| D8 | **Dashboard project list:** each project card is draggable (like its sidebar row) and is a link target for notes. Its children (maps and notes) show as small rows inside the card. Child maps are link targets; child rows are draggable | User |
| D9 | **Floating copy:** our own overlay instead of dnd-kit's `DragOverlay`. It keeps the grab point: the pointer stays at the same fraction of the copy's width and height, even when the copy changes shape. The sidebar's column lock (`rowInColumn`) goes away; the Zen lift (scale, tilt, shadow) stays | User (+ approach default) |
| D10 | **Surface looks:** areas register how a dragged object looks over them (`useDragSurface`): the sidebar uses the lifted row, the Dashboard list a card row, and the Notes list a note row. Anywhere else (a pane without its own look, the page) uses a small pill. Switching surfaces cross-fades the shape in 150ms | User (+ default) |
| D11 | **Reusable "falls into an icon":** a `DropIcon` building block (droppable id, highlight, lid, `data-drop-icon`) plus `fallInto(source, key)`. It's used by the link circles, the trash bin and the folder rows. It wraps today's `swallow()` | User |
| D12 | Pane edge drop zones keep working for any dragged object with a panel (it opens as a pane there). **Link targets win** over pane zones when both are under the pointer | Default |
| D13 | Links live in the mock store (`mocks/projectsStore.ts`): `links: { noteId; targetId }[]`. Deleting either side removes its links, and archiving hides them (they're restored with it) | Default |

## 1 — Risks

1. **Collision priority.** Pane drop zones, tree rows, link circles, Dashboard cards and the trash
   are all droppables in one `DndContext`. A custom collision detection picks, among those under the
   pointer, the one with the highest `data.priority`: link nodes 3, cards and rows 2, the trash 2,
   pane zones 1. Without it, a pane's edge zones (which cover the pane) would swallow drops meant for
   its list.
2. **Replacing `DragOverlay`.** Our overlay follows the pointer imperatively (a ref and a transform
   on every move, no React render), measures its own size for the grab-point maths, and is what
   `fallInto` clones on drop. Keyboard drags (no pointer) place it at the active node, as today.
3. **Scope creep in the tree.** `TreeItem` gets one more optional slot (`linkNode`). The tree stays
   generic: the sidebar decides which rows get circles.

## 2 — Architecture

```
WorkspaceProvider (DndContext, collision by priority)
 ├─ DragFloat (portal)                 the floating copy: grab point kept, look from the surface under it
 ├─ ObjectDropProvider                 one monitor: finds the target (zone handlers), applies the drop
 │    zones: 'row' (tree move/pin), 'trash', 'link' (new), 'pane' (existing, via WorkspaceDnd)
 ├─ Sidebar  ── useDragSurface('sidebar', LiftedRow)
 │    TreeItem rows ── link circle: DropIcon (zone 'link', target = object)
 │    TrashBin ── DropIcon (zone 'trash')
 └─ Panes / pages
      NotesPage    ── useDragSurface('notes-list', NoteRow); rows: useObjectDrag
      DashboardPage── useDragSurface('project-list', ProjectRow); cards & child rows: useObjectDrag + DropIcon (zone 'link')
```

### Drag data (`features/workspace/types.ts`)

- `TreeDragInfo` becomes `ObjectDragInfo`:
  `{ objectId?: string; kind?: ObjectKind; nodeId?: string; icon?: ButtonIcon; source: 'sidebar' | 'pane' }`.
  The `new` / `tree` kinds carry it as `object` (renamed from `tree`). `PanelDragLink`, the plain
  tree rows and the new pane rows all fill it.

### New reusable pieces

| File | What |
|---|---|
| `features/drag/useObjectDrag.ts` | Makes any element drag an object: `useObjectDrag({ id, objectId, kind, label, icon, panel?, source })` → `{ setNodeRef, listeners, attributes, isDragging }`. `PanelDragLink` is rewritten on top of it |
| `features/drag/surfaces.tsx` | `DragSurfaceProvider` + `useDragSurface(id, ref, look: (item) => ReactNode)`. It hit-tests the pointer against registered surfaces (rects cached at drag start, re-measured on scroll) |
| `features/drag/DragFloat.tsx` | The floating copy. On drag start it stores the grab fraction `(fx, fy)` = pointer within the source's rect. On move: `left = px − fx·w`, `top = py − fy·h` (w, h measured from the current look). It renders the look of the surface under the pointer; `data-drag-float` |
| `features/drag/collision.ts` | `byPriority` collision detection (Risk 1) |
| `features/drag/ObjectDropProvider.tsx` | One `useDndMonitor`. Zone handlers register `{ target(e, item) → target \| null, drop(item, target, float) }`. The provider keeps the current target in context (for highlights) and calls the matching handler on drop. `SidebarDrop` becomes the `row` and `trash` handlers, unchanged in behaviour |
| `components/ui/drop/DropIcon.tsx` | `DropIcon({ dropKey, zone, data, icon, shape: 'circle' \| 'inline', state: 'hidden' \| 'faint' \| 'shown' })`: droppable with priority; highlight when targeted; lid via `useLidOpen(dropKey)`; `data-drop-icon={dropKey}` |
| `components/ui/drop/fallInto.ts` | `fallInto(source, dropKey, { lifted })`: finds `[data-drop-icon=…]` and calls `swallow()`. Folder rows use `data-drop-icon` instead of `data-row-icon`, and the trash too |

## 3 — Links (`mocks/projectsStore.ts`, panels)

- State gains `links`. New functions:
  - `linkNote(noteId, targetId)`: no duplicates; only a note to a project or map;
  - `unlinkNote(noteId, targetId)`;
  - `linksOf(id)`: notes linked to a target, or targets of a note.
- Hooks: `useLinks()`.
- `deleteObject` / `emptyTrash` drop links of deleted ids. `linksOf` skips hidden objects.
- Tests: link rules, no duplicates, deleting cleans up, archived objects hidden.
- `TreeNode` gets `badge?: number`. `TreeLabel` shows it as a small count after the name (`LuLink`
  icon + number, `text-fg-subtle`). `buildSidebarSections` sets it from `linksOf`.
- Panels:
  - `ProjectPanel` and `MapPanel` get a "Linked notes" list (open-as-panel buttons + unlink);
  - `NotePanel` gets "Linked to".

## 4 — Link circles in the sidebar (`TreeItem.tsx`, `SidebarTree.tsx`)

- `TreeDnd` gains `linkNode?: (node) => { dropKey: string; data: Record<string, unknown>; state: 'hidden' | 'faint' | 'shown' } | undefined`.
- `TreeItem` renders a `DropIcon` with `shape="circle"` at the row's right end:
  `size = row height`, `translate-x-full → 0` when shown (`transition` 200ms,
  `--sidebar-duration`). It hides the right icons while shown.
- `SidebarTree` provides `linkNode` for project and map rows (and Pinned rows of those). The state
  is:
  - `shown` while the current drag is a note (from anywhere);
  - else `faint` when the Notes page or a `notes` pane is on screen (`useWorkspace().isOpen({ type: 'notes' })`);
  - else `hidden`.

  The dragged note's own rows never get one. In the rail (compact) they're hidden.
- The `link` zone handler: on target → `linkNote(item.objectId, data.objectId)`, then
  `fallInto(float, dropKey, { lifted: true })`. The circle's lid is the link icon's pulse and gulp
  (from `swallow`).

## 5 — Notes page (`pages/Notes/NotesPage.tsx`, `panels.ts`, routes, sidebar)

- `NotesPage`: a header plus a list of all visible notes (`useMockObjects()`, kind `note`). Each row
  shows the note icon, the name, the project name (if it has one) and a link count. Each row
  `useObjectDrag({ source: 'pane' })` and has an open-as-panel button.
- It registers `useDragSurface('notes-list', ref, (item) => <NoteRow preview … />)`.
- Route `/notes` (in `RequireAuth`), and a panel in `panels.ts`:
  `notes: { title: () => 'Notes', icon: LuStickyNote, component: lazy(NotesPage), draggable: true, route: () => '/notes', matchRoute: '/notes' }`.
- `SidebarNotes`: the "Notes" label becomes a link to `/notes`; the divider gets an optional
  `labelTo`.

## 6 — Dashboard project list (`pages/Dashboard/DashboardPage.tsx`)

- Each project card:
  - is draggable (`useObjectDrag`, the `project` panel, `source: 'pane'`);
  - is a link target, with an inline `DropIcon` (zone `link`) on its right, shown during a note
    drag, and the card ringed when targeted;
  - lists its children as compact rows (map / note icon + name), each draggable. Child maps are also
    link targets (a small inline circle).
- `useDragSurface('project-list', ref, (item) => <ProjectRow preview … />)`: over the Dashboard, a
  dragged object looks like a card row.
- Dropping a project on a sidebar row reorders projects (D3, existing rules). Dropping a note on a
  card links it. Pane-to-pane works the same way: a note from a Notes pane onto a Dashboard pane's
  card.

## 7 — Pointer exactly in the copy (`DragFloat`, `WorkspaceProvider.tsx`, `lib/dnd.ts`)

- `WorkspaceProvider` drops `DragOverlay` for object drags and renders `DragFloat`. Pane drags keep
  their current preview (`usePaneRearrange`). `followPointer` and `rowInColumn` are no longer used by
  object drags. `rowInColumn` is removed if nothing else uses it.
- The lift animation (`LiftedRow`) runs inside the float with `transform-origin` at the grab point,
  so scaling and tilting never move the pointer off the copy.
- `swallow()` takes its source from `[data-drag-float]` (today's `[data-lifted-row]`).

## Testing

- `npm run test --workspace app`:
  - store links (rules, duplicates, cleanup, hidden);
  - `byPriority` collision (link beats pane zone, row beats pane zone);
  - `DragFloat`'s placement maths as a pure function `floatPosition(pointer, grab, size)`, which keeps
    the grab fraction when the size changes.
- `npm run build --workspace app`, `npx oxlint src`.
- Manual (`npm run dev`):
  - **Notes page:** faint circles show on project and map rows in the sidebar. Drag a note from the
    list: the circles slide out fully. Drop on a map's circle: the note falls in, the map gets a link
    count, and its panel lists the note.
  - **Sidebar notes:** drag a note from the sidebar: the same circles; a row drop still moves it.
  - **Moving from a pane:** drag a note from the Notes page onto a project row: it moves into the
    project (falls into the folder).
  - **Dashboard:** drag a sidebar note onto a project card: linked. Drag a card into the sidebar: it
    reorders projects. Child rows show in each card.
  - **Pane to pane:** open Notes and Dashboard as panes, then drag a note onto a card: linked. The
    pane edge zones don't steal the drop.
  - **The copy:** the pointer stays exactly where it grabbed. The copy changes shape between the
    sidebar, the Dashboard list and the Notes list.
  - **Unchanged:** trash, folders and pane rearranging work as before.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Links in the store + tests | `mocks/projectsStore.ts`, `projectsStore.test.ts` |
| 2 | `ObjectDragInfo`, `useObjectDrag`; `PanelDragLink` on top of it | `features/workspace/types.ts`, `features/drag/useObjectDrag.ts`, `features/workspace/PanelDragLink.tsx` |
| 3 | Surfaces + `DragFloat` (+ placement test); replace `DragOverlay` for objects | `features/drag/surfaces.tsx`, `DragFloat.tsx`, `features/workspace/WorkspaceProvider.tsx`, `components/ui/tree/LiftedRow.tsx` |
| 4 | Priority collision (+ test) | `features/drag/collision.ts`, `WorkspaceProvider.tsx` |
| 5 | `ObjectDropProvider`; sidebar row/trash as zone handlers | `features/drag/ObjectDropProvider.tsx`, `components/layout/sidebar/SidebarDrop.tsx`, `sidebarDropState.ts` |
| 6 | `DropIcon` + `fallInto`; trash and folder rows use them | `components/ui/drop/DropIcon.tsx`, `fallInto.ts`, `TrashBin.tsx`, `components/ui/tree/TreeItem.tsx` |
| 7 | Link circles, `linkNode`, `badge`; the `link` zone | `components/ui/tree/types.ts`, `TreeItem.tsx`, `TreeLabel.tsx`, `components/layout/sidebar/SidebarTree.tsx`, `mocks/sidebarTree.ts` |
| 8 | Notes page, route, panel, sidebar label link | `pages/Notes/NotesPage.tsx`, `routes/index.tsx`, `panels.ts`, `components/ui/Divider.tsx`, `SidebarNotes.tsx` |
| 9 | Dashboard cards: drag, link targets, children rows, surface | `pages/Dashboard/DashboardPage.tsx` |
| 10 | Linked lists in panels | `features/projects/ProjectPanel.tsx`, `MapPanel.tsx`, `features/notes/NotePanel.tsx` |
| 11 | Docs: how to make an element draggable / a drop target / a surface | `instructions/adding-a-panel.md` (new section) |
| 12 | Test, build, lint, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, the pane rearranging (`usePaneRearrange.ts`,
`dropTarget.ts`), the move rules (`treeDrop.ts`, apart from accepting `source: 'pane'` items), and
the layout tiles.

## Open items

- D2 targets: projects and maps. Should **other notes** also take links (note to note)?
- D7: the Notes page lists notes inside projects too. Say so if it should list only the top-level
  ones (the sidebar's Notes section).
