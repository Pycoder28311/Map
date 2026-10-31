# 37 — Who deletes a message, message replies, and comments below the article

> **For review later. Nothing here is decided or to be taken for granted.** This is a proposal written from a conversation, to be read,
> questioned and corrected before any code is written. Every table, field, route, cost and file name below can change.

**Goal:** three changes on top of plan 34:
1. **A message is deleted only by its creator or the article's owner** (today the article's editors can delete it too).
2. **Replies under a message** (`message_replies`): one flat list under each message, no replies to replies. **Only editors (and the
   owner) write them**; everyone who can read the article reads them.
3. **Comments below the article** (`comments`): shown under the text like social-media posts, written in a small modal with an
   underlined **Post** button, with **nested replies** (up to 5 levels). **Every reader writes them.**

**Two different kinds of object** (they share nothing but the article):

| | Messages (plan 34) | Comments (this plan) |
|---|---|---|
| Where | floating beside the words they are on, inside the text (Microsoft Word comment style) | below the article, like social-media posts |
| Who writes | editors and the owner | every reader of the article |
| Replies | `message_replies`, its own table, **one level**, written by editors and the owner | rows of `comments` itself (`parent_id`), **nested up to 5 levels**, written by every reader |

Built on what exists: `crudRoutes`, `accessOf` / `accessFrom` / `canEdit` (`backend/src/lib/access.ts`), the `messagesRepo` pattern
(one query for the row, its article, the caller's right and the author), `lib/pagination.ts`, `runBatch`, the rate-limit bindings
(`USER_LOOKUP` in `wrangler.jsonc`), the shared contract, the API client (`createResourceApi`), `messagesStore`, `MessagePanel`, `Modal`,
`TextAreaField`, `LinkButton`.
**Depends on:** 34 (messages and sharing), 36 (the article's static text and editing on click: comments sit outside the text).
**Changes from 34:** P8 (who deletes a message) and U11 ("no replies").
**Not in this plan:** applying the migration or deploying (the user does it), any request to the live server, likes or reactions,
notifications, pictures in comments, real-time updates.
**Main constraint:** as few D1 reads and writes, and as few requests, as possible (§6).

## 0 — Decisions (all confirmed by the user)

### Messages and their replies

| # | Decision |
|---|---|
| U1 | **Delete a message:** only its creator and the article's owner. Not the article's other editors |
| U2 | **Done** stays as it is: the creator, the article's editors and the owner |
| U3 | **Message replies:** a table of their own (`message_replies`); a flat list under the message, no nested replies |
| U4 | **Only editors (and the owner) write message replies**; everyone who can read the article reads them |
| U5 | **A message reply is edited by its creator** while they still edit the article; **deleted by its creator or the article's owner** |

### Comments

| # | Decision |
|---|---|
| U6 | **Comments:** `id`, `article_id`, `user_id`, `parent_id` (the comment it answers; NULL for a top comment), in **one table**: replies are comments too |
| U7 | **Every reader of the article writes comments** (signed in, as everything in 34) |
| U8 | **Nested replies, up to 5 levels** (a top comment is level 1). A reply to a level-5 comment goes under that comment's parent, at level 5, starting with `@name` |
| U9 | **The creator can edit a comment**; it then shows "edited" |
| U10 | **Delete a comment:** its creator or the article's owner. **Its replies go with it** (all levels) |
| U11 | The "posts" below the article **are these comments**, each shown as a card like a social-media post |
| U12 | **Top comments newest first** |
| U13 | **2000 characters** for a comment, a reply and a message reply; plain text |
| U14 | **A rate limit of 10 comments per minute per person** (its own binding), besides the general limit |
| U15 | The comment modal is opened by a **"Write a comment…" box** under the article (a reply opens the same modal); it has a **small underlined Post button** |
| U16 | Comments show **right under the article's text, in every view** (owner, editors, readers, public articles included) |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **A message's replies come with the message** (`GET /api/messages/:id` answers `replies` too, in the same query batch): the newest 20, then "Earlier replies" (paged) | A message is already read once, on click: its replies cost no extra request |
| P2 | Deleting a message deletes its replies (`ON DELETE CASCADE`) | No orphan replies, 0 extra statements |
| P3 | A comment keeps its **`depth`** (1–5) and its parent's **`reply_count`** | The depth rule is checked without reading the chain; a card shows "Show 3 replies" without reading them (+1 write per reply, saves reads on every view) |
| P4 | **Each level is read only when asked for:** the top comments when the reader scrolls to them (an `IntersectionObserver`), 20 a page; a comment's replies only when its "Show replies" is pressed, **oldest first**, 20 a page | Readers who never scroll or open a thread cost 0 reads; no recursive query |
| P5 | Indentation grows for levels 2–5 and stops there; on a narrow pane it is smaller | Readable on a phone |
| P6 | A deleted account shows as "Deleted user" (`user_id` SET NULL) | As messages |
| P7 | Comments of an article in the owner's Trash: nobody but the owner reads them (`accessFrom` already says so) | 0 new rules |
| P8 | Editing a comment needs the creator to still be able to read the article | Someone removed from a private article can't change what is there |

## 1 — How it works today (on `main`)

- `messages` (migration 0011): `id`, `article_id`, `user_id` (SET NULL), `title`, `content`, `done_by`, `done_at`, dates.
- `messagesRepo.canOf` (`backend/src/resources/messages/messages.repo.ts`):
  `edit: mine && canEdit(access)`, `done: mine || canEdit(access)`, `remove: mine || canEdit(access)`.
- The app hides Edit, Done and Delete with the `can` flags the server sends (`MessagePanel`, `side/MessagesList`).
- `GET /api/messages/:id` is one query (`messageWithAccess`): the message, its article, the caller's right, the author.
- Migrations end at `0013_article_autolinkers.sql`.

## 2 — Delete a message (U1)

- `canOf`: `remove: mine || access === 'owner'`. Edit and Done stay as they are (U2).
- No frontend change: the menus already read `can.remove`. The side list's "Not in the text" Delete follows the same flag.
- Test: an editor who is not the creator gets 403 on `DELETE /api/messages/:id`; the owner and the creator get 204.

## 3 — Tables

### `message_replies`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `message_id` | integer NOT NULL → `messages.id` ON DELETE CASCADE | P2 |
| `user_id` | text NULL → `user.id` ON DELETE SET NULL | "Deleted user" |
| `content` | text NOT NULL, CHECK `trim(content) <> ''` | ≤ 2000, plain text (zod) |
| `created_at`, `updated_at` | integer (timestamp) | `createdAt()`, `updatedAt()` from `ownedTable.ts` |

- One index: `message_replies_message_idx (message_id, id)`: a message's replies, in order, a page at a time.
- No `article_id`: the article comes from the message (primary key) in the same query.

### `comments`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `article_id` | integer NOT NULL → `articles.id` ON DELETE CASCADE | |
| `user_id` | text NULL → `user.id` ON DELETE SET NULL | "Deleted user" |
| `parent_id` | integer NULL → `comments.id` ON DELETE CASCADE | NULL: a top comment. The cascade removes every level under a deleted comment (U10) |
| `depth` | integer NOT NULL default 1, CHECK `depth BETWEEN 1 AND 5` | P3 |
| `content` | text NOT NULL, CHECK `trim(content) <> ''` | ≤ 2000, plain text |
| `reply_count` | integer NOT NULL default 0 | its direct replies (P3) |
| `created_at`, `updated_at` | integer (timestamp) | "edited" when `updated_at` > `created_at` |

- One index: `comments_article_idx (article_id, parent_id, id)`. It serves both "an article's top comments" (`parent_id IS NULL`,
  newest first) and "a comment's replies" (`parent_id = ?`, oldest first).

### Files

- `backend/src/db/schema.ts`: `messageReplies`, `comments` (hand-written, like `messages`; `comments.parent_id` references
  `comments.id` with `(): AnySQLiteColumn => comments.id`).
- One migration from `npx drizzle-kit generate` (`backend/drizzle/0014_…sql`), **generated and read, not applied**.
  `migrations.test.ts` must pass with it, and checks both cascades (message → replies; comment → every level under it).
- `backend/wrangler.jsonc`: a `COMMENTS` rate-limit binding, 10 per 60 s (U14); its type in `worker-configuration.d.ts`.

## 4 — Backend

### 4.1 Shared contract (`packages/shared`)

- `messages.ts`: `MESSAGE_REPLY_MAX = 2000`, zod `messageReplyInput { messageId, content }`, `messageReplyUpdate { content }`, type
  `MessageReply { id, messageId, author: Author | null, content, createdAt, updatedAt, can: { edit, remove } }`. `Message` gets
  `replies: MessageReply[]`, `repliesCursor: string | null` and `can.reply`.
- `comments.ts`: `COMMENT_MAX = 2000`, `COMMENT_DEPTH = 5`, `COMMENTS_PAGE = 20`, zod `commentInput { articleId, parentId?, content }`,
  `commentUpdate { content }`, `commentFilter { articleId, parentId? }`, type
  `Comment { id, articleId, parentId, depth, author: Author | null, content, replyCount, createdAt, updatedAt, edited, can: { edit, remove } }`.
- `index.ts` exports both.

### 4.2 Message replies (`backend/src/resources/messages/`)

`replies.repo.ts` + routes on `crudRoutes` at **`/api/message-replies`** (like `messagesRepo`: `access: 'owner'` = signed in, the repo
checks the article).

- `GET /api/messages/:id` (changed): `messageWithAccess` + the newest 20 replies with their authors, **in one `db.batch`** (P1).
- `GET /api/message-replies?messageId=&cursor=`: earlier replies (`lib/pagination.ts`, `beforeCursor`).
- `POST /api/message-replies` `{ messageId, content }`: editor or owner of the message's article (`messageWithAccess` + `canEdit`), else 403.
- `PATCH /api/message-replies/:id` `{ content }`: its creator while `canEdit` (U5).
- `DELETE /api/message-replies/:id`: its creator or the article's owner (U5).
- A reply's access read is one query: the reply (PK) → its message (PK) → its article (PK) → the caller's right (unique index) → the author (PK).

### 4.3 Comments (`backend/src/resources/comments/`)

`comments.repo.ts` + `comments.routes.ts` on `crudRoutes` at **`/api/comments`**.

- `GET /api/comments?articleId=&cursor=`: the top comments, newest first, with authors and `reply_count`. One `accessOf(articles)` + one
  page read, in one batch.
- `GET /api/comments?articleId=&parentId=&cursor=`: a comment's direct replies, oldest first (`afterCursor`), any level.
- `POST /api/comments` `{ articleId, parentId?, content }`: reader or more; the `COMMENTS` rate limit first (no database read).
  A reply is two statements in **one batch**, with no read of the parent first:
  - `INSERT … SELECT` from the parent row `WHERE id = :parentId AND article_id = :articleId`: `parent_id` = the parent, `depth` =
    its depth + 1 — or, when the parent is at depth 5, the parent's own parent and depth 5 (U8; the app has already put `@name` first);
  - `UPDATE comments SET reply_count = reply_count + 1` on that same chosen parent.
  No row inserted → 400 `UNKNOWN_REFERENCE` (`parentId`).
- `PATCH /api/comments/:id` `{ content }`: its creator, while they can read the article (U9, P8): one access read, one `UPDATE … WHERE
  id = ? AND user_id = me`.
- `DELETE /api/comments/:id`: its creator or the article's owner (U10). One batch: the delete (the foreign key takes every level under
  it) and, for a reply, `reply_count - 1` on its parent.
- `index.ts`: `.route('/api/message-replies', …)`, `.route('/api/comments', …)`.

## 5 — Frontend

### 5.1 API (`app/src/lib/api/`)

- `messages.ts`: `messageRepliesApi = createResourceApi('/api/message-replies')`.
- `comments.ts`: `commentsApi = createResourceApi('/api/comments')`.

### 5.2 Replies in the message panel

- `messagesStore.ts`: a message's `replies` come with it; `addReply`, `updateReply`, `removeReply`, `loadEarlierReplies` put the server's
  answer into the message's state (nothing is read again).
- `MessagePanel.tsx`: under the message's text, its replies (author or "Deleted user", date, text, ⋯ with Edit / Delete as `can` says);
  "Earlier replies" when `repliesCursor`; for editors (`can.reply`) a one-line `TextAreaField` that grows, with a **Reply** button.
  The panel scrolls inside itself (`max-h`), as its text does today.

### 5.3 Comments below the article

`app/src/features/articles/comments/`:

```
CommentsSection.tsx   "Comments" heading, the "Write a comment…" box, the top cards, "Show more"; reads its first page when scrolled into view
CommentCard.tsx       a post: avatar, name or "Deleted user", date, "edited", text, Reply, ⋯ (Edit, Delete); "Show 3 replies" and its
                      replies (CommentCard again, one indent more, up to level 5)
CommentModal.tsx      Modal + TextAreaField ("Replying to …" for a reply; "Edit comment" when editing) + the small underlined Post button
commentsStore.ts      the article's loaded top comments, and each opened comment's loaded replies; writes put the server's answer in
```

- **Where:** in `ArticlePanel`, right after the article's text box (outside the editor and outside plan 36's static text), inside the
  page's scroll, in every view (U16). Hidden while the article is new (no id yet).
- **The modal:** opened by the "Write a comment…" box (looks like a field, is a button), by Reply or by Edit. The text field takes the
  focus; **Post** is a `LinkButton` with `underline` (`ui-btn-link`, small), disabled while empty or sending; Esc / ✕ closes; a draft is
  kept while the modal is closed and reopened on the same page. Reply on a level-5 comment starts the text with `@name`.
- **After Post:** a top comment goes first in the list; a reply goes last under its comment (opened if it was closed) and the count goes
  up. After Edit, the card changes in place. After Delete, the card and everything under it go, and its parent's count goes down. No reload.
- **Errors:** the existing error text under the field; 429 says "Too many comments, wait a minute"; a 404 (the article is no longer
  readable) closes the section with a note.

## 6 — Requests and their cost (D1)

| Request | Who | Reads | Writes |
|---|---|---|---|
| `GET /api/messages/:id` (with 20 replies) | reader+ | 4 + 2 per reply | 0 |
| `GET /api/message-replies?messageId=&cursor=` | reader+ | 4 + 2 per reply | 0 |
| `POST /api/message-replies` | editor / owner | 4 | 1 |
| `PATCH /api/message-replies/:id` | its creator | 5 | 1 |
| `DELETE /api/message-replies/:id` | creator / owner | 5 | 1 |
| `GET /api/comments?articleId=` (20) | reader+ | 2 + 2 per comment | 0 |
| `GET /api/comments?articleId=&parentId=` (20) | reader+ | 2 + 2 per reply | 0 |
| `POST /api/comments` (top) | reader+ | 2 | 1 |
| `POST /api/comments` (reply) | reader+ | 3 | 2 |
| `PATCH /api/comments/:id` | its creator | 3 | 1 |
| `DELETE /api/comments/:id` | creator / owner | 3 | 1 (+1 for the parent's count; + every reply under it) |
| Opening the article without scrolling to the comments | — | 0 | 0 |

"Reads" counts rows read through primary keys and indexes (author rows included). Each table keeps one index, so each insert or delete
writes one index entry besides the row. The rate limit (U14) costs no database read.

## 7 — Tests

- `messages.repo`: delete by creator / owner / other editor (U1); Done by an editor still works (U2); reply create by reader → 403, by
  editor → 201; reply edit only by its creator while an editor; reply delete by creator / owner; deleting a message removes its replies.
- `comments.repo`: reader comments; parent of another article → 400; depth 2–5 from the parent; a reply to a depth-5 comment lands under
  its parent at depth 5; `reply_count` up on reply, down on its delete; deleting a comment removes every level under it; edit by its
  creator only, "edited" set; delete by another reader → 403; owner deletes anyone's; Trash article → 404 for non-owners; 429 after 10.
- `migrations.test.ts`: the new tables, both cascades, the CHECKs.
- App: `commentsStore` (add / edit / remove / pages / opened threads), `messagesStore` replies; `buttons.test.ts` passes with the new buttons.

## 8 — Still open (smaller)

1. Can the creator of a **message** also delete the replies under it, or only each reply's creator and the owner (as now)?
2. Should a deleted comment's **@name** mentions in other replies stay as plain text (proposal: yes, nothing is rewritten)?
3. Should the comments count show next to the "Comments" heading? It would need a `comment_count` on articles (+1 write per comment)
   or a count query (reads every comment): proposal, no count for now.
