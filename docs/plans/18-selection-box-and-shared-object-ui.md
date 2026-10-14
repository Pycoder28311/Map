# 18 — Selection box and the shared object UI

**Goal:** the Mouse tool becomes a real select tool. Click or drag-select (marquee) objects; a **dashed selection box**
with corner buttons moves, resizes, rotates, flips, splits, duplicates and removes them; **eraser** cuts parts out of a
line. On the right, one object shows the **shared object modal** (name row with focus / split / eraser, a slot for its own
options, and a "Link to other objects" footer); several objects show the **colours panel**. Linking works through the
sidebar (a link icon on note rows) and a **forward-link** icon opens what is linked. The hover-info card for the split icon
is a reusable component. Everything works for `line` objects now; the other kinds plug in with their plans.

**Depends on:** 17a (objects, `boardStore`, `Link`), 17b (editor, view, tool panel, history). **Blocks:** 19 (lines and shapes
fill the modal's slot), 20, 21, 22 (they use the box, the modal frame and the link button), 23.

**Frontend only.** No backend, database or API: links are `{ to: 'sidebar', id }` entries in the object's own `links`.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Two handles:** a **resize** handle (diagonal arrows, top right of the box) and a separate small **rotate** handle (curved arrow, above the box's top centre) | User |
| D2 | **Link targets are notes and articles.** In picking mode the sidebar shows the link icon on note / article rows (also pinned ones); clicking one links / unlinks it. Today's drag-a-note links (to projects, maps…) are unchanged | User |
| D3 | **Eraser** = a mode: click it, then drag over the selected line to cut out what is under the circle cursor (splitting it where needed). One undo step per drag. Only `line` for now (disabled for other kinds until plan 20) | User |
| D4 | Box buttons as in map.md. **Line:** top left flip-H and flip-V; top right resize, with split and duplicate beside it; bottom right ✕ remove; **link bottom left**. **Border:** resize, rotate, split, ✕, **link above the top-right button** (no flips, no duplicate). **Several objects:** resize, rotate, flips, duplicate, ✕ (no split, no link). Point / text: ✕, duplicate, link bottom left, until their plans refine it | User (map.md) |
| D5 | The box is **axis-aligned and never rotates**: after a rotation it just fits the new bounds (map.md) | User (map.md) |
| D6 | **Mouse tool = select.** Click selects the topmost object under the pointer; Shift / Ctrl-click toggles; click on empty clears; drag on empty = **marquee** (an object is picked if its geometry touches the rectangle; Shift adds); dragging an object moves the selection. 17b's "Mouse tool pans" ends: **pan is Space / middle-drag / pinch** (the wheel still zooms). The Line tool still only draws | Default |
| D7 | **Gestures preview, then commit once.** While dragging, transformed copies are painted (computed from the objects as they were at pointer-down, so rounding never accumulates); on pointer-up **one** `changeObjects` call = **one undo step**. Points are rounded to whole numbers on commit (the codec's format) | Default |
| D8 | `boardStore.changeObjects(mapId, { update, remove, add })` is the one way to change several objects at once (move, resize, rotate, flip, recolour, duplicate, split, erase, remove); it also drops board-links to removed objects | Default |
| D9 | **Keys** (editor focused, not typing): Delete / Backspace remove, Esc clears the selection (or leaves split / eraser mode, or link picking), Ctrl/⌘+D duplicate (copies offset by 16 units and selected), Ctrl/⌘+A select all (not the background layer), Shift+click toggles | Default |
| D10 | **Split:** icon (box or name row) then a click on the line, or **double-click** a line: it splits at the nearest point of its path into two lines that keep the style, links and name; a click on an end does nothing. Border splitting arrives with plan 20 | Default |
| D11 | **Focus** = fit the view to the object's bounds (margin 96px, scale ≤ 4), instantly | Default |
| D12 | The name row, left to right: **split, focus, eraser, name input, forward-link** (map.md's order read literally; one array in `ObjectHeaderRow` to reorder). The point's modal puts duplicate and focus on the right (plan 22 passes its own `actions`) | Default |
| D13 | **Forward-link icon** shows beside the name whenever the object has links: one link opens it beside the map (`workspace.open`, like "Add in screen"); several show a small list to pick from | Default |
| D14 | The **right panel** (`absolute end-3 top-16 w-72`) is the object modal for one selection and the colours panel for several; plan 23's top-right bar sits above it. Colours panel: one colour input per **distinct colour** among the selected objects (stroke colours and shape fills); changing one recolours every object using it | Default |
| D15 | The **hover-info** card is a generic component (`components/ui/overlays/HoverInfo`): title, text, optional key; opens after 400ms of hover or on focus, closes on leave / Esc / scroll; used by split, focus, eraser and the box buttons | Default |
| D16 | While link picking is on, the **sidebar stays open** (rail forced open; the 17b peek shift follows) and a small bar at the bottom of the editor says "Linking *name*" with **Done**; Esc, Done, or selecting something else ends it | Default |

## 1 — Risks

1. **Gesture complexity in `BoardEditor`.** It already routes draw / pan / pinch. Select, move, marquee, resize, rotate, split
   and eraser must not be added inline: they live in `useMouseTool` (one hook, a small mode state machine) and pure geometry
   modules, all unit-tested. `BoardEditor` only delegates.
2. **Rounding drift.** Whole-number points + repeated transforms drift. D7 avoids it: always from the pointer-down snapshot.
3. **Hit-testing precision.** Lines are thin: tolerance is in screen pixels (6px, converted by `1 / scale`), not board units, so
   they stay selectable when zoomed out.
4. **Sidebar changes.** `SidebarTree` and `Sidebar` are shared with the whole app. The picking mode is additive (no change when it
   is off); read `SidebarTree.linkNode`, `TreeItem` and `DropIcon` before editing.
5. **Double-click vs. click.** A click selects at once; a second quick click on the same line splits. The first click's selection
   is harmless; the split is one undo step and leaves both halves selected.
6. **Text and point sizes are unknown yet** (their plans define them): `boundsOf` uses a fixed placeholder box around the anchor
   (text 80×24, point 24×24 units); those plans replace it.
7. **Uncommitted work** from 17a / 17b sits in the working tree; this plan edits those files. Read them first.

## 2 — Approach

```
features/board/
  bounds.ts       boundsOf(object), unionBounds, boundsIntersect                  (pure)
  hit.ts          hitTest(board, point, tolerance), objectsInRect(board, rect)    (pure)
  transform.ts    Matrix; scaleAbout / rotateAbout / flipAbout / translate; transformObject(object, matrix)  (pure)
  operations.ts   moveBy, resizeTo, rotateBy, flip, duplicate, remove, recolour → Change   (pure)
  split.ts        splitLine(line, point): [LineObject, LineObject] | null          (pure)
  erase.ts        eraseFromPath(points, centre, radius): Point[][]                 (pure)
  colours.ts      coloursOf(objects), recolour(objects, from, to)                  (pure)
  selection.ts    per-map selected ids (store + hook)
  boardStore.ts   + changeObjects(mapId, Change)
  useMouseTool.ts the Mouse tool's state machine: select, move, marquee, resize, rotate, split, erase; preview + marquee rect
  SelectionBox.tsx + selectionButtons.ts   the dashed box and its buttons (per kind)
  ObjectModal.tsx, ObjectHeaderRow.tsx, LinkObjectsButton.tsx, ForwardLink.tsx     the shared modal frame
  SelectionPanel.tsx, ColoursPanel.tsx     the right panel
  LinkPickBar.tsx the "Linking …  Done" bar
features/links/linkPick.ts   link picking store: start(target) / stop() / use hook / toggleLink
components/ui/overlays/HoverInfo.tsx, hoverInfoPosition.ts
components/ui/drop/DropIcon.tsx           optional onPick (a clickable node)
components/layout/sidebar/Sidebar.tsx, SidebarTree.tsx, features/links/linkNode.ts   picking mode
features/board/render.ts, viewport.ts, BoardEditor.tsx   preview objects, fitBounds, delegation
```

```
pointer (Mouse tool) → useMouseTool ─ press on object ─▶ select (+ maybe move) ─ drag ─▶ preview map ─▶ paintBoard
                                    ─ press on empty ───▶ marquee ──────────────────▶ selection
 handles / buttons ─▶ operations.* (pure) ─▶ Change ─▶ boardStore.changeObjects ─▶ one history step ─▶ useBoard
 link button ─▶ linkPick.start ─▶ sidebar shows link icons on notes ─▶ click ─▶ toggleLink ─▶ boardStore (object.links)
```

## 3 — Geometry (pure, tested)

- **`bounds.ts`:** `Rect = { x, y, w, h }`. `boundsOf`: line / border = points min–max padded by `thickness / 2`; shape = the AABB of its
  rotated box; text / point = placeholder box around `anchor` (risk 6). `unionBounds(objects)`. `boundsIntersect(a, b)`.
- **`hit.ts`:** `hitTest(board, p, tolerance)`: walks `drawOrder` from the top, skips `canSelect === false`; line / border:
  distance from `p` to any segment ≤ `max(thickness / 2, tolerance)` (border also closes last→first); shape: point in its rotated
  box; text / point: inside `boundsOf`. `objectsInRect(board, rect)`: a path object counts when a point is inside the rectangle
  or a segment crosses its edges; others by `boundsIntersect`.
- **`transform.ts`:** `Matrix = [a, b, c, d, e, f]`; `scaleAbout(anchor, sx, sy)`, `rotateAbout(centre, radians)`,
  `flipAbout(axis, centre)`, `translate(dx, dy)`, `compose`. `transformObject(object, m)`: line / border → points through `m`
  and `handles` through its linear part only (they are offsets); shape → centre through `m`, `box.w / h` scaled by the
  matrix's axis scales, `rotation` added (best effort; plan 19 refines); text / point → `anchor`. Results are rounded to whole numbers.
- **`operations.ts`** returns a `Change` (`{ update: {id, patch}[]; remove: number[]; add: Draft[] }`):
  `moveBy(objects, dx, dy)`, `resizeTo(objects, handleStart, handleNow, keepRatio)`, `rotateBy(objects, angle, snap)`,
  `flip(objects, axis)`, `duplicate(objects)` (+16, +16; fresh ids come from the store), `remove(ids)`.
- **`split.ts`:** `splitLine(line, p)`: nearest point on the path; on a segment a point is inserted there; returns the two
  lines (`points` 0…i and i…end, their `handles` cut the same way, same `style`, `links`, `name`, `layer`); `null` for an
  end point or a one-point line.
- **`erase.ts`:** `eraseFromPath(points, centre, radius)`: densify (a point every `radius / 2`), drop the points within `radius`,
  split into runs, re-`simplify` each; runs with a single point stay dots. Applied on each move to the **original** points
  with all the pointer's positions so far (so it stays correct however fast the pointer moves).
- **`colours.ts`:** `coloursOf(objects)` distinct lower-cased `#rrggbb` (stroke, and a shape's fill), in first-seen order;
  `recolour(objects, from, to)` → a `Change` touching only objects that use `from`.

## 4 — Store, selection, view

- **`boardStore.changeObjects(mapId, change)`:** applies `remove`, `update`, `add` (new ids from `nextId`, appended on top) as
  **one** history entry, returns the new ids; strips board-links to removed ids; no-op (and no history entry) for an empty change.
- **`selection.ts`:** `Map<mapId, ReadonlySet<number>>`; `select(mapId, ids)`, `toggle`, `clear`, `useSelection(mapId)`. The
  editor derives `selected = board.objects.filter(o => set.has(o.id))`, so ids removed by undo simply vanish.
- **`viewport.ts`:** `fitBounds(rect, size, margin = 96, maxScale = 4)` (+ `useViewport.focusOn(rect)`).
- **`render.ts`:** `paintBoard(…, preview?: ReadonlyMap<number, BoardObject>)` draws the preview copy in place of the original.

## 5 — The Mouse tool (`useMouseTool.ts`)

Modes: `idle`, `moving`, `marquee`, `resizing`, `rotating`, `erasing`, and the flag `splitting`.
- **idle press:** `hitTest` → on an object: select it (Shift / Ctrl toggles; keeps a multi-selection if it is already in it) and
  arm a move (starts after 3px of travel); on empty: arm a marquee (a plain press with no travel clears the selection).
- **moving:** preview = `moveBy(selected, dx, dy)` with the pointer's board delta; up → `changeObjects`.
- **marquee:** the rectangle (a dashed overlay) → `objectsInRect` → `select`; Shift adds to the current selection.
- **resizing / rotating:** started from the box's handles (pointer capture on the handle); the preview comes from `resizeTo` /
  `rotateBy` on the **snapshot**; Shift keeps the ratio (resize) or snaps to 15° (rotate).
- **splitting:** the cursor is a crosshair; a click on the selected line → `splitLine` → `changeObjects` (remove 1, add 2, both
  selected) and the mode ends; Esc cancels. Double-click on any line does the same without the mode.
- **erasing:** a circle (screen radius 12px) follows the pointer; each move updates the preview from `eraseFromPath` on the
  snapshot; up → `changeObjects` (the object replaced by its remaining runs, or removed if nothing is left).
- **cursor:** `default`, `pointer` over an object, `move` while moving; `crosshair` splitting; none (the circle) erasing.
- **BoardEditor:** the 17b branch "Mouse tool → pan" becomes "Space / middle button → pan"; the Mouse tool calls `useMouseTool`
  handlers. Keys of D9 are added to its `onKeyDown`.

## 6 — Selection box (`SelectionBox.tsx`, `selectionButtons.ts`)

- The box is a DOM overlay over the canvas, `pointer-events-none`, with the buttons `pointer-events-auto`. Its rectangle is
  `boardToScreen` of `unionBounds(selected)` (the **preview** while a gesture runs), `border-dashed`, a minimum of 40×40px.
- `selectionButtons.ts`: a table `kind → buttons` with `corner` (`tl`, `tr`, `br`, `bl`, `tr-up`, `top`), `icon`, `label`, `info`
  (for HoverInfo), `run` (D4). A selection of several kinds uses the **intersection** of the kinds' buttons; several objects of
  one kind use the multi row of D4. Buttons that don't apply to every selected object are disabled, not hidden.
- Icons (`react-icons/lu`): resize `LuMoveDiagonal2`, rotate `LuRotateCw`, flip `LuFlipHorizontal2` / `LuFlipVertical2`, split `LuSplit`,
  duplicate `LuCopy`, remove `LuX`, link `LuLink`.

## 7 — The shared object UI

- **`ObjectModal`** (the frame plans 19–22 fill): a floating card (`FLOAT`), a header (`ObjectHeaderRow`), `children` (the kind's own
  options), a footer with `LinkObjectsButton` and a list of the object's links (each with an unlink ×). Until plan 19 the
  `children` for a line are a one-line "More options come with the Lines plan" hint.
- **`ObjectHeaderRow`:** `actions` array (default D12) + a name input (`updateObject` on blur / Enter, Esc restores) + `ForwardLink`.
  The icons are `IconButton`s wrapped in `HoverInfo`; split and eraser toggle the mode (aria-pressed); disabled when the
  kind can't (border: split and eraser until plan 20).
- **`ForwardLink`:** `LuCornerUpRight` shown when `links.length > 0`; opens beside the map with `useWorkspace().open({ type: 'note', id })`
  (articles: `{ type: 'article', id }`); several links open a small list (a `Dropdown`).
- **`LinkObjectsButton`:** "Link to other objects" with `LuLink`; `linkPick.start({ mapId, objectId })`; while picking it reads
  "Done linking".
- **`ColoursPanel`:** a title "N objects", then one row per colour (`<input type="color">` + the hex, + the number of objects
  using it); change → `changeObjects(recolour(...))` on **commit** (`onChange` of the colour input fires on release in
  browsers that preview, so each release is one undo step).
- **`SelectionPanel`:** nothing selected → renders nothing; one → `ObjectModal`; several → `ColoursPanel`.

## 8 — Link picking (`features/links/linkPick.ts`, sidebar)

- `linkPick.ts`: a tiny store (like `selectStore`) `{ target: { mapId, objectId } | null }`, `startLinkPick`, `stopLinkPick`, `useLinkPick`,
  and `toggleSidebarLink(mapId, objectId, id)` (adds or removes `{ to: 'sidebar', id }` through `updateObject`).
- `DropIcon.tsx`: optional `onPick?: () => void` → `role="button"`, `tabIndex`, `cursor-pointer`, click / Enter / Space call it; the
  droppable stays disabled when `onPick` is set. No visual change otherwise.
- `linkNode.ts`: `useLinkNode()` also reads `useLinkPick()`: while picking, for a note-like `objectId` it returns the node
  `shown` with `onPick` and `active` when already linked (the node fills like a targeted drop); all other nodes `hidden`.
- `SidebarTree.tsx`: `linkNode(node)` lets note and article rows (and pinned ones) return a node while picking (today it only
  returns one for `isLinkTarget` kinds).
- `Sidebar.tsx`: `open` is also true while picking; the 17b effect sets `peeking` for it (`isWide && !pinned && open`).
- `LinkPickBar`: bottom centre of the editor, "Linking *name* · Done"; Esc / Done / a new selection call `stopLinkPick`.

## 9 — HoverInfo (`components/ui/overlays/HoverInfo.tsx`)

`<HoverInfo title="Split" text="Click it, then click the point on a line…" shortcut="Double-click" side="right">{trigger}</HoverInfo>`:
wraps one focusable child (clones `aria-describedby`), 400ms open delay (none after another is open), a `popover="manual"` card in
the top layer positioned by `hoverInfoPosition(anchor, size, viewport, side)` (pure: tries `side`, flips when it doesn't fit,
clamps to the viewport, returns the arrow offset), `pointer-events-none`, closes on leave, blur, Esc, scroll. Same look as `Callout`
without its close button.

## Testing

Unit (vitest, `npm test` in `app/`):
- **bounds / hit:** each kind's bounds (padding by thickness; rotated shape); `hitTest` picks the topmost, honours tolerance (a
  point 5px from a line hits, 7px does not at scale 1; the same board distance at scale 0.2 still hits), skips the background layer,
  closes a border; `objectsInRect` for a segment that crosses the rectangle with no point inside.
- **transform / operations:** scale about each corner keeps the anchor fixed; rotate by 90° ×4 returns the original; flip twice is the
  identity; handles transform by the linear part only; results are whole numbers; `duplicate` offsets by 16 and leaves the original;
  `resizeTo` with `keepRatio`; `rotateBy` snaps to 15°.
- **split / erase / colours:** split at a vertex, on a segment (inserted point), at an end (null), handles cut with it; erase cuts
  the middle (two runs), the start (one run), all (none), a miss (unchanged); `coloursOf` order and case, `recolour` touches only
  objects with that colour.
- **boardStore.changeObjects:** one history step for a mixed change; ids for `add`; links to removed objects dropped; empty change
  = no step and no notification; undo restores everything.
- **selection / linkPick:** select / toggle / clear / notify; `toggleSidebarLink` adds then removes; starting a pick for another
  object replaces the target.
- **viewport.fitBounds / hoverInfoPosition:** centres and caps the scale; each side, the flip, the clamp.
- Existing tests stay green.

Manual (`npm run dev` in `app/`): select by click, Shift-click, marquee; move; resize from the handle (Shift keeps the ratio); rotate with
the rotate handle (the box stays upright); flips; duplicate; ✕ and Delete; split by icon and by double-click; eraser through the middle of
a line; each is one undo step; focus fits the object; the right panel shows the modal / colours; recolour in the colours panel; link
button → the sidebar opens (also while unpinned) and note rows show the link icon, click links and the forward-link icon opens the note
beside the map; Esc / Done end picking; hover-info on split; a map in a pane next to another panel (no pane drag while selecting);
touch (devtools) for tap-select; light / dark; `npm run build` and `npm run lint`.

Limits: no network or backend; canvas and gestures are checked by hand.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Bounds and hit-testing + tests | `features/board/bounds.ts`, `hit.ts` (+ tests) |
| 2 | Transforms and operations + tests | `features/board/transform.ts`, `operations.ts` (+ tests) |
| 3 | Split, erase, colours + tests | `features/board/split.ts`, `erase.ts`, `colours.ts` (+ tests) |
| 4 | `changeObjects` in the store + tests | `features/board/boardStore.ts`, `boardStore.test.ts` |
| 5 | Selection store + test | `features/board/selection.ts`, `selection.test.ts` |
| 6 | `fitBounds`, preview in `paintBoard` | `features/board/viewport.ts`, `render.ts` (+ test) |
| 7 | `HoverInfo` and its positioning + test | `components/ui/overlays/HoverInfo.tsx`, `hoverInfoPosition.ts`, `hoverInfoPosition.test.ts` |
| 8 | Link picking store; `DropIcon` `onPick`; `useLinkNode`; sidebar rows and forced-open | `features/links/linkPick.ts` (+ test), `components/ui/drop/DropIcon.tsx`, `features/links/linkNode.ts`, `components/layout/sidebar/SidebarTree.tsx`, `Sidebar.tsx` |
| 9 | `useMouseTool` (select, move, marquee, resize, rotate, split, erase) | `features/board/useMouseTool.ts` |
| 10 | `SelectionBox` and its button table | `features/board/SelectionBox.tsx`, `selectionButtons.ts` |
| 11 | Shared object UI: modal, header row, link button, forward link, colours panel, selection panel, link bar | `features/board/ObjectModal.tsx`, `ObjectHeaderRow.tsx`, `LinkObjectsButton.tsx`, `ForwardLink.tsx`, `ColoursPanel.tsx`, `SelectionPanel.tsx`, `LinkPickBar.tsx` |
| 12 | Wire into the editor: delegation, keys, Space / middle pan, panels | `features/board/BoardEditor.tsx` |
| 13 | Manual pass, `npm test`, `npm run lint`, `npm run build` | — |

Files **not** touched: `backend/`, `packages/shared/`, `app/src-tauri/`, `mocks/` (links live in the board objects; the existing note-to-project
links and `linkZone` are unchanged), `routes/`, the dashboard and cards, `features/board/boardCodec.ts`, `style.ts`, `types.ts` (17a's format is
unchanged: `Link` already has `to: 'sidebar'`), `src/styles/*`.

## Open items

- Which **modals** show which controls is each tool plan's job (19 lines and shapes, 20 borders, 21 text, 22 points); this plan only builds the frame.
- Text and point **bounds** (risk 6) are placeholders until plans 21 and 22.
