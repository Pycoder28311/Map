# 23 — Map-level features

**Goal:** the top right of the editor gets a rounded bar with **Branches**, **Share**, **Screenshot** and the **visitor-view** toggle; a **Carousel** button opens a presenter over the project's maps (a drag-to-reorder strip, and three ways to show the maps: carousel, fade, book pages). The top-left name bar and its ⋯ menu already exist (17b) and stay.

**Depends on:** 17b (editor shell, `MapTitleBar`, `FLOAT`), 22 (`PointCard`/`PointView` visitor view and its toggle), the share feature (`features/share`), the mock store (`mocks/projectsStore.ts`), the board store (`boardStore.ts`).
**Blocks:** nothing. Left over, still in no plan: a corner point's handles, add/delete a point on a curve, a font picker, the background image layer.

**Frontend only.** No backend, database or API. Branches are mock objects; the screenshot is made in the browser.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **A branch is a duplicate of the current map, like a chat branch:** "Create branch" copies the **whole board** (every object, links, banner ids) into a **new map** that is marked as a branch of the original. Each map belongs to a **branch group** (`branchOf`: the id of the group's first map, undefined for a map that never branched). The branch list shows every map of the group, the current one marked; clicking another opens it **in the same pane**. Branches are real map objects in the same project, so rename, ⋯ menu, links, delete, preview all work unchanged | User ("a new version, duplicated … like AI chat branches") + Default |
| D2 | **Branch button popout** (top right, first in the bar): the list of the group's maps (name, created time, the current one ticked), at the bottom an **input for the name** and a big **Create new branch** button. Name empty → "Branch N". Creating switches to the new branch. Esc / outside click closes | User (map.md) |
| D3 | **A branch is independent after creation:** later edits to either map do not touch the other; undo history starts fresh in the branch. Sidebar links (notes linked to the map) are **not** copied; the board's own links are (the objects keep the same ids inside the copy, so board links stay valid) | Default |
| D4 | **Duplicating a map from its ⋯ menu / card also copies its board** (today `duplicateObject` copies only the sidebar entry, so the copy opens empty). Same function (`copyBoard`) as D1, without the branch mark | Default (bug found while planning) |
| D5 | **Share** (second in the bar, left of Screenshot as in map.md) opens the app's existing share options **for this map**: copy link, native share, X / Facebook / LinkedIn / WhatsApp / email (`ShareOptions` from `features/share/ShareButton.tsx`, moved to its own file and made reusable). People who open the link must sign in, as today | User |
| D6 | **Screenshot** (third) downloads a **PNG** of the **map's content**: the bounds of all objects plus a 40-unit margin (the whole board when it is empty), painted at 2× on an offscreen canvas **without** the editor's UI, the board's shadow or selection and hover outlines. File name = the map's name. Banner pictures are not painted on the canvas, so they do not appear | Default |
| D7 | **Visitor-view toggle** (plan 22's floating button) **moves into this bar** as its own eye button (last in the bar; "Back to editing" is its pressed state with a tooltip) | Default |
| D8 | **The bar** is `absolute end-3 top-3`, same `FLOAT` look as the name bar, horizontal, icon buttons with `HoverInfo` tooltips (the project's reusable hover modal). It lives inside the board's area, so when the right sidebar is open it slides left with the board: no extra code | Default (17b) |
| D9 | **Carousel Map button** (bottom centre of the editor, `FLOAT` pill, beside nothing else) opens the **presenter**: a full-area layer over the editor (not a route) with the **project's maps** (children of the current map's project, not archived, kind `map`; branches included) | User |
| D10 | **Presenter layout:** the stage on top (the current map, read-only, painted fitted to the stage by the same renderer, with pins as in the visitor view), a **strip of thumbnails** below it (name under each; the current one highlighted). **Drag and drop on the strip reorders** the maps and saves the new order as the project's map order (`reorderChildren`), so the sidebar order changes too. Arrow keys, the on-screen arrows and a click on a thumbnail change the map; Esc or ✕ closes | User (map.md) |
| D11 | **Three display styles** chosen by a small segmented control: **Carousel** (maps slide sideways, neighbours peek at the sides), **Fade** (opacity cross-fade), **Book** (the page turns around its left edge like a book page, `rotateY` with perspective). CSS transitions only; `prefers-reduced-motion` falls back to Fade with no motion. The chosen style is remembered for the session (module state, like the pens) | User (map.md) |
| D12 | **Presenter is read-only;** a click on the stage's "Open" button (and Enter) opens that map in the pane for editing and closes the presenter | Default |
| D13 | **Opening another map in the same pane** needs a new pure `replacePanel(layout, from, to)` in `features/workspace/layout.ts` and a `replace(from, to)` in `useWorkspace`; the editor's pane slot is found by the map's panel ref. Without it (a panel the layout does not hold) it falls back to `open` | Default |
| D14 | **Map thumbnails** (strip, and a better `MapPreview` for cards) come from one small `snapshot.ts` (D6's painter at low resolution), cached per board object (a `WeakMap`, boards are immutable). Cards keep their placeholder art unless the board has objects: then the thumbnail replaces the placeholder in the strip only; the dashboard cards are **not** changed in this plan | Default |

## 1 — Risks and blockers

1. **Switching branch in the same pane** touches the workspace layout code (URL-driven panes). `replacePanel` is small and pure and tested, but the pane animation and the saved layouts (07) must be checked in the browser.
2. **The group of a branch outliving its first map:** if the group's first map is deleted, the others still carry its id. The list is built from "same `branchOf` or the id itself", so it keeps working; the first map's absence just shows fewer entries. No re-rooting in this plan.
3. **Copying a board** is cheap (boards are immutable, the copy shares the object references) but undo history and the view (pan/zoom) are per map and start fresh. The viewport store keys by map id, so the branch opens fitted.
4. **Screenshot size:** a very large content box at 2× can exceed the canvas limit (~16k px per side). The scale is lowered so the longest side stays ≤ 8192 px.
5. **Presenter load:** painting up to every map of a big project at once. Only the current map and its two neighbours are painted on canvases; thumbnails are small and cached.
6. **Banner images are not in screenshots or thumbnails** (the canvas never draws them); said in the hand-over.
7. **No browser pass yet for plans 18–22.** The bar, popouts and the presenter's transitions are unseen UI; the hand-over must say so.
8. **Uncommitted work** from 17a–22 sits in the working tree; this plan edits those files. Read them first.

## 2 — Approach

```
mocks/projects.ts          MockObject + `branchOf?: string`, `branchGroup(objects, id)` helper
mocks/projectsStore.ts     createBranch(mapId, name) → new map id; duplicateObject copies a map's board; deleteObject / emptyTrash drop its board
features/board/boardStore.ts   copyBoard(fromId, toId), dropBoard(mapId)
features/board/snapshot.ts     snapshotRect(board) (pure), paintSnapshot(ctx, board, rect, scale), snapshotBlob(board, name) (PNG), thumbnailOf(board) cached
features/board/TopRightBar.tsx the bar: branches, share, screenshot, visitor eye
features/board/BranchesPopout.tsx
features/board/branches.ts     branchList(objects, mapId) (pure), nextBranchName
features/share/ShareOptions.tsx ShareOptions moved out of ShareButton.tsx (+ `onChoose?` so the map's popout hides "Choose another")
features/workspace/layout.ts   replacePanel(layout, from, to)  (+ useWorkspace.replace)
features/board/presenter/      Presenter.tsx, PresenterStage.tsx (transitions), PresenterStrip.tsx (drag reorder), reorder.ts (pure), presenterStyle.ts (session store)
features/board/BoardEditor.tsx  the bar, the carousel button, the presenter layer; the plan-22 floating visitor button is removed
```

Data flow: *Create branch* → `createBranch` (new `MockObject` map after the current one, `branchOf: root`) + `copyBoard` → the popout calls `workspace.replace` to open it. *Screenshot* → `snapshotBlob(getBoard(mapId), name)` → `URL.createObjectURL` → a temporary `<a download>` click → revoke. *Presenter* → reads `useMockObjects` for the maps, `getBoard(id)` for each, `useBoard` is not used (read-only snapshot at open, refreshed when the presenter reopens).

## 3 — Branches

- **`MockObject.branchOf?: string`** (group id). `branchGroupOf(objects, mapId)` returns the group's maps, not archived, in creation order; a map with no `branchOf` that has no branches returns just itself. Seed data has none.
- **`createBranch(mapId, name)`** (in `projectsStore.ts`): finds the map; `root = map.branchOf ?? map.id`; creates a map object with `createObjectOf('map', parentId, name || nextBranchName(...))` placed right after the map, sets `branchOf: root` (and also on the origin if it had none, so the group is symmetrical); then calls `copyBoard(mapId, newId)`. Returns the new id. Not allowed (returns undefined) when the map is archived or not a map.
- **`copyBoard(from, to)`** in `boardStore.ts`: `replace(to, getBoard(from), { past: [], future: [] })`. **`dropBoard(mapId)`** frees a deleted map's board and history; `deleteObject` / `emptyTrash` call it for map ids.
- **`BranchesPopout`:** trigger = branch icon + the group count ("Branches 2"); content: `<ul>` of the group (current ticked, name, relative time), then a name `<input>` (Enter creates) and a full-width **Create new branch** `Button`. Uses the app's `Dropdown`/`Callout` popover (read `components/ui/overlays/*` when implementing) so it flips and clamps like the others.
- **Tests:** `branches.test.ts` (group of one, group order, a deleted first map, name defaults), `projectsStore.test.ts` (createBranch marks both, places after the origin, copies links of none, board copied and independent), `boardStore.test.ts` (copyBoard shares objects, fresh history, edits do not leak, dropBoard).

## 4 — Share, screenshot, visitor toggle

- **`ShareOptions.tsx`:** the function from `ShareButton.tsx` moved verbatim; props `{ id, onChoose? }` where `onChoose` replaces the "Choose another" link (the navbar passes `startSharing`, the map's popout passes nothing and shows no link). `ShareButton` imports it; behaviour unchanged.
- **Share in the bar:** a popover with `<ShareOptions id={mapId} />`.
- **`snapshot.ts`:** `snapshotRect(board)` = `unionBounds` of the objects inflated by 40, clamped to `BOARD`, or the whole board when empty. `paintSnapshot` paints a white sheet then `drawOrder(board)` with `paintObject(ctx, o, scale)` (text and area labels included, no hover). `snapshotBlob` makes the canvas (scale 2, lowered to keep ≤ 8192 px), `toBlob('image/png')`. `thumbnailOf(board)` the same at ~240 px wide, cached.
- **Screenshot button:** disabled while it works, shows an error line in the tooltip if `toBlob` returns null.
- **Visitor toggle:** the logic and `VisitorLayer` stay in `BoardEditor`; only the button moves to `TopRightBar` (props `visitor`, `onVisitor`).
- **Tests:** `snapshot.test.ts` for `snapshotRect` (empty board, content with margin, clamp) and the scale limit. Painting is not unit-tested.

## 5 — The presenter

- **Open:** the **Carousel** button (`LuGalleryHorizontal` icon + "Maps", bottom centre, hidden in visitor mode and while a text is edited) sets `presenting`. The presenter is an absolute layer over the editor (`inset-0`, `bg-surface`), with `role="dialog"`, focus moved into it, Esc closes.
- **Maps:** `siblingMaps(objects, mapId)` (pure, in `branches.ts` or `reorder.ts`) = the current map's parent's children of kind `map`, not archived, in list order. A map outside a project (top-level) presents just itself.
- **Strip (`PresenterStrip`):** each item is a thumbnail (`thumbnailOf(getBoard(id))`, `MapPreview` art when the board is empty) with its name; native drag and drop (`draggable`, `dragover` shows an insertion marker), `reorder.ts` (`moveItem(ids, from, to)`, pure, tested) gives the new order, then `reorderChildren(parentId, ids)`. Keyboard: with an item focused, Alt+←/→ moves it (and an announcement for screen readers).
- **Stage (`PresenterStage`):** shows the current map through a read-only canvas painted by `paintBoard` fitted with `fitView`; pins show as painted; clicking a pin opens plan 22's `PointCard`/`PointView` in place. `presenterStyle` (`'carousel' | 'fade' | 'book'`, module state + `usePresenterStyle`) drives the transition when the current index changes:
  - **carousel:** a track of the previous / current / next stages translated by index, with a 0.4 s ease;
  - **fade:** the old stage fades out while the new fades in (stacked, `opacity` transition);
  - **book:** the outgoing page rotates around its left edge (`transform-origin: left`, `rotateY(-180deg)`, `perspective` on the stage, `backface-visibility: hidden`), the next page is already underneath; going back reverses it.
- **Controls:** ◀ ▶ arrows, the segmented style control (three `aria-pressed` buttons), "Open" (D12), ✕.
- **Reduced motion:** styles still selectable, but all transitions are instant (`motion-reduce:` classes).
- **Tests:** `reorder.test.ts` (move forward / back / same place / unknown id), `siblingMaps` (parent's maps only, archived skipped, a top-level map alone).

## 6 — Wiring

- **`BoardEditor.tsx`:** removes plan 22's floating `Button` for the visitor view; renders `<TopRightBar …/>`, the Carousel button and `<Presenter …/>`; hides the bar and the Carousel button while `visitor`... except the eye button (to go back). `Esc` closes the presenter first.
- **`useWorkspace` / `layout.ts`:** `replacePanel(layout, from, to)` (swaps the ref at the panel's slot, null if `from` is missing or `to` is already open: then it just focuses nothing and the popout falls back to `open`); `useWorkspace().replace(from, to)` calls `go(...)`.
- **`mocks/projectsStore.ts`:** `duplicateObject` copies boards for map copies (D4).

## Testing

- **Unit (vitest):** everything pure above: `branches`, `createBranch`, `copyBoard`/`dropBoard`, `duplicateObject` copying a board, `snapshotRect`, `reorder`, `siblingMaps`, `replacePanel`.
- **Components:** none new; logic lives in pure files.
- **Commands at the end of each stage:** `npx tsc -b`, `npx vitest run`, `npm run lint`, `npm run build`.
- **Browser pass (needs you):** the bar at narrow widths and with the right sidebar open; branch list, create, switching in the same pane (and in a split layout, and a saved layout); share popout and copy link; screenshot of an empty, a small and a huge map, light and dark; the visitor eye; the presenter's three styles forward and back, reduced motion, drag-reordering and the sidebar following; thumbnails of maps with text and areas; keyboard (arrows, Alt+arrows, Esc, Enter). The hand-over must say plainly what was not seen.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `copyBoard`, `dropBoard` (+ tests) | `boardStore.ts`, `boardStore.test.ts` |
| 2 | `branchOf`, `branchGroupOf`, `createBranch`; `duplicateObject` copies the board; deletes drop boards (+ tests) | `mocks/projects.ts`, `mocks/projectsStore.ts`, tests |
| 3 | `branches.ts`: `branchList`, `nextBranchName`, `siblingMaps` (+ tests) | `branches.ts`, test |
| 4 | `replacePanel` and `useWorkspace().replace` (+ tests) | `workspace/layout.ts`, `useWorkspace.ts`, tests |
| 5 | `snapshot.ts` (+ tests) | `snapshot.ts`, test |
| 6 | Move `ShareOptions` to its own file with `onChoose?` | `share/ShareOptions.tsx`, `share/ShareButton.tsx` |
| 7 | `BranchesPopout` | that file |
| 8 | `TopRightBar` (branches, share, screenshot, visitor eye) and wire it; remove plan 22's floating button | `TopRightBar.tsx`, `BoardEditor.tsx` |
| 9 | `reorder.ts`, `presenterStyle.ts` (+ tests) | `presenter/` |
| 10 | `PresenterStrip`, `PresenterStage` (three transitions), `Presenter` | `presenter/*.tsx` |
| 11 | The Carousel button and the presenter layer in the editor; Esc order | `BoardEditor.tsx` |
| 12 | Check: tsc, tests, lint, build; hand-over with the browser pass list | — |

Files **not** touched: the dashboard cards (`dashboard/*`: their placeholder art stays), `features/projects/*` (stroke codec), auth, `vite.config.ts`, `package.json` (no new dependency), anything under `server/`.

## Open items

- None blocking. Defaults you may override: branches are ordinary maps in the project (visible in the sidebar) rather than hidden behind the switcher (D1); sidebar-note links are not copied to a branch (D3); the screenshot is the content's bounds, not the current view (D6); only the strip shows real thumbnails, dashboard cards keep their art (D14).
