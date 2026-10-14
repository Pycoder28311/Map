# 16 — Map cards (image, hover controls, zoom, select) and a Keep-style note modal

**Goal:** a **map card** on the Dashboard is a full-bleed picture with its name centred at the bottom. On hover a
dim layer, a centred **Open**, a select checkbox (top left) and two buttons (top right: zoom, ⋯) appear. Clicking
anywhere on the card opens the map (except its buttons). **Zoom** shows the map's picture in a modal. Clicking a
**note card** opens a **Google Keep-style modal**: title, text, a checklist mode, auto-saved.

**Depends on:** 14 (cards, `CardShell`, rows), 15 (Create modal, for reference only). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | The map's image is the existing **placeholder art** (the grid + pin preview in `MapCard`), now filling the **whole card**. A real image field comes later | User |
| D2 | The name sits **bottom centred** over the image, on a bottom gradient so it stays readable | User |
| D3 | On **hover / keyboard focus** (and while the ⋯ menu is open) show: a dim layer, a centred **Open** label, the checkbox (top left), zoom + ⋯ (top right: zoom on the left, ⋯ on the right). Nothing else shows at rest | User |
| D4 | **Open** goes to the map's page (`open(single({type:'map', id}))`, today's `MapPanel` placeholder, "under construction") | User |
| D5 | **Click anywhere on the card opens it**, except the three buttons (they `stopPropagation`, like the existing ⋯ wrapper). Drag still works (the card keeps `useObjectDrag`) | User |
| D6 | **Zoom** opens a `Modal` with just the map's picture, large. It does not open the map page nor a panel | User |
| D7 | **Select checkbox is visual only**: selected state (checked box, accent ring) kept in a small store; no bulk actions yet | User |
| D8 | **Note modal** opens when a **note card** is clicked (instead of opening a panel). Features: borderless **title** and **text**, a **checklist mode** toggle, auto-save on close. Opening the note elsewhere (sidebar, panes) is unchanged | User |
| D9 | Only **map cards** get the new look; other kinds keep theirs (and their ♡ likes). The map card drops the ♡ and the subtitle (project / links) | Default |
| D10 | Select state is **per page load**, not persisted, and shared by key (`object id`) so other card kinds can adopt it later | Default |
| D11 | Note modal saves **as you type** (debounced ~300ms) and on close, so there is no Save button; Esc and the Close button both close. Empty title **and** empty text/items on close keeps the note (no auto-delete) | Default |
| D12 | **Checklist** is a mode of a note: items `{id, text, done}`. Converting text → checklist splits lines into items; back joins them. Checked items sink under a "Completed" divider like Keep | Default |

## 1 — Risks

1. **`CardShell` serves all kinds.** The map's hover chrome differs from the others (no ♡, no background padding,
   image fills the card). Add a `variant="media"` to `CardShell` rather than forking it, so drag, link node,
   rename and drop marks stay shared.
2. **Click vs. drag.** dnd-kit's sensor decides drag; the new buttons must stop pointer-down too, or pressing
   a button can start a drag. The ⋯ wrapper's `onClick` stop is not enough alone: check the sensor's activation
   distance in `features/drag/objectDrag`.
3. **Touch.** There is no hover on touch screens: the controls must be reachable (show them on `:focus-within`, and
   on touch tap show them first). Default: controls always visible below `(hover: none)`.
4. **Checklist data shape** is new (`MockObject.items`). It is mock-only now; the backend's `notes` resource
   (`backend/src/resources/notes`) is untouched, and this shape needs to be agreed before it syncs.

## 2 — Approach

```
mocks/projects.ts          MockObject + items?: ChecklistItem[]   (note checklist mode)
mocks/projectsStore.ts     updateNote(id, {name?, text?, items?}) · (no change to create/move)
features/select/           selectStore.ts (+test): toggle(id) · useSelected(id) · clear()
features/dashboard/cards/
  CardShell.tsx            variant 'media': image slot, hover layer, CardCheckbox, zoom, ⋯
  Cards.tsx                MapCard → media variant; NoteCard onOpen → note modal
  MapZoomModal.tsx         the picture in a Modal (size lg)
features/notes/
  NoteModal.tsx            Keep-style dialog (title, text/checklist, close)
  ChecklistEditor.tsx      items: check, edit, add, delete, completed section (+ pure helpers)
  checklist.ts (+test)     textToItems / itemsToText / sortItems (pure)
```

Open state: `DashboardSections` holds `noteId` (like it holds `created` and `note`) and renders one
`<NoteModal>`; the map zoom state lives in the map card (one `Modal` per card).

## 3 — Map card (`cards/Cards.tsx`, `cards/CardShell.tsx`)

- `CardShell` gets `variant?: 'media'`. In that variant: no padding, `overflow-hidden`; `children(name)` renders the
  image layer; the shell adds, all `absolute`:
  - **dim layer** `inset-0 bg-black/35` using the existing `ON_HOVER` classes;
  - **name** `inset-x-0 bottom-0 px-3 pb-2 pt-8 text-center` on `bg-gradient-to-t from-black/60`, text white; during
    rename the input replaces it (keep the `renaming` path);
  - **Open** centred `inset-0 grid place-items-center`, `pointer-events-none` (the click is the card's own `onOpen`);
  - **checkbox** `start-2 top-2`: a real `<input type="checkbox">` styled as a rounded square (or `IconButton` with
    `LuSquare` / `LuSquareCheck`); `aria-label="Select <name>"`; stays visible when selected;
  - **top right group** `end-2 top-2 flex gap-1`: zoom `IconButton` (`LuMaximize2`, label "View image") then the
    existing `TreeMenu`. The group and the checkbox each wrap in `onClick`/`onPointerDown` `stopPropagation`.
- The ♡ and the `DropIcon` link node stay for other kinds; for the media variant the link node stays top left only
  when a note is being dragged (it replaces the checkbox then; same slot as today's `DropIcon`).
- `MapCard`: image = today's `preview` style on a `size-full` div (pin larger, `size-10`); passes `variant="media"`.
- Selected: `ring-2 ring-accent` on the card, checkbox shown and checked.
- `MapZoomModal`: `Modal size="lg" title={object.name}`; the same preview at a large aspect (`aspect-video`).
  Reuse a shared `MapPreview` component (extracted from `MapCard`) so both look the same.

## 4 — Selection store (`features/select/selectStore.ts`)

Same `useSyncExternalStore` pattern as `mocks/projectsStore.ts`: a `Set<string>`, `toggleSelected(id)`,
`clearSelected()`, `useSelected(id)`. Pure and tested (toggle on/off, clear, subscribers notified once).
Esc on the Dashboard clears the selection (small `useEffect` in `DashboardSections`).

## 5 — Note modal (`features/notes/NoteModal.tsx`)

Built on `Modal`, with these changes to it so Keep's look is possible without a second dialog component:
`Modal` gets `bare?: boolean` — hides the header and gives the content no padding; the dialog stays
(top layer, Esc, backdrop click). Default `false` keeps every other modal unchanged.

Layout (Keep-like, `size="md"`, background `bg-note` like the note card):
- **Title:** borderless `<input>` (`text-heading`, placeholder "Title"), `data-autofocus`.
- **Body:** borderless auto-growing `<textarea>` (placeholder "Take a note…") **or** the checklist.
- **Bottom bar:** left, an icon toggle **Checklist** (`LuListChecks`, "Show checkboxes" / "Hide checkboxes");
  right, a text **Close** button. Last-edited date as small text. No other buttons.
- **Checklist:** each item `[checkbox] [text input] [× on hover]`; Enter adds an item below, Backspace on an empty
  item removes it; a trailing "+ List item" row; ticked items move under a "n Completed items" divider.
- **Saving:** `updateNote(id, patch)` on change (debounced), flushed on close. Closing = Esc, Close, backdrop.
- Opening: `NoteCard` and the Notes row call `onOpenNote(id)`; only notes (not articles) use the modal. Articles keep
  opening their panel.

## 6 — Data (`mocks/`)

- `ChecklistItem = { id: string; text: string; done: boolean }`; `MockObject.items?: ChecklistItem[]`. A note is in
  checklist mode when `items` is defined (empty array = an empty list).
- `updateNote(id, patch)` in `projectsStore.ts`: merges `name`, `text`, `items`, notifies; `checklist.ts` converts
  between `text` and `items` when the mode toggles (text is kept in sync, so search and `NoteCard`'s preview keep
  working: `NoteCard` shows `itemsToText(items)` for checklists).
- No change to the seed except one checklist note, so it shows up in the row.

## Testing

- **Unit (vitest, like `treeDrop.test.ts`):** `selectStore` (toggle, clear, notify), `checklist.ts`
  (text↔items, ordering of done items, blank lines), `updateNote` (merge, unknown id).
- **Manual, in the app** (`npm run dev` in `app/`): hover map card shows the layer, Open, checkbox, zoom, ⋯; click on
  the card opens the map panel; click on each button does **not**; drag a map card still reorders/moves; zoom
  modal shows the picture and closes with Esc; select ring; touch width (devtools) shows controls; dark theme;
  note card opens the modal, typing saves, checklist toggle round-trips, Esc closes, other modals unchanged
  (the `bare` default).
- Limits: no real images and no backend yet, so nothing external is called.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Selection store + test | `features/select/selectStore.ts`, `selectStore.test.ts` |
| 2 | `CardShell` media variant (hover layer, name, Open, checkbox, zoom slot, ⋯) | `cards/CardShell.tsx` |
| 3 | Extract `MapPreview`; `MapCard` uses the media variant + selected ring | `cards/Cards.tsx`, `cards/MapPreview.tsx` |
| 4 | `MapZoomModal` wired to the zoom button | `cards/MapZoomModal.tsx`, `cards/Cards.tsx` |
| 5 | Check drag sensor vs. the new buttons (stop pointer-down) | `features/drag/objectDrag.ts` (read first), `CardShell.tsx` |
| 6 | `Modal` `bare` option (default off) | `components/ui/overlays/Modal.tsx` |
| 7 | Checklist data + helpers + test; `updateNote` | `mocks/projects.ts`, `mocks/projectsStore.ts`, `features/notes/checklist.ts`, `checklist.test.ts` |
| 8 | `ChecklistEditor` and `NoteModal` | `features/notes/ChecklistEditor.tsx`, `NoteModal.tsx` |
| 9 | Notes open the modal from the Dashboard (note state, Esc clears selection) | `features/dashboard/DashboardSections.tsx`, `cards/Cards.tsx` |
| 10 | Manual pass (see Testing), light and dark | — |

Files **not** touched: `backend/`, `app/src-tauri/`, `routes/index.tsx`, the sidebar, `MapPanel` (stays the "under
construction" page), the other card kinds' looks, `src/styles/*` tokens (reuse `bg-note`, `--card-radius`).

## Open items

- Should the **Notes row's** other open paths (Notes page, search results) also use the modal? Default here: **no**,
  only Dashboard note cards.
- The checkbox does nothing yet: when bulk actions are wanted (delete, move, link), that is a follow-up plan.
