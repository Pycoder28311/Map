# 20 — Borders and areas

**Goal:** the Border tool (disabled in the tool panel today) draws **areas**: closed outlines with a translucent inside, a
name shown at the centre, an optional description, and the three drawing options of map.md (mouse-like, linear, shape).
A border drawn on or near another one **merges** into it, keeping each part's colour. Hovering an area lightens it and,
when it has no name, offers a small name input; clicking selects it with the shared box and a Border modal in the editor's
right sidebar.

**Depends on:** 17a (objects, codec), 17b (editor), 18 (selection box, `ObjectModal`, `useMouseTool`, `changeObjects`),
19 (stroke renderer, `LineOptions` pieces, `ShapeGrid`, `shapeOutline`, point editor, `pen.ts`, `SidePanel`).
**Blocks:** 21 (text created inside an unnamed border becomes its name: it uses `areaAt` from here), 23.

**Frontend only.** No backend, database or API.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Merging uses our own polygon union** over the closed, flattened outlines (no new dependency). A new module `polygon.ts`, fully unit-tested. If a union cannot be computed reliably it returns `null` and **no merge happens** (the two stay separate; nothing breaks) | User |
| D2 | **Area data is stored in the border record.** `BorderObject` gains `fill` (`{ color, opacity } \| null`), `description` (text) and `edges` (per-edge colour runs, D3). The codec's border record gets them appended **only when present**, so a plain border has the same bytes as before and **files saved by 17a–19 still load** (the reader checks `Reader.left`). Same file version | User |
| D3 | **Per-edge colours:** `edges: { from: number; color: string }[]` — each run starts at point index `from` and lasts until the next run; the stroke colour of a run replaces `style.color`. Empty / absent = the whole outline is `style.color`. A merge produces the runs; transforms, flips and point moves keep the point order, so the runs stay valid | User |
| D4 | **Border "shape" option creates a border with the shape's outline** (a closed border whose points are `shapeOutline(...)`, rounded to whole numbers), so it is an area like any other and its points are editable. Reuses `ShapeGrid` / `shapes.ts` from 19 | User |
| D5 | **The three drawing options** (map.md) map onto `style.way`: **mouse-like** = `exact` (drag, closes itself on release; softness bar under it, as for lines); **linear border** = `straight` (click to add corners, close by clicking the first corner, double-click or Enter; Backspace removes the last corner; Esc cancels); **shape** = drag a box. A border has no line types or arrows: those controls are hidden | Default |
| D6 | **The Border tool has its own pen** (`borderPen` in `pen.ts`: style, shape, param, fill), separate from the Line tool's; defaults: thickness 3, fill `{ color: border colour, opacity: 20 }`. Same rules as 19: edited in the sidebar when nothing is selected, not undoable | Default |
| D7 | **Merge rules:** when a drawn border is finished (any of the three ways), it is unioned with every existing border it **overlaps or touches** (an edge within 6 screen px, snapped). All of them become **one** border (the lowest-id one keeps its id, name, description, links, fill and style; links are merged without duplicates) in **one undo step**. A border completely **inside** another stays separate (an island). Holding **Alt** while finishing skips merging | Default (Alt: mine) |
| D8 | **Near an edge, the stroke snaps:** while drawing, the first and last points (and linear corners) within 8 screen px of another border's corner or edge snap onto it, so touching borders really share their edge before the union | Default |
| D9 | **Painting an area:** fill (the border's `fill`, doubled opacity while hovered / selected for the "lighten"), then the outline in `style.color` (or per-edge runs), then the **name at the centre** (`labelPoint`, text in the border colour) and the description below it, smaller, wrapped. While it is being drawn the inside is already filled ("becoming an area") | User (map.md) |
| D10 | **Hit and hover:** a border is hit on its **edge** (as now) and, new, **anywhere inside** it (the topmost area under the pointer). A press that **drags** from the inside of an *unselected* area starts a **marquee** (so areas never block selecting what is under them); a drag from its edge, or from inside an already selected area, moves it | Default |
| D11 | **Name input on hover:** hovering the inside of an area **without a name** for 500ms shows a small floating input at the pointer ("Name this area"); Enter saves it as `border.name` (one undo step), Esc or leaving closes it. An area with a name shows no input; rename it in the modal | User (map.md) |
| D12 | **The name is painted from `border.name`** now. Plan 21 makes it a real text object (map.md: "just a text object"); until then it is a label of the area, not a separate object | Default |
| D13 | **Selection box buttons** as set in 18 (resize, rotate, split, ✕, link above the top-right button), plus a **description button** in the free bottom-left corner: it opens the modal's description box focused. No flips, no duplicate (map.md) | User (map.md) |
| D14 | **Split and eraser on a border** (the header row's icons are disabled for borders today): **split** = click a point of the outline and the closed area **opens into a line** starting and ending there; **eraser** = drag over the selected border and what is left becomes **lines** (the area stops being one). Both are one undo step and keep name, links and style. Colour runs are dropped | Default |
| D15 | **Border modal** (sidebar): header row (split, focus, eraser, name, forward link), colour and opacity, **thickness**, the three options all visible one under the other (mouse-like with its softness bar when picked, linear, shape with the 3-column grid in the pen only), **fill** (checkbox, colour, opacity), **description** text box, then the shared "Link to other objects" footer | User (map.md) |
| D16 | **Point editing works for borders** too: the point editor of 19 (`editable`) accepts a selected border whose way is not `exact`; its points and the corner joins stay closed | Default |
| D17 | **Colours panel** (several selected) now also lists fill colours and per-edge colours, and recolouring changes them | Default |
| D18 | **Enable the tool:** `tools.ts` border `enabled: true` (key B); the right sidebar shows the border pen with the Border tool | Default |

## 1 — Risks

1. **The polygon union is the hard part.** Weiler–Atherton-style clipping breaks on coincident and nearly coincident edges,
   which is exactly what two neighbouring countries have. Mitigations: (a) snap first (D8) and again inside the union to a
   tolerance; (b) a **self-check** after the walk (it closes, the area is ≥ the larger input, no self-crossing, point count
   sane) — otherwise return `null`; (c) a large table-driven test suite (overlap, shared edge, shared corner only, contained,
   disjoint, concave, many sides, reversed winding, identical polygons). Expect to iterate on the tests; **never** let a failed
   union lose a drawn border.
2. **Curves.** Rounded edges are sampled (`flattenedOf`), so a merged border has plain points and **no handles**, and loses
   `way: 'rounded'` (not offered for borders, D5, so only shapes' outlines are affected: they are already plain points).
3. **Format growth.** The border record gets optional trailing data. The reader must treat "no bytes left" as "no extras"
   and still reject a record with a size mismatch. Old files must round-trip byte-for-byte when a border has no extras.
4. **Interior hit-testing vs. 18's gestures.** Making the inside of a border hittable changes click, hover and drag in
   `useMouseTool`. D10 keeps marquee usable; test with overlapping lines and areas in `hit.test.ts`.
5. **`BoardEditor` growth.** Drawing code of 19 (stroke, shape drag) plus the linear border's click-by-click state would
   make it too big: **extract** all drawing into `useDrawTool.ts` first (task 3; behaviour unchanged, tests unchanged), then add borders there.
6. **Label placement and text size** use canvas text: painted by `render.ts`, not unit-testable; the placement point itself
   (`labelPoint`) and the word wrapping (`wrapWords`) are pure and tested.
7. **Performance:** areas are filled every frame; the flattened outline is cached by `flattenedOf` (19) and the label point
   by a `WeakMap` like it.
8. **Uncommitted work** from 17a–19 sits in the working tree; this plan edits those files. Read them first.

## 2 — Approach

```
features/board/
  types.ts        BorderObject + fill, description, edges
  boardCodec.ts   border record: + optional extras (flags, fill, description, edge runs)
  polygon.ts      signedArea, containsPoint, segmentsIntersect, snapToPolygon, unionPolygons(a, b) → Ring | null   (pure)
  borders.ts      areaAt(board, p), labelPoint(ring), wrapWords, edgeColours/edgeRuns, mergeBorders(board, drawn) → Change   (pure)
  drawBorder.ts   borderFromStroke / borderFromCorners / borderFromShape → Draft; snapToBorders(points, board, tolerance)  (pure)
  pen.ts          + borderPen
  useDrawTool.ts  all drawing (line, shape — moved out of BoardEditor — and border: free, linear, shape)
  BorderOptions.tsx, BorderPenPanel.tsx, FillFields.tsx (extracted from ShapeFields), AreaNameInput.tsx
  render.ts       fill, per-edge runs, name and description, lighten
  hit.ts, bounds.ts, colours.ts, split.ts, erase.ts, selectionButtons.ts, ObjectHeaderRow.tsx, useMouseTool.ts, PathEditor.tsx  (border cases)
```

```
Border tool drag / clicks ─▶ useDrawTool ─ draft (filled) painted via paintBoard(extra)
   finish ─▶ drawBorder.* ─▶ snapToBorders ─▶ mergeBorders(board, drawn)  (polygon.unionPolygons)
          ─▶ one changeObjects: add drawn, or update first + remove the merged ones      (Alt: add only)
Mouse tool hover ─▶ areaAt ─▶ lighten (paintBoard hover) ─▶ nameless? 500ms ─▶ AreaNameInput ─▶ updateObject(name)
click inside / on edge ─▶ select ─▶ SelectionBox (+ description button) + BorderOptions in the right sidebar
```

## 3 — Data and file format

- **`types.ts`:** `BorderObject = Base & { kind: 'border'; style: Style; fill: Fill | null; description: string; edges?: EdgeRun[] } & Path`,
  `type EdgeRun = { from: number; color: string }`, `type Fill = { color: string; opacity: number }` (shared with `ShapeObject.fill`).
  `Draft` / `Patch` follow automatically. `testing.ts` gets a `border()` builder; the few existing border literals
  (`hit.test.ts`, `boardCodec.test.ts`) get `fill: null, description: ''`.
- **`boardCodec.ts`:** border body = `style path` **then, only if any extra is set**, `flags` (bit0 fill, bit1 description,
  bit2 edges) and the pieces (`writeFill`, `str`, `count` of runs each `from` `colour`). The reader reads the extras when
  `r.left > 0`, else the defaults (`fill: null, description: ''`). Update the header comment of the file. Same `VERSION`.
- **`colours.ts`:** `coloursOf` / `recolour` include a border's fill colour and its edge-run colours (D17).
- **No change** to `strokeCodec.ts`, `compress.ts`, `boardStore.ts`.

## 4 — Geometry (pure, tested)

- **`polygon.ts`:** `Ring = Point[]` (open list, closed implicitly). `signedArea`, `containsPoint(ring, p)` (the private one in
  `hit.ts` moves here and is exported), `segmentIntersection(a, b, c, d)` → point + parameters or null (with collinear-overlap
  handling), `snapToRing(p, ring, tolerance)` (nearest vertex first, then nearest edge point), `unionPolygons(a, b, tolerance)`:
  normalise winding, snap b's vertices onto a (and the reverse), insert all edge intersections into both rings, classify
  each edge as inside / outside / shared by testing its midpoint, walk the outer boundary switching rings at intersections,
  tag every result edge with the ring it came from (`'a' | 'b'`), then **self-check** (D1 / risk 1) and return
  `{ ring, origin: ('a' | 'b')[] } | null`. Containment (no crossing, one inside the other) returns `null` (D7: islands stay separate).
- **`borders.ts`:**
  - `areaAt(board, p)`: topmost border whose ring contains `p` (also used by 21).
  - `labelPoint(ring)`: the centroid when inside the ring, else the middle of the widest horizontal span through the
    centroid's row (cached by ring in a `WeakMap`); `wrapWords(text, maxChars)`.
  - `edgeColours(border)`: one colour per edge from `edges` and `style.color`; `edgeRuns(colours, base)` turns a list back into runs.
  - `mergeBorders(board, drawn)`: every border the drawn one overlaps or touches (bounds first, then `unionPolygons`), folded
    one at a time (lowest id first); returns `{ change, id } | null`. `change` updates the survivor (points, `edges` from
    the origins, links merged), removes the others, or — with no merge — returns `{ add: [drawn] }`. Drops `handles`.
- **`drawBorder.ts`:** `borderFromStroke(stroke, style, fill)` (simplify with 1, drop a last point that is within 3 of the first,
  needs ≥ 3 points, else `null`), `borderFromCorners(corners, style, fill)` (≥ 3 corners), `borderFromShape(box, shape, param, style, fill)`
  (`shapeOutline`, whole numbers, duplicates removed), `snapToBorders(points, board, tolerance)` (D8).
- **Existing modules, border cases:**
  - `hit.ts`: new `hitPart(o, p, tolerance): 'edge' | 'inside' | null`; `hitObject` = part !== null; for borders `inside` counts. `hitTest` returns the part too (`hitTestPart`), used by D10.
  - `bounds.ts`: unchanged (outline bounds).
  - `split.ts`: `splitBorder(border, p)` → a `line` draft whose points start and end at the cut (the nearest point; a new point is inserted when between two).
  - `erase.ts`: `eraseChange` accepts a border: its pieces become `line` drafts (`style` kept, `fill` / `description` / `edges` dropped), no piece = removed.
  - `selectionButtons.ts`: `BoxAction` + `'description'`; border row adds `at('description', 'bl')`.
  - `operations.ts` / `transform.ts`: nothing to change (points keep their order); a test pins that runs survive a move, resize, rotate and flip.

## 5 — Drawing (`useDrawTool.ts`, `drawBorder.ts`, pen)

- **Extract first (task 3):** move the Line tool's drag handling (`stroke`, `shapeDrag`, `draft`, `endStroke`, the plain-pencil
  incremental segment) out of `BoardEditor.tsx` into `useDrawTool({ mapId, view, tool, ... })`, returning `{ draft, begin, move, end, cancel, linear }`.
  `BoardEditor` only delegates. No behaviour change; all 19 behaviour and tests stay.
- **Border, mouse-like:** a drag collects points (as the pencil does); the draft (a border with the pen's fill) repaints on each move; on release
  `borderFromStroke` → `snapToBorders` → `mergeBorders` → `changeObjects` (Alt: plain add). A click without drag does nothing.
- **Border, linear:** each click adds a corner (snapped, D8); the draft shows the corners plus a rubber-band edge to the pointer;
  clicking within 10 screen px of the first corner, double-click, or Enter closes it (needs ≥ 3 corners); Backspace removes the last
  corner; Esc cancels. Touch: a tap adds, a tap on the first corner closes.
- **Border, shape:** a drag draws the box (Shift = square), as for the Line tool's shapes, and `borderFromShape` makes the border.
- **`pen.ts`:** `borderPen` + `useBorderPen` + `setBorderPen`, `resetPen` resets both.
- **`BorderPenPanel.tsx`** (the sidebar with the Border tool): the same controls as `BorderOptions` plus the shape grid and its number bar under "Shape".

## 6 — Painting and interaction

- **`render.ts` (`paintObject`, border case):** build the ring (`flattenedOf`, softened closed when `way === 'exact'` with `amount`), fill it,
  stroke it — with `edges` the ring is cut into runs and each run stroked in its colour through `strokeParts` (open) — then the name and description.
  `paintBoard(..., hover)` gets the hovered **area** (lighter fill: opacity × 2, capped at 60) and the draft.
  The label font is `600 {size}px` system sans, `size = clamp(10, sqrt(area) / 7, 28)` in board units (so it scales with zoom like everything), `fixedWidth` ignored.
- **`useMouseTool.ts`:** hover uses `hitTestPart`; `hovered` stays the id, a new `hoveredArea` is the nameless area under the pointer for 500ms
  (timer in the hook); D10's press rule; the press on an unselected area's inside that drags becomes a marquee.
  `editable` accepts a selected border with a non-exact way (D16); split mode on a border calls `splitBorder`; eraser mode accepts borders.
- **`AreaNameInput.tsx`:** a small card at the pointer (`FLOAT`), one input, Enter saves, Esc / blur closes; opened by `hoveredArea`.
- **`BoardEditor.tsx`:** the Border tool in `TOOLS`; sidebar value `'pen'` also for `border`; passes `onDescription` (the box button) to focus the
  modal's description box (`focusDescription` ref callback); renders `AreaNameInput`.
- **`ObjectHeaderRow.tsx`:** `CAN.split` / `CAN.eraser` also true for `border`. **`SelectionPanel.tsx`:** the `border` case renders `BorderOptions` (like 19's line and shape cases: live preview, commit on release through `updateObject`).
- **`BorderOptions.tsx` / `FillFields.tsx`:** colour + opacity, thickness, the three options (D5), fill, description textarea (commits on blur), all with
  19's `RangeField`, `CheckField`, `ColourField`, `ShapeGrid`. `FillFields` is the fill group lifted out of `ShapeFields` (which then uses it).
- **`PathEditor.tsx`:** receives a border too (its points as squares; the closing edge is implied).

## Testing

Pure modules first (vitest, like 17a–19):
- `polygon`: area and winding; `containsPoint`; intersections incl. collinear overlap; `snapToRing`; **`unionPolygons` table**: two overlapping squares, a shared full edge,
  a shared partial edge, a shared corner only, touching within tolerance but not overlapping, concave (L-shape + square), one inside the other → `null`,
  disjoint → `null`, identical, opposite winding, near-degenerate sliver → `null`; origin tags add up to the edges; the result area ≈ area(a) + area(b) − overlap.
- `borders`: `areaAt` topmost; `labelPoint` inside for a convex, an L and a C shape; `wrapWords`; `edgeColours` ↔ `edgeRuns` round trip;
  `mergeBorders` (two → one with runs, three → one, island untouched, links merged, no merge → `{ add }`, failed union keeps all).
- `drawBorder`: from a stroke (closing, < 3 points → null), corners, shape outlines (all 11 shapes give ≥ 3 distinct whole points), snapping.
- `boardCodec`: a border with fill, description and runs round-trips; a plain border is byte-identical to the 17a-era encoding; a **hand-made old-format record** loads with defaults; a truncated extra throws.
- `hit`: edge vs inside, topmost area, a line above an area wins, an unselected inside is not "movable"; `split` (border → line), `erase` (border → lines), `colours`, `selectionButtons` (description at bl), `operations` (runs survive).
- `pen` (borderPen), and `changeObjects` for a merge = one history step (`boardStore.test.ts`).

**Not testable here — the browser pass** (plan 18's and 19's lists are still open too): drawing all three ways, the filled draft, snapping and merging by hand
(two overlapping, two neighbours, three at once, different colours, Alt), hover lighten, the name input, name and description painting, selecting by inside and edge,
dragging from an area's inside, point editing of a border, split and eraser on a border, description button, colours panel, sidebar layout, light and dark, touch.
Say plainly in the hand-over that painting and gestures were not seen. Run `npx tsc -b`, `npx vitest run`, lint and `npm run build` at the end of each stage.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `BorderObject` gets `fill`, `description`, `edges`; `Fill` / `EdgeRun` types; `border()` test builder; fix existing literals | `types.ts`, `testing.ts`, tests |
| 2 | Codec: optional border extras, tolerant reader, old-file test, header comment | `boardCodec.ts`, `boardCodec.test.ts` |
| 3 | **Extract drawing** from `BoardEditor` into `useDrawTool` (no behaviour change; all tests green) | `useDrawTool.ts`, `BoardEditor.tsx` |
| 4 | `polygon.ts` with the union and its self-check, plus the big test table | `polygon.ts`, `polygon.test.ts` |
| 5 | `borders.ts`: `areaAt`, `labelPoint`, `wrapWords`, edge colours and runs, `mergeBorders` | `borders.ts`, `borders.test.ts` |
| 6 | `drawBorder.ts`: from stroke / corners / shape, snapping | `drawBorder.ts`, test |
| 7 | `hit.ts` `hitPart` / `hitTestPart`; `split.ts` `splitBorder`; `erase.ts` borders → lines | `hit.ts`, `split.ts`, `erase.ts`, tests |
| 8 | `colours.ts` (fill and runs); `selectionButtons.ts` (description); operations test for runs | `colours.ts`, `selectionButtons.ts`, tests |
| 9 | `pen.ts` `borderPen`; enable the Border tool | `pen.ts`, `tools.ts`, test |
| 10 | `render.ts`: fill, runs, name and description, lighten, draft | `render.ts` |
| 11 | `FillFields` (lifted from `ShapeFields`), `BorderOptions`, `BorderPenPanel` | those files, `ShapeFields.tsx` |
| 12 | Border drawing in `useDrawTool`: free, linear (click, close, Enter, Backspace, Esc), shape; snap, merge, Alt | `useDrawTool.ts`, `BoardEditor.tsx` |
| 13 | `SelectionPanel` border case, `ObjectHeaderRow` split / eraser for borders, description button + focus | `SelectionPanel.tsx`, `ObjectHeaderRow.tsx`, `BoardEditor.tsx` |
| 14 | `useMouseTool`: inside hit, hovered area with 500ms timer, D10 marquee rule, split / eraser on borders, `editable` border | `useMouseTool.ts` |
| 15 | `AreaNameInput` and its wiring | `AreaNameInput.tsx`, `BoardEditor.tsx` |
| 16 | `PathEditor` for borders | `PathEditor.tsx` |
| 17 | Check: tsc, tests, lint, build; hand-over with the browser pass list | — |

Files **not** touched: `strokeCodec.ts`, `compress.ts`, `boardStore.ts` (its API covers this), the workspace / sidebar code, anything under `backend/`,
`package.json` (no new dependency, per D1).

## Open items

- **Neighbouring countries merge into one area** (map.md: "when I draw border near existing border they will merge into one … show both colours touching").
  That is what this plan does, so two adjacent countries drawn one after the other become **one** object (one name, one fill) with two edge colours. If you
  want neighbours to stay separate objects that merely share an edge, say so: the union is then used only for overlapping areas.
- **Split / eraser on a border turn it into lines** (D14); map.md does not say what they do for areas. Tell me if you want something else (e.g. split
  = cut an area into two areas along a line).
- **Alt skips merging** is my addition (without it there is no way to draw two touching areas that stay apart).
- **Area name stays a label** until plan 21 (D12).
