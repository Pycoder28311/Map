# 17b — Board editor shell: canvas with pan and zoom, tool panel, name bar, undo

**Goal:** a map's page becomes an editor. A white board fills the page, with **pan and zoom** (wheel, drag, pinch,
buttons). On top float a **name bar** and a **tool panel** (Mouse, Line, Border, Text, Point, plus Undo / Redo) at the top
left, and a small **zoom control** at the bottom left. The panel slides right while the sidebar is open. **Line** is
today's pencil; **Mouse** pans; the other tools are shown but disabled. **Undo / redo** work for everything drawn.

**Depends on:** 17a (board objects, `boardStore`, `lineFromStroke`, `drawOrder`, `Style`), 15 and 16 for the floating look
(reference only). **Blocks:** 18 (selection box and shared UI), and every tool plan after it.

**Frontend only.** No backend, database or API. The history lives in the in-memory board store.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | The board's picture is a **blank white board** (1600×1000 board units, as today). The real image layer comes much later | User |
| D2 | The tool panel **slides right while the sidebar is open in any way**: pinned (the page narrows, so it moves by itself) and the **hover peek** (the sidebar lies over the page: the panel shifts by `--sidebar-w − --sidebar-rail`, with the sidebar's own animation) | User |
| D3 | Tools: **Mouse** and **Line** work. **Border, Text, Point** are shown but **disabled**, with a tooltip naming the plan that adds them (20, 21, 22) | User |
| D4 | Layout, top left, top to bottom: the **name bar** (map name input + ⋯ menu), then the **tool panel** (vertical, rounded, shadowed). Bottom left: the **zoom control**. The top right is left empty (plan 23 puts branches / share / screenshot there). The bottom right is the Create button's | Default |
| D5 | **Pan:** drag with the Mouse tool, drag with the middle button, or hold **Space** and drag (any tool). **Zoom:** wheel toward the pointer (trackpad pinch too), two-finger pinch, the zoom control (− / % / + / Fit), keys `+` `−` `0` (fit) `1` (100%). Limits 10%–800% | Default |
| D6 | **Fit** on open: the whole board with a 48px margin. Until you move the view yourself it **re-fits when the page resizes** (sidebar pinned, panes, window); after that your view is kept. The view is remembered **per map while the app is open** (not saved) | Default |
| D7 | The pan can't lose the board: at least **80px of it** stays in view | Default |
| D8 | The pencil only draws **inside the board**: a stroke must start on it, points outside are clamped to its edge | Default |
| D9 | **Crisp at any zoom:** the canvas fills the page at the screen's pixel ratio and is **redrawn** with the view's transform (not a scaled bitmap). `style.fixedWidth` is honoured (the stroke keeps its screen width) | Default |
| D10 | **Undo / redo** live in `boardStore` (up to 100 steps per map, in memory): every change (add / update / remove / move) is one step; a new change clears the redo steps. Buttons in the tool panel and **Ctrl/⌘+Z**, **Ctrl/⌘+Shift+Z / Ctrl+Y**. Drag-style changes that must be one step arrive with plan 18 (`batch`) | Default |
| D11 | **Keys work only while the editor has focus** (it is focusable, takes focus on a press) and never while typing in a field: `V` Mouse, `L` Line, Space (pan), `+ − 0 1`, undo / redo | Default |
| D12 | The **name** is an input that renames the map (`renameObject`) on Enter / blur; Esc restores it; an empty name is refused. The **⋯ menu is the map card's own**: `useObjectActions().menuOf` (Rename, Pin, Duplicate, Move to, Add note, Add in screen, Archive, Delete), so one source of actions | Default |
| D13 | **Panels that fill:** `PanelDefinition` gets `fill?: boolean`. `PanelPage` and `Pane` give a filling panel the **full height** (no `min-h-full` / `pb-20`, no scrolling) so the editor has a definite size. Only `map` sets it | Default |
| D14 | Files: the editor is **`features/board/`** (`BoardEditor.tsx`…); `features/projects/MapPanel.tsx` stays as the registered panel and becomes a thin wrapper around it | Default |

## 1 — Risks

1. **Height.** `PanelPage` wraps content in `min-h-full pb-20` and `Pane` in a scrolling `flex-1` box, so a child's
   `h-full` has nothing to resolve against: the editor would collapse to its content. D13 fixes it with a flag the
   engine understands; it touches `features/workspace/` (small, tested by hand in page and panes).
2. **Pane drag.** In a pane, pressing on the page background starts a pane drag. `lib/dnd.ts` already leaves canvases
   and buttons alone (`startsOnBackground`); check that the **floating panels** (inputs, buttons, their gaps) and the
   canvas don't start a pane drag when drawing or panning, and add a `data-no-pane-drag`-style exclusion if a gap does.
3. **Sidebar peek state is private** to `Sidebar` (`useHoverIntent`). To shift the panel it must be shared: this plan adds
   `peeking` to `SidebarState` (provider + hook + one effect in `Sidebar`). Narrow screens use a drawer with a dim
   backdrop: no shift there.
4. **Wheel and pinch** need a non-passive listener (`preventDefault`), so it is added with `addEventListener`, not the
   React prop (React's wheel handler is passive). Touch needs `touch-action: none` on the canvas.
5. **Redraw cost.** A full redraw per frame is fine for hundreds of objects; it is coalesced with `requestAnimationFrame`.
   The stroke being drawn is added segment by segment on top (the view cannot change during a stroke: wheel / pinch are
   ignored while drawing).
6. **Uncommitted work.** `MapPanel.tsx` is modified and `features/board/` is new and uncommitted (17a). This plan builds on
   them as they are now; read the files before editing.

## 2 — Approach

```
features/projects/MapPanel.tsx   finds the map, renders <BoardEditor map={…} />   (registered panel, fill: true)
features/board/
  viewport.ts (+test)   BOARD size, Viewport {x, y, scale}; fit, zoomAt, panBy, clamp, screen↔board (pure)
  useViewport.ts        the view per map: state, wheel / pointer pan, pinch, keys, refit-until-moved
  render.ts             paintBoard(ctx, board, view, size, dpr): board sheet, then drawOrder(board), fixedWidth
  tools.ts              TOOLS: id, label, icon, key, enabled, soon (plan name)
  BoardEditor.tsx       canvas + pointer routing (draw / pan / pinch) + keys + the floating pieces
  ToolPanel.tsx         vertical tool buttons + undo / redo
  MapTitleBar.tsx       name input + ⋯ menu (useObjectActions)
  ZoomControls.tsx      − 100% + Fit
  floating.ts           the shared floating look (radius, shadow, surface)
  boardStore.ts         + history: undo, redo, useCanUndo, useCanRedo
components/layout/sidebar/   SidebarState.peeking (+ provider, Sidebar effect)
features/workspace/          PanelDefinition.fill, PanelPage, Pane
panels.ts                    map: fill: true
```

```
pointer → BoardEditor ─ Line tool, on board ─▶ stroke (live) ─ up ─▶ addObject(line) ─▶ boardStore ─▶ useBoard ─▶ paintBoard
                      ─ Mouse tool / middle / Space ─▶ useViewport.panBy ─▶ paintBoard
wheel / pinch / buttons ─▶ useViewport.zoomAt ─▶ paintBoard
Ctrl+Z ─▶ boardStore.undo ─▶ useBoard ─▶ paintBoard
```

## 3 — View maths (`features/board/viewport.ts`, pure)

- `BOARD = { width: 1600, height: 1000 }`, `ZOOM = { min: 0.1, max: 8 }`, `FIT_MARGIN = 48`, `KEEP_VISIBLE = 80`.
- `Viewport = { x: number; y: number; scale: number }`: a board point `b` is at screen `b * scale + (x, y)`.
- `fitView(size)`: the scale that fits the board with the margin (not above 1.5 so a huge window does not blow it up), centred.
- `zoomAt(view, point, factor, size)`: new scale clamped to `ZOOM`; the board point under `point` stays under it; then `clampView`.
- `panBy(view, dx, dy, size)`, `clampView(view, size)`: keeps at least `KEEP_VISIBLE` px of the board in view on every side.
- `screenToBoard(view, p)`, `boardToScreen(view, p)`, `insideBoard(p)`, `clampToBoard(p)`.
- `zoomFactorOf(wheelEvent)`: `exp(-dy · 0.0015)` (line-mode deltas ×16; `ctrlKey` pinch deltas ×6.6).

## 4 — `useViewport` and `BoardEditor`

- `useViewport(mapId, size)` returns `{ view, zoomTo(factor, at?), panBy, fit, actualSize, moved }`. State is also written to a
  module-level `Map<mapId, Viewport>` (D6). `moved` flips on the first user pan / zoom; before that `size` changes call `fit`.
- `BoardEditor({ map })`: a `relative h-full overflow-hidden bg-fill` root, `tabIndex={0}`, `outline-none`.
  - **Size:** `ResizeObserver` on the root → `{ w, h }`; the canvas is `w·dpr × h·dpr` with CSS size `w × h`.
  - **Paint:** an effect on `[board, view, size, tool?]` schedules `paintBoard` with `requestAnimationFrame`.
  - **Pointer routing** (`onPointerDown / Move / Up / Cancel` on the canvas, pointer capture):
    1. two active pointers → pinch (zoom by their distance ratio, pan by their midpoint); a stroke in progress is dropped;
    2. middle button, or Space held, or Mouse tool → pan;
    3. Line tool, left button, `insideBoard(screenToBoard(...))` → stroke: `stroke.current = [point]`; moves push
       `clampToBoard(...)` and draw the segment with the current transform; up → `addObject(mapId, lineFromStroke(points, PENCIL_STYLE, TOLERANCE))`
       (a press with no move leaves a dot, as today).
  - **Cursor:** Mouse `grab` / `grabbing`; Line `crosshair`; Space held `grab`; disabled tools never become active.
  - **Wheel:** native listener (`{ passive: false }`) → `zoomAt`.
  - **Keys** (D11), on the root's `onKeyDown`; ignored when `event.target` is an input / textarea / contenteditable.
  - Children: `<MapTitleBar/>`, `<ToolPanel/>`, `<ZoomControls/>`.

## 5 — Rendering (`features/board/render.ts`)

`paintBoard(ctx, board, view, size, dpr)`:
1. `setTransform(dpr, 0, 0, dpr, 0, 0)`, clear.
2. Draw the white sheet (`0,0,BOARD.width,BOARD.height` transformed) with a soft shadow, so it reads as a sheet on `bg-fill`.
3. `setTransform(dpr·scale, 0, 0, dpr·scale, dpr·x, dpr·y)`, then `drawOrder(board)`: `line` and `border` via `drawStroke`
   (moved here from `MapPanel`; `lineWidth = fixedWidth ? thickness / scale : thickness`, opacity, colour, round caps).
   Other kinds are skipped until their plans.
The `TOLERANCE` and sheet size constants move out of `MapPanel` (to `viewport.ts` / the editor).

## 6 — Floating UI

- **`floating.ts`:** `FLOAT = 'rounded-(--card-radius) border border-line bg-surface shadow-lg'`, and `peekShift` classes:
  `transition-transform duration-(--sidebar-duration) ease-out` with `translate-x-[calc(var(--sidebar-w)-var(--sidebar-rail))]` when
  `isWide && !pinned && peeking` (class strings written out in full for Tailwind). Both left-top pieces use it.
- **`MapTitleBar`:** `absolute start-3 top-3`, an input (borderless, `text-heading`, width fits the name up to ~280px) and the
  existing `TreeMenu` (⋯) with `useObjectActions().menuOf(findObject(id), { panel: { type: 'map', id }, onRename: focus the input, element: () => root })`;
  renders `actions.dialogs` once. Rename rules in D12.
- **`ToolPanel`:** `absolute start-3 top-16 flex flex-col gap-1 p-1.5`, `IconButton`s: Mouse (`LuMousePointer2`), Line (`LuSpline`),
  Border (`LuHexagon`), Text (`LuType`), Point (`LuMapPin`); a `Divider`; Undo (`LuUndo2`), Redo (`LuRedo2`). The active tool has the
  accent look (`aria-pressed`); disabled tools use `disabled` plus a tooltip ("Borders: coming in plan 20"); undo / redo disabled via
  `useCanUndo / useCanRedo`. Tooltips include the key (`Line (L)`).
- **`ZoomControls`:** `absolute start-3 bottom-3`, a horizontal pill: − , the `%` (click = fit), + . Same `FLOAT` look and peek shift.
- The floating pieces stop pointer events from reaching the canvas (they are siblings of it, not children).

## 7 — Sidebar peek (`components/layout/sidebar/`)

- `useSidebar.ts`: `SidebarState` gets `peeking: boolean` and `setPeeking: (open: boolean) => void`.
- `SidebarProvider.tsx`: a `useState(false)` for it, in the context value.
- `Sidebar.tsx`: `useEffect(() => setPeeking(peek.open), [peek.open])` and cleanup to `false` on unmount. Nothing else changes.
- `peekShift` reads `useSidebar()`: `isWide && !pinned && peeking`.

## 8 — History (`features/board/boardStore.ts`)

- Per map `{ past: Board[]; future: Board[] }` (module-level `Map`). The internal `set(mapId, board)` pushes the previous board onto
  `past` (cap 100, oldest dropped) and clears `future`; `undo` / `redo` swap boards through a path that does not record.
- New exports: `undo(mapId)`, `redo(mapId)`, `useCanUndo(mapId)`, `useCanRedo(mapId)` (boolean snapshots, so no extra renders),
  `canUndo` / `canRedo` getters for the keys. `resetBoards()` clears the history too.
- Boards are immutable (17a D15), so a step is just a reference: no copying.

## 9 — Workspace `fill` flag (`features/workspace/`, `panels.ts`)

- `types.ts`: `PanelDefinition.fill?: boolean` ("fills the panel's whole area; no page padding, no scrolling").
- `PanelPage.tsx`: root `className={fill ? 'relative h-full' : 'relative min-h-full pb-20'}` (keeps `data-share-id` and `DropZones`).
- `Pane.tsx`: the content box is `min-h-0 flex-1 overflow-auto`; for `fill` use `overflow-hidden` and wrap the content in `h-full`.
- `panels.ts`: `map: { …, fill: true }`. `instructions/adding-a-panel.md`: one line documenting `fill`.

## Testing

Unit (vitest, `npm test` in `app/`):
- **viewport:** `fitView` centres and respects the margin and the 1.5 cap; `zoomAt` keeps the point under the pointer fixed and
  clamps to `ZOOM`; `clampView` keeps ≥ `KEEP_VISIBLE` px; `screenToBoard` / `boardToScreen` are inverses; `clampToBoard`;
  `zoomFactorOf` for pixel, line and `ctrlKey` deltas.
- **boardStore history:** undo of add / update / remove / move restores the exact earlier board object; redo after undo; a new change
  clears redo; the 100-step cap; undo with no history is a no-op and does not notify; `useCanUndo` snapshots are stable; `resetBoards`.
- Existing tests stay green.

Manual (`npm run dev` in `app/`, signed in): open a map as a page and as a pane next to another panel: the board fills it and
**fits**; wheel zoom keeps the point under the pointer; drag pans with Mouse, middle button and Space; pinch on a touch screen (devtools);
the board cannot be lost; draw with Line: the stroke stays crisp zoomed in and out; drawing outside the sheet is clamped / ignored; leave and
return: strokes and view are kept; undo / redo by button and keys; `V` / `L` switch tools; typing in the name input never triggers a key;
rename on Enter / blur / Esc; the ⋯ menu matches the map card's; pin the sidebar, unpin it and hover the rail: the tool panel and zoom control
slide right with the sidebar; narrow width (drawer) and focus mode (Zoom button): no overlap; dragging in a pane draws or pans and never starts a
pane drag; the Create button and the pane island do not overlap anything; light and dark theme. `npm run build` and `npm run lint` pass.

Limits: no network and no backend. Canvas drawing is checked by hand (no canvas in the test environment).

## Task list

| # | Task | Files |
|---|---|---|
| 1 | View maths + tests | `features/board/viewport.ts`, `viewport.test.ts` |
| 2 | History in the board store + tests | `features/board/boardStore.ts`, `boardStore.test.ts` |
| 3 | `fill` flag on panels (page, pane, registry, docs line); check the pane drag exclusions | `features/workspace/types.ts`, `PanelPage.tsx`, `Pane.tsx`, `panels.ts`, `instructions/adding-a-panel.md`, `lib/dnd.ts` (read) |
| 4 | Share the sidebar peek state | `components/layout/sidebar/useSidebar.ts`, `SidebarProvider.tsx`, `Sidebar.tsx` |
| 5 | Renderer (move `drawStroke`, add the sheet, `fixedWidth`) | `features/board/render.ts` |
| 6 | `useViewport` (state, per-map memory, refit until moved) | `features/board/useViewport.ts` |
| 7 | Tools table and floating look | `features/board/tools.ts`, `floating.ts` |
| 8 | `ToolPanel`, `ZoomControls`, `MapTitleBar` | `features/board/ToolPanel.tsx`, `ZoomControls.tsx`, `MapTitleBar.tsx` |
| 9 | `BoardEditor`: canvas, size, pointer routing (draw / pan / pinch), wheel, keys | `features/board/BoardEditor.tsx` |
| 10 | `MapPanel` becomes the thin wrapper | `features/projects/MapPanel.tsx` |
| 11 | Manual pass (see Testing), `npm test`, `npm run lint`, `npm run build` | — |

Files **not** touched: `backend/`, `packages/shared/`, `app/src-tauri/`, `mocks/` (the map's name goes through the existing `renameObject`), `routes/`,
the dashboard and its cards, `features/board/boardCodec.ts`, `style.ts`, `types.ts` (17a's model and file format are unchanged), `src/styles/*`
(existing tokens only: `--sidebar-w`, `--sidebar-rail`, `--sidebar-duration`, `--card-radius`).

## Open items

- None blocking. Shortcuts beyond `V`, `L`, Space, `+ − 0 1` and undo / redo are left to the tool plans (each adds its own key).
