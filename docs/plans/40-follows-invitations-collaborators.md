# 40 — Follows, invitations and collaborators

**Goal:** a **follow** system, an **inbox of invitations** (built for many kinds, only **collaboration** for now) and **collaborators**
on projects, folders, articles and maps. A creator invites a person they follow to be a collaborator with a role; the person accepts
or declines from their inbox; accepting makes them a collaborator. The creator can unsend an unanswered invitation and change a
collaborator's role. The article page lists its collaborators; a collaborator sees the articles they are on; the profile page shows
the user's followers and the people they follow.
**Depends on:** 34 (`object_rights`, `accessOf`, the privacy panel, "Shared with me"), 38 (maps on the server), the profile page
(`pages/Profile/ProfilePage.tsx`, made on the branch after this one's base).
**Not in this plan:** other kinds of invitations (only the table and contract are ready for them), notifications by email or push,
inviting people who have no account, asking to join, rights inherited by what is inside a folder or project, real-time co-editing.
**Main constraint (as in 34):** as few D1 reads and writes and as few requests as possible; every new resource goes through
`crudRoutes` (`backend/src/lib/crud.ts`) with a hand-written repo, like `/api/object-rights`.

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | Roles: **Creator** (the row's owner, `user_id`), **Author** (`editor`: read + edit), **Read only** (`reader`). The stored values stay `reader` / `editor`; only the labels change |
| U2 | A collaborator is made **only by an accepted invitation**. The creator can invite only **a person they follow** |
| U3 | The invited person sees the invitation in an **inbox**. Accept: they become a collaborator with the invitation's role. Decline: nothing changes |
| U4 | The creator can **unsend** an invitation while it is unanswered |
| U5 | The creator can **change the role** of a collaborator (and remove them) |
| U6 | Invitations are **of many types** in the design; only `collaboration` exists now |
| U7 | **Unfollowing** a person cancels the pending invitations the unfollower sent them, in the same batch |
| U8 | **Accepting** an invitation whose object is in the creator's Trash or gone is refused ("This item is no longer available") and the invitation is removed |
| U9 | A user's **Followers / Following lists are not visible to their followers** by default; only to the user and to **the people they collaborate with** (see P9) |
| U10 | Invitations (and so new collaborators) for **projects, folders, articles and maps**. **Not for notes** |
| U11 | The article page shows its collaborators. A collaborator sees a list of the articles they are on. The profile page shows the user's followers and the people they follow |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | Following needs **no approval**; following yourself is refused (CHECK) | Simplest; the follow only unlocks inviting |
| P2 | One table **`invitations`** for every type: `type` + `object_type` / `object_id` (nullable) + `payload` JSON checked by a zod schema **per type** | A new type is a new enum value and one schema, no new table or route |
| P3 | Answered invitations **stay** (status `accepted` / `declined`, `answered_at`) as the inbox's history; **unsend deletes** the row (pending only) | History for the recipient; an unsent one should vanish for them |
| P4 | **One pending invitation** per (type, object, recipient): a unique index on pending rows only. Inviting again after a decline is allowed | No duplicates in the inbox, and no lock-out after one "no" |
| P5 | Inviting someone **who is already a collaborator** → 409 `ALREADY_COLLABORATOR` (change their role instead) | One way to change a role |
| P6 | **Adding people directly is closed:** `POST /api/object-rights` is removed and `/apply` no longer takes `set` (it keeps `visibility` and `remove`) | Otherwise the follow rule (U2) could be skipped |
| P7 | **Notes keep their existing collaborators** (their role can still be changed or removed) and public / private, but get no new ones (U10) | No data is dropped; nothing new is allowed |
| P8 | A collaborator can **leave** (delete their own `object_rights` row) | They should not need the creator to get out |
| P9 | "People they collaborate with" (U9) = someone who is a collaborator on one of the user's objects, or whose object the user collaborates on. Checked with one query on `object_rights` (both directions, joined with the shareable tables' owner) only when **someone else's** lists are asked for | 0 extra reads for one's own lists, which is the common case |
| P10 | Collaborators of an object **can read its collaborators list** (names, pictures, roles; the creator first). Only the creator changes it | The article page shows the list to everyone on it (U11) |
| P11 | Maps become `share: true` (U10): the 3 sharing columns, the rights CHECK and triggers. **Each map of a branch group is its own object** (a right on one is not one on its branches), like folders (34, U10) | Same rule as every shared row |
| P12 | Inbox badge: **one count request** when the app opens and after each answer; no polling | Cheap; a reload shows new ones |
| P13 | `POST /api/invitations` and `POST /api/follows` are limited by a new rate-limit binding **`SOCIAL_WRITES`** (30 per minute per user) | No invitation or follow spam |
| P14 | The inbox is a navbar popout (`BarPopout`, like Share) **and** an `/inbox` page for the full history | Quick answers from anywhere; a place to scroll |

## 1 — Risks and blockers

1. **Maps' `object_rights` CHECK**: `object_type IN (…)` comes from `SHAREABLE`; adding `maps` means **rebuilding `object_rights`**
   (SQLite cannot change a CHECK), like `0016` did. The rebuild must keep ids (the "Shared with me" order and cursors use them).
2. **Map files are in R2** (`maps.routes.ts`): their routes check the owner only (`mapRow`). They must use `accessOf` (read: any access;
   save: owner or editor; branches and copy: owner only), or a collaborator gets the row but not the drawing.
3. **Accept = 2 writes in one batch** (the invitation's status and the right). The status update is conditional (`WHERE status =
   'pending' AND recipient_id = me`); if it changed 0 rows the right must not be written: do it as `INSERT … SELECT … WHERE EXISTS`
   on the invitation, in the same batch, so a double click or an unsend in between writes nothing.
4. **The privacy panel loses "add by email"** (P6). Existing users must learn the new way: the panel says "Invite people you follow".

## 2 — Architecture

```
packages/shared/src/
  follows.ts         follow input, list filter (direction, userId), FollowItem, FollowCounts
  invitations.ts     INVITATION_TYPES, INVITABLE, payload schema per type, input, answer, filter, InvitationItem
  rights.ts          (exists) role labels; rightsApply without `set`; Collaborator (creator first)
  data.config.ts     maps: share: true; INVITABLE = ['projects', 'folders', 'articles', 'maps']
backend/src/
  db/schema.ts       follows, invitations; object_rights CHECK from SHAREABLE (now with maps)
  resources/follows/       follows.repo.ts, follows.routes.ts (crudRoutes + GET /counts)
  resources/invitations/   invitations.repo.ts, invitations.routes.ts (crudRoutes + GET /pending-count), types/collaboration.ts
  resources/rights/        list readable by collaborators, self-delete, no POST, /apply without `set`
  resources/shared/        ?objectType= filter
  resources/maps/          file routes through accessOf
app/src/
  lib/api/follows.ts, invitations.ts   createResourceApi + the two extra GETs
  features/follows/        useFollows, FollowButton, PeopleList, FindPeople
  features/inbox/          inboxStore (count + pages), InboxButton (navbar), InboxList, cards per type (CollaborationCard)
  features/sharing/        PrivacyPanel: Invite / Pending / Collaborators
  features/collaborators/  CollaboratorsList (article page), MyCollaborations (list of the articles one is on)
  pages/Inbox/InboxPage.tsx
```

The invitation **type** is the only thing a new kind adds: a payload schema in `invitations.ts`, a server handler in
`invitations/types/<type>.ts` (what to check on send, what to write on accept) and a card in `features/inbox/cards/`.

## 3 — Database

### 3.1 `follows` (new, hand-written in `schema.ts`)

| column | type | notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `follower_id` | text NOT NULL | FK `user.id` ON DELETE CASCADE: who follows |
| `followee_id` | text NOT NULL | FK `user.id` ON DELETE CASCADE: who is followed |
| `created_at` | integer NOT NULL | |

- `UNIQUE (follower_id, followee_id)`: once per pair; also the "following" list's index (`follower_id`, then `id` order via rowid).
- `INDEX (followee_id, id)`: the "followers" list and its count.
- `CHECK (follower_id <> followee_id)`.

### 3.2 `invitations` (new, hand-written)

| column | type | notes |
|---|---|---|
| `id` | integer PK autoincrement | |
| `type` | text NOT NULL | `CHECK (type IN ('collaboration'))`, from `INVITATION_TYPES` |
| `sender_id` | text NOT NULL | FK `user.id` ON DELETE CASCADE |
| `recipient_id` | text NOT NULL | FK `user.id` ON DELETE CASCADE |
| `object_type` | text | NULL for types not about an object; `CHECK (object_type IS NULL OR object_type IN (…INVITABLE))` |
| `object_id` | integer | with `object_type` |
| `payload` | text (JSON) NOT NULL DEFAULT `'{}'` | collaboration: `{ "role": "reader" \| "editor" }` (zod, per type) |
| `status` | text NOT NULL DEFAULT `'pending'` | `CHECK (status IN ('pending', 'accepted', 'declined'))` |
| `created_at` | integer NOT NULL | |
| `answered_at` | integer | set on accept / decline |

Indexes:
- `INDEX (recipient_id, status, id)`: the inbox (pending first, newest first) and the badge's count.
- `INDEX (sender_id, object_type, object_id, status)`: an object's pending invitations in the privacy panel; the unfollow cleanup (U7).
- `UNIQUE (type, object_type, object_id, recipient_id) WHERE status = 'pending'` (partial index): P4.
- `CHECK (sender_id <> recipient_id)`.

### 3.3 Changes to existing tables

- **`maps`**: `visibility`, `version`, `edited_by` (the `ownedTable` sharing columns, as 0011 added them to the others).
- **`object_rights`**: rebuilt for the CHECK `object_type IN ('projects', 'notes', 'folders', 'articles', 'maps')` (notes stay: P7).
  The rebuild copies every row with its id.

### 3.4 Triggers (hand-written, like `0012`)

For each of `projects`, `notes`, `folders`, `articles`, `maps`, AFTER DELETE:
- `maps_rights_cleanup` (new): delete its `object_rights` rows (the four others exist).
- `<table>_invitations_cleanup` (new; not notes): delete its `invitations` rows (pending and answered), so no card points at nothing.

### 3.5 Migrations (written, read, **not applied**: the user applies them, §10)

- `0017_follows_and_invitations.sql`: drizzle-kit generate (`follows`, `invitations`, the maps columns, the `object_rights` rebuild).
  Read it: only CREATE / ADD and the one rebuild.
- `0018_invitation_triggers.sql`: the triggers of §3.4, by hand. Tested in `src/db/migrations.test.ts`.

## 4 — Shared contract (`packages/shared`)

- `data.config.ts`: `maps: { …, share: true }`; `SHAREABLE` gains `maps`; new `INVITABLE = ['projects', 'folders', 'articles', 'maps']`
  (a test checks `INVITABLE ⊂ SHAREABLE` and has no `notes`).
- `rights.ts`:
  - `ROLE_LABEL = { owner: 'Creator', editor: 'Author', reader: 'Read only' }`.
  - `rightsApply` without `set`.
  - `Collaborator = { id: number | null; user: Author; role: ItemAccess }` (`id` null and role `owner` for the creator).
- `follows.ts`:
  - `followInput = { userId }`.
  - `followsFilter = { direction: 'followers' | 'following', userId?: string }` (no `userId`: me).
  - `FollowItem = { id, user: Author, since, mutual: boolean }`; `FollowCounts = { followers, following }`.
- `invitations.ts`:
  - `INVITATION_TYPES = ['collaboration']`, `INVITATION_STATUSES`.
  - `PAYLOADS = { collaboration: z.object({ role: z.enum(ROLES) }) }`.
  - `invitationInput`: a discriminated union on `type` (collaboration: `recipientId`, `objectType ∈ INVITABLE`, `objectId`, `payload`).
  - `invitationAnswer = { status: 'accepted' | 'declined' }`.
  - `invitationsFilter = { box: 'inbox' | 'sent', status?, type?, objectType?, objectId? }`.
  - `InvitationItem = { id, type, status, createdAt, answeredAt, from: Author, to: Author, object: { type, id, title } | null, payload }`.
- `errors.ts`: `NOT_FOLLOWING`, `ALREADY_COLLABORATOR`, `ALREADY_INVITED`, `NOT_AVAILABLE`.

## 5 — Backend (every resource is `crudRoutes`, `access: 'owner'`)

### 5.1 `/api/follows` (`resources/follows/`)

| request | repo | reads / writes |
|---|---|---|
| `GET ?direction=&userId=&limit=&cursor=` | `list`: my lists; someone else's only if P9 holds (else 404) | 1 read (+1 for P9 when `userId` ≠ me) |
| `GET /:id` | `get`: a follow I am in | 1 read |
| `POST { userId }` | `create`: `INSERT … ON CONFLICT DO NOTHING`, then returns the row; unknown user → 400 (FK) | 1 write + 1 read |
| `PATCH /:id` | `update`: nothing to change → `null` (404) | 0 |
| `DELETE /:id` | `remove`: mine as follower (unfollow) **or** as followee (remove a follower). Unfollow also deletes my pending invitations to them (U7), one batch | 1 batch |
| `GET /counts?userId=` (extra route on the router) | two `count(*)` on the indexes, one statement; P9 for another user | 1 read |

`mutual` in the list comes from a `LEFT JOIN follows` the other way, in the same query.

### 5.2 `/api/invitations` (`resources/invitations/`)

| request | who | repo |
|---|---|---|
| `GET ?box=inbox\|sent&status=&type=&objectType=&objectId=` | recipient / sender | `list`: one query, joined with both users and (by `object_type`) the object's title, as `listShared` does; pending first, then newest |
| `GET /:id` | sender or recipient | `get` |
| `POST` | the object's creator | `create`: the type's `onSend` checks, **in one read**: I own the object (and it is not archived), I follow the recipient, they are not already on it. Then the INSERT; the partial unique index → 409 `ALREADY_INVITED` |
| `PATCH /:id { status }` | recipient | `update`: the type's `onAnswer`. Accept = one batch: `UPDATE invitations SET status='accepted', answered_at=… WHERE id=? AND recipient_id=me AND status='pending'` + `INSERT INTO object_rights (…) SELECT … FROM invitations i JOIN <table> o … WHERE i.id=? AND i.status='accepted' AND o.archived=0 ON CONFLICT DO UPDATE SET role` (risk 3). If no right was written (object gone or archived) the invitation is deleted and the answer is 410 `NOT_AVAILABLE` (U8). Decline = the conditional UPDATE only |
| `DELETE /:id` | sender | `remove`: `DELETE … WHERE id=? AND sender_id=me AND status='pending'` (U4) |
| `GET /pending-count` (extra) | recipient | one `count(*)` on `(recipient_id, status)` |

`invitations/types/collaboration.ts`: `onSend` (the checks above) and `onAccept` (the right's INSERT). A new type adds a file like it
and an entry in the types map; the routes do not change.

### 5.3 `/api/object-rights` (exists, `resources/rights/`)

- `GET ?objectType=&objectId=`: allowed for the creator **and collaborators** (`accessOf` instead of `ownRow`); answers the
  creator first (`role: 'owner'`, `id: null`), then the collaborators. Readers of a public row that are not collaborators: 404.
- `PATCH /:id { role }`: creator only (unchanged).
- `DELETE /:id`: the creator, or **the collaborator themselves** (P8).
- `POST /`: removed (P6). `POST /apply`: `visibility` and `remove` only.

### 5.4 `/api/shared` (exists)

- `?objectType=articles` filter: "the articles I am on" (U11), the same one query with one more condition.
- Optionally moved into `crudRoutes` as a list-only resource (its `get`, `create`, `update`, `remove` answering 404).

### 5.5 Maps (`resources/maps/`, `lib/ownedRepo.ts`)

- `share: true` gives maps the sharing behaviour of `ownedRepo` (access in the JSON, owner fields hidden, versioned saves).
- `maps.routes.ts`: `GET /:id/file` for any access; `PUT /:id/file` for owner or editor (the file's `baseVersion` already protects
  concurrent saves); `POST /:id/branches` and `/file/copy` for the owner only.

### 5.6 Rate limit

`SOCIAL_WRITES` binding in `wrangler.jsonc` (30 per minute, key: user id), checked before `POST /api/follows` and
`POST /api/invitations` (like `USER_LOOKUP`). Add to `lib/env.ts`, `.dev.vars.example`, `worker-configuration.d.ts`.

## 6 — Frontend

### 6.1 API (`app/src/lib/api/`)

- `follows.ts`: `followsApi = createResourceApi<FollowItem, …, { direction; userId? }>('/api/follows')` + `followCounts(userId?)`.
- `invitations.ts`: `invitationsApi = createResourceApi<InvitationItem, …>('/api/invitations')` + `pendingCount()`.
- `rights.ts`: `listRights` now answers `Collaborator[]`; `updateRight(id, role)`, `removeRight(id)`; `applyRights` without `set`.
- `shared.ts`: `listShared({ objectType })`.

### 6.2 Follow (`features/follows/`)

- `useFollows(direction, userId?)`: pages of `FollowItem`; follow / unfollow update every list shown, without a new read.
- `FollowButton`: Follow / Following (hover: Unfollow) / Follow back.
- `features/people/mockPeople.ts`: its follow store (`localStorage` `map:following`) and made-up people are replaced by the API;
  `FollowPicker` and `PersonCard` use `useFollows('following')`.

### 6.3 Profile page (`pages/Profile/ProfilePage.tsx`)

A third card, **People**, under Profile and Password:
- Tabs **Followers (n) · Following (n)** (`GET /api/follows/counts`, then the list when a tab opens).
- Each row: picture, name, `FollowButton` (Unfollow; Follow back; on Followers also Remove).
- **Find people**: an email field (`GET /api/users/lookup`) → the person with Follow.
- A **Collaborations** card: the articles I am on (`GET /api/shared?objectType=articles`): title, creator, my role, opens the article.

### 6.4 Inbox (`features/inbox/`, `pages/Inbox/InboxPage.tsx`)

- `InboxButton` in the navbar, beside `ProfileCircle`: an icon with a badge (`GET /api/invitations/pending-count` when the app opens;
  P12). It opens a `BarPopout` with the pending invitations (first page) and "See all" → `/inbox`.
- `/inbox` (route in `routes/index.tsx`, inside `AppLayout`): Pending, then Answered (greyed, "Accepted" / "Declined"), a page at a time.
- A card per type (`cards/CollaborationCard.tsx`): "**Maria** invites you to be an **Author** of *The Drowned Kingdom* (article)" with
  **Accept** (primary) / **Decline** (secondary). Accept → `PATCH`, the badge goes down by one, "Shared with me" and Collaborations
  are marked stale; 410 → "This item is no longer available" and the card goes.
- `inboxStore`: the count and the pages, one store for the popout and the page.

### 6.5 Privacy panel (`features/sharing/PrivacyPanel.tsx`, creator only)

Three parts, plus public / private as today:
1. **Invite** (projects, folders, articles, maps; not notes): a picker of the people I follow (`useFollows('following')`, searchable),
   a role choice (Read only / Author), **Send** → `POST /api/invitations`. Errors: `NOT_FOLLOWING`, `ALREADY_INVITED`,
   `ALREADY_COLLABORATOR` shown under the picker. Empty state: "Follow people to invite them".
2. **Pending**: `GET /api/invitations?box=sent&status=pending&objectType=&objectId=`; each with **Unsend** (`DELETE`).
3. **Collaborators**: `GET /api/object-rights?…`; a role dropdown each (`PATCH`), **Remove** (`DELETE`).

The panel reads all three when it opens (3 requests) and changes one thing per request; `sharing.ts` loses the add-by-email rules
(`withSwitch`, `allowedFrom` keep only role changes and removals).

### 6.6 Article page (`features/articles/page/`)

- `features/collaborators/CollaboratorsList.tsx` in `SideColumn.tsx` (and in the reader's page): pictures, names, roles (Creator
  first), read when the column shows (`GET /api/object-rights`). The creator sees "Manage" (opens the privacy panel).
- A collaborator sees **Leave** (`DELETE /api/object-rights/:id` of their own right) → back to the Dashboard.

### 6.7 Maps

- `PrivacyButton` on the map's title bar (`features/board/MapTitleBar.tsx`).
- The map editor opens read-only for `access === 'reader'` (no tools, no save), like `useArticleRole` for articles.

## 7 — Edge cases checked

| Case | What happens |
|---|---|
| Invite a person I don't follow | 403 `NOT_FOLLOWING` |
| Invite myself | 400 (CHECK + zod) |
| Invite for a note | 400 (`objectType ∉ INVITABLE`) |
| Invite the same person twice while pending | 409 `ALREADY_INVITED` (partial unique index) |
| Invite after they declined | allowed: a new pending row |
| Invite a collaborator | 409 `ALREADY_COLLABORATOR` |
| Unsend after they answered | 404 (only pending rows are deleted) |
| Accept twice / accept after unsend | the conditional UPDATE changes nothing → 404; no right written |
| Accept when the object is in the Trash or deleted | 410 `NOT_AVAILABLE`, the invitation removed (U8) |
| Unfollow with invitations pending | they are deleted in the same batch (U7) |
| Object deleted | its rights and invitations go (triggers) |
| Account deleted | its follows, invitations and rights go (cascades) |
| Collaborator leaves | their right deleted; the article leaves their lists |
| Someone asks for another user's followers without collaborating with them | 404 (U9, P9) |
| A note's existing collaborators | still listed; role change and remove work; nobody new (P7) |

## 8 — Testing (all local; no request to any server)

- `packages/shared`: payload schemas per type; `INVITABLE` rules; `rightsApply` without `set`.
- `backend` (the `ownedRepo.suite.ts` harness, foreign keys on):
  - `follows.repo.test.ts`: follow, unfollow, remove a follower, counts, `mutual`, P9 visibility, U7 cleanup.
  - `invitations.repo.test.ts`: every row of §7.
  - `rights.repo.test.ts`: collaborators read the list, self-delete, no POST.
  - `maps` file routes: reader reads, editor saves, reader cannot save, branches owner-only.
  - `migrations.test.ts`: the rebuild keeps ids; the triggers.
- `app`: `inboxStore`, `useFollows` updates, `sharing.ts` rules; `buttons.test.ts` stays green (no raw `<button>`).

## 9 — Cost of each request (D1)

| Request | Reads | Writes |
|---|---|---|
| Follow / unfollow | 1 | 1 (unfollow: 1 batch with the invitation cleanup) |
| Follows page / counts | 1 | 0 |
| Send an invitation | 1 (all checks) | 1 |
| Inbox page | 1 | 0 |
| Pending count (app open) | 1 | 0 |
| Accept | 0–1 | 1 batch (2 statements) |
| Decline / unsend | 0 | 1 |
| Privacy panel opens | 3 | 0 |
| Article collaborators list | 1 | 0 |

## 10 — What the user runs (after review, not part of the build)

```
cd backend
npx drizzle-kit generate            # 0017 (read it first)
npx wrangler d1 migrations apply DB --local
npm run test --workspace backend && npm run test --workspace app
npx wrangler d1 migrations apply DB --remote
```

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Contract: `follows.ts`, `invitations.ts`, `rights.ts` changes, `INVITABLE`, maps `share: true`, errors + tests | `packages/shared/src/*` |
| 2 | Schema: `follows`, `invitations`, maps columns, `object_rights` CHECK | `backend/src/db/schema.ts` |
| 3 | Migrations 0017 (generated, read) and 0018 (triggers); migration tests | `backend/drizzle/*`, `src/db/migrations.test.ts` |
| 4 | Follows repo + routes + counts + tests; mount `/api/follows` | `backend/src/resources/follows/*`, `src/index.ts` |
| 5 | Invitations repo + routes + `types/collaboration.ts` + pending count + tests; mount `/api/invitations` | `backend/src/resources/invitations/*`, `src/index.ts` |
| 6 | Rights: collaborators read, self-delete, no POST, `/apply` without `set` + tests | `backend/src/resources/rights/*` |
| 7 | Shared: `objectType` filter | `backend/src/resources/shared/*` |
| 8 | Maps file routes through `accessOf` + tests | `backend/src/resources/maps/*` |
| 9 | `SOCIAL_WRITES` rate limit | `wrangler.jsonc`, `lib/env.ts`, `.dev.vars.example`, `worker-configuration.d.ts`, `middleware/rate-limit.ts` |
| 10 | App API files | `app/src/lib/api/follows.ts`, `invitations.ts`, `rights.ts`, `shared.ts` |
| 11 | Follows UI; replace the mock people's follow store | `app/src/features/follows/*`, `features/people/mockPeople.ts`, `FollowPicker.tsx`, `PersonCard.tsx` |
| 12 | Profile page: People and Collaborations cards | `app/src/pages/Profile/ProfilePage.tsx` |
| 13 | Inbox: store, navbar button, popout, page, collaboration card, route | `app/src/features/inbox/*`, `pages/Inbox/InboxPage.tsx`, `components/layout/Navbar.tsx`, `routes/index.tsx` |
| 14 | Privacy panel: Invite / Pending / Collaborators | `app/src/features/sharing/*` |
| 15 | Article page: collaborators list, Leave | `app/src/features/collaborators/*`, `features/articles/page/SideColumn.tsx` |
| 16 | Maps: privacy button, read-only editor | `app/src/features/board/MapTitleBar.tsx`, `BoardEditor.tsx` |
| 17 | Docs | `instructions/adding-a-resource.md`, `data-config.md`, a new `instructions/invitations.md` (adding an invitation type) |
| 18 | All checks of §8 | — |

Files **not** touched: the auth code, migrations `0000`–`0016`, plans `33`/`34` (kept as they are). No `wrangler d1 … --remote`, no
deploy, no request to the live server.

## Open items

1. P1–P14 are defaults: say which to change.
2. U9: should a user later be able to **make their lists visible to followers** (a profile setting)? Not in this plan.
3. Folders and projects: an invitation gives access to that item only (34, U10). Should the invitation card and the panel say "Items
   inside are not included"?
