# 31 — Article links, autolinker and privacy (frontend only)

**Goal:** the article page gets a third, smaller toolbar row with five kinds of link (Real link, Article link, Message, Jump link,
Follow) and an **Autolinker** that links every place a text appears, a hover card over every link, a **Public / Private** button
(with "Allow certain people") in place of Info, and **Info** and **Search in article** inside the ⋯ menu. Everything is frontend
only: a link is **only HTML in the article's `content`** (its kind, target id and info written into the link itself), never a new
record. Data that would need the server (people, privacy) comes from small mock stores shaped like the future API.
**Depends on:** 30 (the article page, `ArticleToolbar`, `articleExtensions`).
**Blocks:** a later backend plan (privacy field, people / followers, server search, link records, URL previews).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **No database, backend or `packages/shared` change.** New link buttons only change the article's HTML | User |
| D2 | **A link's data lives in its `href`**: `href="#mapl:k=<kind>&…"` (URL-encoded params). The server's sanitizer keeps `href` on `<a>` (`isSafeLink` accepts a `#` fragment) and drops every `data-*`, so this is what survives a save and a reload today. A later backend can read / migrate the same format | User |
| D3 | **Jump link = a link to a point / section of the same article.** The modal lists the article's sections (headings) and its anchors, each with a mark at its left; clicking the linked text scrolls there. Targets get a small mark in the left gutter of the text | User |
| D4 | **Follow is a button, not a checkbox**: it opens a modal with the followers list (mock people). Picking someone makes the selected text a link to that person (clicking it shows the person with a Follow / Unfollow button). The same modal has a URL input to send the reader to **another person's project** | User |
| D5 | **Search in ⋯ = find inside this article** (highlight matches, next / previous) | User |
| D6 | **Autolinkers are read from the HTML**: every link an autolinker made carries its rule (`a=<ruleId>&t=<text>`) in its href; the list is rebuilt from the text. **Import** reads other articles' `content` and takes their rules. Nothing is stored elsewhere | User |
| D7 | Autolinker "go there" **scrolls to an occurrence** and highlights it (repeated clicks step through them: "2 / 5") | User |
| D8 | **Privacy and people are mock stores** (`localStorage`, per article), typed like the future API: `{ visibility: 'private' \| 'public', allowed: PersonId[] }`. People come from one mock list shared with Follow | User |
| D9 | **Real link hover card**: its name, the domain and a placeholder picture; `linkPreview(link)` is the one seam a backend fills later | User |
| D10 | The Autolinker works for Real link, Article link, Jump link and Follow; **not Message** | User |
| D11 | Share shows only while the article is public | User |
| D12 | Third row: under the two rows, `mt-1`, `inline-flex` (only as wide as its buttons, not the bar's width), `size="sm"` buttons with a 1rem icon (the other rows: 1.25rem), Autolinker at its right end | Default |
| D13 | All link kinds are one TipTap mark: StarterKit's **Link** (`LINKS` in `RichTextEditor`), with `openOnClick: false` for the article. A `#mapl:` link is styled by kind (CSS on `a[href^="#mapl:"]`, e.g. dotted underline for Message, ↗ for Real link) — the sanitizer keeps no `class`, so the look is derived from the href | Default |
| D14 | Real links are also written as `#mapl:k=url&u=<url>` (not a bare `href`) so they can carry an autolinker id; clicking opens the URL in a new tab after `isSafeLink(u)`. The old Link button of row 1 stays as the plain link | Default |
| D15 | Message: `#mapl:k=msg&ti=<title>&c=<content>` (plain text, title ≤ 100, content ≤ 2000 chars). Clicking the text opens a **message panel at the right of the article body** (beside the text, like the Info box's column), not a centred modal | Default |
| D16 | Article link picker reads **one page at a time** (`resource.api.list(filter, { limit: 30, cursor })`), more on scroll; the search filters what is loaded and asks for the next pages while there are fewer than a screenful of matches. The kind chips: Article, Map, Object card, Folder, Project (one chosen at a time, "All" first). A `searchObjects(kind, query, cursor)` function is the seam for a server search later | Default |
| D17 | Anchors (jump targets that are not headings) are links too: `#mapl:k=anchor&id=<short id>`, wrapping the target text, so they survive the sanitizer. Headings are targeted by `to=h:<index>:<slug>` and found again by their text (index only breaks ties) | Default |
| D18 | Public / Private button: `LuLock` while private, `LuLockOpen` while public; clicking plays a short "unlock" (the shackle lifts, CSS in `animations.css`) and opens the privacy modal | Default |

## 1 — Risks and blockers

1. **Links in hrefs are visible data.** Anyone who reads the HTML sees the message text and target ids. Fine for now (articles are
   private to their owner on the server); the backend plan decides whether messages move to records.
2. **href length.** The sanitizer has no limit on `href`, but long messages make long attributes. Content is capped at 2000 chars
   (D15) and encoded once (`encodeURIComponent`); `linkHref.test.ts` covers the round trip with quotes, `&`, `#`, emoji and new lines.
3. **The server rewrites every `<a>`** with `target="_blank" rel="noopener noreferrer nofollow"`. The editor must intercept clicks
   on `#mapl:` links (a ProseMirror `handleClick` plugin, and a delegated click handler on the read-only HTML wherever it is shown)
   so they never navigate.
4. **Autolinker on typing.** Re-linking on every keystroke must not fight undo or the caret: rules are applied in an
   `appendTransaction` plugin only to the changed range, debounced to word ends, marked `addToHistory: false`. If this proves
   fragile, fallback: apply on button press and on blur only (Open items).
5. **Rules vanish with their last link** (D6): deleting every occurrence deletes the rule. Acceptable for the mock; said in the UI
   ("A rule with no place left in the text is removed").
6. **buttons.test.ts**: gutter marks, people rows, object rows and kind chips are clicked things that are not buttons → either
   `IconButton` / `Button`, or listed in `ALLOWED` with their reason (object rows and people rows like `ListRows`).

## 2 — Approach

```
ArticlePanel
├─ title line: [Import from Notes] [🔒 Private ▸ PrivacyModal] [Share (public only)] [⋯ Pin, Move…, Copy, Delete | Info ✓ | Search]
├─ ArticleToolbar
│   row 1, row 2 (as today)
│   row 3 (LinkRow, small):  Real link · Article link · Message · Jump link · Follow ············· [Autolinker]
│        each opens its BarPopover under the row;  Autolinker on → the five (minus Message) join into one AutolinkPanel
├─ FindBar (from ⋯ Search)
├─ text (RichTextField + articleExtensions + linkExtensions)      JumpGutter (marks at the left of sections)
│                                                                 MessagePanel (right column, when a message is open)
└─ LinkHoverCard (one per page, follows the hovered #mapl: link)

features/articles/links/
  linkHref.ts       encode / decode  #mapl:…  ⇄  ArticleLink (pure, tested)
  linkCommands.ts   setArticleLink(editor, link), linksIn(doc), anchorsAndSections(doc)
  autolink.ts       rulesFrom(doc), occurrences(doc, text), applyRule(tr, rule)  (pure on ProseMirror docs, tested)
  linkExtensions.ts LinkClicks (handleClick) · Autolinker plugin · FindHighlight decorations
  objectSearch.ts   searchObjects(kind, query, cursor)  ← seam for the server
  linkPreview.ts    linkPreview(link) → { title, text, image } ← seam for the server
features/people/
  mockPeople.ts     Person, PEOPLE, followStore (localStorage), usePeople()
features/articles/privacy/
  privacyStore.ts   useArticlePrivacy(articleId) (localStorage), types shaped like the future field
```

## 3 — The link format (`features/articles/links/linkHref.ts`)

```ts
export type ArticleLink =
  | { kind: 'url'; url: string; rule?: Rule }
  | { kind: 'object'; type: 'article' | 'map' | 'object' | 'folder' | 'project'; id: string; rule?: Rule }
  | { kind: 'msg'; title: string; content: string }
  | { kind: 'jump'; to: string; rule?: Rule }               // 'a:<anchor id>' or 'h:<index>:<slug>'
  | { kind: 'anchor'; id: string }
  | { kind: 'person'; personId: string; rule?: Rule }
  | { kind: 'project-url'; url: string; rule?: Rule }       // another person's project (Follow's URL input)
export type Rule = { id: string; text: string }             // the autolinker that made it

export const LINK_PREFIX = '#mapl:'
export function toHref(link: ArticleLink): string            // '#mapl:k=object&ty=article&id=12&a=r7&t=Athens'
export function fromHref(href: string | null | undefined): ArticleLink | null   // null: not ours / unknown kind / bad values
```

- Short keys (`k`, `ty`, `id`, `u`, `ti`, `c`, `to`, `p`, `a`, `t`), `URLSearchParams` for the encoding, a version-free format
  (unknown keys ignored, so a later field doesn't break old links).
- `fromHref` validates: `u` passes `isSafeLink` and has a scheme `http(s):`; ids are `[\w-]{1,40}`; lengths capped (D15).
- `newId()` (8 base-36 chars) for anchors and rules.

## 4 — Third row (`features/articles/links/LinkRow.tsx`, used by `ArticleToolbar`)

`ArticleToolbar` renders `<LinkRow editor={editor} articleId={…} />` after the second row (shown even when the second row is hidden).
Buttons use the existing `TextButton` (icon + name) with a `small` prop; all keep the caret (`onMouseDown` preventDefault).
Every button except Autolinker is **disabled with an empty selection** (tooltip "Select some text first"); on a selection that is
already that kind of link it opens on its values with **Remove**.

| Button | Icon | Popout (`BarPopover`, under the row) |
|---|---|---|
| Real link | `LuExternalLink` | `TextField` Address, `TextField` Name (default: the selected text; changing it replaces the text), Apply / Remove |
| Article link | `LuFileSymlink` | `ObjectPicker` (§5) |
| Message | `LuMessageSquareText` | `TextField` Title, `TextAreaField` Content, Apply / Remove (§7) |
| Jump link | `LuCornerDownRight` | `JumpPicker` (§8) |
| Follow | `LuUserPlus` | `FollowPicker` (§9) |
| Autolinker (right end, `ms-auto`) | `LuWandSparkles` | `AutolinkPanel` (§10), `aria-pressed` |

Each popout body is its own component taking `{ editor, value?, onApply(link), onRemove? }` so the Autolinker can reuse them
(§10). Applying: `setArticleLink(editor, link)` = `extendMarkRange('link').setLink({ href: toHref(link) })` (for Real link also
replaces the text with the Name).

## 5 — Article link picker (`ObjectPicker.tsx`, `objectSearch.ts`)

- Top: kind chips (`Button variant="ghost" size="sm"`, `selected` for the chosen one): All, Article, Map, Object card, Folder,
  Project — from the registry (`resourceByName`), each with its `ui.icon`. Then `SearchInput`.
- List: rows (icon, title, parent as subtitle) like `features/objects/ListRows.tsx`, keyboard ↑ ↓ Enter; the current article is left out.
- `searchObjects(kind, query, cursor)`: for one kind, `resource.api.list({ archived: false }, { limit: 30, cursor })`, filters by
  `fold(title)` (`features/search/search.ts`); for All, one cursor per kind, merged by title. An `IntersectionObserver` on the last
  row asks for the next page; while a query has < 15 matches and pages remain, the next page is read (max 5 pages per query, then
  "Keep searching" button). Results are cached per kind in the hook (not the shared `listStore`, so the sidebar's lists don't grow).
- Pick → `{ kind: 'object', type, id }`; clicking the link later opens it with `workspace.open({ type: panelType, id })`.

## 6 — Hover card (`LinkHoverCard.tsx`, `linkPreview.ts`)

- One per article page; a delegated `pointerover` on the editor's DOM finds `a[href^="#mapl:"]`; after 350 ms it shows a card
  **above** the link (reuse `hoverInfoPosition` with side `top`, flips when it doesn't fit), in the top layer (`popover="manual"`
  like `HoverInfo`), pointer can move onto it (closes 150 ms after leaving both).
- Content from `linkPreview(link)`:
  - object → `useResourceItem(resource, id)`: picture (article: `infobox.image ?? infobox.banner`; map: `MapPreview`; object card:
    its image; folder / project: their icon on `placeholderArt`), title, the first ~160 chars of its text (`toPlainText` from
    `@map/shared` plain-text);
  - url / project-url → name, domain, placeholder picture (D9);
  - msg → title and the start of the content; jump → the target heading / anchor text and the first line after it;
  - person → avatar, name, followers count (mock), Follow button.
- Not shown for anchors, nor while selecting text or dragging.

## 7 — Message (`MessageForm.tsx`, `MessagePanel.tsx`)

- Form: Title + Content (D15). Stored only in the href.
- Clicking a message link opens `MessagePanel` **in the right column of the article body** (the same float column as the Info box,
  stacked under it when both show; on a narrow panel it opens over the text's right side). Shows title, content (new lines kept),
  ✕ to close, and in edit mode "Edit" which opens the Message popout on that link. Only one message open at a time; Esc closes it.

## 8 — Jump link (`JumpPicker.tsx`, `JumpGutter.tsx`)

- `anchorsAndSections(doc)`: the headings (level, text, index) and the anchors (id, text), in document order.
- JumpPicker: that list, each row with its mark at the left (§ for a heading, ⚑ for an anchor) and indented by level; a search
  field filters it; **"Mark a place…"**: closes the popout and the next selection in the text becomes an anchor (a small banner
  "Select the place to jump to · Cancel"), then the jump link is made to it.
- Click on a jump link → find the target (anchor by id, heading by slug, ties by index) → `scrollIntoView({ block: 'start' })`
  and a short flash (`animations.css`). Missing target → the hover card says "The place is gone"; the link stays.
- `JumpGutter`: absolutely placed small marks in the text's left padding, one per heading or anchor that some jump link points to,
  positioned from `editor.view.coordsAtPos` (recomputed on doc change / resize, `ResizeObserver`). Clicking a mark scrolls to its
  target and shows how many links point to it in its tooltip. They are `IconButton size="sm"` (no new raw button).

## 9 — Follow (`FollowPicker.tsx`, `features/people/mockPeople.ts`)

- Mock data: `Person = { id, name, handle, avatar (placeholderArt seed), bio, projects: { id, title }[] }`, ~12 people;
  `followStore` (localStorage `map:following`) with `follow / unfollow / isFollowing / useFollowing`. `usePeople(query)` returns a
  Promise-like hook so swapping to an API later only changes this file.
- FollowPicker: tabs **Followers** (the mock followers list, with search) and **Project URL** (`TextField` "Link to someone's project",
  checked with `isSafeLink` + http(s)). Picking a person → `{ kind: 'person', personId }`; a URL → `{ kind: 'project-url', url }`.
  Each person row also has Follow / Unfollow.
- Clicking a person link opens a small `PersonCard` popout (avatar, name, bio, their projects, Follow / Unfollow); clicking a
  project-url link opens it in a new tab.

## 10 — Autolinker (`AutolinkPanel.tsx`, `autolink.ts`)

- **On**: the row's five buttons get a joined look (one bracket line under Real link … Follow, Message dimmed and skipped, D10),
  and one wide `BarPopover` opens under the row: on top **one big input** "Text to link" (default: the selection's text), then
  the four pickers **side by side** as connected columns (Real link | Article link | Jump link | Follow), reused from §4–§9 in a
  `compact` mode. Choosing a target in any column makes a **rule** `{ id, text, link }`; Apply links every occurrence.
- `occurrences(doc, text)`: whole-word, case-insensitive (accents folded), not inside code, not already inside another link.
  `applyRule(tr, rule)`: adds the Link mark with `toHref({ ...link, rule: { id, text } })` on each. New text: the `Autolinker`
  plugin (`appendTransaction`) checks only the changed ranges against the rules found in the doc (Risk 4).
- **The list** (under the input, in the same panel): a grid of **two rules per row**. Each: the text, the target's icon and name,
  occurrence count, **Go there** (`LuLocateFixed`, D7: scroll + flash, then the next one, "2 / 5"), **Edit** (loads it into the
  input and the right column; Apply rewrites all its links), **Delete** (removes the mark from all its links, keeps the words).
- **Import from other articles** (button at the top of the list): an `ObjectPicker` limited to articles; picking one reads its
  `content` (`resource.api.get`), `rulesFrom(parse(content))` lists its rules with checkboxes, Import applies the ticked ones here
  (new rule ids; duplicates by text are skipped, and say so). Jump rules are not imported (their targets belong to the other article).
- `rulesFrom(doc)`: groups the links by `rule.id` → `{ id, text, link, count }`.

## 11 — Title line: Privacy, Share, ⋯ (`ArticlePanel.tsx`)

- **Info** moves into the ⋯ menu: `IconMenu groups={[...menuOf(...), [{ label: 'Info box', icon: LuInfo, checked: infoShown,
  onClick: toggle }, { label: 'Search in article', icon: LuSearch, onClick: openFind }]]}` (the `checked` item already exists in
  `IconMenu`).
- In Info's place: `PrivacyButton` (`Button variant="ghost" size="sm" plain`, D18 icon + "Private" / "Public"). Opens
  `PrivacyModal` (`Modal size="sm"`): two choices (Private: only you; Public: anyone with the link) as `OptionRowPicker`-style rows,
  and **Allow certain people** → a people list (same `usePeople`) with search and checkboxes, chips of the allowed ones. Saved at once
  in `privacyStore` (D8). A note at the bottom: "Saved on this device for now".
- Share: rendered only when `privacy.visibility === 'public'`.
- `privacyStore.ts`: `type ArticlePrivacy = { visibility: 'private' | 'public'; allowed: string[] }`, default private,
  `useArticlePrivacy(id)` → `[privacy, setPrivacy]` (`useSyncExternalStore` over localStorage `map:privacy:<id>`, try / catch like
  `INFO_SHOWN_KEY`).

## 12 — Search in article (`FindBar.tsx`, `FindHighlight` in `linkExtensions.ts`)

- Opens under the toolbar (sticky with it): `SearchInput`, "3 / 12", ↑ ↓ (`IconButton`), ✕; Enter / Shift+Enter step, Esc closes.
- `FindHighlight`: a ProseMirror plugin with decorations for every match (folded like `fold`) and a stronger one for the current;
  stepping selects and scrolls to it. Ctrl/Cmd+F inside the article opens it (not the browser's).

## Testing

- Unit (`npm run test --workspace app`):
  - `linkHref.test.ts`: every kind round-trips; unsafe / non-http URLs, bad ids, too long values → `null`; output passes
    `isSafeLink` **and** survives `sanitizeHtml` from `@map/shared` unchanged (the key check for D2).
  - `autolink.test.ts`: occurrences (whole words, case, accents, skips code and existing links), apply, rulesFrom, delete.
  - `jumpTargets.test.ts`: sections / anchors listing, heading resolution with duplicate titles.
  - `objectSearch.test.ts`: paging stops at the cap, merging kinds, filtering with a fake `api.list`.
  - `privacyStore` / `followStore`: default, set, broken localStorage.
  - `buttons.test.ts` passes (any new raw clickable listed in `ALLOWED` with its reason).
- Manual (`npm run dev`, live API): make each kind of link, **reload the page and check it is still there** (proves the sanitizer
  keeps it); hover each kind; Message opens at the right; Jump scrolls and gutter marks follow edits; Follow / Unfollow; the
  Autolinker links all occurrences, links new typing, Go there steps through, Edit / Delete, Import from another article; Privacy
  modal switches Share on / off and survives a reload (same device); Search in article; narrow pane; notes still edit as before.
- `npm run build --workspace app`.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Link format: `ArticleLink`, `toHref` / `fromHref`, `newId` + tests (incl. sanitizer round trip) | `features/articles/links/linkHref.ts`, `.test.ts` |
| 2 | Link styles by kind and click interception (`openOnClick: false`, `LinkClicks` plugin) | `links/linkExtensions.ts`, `styles/typography.css`, `ArticlePanel.tsx` |
| 3 | Third row shell: `LinkRow` with the five buttons + Autolinker, small size, gap | `links/LinkRow.tsx`, `ArticleToolbar.tsx` |
| 4 | Real link form | `links/RealLinkForm.tsx` |
| 5 | Object search seam + `ObjectPicker` (chips, search, paging) + tests | `links/objectSearch.ts`, `links/ObjectPicker.tsx` |
| 6 | Message form + `MessagePanel` in the right column | `links/MessageForm.tsx`, `links/MessagePanel.tsx`, `ArticlePanel.tsx` |
| 7 | Jump: targets, `JumpPicker`, "Mark a place", `JumpGutter` + tests | `links/jumpTargets.ts`, `links/JumpPicker.tsx`, `links/JumpGutter.tsx` |
| 8 | Mock people + follow store; `FollowPicker`, `PersonCard` | `features/people/mockPeople.ts`, `links/FollowPicker.tsx`, `links/PersonCard.tsx` |
| 9 | Hover card + `linkPreview` seam | `links/LinkHoverCard.tsx`, `links/linkPreview.ts` |
| 10 | Autolinker: `autolink.ts` + tests, plugin, `AutolinkPanel` (big input, joined pickers, two-per-row list, Go there / Edit / Delete, Import) | `links/autolink.ts`, `links/AutolinkPanel.tsx`, `links/linkExtensions.ts` |
| 11 | Privacy store, `PrivacyButton` (lock animation), `PrivacyModal` (public / private, allow people); Share only when public | `features/articles/privacy/*`, `styles/animations.css`, `ArticlePanel.tsx` |
| 12 | ⋯ menu: Info box toggle + Search; `FindBar` + `FindHighlight` | `ArticlePanel.tsx`, `links/FindBar.tsx`, `links/linkExtensions.ts` |
| 13 | Docs: the link format and the backend seams (short section) | `instructions/` (new `article-links.md`) |
| 14 | Tests, build, manual check (with reloads) | — |

Files **not** touched: everything in `backend/`, `packages/shared/` (sanitizer, data config, fields), the DB migrations,
`lib/api/mockApi.ts` and `resources.config.ts` (no new field), `RichTextEditor.tsx`'s base set for notes (the article passes its
own extensions), `styles/buttons.css` (no new button looks).

## Open items

- Autolinker on typing (Risk 4): if it fights undo / the caret, is "apply on Apply and on leaving the text" enough?
- The joined look of the five buttons when Autolinker is on: a line under them, or one shared border around them? (A quick mock in
  the first implementation step.)
- Should Message links be autolinkable later after all, or never (D10 says never)?
- When the backend comes: do links stay in the href (D2) or move to link records with only an id in the href?
