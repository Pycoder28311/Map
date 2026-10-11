# 09 — Pane borders: move one half of a border, snap back to 4 corners; rounded visible corners on small screens

**Goal:** in a 2×2 layout, dragging the border between two panes moves only **those two** panes; the
other pair keeps its size, so the 4 corners no longer meet. When the two halves come within 12px of
each other again, they snap together and the 4 corners join. On small screens, where the panes are
stacked and scroll, the visible top and bottom edges of the scroll area are rounded, so a pane cut
off by the scroll still shows rounded corners.

**Depends on:** 03 (workspace), 07/08 (saved layouts and tiles read the sizes). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Only one line can be split at a time. Once the vertical border's halves differ (each row has its own width), the horizontal border is **one whole line** that moves both columns. The other way round too. The corner handle is hidden until the 4 corners meet again (with split halves they'd overlap) | User |
| D2 | Snap distance: **12px**. While a half is dragged within 12px of the other half's position, it jumps there; on release, the halves join again (back to one line, corner handle back) | User |
| D3 | Joined state, as today: the vertical border has a **top half** and a **bottom half** handle, the horizontal border a **left half** and a **right half**. Dragging a half moves only that half. The corner still moves both lines together | User (from the request) |
| D4 | Only the `4` template has halves that can split. In the 3-pane templates every border is already a single segment between two panes (unchanged) | Default |
| D5 | Data: `Split` gains two optional fields: `x2` (the bottom row's vertical line) and `y2` (the right column's horizontal line). `x` / `y` stay the top row's / left column's. At most one of `x2` / `y2` is set, and only for template `4`. Missing = joined. Existing saved layouts and the localStorage value stay valid | Default |
| D6 | When the layout stops being `4` (detach, drop, full page), `x2` / `y2` are dropped: `splitFor(template, split)` normalises everywhere a split is used | Default |
| D7 | Wide screens: panes move from CSS grid **areas** to **absolute boxes** computed from the template and split, still driven by CSS variables (`--split-x`, `--split-y`, `--split-x2`, `--split-y2`), so dragging still never re-renders React. A grid can't give two rows different column widths | Default (follows D1) |
| D8 | Small screens (< `lg`, panes stacked): the scroll area gets the panes' radius (12px) and clips to it. A pane cut off at the top or bottom of the view shows rounded corners there | User (+ approach default) |
| D9 | Keyboard: each half handle moves with the arrow keys and snaps the same way. Double-click on a half rejoins the halves at their middle (today double-click resets to 50%) | Default |
| D10 | Swap buttons stay one per border segment (`borders()` already gives the halves); they follow their half's position. Dragging a swap button moves its half (plan 08's drag-to-resize) | Default |

## 1 — Risks

1. **Many readers of `Split`.** About ten places read `split.x` / `split.y`: the grid, handles,
   swap buttons, drop targets, pane rearranging, layout tiles, hover labels, saved layouts. They all
   move to one shared helper, `paneBox(template, slot, split)`, so a pane's box is computed in one
   place. Tests cover it.
2. **Absolute panes and the glide.** `paneFlip.ts` measures real rects, so it keeps working. Drop
   zones and the pane drag preview (`usePaneRearrange`, `dropTarget.ts`) switch to `paneBox`.
3. **Snap must not fight the pointer.** The snap is applied to the live value only. The raw pointer
   position is kept, so pulling beyond 12px releases it again smoothly.

## 2 — Model (`features/workspace/split.ts`, `layout.ts`)

```ts
export type Split = { x: number; y: number; x2?: number; y2?: number }
```

New pure helpers, in `layout.ts` next to `borders`, all tested:

- `splitFor(template, split)`: drops `x2` / `y2` unless the template is `4`; drops both if both are set
  (keeps `x2`); drops a half equal to its partner (|Δ| < 0.001).
- `paneBox(template, slot, split)` → `{ x0, y0, x1, y1 }` (fractions). Top-row cells use `x`,
  bottom-row cells `x2 ?? x`; left-column cells use `y`, right-column cells `y2 ?? y`. It replaces
  `slotRect` (`features/layouts/geometry.ts`) and `cellBox`/`slotBox` (`dropTarget.ts`).
- `splitLinesOf(template, split)`: the resize segments to draw, each `{ axis, part, at, from, to, moves }`:
  - joined `4`: x-top, x-bottom, y-left, y-right, plus the corner;
  - `x2` set: x-top, x-bottom, and a whole y;
  - `y2` set: y-left, y-right, and a whole x;
  - other templates: today's segments.
- `snapHalf(value, partner, sizePx, threshold = 12)` → the partner when within `threshold` px.

`setSplit` clamps all four values and stores `splitFor` of them (the template comes from the caller:
`useSplit` gains an optional `template` argument for normalising on read).

## 3 — Rendering (`Workspace.tsx`, `Pane.tsx`, `paneStyles.ts`)

- The grid element stays the positioning box (`relative`). On `lg`, each `Pane` gets its box as
  inline CSS variables (`--pane-l`, `--pane-t`, `--pane-r`, `--pane-b`). Each is a `calc()` over the
  split variables plus half the gap, e.g. the bottom-right pane's left:
  `calc(var(--split-x2, var(--split-x)) + ${PANE_GAP / 2}px)`, and edge panes use `0` / `100%`.
- Classes: `lg:absolute lg:[left:var(--pane-l)] lg:[top:var(--pane-t)] lg:[right:calc(100%-var(--pane-r))] lg:[bottom:calc(100%-var(--pane-b))]`.
  Below `lg`, today's stacked column is unchanged.
- `Workspace.tsx` sets `--split-x2` / `--split-y2` only when present (else leaves them unset, so the
  `var()` fallbacks apply). `GRID` drops the `grid-template-*` classes; `gridAreas` stays exported for
  nothing else and is removed if unused.
- `paneBox` (fractions) is used for the tiles; the CSS version is generated by a small helper,
  `paneBoxCss(template, slot)`, from the same cell rules, so both agree.

## 4 — Handles and snapping (`ResizeHandles.tsx`, `useSplitDrag.ts`, `SwapButtons.tsx`)

- `useSplitDrag`: the axis becomes the segment being dragged:
  `'x' | 'x-top' | 'x-bottom' | 'y' | 'y-left' | 'y-right' | 'xy'`. On move:
  - `x-top` sets `x`. In the joined state it first freezes the bottom row at the old value
    (`x2 = x`). It then snaps `x` to `x2` with `snapHalf`, using the grid's width in px. `x-bottom`
    does the same for `x2` against `x`; `y-left` / `y-right` likewise with `y` / `y2` and the height.
  - whole `x` / `y`, and the corner: as today. They only exist when the other line is whole or
    joined.
  - `apply()` sets or removes `--split-x2` / `--split-y2` live. On release, `onCommit(splitFor('4', live))`,
    so snapped halves are stored as joined.
- `ResizeHandles` draws `splitLinesOf(...)` instead of the fixed x/y/corner set. Each half handle
  spans its half (`top: 0` → `--split-y` for x-top, and so on) at its own line's position. It keeps
  `role="separator"`, `aria-valuenow`, the arrow keys (with the snap) and double-click (D9). The
  `peer/x`, `peer/y` names become per segment (`peer/x-top`, …) so each swap button shows with its
  own half.
- `SwapButtons`: a button's position uses its half's variable (the x-bottom button sits at
  `var(--split-x2, var(--split-x))`). Its drag starts that half's segment.

## 5 — Everything else that reads the split

| File | Change |
|---|---|
| `features/workspace/dropTarget.ts` | `slotBox` → `paneBox` (drop zones and pane-drag preview follow uneven halves) |
| `features/workspace/usePaneRearrange.ts` | passes the full split through (no logic change) |
| `features/layouts/geometry.ts` | `slotRect` → re-export of `paneBox`. `layoutLines` draws from `splitLinesOf` (a tile shows uneven halves) |
| `features/layouts/LayoutHoverLabels.tsx` | the memo key includes `x2` / `y2` |
| `mocks/layoutsStore.ts` | `toSaved` copies `x2` / `y2`; `sameLayout` compares them (missing = equal to the partner) |
| `features/layouts/LayoutsSection.tsx` | `setSplit(layout.split)` unchanged (the store normalises) |

## 6 — Small screens: rounded visible corners (`Workspace.tsx`, `paneStyles.ts`)

- `paneGridStyle` also sets `--pane-radius: ${PANE_RADIUS}px`.
- `GRID` (the scroll container below `lg`) gets `max-lg:rounded-(--pane-radius)`. With its existing
  `overflow-auto`, it clips its content to the rounded box. The top visible pane's top corners and
  the bottom visible pane's bottom corners are rounded wherever the scroll cuts them. At the very
  top and bottom they coincide with the panes' own corners.
- The pane gap and the frame padding stay, so the rounding sits exactly where the panes' own corners
  would.

## Testing

- `npm run test --workspace app`:
  - `layout.test.ts`:
    - `splitFor`: normalising, dropping on other templates.
    - `paneBox`: joined, `x2`, `y2`, 3-pane templates; boxes never overlap and cover the area.
    - `splitLinesOf`: which segments, and no corner when split.
    - `snapHalf`: within / outside 12px.
  - `dropTarget.test.ts`: a case with `x2`.
  - `layoutsStore.test.ts`: round trip with `x2`, and `sameLayout`.
- `npm run build --workspace app`, `npx oxlint src`.
- Manual (`npm run dev`, wide window, 4 panes):
  - drag the top half of the vertical border: only the top two panes resize, and the corner handle
    disappears;
  - drag the horizontal border: it moves as one line;
  - bring the top half back near the bottom half: it jumps within 12px, joins on release, and the
    corner returns;
  - the same for the horizontal halves;
  - the swap buttons sit on their halves and still drag their own half;
  - saving the layout keeps the uneven halves, and the tile shows them;
  - narrow window: the stacked panes scroll, and the cut edges at the top and bottom are rounded.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `Split` fields; `splitFor`, `paneBox`, `splitLinesOf`, `snapHalf` + tests | `features/workspace/split.ts`, `layout.ts`, `layout.test.ts` |
| 2 | Absolute pane boxes on `lg` from CSS variables | `features/workspace/Workspace.tsx`, `Pane.tsx`, `paneStyles.ts` |
| 3 | Segment-based drag with snapping | `features/workspace/useSplitDrag.ts` |
| 4 | Half handles, keyboard, double-click | `features/workspace/ResizeHandles.tsx` |
| 5 | Swap buttons on their halves | `features/workspace/SwapButtons.tsx` |
| 6 | Drop zones / pane drag preview on `paneBox` + test | `features/workspace/dropTarget.ts`, `dropTarget.test.ts`, `usePaneRearrange.ts` |
| 7 | Tiles and labels from `paneBox` / `splitLinesOf` | `features/layouts/geometry.ts`, `LayoutHoverLabels.tsx` |
| 8 | Saved layouts keep `x2` / `y2` + test | `mocks/layoutsStore.ts`, `layoutsStore.test.ts` |
| 9 | Rounded scroll area on small screens | `features/workspace/Workspace.tsx`, `paneStyles.ts` |
| 10 | Test, build, lint, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, the sidebar (`components/layout/sidebar/*`),
`layout.ts`'s add/move/remove/swap rules (only new helpers are added).

## Open items

- None blocking. D9 (double-click a half to rejoin at the middle) and D8 (rounding via the scroll
  area's own corners) can be changed if you'd prefer another behaviour.
