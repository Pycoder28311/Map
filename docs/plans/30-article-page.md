# 30 — The Article page

**Goal:** an article opens on its own page (its workspace panel), built from the shared UI pieces: breadcrumbs of its parents at the
top, a two-row **icon** toolbar (with a **More** popout for the rarer formats), the big title, the text as one rich-text document with
an **Add section** bar, and on the right **Info / Share / ⋯** with an **Info box** (picture, name, info rows) that is saved with the
article. Only the page: the Note / Article create modal (`ResourceCreateDialog`) stays as it is.
**Depends on:** 29 (uncommitted work of the session: `TitleInput`, `PanelFrame`, …), 25 (rich text on the server).
**Blocks:** a later plan for Symbols, Equation and Add text from Note (§9).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Only the article's page** (its panel and route). The create modal, the Dashboard card and the note modal don't change | User |
| D2 | **Toolbar buttons are `IconButton`s** (icon + `label` as tooltip), never text. The wireframe's words are only their names | User |
| D3 | **The top-right box of the wireframe is the More button's popout** | User |
| D4 | **The top line is the breadcrumbs of the article's parents**: Project › Folder › … each with a dropdown of that level's siblings | User |
| D5 | **The Info box is saved in a new field `infobox`** of `articles` (data config + server validation; a new column) | User |
| D6 | **Working now:** every toolbar and More button **except** Symbols, Equation and Add text from Note, which show (disabled, tooltip "Soon") and are done in a later plan | User |
| D7 | **"Add paragraph" adds a section**: a heading + an empty paragraph at the end of the article, the caret in the heading. The article stays one rich-text document (`content`) | User |
| D8 | The page is the articles' own panel: `panel: { load: () => import('../features/articles/ArticlePanel') }` in `resources.config.ts` (the same way as maps), not a change of the generic `ResourceEditor` | Default |
| D9 | The page reuses `ItemForm`'s autosave/draft/conflict logic: it is moved out of `ResourceEditor.tsx` into a hook `useItemAutosave` (no behaviour change for the other resources) | Default |
| D10 | **Toolbar meaning of the wireframe's words** (overrides welcome): Next/Previous = Redo/Undo; *line* = underline; *line colour* = underline colour; *Big/Small* (More) = bigger/smaller text one step; *top right / bottom right* = superscript / subscript; *Add source top right* = a numbered source mark (superscript link to a "Sources" list at the end); *padding, letters gap, rows gap, border* = the current paragraph's padding, letter-spacing, line-height and border | Default |
| D11 | Font list: the app's own fonts (`features/board/fonts.ts`) so maps and articles offer the same ones | Default |
| D12 | **Info** toggles the Info box (shown by default when it has content, remembered per device); **Share** opens the share options for this article; **⋯** is the resource menu (`useResourceMenu`: Pin, Move to…, Copy, Delete) | Default |
| D13 | The toolbar is sticky at the top of the panel while scrolling | Default |
| D14 | Narrow panel (< 720 px): the Info box goes above the text instead of beside it; the toolbar wraps | Default |

## 1 — Risks and blockers

1. **The server's sanitizer drops the new formats.** `packages/shared/src/sanitize-html.ts` keeps only `font-size` and `color` on a
   `<span>`, and its `TAGS` have no `sup`, `sub`, `mark`, tables or `text-align`. Every new format (font family, background
   colour, underline colour, text align, superscript/subscript, paragraph padding/letter-spacing/line-height/border, tables,
   source marks) must be allowed there **and** in its tests, or it is silently lost on save. This is a shared/server change.
2. **New field kind.** There is no JSON field kind (`fields.ts` has text, plainText, richText, int, bool). The Info box needs
   `field.json(schema, default)`: a text column holding JSON, validated by a zod schema (`ownedTable.ts` `columnOf`, `fields.ts`,
   `FieldRenderer` gets `hidden` for it). A schema change → a DB migration for `articles`.
3. **Picture upload in the app.** The backend stores images (`backend/src/resources/images`), but no app code calls it yet
   (`RichTextField`'s `onUploadImage` is unused). The Info box picture and *Insert → Image* need a small `uploadImage(file)` client
   in `lib/api/`. If the endpoint isn't ready in the mock API, the mock returns an object URL.
4. **Breadcrumbs need the parent chain.** An article knows only its direct parent (`objectType` + `objectId`); folders can nest. The
   chain is read from the resource stores (`useResourceItem` per level, at most 20 like the server), so a deep article does a few reads.
5. **buttons.test.ts.** No raw `<button>` may be added outside `components/ui/buttons/`; the colour swatches and the More grid use
   `IconButton` / existing `ColourPicker`, so `ALLOWED` shouldn't change. If one is unavoidable it goes in `ALLOWED` with its reason.

## 2 — Approach

```
ArticlePanel (features/articles)           ← resources.config.ts  articles.panel.load
├─ Breadcrumbs                              parents chain, Dropdown per level
├─ ArticleToolbar  (sticky)                 drives the editor from onEditor
│   row 1: Undo Redo | font size B U I colour bg underline-colour | list align | More ▸ ……… Symbols Equation
│   row 2: Add from Note | Add section | Link | Insert ▾
│   More → BarPopout: MoreFormats
├─ main column
│   TitleInput (title)  + RichTextField (content, toolbar=false, onEditor)
│   AddSectionBar
└─ side column
    Info  Share  ⋯                         IconButton / Button, useResourceMenu
    InfoBox (infobox field)
           │
 useItemAutosave(resource, item)  ← moved out of ResourceEditor's ItemForm
           │ update(id, { title, content, infobox })
 server: data.config articles.infobox (json) · sanitize-html new formats
```

## 3 — Data: the `infobox` field (shared + backend)

- `packages/shared/src/fields.ts`: new kind `json`:
  `json: <T>(schema: z.ZodType<T>, start: T): Field<'json', T>` — zod is the given schema, `default` is `start`. Update the
  comment listing the kinds.
- `packages/shared/src/infobox.ts` (new): the schema and type, also used by the app:
  ```ts
  InfoRow = { id: string; label: string } & (
    | { kind: 'value'; value: string }                       // "Info ……… Value"
    | { kind: 'list'; items: string[] }                      // "Info 1) Info1 2) Info2"
    | { kind: 'text'; text: string; bullets: boolean })      // "Info [ ] Bullets / Description"
  Infobox = { image: string | null; name: string; rows: InfoRow[] }   // ≤ 50 rows, label ≤ 100, text ≤ 2000
  ```
  `image` must pass `isSafeImageSrc` (refine), like images in rich text.
- `data.config.ts` `articles.fields`: `infobox: field.json(infoboxSchema, { image: null, name: '', rows: [] })`. Not part of
  `requireOneOf` or `preview`.
- `backend/src/lib/ownedTable.ts` `columnOf`: `json` → text column, (de)serialised in `ownedRepo.ts` on read/write; a test in
  `ownedRepo.suite.ts` (round-trip, invalid shape rejected, unsafe image rejected). Migration for the new column (default `''` →
  read as the default value).
- App: `resources.config.ts` `articles.fields.infobox = { hidden: true }` (the generic form never shows it); `lib/resource/changed.ts`
  compares it by value (JSON), so autosave only sends it when it changed. `mockApi.ts` stores it like any field.

## 4 — Formats the server must keep (`sanitize-html.ts`, `rich-text-policy.ts`)

Allowed, each with a test in `sanitize-html.test.ts`:

| Format | Markup |
|---|---|
| font family | `span style="font-family"` (only names from the shared font list) |
| background colour | `mark style="background-color"` or `span style="background-color"` (colour values as `color` today) |
| underline colour | `u style="text-decoration-color"` |
| superscript / subscript | `sup`, `sub` |
| text align | `p` / `h1–h3` `style="text-align: left|center|right|justify"` |
| paragraph look | `p` `style` `padding`, `letter-spacing`, `line-height`, `border` — numbers in px / unitless within limits, border = `Npx solid <colour>` |
| source mark | `sup` + `a href="#src-N"`; the Sources list as `ol data-type="sources"` with `li id="src-N"` |
| table | `table`, `thead`, `tbody`, `tr`, `th`, `td` (no attributes but `colspan`/`rowspan`) |

The allowed font names and limits live in `rich-text-policy.ts` so the editor and the server read the same list.

## 5 — Editor extensions (`components/ui/editors/`)

`RichTextEditor` stays shared; the article passes what it needs through `extensions` (the base set doesn't grow for notes):

- New file `articleExtensions.ts`: TipTap `FontFamily`, `Highlight` (multicolor), `TextAlign` (paragraph, heading), `Subscript`,
  `Superscript`, `Table` + row/cell/header, from `@tiptap/extension-*` 3.x (new packages: `extension-text-align`,
  `extension-highlight`, `extension-subscript`, `extension-superscript`, `extension-table`; `FontFamily` is in `extension-text-style`).
- Own small extensions in the same folder: `UnderlineColor` (mark attribute on underline), `ParagraphStyle` (global attributes
  padding / letterSpacing / lineHeight / border on paragraph and heading), `SourceMark` (inserts the next number and its list item).
- Link is in StarterKit already (`LINKS`); the Link button uses `setLink` / `unsetLink`.

## 6 — The toolbar (`features/articles/ArticleToolbar.tsx`)

A `role="toolbar"` of two rows, each group split by a thin vertical line (a new `vertical` prop on `Divider`, or a 1px span with
`--divider-line`). All buttons are `IconButton` (`ghost`, `selected` / `aria-pressed` when active, `onMouseDown` preventDefault as
in `RichTextToolbar`). The active state comes from `useEditorState`, as `RichTextToolbar` does; its `FORMATS` list is reused
(exported) rather than copied.

| Row | Group | Buttons (react-icons/lu) |
|---|---|---|
| 1 | history | Undo `LuUndo2`, Redo `LuRedo2` |
| 1 | text | Font (`Dropdown` with `triggerIcon={LuType}`), Size (`Dropdown`, the `SIZES` of `RichTextToolbar`, `triggerIcon={LuALargeSmall}`), Bold, Underline, Italic, Colour `LuBaseline`, Background `LuHighlighter`, Underline colour (an underline icon with a colour bar) — the colours open `ColourPicker` in a `BarPopout` |
| 1 | block | Bulleted / Numbered / Checklist (one `Dropdown` with `triggerIcon={LuList}`), Align (`Dropdown`, `LuAlignLeft/Center/Right/Justify`) |
| 1 | more | More `LuEllipsis` → `BarPopout mode="click"` with `MoreFormats` |
| 1 (right) | insert-special | Symbols `LuOmega`, Equation `LuSigma` — disabled, "Soon" (D6) |
| 2 | — | Add text from Note `LuStickyNote` (disabled, "Soon"), Add section `LuHeading`, Link `LuLink` (popout with a `TextField` for the address, Remove), Insert `LuPlus` (`ExtendMenu variant="ghost"`: Image, Table, Divider) |

**`MoreFormats.tsx`** (the wireframe's More box): a grid of `IconButton`s — Bigger `LuAArrowUp`, Smaller `LuAArrowDown`,
Superscript `LuSuperscript`, Subscript `LuSubscript`, Code `LuCode`, Strikethrough `LuStrikethrough`, Add source `LuQuote` — and
below them four small number fields for the current paragraph: Padding, Letter gap, Row gap, Border (reuse `RangeField` /
`numberScrub` from `components/ui/fields/`), plus the border colour (`ColourField`). Changes apply at once to the paragraph the
caret is in.

## 7 — The page (`features/articles/`)

- **`ArticlePanel.tsx`**: loads the item (`useResourceItem`), handles gone / error / Trash exactly like `ResourceEditor` (those three
  branches are moved into a small shared `ResourceItemGate` so both use it). `id === 'new'` keeps `NewItemEditor` as today.
  Layout: `Breadcrumbs`, sticky `ArticleToolbar`, then a two-column grid (text | 16 rem side column), D14 for narrow panels.
- **Title**: `TitleInput size="lg"` styled to stay a heading (`text-title`), saved as `title`.
- **Text**: `RichTextField` with `toolbar={false}`, `onEditor` → the toolbar, `extensions` from `articleExtensions`,
  `onUploadImage={uploadImage}`, `minHeight="min-h-[50vh]"`. `RichTextField` gets an `extensions` prop passed through to the editor.
- **`AddSectionBar.tsx`**: the full-width grey bar under the text ("Add section" + `LuPlus`), a `Button variant="secondary"
  className="w-full"`; the toolbar's Add section does the same: `insertContentAt(end, [{ heading level 2 }, { paragraph }])`, caret in
  the heading.
- **`Breadcrumbs.tsx`** (in `components/ui/` since it isn't article-specific: `components/ui/links/Breadcrumbs.tsx`): the chain
  from §1-4 as `Dropdown`s with `hoverChevron`, the choice = that level's item, options = its siblings (`useResourceList` with the
  parent filter), choosing one opens it in this pane (`workspace.open`). First level: the project; no parent → only "No project".
- **Side column**: a row `Info` (`Button variant="ghost" aria-pressed`), `Share` (`Button variant="secondary" icon={LuShare2}`),
  `⋯` (`IconButton` with the `useResourceMenu` menu, `dialogs` rendered by the page).
- **`InfoBox.tsx`**: a `Card variant="muted"`:
  - picture: a square `Card` slot; click/drop → `uploadImage`, shows the image; hover shows Replace / Remove `IconButton`s;
  - name: a heading input with a line under it;
  - rows, each by `kind`: value (label left, value right, line under), list (label, numbered items, + to add), text (label,
    `CheckField` "Bullets", description `TextAreaField`; bullets → shown as a bulleted list when not focused);
  - between two rows a small `+` (`IconButton size="sm"`) inserts a row there; each row has a ⋯ (change kind, delete) and is
    reordered by drag (`features/drag` like the sidebar rows) — reorder is in scope only if cheap, otherwise Open items;
  - **Add info**: `Button variant="secondary" className="w-full"` → `ExtendMenu` choosing the kind of row.
  Every change goes through the same `useItemAutosave` as title and text (`{ infobox }`).
- **`lib/api/images.ts`** (new): `uploadImage(file): Promise<string>` → the backend's image endpoint; mock: object URL.

## 8 — Moving the autosave out of `ResourceEditor`

`components/ui/resource/useItemAutosave.ts` (new): everything `ItemForm` does before its JSX (saved ref, draft boot decision,
`useAutosave`, `keepMine` / `useServers`, the conflict flag) returned as `{ start, change, status, flush, hold, release, discard,
conflict, keepMine, useServers }`. `ItemForm` and `ArticlePanel` both use it; the conflict `Modal` becomes `ItemConflictModal`
next to it. No behaviour change for notes, projects, folders, object cards.

## 9 — Later (not in this plan)

Symbols (a picker of special characters), Equation (KaTeX node, a new dependency + sanitizer rule), Add text from Note (a note
picker that inserts the note's text). Their buttons exist, disabled.

## Testing

- `packages/shared`: `sanitize-html.test.ts` per new format (kept / unsafe values dropped); `infobox` schema tests (valid, too
  long, unsafe image).
- `backend`: `ownedRepo.suite.ts` round-trip of `infobox`; update rejected with a bad shape.
- `app`: `buttons.test.ts` passes unchanged (no new raw `<button>`); unit test for the section-insert command and for the
  breadcrumbs chain builder (pure function from items → chain, stops at 20 / at a loop); `changed.ts` test for JSON fields.
- Manual (`npm run dev`): open an article in a pane; each toolbar and More button changes the text and survives a reload (i.e. the
  server kept it); Info box add / edit / reorder / picture upload survives a reload; Info hides/shows; ⋯ Move to… updates the
  breadcrumbs; narrow pane layout; notes and other resources still edit and autosave as before.
- `npm run test --workspace app`, `npm run build --workspace app`, and the backend / shared test scripts.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `json` field kind + column + (de)serialise + tests | `packages/shared/src/fields.ts`, `backend/src/lib/ownedTable.ts`, `backend/src/lib/ownedRepo.ts`, `ownedRepo.suite.ts` |
| 2 | Infobox schema + `articles.infobox` + migration | `packages/shared/src/infobox.ts`, `data.config.ts`, backend migration |
| 3 | Sanitizer: new formats + shared font list/limits + tests | `sanitize-html.ts`, `sanitize-html.test.ts`, `rich-text-policy.ts` |
| 4 | App side of the field: hidden, JSON compare, mock | `resources.config.ts`, `lib/resource/changed.ts`, `lib/api/mockApi.ts` |
| 5 | Move autosave into `useItemAutosave` + `ItemConflictModal` + `ResourceItemGate` | `components/ui/resource/*` |
| 6 | Install TipTap extensions; `articleExtensions.ts` (+ UnderlineColor, ParagraphStyle, SourceMark); `extensions` prop on `RichTextField` | `app/package.json`, `components/ui/editors/`, `fields/RichTextField.tsx` |
| 7 | `uploadImage` client (+ mock) | `lib/api/images.ts`, `mockApi.ts` |
| 8 | `ArticleToolbar` + `MoreFormats` (export `FORMATS`/`SIZES` from `RichTextToolbar`; vertical `Divider`) | `features/articles/`, `editors/RichTextToolbar.tsx`, `ui/Divider.tsx` |
| 9 | `Breadcrumbs` + chain builder + test | `components/ui/links/Breadcrumbs.tsx` |
| 10 | `InfoBox` (picture, name, rows, insert +, Add info) | `features/articles/InfoBox.tsx` |
| 11 | `ArticlePanel` + `AddSectionBar`, wired in `resources.config.ts` `articles.panel` | `features/articles/`, `resources/resources.config.ts` |
| 12 | Docs: new field kind in `instructions/data-config.md`, the article page and its toolbar in `instructions/` (short section) | `instructions/` |
| 13 | Tests + build + manual check | — |

Files **not** touched: `ResourceCreateDialog.tsx` / `CreateModal.tsx` (the create modal, D1), `styles/buttons.css` (no new button
looks), the Dashboard cards, the notes' modal, the map board.

## Open items

- **Share** (D12): today `ShareButton` is the navbar's share mode for the whole screen. Is the article's Share that same mode with
  the article highlighted, or a popout of `ShareOptions` for just this article?
- Reordering Info box rows by drag: in this plan, or later?
- Confirm the meanings in D10 (especially *Big/Small*, *line colour*, *Add source top right*).
