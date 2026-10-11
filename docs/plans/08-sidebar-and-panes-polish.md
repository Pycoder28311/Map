# 08 — Sidebar and panes polish: unsaved layout, tile actions, 2 columns, undrag, shadows, swap icon

**Goal:** a round of changes on top of plans 05–07:
- the panes on screen show as an **unsaved layout tile**, first in the list, in blue with a small Save button;
- layout tiles get hover actions: Delete, and Save when the open layout has changed;
- tiles are at most **2 per row**, and the hover labels of left-column tiles bend correctly;
- section buttons sit at the sidebar's right edge;
- a dragged row leaves a dashed outline behind;
- an object shown as a pane gets an **undrag** icon and menu item;
- the sidebar, navbar and their rounded corners cast a light shadow;
- the closed sidebar shows only icons, with bigger layout tiles;
- the pane border's swap button gets a new icon and can also be dragged to resize;
- a hovered pane gets a blue border.

**Depends on:** 05, 06, 07 (all built). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Hover labels of left-hand panes go **above / below** the tile, with a curve that leaves the pane, bends, and runs to the label. Right-hand panes keep their labels on the right | User |
| D2 | At most **2 tiles per row**, bigger rows first: 1 → one full-width tile; odd N → one full-width tile on top, then rows of 2 (3 = 1+2, 5 = 1+2+2); even N → rows of 2. Collapsed: the **first 3 rows**, then "Show more" | User |
| D3 | Swap button icon: **two arrows in a circle** (Lucide `LuRefreshCw`). On hover it turns half a turn, as if the two panes rotate into each other's place | User |
| D4 | The tile's hover **Delete** deletes for good after a **confirmation modal** in the middle of the screen. Archiving stays drag-to-trash | User |
| D5 | **Unsaved layout** = panes on screen (`/workspace`, 2 or more panels) with **no layout selected**. It shows as the first tile, with a blue border and fainter blue lines, plus a small round Save button at its top centre that saves it as a new layout (it then becomes a normal, selected tile) | User (+ default for "unsaved") |
| D6 | Hover on a saved tile: icon buttons at its top centre. **Delete** always; **Save** only when it's the open (selected) layout and the panes differ from it (panels added, removed or moved, or sizes changed: `sameLayout`). Save updates it at once, with no modal | User |
| D7 | Because tiles now save themselves, the Layouts divider's button is only **Create** (when there are no panes). The old "Update layout?" modal goes away | Default (follows D5, D6) |
| D8 | Section buttons (the + of Projects / Notes, Create of Layouts) sit at the **right edge** of the sidebar. The label stays on the left, and the line runs between them | User |
| D9 | A dragged row leaves a **dashed outline** of its own shape (same rounded box, `border-dashed`, `--line-strong`) in its place, instead of an empty gap | User |
| D10 | **Undrag** = take the object out of the panes (the workspace's Detach). When a row's object is open **as a pane** (on `/workspace` with 2 or more panels), hovering the row shows an undrag icon (`LuUnlink`, the panes' own Detach icon) left of the ⋯. The ⋯ menu also gets "Remove from screen" | User (+ icon default) |
| D11 | Blue: a new theme token `--highlight: #3b82f6` (both themes), used by the unsaved tile and the hovered pane. The drag & drop purple (`--drop`) stays for drops | Default |
| D12 | Shadows: a light grey shadow cast by the chrome (navbar + sidebar) onto the page, following the rounded corners. On the page, it's an inset shadow on an overlay over `<main>` (top and left edges, top-left corner rounded like the workspace frame), on the workspace frame, and as a `drop-shadow` on the bar popouts (with their ears) | Default |
| D13 | Closed sidebar: the trash bin and the Create layout button show **only their icon** (the label fades out and takes no space; the count becomes the badge). Tiles stack in one column. They're **bigger** now (2 columns make the grid taller) and still exactly the grid's height, so nothing below moves | User |
| D14 | The swap button doubles as a resize handle: press and **drag** it (4px or more) to move its line; a press without moving swaps | User |
| D15 | Hovered pane: a 1px **blue border** (`--highlight`) instead of the grey one, while the pointer is over it. Not shown while a pane is being dragged (the drop previews show then) | User (+ default) |

## 1 — Risks

1. **Unsaved vs selected-but-changed.** The unsaved tile only shows with no layout selected (D5). A
   selected layout that has changed shows Save on its own tile instead (D6). Saving a changed
   selected layout *as a new one* isn't offered any more (see Open items).
2. **Swap button vs resize.** The button sits on the line, above the handle. Pointer capture moves
   to the button on press. The resize logic (`ResizeHandles`) is shared through a small hook, so the
   button and the line resize the same way and commit once.
3. **Labels must stay on screen.** Above/below labels for left panes start at the curve's end and
   are kept at least 4px from the window's left edge. Check 4-pane tiles in both columns.
4. **Height in the rail.** 2 columns make the grid taller. The rail column keeps exactly the grid's
   height (the existing `positions()` rule), so its tiles grow. Re-check that the Pinned divider
   doesn't move when toggling.

## 2 — Changes per area

### 2.1 Tile grid: 2 columns (`features/layouts/tileGrid.ts`)

- `rowsFor(n)`: 0 → `[]`. Otherwise `n % 2 ? [1, ...Array((n-1)/2).fill(2)] : Array(n/2).fill(2)`
  (3 → `[1,2]`, 4 → `[2,2]`, 5 → `[1,2,2]`).
- `collapsedRowCount(rows)` → `Math.min(3, rows.length)`. `visibleCount` follows (5 → 5, 7 → 5, 8 → 6).
- `positions()` doesn't change. The rail column's tiles get bigger on their own, because the grid is
  taller.
- `tileGrid.test.ts`: update the expectations for `rowsFor`, the collapsed counts and the rail/grid
  height equality.
- The unsaved tile (2.3) counts as a tile: it's laid out first, as part of `n`.

### 2.2 Hover labels: left panes above / below (`features/layouts/LayoutHoverLabels.tsx`)

- Every pane whose label would go **left** (`spot.dx < 0`) turns, not only those near the edge (D1).
  Its label goes above (top or full-height pane) or below (bottom pane) the tile, `OUT` px out.
  It starts at the curve's end, kept at least `EDGE` from the window edge.
- The curve for a turned label: a cubic path that leaves the anchor **vertically** (out of the tile)
  and bends into a short **horizontal** run that ends at the label's near side:
  `M a C (a.x, a.y + dy·OUT·0.7) (e.x − 12, e.y) (e.x, e.y)`, with the label starting at `e.x`. Right
  and top/bottom-centred labels keep their current curve.
- Two labels on the same side (e.g. top-left and full-width top) are stacked: the second is moved one
  label height (+4px) further out.
- Colour stays `var(--fg)` (white in the dark theme, as you see it).

### 2.3 Unsaved tile + tile actions (`LayoutsSection.tsx`, `LayoutThumb.tsx`)

- `LayoutThumb` gets new props:
  - `variant: 'saved' | 'unsaved'`. Unsaved: `border-highlight`, lines in `text-highlight/50`.
  - `actions?: ReactNode`: icon buttons shown at the top centre while the tile is hovered or holds
    keyboard focus. They're always visible for the unsaved tile.

  The tile becomes a wrapper `div` (`relative`) holding the tile button and the actions, so the
  action buttons aren't nested inside the button.
- Actions: small round buttons, `IconButton`-style, `rounded-full`, `bg-surface`, `shadow-sm`,
  `size-6`. They sit centred on the tile's top edge (`-translate-y-1/2`).
- In `LayoutsSection`:
  - `draft` = active panes and no selected layout. It's prepended to the tiles with `id: 'unsaved'`
    (not draggable, no hover labels), and its Save calls `saveLayout(workspace.layout, split)`.
  - Saved tile actions: Delete (`LuTrash2`) → a confirm `Modal` → `deleteLayout`. Save (`LuSave`) only
    on the selected tile when `!sameLayout(...)` → `updateLayout`.
  - The divider action: Create only when there are no active panes (D7). The `confirm` state and the
    update modal are removed.
- Rail: action buttons hidden (tiles are too small). The unsaved tile keeps its blue border.

### 2.4 Divider button on the right (`components/ui/Divider.tsx`)

- Order: `[label] [line flex-1] [action]`. The action keeps its box and fade. Its `ms-1` sits after
  the line, at the row's right edge. Uses `pe-(--btn-px)` so it lines up with the rows' right icons.
- Compact: unchanged (label and action fade out, the short rail line shows).

### 2.5 Dragged row leaves an outline (`components/ui/tree/TreeItem.tsx`)

- While `dnd.draggingId === node.id`, the row container stays in place, but its contents are made
  invisible (`[&>*]:invisible`) and it gets `border border-dashed border-line-strong` (same
  `rounded-(--btn-radius)`). The row keeps its size, so it reads as "the place it left". It replaces
  today's `opacity-0`.

### 2.6 Undrag from the sidebar (`SidebarTree.tsx`, `useWorkspace.ts`)

- `useWorkspace()` gets `close(panel)`: it finds the panel's slot and calls `detach(slot)`. It also gets
  `isPane(panel)`: true on `/workspace` with 2 or more panels and the panel among them.
- `rightIcons(node)`: when `node.panel && workspace.isPane(node.panel)`, it prepends
  `{ icon: LuUnlink, label: 'Remove from screen: <name>', show: 'hover', onClick: () => workspace.close(node.panel) }`.
  It sits left of the ⋯ (and of the project `+`), in all sections, including Overview rows (which
  have no menu, so only this icon).
- `menuOf()`: the first group gets "Remove from screen" (`LuUnlink`) in the same case.

### 2.7 Shadows (`AppLayout.tsx`, `Workspace.tsx`, `BarPopout.tsx`, tokens)

- Token: `--chrome-shadow: 0 0 0 1px rgb(0 0 0 / 0.03), 0 2px 10px rgb(0 0 0 / 0.08)` (dark: higher
  alpha), plus the inset variant used on the page side.
- `AppLayout`: `<main>` gets a sibling overlay `pointer-events-none absolute inset-0 z-10` with
  `rounded-tl-(--frame-radius)` and an inset shadow on the top and left edges, so the chrome seems to
  lie over the page. It sits outside the scrolling element, so it never scrolls away.
- `Workspace.tsx`: the frame (`workspaceFrameStyle`) gets the same inset shadow. Its concave corners
  then get it too.
- `BarPopout.tsx`: the popout's panel and ears get `filter: drop-shadow(...)` on the clipping wrapper's
  child, so the shadow follows the ears' curve.
- The sidebar's own `shadow-xl` while floating (peek / drawer) stays.

### 2.8 Closed sidebar: icons only (`TrashBin.tsx`, `LayoutsSection.tsx`)

- Trash: the label becomes `max-w-0 opacity-0` when `compact` (with transitions, so nothing jumps
  while the rail clips it). The count is already a badge in compact.
- Create layout (full-width button when there are no layouts): the label also fades to `max-w-0`,
  so only the icon shows in the rail-width button.
- Tiles: covered by 2.1 (bigger column, same height).

### 2.9 Swap button: new icon, drag to resize (`SwapButtons.tsx`, `ResizeHandles.tsx`)

- Extract the drag logic from `ResizeHandles` into a hook,
  `useSplitDrag({ containerRef, split, onCommit })`, returning `start(axis, e)` plus the shared
  move/up handlers. `ResizeHandles` uses it as today.
- `Workspace.tsx` passes the hook's `start` to `SwapButtons`.
- Each swap button:
  - on pointerdown, remembers the point;
  - on a move of 4px or more, calls `start(axis, e)` (pointer capture moves to the resize);
  - on pointerup without a drag, swaps;
  - Enter / Space still swap (keyboard).
- Icon: `LuRefreshCw` for both axes, with `transition-[rotate] duration-300 group-hover:rotate-180`
  (reduced motion: none). Labels stay "Swap left and right" / "Swap top and bottom".
- The cursor over the button is `col-resize` / `row-resize` while held, and `pointer` otherwise.

### 2.10 Hovered pane: blue border (`Pane.tsx`, `paneStyles.ts`)

- `paneStyle`'s border colour comes from a CSS variable:
  `border: 1px solid var(--pane-border, var(--color-line))`.
- `Pane` adds `hover:[--pane-border:var(--highlight)]` with
  `transition-[border-color] duration-150`. It's off while dragging
  (`useWorkspaceDrag().dragging` → no hover class), since the drop previews show then.

## Testing

- `npm run test --workspace app`: updated `tileGrid.test.ts` (2-column rows, collapsed 3 rows, rail
  height = grid height, 16:9 kept); a test for `useWorkspace`'s `close` slot lookup if it's pure
  (`layout.ts` helper `slotOf(layout, panel)`).
- `npm run build --workspace app`, `npx oxlint src`.
- Manual (`npm run dev`):
  - **Unsaved tile:** open 2 panes from the sidebar. A blue unsaved tile shows first; Save turns it
    into a selected tile.
  - **Tile Save / Delete:** change the selected layout (add a pane, swap, resize), and Save shows on
    its tile and updates it. Delete asks first.
  - **Grid:** 1–7 layouts arrange as in D2. Show more appears at 7 or more.
  - **Hover labels:** hover a 4-pane tile in the left column. The left labels sit above/below with
    bending curves, and nothing is off-screen.
  - **Section buttons:** the +/Create buttons sit at the right edge of their dividers.
  - **Drag outline:** drag a row. A dashed outline stays where it was.
  - **Undrag:** with a map open as a pane, hover its row. The unlink icon shows; clicking it (or the
    menu item) removes the pane.
  - **Shadows:** light shadows along the navbar/sidebar edges and the frame's rounded corners, and
    on popouts.
  - **Closed sidebar:** trash and Create show icons only; tiles are bigger; the Pinned divider
    doesn't move.
  - **Swap button:** new icon turning on hover. Click swaps; press and drag moves the line.
  - **Pane hover:** a blue border on the hovered pane, none while dragging a pane.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `--highlight`, chrome shadow tokens | `styles/colors.css`, `styles/tokens.css` |
| 2 | 2-column grid + tests | `features/layouts/tileGrid.ts`, `tileGrid.test.ts` |
| 3 | Left labels above/below with bending curves | `features/layouts/LayoutHoverLabels.tsx` |
| 4 | Tile wrapper, variants, hover actions | `features/layouts/LayoutThumb.tsx` |
| 5 | Unsaved tile, tile Save/Delete, Create-only divider, remove update modal | `features/layouts/LayoutsSection.tsx` |
| 6 | Divider action on the right | `components/ui/Divider.tsx` |
| 7 | Dashed outline for the dragged row | `components/ui/tree/TreeItem.tsx` |
| 8 | `close` / `isPane` on the workspace; undrag icon + menu item | `features/workspace/useWorkspace.ts`, `features/workspace/layout.ts` (`slotOf`), `components/layout/sidebar/SidebarTree.tsx` |
| 9 | Chrome shadows | `components/layout/AppLayout.tsx`, `features/workspace/Workspace.tsx`, `components/ui/overlays/BarPopout.tsx` |
| 10 | Icon-only trash / Create in the rail | `components/layout/sidebar/TrashBin.tsx`, `features/layouts/LayoutsSection.tsx` |
| 11 | `useSplitDrag`; swap button icon + drag to resize | `features/workspace/ResizeHandles.tsx`, `SwapButtons.tsx`, `Workspace.tsx` |
| 12 | Blue hover border on panes | `features/workspace/Pane.tsx`, `paneStyles.ts` |
| 13 | Test, build, lint, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, the mock stores' data shapes (`mocks/*Store.ts`
only gain nothing; `layoutsStore` already has `deleteLayout` / `updateLayout`), the drag rules
(`treeDrop.ts`), and the Zen effects (`dragEffects.ts`, `swallow.ts`).

## Open items

- With D5–D7, a **changed selected layout can only be updated**, not saved as a new one. Should its
  tile also offer "Save as new" (e.g. a second small button), or should the unsaved tile appear in
  that case too?
- D11: the blue `#3b82f6` (Tailwind blue-500). Say so if you have a specific blue in mind.
