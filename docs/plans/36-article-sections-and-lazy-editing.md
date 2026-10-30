# 36 — Article sections, editing on click and a fixed edit bar

**Goal:** the article's text is shown as plain HTML until an editor clicks it; only then does a TipTap editor open, over the whole text
when it is small, or over a window of sections around the click when it is big (the rest stays static, looking exactly the same). The
text is made of **sections** (its top-level blocks): each has a ⠿ handle on hover to drag it, and new ones come from one grouped
catalogue (paragraph kinds, lists, cards, rows, media…) opened by the toolbar's Add section or by typing `/`. The edit bar is always in
place above the text (nothing pushes the text down); the links row floats, under the bar while words are selected, or above the caret's
row when `@` is typed.
**Depends on:** 30 (article page), 31 (links), 32 (toolbar), 34 (messages), 35 (autolinkers).
**Not in this plan:** collaborative editing, virtualising the window itself, new link kinds, any server endpoint (only the shared sanitizer changes).

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | The text is static HTML until clicked; the editor opens on click, not by default |
| U2 | A big text opens only a **window** of sections around the click: more than **60 sections or 30,000 characters** of HTML → the clicked section **±25 sections**; it moves when the caret nears its edge. A smaller text opens whole |
| U3 | Cards, rows (columns side by side) and callouts are **new HTML the server keeps**, through a strict allowlist in `packages/shared/src/sanitize-html.ts` (like the checklist's), with tests |
| U4 | The faint hint **"Type / for sections and @ for links"** shows in the **empty row the caret is on** (and disappears with the first letter) |
| U5 | The edit bar is always shown to editors; its **X that hides the bar and the "Edit bar" button go**. The X now belongs to the **floating** links row (the one `@` opens above the text's row) and closes it. While the links row floats above the text it is **not** also shown under the bar |
| U6 | The links row is its own box, `gap-sm` (`--spacing-sm`) under the bar, shown **only while words are selected**. With nothing selected, row 2 gets a **"Link types"** button right of the Ω (Shade, background only on hover) that shows it |
| U7 | `/` opens the same section menu as Add section, **beside the text** (under the caret's row, never over it) |
| U8 | The ⠿ handle floats left of a section's first line on hover, is **not part of the editable HTML**, and drags the section |
| U9 | The section menu is grouped (paragraph kinds, lists, cards, rows…) |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **A section = one top-level block** of the document (a paragraph, a heading, a list, a table, a card, a row…). A heading does not take the paragraphs under it along | "Most of it is just paragraphs": each paragraph moves on its own, like Notion. Contents (`ContentsTree`) still groups by headings |
| P2 | **One source of truth: a headless ProseMirror document of the whole text** (`Node`, built with the editor's own schema, no view). The static parts are drawn from it; the editor holds only the window; every edit is written back into it at once | Positions, links, messages, jumps and find keep working on the whole text, with or without an editor; a headless doc of 100 KB is cheap, the view is what lags |
| P3 | **Readers get the static text too** (never an editor). Links, the hover card, messages, jump marks and Search work on the static text | Readers never type: the biggest saving; editors need the same before their first click anyway |
| P4 | Once opened, the editor **stays** until the page closes (it does not turn back into static text on blur); for a big text only its window moves | Opening and closing on every focus change would cost more than it saves and lose Undo |
| P5 | The caret lands **where the click was**: the editor is drawn at exactly the static text's place, so `view.posAtCoords(click)` finds it. A click on a link follows the link (as in the editor today) and does not start editing. Keyboard: the static text is focusable (Tab), Enter opens it at the start | Continuity (the user's "ensure continuity") |
| P6 | **Moving the window**: when the caret is within **5 sections** of the window's edge (and there is more text that way), the window is re-centred on the caret. Static and edited parts share the same wrapper and classes, so nothing moves on screen; the scroll is anchored on the caret's section | No visible seam |
| P7 | Things a window cannot hold: a **selection stops at the window's edge**; **Ctrl/⌘+A** selects the window (a second press selects all: the window grows to the whole text first); **Undo** is per window (moving it clears the history). Changes over the whole text (Autolinker apply/remove, the old messages' rewrite) go through the editor when the window covers it all, otherwise on the headless doc and the window is reloaded | The trade-off accepted with U2 |
| P8 | The edit bar is **in the page before the first click**, its buttons disabled (no editor yet), except **Add section**, which opens the editor at the end of the text and adds there | The bar keeps its height: clicking never pushes the text (U5) |
| P9 | Space is reserved for **rows 1 and 2** (what the ⋯ shows). The links row, the `/` menu, the `@` row and every popout are absolutely positioned: they never push the text | "Doesn't push the whole text below" |
| P10 | The ⋯ now opens and closes **row 2 only**; it no longer shows the links row with nothing selected (that is "Link types", U6). "Link types" toggles the links row docked under the bar; it stays while one of its popouts is open (as today) | One way to each thing |
| P11 | **`@` with nothing selected**: the floating links row opens above the caret's row; the chosen target is **inserted as linked words** at the `@` (an article's / object's title, a section's heading, a person's name, a URL as itself), replacing `@` and what was typed after it. **Message** is disabled there (it needs words already written). Esc, a click outside, or its X closes it and leaves the `@` as typed | A mention, as in other editors; the row's existing pickers are reused |
| P12 | `/` and `@` open their menus only at the start of a row or after a space; typing after them **filters** the menu (`/car` → Card, Card row); ↑ ↓ Enter pick, Esc closes and leaves the text as typed. Picking from `/` on an **empty** row turns that row into the section; on a row with words it adds the section **after** it | Typing a `/` in a date ("1/2") must stay a slash |
| P13 | The ⠿ also drags **static** sections (no editor needed). A drop inside the window is one editor transaction (Ctrl+Z undoes it); any other drop changes the headless doc and reloads the window | Drag works for an editor who hasn't clicked yet |
| P14 | **No new dependencies.** The handle, the drag and the `/` `@` triggers are written here (TipTap's Drag Handle and Suggestion packages are not installed); the drag uses pointer events, not dnd-kit (it moves blocks inside one text, not objects between panes) | Matches `linkExtensions.ts`; nothing to install |
| P15 | The section catalogue (§6) is **one list** used by Add section, `/` and the bottom "Add section" button; the old `addSection` behaviour (heading + empty paragraph) is its "Section" item | Reuse (the user's ask) |
| P16 | New blocks: `card` (a bordered box of blocks), `row` with 2 or 3 `column`s (blocks side by side; they stack under 480 px of text width), `callout` (a tinted box with a tone: `note`, `tip`, `warning`). A card can sit in a column; a row cannot be nested; a callout cannot hold a row | Small, strict allowlist (U3) |

## 1 — Risks and blockers

1. **Size of the change.** The editor is no longer always there: everything that reads `editor` on the article page (Contents, Messages,
   jump marks, hover card, Find, the old messages, the autolinkers' adopt / apply) moves to one `ArticleText` handle (§2). Do it in the
   order of the task list; each step leaves the page working.
2. **Find in static text** cannot use ProseMirror decorations. It uses the **CSS Custom Highlight API** (`CSS.highlights`) on the static
   DOM, and the editor's decorations inside the window. Supported by current Chromium, Firefox and WebKit (also WebKitGTK ≥ 2.44 in Tauri);
   where it is missing, the current match is still scrolled to and selected, only the other matches are not tinted.
3. **Windows and messages / jumps far away**: opening a message or a jump outside the window only scrolls the static text; Edit / Remove
   on it first moves the window there (`text.edit(pos)`).
4. **Sanitizer change** (U3): an article saved with cards on the new client and read by an older server build would lose the boxes (their
   text stays). Deploy the backend before (or with) the app.
5. **Floats.** The Info box floats at the text's top right; static parts and the editor must be plain block boxes (never `flow-root` or
   `display: flow-root`/`overflow` on them) so the text keeps flowing around it.

## 2 — Architecture

```
item.content (HTML) ──parse once──► fullDoc: PM Node (headless, articleSchema)  ◄── the one source of truth
                                       │
             ┌─────────────────────────┼──────────────────────────────┐
             ▼                         ▼                              ▼
   StaticBlocks [0, start)     window editor (TipTap)          StaticBlocks [end, n)
   (serialized once per         doc = blocks [start, end)       (same wrapper, same classes)
    block, memo by node)        onUpdate ─► replaceWindow(fullDoc, start, end, editor.doc.content)
                                       │
                         serialize(fullDoc) ─► onChange(html) ─► autosave (as today)

ArticleText handle (useArticleText) ─► ContentsTree, MessagesList, JumpGutter, LinkHoverCard, FindBar,
   { doc, editor, window, offset,        useLegacyMessages, adoptRules, AutolinkPanel, LinkRow, MessagePanel,
     edit(pos?), goTo(from, to),         SectionHandles
     domAt(pos), change(fn), subscribe }
```

- Full-document positions everywhere; `offset` (where the window starts in `fullDoc`) converts to and from the editor's positions.
- Small text: after the click the window is `[0, n)`, `offset` is 0, and the editor's doc equals `fullDoc`: the same as today.
- Static blocks are drawn with `DOMSerializer` from their node; PM nodes are immutable, so an unchanged block keeps its node and is
  not drawn again. Each top-level static element gets `data-section="<index>"` in the DOM only (the saved HTML comes from `fullDoc`,
  never from the DOM).

## 3 — The document model (pure) — `app/src/features/articles/text/articleDoc.ts`

| Function | Does |
|---|---|
| `articleSchema(extensions)` | `getSchema([...base, ...articleExtensions, ...linkExtensions])`, once (the same set `RichTextEditor` builds) |
| `parseArticle(html, schema)` / `serializeArticle(doc, schema)` | HTML ⇄ Node (PM `DOMParser` / `DOMSerializer`); `serializeArticle` matches `editor.getHTML()` |
| `isBig(doc, html)` | > `WINDOW.maxSections` (60) sections or > `WINDOW.maxChars` (30,000) |
| `windowAround(doc, index)` | `{ start, end }`, `index ± WINDOW.around` (25), clamped |
| `needsShift(window, caretIndex, n)` | within `WINDOW.edge` (5) of an edge with more text that way |
| `replaceWindow(doc, window, fragment)` | the new full doc (blocks before + fragment + blocks after) and the new `end` |
| `sectionStart(doc, index)` / `sectionAt(doc, pos)` | index ⇄ full position |
| `moveSection(doc, from, to)` | the doc with section `from` placed before `to` (pure, also used for the in-window transaction) |

`WINDOW` (the four numbers) is exported at the top: tune them there. Tests: `articleDoc.test.ts` (round trip of HTML, windows at both
ends, `replaceWindow` keeps the other blocks identical (same node objects), `moveSection` up / down / to the end / onto itself).

## 4 — The text area — `app/src/features/articles/text/`

```
text/
├── articleDoc.ts          §3
├── useArticleText.ts      the state (fullDoc, window, editor) and the ArticleText handle; open / shift / reload; onChange(html)
├── ArticleText.tsx        replaces RichTextField in ArticleBody: StaticBlocks · window editor · StaticBlocks, one wrapper (TEXT classes)
├── StaticBlocks.tsx       a range of sections as static HTML (memo per node); clicks → open at the point; link clicks → the link
├── staticLinks.ts         a static <a>'s link (fromHref) and its full range (linkRanges of its section); one handler for clicks and hover
├── SectionHandles.tsx     the ⠿ overlay and the drop line (§8)
└── sectionDrag.ts         pure: the drop index from the pointer's y and the sections' rects (+ test)
```

- `ArticleText` is used by `ArticleBody` instead of `RichTextField` (the field stays as it is for notes). The TEXT classes move from
  `RichTextField.tsx` to an exported `RICH_TEXT_CLASSES` there, so both use the same look (one source).
- `RichTextEditor` gets two small options, reusable by any caller: `placeholder` may be a function `(ctx) => string` (§7, the hint), and
  `onEditor` is unchanged. Nothing else in it changes.
- `useArticleText` keeps `editor` in state as today (`setEditor` in `ArticlePage` becomes this hook's); `ArticlePage` gets `text` instead of
  `editor` and passes it down.
- `RICH_TEXT_MAX` keeps applying to the whole text: the check moves from `RichTextField.onUpdate` to `useArticleText` (on the serialized `fullDoc`).

### Moving the features to the handle

| File | Today | After |
|---|---|---|
| `side/ContentsTree.tsx`, `contentsTree.ts` | `editor.view.dom` headings, `editor.on('update')` | `text.doc` headings, `text.domAt` for the one being read, `text.subscribe` |
| `side/MessagesList.tsx` (`useMessages`) | the editor's doc | `text.doc`; Open → `text.goTo`, Edit → `text.edit(pos)` then select |
| `links/JumpGutter.tsx` | editor coordinates | `text.domAt(pos).getBoundingClientRect()` (static or editor) |
| `links/LinkHoverCard.tsx` | listens on `editor.view.dom` | listens on the `ArticleText` wrapper (static and editor parts); the range from `staticLinks.ts` or `linkAt` |
| `links/linkExtensions.ts` | `handleClick` opens links | the click logic is one exported `openLinkAt(href, handlers)`, used by the plugin and by `StaticBlocks` |
| `links/FindBar.tsx`, `find.ts` | decorations | matches on `text.doc`; decorations in the window, `CSS.highlights` in static parts (risk 2) |
| `messages/useLegacyMessages.ts`, `autolink.ts` (`adoptRules`, `applyRule`, `removeRule`) | `editor.state` / dispatch | `text.doc` to read, `text.change(fn)` to write (P7) |
| `ArticlePanel.tsx` (`openMessage`, `hoverMessage`, `handlers.onOpen` jump, MessagePanel Edit / Remove) | `editor` | `text` |

## 5 — The edit bar — `ArticlePanel.tsx`, `ArticleToolbar.tsx`, `links/LinkRow.tsx`

- **Always there for editors** (P8): `ArticleToolbar` no longer returns `null` without an editor; with `editor === null` it renders the same
  rows with the buttons disabled (one `disabled` derived from `!editor`, passed to `ToolButton`, `TextButton`, the dropdowns). Add section
  stays enabled (P8).
- **Removed**: `barShown`, the bar's X (`Close the edit bar`), the "Edit bar" button, the `onClose` prop.
- **The sticky wrapper** (`ArticlePanel` `toolbar=`) becomes `relative`: rows 1–2 are in flow (their height is the reserved space, P9);
  the links row is placed `absolute top-full mt-sm` (its own bordered box, `gap-sm` from the bar, U6), over the text, `z-20`.
- **`lastRow` is replaced** by two places for the same `LinkRow`: `docked` (under the bar: words selected, or "Link types" pressed, or one
  of its popouts open) and `floating` (from `@`, P11). `LinkRow` gets `placement: 'docked' | 'floating'`, `onClose` (the X, floating only)
  and `insertAt?: { from, to }` (the `@…` range: pickers insert linked words there instead of linking a selection). It is rendered in one
  place at a time (U5). `expanded` is replaced by `shown` (the page decides).
- **"Link types"** (row 2, right of the Ω box, U6): `<Button variant="ghost" size="sm" plain icon={LuLink}>Link types</Button>`
  (`aria-pressed` while the docked row is shown). Only while nothing is selected (with words selected the row is shown anyway).
- **Add section** in row 2 becomes the section menu's trigger (`BarPopover` + `SectionMenu`, §6), as does the button under the last row.
- The ⋯ (`onSecondRowChange`) only toggles row 2 (P10).
- `toolbarLevel.ts`: the new "Link types" button is counted in row 2's widths; check `LEVEL_WIDTHS` still fit (`toolbarLevel.test.ts`).

## 6 — Sections: the catalogue and the new blocks

### Catalogue — `app/src/features/articles/sections/sectionTypes.ts`

One typed list; each item: `{ id, label, group, icon, keywords, hint?, make(editor, at, mode) }` where `mode` is `'replace'` (an empty row)
or `'after'`. Groups, in this order:

| Group | Items |
|---|---|
| Text | Paragraph · Heading 1 · Heading 2 · Heading 3 · Section (heading + paragraph: today's `addSection`) |
| Paragraph kinds | Quote · Callout: note · Callout: tip · Callout: warning · Code block |
| Lists | Bulleted list · Numbered list · Checklist |
| Cards | Card · Card row (2) · Card row (3) |
| Rows | Two columns · Three columns · Divider |
| Media and data | Image (the upload picker) · Table (3×3) |
| Article | Sources (`addSource`) |

- `filterSections(query)` (pure, accents and case ignored, label and keywords) + `sectionTypes.test.ts` (every item has a unique id, a
  known group; filtering `car` → the Cards group).
- `addSection` / `addSource` stay in `components/ui/editors/articleExtensions.ts` and are called by their items.

### Menu — `app/src/features/articles/sections/SectionMenu.tsx`

A grouped list with group headings (the `DROPDOWN_ITEM` look of `overlays/Dropdown.tsx`), an optional filter (the `/` query), ↑ ↓ Enter,
"No sections match". Used inside `BarPopover` (Add section) and inside the `/` popout (§7). Its rows are menu items (the `buttons.test.ts`
`ALLOWED` list gets this file, with its count and the reason "menu items").

### New blocks — `app/src/components/ui/editors/blocks.ts`

TipTap nodes `Card`, `Row`, `Column`, `Callout` (P16), added to `articleExtensions`. HTML:

```html
<div data-type="card">…blocks…</div>
<div data-type="row" data-cols="2"><div data-type="column">…</div><div data-type="column">…</div></div>
<div data-type="callout" data-tone="tip">…blocks…</div>
```

- Commands: `insertCard`, `insertRow(cols, withCards)`, `insertCallout(tone)`; Backspace at the start of an empty card / callout unwraps it.
- Look: `app/src/styles/articleBlocks.css` (like `articleLinks.css`), read from the `data-*` attributes, so static text and editor look the
  same; columns stack with a container query under 480 px.
- **Server** (`packages/shared/src/sanitize-html.ts`, U3): `div` is kept only as one of these, at its place (row: top level only; column:
  only in a row, 2–3 per row; card: top level or in a column; callout: top level or in a column), with only `data-type`, `data-cols`
  (`2|3`) and `data-tone` (`note|tip|warning`). Same pattern as `isTaskTag`. Tests in `sanitize-html.test.ts`: each kept shape, a `div`
  with any other attribute or in any other place loses the tag and keeps its words, nested rows dropped.

## 7 — Typing helpers: the hint, `/` and `@`

- **Hint** (U4): the article's editor passes `placeholder={({ editor, node }) => editor.isEmpty ? fieldPlaceholder : node.type.name === 'paragraph' ? HINT : ''}`;
  TipTap's Placeholder already shows only on the caret's empty node (`showOnlyCurrent`). `HINT = 'Type / for sections and @ for links'`.
  Styled faint with the existing placeholder rule.
- **Triggers** — `app/src/components/ui/editors/typeTrigger.ts`: one small reusable TipTap extension, `TypeTrigger.configure({ char, onOpen, onQuery, onClose })`,
  a PM plugin that notices `char` typed at a row's start or after a space, follows what is typed after it, and ends on space-less
  Esc / caret leaving / a click away. It hands out `{ from, to, query, rect }` (the caret's `coordsAtPos`). Used twice in `ArticleText`
  (`/` and `@`). Pure part (`triggerMatch(textBefore, char)`) tested in `typeTrigger.test.ts`.
- **`/` popout**: `SectionMenu` with the query, in a `PopoutLayer` placed **under the caret's row** (`rect.bottom + spacing-sm`), flipping
  above when there is no room; it never covers the row (U7). Picking deletes `/query` and runs the item (P12).
- **`@` row**: `LinkRow placement="floating" insertAt={{from, to}}`, placed **above the caret's row** (`rect.top - height - spacing-sm`), with
  its X; picking inserts linked words (`insertArticleLink(editor, range, words, link)`, new in `linkExtensions.ts`, next to `setArticleLink`)
  (P11). While it is open the docked row is not shown (U5).

## 8 — The ⠿ handle and dragging — `text/SectionHandles.tsx`, `text/sectionDrag.ts`

- One overlay in the text box (`textBox` of `ArticleBody`, beside `JumpGutter`): on `pointermove` over the text it finds the section under
  the pointer (`[data-section]` in static parts, `editor.view.dom.children[i]` in the window), and shows a ⠿ (`LuGripVertical`) left of its
  **first line** (the first line's rect from a `Range` on its first text). It is a sibling of the text, never inside the contenteditable,
  and is not in the saved HTML (U8). The jump marks move a little further left so both fit.
- The handle is a drag handle (an `ALLOWED` entry in `buttons.test.ts`, reason "drag handle"), `aria-label="Move section"`, keyboard: Alt+↑ / Alt+↓
  moves the section under the caret (and the focused handle).
- Dragging (pointer capture): a ghost of the section follows the pointer (a scaled clone, `pointer-events: none`), a line shows where it
  will go (`dropIndex(y, rects)` from `sectionDrag.ts`); near the scroll container's edges it scrolls. Drop → `text.moveSection(from, to)`
  (P13). Readers have no handles.

## Testing

All local, no request to any server.
- Pure tests: `articleDoc.test.ts`, `sectionDrag.test.ts`, `sectionTypes.test.ts`, `typeTrigger.test.ts`, `sanitize-html.test.ts` (new shapes),
  `toolbarLevel.test.ts` (widths), `buttons.test.ts` (new `ALLOWED` entries), the existing `linkHref.test.ts` / `find.test.ts` /
  `contentsTree.test.ts` still pass after the move to `text.doc`.
- Checks: `npx tsc --noEmit && npx vitest run` in `packages/shared`; `npm run test --workspace app && npm run build --workspace app && npx oxlint src` in `app`.
- By hand (no component tests in the project): a small article (opens whole, caret where clicked, nothing moves); a big one (paste ~80
  paragraphs: only the window becomes editable, the seam is invisible, the window follows the caret, Ctrl+A twice); link click / hover /
  message / jump in static text as a reader (`?as=reader`); Find in both parts; the bar never moves the text (select words, press Link types,
  type `@`, type `/`); drag a static and an edited section; a card / row / callout saved and read back after a reload.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Document model + tests | `features/articles/text/articleDoc.ts`, `articleDoc.test.ts` |
| 2 | Shared text classes; `placeholder` as a function | `components/ui/fields/RichTextField.tsx`, `components/ui/editors/RichTextEditor.tsx` |
| 3 | `useArticleText` + `ArticleText` + `StaticBlocks` + `staticLinks`: static until click, whole editor on click (no window yet) | `features/articles/text/*`, `ArticlePanel.tsx` (`ArticleBody`) |
| 4 | Features on the handle: Contents, Messages, JumpGutter, hover card, link clicks, legacy messages, autolinkers | §4 table |
| 5 | Find on `text.doc`: decorations + `CSS.highlights` | `links/FindBar.tsx`, `links/find.ts`, `linkExtensions.ts` |
| 6 | The window: `isBig`, open around the click, shift, Ctrl+A, `change(fn)` reload | `text/useArticleText.ts`, `text/ArticleText.tsx` |
| 7 | Edit bar: always shown, disabled state, no X / Edit bar, docked links row absolute `mt-sm`, Link types, ⋯ only row 2 | `ArticleToolbar.tsx`, `ArticlePanel.tsx`, `links/LinkRow.tsx`, `toolbarLevel.ts` (+ test) |
| 8 | New blocks + sanitizer + styles | `components/ui/editors/blocks.ts`, `articleExtensions.ts`, `packages/shared/src/sanitize-html.ts` (+ test), `styles/articleBlocks.css` |
| 9 | Section catalogue + `SectionMenu`; Add section (row 2 and under the last row) opens it | `features/articles/sections/*`, `ArticleToolbar.tsx`, `ArticlePanel.tsx`, `buttons.test.ts` |
| 10 | `TypeTrigger`, the hint, the `/` popout, the `@` floating row, `insertArticleLink` | `components/ui/editors/typeTrigger.ts` (+ test), `text/ArticleText.tsx`, `links/LinkRow.tsx`, `links/linkExtensions.ts` |
| 11 | ⠿ handles and drag | `text/SectionHandles.tsx`, `text/sectionDrag.ts` (+ test), `links/JumpGutter.tsx` (offset), `buttons.test.ts` |
| 12 | Docs | `instructions/article-page.md` (text area, window, bar, sections), `instructions/article-links.md` (Link types, `@`, rows' places) |
| 13 | All checks of Testing | — |

Files **not** touched: the auth code (`backend/src/auth.ts`, `db/auth-schema.ts`, `middleware/auth.ts`, `app/src/lib/auth-client.ts`,
`features/auth/`), the backend's routes, migrations and `data.config.ts` (no new field: everything is in `content`), `RichTextField` for notes
(only its classes are exported), `docs/plans/01`–`35`. No package installed, no deploy, no request to the live server.

## Open items

1. U5 as understood: "the X hides the links row when it floats; while it floats above the text it is not shown under the bar too". Correct?
2. P1 (a section is one block, a heading doesn't drag its paragraphs) and P11 (what `@` inserts; Message disabled there) are the defaults most worth a look.
3. The window's numbers (60 sections / 30,000 characters / ±25 / edge 5) are guesses: tune after trying a real long article.
4. The plan is large; it can be split into three plans if you prefer (A: static text + window, tasks 1–6; B: bar, tasks 7; C: sections, tasks 8–11).
