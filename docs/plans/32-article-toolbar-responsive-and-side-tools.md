# 32 — Article: Save, a responsive toolbar, the Ω box, and the side tools (contents, zoom, messages, notes)

**Goal:** the article page gets a **Save** (to the user's saved list) whose place depends on whether they are its editor; a toolbar
that gets **narrower in steps** (align → one dropdown, Ω examples → one Ω button, colours → row 2, then as many rows as needed); cleaner
colour dropdowns and a few look fixes; a new **Ω box** whose examples are Word-like structures (xʸ, xᵧ, |x|, n!) with placeholders; a
**Contents** tree at the top left outside the article; and three **round buttons** on the body's left border: **Zoom** (the article fills
the window), **Messages** (the list of the article's messages) and **Notes** (the notes connected to it, and all the others below, with
open / edit / connect / disconnect / create / delete).
**Depends on:** 30 (the article page), 31 (links, messages, `jumpTargets`, the mock-store pattern).
**Blocks:** the backend plan for sharing (roles, saved list, note ↔ article connections on the server).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Save = put the article in my saved list** (a bookmark), the same for editor and reader. Mock store on this device (`savedStore.ts`), shaped for the API | User |
| D2 | **Editor**: Save is an item of the ⋯ menu (ticked when saved). **Not the editor**: a Save button **in Private / Public's place** (a reader can't change who sees it) | User |
| D3 | Ω examples are **structures with places in the text**, like Word's equations: the structure goes in with its first place selected, typing replaces it, **Tab** goes to the next place, **Shift+Tab** back; leaving the structure ends it. Written with the marks the server already keeps (`sup`, `sub`) | User |
| D4 | Ω's "some svgs" section = **shapes and icons as Unicode characters** (★ ☀ ⚑ ➜ ♥ …), shown in the list as small pictures. No new markup, no backend change | User |
| D5 | **Note ↔ article connections are a mock store** (`localStorage`, per article), shaped for the API. The notes themselves are real: open, edit, create and delete go through the notes' own API | User |
| D6 | **Zoom** = the article fills the window: it goes to the top layer over the panes, the navbar and the sidebar (which stay as they are underneath); the same button or Esc brings it back. Not the navbar's focus mode, no new page | User |
| D7 | The Notes element lists the **connected notes first, then all my other notes** (paged, with a search), each ready to connect | User |
| D8 | In the narrower toolbar states the colours move to row 2 and **show even when the ⋯ has row 2 hidden** (then row 2 shows only them) | User |
| D9 | **Who is the editor**: one seam `useArticleRole(item)` → `'editor' \| 'reader'`. Today every article the API returns is the user's own (`access: 'owner'`), so it answers `'editor'`; `?as=reader` in the URL shows the reader's page for testing. The sharing backend replaces it | Default |
| D10 | A reader's page differs only in D2 (Save instead of Private / Public) in this plan; a read-only editor for readers belongs to the sharing plan | Default |
| D11 | Toolbar states come from the **toolbar's own width** (a `ResizeObserver`; panes can be narrow on a wide screen), by a pure `toolbarLevel(width)` with fixed thresholds: ≥ 960 px full · 800–959 level 1 · 640–799 level 2 · < 640 level 3. Tuned by eye in the browser; the numbers live in one place | Default |
| D12 | Level 3 (mobile) = the rows **wrap**: as many rows as the width needs, groups never split | Default |
| D13 | Colour dropdowns (Underline, Border): **only the picker's own squares** (`COMMON_COLOURS`, under the palette in `ColourPicker`), no second list of squares. Underline keeps "Same as the text" as a plain option | Default |
| D14 | The number on the paragraph dropdowns' icons sits on a small **pill** (`bg-fill-strong`, rounded, 1px padding), like a badge | Default |
| D15 | Contents: a card **outside the bordered body, at the top left**, sticky while scrolling; the article's headings as a tree (levels nest, folds by section), the current section marked; click → `goTo`. Narrow pane (< 1024 px of page width): it becomes a button over the body's top left that opens the same tree as a popout | Default |
| D16 | Round buttons: a column, centred on the body's left border (half over the line), **sticky in the middle of the view**; Messages and Notes open their element in the left column **under Contents** (both can be open); Zoom toggles | Default |
| D17 | Round look = a new button modifier `.ui-btn-round` in `styles/buttons.css` + a `round` prop on `IconButton` (the button rules forbid `rounded` in `className`) | Default |

## 1 — Risks and blockers

1. **Placeholders across saves.** The structures' places live in editor state only (decorations), never in the HTML: after a reload a
   structure is plain text with `sup`/`sub`. That is fine (Word does the same once you leave the equation) and keeps the sanitizer as is.
2. **Zoom and pane transforms.** `position: fixed` breaks inside a transformed ancestor (pane glides, `paneFlip.ts`). Using the top layer
   (`popover="manual"` + `showPopover()` on the page's root) avoids it; popovers the page opens inside it (BarPopover, Dropdown) are
   also top layer and stack above it, the `<dialog>` modals too. Check the hover card and colour pickers while zoomed.
3. **Thresholds are guesses** until seen in a browser (D11): keep them in `toolbarLevel.ts` with a test, adjust once.
4. **buttons.test.ts**: no raw `<button>` added; the tree rows, notes rows and structure buttons are `Button` / `IconButton`.

## 2 — Approach

```
ArticlePanel
├─ left column (outside the body, sticky)          ← new: ArticleSide
│   ContentsTree            headings tree (jumpTargets) · current section
│   MessagesList            when its round button is on (linkRanges → msg links)
│   NotesPanel              when its round button is on (articleNotes store + notes API)
├─ body (bordered)
│   RoundTools  (on the left border, sticky, centred): Zoom · Messages · Notes
│   title line: … [Private/Public | Save (reader)] [Share] [⋯ … Info box · Search · Save (editor)]
│   ArticleToolbar — level from useToolbarLevel(width)
│     row 1 / row 2 / (level 3: wrapping)   ΩBox: examples | ▾  (level ≥ 1: just Ω ▾)
│   LinkRow (plan 31)
│   text (+ Structures extension: places, Tab)
```

## 3 — Save and the role (`features/articles/save/`, `ArticlePanel.tsx`)

- `savedStore.ts`: `{ panelKey, savedAt }[]` in `localStorage` (`map:saved`), `useSaved(key) → [saved, setSaved]`, `useSavedList()`; the
  same `useSyncExternalStore` pattern as `privacy/privacyStore.ts`.
- `useArticleRole.ts`: D9.
- Editor: `IconMenu` group with Info box / Search gets `{ label: saved ? 'Saved' : 'Save', icon: LuBookmark, checked: saved }`.
- Reader: `SaveButton.tsx` (`Button variant="ghost" size="sm" plain`, `LuBookmark` / `LuBookmarkCheck`, "Save" / "Saved") rendered
  instead of `PrivacyButton`. Share still follows the article's visibility.

## 4 — The responsive toolbar (`ArticleToolbar.tsx`)

- `toolbarLevel.ts` (pure, tested): `toolbarLevel(width): 0 | 1 | 2 | 3` (D11). `useToolbarLevel(ref)` with a `ResizeObserver` on the
  bar's root.
- **Level ≥ 1**: the four `ALIGNS` buttons → one `Dropdown` (`triggerIcon` = the current alignment, options = `ALIGNS`, like the List
  dropdown); the Ω box → one `Ω ▾` button opening the same popout (§6).
- **Level ≥ 2**: Text colour and Background `ColourField`s render in row 2 (start of the row, before Code). Row 2 shows when the ⋯ has it
  open **or** level ≥ 2 (then, with the ⋯ closed, only the colours; D8).
- **Level 3**: row 1 and row 2 get `flex-wrap` (row 1 is `flex-nowrap overflow-x-auto` today); each `Group` stays whole (`shrink-0`),
  so the rows break between groups into as many rows as needed. The ⋯ toggle stays on the bar's right edge.
- The link row (plan 31) is unchanged: it is already centred and wraps.

## 5 — Dropdown and button fixes (`ArticleToolbar.tsx`)

- **Underline**: options = `None` (removes the underline: `unsetUnderline`, checked when it is off), then Kind (as today), then
  "Same as the text" (a plain option); the `UNDERLINE_COLOURS` squares go; the `ColourPicker` in `extra` stays (its squares are the only ones).
- **Border**: the `BORDER_COLOURS` squares go; `extra` gets the `ColourPicker` (value = the border colour) like Underline's; a pick on a
  paragraph without a border gives it 1px (as today).
- **`Shown`** (the paragraph dropdowns' icon + number): the number gets the pill of D14.
- **Code**: its `TextButton` gets `filled` (background also when not hovered; the prop exists).

## 6 — The Ω box (`ArticleToolbar.tsx`, `MoreFormats.tsx`, `symbols.ts`, new `editors/structures.ts`)

- The box (`role="group"`, bordered as today): the four **example buttons**, a **border line**, then a **square** arrow button
  (`LuChevronDown`, `IconButton` square) that opens the popout. The examples are a little bigger: `IconButton size="md"` (today `sm`),
  each drawing its structure with dotted boxes for the places (a small inline SVG/HTML preview): `xʸ`, `xᵧ`, `|x|`, `n!`.
- Level ≥ 1 (D11): the box becomes one `IconButton` `LuOmega` with the arrow (the Ω only shows when no example does).
- **Structures** (`components/ui/editors/structures.ts`, added to `articleExtensions`):
  - `STRUCTURES`: `power` (base, `sup` exponent), `index` (base, `sub` index), `absolute` (`|`, value, `|`), `factorial` (value, `!`).
    Each is a list of parts: fixed text or a **place** with its placeholder (`x`, `y`, `n`) and mark.
  - `insertStructure(editor, kind)`: inserts the parts at the caret (with the selection, if any, as the first place's text), keeps the
    places' ranges in a plugin state (mapped through every transaction), selects the first place.
  - Keys: **Tab** / **Shift+Tab** select the next / previous place while the caret is in a structure; Enter or a click outside, or Tab
    after the last place, ends it (the caret goes after it). Places show a dotted box (`Decoration.inline`, class `article-place`) while
    the structure is being filled (`articleLinks.css` or a new `articleEditor.css`).
  - Pure helper `structureParts(kind, selectedText)` tested; the plugin's place-mapping tested on a doc (`features/articles/links/testing.ts`
    already builds docs; add `Superscript`/`Subscript` to its schema).
- **The popout** (`MoreFormats.tsx`) in four sections:
  1. **Basics**: the four structures (as above) + Superscript / Subscript toggles (as today).
  2. **SVGs** (D4): shapes and icons as characters, each shown big in its own tile: `★ ☆ ● ○ ■ □ ▲ △ ▼ ▽ ◆ ◇ ♥ ♦ ♣ ♠ ☀ ☁ ☂ ☎ ✉ ⚑ ⚐ ✓ ✔ ✗ ✘ ☐ ☑ ☒ ➜ ➔ ↻ ↺ ☮ ☯ ☠ ♪ ♫`.
  3. **Mathematical**: operators, relations, sets and logic, number sets, fractions, powers and indexes, Greek letters.
  4. **Others**: marks, quotes and dashes, arrows, currency, Latin letters, brackets.
  `symbols.ts` gets `SYMBOL_GROUPS: { title: 'Basics' | 'SVGs' | 'Mathematical' | 'Others'; sections: SymbolSection[] }[]` built from
  today's `SYMBOLS` (no character lost: a test checks every old character is in a group). `COMMON_SYMBOLS` goes (the examples are now
  structures).

## 7 — Contents (`features/articles/side/ContentsTree.tsx`)

- From `jumpTargets(doc)` (plan 31), headings only, nested by level (pure `contentsTree(targets)` → nodes with children, tested); read
  with `useEditorState` so it follows the text.
- Rows: `Button variant="ghost" size="sm"` (`LuHash` icon), indented per level; a section with subsections has an `IconButton` chevron to
  fold it. Click → `goTo(editor, …)` (linkExtensions.ts). The current section (the last heading above the view's top, from an
  `IntersectionObserver` on the heading elements) is `selected`.
- Empty: "Add sections with the toolbar's Section to see them here."
- Placement D15: `ArticlePanel` becomes a two-column grid when the page is ≥ 1024 px wide (`@container` on the page root): left column
  14rem (`ArticleSide`: sticky `top-0`, its own scroll), right the body as today. Narrower: a `LuListTree` `IconButton` at the body's
  top left opens the tree in a `BarPopover`.

## 8 — Round tools on the left border (`features/articles/side/RoundTools.tsx`)

- `IconButton round variant="secondary"` × 3, in a column, `absolute` on the body's left border (`-start-5`), inside a `sticky top-1/2`
  wrapper so they stay centred in view. In order: **Zoom** (`LuMaximize2` / `LuMinimize2`), **Messages** (`LuMessagesSquare`, a count
  badge), **Notes** (`LuStickyNote`, a count badge). Messages and Notes are `aria-pressed` toggles of their elements.
- `.ui-btn-round` (D17): `border-radius: 9999px` on the shade/stone look, square size; added to `buttons.css` and `instructions/buttons.md`.
- **Zoom** (D6): the page root (`ArticlePage`'s outer div) gets `popover="manual"`; on: `showPopover()` + the class `fixed inset-0 m-0
  size-full overflow-auto bg-surface` (the article centred as now, more room); off: `hidePopover()`. Esc closes it (not when a menu or
  modal handles Esc first: `defaultPrevented`). The button shows Minimize while on.

## 9 — Messages element (`features/articles/side/MessagesList.tsx`)

- The article's messages: `linkRanges(doc)` (docLinks.ts) of kind `msg`, in text order: title, the start of the content, the words
  they are on. Click → `goTo` the words and open the `MessagePanel` (the page's `setMessage`, as a click on the link does); an Edit
  `IconButton` opens the Message popout of the link row on it (`setLinkPopout('msg')`, as `MessagePanel`'s Edit). Empty state text.

## 10 — Notes element (`features/articles/side/NotesPanel.tsx`, `articleNotes.ts`)

- `articleNotes.ts` (D5): `{ [articleId]: noteIds[] }` in `localStorage` (`map:article-notes`), `useArticleNotes(articleId) →
  { ids, connect(id), disconnect(id) }`; ids of deleted notes are dropped when the list reads them as gone.
- **Connected** (top): each note by `useResourceItem(notes, id)`: title, preview; actions: **Open** (the note modal: `useItemModal().open`,
  where it is edited with its autosave), **Disconnect** (`LuUnlink`), **Delete** (`useResourceMenu(notes)`'s delete → its confirm dialog
  → Trash; then disconnected).
- **Create**: a small `TextField` "New note…" + `Button` Create → `useResourceActions(notes).create({ title })` → connected → opened in
  the modal. (Notes need a title or content: `requireOneOf`.)
- **Other notes** (below, D7): `useResourceList(notes, { limit: 20 })` minus the connected ones, a `SearchInput` filtering what is loaded
  (fold, like `ObjectPicker`), **Load more** (`LinkButton`) while `hasMore`; each row: **Connect** (`LuLink`), Open, Delete.
- Rows are `Button ghost` (title + preview) with `IconButton size="sm"` actions; no raw `<button>`.

## Testing

- Unit (`npm run test --workspace app`): `toolbarLevel` thresholds; `structureParts` and the places' mapping / Tab order on a doc;
  `SYMBOL_GROUPS` keeps every old character, one character each; `contentsTree` nesting (h2 → h3 → h2, a first h3 with no h2);
  `savedStore`, `articleNotes` (default, set, broken storage, deleted ids dropped); `buttons.test.ts` passes.
- Manual (`npm run dev`): resize a pane through the four toolbar states (aligns dropdown, Ω button, colours in row 2 with the ⋯ closed,
  wrapping on a phone width); Underline None and colours, Border colour, the number pills, Code's background; each structure with Tab
  and typing, and after a reload; the four sections of the popout; Contents follows edits and scroll; Zoom over panes, sidebar and
  navbar, with popouts and modals working inside; Messages list opens messages; Notes: create, open / edit in the modal, connect,
  disconnect, delete, search and load more; `?as=reader` shows Save in Private / Public's place; editor's ⋯ Save.
- `npm run build --workspace app`.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Role seam + saved store + Save (⋯ for the editor, button for the reader) | `features/articles/save/*`, `ArticlePanel.tsx` |
| 2 | Underline None / one list of squares; Border picker; number pills; Code filled | `ArticleToolbar.tsx` |
| 3 | `toolbarLevel` + hook + tests; level 1 (align dropdown), level 2 (colours to row 2, D8), level 3 (wrapping) | `features/articles/toolbarLevel.ts`, `ArticleToolbar.tsx` |
| 4 | Structures extension: parts, insert, places, Tab, decorations + tests | `components/ui/editors/structures.ts`, `articleExtensions.ts`, CSS |
| 5 | Ω box: examples (bigger) │ square arrow; Ω-only at level ≥ 1 | `ArticleToolbar.tsx` |
| 6 | Popout sections Basics / SVGs / Mathematical / Others; `SYMBOL_GROUPS` + test | `MoreFormats.tsx`, `SymbolPanel.tsx`, `symbols.ts`, `symbols.test.ts` |
| 7 | Page grid with the left column; `ContentsTree` + `contentsTree` test; narrow fallback | `ArticlePanel.tsx`, `features/articles/side/ContentsTree.tsx` |
| 8 | `.ui-btn-round` + `IconButton round`; `RoundTools`; Zoom (top layer) | `styles/buttons.css`, `IconButton.tsx`, `buttonStyles.ts`, `side/RoundTools.tsx`, `instructions/buttons.md` |
| 9 | `MessagesList` | `side/MessagesList.tsx` |
| 10 | `articleNotes` store + `NotesPanel` (connected, create, others, actions) | `side/articleNotes.ts`, `side/NotesPanel.tsx` |
| 11 | Docs: the side tools, Save / roles and the structures in `instructions/article-links.md` (or a new `article-page.md`) | `instructions/` |
| 12 | Tests, build, manual check | — |

Files **not** touched: `backend/`, `packages/shared/` (sanitizer, data config: structures use `sup`/`sub`, shapes are characters),
the navbar's focus mode (`features/focus/`), the note modal itself (`features/items/ItemModal.tsx`, only used), the link row's behaviour (plan 31).

## Open items

- The thresholds of D11, after seeing them in the browser.
- Readers: should their article be read-only (no toolbar, no editing) already now with `?as=reader`, or only with the sharing backend (D10)?
- Should the saved list show somewhere (a "Saved" section in the sidebar or the Dashboard), or is that a later plan?
