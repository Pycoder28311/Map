# The article page: toolbar states, Ω structures, side tools, Save

What plan `docs/plans/32-article-toolbar-responsive-and-side-tools.md` added to the article page. The links (third row, Autolinker,
Private / Public) are in `article-links.md`.

## Where things are

```
app/src/features/articles/
├── toolbarLevel.ts          the toolbar's narrow states, from its own width (LEVEL_WIDTHS: tune them here)
├── ArticleToolbar.tsx       uses the level: 1 aligns → a dropdown, Ω box → Ω; 2 colours → row 2 (even with the ⋯ closed); 3 rows wrap
├── StructureIcon.tsx        a structure drawn with dotted places (the Ω box's examples)
├── MoreFormats.tsx          the Ω popout: Basics · SVGs · Mathematical · Others (symbols.ts SYMBOL_GROUPS)
├── save/                    useArticleRole (editor / reader) · savedStore (the saved list) · SaveButton
└── side/                    ContentsTree (+ contentsTree.ts) · RoundTools · MessagesList · NotesPanel · articleNotes.ts
app/src/components/ui/editors/structures.ts   the Word-like structures: places, Tab / Shift+Tab, Enter ends
app/src/lib/localStore.ts    the mock stores' base: a JSON value on this device that screens watch
```

## Toolbar states

| Level | Bar width | What changes |
|---|---|---|
| 0 | ≥ 960 px | everything in place |
| 1 | 800–959 | the four alignments are one dropdown; the Ω box is only Ω (no examples) |
| 2 | 640–799 | the text and background colours move to row 2, shown even when the ⋯ hides row 2 |
| 3 | < 640 | the rows wrap between their groups, as many rows as needed |

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
