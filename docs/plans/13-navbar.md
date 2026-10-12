# 13 — Navbar: Recent History, Search, profile, Share, Zoom

**Goal:** the navbar gets the rest of the mockup. The left side (☰ and "Map") stays as it is.
- **Centre:** a **Recent History** pill. Clicking it opens the recent list in a Caelestia popout below it.
- **Right, in order:**
  - **Search**: a field whose results (with filters) grow out below it;
  - a **profile circle**: an avatar, no action yet;
  - **Share**: dims the screen except the shareable objects, which pop out as highlights; you pick one, then share it from a popout;
  - **Zoom**: a focus mode that hides the navbar and sidebar, with the Zoom button left floating where it was.
- **Merging:** popouts that open next to each other (Search and Share) merge into one shape.

**Depends on:** 11 (`BarPopout`, edge sticking), 12 (Recent store and rows).
**Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | The left part (☰, "Map") is unchanged. The **Updates** bell is removed. Right side: Search · profile · Share · Zoom | User |
| D2 | **Recent History**, **Search** and **Share** open on **click / focus**, not hover. They stay open until Esc, a click outside, or their button again. Search results show while the field has focus or text | User |
| D3 | **Search** looks through all objects (projects, maps, notes, articles) by name and text. Filters (2nd image): **Type** with Include / Exclude and a checkbox per kind; **Parent Project** with a checkbox per project. Each result: a square icon/preview, the name, a description line (its project or the first line of its text), and a **hand** drag handle (drag it like any object). Clicking a result opens it | User |
| D4 | **Share** shares the object's normal app link (e.g. `/workspace?panels=note:n1`, made absolute). People who open it must sign in, and see it only if it's theirs: there's no backend change. The options are Copy link, the system share sheet (`navigator.share`, where available), X, Facebook, LinkedIn, WhatsApp and Email, all through share URLs | User |
| D5 | **Zoom** = focus mode: the navbar and sidebar slide away, and the page fills the window. The Zoom button stays exactly where it was (top right), floating with a shadow, with its icon switched to "zoom out". Click it or press Esc to bring them back. Not remembered across reloads | User |
| D6 | When **Search and Share are both open** and their popouts meet, they become **one shape**: the gap between them is filled at the shorter one's height, and a concave corner joins the shorter one's inner bottom to the taller one's side (see §3) | User |
| D7 | The **Share popout always sticks to the bar's right edge** (forced, not the 32px snap from plan 11), so it never covers the search results | User (+ how) |
| D8 | **Profile circle:** the user's image (`session.user.image`) or their initials on `bg-fill`, 32px. Not clickable yet | User (+ look default) |
| D9 | **Shareable** = every object row in the sidebar, every pane showing an object, and every object element on the page (column rows, section cards, Notes-page rows, …). They're marked with `data-share-id={objectId}` where they're rendered | User (+ how) |
| D10 | **Recent History pill:** centred in the bar (absolutely, so the left and right parts never push it), `w-56`, `bg-surface-muted`, rounded-full, with a chevron that turns while open. Its popout lists the last 10 Recent entries, with the same rows as the Dashboard's Recent column (plan 12), and "Show all" opens the Dashboard | Default |
| D11 | **Search shortcuts:** `/` or Ctrl/⌘+K focuses the field; ↑/↓ move through the results; Enter opens one; Esc clears the text, and a second Esc closes the results | Default |

## 1 — Risks

1. **Highlighting objects above a dark overlay.** The page sits in its own stacking context (`main`
   has `isolate`) and the sidebar is `z-20`, so the real elements can't be raised above one overlay.
   Instead, the overlay is a single fixed SVG over everything: a black `mask` with **holes cut at the
   rects of the `[data-share-id]` elements**, plus highlight rings drawn in the same layer. Clicks hit
   the overlay, which finds the rect under the pointer. Rects are re-measured on scroll and resize
   (a `ResizeObserver` on `main` and on the sidebar's scroll area).
2. **One shape from two popouts (D6), and one shadow.** Each popout today has its own `drop-shadow`, so
   two touching ones would show a seam. All bar popouts therefore render into **one popout layer**
   under the bar (a portal target in `Navbar`). The layer carries the single `drop-shadow` and the clip
   at the bar's edge. The union of the panels, bridges and corners then casts one shadow.
3. **`BarPopout` changes** (click mode, portal, forced stick) must keep the existing hover use working.
   It's only used by the Navbar today, and the bell goes away (D1), but the hover mode stays as the
   default for future use.

## 2 — Architecture

```
Navbar (header, relative)
 ├─ left: ☰, Map                                   unchanged
 ├─ centre: RecentHistory  ─ BarPopout(mode="click", align="center")  → RecentList (from plan 12)
 ├─ right:  NavSearch      ─ BarPopout(mode="focus", align="end")     → SearchPanel (filters + results)
 │          ProfileCircle
 │          ShareButton    ─ BarPopout(mode="click", stick="end")     → SharePanel ("Choose what to share" → options)
 │          ZoomButton     (focus mode toggle; floating copy while on)
 └─ PopoutLayer (absolute, top-full, full width): one portal target, one drop-shadow, clips at the bar's edge
      └─ panels of the open popouts + PopoutBridge pieces between neighbours that touch (D6)

AppLayout
 ├─ FocusModeProvider (on/off; Esc)                 the navbar and sidebar collapse while on
 └─ ShareMode (portal: the SVG overlay with holes; active while Share is choosing)
```

## 3 — `BarPopout` and the popout layer (`components/ui/overlays/`)

- New props, all optional (the hover default is unchanged):
  - `mode: 'hover' | 'click' | 'focus'`: `click` toggles on the trigger; `focus` is open while focus is
    inside the trigger (or the panel) or `open` says so;
  - `open` / `onOpenChange`: controlled;
  - `stick: 'auto' | 'end'`: `end` always uses the bar's right edge (D7).

  Click and focus modes close on Esc and on a `pointerdown` outside both the trigger and the panel.
  The CSS `group-hover` classes are only used in hover mode. The other modes switch on `data-open`.
- **Portal:** the panel renders into `PopoutLayerContext` when there is one (Navbar), otherwise
  inline as today. Its measured `left` (plan 11's `stickToEdges`) is now relative to the layer.
- `PopoutLayer.tsx` (new): `absolute inset-x-0 top-full h-[calc(100vh-…)] pointer-events-none
  overflow-hidden [filter:var(--chrome-drop)]`; the panels inside take pointer events. It also keeps a
  registry of the open popouts (`id → { left, right, height }`, reported by each `BarPopout` with a
  `ResizeObserver` on its panel).
- `popoutMerge.ts` (new, pure, tested): `bridges(spans, radius)` returns, for each pair of neighbouring
  open popouts whose gap is under `2 × radius`, `{ left, right, height: min(hA, hB), shorter: 'a' | 'b' }`.
  The layer draws each bridge (bar colour), removes the two inner top ears, squares the shorter
  one's inner bottom corner, and adds a concave ear below the bridge against the taller one's side
  (the same `radial-gradient` ears as plan 11).
- The slide-in (`-translate-y-full` → `0`) stays per panel. A bridge appears once both panels have
  finished sliding in (`transitionend`), fading in over 120ms, so it never hangs in the air.

## 4 — Recent History (`features/recent/RecentHistory.tsx`)

- The pill (D10) is the trigger. Its `aria-expanded` follows the popout.
- The panel is `w-80`. `RecentList` moves from `features/dashboard/ColumnBodies.tsx` to
  `features/recent/RecentList.tsx` (exported) with a `limit` prop. The Dashboard column and this
  popout both use it. Opening a row closes the popout.

## 5 — Search (`features/search/`)

- `search.ts` (pure, tested):
  ```ts
  type SearchFilters = { typeMode: 'include' | 'exclude'; types: ObjectKind[]; projects: string[] }
  export function searchObjects(objects: MockObject[], query: string, filters: SearchFilters): MockObject[]
  ```
  - Matching: every word of the query appears, ignoring case and accents (name, then text).
  - Type: with `include` and none ticked, all kinds count.
  - Parent Project: with none ticked, any (top-level ones too).
  - Ranking: name starts-with, then name contains, then text contains.
  - Only visible objects (`findObject`).
- `NavSearch.tsx`: `SearchInput` (existing; icon, ✕ clears) as the `BarPopout` trigger, `mode="focus"`,
  open while focused or non-empty (D2). Shortcuts as in D11.
- `SearchPanel.tsx` (2nd image), `w-[34rem]`, two parts:
  - **left** (`w-40`, `bg-surface-muted`, rounded): "Type", an Include / Exclude segmented toggle and
    a checkbox per kind (with `KIND_ICON`); then "Parent Project" and a checkbox per project;
  - **right**: a "Filters" summary line (the active filters as removable chips, or "All objects"),
    then the results.

  Each result is a row: a 40px square (`bg-fill`, kind icon), name + description, and on the right the
  **hand** (`LuHand`), which is the drag handle (`useObjectDrag`, `source: 'pane'`, `data-drag-handle`).
  Clicking a row opens it (`hrefFor(single(panel))`). Empty states: "Type to search", "No results".
- The filters are kept for the session (module state), not saved.

## 6 — Profile circle (`components/layout/ProfileCircle.tsx`)

`authClient.useSession()` → an `img` with `alt=""` when there's an image, else the initials
(`text-small font-medium`). 32px, `rounded-full`, `ring-1 ring-line`, `title={name}`. Nothing happens on
click (D8).

## 7 — Share (`features/share/`)

- `shareLinks.ts` (pure, tested): `shareUrl(objectId)` (the absolute app link through
  `hrefFor(single(panel))`) and `socialLinks(url, title)` → `{ x, facebook, linkedin, whatsapp, email }`
  share URLs.
- **Marking (D9):** `data-share-id={object.id}` goes on:
  - the sidebar object rows (`PanelDragLink`'s element);
  - `ObjectRow`, `SectionCard` and the Dashboard columns' object rows;
  - each `Pane` that shows an object (its frame);
  - the page panels' root elements (`NotePanel` and friends, when shown as a page).
- `shareStore.ts`: `phase: 'idle' | 'choosing' | 'chosen'`, `chosenId`, and `start()`, `choose(id)`,
  `stop()`.
- `ShareMode.tsx` (in `AppLayout`, a portal):
  - while `choosing`, a fixed full-screen SVG (z above the sidebar, below the navbar popout layer,
    so the Share popout stays visible): a black 70% rect masked by rounded-rect holes at every
    `[data-share-id]` rect. Each hole gets a white ring that **pops in** (scale 0.9 → 1.04 → 1, staggered
    by 20ms).
  - Hovering a hole brightens its ring. Clicking it → `choose(id)`: the overlay fades out, and the
    element keeps a ring for 600ms.
  - Clicking outside every hole, or Esc → `stop()`.
- `ShareButton.tsx`: `BarPopout mode="click" stick="end"`. Opening it calls `start()`, and closing
  it calls `stop()`. The panel:
  - **choosing:** "Choose what to share", with a small hint "Click a highlighted object";
  - **chosen:** the object's icon and name, Copy link (with a "Copied" check for 1.5s), the system
    share button (if `navigator.share` exists), and the social buttons in a row (simple icons from
    `react-icons/si`, or `lu` fallbacks), plus "Choose another".

## 8 — Zoom / focus mode (`features/focus/`)

- `FocusModeProvider` (in `AppLayout`, around everything): `{ on, toggle }`, Esc turns it off.
- `AppLayout`: while `on`, the navbar's height goes to 0 and the sidebar's space and nav go to 0, both
  over `--sidebar-duration`. The navbar is `inert`, and so is the sidebar. The page fills the window.
- `ZoomButton.tsx` (navbar, last on the right): `LuZoomIn` (off) / `LuZoomOut` (on). While `on`, a
  `fixed` copy is rendered at the button's measured viewport place (stored when it's switched on),
  with `bg-surface shadow-lg rounded-(--btn-radius)`, so it seems to stay put while the bar slides
  away underneath.

## Testing

- `npm test`: `popoutMerge.test.ts` (touching / apart / overlapping, which one is shorter);
  `search.test.ts` (words, accents, include/exclude, project filter, ranking, hidden objects);
  `shareLinks.test.ts` (absolute URL, encoded titles in each share URL).
- By hand (`npm run dev`, signed in):
  - **Recent History:** opens and closes on click, Esc and an outside click; rows open.
  - **Search:**
    - `/` focuses the field, and typing filters the results;
    - each filter narrows them;
    - dragging by the hand onto a pane, a sidebar row and a link node works;
    - Enter opens the selected result.
  - **Share:**
    - the screen darkens with holes around the sidebar rows, the panes and the column rows / cards;
    - a click picks one, and the popout switches to the share options;
    - Copy link works;
    - Esc cancels.
  - **Search + Share open together:** one shape with a single shadow, and no seam.
  - **Zoom:** the bars slide away and the button stays in place; clicking it or pressing Esc brings
    them back.
  - The ☰ and "Map" are unchanged.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Merge geometry + tests | `components/ui/overlays/popoutMerge.ts`, `.test.ts` |
| 2 | `BarPopout`: click/focus modes, controlled, `stick="end"`, portal | `components/ui/overlays/BarPopout.tsx` |
| 3 | Popout layer: one shadow, registry, bridges | `components/ui/overlays/PopoutLayer.tsx` |
| 4 | `RecentList` moved out of the Dashboard (with `limit`) | `features/recent/RecentList.tsx`, `features/dashboard/ColumnBodies.tsx` |
| 5 | Recent History pill + popout | `features/recent/RecentHistory.tsx` |
| 6 | Search logic + tests | `features/search/search.ts`, `.test.ts` |
| 7 | Search field + panel (filters, results, hand drag, keys) | `features/search/NavSearch.tsx`, `SearchPanel.tsx` |
| 8 | Profile circle | `components/layout/ProfileCircle.tsx` |
| 9 | Share links + tests, store | `features/share/shareLinks.ts`, `.test.ts`, `shareStore.ts` |
| 10 | Mark shareable elements | `PanelDragLink.tsx`, `ObjectRow.tsx`, `SectionCard.tsx`, `Pane.tsx`, `NotePanel.tsx`, `MapPanel.tsx`, `ProjectPanel.tsx` |
| 11 | Share overlay + Share button and panel | `features/share/ShareMode.tsx`, `ShareButton.tsx` |
| 12 | Focus mode + Zoom button | `features/focus/FocusMode.tsx`, `ZoomButton.tsx`, `components/layout/AppLayout.tsx`, `components/layout/sidebar/Sidebar.tsx` |
| 13 | Navbar: new right side, centred pill, popout layer, bell removed | `components/layout/Navbar.tsx` |

Files **not** touched: the ☰ button and "Map" link (Navbar's left part), `backend/`, `packages/shared/`, routes.

## Open items

- None blocking. D8 and D10–D11 are defaults; say if any should change.
