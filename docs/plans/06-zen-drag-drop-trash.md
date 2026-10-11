# 06 — Zen-style drag & drop in the sidebar, `draggable` / `locked`, trash bin (archive)

**Goal:** sidebar objects can be dragged to reorder them, into and out of projects, and into Notes,
with the same effects as the Portfolio's Zen sidebar reel (`Workspace/Coding/Personal/Portfolio/src/(pages)/zen-sidebar/`):
- the row lifts with a tilt and a shadow;
- an insertion line with a dot shows where it will land;
- a project about to receive it gets a tint and a ring;
- a dropped item falls into a closed folder (the "swallow": the lid opens, the item arcs in and
  shrinks, the folder gulps, sparks fly).

A trash bin at the bottom of the sidebar takes objects with the same effect. That **archives** them;
delete stays a separate action with a confirmation modal.

**Depends on:** 05 (flat object model with `parentId` / `draggable` / `locked` / `archived`,
`moveObject`, sections, bottom slot in `Sidebar.tsx`). **Blocks:** 07 uses the trash for layouts
(optional there).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | `draggable` has one meaning: the row can be picked up at all (tree reorder **and** onto panes). Dashboard: `draggable: false`, `locked: true` | User |
| D2 | `locked`: the row never takes a drop *into* it. Projects are unlocked; maps, notes and Dashboard are locked | User |
| D3 | Rules: maps and notes go into any unlocked project, between rows inside a project, or into Notes (they become parentless). **Projects are reordered among projects only, never nested** | User |
| D4 | Dropping on the trash **archives** (hidden, restorable). **Delete** is the ⋯ menu's Delete, with the confirmation modal from 04, in the middle of the screen | User |
| D5 | Effects copied from the Zen reel: the numbers in its `config.js` (`TIMING`, `EASING`, `MOTION`) move into one TS file, `components/ui/tree/dragEffects.ts`. The drawing is redone in DOM/CSS (the reel draws on a canvas). See §3 for the mapping | Default |
| D6 | Keep **dnd-kit** (already the app's drag & drop and shared with the panes). Tree rows become droppables in the same `DndContext` as the panes, so one drag can end on the tree, on a pane, or on the trash | Default |
| D7 | Drop target from the pointer's height on a row, like the reel's `resolveTarget`: on an unlocked folder, the middle (25%–78%) means **into**; above or below the middle means **before** / **after** | Default |
| D8 | Colours: the Zen accent becomes a new theme token, `--drop: #8b7cf6` (both themes). The insertion line, the dot, the drop ring, the tint (16% of it) and the sparks use it. The app's `--accent` is black/white, which would read as text | Default |
| D9 | Icons: keep the app's Lucide icons. "Lid opens" = the folder icon swaps to its `openIcon` with the reel's lift pulse. Projects use `LuFolderKanban` → `LuFolderOpen` | Default |
| D10 | The dragged row's own place stays empty during the drag (as in the reel), and the rows don't move until the drop. On the drop, rows glide to their new places (reflow, 340ms) | Default |
| D11 | The chevron turns 90° (260ms, the reel's chevron curve) and no longer swaps between two icons. Children fade/expand in on open (320ms) | Default |
| D12 | Pinned list: rows can be reordered among pins. Dropping any other object onto Pinned **pins** it (the object doesn't move) | Default |
| D13 | Trash: the ⋯ menu's **Archive** works too, with the same fall-into-the-bin effect starting from the row. Clicking the bin opens a modal with the archived objects: **Restore**, and **Delete** (asks for confirmation). An archived project hides its whole subtree | Default |
| D14 | `prefers-reduced-motion`: there's no lift tilt, no swallow and no sparks. The drop happens instantly, with a 150ms fade | Default |
| D15 | Over a pane, the overlay is still the lifted row (the old label pill goes away). Pane drop zones work as today | Default |

## 1 — Risks

1. **Two drop worlds in one drag.** Tree rows, the trash and the pane drop zones are all droppables.
   `collisionDetection` in `WorkspaceProvider.tsx` must prefer the droppable under the pointer
   (`pointerWithin`, already used). Tree drops need the pointer's y inside the row, from `dragPoint()`
   in `lib/dnd.ts`.
2. **Click vs drag.** Rows are links. The 6px activation distance stays. Project rows (a plain `div`,
   since plan 04's follow-up) need their own `useDraggable`, because only links have one today
   (`PanelDragLink`).
3. **The swallow needs positions after the tree changes.** The item's start (where it was dropped) and
   the folder icon's centre are both measured **before** the store update. The animation then runs in
   a fixed-position layer (portal into `document.body`), so React re-rendering the tree can't cut it.
4. **Scroll area.** A drag over the sidebar near its top or bottom edge should auto-scroll. dnd-kit's
   `autoScroll` does this; make sure it's on for the sidebar's scroll box.
5. **Keyboard drags** (Space to pick up) work with "before/after" only. "Into" with the keyboard is
   allowed only when the overlay's centre is over a folder's middle band. Good enough for now.

## 2 — Architecture

```
WorkspaceProvider (DndContext)                ← onDragMove computes the tree target
 ├─ Sidebar
 │   ├─ TreeView rows: useDraggable + useDroppable (id "tree:<nodeId>")
 │   │      DropIndicator (insertion line + dot) / into-ring on the target row
 │   └─ TrashBin (useDroppable "trash")  bottom slot
 ├─ Panes / page drop zones (unchanged)
 ├─ DragOverlay → LiftedRow (Zen lift)
 └─ SwallowLayer (portal)  ← item falls into folder or bin, sparks
```

- `features/workspace/workspaceDrag.ts`: `PanelDragData` gets a third kind,
  `{ kind: 'object'; objectId; nodeId; label; icon; panel? }`, for sidebar objects. The `new` kind
  stays for things that only open panels. A drag that ends on a pane uses `panel`, as `new` does today.
- A small tree-drop context, `components/layout/sidebar/treeDrop.ts`, holds
  `target: { kind: 'before' | 'after' | 'into'; nodeId } | { kind: 'trash' } | null`. It's set in
  `onDragMove` and read by the rows and the bin to draw the indicator.
- Rules live in one pure function, `canDropObject(objects, draggedId, target)` (in
  `mocks/projectsStore.ts`, tested). It covers D2, D3 and D12, plus the reel's "not into itself / its own
  subtree" (`canDrop`).

## 3 — The Zen effects in DOM

All numbers come from `dragEffects.ts` (copied from the reel's `config.js`).

| Effect | Reel (canvas) | Here |
|---|---|---|
| Lift | `lift` 200ms, ease `[0.2,1.3,0.5,1]`; scale 1.035, tilt 0.9°, shadow 18/6, nudge 8px right, alpha 0.97 | `LiftedRow` in `DragOverlay`: same row markup, `bg-(--row-drag)` (new token, `--fill-strong`), WAAPI keyframes for scale/rotate/translate on mount |
| Insertion line | `drawInsertion`: 2px accent line + 3px dot, starting at the anchor row's depth indent | `DropIndicator`: absolutely positioned in the row's `<li>`, at the top or bottom edge (`-gap/2`), `start` = the row's indent, `bg-(--drop)` |
| Into a folder | `dropInto` tint 16% + 1.4px ring | the target row's container gets `bg-(--drop)/16 ring-[1.4px] ring-(--drop)/55` |
| Swallow (closed folder or bin) | `openLead` 170 → `swallow` 460 (quadratic bezier arc, scale → 0.16, spin → 10°, fade from 45%) → `gulp` 320 (overlap 150, squash 0.16, skew 0.72) → `closeBack` 240 | `SwallowLayer`: a fixed clone of the row. Its path is sampled from the same bezier into ~16 WAAPI keyframes (left/top/scale/rotate/opacity) with the `swallow` easing. Lid: the icon swaps to `openIcon` + a scale pulse (×1.18). Gulp: scaleX/scaleY keyframes on the folder icon |
| Sparks | 7 specks, reach 18, spread 2.1 rad, lag 0.22, fall 6, size 2.3 | 7 small `--drop` dots in the layer, one WAAPI animation each, same maths (`drawSparks`) |
| Reflow | `reflow` 340ms `[0.32,0.9,0.26,1]` | FLIP on the rows after the drop: measure before, animate `translate` from old to new |
| Chevron | `chevron` 260ms `[0.65,0,0.35,1]`, 0 → 90° | `TreeRowIcon`: one `LuChevronRight` with `rotate-90` when open, `transition-[rotate]` |
| Hover | `hover` 140 in / 200 out | rows' `transition-colors` set to those durations and curves |

The swallow runs only when the target folder is **closed** (an open one just shows its new child, as
in the reel), and always for the trash.

## 4 — Tree changes (`components/ui/tree/*`)

The tree stays generic. It doesn't know about objects:

- `TreeView` gets a new prop: `dnd?: { rowDraggable(node), dropTarget(nodeId) → 'before' | 'after' | 'into' | null }`.
  `TreeItem` wraps the row in `useDroppable({ id: 'tree:' + node.id })` and draws the indicator / ring
  from `dropTarget`. Rows with `rowDraggable` get `useDraggable` (links keep `PanelDragLink`, which
  gets the `object` data; plain rows get a small `DraggableRow` wrapper).
- `dragEffects.ts` (new): the constants plus `cubicBezier()` strings for CSS/WAAPI.
- `SwallowLayer.tsx` (new, `components/ui/tree/`): an imperative `swallow({ from: DOMRect, row: HTMLElement, to: HTMLElement, lid?: () => void })`
  through a small context. It clones the row's node for the flying copy.

## 5 — Drop handling (`WorkspaceProvider.tsx` + sidebar)

- `onDragMove`: if `over.id` starts with `tree:`, compute before / into / after from `dragPoint()` and
  `over.rect` (D7). Keep it only if `canDropObject` allows it, else `null` (no indicator, no drop).
  If `over.id === 'trash'`, the target is the trash.
- `onDragEnd` for `object` drags:
  - tree target → `moveObject` / `togglePin` (Pinned);
  - trash → `archiveObject`;
  - pane zone → today's `dropNew`.
  Before the store update, it measures the overlay's rect and the target icon and starts the swallow
  if the folder is closed (or the target is the trash).
- Store (`mocks/projectsStore.ts`): new `archiveObject(id)`, `restoreObject(id)`, `canDropObject(…)`,
  `reorderPinned(id, beforeId)`. `deleteObject(id)` (any kind, with its subtree) replaces the per-kind
  deletes in the UI.

## 6 — Trash bin (`components/layout/sidebar/TrashBin.tsx`, new)

- Sits in the bottom slot from plan 05 (`shrink-0`), as a row-height button: a bin icon plus "Trash
  (N)". In the rail it shows only the icon, with the count as a small badge.
- Its own SVG icon, drawn like Lucide's `trash-2`, but with the **lid as a separate group**. It rotates
  open (−28° around its left hinge) while a drag is over it, and on a swallow (`openLead` → `closeBack`).
- It's a droppable (`trash`) that takes any `draggable` object.
- Click → `Modal` "Trash": the archived objects (icon, name, parent name). Each has **Restore** and
  **Delete** (opens the confirm dialog). "Empty trash" is in the footer, also with a confirmation.
- The ⋯ menu's **Archive** calls `archiveObject` and plays the swallow from the row to the bin.

## Testing

- `npm run test --workspace app`: `canDropObject` (locked, project nesting refused, own subtree,
  Dashboard, Pinned), `moveObject` + `archiveObject` / `restoreObject` / `deleteObject`, and the target
  maths (a pure `rowDropTarget(y, rect, folder, locked)`).
- `npm run build --workspace app`.
- Manual, side by side with the reel (`npm run dev` in Portfolio, the zen-sidebar page):
  - lift, line + dot, ring, swallow into a closed project, sparks, reflow and chevron turn look and time
    the same;
  - reorder projects; move a map between projects and into Notes; refused targets show no indicator;
  - drag to the trash: the lid opens and the item falls in. Restore and Delete from the modal;
  - drag onto panes still combines;
  - reduced motion: instant moves.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Constants from the reel | `components/ui/tree/dragEffects.ts` (new) |
| 2 | `--drop` and `--row-drag` tokens | `styles/colors.css` |
| 3 | Store: archive/restore/delete, `canDropObject`, `reorderPinned` + tests | `mocks/projectsStore.ts`, `projectsStore.test.ts` |
| 4 | `object` drag kind, tree-drop context, target maths (+ test) | `features/workspace/types.ts`, `workspaceDrag.ts`, `components/layout/sidebar/treeDrop.ts` (new) |
| 5 | Rows: droppable/draggable, indicator, ring, chevron turn | `components/ui/tree/TreeView.tsx`, `TreeItem.tsx`, `TreeRowIcon.tsx`, `features/workspace/PanelDragLink.tsx` |
| 6 | Lifted overlay, move/end handling | `features/workspace/WorkspaceProvider.tsx`, `components/ui/tree/LiftedRow.tsx` (new) |
| 7 | Swallow + sparks layer, reflow FLIP | `components/ui/tree/SwallowLayer.tsx` (new) |
| 8 | Trash bin + modal; Archive menu item | `components/layout/sidebar/TrashBin.tsx` (new), `Sidebar.tsx`, `SidebarTree.tsx`, `SidebarDialogs.tsx` |
| 9 | Test, build, side-by-side check | — |

Files **not** touched: `backend/`, `packages/shared/`, the Portfolio project (only read),
`features/workspace/layout.ts` and the pane rearranging (`usePaneRearrange.ts`, `dropTarget.ts`).

## Open items

- D8: the Zen purple (`#8b7cf6`) as the drop colour. Say so if you'd rather use the app's own black/white
  accent.
- D9: Lucide icons with the lid swap. Say so if you want the reel's VS Code icons (`react-icons/vsc`
  `VscFolder` / `VscFolderOpened`) for projects instead.
