# 41 — Public objects and Explore

**Goal:** the basics of sharing work with everyone. An object made **public** (articles, maps, projects, folders) can be **found** by
anyone signed in: an **Explore** page lists public objects, newest first, with a **search** field and **type filters**, and opens one
read-only. The Explore button is a sidebar row **just above Trash**, in the same style.
**Depends on:** 34 (`visibility`, public = readable by everyone signed in), 38 (maps on the server), 40 (collaborators; maps shareable,
their file readable by anyone who may open the map).
**Not in this plan:** reading without signing in, likes / comments on Explore, featured or "trending" lists, full-text search (FTS5),
a public profile page per person, reporting / moderation.
**Main constraint (as before):** as few D1 reads as possible; the new list goes through `crudRoutes` (`backend/src/lib/crud.ts`).

## 0 — What exists already (nothing to build)

| Part | Where |
|---|---|
| A `visibility` column (`private` / `public`) on projects, notes, folders, articles, maps | `lib/ownedTable.ts` (`shareColumns`), migrations 0011, 0017 |
| Switching it: the lock's **Private / Public** (the owner's) | `features/sharing/PrivacyPanel.tsx`, `POST /api/object-rights/apply` |
| Everyone signed in may **open a public object, read-only** | `lib/access.ts` (`accessFrom`: public → `reader`); the article page's reader view; a map's visitor view (`BoardEditor`) |

So "a public field for the objects" is already there. What is missing is **finding** them.

## 1 — Decisions

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | Explore needs **sign-in** (as everything else, 34 U7) | Opening it to visitors without an account is a bigger change (auth, rate limits, what a visitor may see) |
| P2 | Explore shows **articles, maps, projects and folders**; **not notes** | The same tables people can be invited to (40, `INVITABLE`); notes are personal |
| P3 | **Search:** case-insensitive "contains" on the **title**, and on the **preview** (the first words of the text) for articles and projects; at most 100 characters; `%` and `_` typed are matched as themselves | The basics; a full-text index can replace it later without changing the page |
| P4 | Newest **made** first (`created_at`, then `id`), 24 per page, **Load more** | No new column; "newest made public" would need a `published_at` (later) |
| P5 | The caller's own public objects are **included**, tagged **"Yours"** | Seeing your own shows that it worked |
| P6 | An object in its owner's **Trash** is never listed (and can't be opened, as today) | |
| P7 | A **"Public" tag** (a small globe) on the owner's own Dashboard cards and sidebar rows of public objects | You can see what you made public without opening the lock |
| P8 | The Explore row is a **link** (`/explore`), in the sidebar's look of the Trash row: icon + "Explore", only the icon in the closed sidebar, the current-page look while on `/explore` | "Above the Trash button, similar style" |

## 2 — Database

**One migration, `0019_explore_indexes.sql` (generated, read, not applied).** For each of the four tables, an index of its public rows
in the list's order:

```sql
CREATE INDEX `articles_explore_idx` ON `articles` (`visibility`, `archived`, `created_at`, `id`);
CREATE INDEX `maps_explore_idx`     ON `maps`     (`visibility`, `archived`, `created_at`, `id`);
CREATE INDEX `projects_explore_idx` ON `projects` (`visibility`, `archived`, `created_at`, `id`);
CREATE INDEX `folders_explore_idx`  ON `folders`  (`visibility`, `archived`, `created_at`, `id`);
```

- Declared in `lib/ownedTable.ts` for tables with `share: true` and `explore: true` (a new config flag, §3), so drizzle-kit writes them.
- Only `CREATE INDEX`: no table rebuild, no data change. Tested in `src/db/migrations.test.ts` (`EXPLAIN QUERY PLAN` uses each index, no
  temp B-tree for the order).
- No new table, no new column.

## 3 — Shared contract (`packages/shared`)

- `data.config.ts`: `explore: true` on articles, maps, projects, folders; `EXPLORABLE = ['articles', 'maps', 'projects', 'folders']`
  (a test checks it is exactly the tables with the flag, and that each is shareable).
- `explore.ts`:
  - `exploreFilter = z.object({ q: z.string().trim().max(100).optional(), type: z.enum(EXPLORABLE).optional() })`
  - `ExploreItem = { type: ExplorableName; id: number; title: string; preview: string; createdAt: string; owner: Author; mine: boolean }`

## 4 — Backend: `GET /api/explore` (`resources/explore/`, `crudRoutes`, list only)

| Request | Answer |
|---|---|
| `GET /api/explore?q=&type=&limit=&cursor=` | `{ items: ExploreItem[], nextCursor }`: public, not archived, newest first |
| `GET /:id`, `POST`, `PATCH`, `DELETE` | 404 (list only; an object opens through its own table's routes, as today) |

- **One type** (`type=articles`): one query on that table through its explore index:
  `WHERE visibility = 'public' AND archived = 0 [AND (title LIKE ? ESCAPE '\' OR preview LIKE ? ESCAPE '\')] AND (created_at, id) < cursor
  ORDER BY created_at DESC, id DESC LIMIT 25`, joined with `user` for the owner's name and picture.
- **All types:** the same for each of the four tables as one `UNION ALL` (each part through its own index, each limited to 25), ordered and
  cut to 25. The cursor holds `created_at`, the type and the id of the last item, so the next page continues across all four.
- `q`: `%` and `_` escaped (P3). Tables without a preview (maps, folders) match on the title only.
- Cost: one read per page.
- Tests (`explore.repo.test.ts`): only public and not archived; a private one never appears; search by title and preview; `%` is literal;
  one type; paging across types with no repeats; `mine`; an archived public object disappears.

## 5 — Frontend

### 5.1 API and state
- `lib/api/explore.ts`: `exploreApi = createResourceApi<…, ExploreItem, …, ExploreFilter>('/api/explore')` (list only).
- `features/explore/useExplore.ts`: the query and the type in the URL (`/explore?q=lighthouse&type=maps`, so a search can be shared and
  survives Back); reads the first page when they change (the search waits 300 ms after typing), **Load more** for the next.

### 5.2 The page (`pages/Explore/ExplorePage.tsx`, route `/explore` inside `AppLayout`)
```
 Explore
 [ 🔍 Search public articles, maps, projects …              ]
 ( All ) ( Articles ) ( Maps ) ( Projects ) ( Folders )

 ┌ book ┐ ┌ book ┐ ┌ map  ┐ ┌ folder ┐      ← the Dashboard's own cards (book, map frame, folder),
 │      │ │      │ │      │ │        │        each with its creator (picture + name) under it,
 └──────┘ └──────┘ └──────┘ └────────┘        "Yours" on your own
                 [ Load more ]
```
- Cards: `features/explore/ExploreCard.tsx` reuses the Dashboard's card faces (`features/dashboard/cards/`: the book for articles, the map
  frame for maps, the folder face) **without** the owner's ⋯ menu; the creator's picture and name under the card.
- A click opens it as a panel page (`workspace.hrefOf`), read-only for others (it already is).
- Empty states: "Nothing public yet" / "Nothing matches “…”". Errors with **Try again**.
- Phones: 2 cards per row, the filters scroll sideways.

### 5.3 The sidebar row (`components/layout/sidebar/ExploreLink.tsx`)
- In `Sidebar.tsx`, in the bottom block, **above `<TrashBin />`**, with the same gap.
- The Trash row's look: `SIDEBAR_ROW` + `TREE_ROW_LOOK`, the same icon offset and size (bigger in the closed sidebar), the label fading out
  in the closed sidebar, `title="Explore"`. Icon: Lucide `LuCompass`.
- A `NavLink` to `/explore`: on that page it keeps the row's current-page look (`aria-current="page"`).
- Not a drop target (things dropped on it do nothing).

### 5.4 The "Public" tag (P7)
- A small globe (`LuGlobe`, faint) on the owner's own Dashboard cards and sidebar rows whose `visibility` is `public` (the list already
  carries it). `title="Public: anyone signed in can find and read it"`.

## 6 — Edge cases

| Case | What happens |
|---|---|
| Made private again | It leaves Explore at once (next read); anyone with it open gets "no longer available" on their next read |
| Put in the Trash | Not listed (P6) |
| The owner's account deleted | Its rows go (cascade): gone from Explore |
| A collaborator's copy | There is none: one row, listed once, under its creator |
| A very long or empty search | Trimmed to 100 characters; empty = no search |
| Notes made public (they can be) | Readable by link as today, not listed (P2) |

## 7 — Tests and checks

- `packages/shared`: `exploreFilter`, `EXPLORABLE` matches the flag.
- `backend`: `explore.repo.test.ts` (§4); `migrations.test.ts` for 0019's indexes.
- `app`: `useExplore` (URL ↔ query, debounce, paging); `buttons.test.ts` stays green (the sidebar row is a link, not a `<button>`).
- Browser: Explore on desktop and phone; the sidebar row open and closed; opening an article and a map read-only.

## 8 — What the user runs (after review)

```
cd backend
npx drizzle-kit generate            # 0019 (read it: only CREATE INDEX)
npx wrangler d1 migrations apply map-db --local
npx wrangler d1 migrations apply map-db --remote
npm run deploy
```

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `explore` flag, `EXPLORABLE`, `explore.ts` + tests | `packages/shared/src/data.config.ts`, `table.ts`, `explore.ts`, `index.ts` |
| 2 | Explore indexes; migration 0019 + its test | `backend/src/lib/ownedTable.ts`, `backend/drizzle/0019_*`, `src/db/migrations.test.ts` |
| 3 | `/api/explore` repo + routes + tests; mount | `backend/src/resources/explore/*`, `src/index.ts` |
| 4 | API and `useExplore` | `app/src/lib/api/explore.ts`, `app/src/features/explore/useExplore.ts` |
| 5 | Explore page and cards; route | `app/src/pages/Explore/ExplorePage.tsx`, `app/src/features/explore/ExploreCard.tsx`, `app/src/routes/index.tsx` |
| 6 | Sidebar row above Trash | `app/src/components/layout/sidebar/ExploreLink.tsx`, `Sidebar.tsx` |
| 7 | "Public" tag on own cards and rows | `app/src/features/dashboard/ResourceCard.tsx`, `components/ui/tree/TreeItem.tsx` (or its row) |
| 8 | Docs and all checks | `instructions/explore.md` |

## Open items

1. P1–P8 are defaults: say which to change.
2. Later: anonymous visitors (P1), "newest made public" (`published_at`), full-text search, a person's public page.
