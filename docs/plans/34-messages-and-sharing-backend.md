# 34 — Messages and sharing on the server (replaces 33)

**Goal:** two new server tables, **`messages`** and **`object_rights`**, and sharing for **projects, notes, folders, articles and object
cards** (Read / Edit per person, private / public), built on the generic backend (`crudRoutes`, `ownedRepo`, the data config) and wired
to the app with no mock data left for messages, privacy or people search. A message link holds only the message's id
(`#mapl:k=msg&id=42`); **a message is read from the server only when its words are clicked**. Two editors saving the same item can never
overwrite each other silently.
**Depends on:** 26 (config-driven tables), 30 (article page), 31 (article links and privacy, mock). **Replaces:** 33 (kept for history;
its review is folded in here).
**Not in this plan:** applying migrations or deploying (the user does it, §10), any request to the live server, reading without signing
in, Follow / people's profiles, server search of objects, real-time co-editing.
**Main constraint:** as few D1 reads and writes and as few requests as possible (§9).

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | **A message is read only when its words are clicked** (`GET /api/messages/:id`); the article's GET carries no messages |
| U2 | The side **Messages list shows the linked words only**, from the text (0 reads); a message once read is kept in memory for the page |
| U3 | **No approval.** A message exists as soon as it is written. A **Done** button marks it done |
| U4 | **Only editors (and the owner) write messages.** Readers only read them |
| U5 | **Done:** editors, the owner and the message's author press it; it sets `done_by` / `done_at`; it can be undone; the message stays and opens as before, shown as Done |
| U6 | **Old messages** (title and text inside the href) **are converted**, not dropped (§5.6) |
| U7 | **Sign-in is needed** for everything, public items included |
| U8 | **Shareable now:** projects, notes, folders, articles, object cards |
| U9 | **"Shared with me"** is a sidebar section |
| U10 | Rights are the privacy panel's two switches, stored as one `role`: `reader` or `editor`. The owner has no rights row (the row's `user_id` is the owner). Rights are **not inherited** (a right on a folder is not a right on what is in it) |
| U11 | No replies to messages. Plain text: title ≤ 100, content ≤ 2000. A deleted author shows as "Deleted user" |
| U12 | No requests to the live server while building this; it costs |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **`version` integer** on every shareable table; a content save sends `baseVersion` and is written only if it still matches (`409 CONFLICT` otherwise) | `updated_at` is in whole seconds: two saves in the same second would overwrite each other. 0 extra reads, 0 extra writes |
| P2 | `version` goes up **only when one of the config's `fields` changes** (title, content, infobox…), never with pin, position, parent, archive or visibility | A pin or a move on the Dashboard must not make the open editor's next save a conflict |
| P3 | `edited_by` (text, no foreign key) written in the same UPDATE as each content save; read only to say *who* saved in a 409 | "Maria saved a newer version" for free; no lock, no extra write |
| P4 | **Removing the words does not delete the message.** It stays, and the editor finds it under **"Not in the text"** (read on demand) | Cut → autosave → paste, Undo after an autosave, and two tabs would otherwise lose messages for good (review of 33, #2) |
| P5 | **The article save does nothing with messages** (no read, no write) | Kills the "409 but the messages were still deleted" bug of 33 (#1) at the root, and makes every autosave cheaper |
| P6 | A message link to **another article's** message opens nothing: the message's `articleId` is checked by the page (0 cost) | No save-time scan of links needed |
| P7 | A message's **title / content are edited only by its author**, while they still have edit access; no edit lock after Done | Only one person writes those two fields, so they need no version |
| P8 | **Delete a message:** its author, the item's editors, the owner. The page then removes its link from the text | |
| P9 | Done is shown **in the message panel only**, not in the link's look (the href is not rewritten) | The look would need a read per link, or a text change per Done |
| P10 | **Privacy panel:** owner only. Editors and readers do not see who else has access | Smallest surface; can be opened later |
| P11 | **People search:** exact email (`GET /api/users/lookup?email=`), limited by a new rate-limit binding `USER_LOOKUP` (20 per minute per user) | Nobody can list the users; slows down "does this email have an account?" |
| P12 | A non-owner's JSON leaves out the owner's own fields (`pinned`, `position`, `objectType`, `objectId`, `visibility`) and carries `access` | Readers must not learn the owner's folders and projects (review of 33) |
| P13 | An editor's PATCH with an owner field (pin, position, parent, archived) → `403 FORBIDDEN` | Those are the owner's sidebar, dashboard and Trash |
| P14 | `object_rights` rows are removed by **SQLite triggers** on each shareable table's DELETE | Also covers rows deleted by `ON DELETE CASCADE` when an account is deleted (no FK can point at five tables) |
| P15 | `visibility` is changed only through the rights route (`/api/object-rights/apply`), not the table's PATCH | One place decides who can see an item |
| P16 | `granted_by` (who gave the right) kept on each rights row; no `updated_at` there | One column, same write |
| P17 | "Shared with me" is read when its sidebar section is first opened, a page at a time (20) | 0 reads for users who never open it |
| P18 | The local privacy mock (`localStorage` `map:privacy:*`) is dropped, not uploaded | It was never real sharing (no other person could see anything) |
| P19 | Messages per article: no cap on reads (they are read one by one); `POST` is limited by the general rate limit | Readers cannot write messages (U4), so no spam path |

## 1 — Risks and blockers

1. **The dev app talks to the live API** (`instructions/data-config.md`, "Database"). Nothing of this can be tried in the browser until
   the user applies the migrations remotely and deploys (§10). Until then all checking is by tests on an in-memory SQLite.
2. **The migration must not rebuild the five tables.** Added columns only (`ALTER TABLE … ADD`). So: no table-level `CHECK` for
   `visibility` (zod checks it), no foreign key on `edited_by`. If `drizzle-kit generate` writes a `CREATE TABLE __new_…` for any of
   the five, stop and fix the schema.
3. **Triggers are not made by drizzle-kit:** a second, hand-written migration (`drizzle-kit generate --custom`), run by
   `migrations.test.ts` like `0008_position_keys.sql`.
4. **New binding** `USER_LOOKUP` (rate limit) in `backend/wrangler.jsonc`, `lib/env.ts`, then `npm run cf-typegen`.
5. **Two editors at the same time** still choose in a modal (Keep mine / Use the server's): there is no merge. It never loses data
   silently, but it is not Google Docs.
6. **Old messages** are converted when an editor next opens the article (§5.6). Until then readers see them as before (read from the
   href, no request).

## 2 — Architecture

```
packages/shared  ── data.config.ts: `share: true` on 5 tables ── table.ts: contract (+ baseVersion), ItemOf (+ version, access)
                 ── messages.ts, rights.ts (zod + types) ── errors.ts (+ CONFLICT)
backend          ── lib/ownedTable.ts  (+ visibility, version, edited_by when share)
                 ── lib/access.ts      accessOf(): owner | editor | reader | null, in one query
                 ── lib/ownedRepo.ts   get / update through access; version check; owner fields guarded
                 ── resources/messages/   crudRoutes + messagesRepo   → /api/messages
                 ── resources/rights/     crudRoutes + rightsRepo + POST /apply → /api/object-rights
                 ── resources/shared/     GET /api/shared (Shared with me)
                 ── resources/users/      GET /api/users/lookup
app              ── lib/api: messages.ts, rights.ts, shared.ts, users.ts (createResourceApi where it fits)
                 ── useItemAutosave: baseVersion, 409 → ItemConflictModal
                 ── articles: messagesStore (read on click), MessagePanel / MessagesList / LinkForms, useArticleRole → access
                 ── privacy: privacyStore → server; PrivacyButton in ResourceEditor too
                 ── sidebar: SharedSection
```

Data flow of a message click: **words clicked → `messageById(id)` in memory? → else `GET /api/messages/:id` (one request, one query) →
panel**.

## 3 — Database

### 3.1 New columns on each shareable table (`share: true`)

Added by `ownedTable` after `archived`:

| Column | Type | Notes |
|---|---|---|
| `visibility` | text NOT NULL default `'private'` | `private` \| `public` (zod) |
| `version` | integer NOT NULL default 0 | +1 with every change of a config field (P1, P2) |
| `edited_by` | text NULL | the user id of the last content save; no FK (P3) |

### 3.2 `messages` (hand-written in `schema.ts`, like `images`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | written in the link's href |
| `article_id` | integer NOT NULL → `articles.id` ON DELETE CASCADE | |
| `user_id` | text NULL → `user.id` ON DELETE SET NULL | the author; NULL = "Deleted user" |
| `title` | text NOT NULL default '' | ≤ 100 |
| `content` | text NOT NULL default '' | ≤ 2000 |
| `done_by` | text NULL → `user.id` ON DELETE SET NULL | |
| `done_at` | integer (timestamp) NULL | done = `done_at IS NOT NULL` |
| `created_at`, `updated_at` | integer (timestamp) | `createdAt()`, `updatedAt()` from `ownedTable.ts` |

- `CHECK (title <> '' OR content <> '')`.
- One index: `messages_article_idx (article_id, id)`, for "Not in the text" (newest first, a page at a time).

### 3.3 `object_rights` (hand-written in `schema.ts`)

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `object_type` | text NOT NULL, CHECK in the 5 config names (`projects`, `notes`, `folders`, `articles`, `objectCards`) | |
| `object_id` | integer NOT NULL | no FK; triggers clean up (P14) |
| `user_id` | text NOT NULL → `user.id` ON DELETE CASCADE | who gets the right |
| `role` | text NOT NULL, CHECK in (`reader`, `editor`) | |
| `granted_by` | text NULL → `user.id` ON DELETE SET NULL | |
| `created_at` | integer (timestamp) | |

- UNIQUE `object_rights_object_user (object_type, object_id, user_id)`: one row per person and item; every access check uses it.
- Index `object_rights_user_idx (user_id, id)`: "Shared with me", newest first.

### 3.4 Migrations (written, read, **not applied**)

- `backend/drizzle/0011_<name>.sql` from `npx drizzle-kit generate`: 15 `ALTER TABLE … ADD` (3 columns × 5 tables), 2 `CREATE TABLE`,
  3 indexes. Nothing else (§1.2).
- `backend/drizzle/0012_object_rights_triggers.sql` (`npx drizzle-kit generate --custom`), one per shareable table:
  ```sql
  CREATE TRIGGER notes_rights_cleanup AFTER DELETE ON notes BEGIN
    DELETE FROM object_rights WHERE object_type = 'notes' AND object_id = OLD.id;
  END;
  ```
- `backend/src/db/migrations.test.ts` runs both on an in-memory SQLite: the columns exist, the old rows got the defaults, deleting a
  note deletes its rights rows, deleting a user deletes the rights of their items through the cascade.

## 4 — Shared contract (`packages/shared`)

- `table.ts`: `TableConfig.share?: true`. For such a table:
  - `ItemOf` gets `version: number`, `access: 'owner' | 'editor' | 'reader'` and, for the owner, `visibility`.
  - `update` accepts `baseVersion?: number` (int ≥ 0). The rule "required when a config field is in the patch and the caller is not the
    owner" is the repo's (the contract does not know the caller).
  - `visibility`, `version`, `editedBy` are never in `input` / `update` (P15).
- `data.config.ts`: `share: true` on `projects`, `notes`, `folders`, `articles`, `objectCards`; `SHAREABLE` = their names.
- `rights.ts`: `Role = 'reader' | 'editor'`, `Access = 'owner' | Role`, `Visibility`; zod `rightsApply`
  (`{ objectType, objectId, visibility?, set: { userId, role }[] ≤ 50, remove: userId[] ≤ 50 }`, a person in both → 400); types `Right`
  (`{ id, user: { id, name, image }, role }`) and `SharedItem` (`{ id, objectType, objectId, title, role, owner: { name } }`).
- `messages.ts`: zod `messageInput { articleId, title, content }` (one of them not empty), `messageUpdate { title?, content?, done? }`,
  `messageFilter { articleId, exclude? }` (`exclude`: comma list of ids, ≤ 500), `legacyImport { articleId, items: { title, content }[]
  ≤ 50 }`; type `Message`:
  `{ id, articleId, author: { id, name, image } | null, title, content, done: boolean, doneAt: string | null, createdAt, updatedAt,
  can: { edit, done, remove } }`. `can` comes from the server (the page never guesses rights).
- `errors.ts`: `CONFLICT` (409).

## 5 — Backend

### 5.1 `lib/access.ts` — one access check

`accessOf(ctx, name, id)` → `{ row, access } | null`, **one query**:

```sql
SELECT t.*, r.role FROM <table> t
LEFT JOIN object_rights r ON r.object_type = :name AND r.object_id = t.id AND r.user_id = :me
WHERE t.id = :id
```

owner (`t.user_id = me`) · else `r.role` · else `reader` when `visibility = 'public'` · else null. Null, or archived and not the owner →
the caller answers **404** (never 403: nobody learns the item exists).

### 5.2 `ownedRepo` for `share` tables

- **`get`**: through `accessOf` (the row comes with it, no extra read). `toJson` adds `access`; for a non-owner it leaves out P12's fields.
- **`update`** (one statement on the happy path):
  ```sql
  UPDATE <table> SET …fields, version = version + 1, edited_by = :me   -- version/edited_by only when a config field is in the patch
  WHERE id = :id
    AND (:baseVersion IS NULL OR version = :baseVersion)
    AND (user_id = :me OR (:onlyFields AND EXISTS (SELECT 1 FROM object_rights
         WHERE object_type = :name AND object_id = :id AND user_id = :me AND role = 'editor')))
  RETURNING *
  ```
  `:onlyFields` is false when the patch has an owner field (P13), so only the owner can pass. A non-owner patch of config fields
  without `baseVersion` → 400. **0 rows** → one read (`accessOf` + `edited_by`'s name, LEFT JOIN `user`) to answer the right error:
  null → 404; editor with an owner field → 403; version differs → **409 CONFLICT** with
  `details: [{ path: 'version', message: '<current version>' }, { path: 'editedBy', message: '<name or "">' }]`.
  `checkParent` and `beforeUpdate` stay as they are (they run for the owner only).
- `hasChanges` false → `repo.get` (now through access: an editor gets the row, not a 404).
- `create`, `list`, `remove`: owner only, as today. Rights are removed by the triggers (P14). `orphanChildren` unchanged.
- `updated_at` keeps refreshing on every update (lists sort and show it); conflicts use `version` only.

### 5.3 Messages — `resources/messages/` (`crudRoutes`, mounted at `/api/messages`)

`messages.repo.ts` gives `crudRoutes({ access: 'owner', create: messageInput, update: messageUpdate, filter: messageFilter, repo })`.
(`access: 'owner'` is only the guard "signed in"; the repo checks the article's access.) One query helper, `messageWithAccess(ctx, id)`:

```sql
SELECT m.*, a.user_id AS owner, a.archived, a.visibility, r.role, u.name, u.image
FROM messages m JOIN articles a ON a.id = m.article_id
LEFT JOIN object_rights r ON r.object_type = 'articles' AND r.object_id = a.id AND r.user_id = :me
LEFT JOIN user u ON u.id = m.user_id
WHERE m.id = :id
```

| Route | Who | How |
|---|---|---|
| `GET /api/messages/:id` | can read the article | `messageWithAccess`; no access → 404. Answers `Message` with `can` |
| `GET /api/messages?articleId=&exclude=` | editor / owner | "Not in the text": `WHERE article_id = ? AND id NOT IN (exclude)`, newest first, paged (the generic keyset helpers, `lib/pagination.ts`). One `accessOf` read first |
| `POST /api/messages` | editor / owner of `articleId` | `accessOf` (archived → 404), one INSERT … RETURNING |
| `PATCH /api/messages/:id` | `title` / `content`: the author with edit access (P7); `done`: editors, owner, author | `messageWithAccess`, then one UPDATE … RETURNING (`done: true` sets `done_by = me, done_at = now`; `false` clears both) |
| `DELETE /api/messages/:id` | author, editors, owner | `messageWithAccess`, one DELETE |

Extra route on the same router (as `instructions/data-config.md` allows): `POST /api/messages/import` (`legacyImport`, editor / owner):
`accessOf`, then one multi-row INSERT … RETURNING; answers the new ids in order (§5.6).

### 5.4 Rights — `resources/rights/` (`crudRoutes`, mounted at `/api/object-rights`)

- `GET /api/object-rights?objectType=&objectId=` (owner only; required filter): one owner check (`SELECT id … WHERE id = ? AND user_id
  = me`), then the rights joined with `user` (name, image). Answers `{ visibility, rights: Right[] }` as a one-page list.
- `DELETE /api/object-rights/:id`: owner of the item (one read of the right joined with the item's owner).
- `GET /:id`, `POST`, `PATCH /:id` answer what `crudRoutes` builds; the app uses `apply` instead.
- **`POST /api/object-rights/apply`** (`rightsApply`; owner only): the owner check (1 read; also gives the current visibility), then **one
  `db.batch`**: an `INSERT … ON CONFLICT (object_type, object_id, user_id) DO UPDATE SET role` per set person, one `DELETE … WHERE
  user_id IN (…)`, the `visibility` UPDATE (only when it changed; it does not touch `version`). Giving a right to oneself → 400. A
  foreign-key failure (unknown `userId`) → 400 `UNKNOWN_REFERENCE` (caught, the batch is rolled back). Answers the new
  `{ visibility, rights }` (one read of the rights, like the GET), so the panel needs no second request.

### 5.5 Shared with me — `resources/shared/` (`GET /api/shared`), and users

- `GET /api/shared?limit=&cursor=`: `object_rights WHERE user_id = me` through `object_rights_user_idx`, newest first, keyset by `id`;
  each row joined with its item's `title` and `archived` and the owner's name (one `LEFT JOIN` per shareable table in the same query);
  archived items and rows whose item is gone are left out.
- `GET /api/users/lookup?email=`: signed in; rate-limited by `USER_LOOKUP` keyed by user id (P11); the user with exactly this email
  (unique index) → `{ id, name, image }`, or 404. Oneself → 404.
- `backend/src/index.ts` mounts the three routers. The `for` loop of tables stays as it is (`ownedRepo` reads `share` from the config).

### 5.6 Old messages (U6)

Converted by the **editor's page**, not by a migration or the save:

1. When an editor or the owner opens an article whose text has old links (`k=msg&ti=…&c=…`), the page sends them all in **one**
   `POST /api/messages/import` (author = the caller).
2. It rewrites each old href to `#mapl:k=msg&id=<new id>` in the editor (one transaction, so it is one Undo step) and calls
   `autosave.flush()`: the draft on this device holds the new ids at once, so a failed save does not import again on the next open.
3. A reader sees old links as before: `fromHref` still reads them (`{ kind: 'msg', legacy: { title, content } }`), with no request.

## 6 — Frontend

### 6.1 API (`app/src/lib/api/`)

- `messages.ts`: `createResourceApi<Message, …>('/api/messages')` (get, list with the filter, create, update, remove) + `importLegacy`.
- `rights.ts`: `listRights(type, id)`, `applyRights(body)`, `removeRight(id)`.
- `shared.ts`: `listShared(page)`. `users.ts`: `lookupUser(email)`.
- The tables' own APIs stay `createResourceApi('/api/<path>')`; their types get `version`, `access`, `visibility`.

### 6.2 Saving and conflicts (every shareable table: `useItemAutosave`, `useAutosave`)

- `useItemAutosave` keeps `base = item.version` (not `updatedAt`) and sends `baseVersion` with every save; the draft's
  `baseUpdatedAt` becomes `String(version)` (`decideOnOpen` unchanged in shape). A pin or a move no longer makes a draft conflict (P2).
- When the item in the store gets a newer `version` from **this tab** (a rename from the sidebar), `base` and `saved` follow it: not a
  conflict.
- **A 409 while saving:** `useAutosave` gets a `stopOn(error)` option: a conflict holds the autosave instead of retrying it every 5 s.
  `useItemAutosave` sets `conflict: { by: name }` and `ItemConflictModal` shows "<name> saved a newer version" with:
  - **Keep mine**: `base` = the version in the 409's details, `release()` + `flush()` (no read);
  - **Use the server's**: `refresh()` of the item (one GET), the form restarts with it, the draft is dropped.
- A 404 while saving (the right was taken away, or the item was deleted): the autosave stops, the draft stays, and the page says "You can
  no longer edit this" instead of retrying.
- `listStore.applyEvent`: an item whose `access` is not `owner` is set in the item cache but **never put into a list** (a shared note
  would otherwise show in the editor's own sidebar and Dashboard).

### 6.3 Who may do what

- `useArticleRole` → `item.access` (`owner` and `editor` see the editor page, `reader` the reader page). The `?as=reader` mock goes.
- `ResourceEditor` (notes, projects, folders, cards): `ResourceForm` gets `readOnly` (fields not editable, no autosave, no Delete) for
  `reader`; editors get the form without Delete; owners get the `PrivacyButton` beside Delete.
- `ArticlePanel`: `PrivacyButton` for the owner only (P10); others get `SaveButton`.

### 6.4 Messages on the article page

- `features/articles/messages/messagesStore.ts`: a `Map<id, Message | 'gone'>` per tab and requests in flight (two clicks = one
  request). `useMessage(id)` → `{ message, loading, error }`. Writes put the server's answer in; nothing reads again.
- **Click on the words** (`onOpen` in `ArticlePanel`): the panel opens at once with "Loading…", and fills from `useMessage(link.id)`. A
  message whose `articleId` is not this article's opens "Not found" (P6). A 404 → "This message was deleted", plus **Remove the link**
  for editors.
- **`MessagePanel`**: author's name or "Deleted user", date, a "Done" mark; `IconButton`s from `can`: Edit, Done / Undo done, Delete.
  Delete also removes the link from the text (`removeArticleLink`), then the autosave saves.
- **Writing a message** (editors, `LinkRow` → `MessageForm`, same look): Apply → `POST` → `setArticleLink` with `#mapl:k=msg&id=<id>` on
  the selected words → autosave. The form shows the error and keeps the text if the POST fails.
- **Editing** (Edit in the panel, or ✎ in the list): `MessageForm` filled from the store (reads it first if it is not there) → `PATCH`.
- **Side list** (`side/MessagesList.tsx`): the message links of the text, in order: "on “<words>”", and the title only when the message
  is already in the store. Editors get **Not in the text** at the bottom: it reads `GET /api/messages?articleId=&exclude=<ids in the
  text>` only when pressed (paged), and each row offers Delete or **Place on the selected words**.
- `linkHref.ts`: `msg` becomes `{ kind: 'msg', id: number }` (digits, ≤ 15) and the read-only legacy form (§5.6). `linkHref.test.ts`:
  both survive `sanitizeRichText`. `instructions/article-links.md`'s table follows.

### 6.5 Privacy panel and people

- `privacyStore.ts` keeps its pure helpers (`withSwitch`, `allowedFrom`, `changesOf`) and `useArticlePrivacy` becomes
  `useItemPrivacy(resource, id)`: reads `listRights` **when the panel opens** (not with the page), and Apply sends one `applyRights` with
  `changesOf`; the answer replaces what the panel shows. The `localStorage` copy goes (P18).
- `PrivacyPanel`: the people search is one exact email → `lookupUser` (on Enter / the Add button, not on every key). Follow keeps
  `mockPeople.ts` (not in this plan).
- The page's "Public" mark reads `item.visibility` (owner) instead of the local store.

### 6.6 Shared with me (sidebar)

`components/layout/sidebar/SharedSection.tsx`: a section "Shared with me" after the resources' sections; collapsed by default; on its
first opening reads `listShared` (20), "Show more" reads the next page; each row: icon of its table, title, Reader / Editor; a click opens
its panel (`<panelType>:<id>`). Re-read only with its refresh button or on the next app load.

## 7 — Edge cases checked

| Case | What happens |
|---|---|
| Two editors save in the same second | `version` differs for the second → 409, modal; nothing overwritten |
| Owner pins the article while an editor types | `version` unchanged → the editor's save goes through |
| Cut → autosave → paste a message's words | the message was never deleted; the link points at it again |
| Undo after an autosave | same |
| Editor pastes a link to another article's message | it opens "Not found" (P6); the other message is not exposed |
| Guessing message ids | `GET` checks the article's access; 404 otherwise |
| Reader sends a PATCH of the content | the UPDATE matches no row → read → 404 (reader) |
| Editor sends `pinned` / `objectId` | 403 |
| Right removed while the page is open | next save 404 → "You can no longer edit this", draft kept |
| Item deleted by the owner | rights removed by the trigger; messages by the FK cascade; an open editor gets 404 on save |
| Owner's account deleted | items cascade, triggers remove their rights; messages' `user_id` → NULL ("Deleted user") |
| Owner archives (Trash) | non-owners get 404; "Shared with me" hides it |
| Unknown `userId` in apply | 400, nothing written (batch rolled back) |
| Message created but the save never happens | the message is under "Not in the text"; the draft on this device usually puts the link back on next open |
| `localStorage` blocked during old-message import | the import may run again next time: duplicates show under "Not in the text", deletable |

## 8 — Testing (all local; no request to any server)

- The backend tests run on the in-memory SQLite of `ownedRepo.suite.ts`; turn on `PRAGMA foreign_keys = ON` there (D1 enforces them)
  and give the proxy a `batch` callback if `runBatch` needs it.
- `access.test.ts` (new suite, run for every `share` table): owner / editor / reader / public / none / archived for get and update;
  forbidden fields 403; JSON without P12's fields for non-owners.
- Versions: two updates from one `baseVersion` → the second 409 with the version and the name; pin does not bump; a reader's PATCH 404.
- `messages.repo.test.ts`: who may create, read, edit, mark done, delete; "Not in the text" with `exclude` and paging; import; "Deleted
  user".
- `rights.repo.test.ts`: apply sets / changes / removes in one batch; self → 400; unknown user → 400 and nothing written; non-owner 404;
  shared list paging and archived hidden; triggers clean up.
- `migrations.test.ts`: 0011 and 0012 as in §3.4.
- `packages/shared`: contract tests for `baseVersion`, `rightsApply`, message schemas; `linkHref.test.ts` for the new `msg` and legacy.
- `app`: `autosave.test.ts` (conflict stops retrying), `useItemAutosave` (base follows this tab's version), `listStore.test.ts` (non-owner
  items stay out of lists), `messagesStore` (one request for two clicks, cache, 404 → gone), `privacyStore.test.ts` (apply body).
- Checks: `npx tsc --noEmit && npx vitest run` in `packages/shared` and `backend`; `npx tsc -b && npx vitest run && npx oxlint src` in
  `app`.

## 9 — Cost of each request

Rows read / written in D1, besides the session check every request already does.

| Request | Who | Reads | Writes |
|---|---|---|---|
| Open an item (`GET /api/<table>/:id`) | owner | 1 | 0 |
| Open an item | editor / reader | 2 (row + right) | 0 |
| Autosave (content) | owner | 0 | 1 |
| Autosave (content) | editor | 1 (right) | 1 |
| Autosave refused (409 / 404 / 403) | any | +1–2 | 0 |
| Pin, move, archive | owner | as today | 1 (no version change) |
| **Click a message** (first time) | reader+ | 3–4 (message, article, right, author) | 0 |
| Click it again | — | 0 (memory) | 0 |
| Write a message | editor+ | 1–2 | 1 |
| Edit / Done / Delete a message | as P7–P8 | 3–4 | 1 |
| "Not in the text" (on demand) | editor+ | 1–2 + the article's messages scanned | 0 |
| Old-message import (once per article) | editor+ | 1–2 | 1 per old message |
| Open the privacy panel | owner | 1 + 2 per person | 0 |
| Apply privacy | owner | 1 + 2 per person (answer) | 1 per changed person (+1 visibility) |
| Shared with me (a page of 20) | signed in | ≈ 2 per row | 0 |
| People lookup | signed in | 1 | 0 |
| Delete an item | owner | as today + 0 when not shared | as today + 1 per rights row |

Compared with 33: the article's GET reads 0 messages instead of 2 per message, and an autosave reads no messages and writes none.

## 10 — What the user runs (after review, not part of the build)

```
cd backend
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote     # after reading 0011 and 0012
npm run deploy
```

Deploy the code **with** the migrations: the old code ignores the new columns, but the new code needs them.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `share` flag, `version` / `access` / `visibility` types, `baseVersion` in `update`; `share: true` on 5 tables; `CONFLICT` | `packages/shared/src/table.ts`, `data.config.ts`, `errors.ts`, `table.test.ts` |
| 2 | `rights.ts`, `messages.ts` (zod + types) + tests; export from `index.ts` | `packages/shared/src/rights.ts`, `messages.ts`, `index.ts` |
| 3 | `ownedTable` adds the 3 columns; `messages`, `objectRights` in the schema | `backend/src/lib/ownedTable.ts`, `backend/src/db/schema.ts` |
| 4 | Generate 0011 (read: only ADD / CREATE), write 0012 triggers; migration tests | `backend/drizzle/0011_*.sql`, `0012_object_rights_triggers.sql`, `meta/`, `migrations.test.ts` |
| 5 | Test harness: foreign keys on, batch | `backend/src/lib/ownedRepo.suite.ts` |
| 6 | `accessOf`; `ownedRepo` get / update / no-op get for `share` tables; non-owner JSON; access suite | `backend/src/lib/access.ts`, `ownedRepo.ts`, `access.test.ts` |
| 7 | Messages repo + routes (+ import) + tests | `backend/src/resources/messages/*` |
| 8 | Rights repo + routes (+ apply) + tests | `backend/src/resources/rights/*` |
| 9 | Shared and users routers; `USER_LOOKUP` binding | `backend/src/resources/shared/*`, `resources/users/*`, `index.ts`, `wrangler.jsonc`, `lib/env.ts`, `.dev.vars.example`, `worker-configuration.d.ts` (cf-typegen) |
| 10 | App API files | `app/src/lib/api/messages.ts`, `rights.ts`, `shared.ts`, `users.ts` |
| 11 | Autosave: `baseVersion`, 409 / 404 handling, base follows this tab; list store skips non-owner items | `app/src/lib/resource/useAutosave.ts`, `autosave.ts`, `listStore.ts`, `components/ui/resource/useItemAutosave.ts`, `ItemConflictModal.tsx` + tests |
| 12 | Read-only and editor modes; PrivacyButton in ResourceEditor | `components/ui/resource/ResourceEditor.tsx`, `ResourceForm.tsx`, `FieldRenderer.tsx` |
| 13 | `linkHref` new `msg` + legacy; messages store; panel, form, list, Not in the text; import of old messages; `useArticleRole` | `features/articles/links/linkHref.ts`, `LinkForms.tsx`, `LinkRow.tsx`, `MessagePanel.tsx`, `features/articles/messages/messagesStore.ts`, `side/MessagesList.tsx`, `save/useArticleRole.ts`, `ArticlePanel.tsx` + tests |
| 14 | Privacy on the server; email lookup | `features/articles/privacy/privacyStore.ts`, `PrivacyPanel.tsx`, `PrivacyButton.tsx` (move to `components/ui/resource/privacy/` if it serves all tables) |
| 15 | Shared with me section | `components/layout/sidebar/SharedSection.tsx`, `Sidebar.tsx` |
| 16 | Docs | `instructions/article-links.md`, `adding-a-resource.md`, `data-config.md` (the `share` flag, the request costs) |
| 17 | All checks of §8 | — |

Files **not** touched: the auth code (`backend/src/auth.ts`, `db/auth-schema.ts`, `middleware/auth.ts`, `app/src/lib/auth-client.ts`,
`features/auth/`), existing migrations `0000`–`0010`, `docs/plans/33-…` (kept as it is). No `wrangler d1 … --remote`, no deploy, no
request to the live server.

## Open items

1. P1–P19 are defaults: say which to change.
2. Readers of a shared **project or folder** see only that item's own fields (not its children, U10). Should the page say "Items inside
   are not shared" so they don't think it is empty?
