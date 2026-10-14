# 19 — Lines and shapes

**Goal:** the Line tool gets map.md's full line modal (colour, opacity, four line types, arrows, four drawing ways,
fixed width, thickness) and draws each line the chosen way. Lines can be edited on the map (Figma-style points and curve
handles) and two lines that touch can be joined with a click. The same tool also draws **shapes** (rectangle, ellipse,
star…) as the `shape` object. Everything is rendered, hit-tested, selected, transformed and saved with what 17a / 18 built.

**Depends on:** 17a (objects, codec, store), 17b (editor, tool panel), 18 (selection box, `ObjectModal` frame, `useMouseTool`,
`changeObjects`). **Blocks:** 20 (borders reuse the stroke renderer, the style controls, the point editor and the shape grid),
21, 22, 23.

**Frontend only.** No backend, database or API. **No codec change**: `Style` already carries every field, `Path` already
carries `handles`, and the `shape` record already exists (17a); this plan only starts *using* them.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Shapes are drawn from the Line tool.** The line modal's drawing-way grid has a fifth element, **Shape**; picking it shows the 3-column shape grid (map.md's "like Microsoft Paint") and a drag on the board then draws a `shape` object (corner to corner; Shift = square / circle). No new tool in the panel | User |
| D2 | **Two stages in one plan:** A = modal + rendering + drawing ways + shapes (tasks 1–14); B = on-map point editing, curve handles and joining touching lines (tasks 15–19). Stage A ships and is usable alone | User |
| D3 | **Pen style.** With the Line tool active (and nothing selected) the modal edits the **pen**: the style, shape and fill the next objects are drawn with. Held in a small store, remembered while the app runs, **not undoable**. Selecting an object (Mouse tool) edits that object, **undoable** | User |
| D4 | **Six arrow heads:** open V, filled triangle, diamond, circle, bar, double chevron. `style.arrow.style` is the index into `ARROW_HEADS` (append-only, like `SHAPE_TYPES`); `size` is the bar | User |
| D5 | **Plain pencil unchanged.** exact way + solid + softness 0 draws and stores exactly as today (same `simplify`, same tolerance 2.5, same points). Every other combination is built on top of that geometry | User (17a/17b rule) |
| D6 | **Drawing ways** (the pointer path → stored points): **exact** = today's simplified path; **rounded** = simplified with tolerance 8, each point gets smooth curve `handles` (`autoHandles`, Catmull-Rom); **straight** = only the first and last point; **corners** = simplified with tolerance 6, then points that turn less than `amount`° are dropped (amount = "corner degrees", default 45). Style defaults per way: exact softness 0, corners 45° | Default |
| D7 | **Softness (exact)** is applied **when painting**, not stored in the points: corners of the polyline are rounded with radius `amount/100 × 0.5 ×` the shorter neighbouring segment (quadratic curve through the segment midpoints). `amount` 0 = today's sharp polyline | Default |
| D8 | **Changing the way of an existing line** keeps its points: to **rounded** it generates `handles` (`autoHandles`); to any other way it drops the handles. The change is one undo step | Default |
| D9 | **Line types** (map.md, all painted from one flattened path): **solid**; **dashed** = `part` long, `gap` apart; **double** = two parallel lines, `gap` between their centres; **diagonal** = slanted ticks across the line every `part + gap`, 45°, length `2 × thickness`. Defaults when picked: dashed part 12 gap 8, diagonal part 6 gap 8, double gap 6 (× thickness at pick time) | Default |
| D10 | **Arrows:** a master checkbox (checking it puts one arrow on the end, unchecking removes both); under it two half rows, start and end, each a sample line with an arrowhead and its own checkbox on the opposite side; under those the one real drop-down of the modal: the grid of the 6 heads and a size bar (default 4 × thickness, min 8). The arrow follows the path's tangent at that end | User (map.md) |
| D11 | **All options visible**, one below the other, none in drop-downs (map.md EDIT) except the arrow head grid; a sub-bar (gap, part, softness, corner degrees) shows **under** its option only while that option is selected | User (map.md) |
| D12 | **Samples:** every type and way row shows a small curved sample drawn by the real renderer (`StyleSample`, a tiny canvas), so a sample can never disagree with the board | User (map.md) |
| D13 | **Slider commit:** a slider shows its value live (the canvas previews it) and writes **one** change when released (`change`, as `ColoursPanel` does), so one drag = one undo step | Default |
| D14 | **Shape options:** the shape grid, a **parameter bar** only for shapes that have one (`roundRect` corner radius, `star` number of points 3–12; default 5), fill (checkbox + colour + opacity; default **no fill**), and the outline controls (colour, opacity, type, thickness, fixed width). Thickness 0 = no outline. A shape has no arrows or drawing way; those sections are hidden | Default |
| D15 | **Shape outlines are polygons.** Every shape is generated as a flattened closed polygon in its own box (curves sampled), then rotated; fill, outline (any line type), hit-test and bounds all use that one polygon | Default |
| D16 | **Hover** (Mouse tool): a hovered exact line is lightened (a wider translucent halo under it) and the cursor shows a pointer. A hovered line of another way also shows its points (and handles of the selected one) — stage B. Hover state lives in `useMouseTool` (it already has `over`) | User (map.md) |
| D17 | **Point editing** (stage B): a single selected **non-exact** line shows its points as small squares on the map: **drag a point** to move it (its handles go with it); in **rounded** lines the point's two handle knobs show, **drag a knob** to change the curvature (the other knob mirrors; Alt breaks the mirror). Straight lines show only the two ends; corners lines show their corners (no handles). One drag = one undo step | User (map.md) |
| D18 | **Join:** hovering the place where two lines' ends touch (within 6 screen px of each other) shows a join marker; clicking it merges the two lines into one (the first keeps name, style and links; links of both are kept, without duplicates) — one undo step. Needs both lines to be `line` objects | User (map.md) |
| D19 | **Eraser and split on curved lines:** split cuts a Bézier at the exact place (`splitCubic`), so a rounded line keeps its shape; the eraser first **flattens** a line that has handles into plain points, so its pieces become `exact` lines with `amount 0` | Default |
| D20 | **Not in this plan:** adding or deleting a point on an existing line (map.md does not describe it and double-click is split); handles for **corners** lines; images | Default |
| D21 | A line's **bounds** and **hit-test** use its flattened curve, so the selection box wraps a curve's bulge | Default |

## 1 — Risks

1. **`useMouseTool` and `BoardEditor` grow again.** Point drags, handle drags and hover go in `useMouseTool` as three small
   modes (`vertex`, `handle`, plus the hover value); the maths is in `pathEdit.ts` and `join.ts` (pure, tested). The drawing
   preview of non-pencil lines goes through a `draft` object, not inline canvas code in `BoardEditor`.
2. **Preview performance.** Plain pencil keeps today's incremental segment (D5, no regression). Every other way repaints the
   board plus one draft object per pointer move (`paintBoard(..., extra)`); boards are hundreds of small objects. If it ever
   feels slow, throttle with `requestAnimationFrame` (one line) — measure before adding.
3. **Painting cannot be unit-tested** (no canvas in the test environment). All geometry is pure and tested (`flatten`,
   `strokeParts`, `arrowHead`, `shapeOutline`); `render.ts` only feeds it to the context, and is checked by eye (see Testing).
4. **Shape resize while rotated.** The selection box is axis-aligned (18, D5). Dragging a non-uniform resize of a *rotated*
   shape scales its own axes by the box's factors (18's best effort). It is exact for unrotated shapes and for uniform
   scaling; non-uniform on a rotated shape is approximate and stays so.
5. **Dash/double/diagonal at corners.** Dashes run along the flattened path by arc length (continuous round corners); double
   lines offset by the segment normals with a mitre limit, so tight corners can show a small notch. Accepted; noted in the modal's sample only.
6. **`fixedWidth` for everything length-based.** thickness, dash length, gap, arrow size and tick length are board units
   normally and **÷ scale** when `fixedWidth` is set (as `drawStroke` does for the width today). All go through one `unit(style, scale)`.
7. **Uncommitted work** from 17a–18 sits in the working tree and this plan edits those files. Read them first.

## 2 — Approach

```
features/board/
  bezier.ts       flatten(points, handles?, closed?), splitCubic, nearestOnCurve, autoHandles          (pure)
  pathGeometry.ts flattenedOf(object) (WeakMap-cached), softened(polyline, softness), lengthOf, pointAt(distance)  (pure)
  strokeParts.ts  strokeParts(flat, style, unit): { dash, lines[], ticks[] }  dashed / double / diagonal  (pure)
  arrows.ts       ARROW_HEADS, arrowHead(head, tip, angle, size): Point[][] (+ filled flag), endTangents(flat)  (pure)
  shapes.ts       shapeOutline(shape, box, rotation, param): Point[], SHAPE_PARAM (which shapes have one)  (pure)
  drawLine.ts     drawLine(stroke, style): Omit<LineObject,'id'>      replaces paths.lineFromStroke for non-plain ways
                  wayChange(line, way): Patch   (D8)
  pen.ts          pen store: { style, shape: ShapeType | null, fill }  + usePen, setPen
  pathEdit.ts     movePoint, moveHandle, hitPathPoint(object, p, tolerance)                            (pure)
  join.ts         findJunction(board, p, tolerance), joinLines(a, b)                                   (pure)
  render.ts       + paintObject for line / border / shape, arrows, hover halo, paintBoard(..., extra, hover)
  StyleSample.tsx a tiny canvas drawing an S-curve in a given Style / arrow / shape
  LineOptions.tsx the line / pen modal body (sections below)       ShapeOptions.tsx the shape modal body
  ShapeGrid.tsx   the 3-column grid of shape outlines
  PenPanel.tsx    the floating card for the Line tool (pen), LineOptions + ShapeGrid, no name row / link footer
  PathEditor.tsx  stage B: point squares, handle knobs, join marker (an overlay like SelectionBox)
components/ui/fields/RangeField.tsx, CheckField.tsx     labelled slider (live + commit on release), labelled checkbox
```

```
Line tool drag ─▶ stroke points ─▶ drawLine(stroke, pen.style)  ─▶ addObject        (shape pen: box ─▶ addObject shape)
                       └─ preview: draft object ─▶ paintBoard(extra) while dragging
selected / hovered object ─▶ paintObject: flattenedOf ─▶ softened ─▶ strokeParts ─▶ ctx   (+ arrowHead at the ends)
modal control ─▶ preview patch (live) ─▶ commit on release ─▶ updateObject(mapId, id, patch) ─▶ one history step
point / handle drag ─▶ pathEdit (pure) ─▶ preview board ─▶ pointer-up: changeObjects (one step)
```

## 3 — Geometry (pure, tested)

- **`bezier.ts`:** `flatten(points, handles, closed)` turns the path into a polyline: a segment `i→i+1` is the cubic
  `p_i, p_i+out_i, p_i+1+in_i+1, p_i+1` when the handles are there (a zero handle pair is a straight segment), sampled so a
  step is ≤ 1 screen-ish unit (adaptive: 4–32 steps by the control polygon's length). `splitCubic(a, b, c, d, t)` (de Casteljau).
  `nearestOnCurve(points, handles, p)` → `{ segment, t, point, distance }` (flattened search, then refined `t`).
  `autoHandles(points)`: Catmull-Rom → `out_i = (p_{i+1} − p_{i−1}) / 6`, `in_i = −out_i`; the two ends have 0 on their free side.
- **`pathGeometry.ts`:** `flattenedOf(object)`: `flatten` for lines / borders, `shapeOutline` for shapes, cached in a `WeakMap`
  keyed by the (immutable) object, so each frame costs nothing for unchanged objects. `softened(polyline, amount)` (D7).
  `lengthOf`, `pointAt(polyline, distance)` → point + tangent.
- **`strokeParts.ts`:** from the flattened (and softened) polyline and the style: **dashed** → the sub-polylines of the "on"
  parts (round caps), **double** → two offset polylines (±gap/2 by the normals, mitre-limited), **diagonal** → tick segments
  every `part + gap`. Solid returns the polyline itself. Lengths pass through `unit` (risk 6). Pure and tested with straight
  and curved inputs (total on-length, offset distance, tick spacing and angle).
- **`arrows.ts`:** `ARROW_HEADS` (6, D4); `arrowHead(head, tip, angle, size)` → the head's polylines and whether it is
  filled; `endTangents(polyline)` → direction at start and end (for a dot or very short line: none, no arrow).
  The line is shortened under a filled head so the stroke does not poke through its tip.
- **`shapes.ts`:** `shapeOutline(shape, box, rotation, param)` for the 11 `SHAPE_TYPES`: rect, roundRect (`param` radius, default
  16, clamped to half the short side), ellipse (48 points), triangle, rightTriangle, diamond, pentagon, hexagon, star
  (`param` points 3–12, default 5, inner radius 0.4), arrow (block arrow), heart (two cubics, flattened). `SHAPE_PARAM`
  says which have a parameter and its range.
- **`drawLine.ts`:** `drawLine(stroke, style)` per D6, returning the object ready for `addObject`. Plain exact + solid gives
  exactly `lineFromStroke(stroke, style)` (D5; that function stays and `drawLine` calls it). `wayChange(line, way)` (D8).
- **`hit.ts` / `bounds.ts` / `erase.ts` / `split.ts` changes (existing, tested):** lines, borders and shapes use
  `flattenedOf` (D21): `boundsOf` pads by `thickness / 2` (+ arrow size at an end that has one), `distance` to the flattened
  segments, `objectsInRect` the same; a shape is hit **inside its polygon** (not its box). `eraseFromPath` gets the flattened
  points of a handled line and its pieces drop the handles and set `way: 'exact', amount: 0` (D19). `splitLine` uses
  `nearestOnCurve` + `splitCubic` when handles exist.

## 4 — Rendering (`render.ts`)

- `drawStroke` is replaced by **`paintObject(ctx, object, scale, hovered)`**: `flattenedOf` → `softened` (exact + amount) →
  `strokeParts` → `ctx.stroke()` per part (round caps and joins as today), then the arrow heads, in the object's colour and
  opacity. A shape first fills its polygon (`fill.color` at `fill.opacity`), then strokes the outline when `thickness > 0`.
  Dots stay dots (one point = a round cap).
- **Hover** (D16): the halo is the same stroke again, 3 px (screen) wider at 25 % opacity, drawn under it.
- `paintBoard(ctx, board, view, size, dpr, extra?, hover?)`: `extra` objects (the draft being drawn) paint on top without
  being in the board. 18's `preview` Board keeps working unchanged (it *is* a board).
- Today's `drawStroke(ctx, points, style, scale, closed)` stays for the incremental pencil segment (D5) and is reimplemented
  on top of `paintObject` only if that is a one-line change; otherwise it is left alone.

## 5 — Stage A: the modal, the pen, drawing

- **`pen.ts`:** `{ style: Style; shape: ShapeType | null; fill: Fill | null }`, `usePen`, `setPen(patch)`. Starts as `PENCIL_STYLE`,
  no shape. Picking a drawing way also resets `amount` to the way's default (D6).
- **`LineOptions.tsx`** (`{ style, onPreview, onCommit, kind }`; used for a selected line, for a shape's outline and for the pen).
  Top to bottom (map.md order):
  1. **Colour** input + **opacity** bar.
  2. **Types** — four rows, one below the other, each a `StyleSample`; the selected one shows its sub-bars (dashed / diagonal:
     **gap** and **part**; double: **gap**) under it.
  3. **Arrows** — master checkbox; the two half rows (start, end) with a checkbox each on the outer side; the head grid
     drop-down; the size bar. Hidden for shapes.
  4. **Drawing way** — a two-column grid: exact, rounded, straight, corners (+ **Shape** for the pen only, D1); sub-bar under
     the selected one: **softness** (exact), **corner degrees** (corners). Hidden for shapes.
  5. **Same width as I zoom** checkbox; **thickness** bar.
- **`ShapeGrid.tsx`:** three columns of `StyleSample`-like outline buttons for `SHAPE_TYPES`. In the pen it picks what the next
  drag draws; for a selected shape it changes that shape's type. **`ShapeOptions.tsx`** (selected shape): grid, param bar, fill
  group (checkbox + colour + opacity), then the `LineOptions` outline controls (types, fixed width, thickness, colour,
  opacity) with arrows and drawing way hidden.
- **`PenPanel.tsx`:** shown by `BoardEditor` when `tool === 'line'` (same place and card as `ObjectModal`, `end-3 top-16 w-72`,
  title "Line", then `LineOptions` + the shape grid when the Shape way is picked). Edits `pen` only.
- **`SelectionPanel.tsx`:** the `line` case renders `LineOptions` (replacing the "plan 19" placeholder), the `shape` case
  `ShapeOptions`, both through `ObjectModal`'s `children`. Their `onCommit(patch)` → `updateObject(mapId, id, { style: {…} })`
  (shape: also `shape`, `param`, `fill`); `onPreview(patch | null)` is lifted to `BoardEditor`, which paints
  `shown = previewOf(board, selectedId, patch)` while a slider is held (D13). Header actions for shapes: focus only (split and
  eraser stay disabled, `ObjectHeaderRow`'s `CAN`).
- **`BoardEditor.tsx` drawing:** in the Line tool, `onDown` starts a **draft**: stroke points (as today) or, when `pen.shape`
  is set, the two corners. Plain pencil keeps the incremental segment (D5); everything else sets `extra = [draftObject]` and
  repaints. `onUp` commits `drawLine(points, pen.style)` or the shape (`{ kind: 'shape', box, rotation: 0, param, fill, style }`
  with a minimum box of `MIN_SIZE`; a click without drag draws nothing for shapes) with `addObject`. Esc / a second finger drops
  it, as for strokes today.
- **`ObjectHeaderRow` / `ObjectModal`:** unchanged API; the `onErase` and `onSplit` stay line-only.
- **New UI primitives** in `components/ui/fields/`: `RangeField` (label, min/max, live value, `onInput` + native `change`
  commit like `ColourRow`) and `CheckField`; styled with the existing `FIELD_*` tokens, light and dark.

## 6 — Stage B: editing on the map

- **`pathEdit.ts`:** `movePoint(object, index, to)` → `Patch` (rounded to whole numbers, handles unchanged since they are
  offsets); `moveHandle(object, index, side, to, mirror)` → `Patch`; `hitPathPoint(object, p, tolerance)` →
  `{ kind: 'point' | 'in' | 'out', index } | null` (handles tested before points, tolerance in screen px ÷ scale).
- **`join.ts`:** `findJunction(board, p, tolerance)` → `{ a, b, at }` for two different `line` objects whose end points are
  both within `tolerance` of each other **and** of `p`; `joinLines(a, b)` → a `Change` (`update` a with the merged
  points / handles — reversing `b` when needed so the ends meet — and `remove` b; links merged and de-duplicated).
- **`useMouseTool.ts`:** new hover value `junction`, new modes `vertex` and `handle` (press on a point or knob of the single selected
  non-exact line starts them), previewing with `applyChange` and committing once with `changeObjects` on pointer-up
  (same pattern as `moving`). A click on a hovered junction runs `joinLines` and selects the result. `over` also reports a
  hovered line for D16's halo; the hovered id is passed to `paintBoard`.
- **`PathEditor.tsx`:** the overlay (like `SelectionBox`): point squares, handle knobs with their guide lines (only for the
  selected rounded line), a join marker at a hovered junction. Points of a *hovered but unselected* non-exact line show as
  faint dots (D16). Pointer events go through the same window-listener pattern as 18's box buttons.
- **`BoardEditor.tsx`:** renders `PathEditor` next to `SelectionBox` when the Mouse tool has a single non-exact line selected.

## Testing

All pure modules get `*.test.ts` first (vitest, like 17a / 18):
- `bezier`: flatten of a straight, a handled and a closed path (end points exact, step bound), `splitCubic` halves rejoin to the
  original, `nearestOnCurve`, `autoHandles` (ends, symmetry, a straight run gives zero-length handles).
- `pathGeometry`: `flattenedOf` returns the *same array* for the same object; `softened` with 0 returns the input, with 100
  still passes through the ends.
- `strokeParts`: dashed on-length and count on a known polyline, double offset = `gap / 2` on a straight line, diagonal tick
  spacing and angle, `unit` with `fixedWidth`.
- `arrows`: each of the 6 heads has its tip on the tip point and is symmetric about the angle; no tangent for a dot.
- `shapes`: all 11 outlines stay inside the box (± rotation), have ≥ 3 points, param clamping, star point count.
- `drawLine`: plain pencil equals `lineFromStroke` byte for byte (D5); per way point counts (straight = 2, corners drop
  shallow turns by degrees, rounded has `handles.length === points.length`); `wayChange` both directions.
- `hit` / `bounds` / `erase` / `split` updated for handled lines and shape polygons (the existing tests must stay green).
- `pathEdit`, `join` (reversal when ends meet start-to-start, links merged, far ends not joined).
- `pen` store and `boardCodec` round trip of a handled line and a filled, rotated shape (the codec already supports both; test pins it).
- `boardStore.changeObjects` for a join (one history step).

**Not testable here — the browser pass** (the same list as 18 must be done too): every line type, arrows in all 6 heads at both
ends and at tiny / large sizes, `fixedWidth` while zooming, each drawing way by hand, softness feel, the 11 shapes drawn,
filled, rotated and resized, live slider preview and single undo steps, point and handle dragging, join marker, hover halo,
light and dark themes, touch. State this clearly in the hand-over; do not claim the UI is verified from tests alone.
Run `npx tsc -b`, `npx vitest run`, the lint and `npm run build` at the end of each stage.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `bezier.ts`: flatten, splitCubic, nearestOnCurve, autoHandles (+ tests) | `features/board/bezier.ts`, `bezier.test.ts` |
| 2 | `shapes.ts` outlines and params; `arrows.ts` heads and tangents (+ tests) | `shapes.ts`, `arrows.ts`, tests |
| 3 | `pathGeometry.ts` (cached flatten, softened, length) and `strokeParts.ts` (dashed, double, diagonal, `unit`) (+ tests) | `pathGeometry.ts`, `strokeParts.ts`, tests |
| 4 | Use the flattened geometry in `bounds`, `hit` (shape polygon), `erase` (flatten + exact), `split` (Bézier); keep the old tests green | `bounds.ts`, `hit.ts`, `erase.ts`, `split.ts`, tests |
| 5 | `drawLine.ts` + `wayChange`, `pen.ts` store (+ tests); keep `paths.lineFromStroke` | `drawLine.ts`, `pen.ts`, `paths.ts`, tests |
| 6 | `render.ts`: `paintObject` (types, softness, arrows, shape fill and outline, halo), `paintBoard(extra, hover)` | `render.ts` |
| 7 | UI primitives `RangeField`, `CheckField` | `components/ui/fields/` |
| 8 | `StyleSample`, `ShapeGrid` | `features/board/StyleSample.tsx`, `ShapeGrid.tsx` |
| 9 | `LineOptions` (colour, types, arrows, drawing way, width) with live preview + commit on release | `LineOptions.tsx` |
| 10 | `ShapeOptions` | `ShapeOptions.tsx` |
| 11 | `PenPanel` and the pen wiring in `BoardEditor` (draft, `extra`, draw lines by way, draw shapes) | `PenPanel.tsx`, `BoardEditor.tsx` |
| 12 | `SelectionPanel`: line and shape modals through `ObjectModal`; lifted preview patch; shape header actions | `SelectionPanel.tsx`, `ObjectHeaderRow.tsx`, `BoardEditor.tsx` |
| 13 | Shape select / move / resize / rotate / flip sanity (18's transforms with the polygon hit-test); fix `transform` rounding for shapes if needed | `transform.ts`, `operations.ts`, tests |
| 14 | Stage A check: tsc, tests, lint, build; list what needs the browser pass | — |
| 15 | `pathEdit.ts` (+ tests) | `pathEdit.ts`, test |
| 16 | `join.ts` (+ tests) | `join.ts`, test |
| 17 | `useMouseTool`: `vertex` / `handle` modes, junction hover, join on click, hovered id | `useMouseTool.ts` |
| 18 | `PathEditor` overlay, hover halo wiring, cursors | `PathEditor.tsx`, `BoardEditor.tsx` |
| 19 | Stage B check: tsc, tests, lint, build; hand-over with the browser pass list | — |

Files **not** touched: `boardCodec.ts`, `strokeCodec.ts` and `compress.ts` (storage format unchanged, only tests added),
`boardStore.ts` (its API already covers this), anything under `backend/`, the workspace / sidebar code (no new link behaviour),
`package.json` (no new dependency).

## Open items

- **Corner points' handles (map.md: "these will have vectors too for the straight lines of the corner points").** Unclear what
  dragging them should do; this plan only lets corner points be dragged (D20). Say what they should do (round that corner?
  move the edge?) and it goes into a later task.
- **Adding or deleting a point** on an existing curved line is not in map.md and double-click is already split (D10 of plan 18).
  Left out until you say how (e.g. Alt-click on the line adds, Delete on a selected point removes).
- **Arrow head defaults** (D10 size) and the exact looks of the six heads are my guess; adjust after seeing them.
