# 29 — Draft cards, a Folder look, and click-outside for drafts

**Goal:** the Dashboard's Add button for a Folder or an Object card puts a **draft card** at the start of the row: the card's real look
(whatever its resource uses), blurred, with a floating title input and floating Cancel / Create buttons over it. Create un-blurs the
card, the title input turns into the card's real title and the buttons slide away. Clicking outside a draft decides for you
(nothing typed: it disappears; something typed: it is created). The Note / Article modal and the floating Create frame get the same
click-outside rule, with one difference: **only a title, no text → ask first** (big Cancel / Create under a question). Only drafts do
this: opening an already created object (`ResourceModal`) never does. Folders get a new card look (title on top, a 2×2 grid of tiles).
**Depends on:** the uncommitted work of this session (`DraftCard.tsx`, `ResourceCreateDialog.tsx`, `CreateModal.tsx`, `CreateFab.tsx`,
`PanelFrame.tsx`, `TitleTextFields.tsx`), 27 (positions: a draft is made with `positionAtStart`).
**Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **A draft is a type of card, not a look.** `DraftCard` renders the resource's own face (plain / image / map / folder) with an empty item, blurred, and adds the floating parts over it. Any resource with a look can be drafted | User |
| D2 | **New `folder` card look** (the sent image): a rounded grey panel, the title at the top left, a 2×2 grid of tiles. It is the look of **all** Folder cards in the rows, not only drafts | User |
| D3 | **The 4 tiles show the folder's first 4 contents** (a small preview each: a map's `MapPreview`, otherwise the resource's icon and title); a tile with nothing in it is an empty darker square (a new folder: 4 empty tiles) | User |
| D4 | **Card draft, click outside:** title empty → the draft disappears, nothing is created; title typed → it is created. No question on cards | User |
| D5 | **Modal draft, click outside:** nothing typed → it closes, nothing created; title **and** text, or **only text** → created at once; **only a title** → the question (D6) | User |
| D6 | **The question** replaces the modal's footer: a line of text ("Create this note?") above bigger Cancel and Create buttons. Only in drafts | User |
| D7 | **The floating Create frame follows D5 and D6 too** (today a click outside does nothing there) | User |
| D8 | **Only drafts.** `ResourceModal` (an existing item) keeps its autosave and closes as it does now. The click-outside rule lives in the draft components only | User |
| D9 | **Cancel in the question discards the draft** and closes; to keep editing the user clicks back inside (the question goes away). Esc and the X always discard, without a question (a deliberate action) | Default |
| D10 | **Only text, no title** is created with an empty title (the card / row show `ui.untitled`, "Untitled note"). The Create button of the modal then needs a title **or** text (as the floating Create already does), instead of a title only | Default |
| D11 | **The decision is one pure function** (`draftOutcome`, §2) so the three places can't drift, and it is tested | Default |
| D12 | **Click outside = a `pointerdown` outside the draft** (the same way `QuickCreate` folds), not a blur: a click on the draft's own buttons, the menu of the editor's toolbar or a file dialog never counts as outside | Default |

## 1 — Risks

1. **The `<dialog>` backdrop.** `Modal` calls `onClose` for Esc, the X and the backdrop alike. D9 needs to tell the backdrop apart
   (Esc/X discard, the backdrop decides). Fix: a new optional prop `onOutside` on `Modal` (§4), default `onClose`, so no other
   modal changes.
2. **Two cards for a moment.** When Create resolves, the list store puts the real card in the row while the draft is still
   animating. Fix: the row hides that id until the draft reports `onSettled` (§3).
3. **Moving the title input onto the card's title** needs its target's position. The face marks its title with `data-card-title`;
   the draft measures it (the same measure-then-animate way as `blockFlip.ts`). With `prefers-reduced-motion` it just swaps.
4. **The Create frame** is not a `Modal`: its outside click is a `document` `pointerdown` in `CreateFab`, which must ignore the
   "Created …" note and the frame itself (`#create-modal`).
5. **Folder tiles need the folder's children**, which `DashboardSections` has (`kids.lists`) but `ItemCard` doesn't get. Passing them
   down is the only new data flow (§5); nothing new is fetched.

## 2 — Approach

```
Add (Folder / Object card)                   Add (Note / Article)       floating Create
  └ DraftCard(resource, initial)               └ ResourceCreateDialog     └ CreateFab → CreateModal
      face = cardFaces[resource.ui.card]           Modal(onOutside)           document pointerdown
      blurred; floating title + buttons            draftOutcome(title,text)   draftOutcome(title,text)
      outside → draftOutcome(title, '', card)      'ask' → <DraftAsk/>        'ask' → <DraftAsk/>
```

`features/create/draftOutcome.ts` (new, pure):

```ts
export type Outcome = 'discard' | 'create' | 'ask'
/** What a click outside a draft does. `ask`: a modal draft with only a title. Cards never ask (they have no text) */
export function draftOutcome(title: string, text: string, { askOnTitleOnly }: { askOnTitleOnly: boolean }): Outcome
```

Rules: `title.trim() === '' && text === ''` → `discard`; `askOnTitleOnly` and a title with no text → `ask`; else `create`
(text is the rich-text HTML, `''` when it has no words, as `TitleTextFields` gives it).

## 3 — Draft card (`features/dashboard`)

- **`cards/cardFaces.tsx` (new):** the four faces now inside `ResourceCard` (`map`, `image`, plain, and the new `folder`) move here
  as `<CardFace look resource item title … />`: only what is inside the box (picture, title button, date, text). `ResourceCard`
  keeps the drag, drop bar, ⋯ menu and zoom and renders `CardFace`. No visual change for the existing looks. The title element of
  each face gets `data-card-title`.
- **`DraftCard.tsx` (rewritten):** renders `CardFace` for `resource.ui.card ?? 'plain'` with `item = { id: 'draft', [titleField]: '' }`,
  inside a wrapper with `blur-sm` and `pointer-events-none` (the blur is on the face, not on the floating parts). Over it, absolutely
  placed: the **title input** (`TitleInput size="md"`, centred) and, at the bottom edge, **Cancel** (`ghost`) and **Create**
  (`plain`) with `gap-base`. They float over the card (a shadow, a `surface` background), not inside its box.
- **Settling (Create pressed):** a `phase` state `editing → saving → settling → done`.
  1. `saving`: the buttons are disabled, the input stays. The error (if any) shows and the draft stays (`editing`).
  2. `settling` (the item exists): the blur goes 8px → 0 (`transition-[filter] 300ms`); the input is moved and scaled onto the
     measured rect of `[data-card-title]` (a CSS transform transition, 300ms, same easing as the Create frame) while it fades into
     the face's own title (which is shown at the same moment); the buttons slide down (`translateY(100%)`, opacity 0, 200ms).
  3. `done` (transitionend, or a 400ms timeout as a fallback): `onSettled(id)` → the row removes the draft and stops hiding the real card.
  With `prefers-reduced-motion` the phases collapse to `done` at once.
- **Click outside:** a `pointerdown` listener on `document` while editing; outside the card → `draftOutcome(title, '', { askOnTitleOnly: false })`:
  `discard` → `onDone()`, `create` → the same `create()` as the button. Esc and Cancel → `onDone()`.
- **`DashboardSections.tsx`:** keeps `drafts`; adds `settling: Set<string>` of ids to hide (`opacity-0`) from `cards` until
  `onSettled`. `DraftCard`'s `onCreated(id)` fills it. `DRAFTED` stays the list of what is drafted.

## 4 — Modal drafts

- **`Modal.tsx`:** optional `onOutside?: () => void`, called instead of `onClose` for the backdrop click only. Everything else
  unchanged (additive, no other caller passes it).
- **`ResourceCreateDialog.tsx`:** passes `onOutside`. It computes `draftOutcome(title, body, { askOnTitleOnly: true })`: `discard` →
  `onClose()`; `create` → `submit` path (needs D10: `valid` = title **or** text); `ask` → `asking = true`.
- **`features/create/DraftAsk.tsx` (new):** the question: a line of text above two bigger buttons (`size="lg"`: Cancel `ghost`,
  Create primary), replacing the footer while `asking` (the form stays visible above it, dimmed). Props:
  `{ label: string; busy; onCancel; onCreate }`. Cancel → discard and close (D9). A click back inside the form sets `asking = false`.
  Used by both modal drafts.
- **`CreateFab.tsx` / `CreateModal.tsx`:** `CreateModal` reports its draft up (`title`, `text`, an `asking` state, `create`) so the
  `document` `pointerdown` in `CreateFab` (outside `#create-modal` and the "Created …" note) can call `draftOutcome` and either
  `hide()`, `create()` or show `DraftAsk` in the modal's footer in place of Create / Cancel. `onKeyDown` Esc keeps discarding.

## 5 — The Folder look (`card: 'folder'`)

- **`resources/types.ts`, `resources/resources.config.ts`:** `card?: 'plain' | 'image' | 'map' | 'folder'`; `folders` gets `card: 'folder'`.
- **`cards/FolderFace.tsx` (new):** the box: `bg-surface-muted`, rounded like the other cards, the title at the top left (the
  `data-card-title` element, plain text like the image), under it a `grid grid-cols-2 gap-2` of 4 `FolderTile`s. A tile with an entry
  shows its preview (`MapPreview` for `card: 'map'`, else the resource's icon centred on `surface`); without one, an empty
  `bg-fg/10` rounded square, as in the image.
- **Data:** `DashboardSections` builds `groupByParent` (existing, `tree.ts`) once from the entries it already has, sorts each
  folder's list with `compareEntries`, and passes `contents = byParent.get('folders:<id>')?.slice(0, 4)` to `ItemCard` →
  `ResourceCard` → `CardFace`. Folders in the Orphans row and inside projects work the same. Nothing new is fetched.

## 6 — Testing

- **`draftOutcome.test.ts`:** every row of the D4 / D5 table (empty, whitespace title, only text, only title, both; cards never ask).
- **`tree.test.ts`** already covers `groupByParent`; add the "first 4 of a folder, in `compareEntries` order" case next to the new helper.
- **`buttons.test.ts`** must still pass: `DraftAsk` uses `Button` only, no `ui-btn` classes and no `bg-`/`px-` on a button's `className`.
- **By hand** (animations can't be unit-tested): a draft in the Orphans row and in a project row, for a Folder and an Object card; a
  click outside empty / typed; Create's un-blur and title move; no two cards at the end; reduced motion; the Note modal with
  nothing / only a title / only text / both and a backdrop click; the same in the floating Create frame; `ResourceModal` on an
  existing note never asks and never creates anything on a backdrop click. `npx tsc --noEmit -p tsconfig.app.json` and `npx vitest run`.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `draftOutcome` + its test | `features/create/draftOutcome.ts`, `.test.ts` |
| 2 | Move the card faces out of `ResourceCard` into `CardFace` (no visual change), add `data-card-title` | `features/dashboard/cards/cardFaces.tsx`, `ResourceCard.tsx` |
| 3 | `folder` look: type, config, `FolderFace`, contents passed down | `resources/types.ts`, `resources.config.ts`, `cards/FolderFace.tsx`, `ItemCard.tsx`, `DashboardSections.tsx` |
| 4 | `DraftCard`: face + blur + floating title and buttons, click outside | `features/dashboard/DraftCard.tsx` |
| 5 | Settling animation, `onSettled`, hiding the real card meanwhile | `DraftCard.tsx`, `DashboardSections.tsx` |
| 6 | `Modal` `onOutside` prop | `components/ui/overlays/Modal.tsx` |
| 7 | `DraftAsk` (the question, bigger buttons) | `features/create/DraftAsk.tsx` |
| 8 | Note / Article modal: outside rule, `valid` = title or text, the question | `components/ui/resource/ResourceCreateDialog.tsx` |
| 9 | Floating Create frame: outside rule, the question | `features/create/CreateFab.tsx`, `CreateModal.tsx` |
| 10 | Typecheck, tests, the by-hand pass | — |

Files **not** touched: `ResourceModal.tsx` and `ResourceEditor.tsx` (existing objects), `backend/`, `packages/shared`, the buttons' CSS
(`styles/buttons.css`).

## Open items

- The exact look of a tile for notes and articles (icon + title is the default, D3) — say if you want a text snippet instead.
- D9: Cancel in the question discards what was typed. Say if Cancel should instead go back to editing.
