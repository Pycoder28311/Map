# 07 — Saved layouts: save / create, layout tiles, hover labels, first-run hints

**Goal:** the current pane combination can be saved as a small object: template, panels and the
split sizes. Saved layouts show as 16:9 tiles at the top of the sidebar, arranged to fill the width.
Each tile draws its layout with thin lines; hovering it shows its panes' names as floating labels,
joined to their parts of the tile by curved lines. A Save / Create button sits above the tiles. Create
starts a layout from two objects and shows a hint next to the sidebar. In the rail, the tiles stack in
one column without changing the section's height.

**Depends on:** 05 (Layouts section slot, `Divider`, flat objects, rail rules). Optional: 06 (dragging a
tile to the trash archives it). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Tiles are **16:9 landscape**, rounded, with a border. Inside, thin lines show the layout's panes | User |
| D2 | Arrangement fills the full width, with **bigger rows first**. 1 → one full-width tile. N%3 = 0 → rows of 3. N%3 = 1 → two rows of 2, then rows of 3 (4 = 2+2, 7 = 2+2+3). N%3 = 2 → one row of 2, then rows of 3 (2 = 2, 5 = 2+3, 8 = 2+3+3) | User |
| D3 | Collapsed view: the first 3 rows if they all hold 3; only the first 2 rows if one of them holds 2. "Show more" then shows **every tile in the same grid**, and the button becomes "Show less" | User |
| D4 | Above the tiles: **Create** when there are no active panes, **Save** when there are. Save with no selected layout creates a new one. Save with a selected layout first asks in a modal to update it | User |
| D5 | Objects exist but no layouts: Create is **full width**. It opens 2 random objects as panes (nothing is saved), then a floating hint next to the sidebar says "Drag an object from the sidebar onto the panes". With fewer than 3 openable objects it says "Drag a pane by its grip onto the other to swap them". No objects at all: a hint says to create a project or note first | User |
| D6 | Hover: small floating labels with each pane's name, each joined by a curved line to its pane's part of the tile (e.g. the top-right pane → a label off the top-right corner) | User |
| D7 | Rail: the tiles form one column of equal tiles. **The section's total height doesn't change**, so nothing below moves | User |
| D8 | Saved object (minimal): `{ id, template, panels: string[] /* panelKey(): "map:m1" */, split: { x, y } }`. No name: the tile shows the shape, and the hover shows the names | Default |
| D9 | "Active panes" = on `/workspace` with **2 or more** panels. A single page (e.g. `/dashboard`) isn't panes | Default |
| D10 | "Selected" = the layout last opened from its tile. It's cleared when the panes go below 2, or when a different layout is opened. The selected tile has a `--drop` ring (06's token, or `--accent` without 06) | Default |
| D11 | Save is disabled when the panes equal the selected layout (same template, panels and split). The update modal offers **Update**, **Save as new** and Cancel | Default |
| D12 | With layouts, the Save / Create button sits in the Layouts divider (left of the label, like Notes' +). It's full width only when there are no layouts (D5) | Default |
| D13 | Clicking a tile opens it: it applies its split and navigates to its `/workspace?…` URL. Panels whose object no longer exists (or is archived) are left out; if fewer than 2 remain, the tile shows a "missing" look and opens what is left | Default |
| D14 | Removing a layout: dragging its tile to the trash archives it (with 06), and Restore / Delete work from the trash modal. Without 06: a small ✕ on hover, with the delete confirmation modal | Default |
| D15 | Mock, in memory, in its own file (`mocks/layoutsStore.ts`), like 04: a reload resets it. Seed: no layouts | Default |
| D16 | Hover labels and hints live in the **top layer** (popover), because the sidebar clips its content (`overflow-hidden` on the nav) | Default |

## 1 — Risks

1. **Split sizes aren't shared today.** `useSplit()` (`features/workspace/split.ts`) is local state in
   `Workspace.tsx`, backed by localStorage. Opening a layout from the sidebar must set it. `split.ts`
   becomes a tiny external store (`getSplit` / `setSplit` / `useSplit` with `useSyncExternalStore`, still
   saved to localStorage), and `Workspace.tsx` keeps calling `useSplit()`.
2. **Height must match in the rail** (D7). The grid's height depends on the sidebar's inner width, a
   fixed token (`--sidebar-w` minus padding), so it can be computed exactly. The tiles are absolutely
   positioned in a box of that height, in both modes.
3. **Random objects.** "2 random objects" must be *openable and draggable* panels: maps, notes and
   project Overviews (not Dashboard, D1 of 06). Use a seeded shuffle in tests.
4. **Hover labels may overlap each other** for 4 panes on small tiles. Labels go outward from each
   corner or side, and the curves keep them apart. Check with 4-pane layouts in the first and last
   columns.

## 2 — Architecture

```
mocks/layoutsStore.ts            NEW (deletable): SavedLayout[], create/update/archive/restore/delete, selectedId
features/workspace/split.ts      external store: getSplit/setSplit/useSplit
features/layouts/
  tileGrid.ts (+ .test.ts)       NEW, pure: rowsFor(n), visibleCount(rows), positions(n, width, mode)
  LayoutThumb.tsx                NEW: one tile (lines from template + split)
  LayoutHoverLabels.tsx          NEW: popover labels + curved SVG lines
  LayoutsSection.tsx             NEW: divider + Save/Create + tiles + show more (05's Layouts slot)
  useLayoutActions.ts            NEW: save / update / open / create-random, hint state
components/ui/overlays/Callout.tsx   NEW: floating hint next to an anchor (arrow, ✕)
```

## 3 — Store and split

- `layoutsStore.ts`: `useSavedLayouts()`, `useSelectedLayoutId()`, `saveLayout(layout, split)` (returns
  the id and selects it), `updateLayout(id, layout, split)`, `selectLayout(id | null)`, plus archive /
  restore / delete (for 06's trash, which gets a "Layouts" group in its modal).
- Converting: `toSaved(layout: WorkspaceLayout, split)` → `panels.map(panelKey)`, and
  `fromSaved(saved)` → `parsePanelKey` + `layout.ts` checks (`fromSearchParams` already drops unknown
  types; the same filter applies here). Both are pure and tested.
- `split.ts`: `setSplit()` clamps (`clamp`) and saves. `useSplit()` returns `[split, setSplit]` as now.

## 4 — Tile grid (`features/layouts/tileGrid.ts`, pure, tested)

- `rowsFor(n): number[]`: 0 → `[]`, 1 → `[1]`, otherwise the D2 rule. Examples for the test:
  2 → `[2]`, 3 → `[3]`, 4 → `[2,2]`, 5 → `[2,3]`, 6 → `[3,3]`, 7 → `[2,2,3]`, 8 → `[2,3,3]`, 9 → `[3,3,3]`,
  10 → `[2,2,3,3]`.
- `collapsedRowCount(rows)`: 3 if the first 3 rows are all 3, else 2 (D3). `visibleCount` = the sum of
  those rows. "Show more (N)" appears when it's less than n.
- `positions(n, width, gap, mode: 'grid' | 'rail', railWidth)` → `{ left, top, width, height }[]` plus
  `height`:
  - grid: each row splits the width evenly, and tile height = tile width × 9/16;
  - rail: same total `height` as the grid. Each tile is `h = (height − (n−1)·gap) / n` tall,
    `w = min(railWidth, h·16/9)` wide, centred in the rail column, and `h` is reduced to keep 16:9
    when `w` hits the rail width (the leftover space is spread evenly between tiles).
- `LayoutsSection` renders the shown tiles absolutely in a box of `height`, with
  `transition-[left,top,width,height]` over `--sidebar-duration`. Opening or closing the sidebar slides
  every tile between grid and column.

## 5 — A tile (`LayoutThumb.tsx`)

- A button (`aria-label` = "Layout: Parks overview, Playgrounds, Ideas"), `rounded-(--btn-radius)`,
  `border border-line-strong`, `bg-surface`, hover `bg-fill`.
- Inside, an SVG `viewBox="0 0 16 9"` with the template's dividing lines at the saved `split`. It uses
  `borders(template)` from `layout.ts` (the same segments the workspace resizes): each border becomes a
  line, vertical at `x·16` and horizontal at `y·9`, over its `part` (`start` / `end` / `whole`).
  `stroke="currentColor"`, `text-fg-subtle`, `vector-effect: non-scaling-stroke`.
- Selected: ring (D10). Missing panels: dashed border plus a lower opacity.

## 6 — Hover labels (`LayoutHoverLabels.tsx`)

- Shown while the tile is hovered or keyboard-focused (200ms delay in, none out, using
  `useHoverIntent`'s timings). Rendered in a `popover="manual"` element placed from the tile's rect.
- For each pane: its **anchor** on the tile is the pane's outer corner, or the middle of its outer side
  for a pane spanning a whole side (from `slotCells(template, slot)` + split). The **label** sits
  ~24px further out in that direction (outside the tile). A cubic SVG path (`stroke` = `--fg`, 1.25px,
  round caps) curves from the anchor to the label's nearest edge. A small dot marks the anchor.
- Label: `text-small`, `bg-surface`, `border-line`, `rounded-full`, `px-2`, `shadow-sm`. Its text is
  `PANELS[type].title(id)`.
- Fade + 4px slide in (150ms). Reduced motion: no slide.

## 7 — Save / Create (`LayoutsSection.tsx`, `useLayoutActions.ts`)

- **No layouts:** a full-width button (`secondary`, `LuLayoutTemplate` icon) under the Layouts divider:
  "Save layout" when there are active panes (D9), else "Create layout". In the rail it's icon-only, at
  the same height.
- **With layouts:** the button moves into the divider's action slot (D12). The icon is `LuPlus`
  (create) or `LuSave` (save), with a matching tooltip.
- Save: no selected layout → `saveLayout` (the new tile appears, selected). With a selected layout →
  `Modal` "Update layout?" showing the old and new thumbnails side by side, with **Update** / **Save as
  new** / Cancel.
- Create:
  - objects exist → pick 2 random openable objects, then open them as a `2-cols` layout through a new
    `useWorkspace().openLayout(layout)` (it wraps the hook's internal `go`; nothing is saved), then show
    the hint (D5);
  - no objects → hint only: "Create a project or a note first", with its arrow on the Projects
    divider's +.
- Hint dismissal: ✕, Esc, or automatically once the user does what it says (the panel count goes up,
  or a swap happens, seen from the URL).

## 8 — Callout (`components/ui/overlays/Callout.tsx`, new, reusable)

- `<Callout anchor={element} side="right" open onClose>text</Callout>`: a `popover="manual"` bubble to
  the right of the anchor, outside the sidebar, vertically centred on it. It has a small arrow pointing
  at the anchor, `bg-surface`, a border, `shadow-xl`, and a ✕. It doesn't block the page (the user
  needs to drag while it's open). It follows the anchor on scroll and resize.

## Testing

- `npm run test --workspace app`: `tileGrid.test.ts` (`rowsFor` for 0–10, `collapsedRowCount`, rail
  height equals grid height, tiles keep 16:9), `toSaved` / `fromSaved` round trip, and the store.
- `npm run build --workspace app`.
- Manual:
  - 0 objects → Create shows the "create first" hint. Objects but no layouts → full-width Create opens 2
    panes and shows the drag hint (and the swap hint with only 2 objects).
  - Save → a tile appears. Open another layout, change it, Save → the update modal (Update / Save as
    new).
  - 1 to 10 layouts: arrangement as in D2. Show more / less at 6+ (or 8+, depending on the rows).
  - Hover a 4-pane tile: four labels, each joined to its corner.
  - Toggle the sidebar: tiles slide into one column, and the Pinned divider below doesn't move.
  - Opening a tile restores the panels **and** the sizes.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Split as external store; `openLayout()` on the workspace hook | `features/workspace/split.ts`, `features/workspace/useWorkspace.ts` (Workspace.tsx unchanged) |
| 2 | Layouts mock store + converters + tests | `mocks/layoutsStore.ts` (new), `mocks/layoutsStore.test.ts` (new) |
| 3 | Tile grid maths + tests | `features/layouts/tileGrid.ts`, `tileGrid.test.ts` (new) |
| 4 | Tile drawing | `features/layouts/LayoutThumb.tsx` (new) |
| 5 | Hover labels | `features/layouts/LayoutHoverLabels.tsx` (new) |
| 6 | Callout | `components/ui/overlays/Callout.tsx` (new) |
| 7 | Save / Create / update modal / hints | `features/layouts/useLayoutActions.ts`, `LayoutsSection.tsx` (new) |
| 8 | Put the section in the sidebar | `components/layout/sidebar/SidebarTree.tsx` (05's Layouts slot) |
| 9 | (with 06) Tiles draggable to the trash; "Layouts" group in the trash modal | `TrashBin.tsx`, `LayoutsSection.tsx` |
| 10 | Test, build, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, `features/workspace/layout.ts` (only read: `borders`,
`slotCells`, `panelKey`), `Workspace.tsx` beyond the unchanged `useSplit()` call.

## Open items

- D8: layouts have no names. Say so if you want names (e.g. shown under the tile or on hover).
- D12: the Save / Create button sits in the divider once layouts exist. Say so if it should stay a
  full-width button above the tiles.
