# 33 — Messages and object rights (backend + article page)

> **For review later. Nothing here is decided or to be taken for granted.** This is a proposal written from a conversation, to be read,
> questioned and corrected before any code is written. Every table, field, route, cost and file name below can change. The questions in
> §9 must be answered first.

**Goal:** two new server tables, **`messages`** (the article's messages, now records) and **`object_rights`** (who else may read or edit an
object), the backend that uses them, and the article page wired to them. A message link in the text keeps only the message's id
(`#mapl:k=msg&id=42`); its title and text come from the server. Built on what exists: the data config, `ownedRepo`, `crudRoutes`, the
shared contract, the API client, the autosave and its conflict modal, the privacy panel, the message panel and form.
**Depends on:** 30 (article page), 31 (article links and privacy, mock), 26 (config-driven tables).
**Not in this plan:** running migrations, any request to the real server (the SQL file is generated and read only), Follow / people's
profiles, server search of objects, replies to messages.
**Main constraint:** as few D1 reads and writes as possible (§6).

## 0 — Decisions so far

| # | Decision | Source |
|---|---|---|
| D1 | **Anyone who can read the article can create a message** (signed in: a message needs its author) | User |
| D2 | **The rights are the two switches of the privacy panel** (Read, Edit): stored as one `role`, `reader` or `editor` (editing needs reading, as `withSwitch` already says) | User |
| D3 | **The owner has no row in `object_rights`**: the owner is the object's own `user_id` | User |
| D4 | **Only an editor (or the owner) approves** a message | User |
| D5 | **An editor's own messages are approved at once** | User |
| D6 | **Message content is plain text** (title ≤ 100, content ≤ 2000, as `LIMITS` in `linkHref.ts` today) | User |
| D7 | **Deleting the linked words deletes the (approved) message**; **old messages** (title and text inside the href) **are dropped** — the words stay | User (to confirm, §9 Q1) |
| D8 | **A deleted author shows as "Deleted user"** (`user_id` becomes NULL) | User |
| D9 | **Rights apply to articles and to other objects**, but are **not inherited** (a right on a folder is not a right on what is inside it) | User |
| D10 | **The article routes change** so readers and editors can open and save a shared article | User |
| D11 | **No replies** to messages | User |
| D12 | **`created_at`** (not `created_ad`) | User |
| D13 | **"Shared with me" list now** | User |
| D14 | **The message id goes in the href** (`#mapl:k=msg&id=<id>`): the sanitizer keeps only an `<a>`'s `href`, no `data-*` | Code |
| D15 | **Messages and rights are not tables of the data config** (`DATA`): they are not "rows of their owner". They are hand-written resources, like `images` | Proposal |
| D16 | **Sharing is a flag of the data config** (`share: true`): it gives a table the `visibility` column and makes `ownedRepo` check rights. Articles first | Proposal |
| D17 | **Approval happens when an editor saves the article with the message's link in it.** No separate approve request (§4.4) | Proposal |
| D18 | **The messages come with the article** (`GET /api/articles/:id`): opening a message is not a request | Proposal |

## 1 — How it works today (what this plan builds on)

- `packages/shared/src/data.config.ts` → `ownedTable` (columns), `ownedRepo` (queries, every one filtered by `user_id = me`),
  `crudRoutes` (routes, `access: 'owner'`). Someone else's row behaves like a missing one (404).
- A message is only HTML: `#mapl:k=msg&ti=<title>&c=<content>` (`app/src/features/articles/links/linkHref.ts`). `MessageForm`
  (`LinkForms.tsx`) writes it, `MessagePanel.tsx` shows it, `side/MessagesList.tsx` lists the article's message links.
- Privacy and people are mocks on the device: `privacyStore.ts` (`ArticlePrivacy = { visibility, allowed: { id, role }[] }`),
  `mockPeople.ts`. The reader / editor view is a URL mock: `useArticleRole` (`?as=reader`).
- The autosave (`useItemAutosave`, `lib/resource/autosave.ts`) finds a conflict **only when a page opens** (a draft on this device made
  from an older `updatedAt`), and `ItemConflictModal` asks which one stays. The server checks nothing.
- `updated_at` is stored in **whole seconds**.

## 2 — Tables

### `messages`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | written in the link's href |
| `article_id` | integer NOT NULL → `articles.id` ON DELETE CASCADE | |
| `user_id` | text NULL → `user.id` ON DELETE SET NULL | NULL = "Deleted user" (D8) |
| `title` | text NOT NULL default '' | ≤ 100, plain text |
| `content` | text NOT NULL default '' | ≤ 2000, plain text |
| `quote` | text NOT NULL default '' | ≤ 200: the words it was written on, so an editor can place a reader's message (§4.3) |
| `approved_by` | text NULL → `user.id` ON DELETE SET NULL | NULL = waiting for approval |
| `approved_at` | integer (timestamp) NULL | set with `approved_by`; stays if the approver's account is deleted, so "approved" = `approved_at IS NOT NULL` |
| `created_at`, `updated_at` | integer (timestamp) | the same helpers as every table (`ownedTable.ts`: `createdAt()`, `updatedAt()`) |

- CHECK: `title <> '' OR content <> ''`.
- One index: `messages_article_idx (article_id)`.
- No `archived`, `pinned`, `position`: not in the Trash, not ordered by hand (newest last, by `id`).

### `object_rights`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `object_type` | text NOT NULL, CHECK in the shareable types | the same names as the link types (`article`, …) |
| `object_id` | integer NOT NULL | no foreign key possible (several tables): cleaned up by the object's delete (§3.3) |
| `user_id` | text NOT NULL → `user.id` ON DELETE CASCADE | |
| `role` | text NOT NULL, CHECK in (`reader`, `editor`) | |
| `created_at` | integer (timestamp) | |

- UNIQUE `object_rights_object_user (object_type, object_id, user_id)`: one row per person and object; also the index of every access check.
- Index `object_rights_user_idx (user_id)`: "Shared with me" (D13). Rights change rarely, so its extra write is cheap.
- No `updated_at`: a change of role is rare and not shown. (Question §9 Q9.)

### New column on each shareable table

- `visibility` text NOT NULL default `'private'`, CHECK in (`private`, `public`): added by `ownedTable` when the config says `share: true`
  (like `preview`). Articles first; which other tables, §9 Q2.

### Files

- `backend/src/db/schema.ts`: `messages`, `objectRights` (hand-written, like `images`), the `share` flag read by `ownedTable`.
- One migration from `npx drizzle-kit generate` (`backend/drizzle/0011_…sql`), **generated and read, not applied** (no `--local`,
  no `--remote` in this plan). `migrations.test.ts` must pass with it.

## 3 — Backend

### 3.1 Shared contract (`packages/shared`)

- `src/links/linkHref.ts`: **moved from the app** (it has no browser imports), so the server reads links with the same parser. The
  app's `features/articles/links/linkHref.ts` re-exports it, so no import in the app changes. `msg` becomes `{ kind: 'msg', id }`
  (`#mapl:k=msg&id=<digits>`); an old `ti=`/`c=` message parses as `null` (a plain word).
- `messageIdsOf(html)`: the message ids of a text, each once (the server's half of `linkRanges`).
- `src/messages.ts`: zod `messageInput { title, content, quote }`, `messageUpdate { title?, content? }`, type `Message`
  (`{ id, articleId, author: { id, name, image } | null, title, content, quote, approved, createdAt, updatedAt }`).
- `src/rights.ts`: `Role = 'reader' | 'editor'`, `Access = 'owner' | Role`, `SHAREABLE_TYPES`, zod `rightsPatch`
  (`{ visibility?, set?: { userId, role }[], remove?: userId[] }`), type `Right` (`{ user: { id, name, image }, role }`).
- `table.ts` / `data.config.ts`: the `share?: true` flag; `articles` gets it. The update contract of a shared table accepts
  `baseUpdatedAt` (§3.4).
- `errors.ts`: a `CONFLICT` code (409).

### 3.2 One access check (`backend/src/lib/access.ts`)

`accessOf(ctx, type, id)` → `{ row, access: 'owner' | 'editor' | 'reader' } | null`, in **one query**:

```sql
SELECT t.*, r.role FROM <table> t
LEFT JOIN object_rights r ON r.object_type = ? AND r.object_id = t.id AND r.user_id = ?
WHERE t.id = ?
```

- owner: `t.user_id = me` · else the right's `role` · else `reader` when `visibility = 'public'` · else null.
- null, or archived and not the owner → **404**, never 403 (nobody learns the object exists).
- Anonymous: only public objects, if §9 Q3 says so.

### 3.3 `ownedRepo` for shared tables (`share: true`)

- `get`: through `accessOf` (the row comes back from the same query: no extra read). The JSON gets `access` (the caller's).
- `update`: editor or owner. **An editor may not change** `pinned`, `position`, `objectType`, `objectId`, `archived`, `visibility`
  (they are the owner's dashboard, sidebar and sharing) → 403 if the patch has them.
- `create`, `list`, `remove`: owner only, as today. `remove` also deletes the object's `object_rights` rows (in the same batch as
  `orphanChildren`) and, for articles, the messages go by the foreign key.
- `crudRoutes`: the shared table's `GET /:id` uses `optionalAuth` only if anonymous readers are allowed (§9 Q3).

### 3.4 Saving a shared article (the text and its messages)

`PATCH /api/articles/:id` with `{ …fields, baseUpdatedAt }`:

1. `UPDATE … WHERE id = ? AND updated_at = :baseUpdatedAt` (+ the access condition). 0 rows and the row exists → **409 CONFLICT**:
   the app opens `ItemConflictModal`. No read before the write. (Seconds only: §8 R1.)
2. Only when `content` is in the patch: one read `SELECT id, approved_at FROM messages WHERE article_id = ?` (the index), then with
   `messageIdsOf(content)`:
   - a link whose id is not this article's message (copied from another article, deleted, guessed) → **the link is taken out of the
     content, the words stay** (before the write in step 1, so the text is written once);
   - waiting messages whose link is now in the text → **approved** by the saver (one `UPDATE … WHERE id IN (…) AND approved_at IS NULL`);
   - approved messages whose link is gone → **deleted** (one `DELETE … WHERE id IN (…)`);
   - waiting messages not in the text → untouched.
   All in **one `db.batch`** with the article's update (`runBatch`, `lib/relations.ts`).
3. Old `ti=`/`c=` message links are taken out by the sanitizer step of the same save: no migration writes; an article changes only when it
   is next saved.

### 3.5 Messages (`backend/src/resources/messages/`)

`messages.repo.ts` + `messages.routes.ts`, a normal router like `images.routes.ts` (not `crudRoutes`: the access is the article's).

- `POST /api/articles/:id/messages` `{ title, content, quote }`: reader or more; created **waiting**. Answers the `Message`.
- `PATCH /api/messages/:id` `{ title?, content?, updatedAt }`: **the author, only while waiting** — one
  `UPDATE … WHERE id = ? AND user_id = me AND approved_at IS NULL AND updated_at = ?`, no read; 0 rows → 404 or 409.
- `DELETE /api/messages/:id`: the author while waiting, or an editor / the owner of its article (one `accessOf` read). Deleting an
  approved one: the editor's page also takes its link out (the next save would do it anyway).
- The list is not a route: it comes with the article (§3.6).

### 3.6 The article with its messages

`GET /api/articles/:id` answers `{ …article, access, messages: Message[] }` in **one `db.batch`**: `accessOf` + the messages of the
article joined with `user` (author names). Waiting messages only for editors, the owner and their own author. A cap (e.g. the newest
500, §9 Q6).

### 3.7 Rights (`backend/src/resources/rights/`)

- `GET /api/rights/:type/:id`: owner only; `{ visibility, rights: Right[] }` (rights joined with `user` for name and picture).
- `PATCH /api/rights/:type/:id` `{ visibility?, set?, remove? }`: owner only; **only the changes** (`changesOf` in `privacyStore.ts`
  already computes them): an `INSERT … ON CONFLICT (object_type, object_id, user_id) DO UPDATE SET role` per set person, one
  `DELETE … WHERE user_id IN (…)`, the `visibility` update; one batch. Giving a right to the owner → 400.
- `GET /api/shared`: what is shared with me: `object_rights` by `user_id` (its index), joined per type with the object's title (one
  query per shareable type, one batch). `{ type, id, title, role }[]`, newest first, paged (`lib/pagination.ts`).

### 3.8 People (`backend/src/resources/users/`)

- `GET /api/users/lookup?email=`: signed in; the user with exactly this email → `{ id, name, image }` or 404. Exact email only: one read
  through the unique index, and nobody can list other people's emails.

## 4 — Frontend (article page)

### 4.1 API (`app/src/lib/api/`)

- `messages.ts`: `createMessage(articleId, input)`, `updateMessage(id, patch)`, `removeMessage(id)` on `request` (`client.ts`).
- `rights.ts`: `getRights`, `patchRights`, `listShared`, `lookupUser`.
- The articles resource stays `createResourceApi('/api/articles')`; its item type gets `access`, `messages`, `visibility`.

### 4.2 State

- `features/articles/messages/messagesStore.ts`: the article's messages, **seeded from the article's GET** and changed in place after
  each create / edit / delete answer (no reload, no extra read). `useArticleMessages(articleId)`, `messageById(id)`.
- `useArticleRole` → the article's `access` (`owner` and `editor` see the editor view, `reader` the reader view). The `?as=reader` mock
  goes.
- `privacyStore.ts` → `useArticlePrivacy(articleId)` keeps its signature (as `instructions/article-links.md` planned) but reads
  `visibility` from the article and the people from `getRights`, and Apply sends `patchRights` with `changesOf`. The `localStorage`
  copy goes (§9 Q8).

### 4.3 Messages on the page

- **Editor writes a message** (`MessageForm`, unchanged look): `createMessage` → the link `#mapl:k=msg&id=<new id>` on the selected
  words (`setArticleLink`) → the autosave saves the text → the server approves it (D5, §3.4). If the save never happens, it stays
  waiting and is shown in the list.
- **Reader writes a message**: the same form; `createMessage` with `quote` = the selected words; no change to the text (a reader
  cannot save it). It shows in the side list as "Waiting for approval".
- **Clicking the words** (`onOpen` in `ArticlePanel`): `messageById(link.id)` → `MessagePanel`, at once (no request). A link whose
  message is unknown opens nothing (it is taken out at the next save).
- **`MessagePanel`**: the author's name or "Deleted user", the date, "Waiting" when not approved; Edit (the author, while waiting),
  Delete (author while waiting, editors), as `IconButton`s.
- **Side list** (`side/MessagesList.tsx`): from the store instead of the text's links: approved ones go to their words; waiting ones
  show their `quote`, and editors get **Approve**: the first place of `quote` in the text (`find.ts`) gets the link, and the next save
  approves it. If the words are no longer in the text: the editor selects other words, or deletes it.

### 4.4 Saving

- The article's autosave sends `baseUpdatedAt` (it already keeps `base` in `useItemAutosave`). A 409 opens `ItemConflictModal`:
  "Keep mine" saves again on the server's newest `updatedAt`, "Use the server's" reloads.

### 4.5 Privacy panel and "Shared with me"

- People search in `PrivacyPanel` → `lookupUser(email)` (one exact email) instead of `usePeople`; the chosen people and switches stay.
  Follow keeps `mockPeople.ts` (not in this plan).
- "Shared with me": a section of the sidebar or the dashboard, from `listShared` (where: §9 Q7).

## 5 — Order of work

1. Shared: move `linkHref.ts`, `messageIdsOf`, `messages.ts`, `rights.ts`, the `share` flag, the `CONFLICT` code; tests.
2. Schema + generated migration (read, not applied).
3. `access.ts`, shared `ownedRepo` (get / update / remove), the article save of §3.4.
4. Messages, rights, shared, users routes.
5. Frontend API + stores; `useArticleRole`, `useArticlePrivacy`.
6. Message form, panel, side list; conflict on save.
7. `instructions/article-links.md` and `instructions/adding-a-resource.md` updated.

## 6 — Requests and their cost (D1)

| Request | Who | Reads | Writes |
|---|---|---|---|
| `GET /api/articles/:id` (article, access, messages) | reader+ | 1–2 (article, right) + 2 per message (message, author) | 0 |
| `PATCH /api/articles/:id` without `content` | editor+ | 0 | 1 |
| `PATCH /api/articles/:id` with `content` | editor+ | 1 per message of the article | 1 + (1 approve, 1 delete, only when needed) |
| Opening a message | — | 0 (in memory) | 0 |
| `POST /api/articles/:id/messages` | reader+ | 1–2 | 1 |
| `PATCH /api/messages/:id` | author | 0 | 1 |
| `DELETE /api/messages/:id` | author / editor | 1–2 | 1 |
| `GET /api/rights/:type/:id` | owner | 1 + 2 per person | 0 |
| `PATCH /api/rights/:type/:id` | owner | 1 | 1 per changed person (+ index writes) |
| `GET /api/shared` | signed in | 2 per shared object | 0 |
| `GET /api/users/lookup` | signed in | 1 | 0 |

Rows read through an index count; every index is also written on every insert / delete of its table, so each table keeps the fewest
indexes (§2). No inheritance (D9) keeps the access check at one query.

## 7 — Tests

- `linkHref.test.ts` (moved): `msg` with `id` round-trips through `sanitizeRichText`; old `ti`/`c` messages parse as `null`.
- `messageIdsOf`: ids once, foreign links ignored.
- An `access` suite like `ownedRepo.suite.ts`: owner / editor / reader / public / none / archived; an editor's forbidden fields.
- Article save: foreign link removed; waiting message approved when its link is in the text; approved one deleted when gone; waiting one
  untouched; 409 on an old `baseUpdatedAt`.
- Messages: author edits only while waiting; who may delete; "Deleted user" after the author's account is deleted.
- Rights: only changes written; owner refused; cleaned up when the object is deleted.
- `migrations.test.ts` with the new SQL.

## 8 — Risks

1. **R1 — `updated_at` is in whole seconds**: two saves of two editors in the same second are not seen as a conflict. Options: a
   `version` integer on shared tables (+1 in the same write, no extra read) or milliseconds for shared tables (§9 Q4).
2. **R2 — Approving depends on the next save**: an editor's new message is waiting until the autosave runs; if the tab closes first,
   it stays waiting (visible in the list, not lost).
3. **R3 — `quote` may no longer be in the text** when an editor approves (the text changed): the editor places it by hand.
4. **R4 — Many messages make the article's GET heavier** (2 reads each): the cap of §3.6.
5. **R5 — Spam**: any signed-in reader of a public article can write messages; today only the per-IP limit (120/min) stops it.
6. **R6 — Old messages are dropped** from every article at its next save: their text is lost for good (real articles on the live server).
7. **R7 — A reader removed while the page is open**: their next request answers 404; the page must say so, not just fail.
8. **R8 — Editors and the owner's own fields**: if a forbidden field reaches the server from an editor's autosave (e.g. a pin), the save
   fails with 403; the editor view must not offer them.

## 9 — Questions

1. **Q1** — Old messages (title and text inside the href): drop them (the words stay, the text is lost), or turn them into rows once?
2. **Q2** — Which tables get `share` now: articles only, or also folders, projects, notes, object cards? (Maps are still a mock.)
3. **Q3** — A **public** article: readable without signing in? (Then `GET` uses `optionalAuth`; messages still need sign-in.)
4. **Q4** — Conflicts in the same second (R1): add a `version` column to shared tables?
5. **Q5** — Can an author **edit** their message after approval (it would go back to waiting), or never?
6. **Q6** — The most messages an article's GET returns (proposal: 500)? A limit of waiting messages per person and article?
7. **Q7** — Where does "Shared with me" show: the sidebar, the dashboard, or both?
8. **Q8** — The privacy kept on the devices today (`localStorage`): forget it, or send it once to the server when the article opens?
9. **Q9** — Should a rights row keep who gave it (`granted_by`) and when it changed (`updated_at`)?
10. **Q10** — Should **rejecting** a waiting message just delete it, or keep it as "rejected" for its author to see?
11. **Q11** — Can an editor see who else has access (read-only), or only the owner?
12. **Q12** — Should the author's name be stored on the message (no join: fewer reads, but an old name after a rename) or read from
    `user` (proposal)?
