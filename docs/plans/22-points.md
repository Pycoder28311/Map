# 22 — Points

**Goal:** the Point tool (disabled today) puts **pins** on the map. A pin has a name, a **label** (city, mountain, sea…), a pin **icon and colour**, an optional full-width **banner image**, and a rich-text **description**. Clicking an existing pin opens its modal in the right sidebar (the editor's). A read-only **visitor view** shows the pin as a small card floating above it, with "Show more" opening the full read-only modal.

**Depends on:** 17a (objects, codec), 18 (`ObjectModal`, `ObjectHeaderRow`, selection, links), 19 (sidebar, `pen.ts`, fields), 21 (`RichTextEditor`, `richText.ts`, `Notice`, `ConnectField` already lists points).
**Blocks:** 23 (share and the carousel reuse the visitor view).

**Frontend only.** No backend, database or API. Pictures live in an in-memory mock store.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Pictures** (banner, and nothing else in this plan) are picked from a file, **downscaled in the browser** (longest side ≤ 1280 px, JPEG ≈ 0.82) and kept in a new in-memory **`mocks/imageStore.ts`** (`putImage(blob) → id`, `getImageUrl(id)`, `useImageUrl(id)`); the point stores only the **image id**. Lost on reload like every mock; the real store arrives with a backend | User |
| D2 | **Pin icon = an icon set + a colour.** The pencil badge on the modal's pin opens a small grid of built-in icons (pin, city, mountain, water, flag, star, building, tree…) and a colour input. No uploaded pin pictures | User |
| D3 | **Labels** are a **fixed list**, one per point: City, Country, Mountain, Sea, River, Lake, Island, Organization, Other (`pointLabels.ts`). Each has a default icon and colour, used when a point is created or its label is changed *and the icon/colour were not changed by hand* | User |
| D4 | **Visitor view built now**, with a **"View as visitor"** toggle in the editor to see it: read-only, no tools, no selection box, no sidebar. Click a pin → `PointCard` floating above it (banner, name, label chip, a short description clamp, **Show more**) → `PointView`, the full read-only modal | User |
| D5 | **Placing a pin selects nothing and opens no modal** (map.md: "the modal appears only when I click on an existing point"). The Point tool stays active so several pins can be placed; **Esc** or another tool ends it. Clicking an existing pin with the **Mouse** tool selects it and opens the modal. With the Point tool, clicking an existing pin selects it too instead of stacking a new one | Default (map.md) |
| D6 | **Data:** `PointObject` = `anchor` (the pin's **tip**), `label: PointLabel`, `icon: PinIcon`, `color`, `banner?: string` (image id), `description?: string` (TipTap JSON, stringified; `''` = none). The existing `name` and `links` stay on `Base` | Default |
| D7 | **Size on the board:** a pin is drawn in **board units** (like other objects: it grows with the zoom), 28 wide, 36 tall, **tip at the anchor**. `bounds`, `hit` and the selection box use that rectangle (x ± 14, y − 36 … y). The name is **not** painted on the canvas (name is shown in the card and modal) | Default |
| D8 | **Painting:** a pin shape (teardrop) filled with `color`, white inner circle, the icon's path inside in `color`. Icons are **one table of 24×24 SVG path strings** (`pinIcons.ts`) used by both the canvas (`Path2D`) and React (`<svg>`), so they match. Selected and hovered pins get the same outline as other objects | Default |
| D9 | **Transforms:** move = anchor; **no rotate, no resize, no flips** (a pin keeps its shape); a group resize/flip only moves its anchor (like text's flip rule); duplicate offsets 16 and copies everything including the banner id; `transform.ts` / `operations.ts` already have a `'point'` case to extend | Default |
| D10 | **Selection box buttons for a point:** duplicate (top right), ✕ (bottom right), link (bottom left) — already in `selectionButtons.ts`. No change | Default (plan 18) |
| D11 | **Modal layout** (sidebar): banner area on top (full width, "Add banner image" when empty; hover shows replace/remove), then one row: **pin button** (icon in its colour, small pencil badge bottom right) · **name input** · forward-link · **duplicate** · **focus** (the header row's existing focus). Below: label drop-down, then the **description** (TipTap, full block formats: headings, lists, bold…), then `ObjectModal`'s link footer | User (map.md) |
| D12 | **Description editor** is `RichTextEditor` with `plain={false}`; the point stores its JSON as a string. A new `editable` prop lets the same component render the read-only version. Saved on blur / leaving the field as **one undo step** (like the area description in plan 20) | Default |
| D13 | **Point pen** (Point tool, nothing selected): the sidebar shows the next pin's **label, icon, colour**; held like the other pens (not undoable). A new pin gets the pen's values and no banner/description | Default |
| D14 | **Forward link inside the point modal** (map.md: "in the point element this forwarding will exist in the modal too"): the header's `ForwardLink` already shows when the point has links; the **modal body** also lists the linked objects with their names as buttons that open them (the visitor `PointView` too) | User (map.md) |
| D15 | **File format:** the point record gets **optional trailing extras** after `x y` (the same pattern as border/text: a flags byte read only when bytes remain): bit0 label, bit1 icon, bit2 colour, bit3 banner id, bit4 description. A plain default point keeps today's bytes; old files load with defaults | Default |
| D16 | **Colours panel** (multi-selection) also lists a pin's colour; recolouring changes it | Default (plan 18/21) |
| D17 | **Search / map cards:** the point's `name` is what the existing search and links use; `MapPreview` paints points through `paintBoard`, so it shows pins with no extra work | Default |

## 1 — Risks and blockers

1. **Pictures are mock-only.** They vanish on reload and are not in the board file or its export; two tabs do not share them. Fine for the frontend-only phase; the store's three functions are the seam a backend replaces.
2. **Image size.** Downscaling keeps each picture ~100–300 KB, but the in-memory store grows unbounded. A banner replaced or a point removed does not free the picture while undo can bring it back; the store keeps everything for the session (no garbage collection in this plan).
3. **Canvas vs. SVG icons.** `Path2D` takes SVG path strings, but icon paths must be authored by us (react-icons components cannot be painted on canvas). The icon table is hand-picked small shapes; keep to ≤ 12 and check they look right at 16 px and at 28 px in the browser pass.
4. **Floating card placement.** The card is HTML over the canvas, positioned from `boardToScreen`; it must flip below the pin near the top edge and stay in the viewport, and follow the view while panning/zooming (closing on pan is acceptable). `hoverInfoPosition.ts` has a pure placer to reuse.
5. **Bounds change** (centre → tip-anchored) affects `focus`, the selection box and link-pick highlighting for points; existing points (none exist in practice since the tool was off) are not migrated.
6. **No browser pass yet for plans 18–21.** This plan adds more unseen UI. The hand-over must list what was not seen.
7. **Uncommitted work** from 17a–21 sits in the working tree; this plan edits those files. Read them first.

## 2 — Approach

```
features/board/
  types.ts         PointObject (+ PointLabel, PinIcon)
  pointLabels.ts   LABELS: { id, name, icon, color }[], defaultsOf(label)                              (pure)
  pinIcons.ts      PIN_ICONS: Record<PinIcon, { name, path }> (24×24 path strings), pinPath            (pure)
  boardCodec.ts    point extras (flags, label, icon, colour, banner id, description)
  drawPoint.ts     newPoint(at, pen), pointPatch(label, …) keeping hand-set icon/colour                (pure)
  pen.ts           PointPen { label, icon, color } via penStore<PointPen>
  render.ts        paintPoint (teardrop + icon), hover/selected outline
  bounds.ts, hit.ts, transform.ts, operations.ts, colours.ts   point cases
  useMouseTool.ts  Point tool: click places / selects an existing pin
  PointOptions.tsx the modal body (banner, pin button, label, description, linked list)
  PinPicker.tsx    icon grid + colour (popover from the pencil badge)
  PointPenPanel.tsx
  PointCard.tsx    visitor: small card above the pin
  PointView.tsx    visitor: the full read-only modal
  VisitorLayer.tsx the overlay that shows PointCard / PointView over the canvas
  BoardEditor.tsx  routing, visitor toggle, sidebar wiring
mocks/imageStore.ts       in-memory pictures; downscale helper in lib/downscaleImage.ts
components/ui/editors/RichTextEditor.tsx   + `editable`
```

Data flow: placing → `addObjects([newPoint(...)])` (one undo step). Editing the modal → `updateObject(mapId, id, patch)` (one step per commit; sliders do not exist here). Banner pick → `downscaleImage(file)` → `putImage` → `updateObject(…, { banner: id })`. The canvas never loads pictures (a pin shows no banner), so painting stays synchronous; banners appear only in HTML (modal, card, view).

## 3 — Data and file format

- `types.ts`: `PointLabel = 'city' | 'country' | 'mountain' | 'sea' | 'river' | 'lake' | 'island' | 'organization' | 'other'`; `PinIcon` = a string union of the table's keys; `PointObject = Base & { kind: 'point'; anchor: Point; label; icon; color; banner?: string; description?: string }`. Update the "Minimal for now, plan 22" comment and the `point()` builder in `testing.ts` (defaults: `other`, `pin`, `#dc2626`).
- `boardCodec.ts`: header comment extended; `writePoint` / `readPoint` with the flags byte only when something differs from the defaults. Banner id and description as length-prefixed UTF-8 strings. Old bytes (x y only) read with defaults; a default point writes the old bytes. Tests: round trip with every field, old record, default point equals old bytes.
- `mocks/imageStore.ts`: a `Map<string, string>` of object URLs, `putImage(blob)`, `getImageUrl(id)`, a `useSyncExternalStore` hook `useImageUrl(id)`. Tested for put/get/unknown id.
- `lib/downscaleImage.ts`: `fitSize(w, h, max)` (pure, tested) and `downscaleImage(file, max = 1280): Promise<Blob>` (canvas; not unit-tested, rejects non-images with a readable error).

## 4 — Painting, geometry, interaction

- **`paintPoint`** in `render.ts`: path from `pinPath` scaled to 28×36 at the tip; fill `color`; white circle; icon via `Path2D(PIN_ICONS[icon].path)` scaled 24→14 and filled in `color`; hovered/selected outline like `paintObject`'s. `paintObject`'s `'point'` case calls it. A point is **never** the name of anything and has no `namedByText`.
- **Hit and bounds:** the rectangle of D7 with `tolerance`, as the current `hit.ts` point case does, just moved up by the pin height.
- **Point tool in `useMouseTool.ts`** (or a small `usePointTool.ts` if the file is too long): pointer down on empty board → `newPoint(boardPoint, getPointPen())` committed on pointer **up** (a drag pans like elsewhere, so a pan does not drop a pin); pointer down on a point → select it (Mouse-tool behaviour, including dragging to move). The hovered pin gets the existing hover outline; the cursor is a crosshair over empty board.
- **Tool panel:** `tools.ts` enables `point` (key P), removing `soon`. Esc returns to the Mouse tool, as with the other tools.
- **Sidebar routing in `BoardEditor.tsx`:** the Point tool with no selection shows `PointPenPanel`; a selected point shows `ObjectModal` with `PointOptions` (`SelectionPanel` gets the `point` case).

## 5 — The point modal (editing)

`PointOptions` renders, inside `ObjectModal`:
1. **Banner** (`BannerField`): empty → a dashed full-width button "Add banner image" (file input, `accept="image/*"`); filled → the picture (16:7, `object-cover`) with hover buttons *Replace* / *Remove*. Errors (not an image, unreadable) show as small `ErrorText`. Remove sets `banner: undefined`.
2. **Pin row:** `PinButton` (the icon in its colour on a tinted circle, a small pencil badge at the bottom right) opens `PinPicker` in a popover: the icon grid and a colour input (`ColourField`); picking applies at once (`updateObject`). Then the name input (the shared one in `ObjectHeaderRow`; see below), duplicate and focus.
3. **Label** drop-down (`Dropdown` or a `<select>` styled like the other fields): changing it applies D3's rule.
4. **Description:** `RichTextEditor` (block formats on) with a minimal bubble of buttons (bold, italic, bullet list, heading) above it; committed on blur.
5. **Linked objects:** the object's links as buttons (the sidebar object's name / the board object's name); clicking opens or selects it (D14). `ObjectModal`'s footer keeps the "Link to other objects" button.

**`ObjectHeaderRow` change:** accept a `leading?: ReactNode` slot (before the name) so the pin button sits in the same row, and `HeaderAction` gains `'duplicate'` (always enabled for a point; `onDuplicate` prop wired to `duplicateObjects`). Other kinds keep their rows unchanged.

## 6 — The visitor view

- **`VisitorLayer`** (`BoardEditor.tsx` renders it when "View as visitor" is on): hides `ToolPanel`, `SidePanel`, the selection box, hover outlines and drawing; the canvas still pans/zooms; a click on a pin sets `openPoint` (a click elsewhere closes the card).
- **`PointCard`:** ~280 px wide, floating above the pin's top (placed by `hoverInfoPosition.ts`, flips below when there is no room), arrow towards the pin. Shows the banner (if any), the label chip, the name, the description clamped to 4 lines (read-only `RichTextEditor`), and **Show more**. Esc or clicking the map closes it.
- **`PointView`:** the full modal: the banner full width, pin icon + name + label, the whole description, the linked objects (D14) as buttons, a Close button. Rendered with `Modal` (`components/ui/overlays/Modal.tsx`), so it centres and traps focus like the app's other modals.
- **Toggle:** a small button "View as visitor" (eye icon) in the editor's top bar region beside `ZoomControls`/`MapTitleBar`; pressed state shown; in this mode it reads **"Back to editing"**. Plan 23 reuses `PointCard`/`PointView` for shared maps.

## 7 — Other places points show up

- **`ColoursPanel` / `colours.ts`:** a pin's `color` (D16).
- **`ConnectField`** already lists points (kind filter), so texts can follow a pin: no change except that `follow.ts` tracks the new bounds (centre of `boundsOf`).
- **`linkName` / `ForwardLink`:** unchanged (use `name`; an unnamed point shows "Untitled point" — check the existing fallback text).
- **`RichTextEditor`:** `editable?: boolean` (default true); when false, no focus, no toolbar buttons driven.

## Testing

- **Unit (vitest), all pure parts:** `pointLabels` (defaults per label; changing the label keeps a hand-set icon/colour), `drawPoint` (`newPoint` from the pen; `pointPatch`), `bounds`/`hit` for the tip-anchored pin, `transform` (move, flip moves the anchor only, no rotation), `operations` (duplicate copies banner and description), `colours`, `boardCodec` (round trip, old record, default = old bytes), `fitSize`, `imageStore`, `pen` (point pen), `selectionButtons` (unchanged set), `tools` (point enabled, key P).
- **Components:** no new test infrastructure; the project has none for components. Logic lives in pure files.
- **Commands at the end of each stage:** `npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`.
- **Browser pass (needs you, not done by the agent):** pin painting at several zooms and in both themes; the icon grid at 16 px; placing several pins; click-to-select; dragging a pin; banner add/replace/remove with a big photo and a non-image; description formats and one undo step per commit; label defaults; duplicate/focus in the header; link list opening objects; visitor toggle, the card's flip near edges, "Show more", Esc; a text connected to a pin following it; touch. The hand-over must say plainly what was not seen.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `PointObject` fields, `PointLabel`, `PinIcon`; `point()` builder; fix literals | `types.ts`, `testing.ts`, tests |
| 2 | `pointLabels.ts` and `pinIcons.ts` (+ tests) | those |
| 3 | Codec: optional point extras, old-record test, header comment | `boardCodec.ts`, `boardCodec.test.ts` |
| 4 | Point in `bounds`, `hit`, `transform`, `operations`, `colours` (+ tests) | those files |
| 5 | `drawPoint.ts`, point pen in `pen.ts`, enable the Point tool (+ tests) | `drawPoint.ts`, `pen.ts`, `tools.ts` |
| 6 | `render.ts`: `paintPoint`, hover/selected outline | `render.ts` |
| 7 | `mocks/imageStore.ts` and `lib/downscaleImage.ts` (+ tests) | those |
| 8 | `RichTextEditor` `editable` prop | `RichTextEditor.tsx` |
| 9 | Point tool gestures: place, select, drag | `useMouseTool.ts` (or `usePointTool.ts`), `BoardEditor.tsx` |
| 10 | `ObjectHeaderRow`: `leading` slot and `duplicate` action | `ObjectHeaderRow.tsx`, `ObjectModal.tsx` |
| 11 | `PinPicker`, `PointOptions` (banner, pin button, label, description, linked list), `PointPenPanel` | those files |
| 12 | `SelectionPanel` point case; sidebar routing for the Point tool | `SelectionPanel.tsx`, `BoardEditor.tsx` |
| 13 | `PointCard`, `PointView`, `VisitorLayer`, the visitor toggle | those files, `BoardEditor.tsx` |
| 14 | Check: tsc, tests, lint, build; hand-over with the browser pass list | — |

Files **not** touched: `app/src/features/projects/*` (stroke codec for the map cards), the workspace/sidebar panels, auth, `vite.config.ts`, `package.json` (no new dependency: TipTap is already in), anything under `server/`.

## Open items

- None blocking. Defaults you may override: pins grow with the zoom (D7) instead of keeping a fixed screen size; the Point tool stays active after placing (D5); the fixed label list's exact names and the 12 icons (D3, D8).
- Still **not in any plan:** dragging a corner point's handles, adding/deleting a point on a curved line, a font picker, the background image layer (which can reuse `imageStore`).
