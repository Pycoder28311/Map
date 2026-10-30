# 37 — Who deletes a message, message replies, and comments below the article

> **For review later. Nothing here is decided or to be taken for granted.** This is a proposal written from a conversation, to be read,
> questioned and corrected before any code is written. Every table, field, route, cost and file name below can change. The questions in
> §8 should be answered first.

**Goal:** three changes on top of plan 34:
1. **A message is deleted only by its creator or the article's owner** (today the article's editors can delete it too).
2. **Replies under a message** (`message_replies`): one flat list under each message, no replies to replies. **Only editors (and the
   owner) write them**; everyone who can read the article reads them.
3. **Comments below the article** (`comments`): shown under the text like social-media posts, written in a small modal with an
   underlined **Post** button, with replies under a comment.

Built on what exists: `crudRoutes`, `accessOf` / `accessFrom` / `canEdit` (`backend/src/lib/access.ts`), the `messagesRepo` pattern
(one query for the row, its article, the caller's right and the author), `lib/pagination.ts`, `runBatch`, the shared contract, the API
client (`createResourceApi`), `messagesStore`, `MessagePanel`, `Modal`, `TextAreaField`, `LinkButton`.
**Depends on:** 34 (messages and sharing), 36 (the article's static text and editing on click: comments sit outside the text).
**Changes from 34:** P8 (delete) and U11 ("no replies").
**Not in this plan:** applying the migration or deploying (the user does it), any request to the live server, likes or reactions,
notifications, pictures in comments, real-time updates.
**Main constraint:** as few D1 reads and writes, and as few requests, as possible (§6).

## 0 — Decisions

### Asked by the user

| # | Decision |
|---|---|
| U1 | **Delete a message:** only its creator and the article's owner. Not the article's other editors |
| U2 | **Message replies:** a table of their own; a flat list under the message, no nested replies |
| U3 | **Only editors (and the owner) write message replies** |
| U4 | **Comments:** `id`, `article_id`, `user_id`, `parent_id` (the comment it answers, if any); simple features |
| U5 | The comment modal has a **small underlined Post button** |
| U6 | Comments show **below the article, like social-media posts** |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **Done stays as in 34**: the creator, the article's editors and the owner | U1 is about deleting only (§8 Q1) |
| P2 | **A message's replies come with the message** (`GET /api/messages/:id` answers `replies` too, in the same query batch): the newest 20, then "Earlier replies" (paged) | A message is already read once, on click: its replies cost no extra request |
| P3 | **A reply is edited only by its creator** (while they still edit the article); **deleted by its creator or the article's owner** (like U1) | Same rule as the message: one rule to learn |
| P4 | Deleting a message deletes its replies (`ON DELETE CASCADE`) | No orphan replies, 0 extra statements |
| P5 | **Comments: one level of replies.** `parent_id` must be a top-level comment of the same article. "Reply" on a reply answers the same top comment, starting with `@name` (YouTube / Instagram style) | No recursive reads; fits a phone's width (§8 Q4) |
| P6 | **Every reader of the article can comment** (signed in, as everything in 34) | "Like social media" (§8 Q3) |
| P7 | **A comment is deleted by its creator or the article's owner** (like U1). **No editing** of comments in this first version | "Simple functionality" (§8 Q5) |
| P8 | Deleting a top comment **deletes its replies** (`ON DELETE CASCADE`) | Simplest: 1 statement (§8 Q6: or keep "Comment deleted") |
| P9 | `reply_count` on `comments`, kept in the same batch as each reply's insert / delete | The card shows "Show 3 replies" without reading the replies: +1 write per reply, saves reads on every view |
| P10 | **Comments are read only when the reader scrolls to them** (an `IntersectionObserver`), 20 top comments a page, **newest first**; a comment's replies only when "Show replies" is pressed, **oldest first** | Readers who never scroll down cost 0 reads |
| P11 | Plain text: a message reply ≤ 2000, a comment ≤ 2000. A deleted account shows as "Deleted user" | As messages (34 U11) |
| P12 | Comments of an article in the owner's Trash: nobody but the owner reads them (`accessFrom` already says so) | 0 new rules |
| P13 | Writing a comment needs `reader` or more on the article; a public article's readers are readers (`accessFrom`) | 0 new rules |

## 1 — How it works today (on `main`)

- `messages` (migration 0011): `id`, `article_id`, `user_id` (SET NULL), `title`, `content`, `done_by`, `done_at`, dates.
- `messagesRepo.canOf` (`backend/src/resources/messages/messages.repo.ts`):
  `edit: mine && canEdit(access)`, `done: mine || canEdit(access)`, `remove: mine || canEdit(access)`.
- The app hides Edit, Done and Delete with the `can` flags the server sends (`MessagePanel`, `side/MessagesList`).
- `GET /api/messages/:id` is one query (`messageWithAccess`): the message, its article, the caller's right, the author.
- Migrations end at `0013_article_autolinkers.sql`.

## 2 — Delete a message (U1)

- `canOf`: `remove: mine || access === 'owner'`. Edit and Done stay as they are (P1).
- No frontend change: the menus already read `can.remove`. The side list's "Not in the text" Delete follows the same flag.
- Test: an editor who is not the creator gets 403 on `DELETE /api/messages/:id`; the owner and the creator get 204.

## 3 — Tables

### `message_replies`

| Column | Type | Notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `message_id` | integer NOT NULL → `messages.id` ON DELETE CASCADE | P4 |
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
| `parent_id` | integer NULL → `comments.id` ON DELETE CASCADE | NULL: a top comment. Only one level (P5), checked by the server |
| `content` | text NOT NULL, CHECK `trim(content) <> ''` | ≤ 2000, plain text |
| `reply_count` | integer NOT NULL default 0 | P9; only for top comments |
| `created_at`, `updated_at` | integer (timestamp) | |

- One index: `comments_article_idx (article_id, parent_id, id)`. It serves both "an article's top comments" (`parent_id IS NULL`,
  newest first) and "a comment's replies" (`parent_id = ?`, oldest first).

### Files

- `backend/src/db/schema.ts`: `messageReplies`, `comments` (hand-written, like `messages`).
- One migration from `npx drizzle-kit generate` (`backend/drizzle/0014_…sql`), **generated and read, not applied**.
  `migrations.test.ts` must pass with it (and check both cascades).

## 4 — Backend

### 4.1 Shared contract (`packages/shared`)

- `messages.ts`: `MESSAGE_REPLY_MAX = 2000`, zod `messageReplyInput { messageId, content }`, `messageReplyUpdate { content }`, type
  `MessageReply { id, messageId, author: Author | null, content, createdAt, updatedAt, can: { edit, remove } }`. `Message` gets
  `replies: MessageReply[]`, `repliesCursor: string | null` and `can.reply`.
- `comments.ts`: `COMMENT_MAX = 2000`, `COMMENTS_PAGE = 20`, zod `commentInput { articleId, parentId?, content }`,
  `commentFilter { articleId, parentId? }`, type `Comment { id, articleId, parentId, author: Author | null, content, replyCount, createdAt,
  can: { remove } }`.
- `index.ts` exports both.

### 4.2 Message replies (`backend/src/resources/messages/`)

`replies.repo.ts` + routes on `crudRoutes` at **`/api/message-replies`** (like `messagesRepo`: `access: 'owner'` = signed in, the repo
checks the article).

- `GET /api/messages/:id` (changed): `messageWithAccess` + the newest 20 replies with their authors, **in one `db.batch`** (P2).
- `GET /api/message-replies?messageId=&cursor=`: earlier replies (`lib/pagination.ts`, `beforeCursor`).
- `POST /api/message-replies` `{ messageId, content }`: editor or owner of the message's article (`messageWithAccess` + `canEdit`), else 403.
- `PATCH /api/message-replies/:id` `{ content }`: its creator while `canEdit`. One `UPDATE … WHERE id = ? AND user_id = me` after the access read.
- `DELETE /api/message-replies/:id`: its creator or the article's owner (P3).
- A reply's access read is one query: the reply (PK) → its message (PK) → its article (PK) → the caller's right (unique index) → the author (PK).

### 4.3 Comments (`backend/src/resources/comments/`)

`comments.repo.ts` + `comments.routes.ts` on `crudRoutes` at **`/api/comments`**.

- `GET /api/comments?articleId=&cursor=`: the top comments, newest first, with authors and `reply_count`. One `accessOf(articles)` + one
  page read, in one batch.
- `GET /api/comments?articleId=&parentId=&cursor=`: a comment's replies, oldest first (`afterCursor`).
- `POST /api/comments` `{ articleId, parentId?, content }`: reader or more (P13). A reply is two statements in **one batch**, with no read
  of the parent first:
  `INSERT … SELECT … WHERE EXISTS (SELECT 1 FROM comments WHERE id = :parentId AND article_id = :articleId AND parent_id IS NULL)`, then
  `UPDATE comments SET reply_count = reply_count + 1 WHERE id = :parentId AND article_id = :articleId AND parent_id IS NULL`.
  No row inserted → 400 `UNKNOWN_REFERENCE` (`parentId`).
- `DELETE /api/comments/:id`: its creator or the article's owner (P7). A reply's delete also lowers its parent's `reply_count` (same
  batch). A top comment's delete takes its replies (P8, the foreign key).
- No `PATCH` in this version (P7).
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
CommentsSection.tsx   "Comments" heading, the "Write a comment…" box, the cards, "Show more"; reads its first page when scrolled into view
CommentCard.tsx       a post: avatar, name or "Deleted user", date, text, Reply, ⋯ (Delete); "Show 3 replies" / its replies, indented once
CommentModal.tsx      Modal + TextAreaField ("Replying to …" for a reply) + the small underlined Post button
commentsStore.ts      the article's loaded comments and each comment's loaded replies; writes put the server's answer in
```

- **Where:** in `ArticlePanel`, after the article's text box (outside the editor and outside plan 36's static text), inside the page's
  scroll. Hidden while the article is new (no id yet).
- **The modal:** opened by the "Write a comment…" box (looks like a field, is a button) or by Reply. The text field takes the focus;
  **Post** is a `LinkButton` with `underline` (`ui-btn-link`, small), disabled while empty or sending; Esc / ✕ closes; a draft is kept
  while the modal is closed and reopened on the same page.
- **After Post:** a top comment goes first in the list; a reply goes last under its comment and its count goes up. No reload.
- **Errors:** the existing error text under the field; a 404 (the article is no longer readable) closes the section with a note.

## 6 — Requests and their cost (D1)

| Request | Who | Reads | Writes |
|---|---|---|---|
| `GET /api/messages/:id` (with 20 replies) | reader+ | 4 + 2 per reply | 0 |
| `GET /api/message-replies?messageId=&cursor=` | reader+ | 4 + 2 per reply | 0 |
| `POST /api/message-replies` | editor / owner | 4 | 1 |
| `PATCH /api/message-replies/:id` | its creator | 5 | 1 |
| `DELETE /api/message-replies/:id` | creator / owner | 5 | 1 |
| `GET /api/comments?articleId=` (20) | reader+ | 2 + 2 per comment | 0 |
| `GET /api/comments?articleId=&parentId=` | reader+ | 2 + 2 per reply | 0 |
| `POST /api/comments` (top) | reader+ | 2 | 1 |
| `POST /api/comments` (reply) | reader+ | 3 | 2 |
| `DELETE /api/comments/:id` | creator / owner | 3 | 1 (+1 for a reply's count; + its replies for a top comment) |
| Opening the article without scrolling to the comments | — | 0 | 0 |

"Reads" counts rows read through primary keys and indexes (author rows included). Each table keeps one index, so each insert or delete
writes one index entry besides the row.

## 7 — Tests

- `messages.repo`: delete by creator / owner / other editor (U1); reply create by reader → 403, by editor → 201; reply edit only by its
  creator; reply delete by creator / owner; deleting a message removes its replies.
- `comments.repo`: reader comments; parent of another article → 400; reply to a reply → 400; `reply_count` up on reply, down on its delete;
  top comment delete removes its replies; delete by another reader → 403; owner deletes anyone's; Trash article → 404 for non-owners.
- `migrations.test.ts`: the new tables, both cascades, the CHECKs.
- App: `commentsStore` (add / remove / pages), `messagesStore` replies; `buttons.test.ts` passes with the new buttons.

## 8 — Questions

1. **Q1 — Done:** keep it for the creator, the editors and the owner (as now), or also only the creator and the owner?
2. **Q2 — Message replies:** can the creator of a reply delete and edit it, and the article's owner delete it (P3)? Should a message's
   creator also be able to delete replies under their message?
3. **Q3 — Who comments:** every reader of the article (P6), or only editors and the owner?
4. **Q4 — Nesting of comments:** one level (P5), or real nesting (replies to replies, indented each time)?
5. **Q5 — Editing a comment:** none in this version (P7), or the creator can edit it ("edited" shown)?
6. **Q6 — Deleting a comment that has replies:** delete them too (P8), or keep the thread with "Comment deleted"?
7. **Q7 — "Posts":** are the posts below the article these comments (P-default), or a separate kind of object (with a title, pictures)?
8. **Q8 — Order:** top comments newest first and replies oldest first (P10), or both oldest first?
9. **Q9 — Can the article's editors (not only the owner) delete other people's comments** (moderation)?
10. **Q10 — Limits:** 2000 characters for a comment and a reply? A limit of comments per person per minute besides the general 120/min?
11. **Q11 — Where exactly:** under the article's text but above anything else at the bottom (e.g. the project's folders), and also on the
    reader's view of a public article?
12. **Q12 — The "Write a comment…" box:** a box under the article that opens the modal (P-default), or a button only?
