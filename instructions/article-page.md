# The article page: the text, sections, toolbar states, Ω structures, side tools, Save

What plans `docs/plans/32-article-toolbar-responsive-and-side-tools.md` and `docs/plans/36-article-sections-and-lazy-editing.md` added to the
article page. The links (the links row, `@`, Autolinker, Private / Public) are in `article-links.md`.

## Where things are

```
app/src/features/articles/
├── toolbarLevel.ts          the toolbar's narrow states, from its own width (LEVEL_WIDTHS: tune them here)
├── ArticleToolbar.tsx       uses the level: 1 aligns → a dropdown, Ω box → Ω; 2 colours → row 2 (even with the ⋯ closed); 3 rows wrap
├── StructureIcon.tsx        a structure drawn with dotted places (the Ω box's examples)
├── MoreFormats.tsx          the Ω popout: Basics · SVGs · Mathematical · Others (symbols.ts SYMBOL_GROUPS)
├── save/                    useArticleRole (editor / reader) · savedStore (the saved list) · SaveButton
├── side/                    ContentsTree (+ contentsTree.ts) · RoundTools · MessagesList · NotesPanel · articleNotes.ts
├── text/                    THE TEXT (plan 36):
│   ├── articleDoc.ts        pure: sections, windows (WINDOW: tune them here), moving a section
│   ├── articleText.ts       ArticleText: the whole document, the window, the editor; useArticleText · useTextState · useTextEditor
│   ├── ArticleText.tsx      the view: static parts · the window's editor · the `/` menu; the hint (SECTION_HINT)
│   ├── StaticSections.tsx   sections drawn as HTML without an editor
│   ├── staticDom.ts         a position ⇄ a point of the static HTML
│   └── SectionHandles.tsx   the ⠿ (+ sectionDrag.ts, pure)
├── sections/                sectionTypes.ts (THE list of section kinds, its groups, placeSection) · SectionMenu.tsx · useSectionMenu.ts
└── comments/                THE COMMENTS below the text (plan 37): CommentsSection · CommentCard · CommentModal · commentsStore
app/src/components/ui/editors/structures.ts   the Word-like structures: places, Tab / Shift+Tab, Enter ends
app/src/components/ui/editors/blocks.ts       Card, Row / Column, Callout (`<div data-type>`; the server's sanitizer keeps exactly these)
app/src/components/ui/editors/typeTrigger.ts  a character that opens a menu while typing (`/`, `@`)
app/src/components/ui/overlays/FloatingAt.tsx a box floating above or below a line of text (the `/` menu, the `@` row)
app/src/styles/articleBlocks.css              the look of cards, rows and callouts (editor and static text alike)
app/src/lib/localStore.ts    the mock stores' base: a JSON value on this device that screens watch
```

## The text (plan 36)

- **Static until clicked.** The text is drawn as plain HTML (`StaticSections`); an editor's click opens a TipTap editor at the click (or on
  the words selected). A reader's page never gets an editor. Before the first click the static text can take the focus: Enter opens it.
- **A window for a big text.** More than `WINDOW.maxSections` sections or `WINDOW.maxChars` characters (`articleDoc.ts`): only the clicked
  section ± `WINDOW.around` sections are in the editor, the rest stays static around it with the same look. The window moves when the caret
  is within `WINDOW.edge` sections of its end. A selection stops at the window's edge; Ctrl / ⌘ + A a second time puts the whole text in the
  editor; Undo is per window.
- **One source of truth**: `ArticleText` (`text/articleText.ts`) holds the whole document. Everything that reads or changes the text
  (Contents, Messages, jump marks, the hover card, Search, the Autolinker, the old messages) goes through it, in positions of the whole
  document: `text.doc()`, `useTextState(text, select)`, `text.goTo`, `text.rectAt`, `text.change(tr => …)`, `text.open(at)`.
- **Sections** are the top-level blocks. The ⠿ left of a section's first line drags it (a line shows where it goes) or, clicked, selects it;
  Alt + ↑ / ↓ moves the caret's section. The ⠿ is on the page only, never in the text.
- **New sections**: one list (`sections/sectionTypes.ts`, in groups: Text, Paragraph kinds, Lists, Cards, Rows, Media and data, Article), opened
  by the toolbar's Add section, by typing `/` at a row's start or after a space (filtered by what is typed after it; ↑ ↓ Enter, Esc), and by
  the button under the last row. An empty row becomes the section; otherwise it goes after the caret's section. A row of columns always goes
  at the top of the text. A new kind: one entry there (and, if it is new markup, its node in `blocks.ts` and its rule in the server's sanitizer).
- **The hint** "Type / for sections and @ for links" shows faintly on the empty row the caret is on.

## Comments (plan 37)

Below the text, in every view (owner, editors, readers, public articles), like social-media posts: every reader writes them. They are
not the messages (those are on words, in the text, written by editors).

- **Read one level at a time, only when asked for:** the top comments (newest first, 20 a page) when the section comes near the screen
  (an `IntersectionObserver`); a comment's replies (oldest first) when its "Show 3 replies" is pressed. Opening an article without
  scrolling to them costs no request. Writes put the server's answer into `commentsStore`: nothing is read again.
- **Nested up to 5 levels** (`COMMENT_DEPTH`). A reply to a level-5 comment goes beside it (under its parent), starting with `@name`.
  The server keeps each comment's `depth` and `reply_count`, so neither needs a read of the chain.
- **The modal** (`CommentModal`): opened by the "Write a comment…" box, Reply or Edit; a small underlined Post (`Button variant="text"`),
  Ctrl / ⌘ + Enter too. What was written is kept while it is closed (per page). 2000 characters, plain text.
- **Who:** its author edits it ("edited" shows); its author or the article's owner deletes it, with everything under it (asked first when
  it has replies). 10 new comments a minute per person (the `COMMENTS` rate limit).

## Toolbar states

| Level | Bar width | What changes |
|---|---|---|
| 0 | ≥ 960 px | everything in place |
| 1 | 800–959 | the four alignments are one dropdown; the Ω box is only Ω (no examples) |
| 2 | 640–799 | the text and background colours move to row 2, shown even when the ⋯ hides row 2 |
| 3 | < 640 | the rows wrap between their groups, as many rows as needed |

The bar is always there for an editor, also before the text is opened (its buttons disabled until then, but More and Add section), so
opening the text never pushes it down. It has no X any more. More shows and hides row 2. The links row is its own box `--spacing-sm` under
the bar, over the text (`article-links.md`).

## Ω structures

`xʸ`, `xᵧ`, `|x|`, `n!` go in with their places selected one at a time: type to fill, Tab / Shift+Tab to move, Enter (or Tab after the
last place, or the caret leaving) to finish. The places live only in the editor's state; what is saved is plain text with
`<sup>` / `<sub>`, which the server keeps. The SVGs group is Unicode shapes and signs (the server drops `<svg>`).

## Side tools

- **Contents** (top left, outside the body; on a page under 1024 px, a round button opens it over the text): the headings as a tree, the
  one being read marked.
- **Round buttons** on the body's left line: Zoom (the page goes to the top layer and fills the window; Esc or the button leaves),
  Messages (the article's Message links), Notes.
- **Notes**: connected notes first, a New note field (made, connected and opened), then all other notes to connect. Open = the note
  modal (`ItemModal`), Delete = `ResourceDeleteDialog`. The connections are on this device (`side/articleNotes.ts`).

## Save and roles

`useArticleRole()` is the one place that says editor or reader: today always editor (the API returns only your own articles), `?as=reader`
in the address shows the reader's page. The editor's Save is in the ⋯ menu; a reader's is where Private / Public is. The saved list is
`save/savedStore.ts` (on this device).

## Connecting the backend later

Replace, keeping their shapes: `useArticleRole` (owner / allowed people), `savedStore`, `articleNotes` (a connections table or field).
