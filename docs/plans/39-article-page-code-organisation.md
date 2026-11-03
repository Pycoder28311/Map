# 39 — Article page: code organisation (no change to the UI or the features)

**Goal:** the article page's code is organised the way a professional codebase is: no file over ~250 lines, every list of options in
a config file, every element that appears more than once defined once and used with different arguments, the logic in hooks and the
drawing in components. Helpers that the article page shares with the rest of the app (date formats, the tooltip delay, keeping the
caret, opening a link in a new tab) are defined once for the whole app. **Nothing a user sees or does changes**: same DOM, same
classes, same texts, same behaviour.
**Depends on:** 30–38 (the article page as it is now).
**Not in this plan:** `text/articleText.ts` (stays one class, see U2), new features, style changes, the backend.

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | Scope: `features/articles/` **and** the helpers it shares with the rest of the app. The copies of those helpers elsewhere (`ResourceEditor`, `cardFaces`, `board/*`, `sharing/PrivacyPanel`, `people/PersonCard`) are replaced too |
| U2 | `text/articleText.ts` (532 lines, the `ArticleText` class) **stays as it is**. It is one cohesive class, and splitting it is risky where the window editing is most delicate |
| U3 | Size limit: **~250 lines per file** |
| U4 | No change to the UI or the features (the user's rule, from the request) |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **Moves are `git mv`**, then the edit, in separate commits where possible | `git log --follow` / blame keep the history |
| P2 | `features/articles/ArticlePanel.tsx` **keeps its path and default export** | `resources/resources.config.ts:99` lazy-loads it; nothing outside the folder changes its import |
| P3 | Subfolders by area, as today (`links/`, `text/`, `side/`, `save/`, `sections/`, `comments/`, `messages/`, `toolbar/`), plus **`page/`** for the page shell and **`toolbar/omega/`** for the Ω box. The folder's root keeps only `ArticlePanel.tsx` | One place to look for each part |
| P4 | Config files are `.ts` named `*Config.ts` (data) and `*Texts.ts` (long tip sentences); a list of values and its separate `*_TAGS` map become **one list** of `{ value, tag }` | One list to keep in sync instead of two |
| P5 | Hooks that only move code out of a component keep **the same order of state and effects, and the same deps** (including the effects with no deps, and the setState-during-render resets) | No change in when things run |
| P6 | Tooltip delay: a constant `TIP_DELAY = 350` next to `HoverInfo`. **HoverInfo's own default (400) does not change**; `StyleChips`' `delay={250}` stays | Changing the default would change every other tooltip |
| P7 | Date formats: one `lib/dates.ts` with one named formatter per format used today (four different ones); each file keeps the format it shows now | Same output, defined once |
| P8 | The toolbar's Link popover uses `FormActions` from `links/LinkForms.tsx`. Its markup is the same (a `flex justify-end gap-2` row, Remove as ghost `sm`, Apply as submit `sm`) | Same element, defined once |
| P9 | `rgbToHex` of the toolbar becomes `cssRgbToHex(css)` in `components/ui/fields/colour.ts`, calling the existing `rgbToHex({ r, g, b })` | The colour helpers are already there. Computed colours are whole numbers, so clamping and rounding give the same result (a test checks this) |
| P10 | The title's width measure uses one shared `lib/measureText.ts`, moved from `features/board/measureText.ts` (`canvasContext` + `measure`); the board re-exports from it | One canvas measurer in the app |
| P11 | Docs: `instructions/article-page.md` and `instructions/article-links.md` "Where things are" are updated to the new paths, in the same change | The instructions must name real files |
| P12 | One commit per step of the task list, each one building, linting and passing the tests | Each step can be checked and reverted on its own |

## 1 — Risks

1. **Hidden behaviour change while moving hooks.** `ArticlePage` relies on render-time resets (`rules` and `values` restart on a new
   `autosave.start.version`; `kept` follows `side`), on effects with no deps (`handlers.current = …`, `text.onChange = …`) and on the
   `key={autosave.start.version}` on `ArticleBody`. They move into hooks **unchanged**: same statements, same order, called from the same
   component (P5).
2. **`buttons.test.ts` checks files by path** (raw `<button>` counts, button classes, look classes). The only article files in its list
   (`sections/SectionMenu.tsx`, `text/SectionHandles.tsx`) do not move. New files only hold `Button` / `IconButton` uses moved from
   allowed files, with the same `className`, so the test keeps passing. It is run after every step.
3. **Lint `react/only-export-components`** (warn): a `.tsx` file exports components only. Constants and helpers go into `.ts` files
   (`TIP_DELAY` is a constant, which `allowConstantExport` allows).
4. **No visual regression tests exist.** The checks are §7: an inventory of the classes and texts before and after (it must be the same
   set), the existing tests, the build, and a manual pass on the page in both roles.

## 2 — Target structure

```
features/articles/
├── ArticlePanel.tsx              the gate: not found / new item / ResourceItemGate → ArticlePage            (~35)
├── page/                         THE PAGE SHELL
│   ├── ArticlePage.tsx           puts the parts together (state from the hooks below)                       (~220)
│   ├── pageConfig.ts             SIDE_SLIDE_MS, SIDE_MIN_WIDTH, INFO_GAP, BANNER_HEIGHT {banner, reader, editor}, TITLE_MAX
│   ├── articleValues.ts          articleValues, articlePatch (autosave ⇄ fields)
│   ├── useArticleFields.ts       the values ref + field(), the autolinker rules + setRules, the adoptRules effect
│   ├── useSidePanel.ts           side, kept (kept while it slides closed), toggleSide
│   ├── useZoom.ts                zoomed, showPopover, Esc
│   ├── useMessagePanel.ts        message state, openMessage, hoverMessage, the close timer
│   ├── useLinkHandlers.ts        handlers ref + its every-render effect (open url / object / person / jump, find, rules)
│   ├── ArticleActions.tsx        Import from Notes, Save (readers), Share, the ⋯ menu
│   ├── SideColumn.tsx            Contents / Messages / Notes, beside the article or over the text
│   ├── OpenMessage.tsx           the hover wrapper + MessagePanel with its Edit / Remove link
│   ├── ArticleFooter.tsx         the lost-access alert, SaveStatus, "Created …"
│   ├── ArticleBody.tsx           the bordered box: banner, folders, title row, toolbar, text + Info box, Add section, comments, footer (~170)
│   ├── ArticleTitle.tsx          the title on its CrackedPanel, as wide as its words
│   ├── ArticleBanner.tsx         (moved from the root, unchanged)
│   └── ProjectFolders.tsx        (moved from the root, unchanged)
├── toolbar/                      THE EDIT BAR
│   ├── ArticleToolbar.tsx        the two rows' layout only                                                   (~220)
│   ├── toolbarConfig.ts          every option list and default colour (§4.1)
│   ├── toolbarTexts.ts           the long tip sentences
│   ├── toolbarCommands.ts        what the buttons do to the editor: toggleList, setTextLook, insert, setLink / unsetLink, shownTextColour
│   ├── useToolbarState.ts        the useEditorState selector and its ToolbarState type
│   ├── toolbarLevel.ts (+ test)  (moved from the root, unchanged)
│   ├── parts.tsx, ToolbarDropdown.tsx   (as now; `Tip`, `ToolButton`, `TextButton` use TIP_DELAY + keepFocus)
│   ├── TextControls.tsx          FontSelect, SizeControl
│   ├── StyleSplit.tsx            ONE split control (toggle + dropdown) → BoldControl, ItalicControl as two configs
│   ├── UnderlineControl.tsx
│   ├── ParagraphLook.tsx         the 3 simple paragraph dropdowns from one config list + Border, and `Shown`
│   ├── ColourButtons.tsx         Text colour, Background colour (the `colours` group)
│   ├── InsertMenu.tsx            Media ▸ image / table / divider
│   ├── LinkPopover.tsx           Link ▸ address form (FormActions)
│   └── omega/
│       ├── OmegaBox.tsx          the Ω box (examples + arrow) or the lone Ω, and the popout; OmegaExample defined once
│       ├── MoreFormats.tsx, SymbolPanel.tsx, StructureIcon.tsx, symbols.ts (+ test)   (moved, unchanged)
├── sections/
│   └── AddSectionPopover.tsx     NEW: the "Add section" popover, used by the toolbar and under the last row
├── links/
│   ├── linkKinds.ts              NEW: THE list of link kinds (label, icon, kinds, tip, popout width), read by LinkRow and AutolinkPanel
│   ├── AutolinkPanel.tsx         the modal only (~250)
│   ├── autolink/                 NEW: ImportModal.tsx, AutolinkForm.tsx, AutolinkParts.tsx (Slide, Tag, UrlColumn, SectionBody, Endpoint)
│   └── … (the rest unchanged)
└── side/, text/, save/, comments/, messages/   unchanged (but the shared helpers of §3)

lib/                              SHARED BY THE WHOLE APP
├── dates.ts                      NEW: DAY_MONTH_YEAR, DAY_MONTH, DAY_MONTH_YEAR_TIME, DAY_MONTH_TIME
├── keepFocus.ts                  NEW: keepFocus(e): a press that keeps the focus (and the caret) where it is
├── useNarrower.ts                NEW: moved from ArticlePanel
├── measureText.ts                NEW: moved from features/board/measureText.ts (canvasContext, measure)
└── urls.ts                       + withScheme(url), openInNewTab(url)
components/ui/overlays/HoverInfo.tsx   + export const TIP_DELAY = 350
components/ui/fields/colour.ts         + cssRgbToHex(css)
```

Every new file is under ~250 lines. `articleText.ts` (U2) is the only file of the folder left over the limit.

## 3 — Shared helpers (the whole app)

| Helper | Replaces | Files |
|---|---|---|
| `TIP_DELAY` (`HoverInfo.tsx`) | `delay={350}` (all) | `articles/toolbar/parts.tsx`, `ArticleToolbar` parts, `links/LinkRow.tsx`, `sharing/PrivacyPanel.tsx`, `board/ObjectDraftForm.tsx`, `board/sidebar/common/{NodeNotes,AttachedTextField,ObjectArticleSection}.tsx` |
| `keepFocus` (`lib/keepFocus.ts`) | `onMouseDown={(e) => e.preventDefault()}` (28 uses) | `components/ui/fields/{ColourField,DropdownField}.tsx`, `components/ui/editors/RichTextToolbar.tsx`, `board/sidebar/common/AttachedTextField.tsx`, every article file that has it |
| `lib/dates.ts` | the six `new Intl.DateTimeFormat` | `ResourceEditor.tsx`, `dashboard/cards/cardFaces.tsx`, `articles/links/MessagePanel.tsx`, `MessageReplies.tsx`, `comments/CommentCard.tsx`, the page footer. Each keeps its own format (P7) |
| `withScheme`, `openInNewTab` (`lib/urls.ts`) | the copies in `links/LinkForms.tsx` and `AutolinkPanel`'s `UrlColumn`; `window.open(url, '_blank', 'noopener,noreferrer')` | `LinkForms.tsx`, `AutolinkPanel`, the page's link handlers, `people/PersonCard.tsx` |
| `useNarrower` (`lib/useNarrower.ts`) | the hook inside `ArticlePanel.tsx` | `page/ArticlePage.tsx` |
| `lib/measureText.ts` | `board/measureText.ts`'s canvas context and the page's own `measureCanvas` | `board/measureText.ts` (keeps `layoutOfText`, imports `measure`), `page/ArticleTitle.tsx` |
| `cssRgbToHex` (`colour.ts`) | the toolbar's own `rgbToHex(css)` | `toolbar/toolbarCommands.ts` |

## 4 — The toolbar (`ArticleToolbar.tsx`, 971 lines → `toolbar/`)

### 4.1 `toolbarConfig.ts`: the data, one list each

- `DEFAULT_COLOURS = { text: '#e5e5e5', background: '#fde047', border: '#9ca3af' }`
- `FONT_SIZES = { min: 8, max: 200, normal: 16, common: [{ size, name }…] }` (today `COMMON_SIZES`, `MIN_SIZE`, `MAX_SIZE`, `NORMAL_SIZE`)
- `WEIGHTS`, `SLANTS`, `UNDERLINE_KINDS`
- `PADDINGS`, `LETTER_GAPS`, `ROW_GAPS`, `BORDER_WIDTHS` as `{ value, tag }[]` (the four `*_TAGS` maps merged in, P4); `NORMAL_ROW_GAP`,
  `BORDER_LOOK` (the regex)
- `LISTS`, `ALIGNS`, `INSERTS` (with their types `ListKind`, `Align`, `Insert`)
- `BOX_STRUCTURES`, `STRUCTURE_TIPS`

`toolbarTexts.ts`: the tips written inside the JSX today (Add section, Code, Link types, the Ω's, More's two titles, the colours'), as
one `TOOLBAR_TIPS` object, word for word.

### 4.2 Defined once, used with arguments

- **`StyleSplit`**: Bold and Italic are the same element (a `FormatToggle` + a `split` dropdown with a heading and checked, styled
  options). One component takes `{ name, label, heading, options, current, on, icon, onPick, onToggle }`; `BoldControl` and `ItalicControl`
  become a few lines each that pass their list (`WEIGHTS` with `hint` and `fontWeight`, `SLANTS` with `fontStyle`) and their commands.
- **`ParagraphLook`**: Padding, Letter gap and Row gap become one config list
  `{ name, tip, icon, values, read(look), option(entry, current), write(value) }` drawn by one `.map()` into `ToolbarDropdown kind="split"`.
  The option shapes stay exactly as now (Letter gap: the tag as label, `${n}px` as hint, its letter spacing; the others: the value as label,
  the tag as a big hint). Border stays its own entry (it has the Width heading and the colour picker) but reads `BORDER_WIDTHS` from config.
- **`OmegaExample`**: the structure buttons and the `GROUP_EXAMPLES` buttons are the same `HoverInfo` + `IconButton size="xs"` with
  `h-full! min-h-0!`; one component takes `{ title, text, label, onClick, children }`.
- **`AddSectionPopover`** (`sections/`): the toolbar's and the body's "Add section" are the same `BarPopover` + `SectionPicker` that closes on a
  pick. It takes `{ width?, trigger: (open, toggle) => ReactNode, onSection }`; the toolbar passes `width="w-72"` and its `TextButton`, the body
  its `Button`.
- **The Link popover** uses `FormActions` (P8).

### 4.3 What is left in `ArticleToolbar.tsx`

`useToolbarState(editor)` (the selector, unchanged), the four `useState`s, `useToolbarLevel`, and the layout of row 1, More, row 2 and
the links row slot, made from the components above. Same element tree, same classes.

## 5 — The page (`ArticlePanel.tsx`, 812 lines → `ArticlePanel.tsx` + `page/`)

- `ArticlePanel` (the gate) stays in its file (P2); `ArticlePage` moves to `page/ArticlePage.tsx`.
- State and effects go to the hooks of §2, statement for statement (P5):
  - `useArticleFields(autosave, session, text, canEdit)` → `{ field, rules, setRules }` (the values ref, the rules reset, the adopt effect)
  - `useSidePanel()` → `{ side, kept, open, toggleSide }`
  - `useZoom(page)` → `[zoomed, setZoomed]`
  - `useMessagePanel(text, textBox, infoAside)` → `{ message, setMessage, openMessage, hoverMessage, cancelClose }`
  - `useLinkHandlers({ text, workspace, rules, setPerson, setFinding })` → the `handlers` ref
- **Defined once:** the two `<LinkRow>`s (floating at `@`, docked under the bar) get their shared props from one `linkRowProps` object
  (`editor, text, self, articleId, open, onOpenChange, rules, onRules, userId`); `` `${resource.panelType}:${item.id}` `` is `panelKey`
  everywhere (4 places today).
- JSX moves to `ArticleActions`, `SideColumn`, `OpenMessage`, `ArticleFooter`. The two small modals (Info, Person) stay in `ArticlePage`:
  they are one `Modal` each with different content, already the shared component.
- `ArticleBody` moves to `page/ArticleBody.tsx` with its `BodyProps`; the title with its width measure goes to `page/ArticleTitle.tsx`
  (using `lib/measureText.ts`); the banner heights (`11rem` / `3rem` / `9rem`) come from `pageConfig.ts`; the bottom Add section uses
  `AddSectionPopover`.

## 6 — Links (`linkKinds.ts`, `AutolinkPanel.tsx` 523 lines)

- **`links/linkKinds.ts`**: `LinkRow`'s `BUTTONS` + `WIDTH` and `AutolinkPanel`'s `SECTIONS` describe the same five kinds (same labels, icons and
  order). One list: `{ id, label, icon, kinds, tip, width?, searchable, inAutolinker }`. `LinkRow` maps all of it; `AutolinkPanel` maps the ones
  with `inAutolinker` (all but Message: the same four, in the same order).
- `AutolinkPanel.tsx` keeps the modal and its state; `links/autolink/` gets `ImportModal.tsx` (moved), `AutolinkForm.tsx` (the draft form:
  sentence, tags input, the four sections) and `AutolinkParts.tsx` (`Slide`, `Tag`, `UrlColumn`, `SectionBody`, `Endpoint`, `SIMPLE_INPUT`).
  `UrlColumn` uses `withScheme`, `Endpoint` uses `openInNewTab`.
- The `autolink.ts` logic file (and its test) stays where it is: `links/autolink/` holds components only.

## 7 — Testing (that nothing changed)

1. **Before step 1**, save in the scratchpad (read-only, nothing in the repo): the sorted list of every `className="…"` / `` className={`…`} ``
   string, every visible text in JSX, and every `aria-label` / `label=` / `title=` / `tip=` under `features/articles/`, `lib/` and the shared
   files of §3. **After each step** the same list is made and diffed: it must be the same set (only where it is written may change). The tips moved to
   `toolbarTexts.ts` and the options moved to `toolbarConfig.ts` are counted from there.
2. After every step: `npm run build` (tsc + vite), `npm run lint`, `npm test` (including `buttons.test.ts`, `toolbarLevel.test.ts`,
   `symbols.test.ts`, the links and text tests).
3. New small tests:
   - `cssRgbToHex('rgb(12, 34, 56)') === '#0c2238'` and `rgba(…)` gives the same as the old code
   - `lib/dates.ts`: each formatter's options are the ones its files used
   - `toolbarConfig`: every padding / gap / width has a tag (the old maps covered every value)
   - `linkKinds`: the Autolinker's list is url, object, jump, follow, in that order
4. **Manual pass at the end** (the `run` skill, the app in the browser), as editor and with `?as=reader`:
   - the toolbar at the four widths (levels 0–3): row 2 via More, the colours moving at level 2, the Ω box and the lone Ω
   - Bold / Italic / Underline dropdowns, the paragraph dropdowns, Font size typing
   - Media, Link, Add section (toolbar and under the last row), `/` and `@`
   - the links row: each popout and the Autolinker with Import
   - a message opened by click and by hover, Edit and Remove link
   - Contents / Messages / Notes, beside the article and over it under 1088 px; Zoom and Esc
   - Share, the ⋯ menu, Save as reader, the footer date, a comment's and a reply's dates, a note's "Created" date, a dashboard card's date
   - tooltips appear after the same delay

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Make the "before" inventory (§7.1) in the scratchpad | (none in the repo) |
| 2 | Shared helpers: `TIP_DELAY`, `keepFocus`, `lib/dates.ts`, `withScheme` / `openInNewTab`, `useNarrower`, `lib/measureText.ts`, `cssRgbToHex` + tests; replace every copy in the app (§3) | `lib/*`, `HoverInfo.tsx`, `colour.ts`, the files of §3 |
| 3 | `git mv`: `ArticleToolbar.tsx`, `toolbarLevel.ts(+test)` → `toolbar/`; `MoreFormats`, `SymbolPanel`, `StructureIcon`, `symbols.ts(+test)` → `toolbar/omega/`; `ArticleBanner`, `ProjectFolders` → `page/`; fix the imports | moved files, their importers |
| 4 | `toolbarConfig.ts`, `toolbarTexts.ts` (value + tag lists merged) + config test | `toolbar/` |
| 5 | `toolbarCommands.ts`, `useToolbarState.ts` | `toolbar/` |
| 6 | Toolbar components: `TextControls`, `StyleSplit` (+ Bold / Italic), `UnderlineControl`, `ParagraphLook`, `ColourButtons`, `InsertMenu`, `LinkPopover` (FormActions), `omega/OmegaBox`; `ArticleToolbar.tsx` keeps only the layout | `toolbar/` |
| 7 | `sections/AddSectionPopover.tsx`, used by the toolbar (and by the body in step 9) | `sections/`, `toolbar/ArticleToolbar.tsx` |
| 8 | `page/pageConfig.ts`, `articleValues.ts` and the hooks (`useArticleFields`, `useSidePanel`, `useZoom`, `useMessagePanel`, `useLinkHandlers`); `ArticlePage` moves to `page/` | `ArticlePanel.tsx`, `page/` |
| 9 | Page components: `ArticleActions`, `SideColumn`, `OpenMessage`, `ArticleFooter`, `ArticleBody`, `ArticleTitle`; `linkRowProps`, `panelKey` everywhere | `page/` |
| 10 | `links/linkKinds.ts`, used by `LinkRow` and `AutolinkPanel` + test | `links/` |
| 11 | Split `AutolinkPanel` into `links/autolink/` (`ImportModal`, `AutolinkForm`, `AutolinkParts`) | `links/` |
| 12 | Line count check (`wc -l`: nothing over ~250 but `articleText.ts`), the inventory diff, build, lint, tests | — |
| 13 | Update `instructions/article-page.md` and `instructions/article-links.md` (Where things are) to the new paths | `instructions/` |
| 14 | Manual pass (§7.4) | — |

Each step builds, lints and passes the tests on its own, and is its own commit (P12). Steps 4–7 touch only the toolbar, 8–9 only the
page, 10–11 only the links, so they can be reviewed one area at a time.

Files **not** touched: `text/articleText.ts` (U2), `resources/resources.config.ts` (P2), `packages/shared`, `backend/`, every `.css`
file, `components/ui/buttons/*` (and `buttons.test.ts`'s list), `HoverInfo`'s default delay.

## Open items

None.
