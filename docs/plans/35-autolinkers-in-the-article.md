# 35 — Autolinkers as a field of the article

**Goal:** an article's autolinkers (their phrases and where they link) are kept in a JSON field `autolinkers` of the article, saved with its
text in the same request, instead of being read back from the links in the text. An autolinker whose phrases are written nowhere is no
longer lost, an article's autolinkers come with the article (no extra request) and a save of the text and of the autolinkers is one
write, so they cannot disagree.
**Depends on:** 26 (config-driven tables), 31 (article links), 34 (version / conflicts of shared tables, `ownedRepo`).
**Not in this plan:** a table of autolinkers, reusing an autolinker in other articles, applying migrations or deploying, any request to the
live server, autolinkers for any other table.

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | Autolinkers become a **JSON field of the article** (not a table) |
| U2 | An autolinker is: an id, its phrases (the link words), the link it makes, and who made it |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | The field is `autolinkers`, a list of `{ id, phrases, link, by }`. `phrases` (the name the code already uses) = the link words; `link` is an `#mapl:` href **without** its rule keys (`a`, `t`); `by` = the id of the user who made it (no foreign key) | One parser for links (`linkHref.ts`); the text's links keep `a`/`t` as today, so existing links still belong to their rule |
| P2 | **The rule's id in the field = the `a` key of its links in the text** | Nothing in the text is rewritten; old and new rules are the same thing |
| P3 | Limits: at most **50** autolinkers, **20** phrases each, a phrase ≤ `LIMITS.ruleText` (100), a link ≤ `LIMITS.url` + 100. A phrase is in one autolinker only (accents / case ignored); ids are unique | The row stays small (worst case ≈ 150 KB); the check the panel makes today is now the server's too |
| P4 | The server accepts only links an autolinker can make: `url`, `object`, `jump`, `person`, `project-url` (`AUTOLINKABLE`), without a rule | A message or an anchor can't be an autolinker (already the case in the panel) |
| P5 | **The text and the field are saved in the same `PATCH`**: the panel changes both in the same tick, the autosave sends one request, one UPDATE | No drift between a rule and its links |
| P6 | **An autolinker stays until it is deleted.** Taking a link out of the text by hand does not delete its rule: the phrase is linked again when it is typed again (Delete the autolinker to stop that) | The point of the change; it differs from today, where a rule with no links disappears |
| P7 | **Autolinkers already in the text are adopted** when an editor opens the article: a rule (`a` id) found in the links and not in the field is added to it, then saved once (`adoptRules`) | No data migration; articles are converted as they are opened (like the old messages) |
| P8 | `autolinkers` is **left out of lists** (`omitFromLists` in the table config) and **out of a reader's copy** of the article (`editorFields`) | Lists would carry up to 150 KB per article for nothing; a reader never uses it (the links are in the text) |
| P9 | "Import from other article" reads the other article's `autolinkers` (it already reads that article); when that is empty (not opened since this change) it reads its text as it does now | Keeps working on articles that were not converted yet |
| P10 | Undo (Ctrl+Z) undoes links in the text, not the field | The field is not part of the editor's history; a rule is deleted from the panel |

## 1 — Risks and blockers

1. **Migration shape.** `drizzle-kit generate` must only write `ALTER TABLE articles ADD autolinkers …`. Migration 0011 was hand-edited
   because it wanted to rebuild `articles` (infobox default); its snapshot has the new default now, so it should not again. Read the SQL;
   if it writes `__new_articles`, stop.
2. **The text and the field change in the same tick** (`applyRule` on the editor, then the rules): if the autosave's 30 s timer fired exactly between
   the two `change` calls, two requests would be sent. Both calls go through one `change(name, value)` of the page that merges the values
   synchronously, so the second call always carries both; the worst case is one extra save, never a lost one.
3. **Two editors changing autolinkers at once** conflict as a whole list (the `version` 409 modal of plan 34). Accepted: it is rare, and nothing is overwritten silently.
4. **`linkHref.ts` moves to the shared package** (the server must parse the links). Every import in the app keeps working through a
   re-export; its test moves with it.
5. Applying the migration and deploying are the user's (§8). Until then nothing of this can be tried against the live API.

## 2 — Approach

```
article row (articles.autolinkers, JSON text)
   │ GET /api/articles/:id  (editors and owner; a reader's copy leaves it out)
   ▼
ArticlePage: rules state ◄── start.values.autolinkers (also when "Use the saved version" restarts the page)
   │  ├─► Autolinker extension (typing)      reads rules through handlers.current.rules()   (no more rulesFrom(doc))
   │  └─► AutolinkPanel (list, Add New, Edit, Delete, Import)   setRules(next) + applyRule/removeRule on the editor
   ▼
change('autolinkers', json) + the editor's change('content', html)  → one autosave → one PATCH { content, autolinkers, baseVersion }
```

The text keeps its links exactly as now (`#mapl:k=…&a=<rule id>&t=<phrase>`): they are what shows, what the hover card reads and what "Go there" finds.
The field is what the Autolinker applies while typing and what the panel lists.

## 3 — Shared (`packages/shared`)

- `src/link-href.ts`: **moved from the app** (`app/src/features/articles/links/linkHref.ts`; it only imports `isSafeLink` from `rich-text-policy`).
  Exported from `index.ts` and as `@map/shared/link-href`. The app's `linkHref.ts` becomes `export * from '@map/shared/link-href'`, so no import in the app changes.
  `linkHref.test.ts` moves with it (its `sanitizeRichText` round trip stays).
- `src/autolinkers.ts`:
  - `autolinker = z.object({ id, phrases, link, by })`: `id` as the rules' ids (`ID`: `[\w-]{1,40}`); `phrases` 1–20 strings, trimmed, 1–100 chars; `link` a string that `fromHref` reads as an `AUTOLINKABLE` kind
    with no `rule`; `by` a string ≤ 100 (may be empty for adopted rules whose maker is unknown).
  - `autolinkers = z.array(autolinker).max(50)` with refinements: unique ids; a phrase (folded: NFD without diacritics, lower case) in one autolinker only.
  - `type Autolinker`, `EMPTY_AUTOLINKERS = []`.
- `data.config.ts`: `articles.fields.autolinkers = field.json(autolinkers, EMPTY_AUTOLINKERS)`; `omitFromLists: ['autolinkers']`; `editorFields: ['autolinkers']`.
- `table.ts`: two optional config keys (`omitFromLists`, `editorFields`: field names). `ListItemOf` omits `omitFromLists`' fields (like `preview`'s source); `ItemOf` marks `editorFields` as optional (a reader's copy has none).
- Tests: `autolinkers.test.ts` (accepts the five kinds; refuses a message / anchor / rule-carrying link / `javascript:` link, 51 autolinkers, 21 phrases, a phrase in two autolinkers with different case or accents, duplicate ids), the moved `linkHref` tests, `table.test.ts` (the new keys).

## 4 — Backend

- `lib/ownedTable.ts`: nothing (a `json` field becomes `text NOT NULL DEFAULT '[]'` by itself).
- `lib/ownedRepo.ts`:
  - `listColumns` leaves out `config.omitFromLists` as well as `preview` (those columns are not read);
  - `toJson` for a shared table deletes `config.editorFields` when `access === 'reader'`.
- Migration `backend/drizzle/0013_article_autolinkers.sql` from `npx drizzle-kit generate --name article_autolinkers`: one `ALTER TABLE articles ADD autolinkers text DEFAULT '[]' NOT NULL`. Read, not applied.
- `migrations.test.ts`: an old article row gets `'[]'` after 0013.
- Reads / writes: none added. A save that changes `autolinkers` is one UPDATE like any change of a field (raises `version`, as plan 34 says). A row is up to ≈150 KB bigger in the worst case.

## 5 — App

### 5.1 State and saving (`features/articles/ArticlePanel.tsx`)

- `articleValues` adds `autolinkers: JSON.stringify(item.autolinkers ?? [])` (like `infobox`); `articlePatch` parses it back.
- The page keeps **one** `latest` values object (today `ArticleBody` has it) and a `change(name, value)` that merges and calls `autosave.change`; `ArticleBody` gets
  `change` as a prop instead of owning `latest`. It is reset with `autosave.start` (the same `key={autosave.start.version}` that restarts the body).
- `rules` state of the page, from `start.values.autolinkers` (parsed, links read with `fromHref`; an entry whose link no longer parses is dropped);
  `setRules(next)` = `setRules` + `change('autolinkers', JSON.stringify(...))`. A reader has none and never edits.
- `handlers.current` (already updated every render) gets `rules: () => AutoRule[]`.
- `adoptRules` runs once when the editor exists and the user can edit (the same place as `useLegacyMessages`): `autolink.ts` `adoptRules(rules, doc, me)` adds the rules found in the text's links that the field
  does not have (`by: me`) and answers the same list when there is nothing to add (no state change, no save). Called once; if it adds, `setRules` saves.
  *Not when the article is a reader's.*

### 5.2 The Autolinker extension (`links/linkExtensions.ts`)

`rulesFrom(state.doc)` → `handlers.current.rules()`, mapped to the `{ id, text, link }` that `applyRule` takes. Nothing else in the extension changes: typed words are
linked as before, `LINK_EDIT` transactions are still skipped.

### 5.3 The panel (`links/AutolinkPanel.tsx`)

- Props: `rules: AutoRule[]`, `onRules: (next: AutoRule[]) => void`, and the user's id. The `rulesFrom` `useEditorState` goes; the list shows `rules`.
  `count` is no longer stored: the row shows how many places are linked, computed from the editor when the panel renders (`ruleRanges(...).length`), not saved.
- `save`: builds the rule (`id` = `editing ?? newId()`, `phrases`, `link`, `by` = the user's id when new, the old one when editing), `onRules(replace or add)`, then `applyRule` as now
  (so the same tick changes the text). The "already has an autolinker" notice now reads the field. A rule with no places in the text is **kept** (the notice says so).
- `remove`: `onRules(without)` and `removeRule` (the links go; the words stay).
- Limits shown in the form: 50 autolinkers / 20 phrases (the panel stops at them with a message instead of the server's 400).
- `ImportModal`: reads `autolinkers` of the chosen article (P9).
- `LinkRow.tsx` passes the props through; `ArticlePanel` gives it the page's `rules`.

### 5.4 Pure code (`links/autolink.ts`)

- `AutoRule` = `{ id, phrases, link: ArticleLink, by }` plus the optional `count` for display; `rulesFrom(doc)` stays (it is `adoptRules`' source and the legacy import's).
- New: `adoptRules`, `toStored(rules)` / `fromStored(json)` (the field ⇄ `AutoRule[]`, dropping what does not parse).

### 5.5 Docs

`instructions/article-links.md` ("Autolinkers" and the file list), `instructions/data-config.md` (`omitFromLists`, `editorFields`), a line in `docs/plans/31` not needed.

## 6 — Edge cases checked

| Case | What happens |
|---|---|
| Rule with phrases written nowhere | Kept; links appear when a phrase is typed |
| Link taken out of the text by hand | Rule stays; the phrase is linked again when typed again (P6) |
| Rule deleted in the panel | Field and text links go in the same save |
| Text save fails (network) | Both stay in the draft on this device (one values object) and are sent together on retry |
| Two tabs / two editors | 409 modal of plan 34 for the whole article; "Use the saved version" restarts the page with the server's rules |
| Article not converted yet, a reader opens it | The text's links work; the reader has no rules and needs none |
| Article not converted yet, an editor opens it | `adoptRules` adds the text's rules once and saves once |
| Rule's link target later archived or deleted | As a link in the text today: the hover card says it is gone; the rule stays |
| A phrase in two rules (two tabs, a hand-made request) | The server answers 400 (`autolinkers`), the page shows the error as for any failed save |
| Very old draft on a device (no `autolinkers`) | `changedFields` only compares the fields it has; the missing one is "not changed" |

## 7 — Testing

All local, no request to any server.
- `packages/shared`: §3 tests.
- `backend`: `ownedRepo` suite runs for `articles` with the new field (create / update / read back); `access.test.ts` for articles: a reader's copy has no `autolinkers`, an editor's does; `list` has none for anyone;
  an update with an invalid `autolinkers` is refused by the contract; the migration test.
- `app`: `autolink.test.ts` for `adoptRules` (adds only unknown ids, keeps the field's own, no-op returns the same list), `toStored` / `fromStored`; `autolinkers` in `articleValues` / `articlePatch` (a small pure test: the JSON round trip and an old item without the field).
- Checks: `npx tsc --noEmit && npx vitest run` in `packages/shared` and `backend`; `npx tsc -b && npx vitest run && npx oxlint src` in `app`.
- Not covered by automated tests (no component tests in the project): the page's lifted `change`, typing with the Autolinker, the panel. To try by hand after the migration and a deploy.

## 8 — What the user runs (after review; not part of the build)

```
cd backend
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote     # after reading 0013
npm run deploy
```

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Move `linkHref` (and its test) to shared; re-export from the app | `packages/shared/src/link-href.ts`, `link-href.test.ts`, `index.ts`, `package.json` (exports), `app/src/features/articles/links/linkHref.ts` |
| 2 | `autolinkers` schema + tests | `packages/shared/src/autolinkers.ts`, `autolinkers.test.ts`, `index.ts` |
| 3 | `omitFromLists` / `editorFields` in the table config and types; `articles.autolinkers` | `packages/shared/src/table.ts`, `data.config.ts`, `table.test.ts` |
| 4 | `ownedRepo`: list columns and reader's copy | `backend/src/lib/ownedRepo.ts`, `ownedRepo.suite.ts` / `access.test.ts` |
| 5 | Migration 0013 (read, not applied) + test | `backend/drizzle/0013_*.sql`, `meta/`, `backend/src/db/migrations.test.ts` |
| 6 | List items without the omitted fields on the app side | `app/src/resources/createResource.ts` (`toItem`) |
| 7 | Pure code: `adoptRules`, `toStored` / `fromStored`, `AutoRule` + tests | `app/src/features/articles/links/autolink.ts`, `autolink.test.ts` |
| 8 | Page state: lifted `change`, `rules`, `adoptRules` on open, `handlers.rules`, `articleValues` / `articlePatch` | `app/src/features/articles/ArticlePanel.tsx` |
| 9 | Autolinker extension reads the rules from the page | `app/src/features/articles/links/linkExtensions.ts` |
| 10 | Panel: rules from props, save / remove / import, limits | `app/src/features/articles/links/AutolinkPanel.tsx`, `LinkRow.tsx` |
| 11 | Docs | `instructions/article-links.md`, `instructions/data-config.md` |
| 12 | All checks of §7 | — |

Files **not** touched: the auth code (`backend/src/auth.ts`, `db/auth-schema.ts`, `middleware/auth.ts`, `app/src/lib/auth-client.ts`, `features/auth/`),
existing migrations `0000`–`0012`, `docs/plans/33` and `34`. No `wrangler d1 …`, no deploy, no request to the live server.

## Open items

1. P1–P10 are defaults: say which to change. The most worth a second look: **P6** (a rule outlives its links), **P8** (a reader's copy has no `autolinkers`) and the **limits** of P3.
2. Should `by` show the maker's name in the panel? It needs a name lookup (one read per distinct maker) or a name copied into the rule when it is made; this plan stores only the id and shows nothing.
