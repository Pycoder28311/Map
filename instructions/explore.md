# Public objects and Explore

The design is in `docs/plans/41-explore-public-objects.md`.

## What it does

- An article, map, project or folder made **public** (the lock's Private / Public, its owner's) can be **found** by anyone signed in on the
  **Explore** page (`/explore`), and opened read-only (as before: `lib/access.ts`, public → `reader`). Notes can be public too but are not
  listed.
- Explore lists them newest first (24 a page, Load more), as the Dashboard's own cards with who made them ("Yours" on your own); a search
  (titles, and the first words of articles and projects; `%` and `_` are literal) and the kind (All, Articles, Maps, Projects, Folders).
  The search and the kind are in the address: `/explore?q=lighthouse&type=maps`.
- The sidebar's **Explore** row, just above Trash, in its look; your own public objects have a small globe on their card and their row.

## Where things are

```
packages/shared/src/data.config.ts   `explore: true` on the four tables; EXPLORABLE
packages/shared/src/explore.ts       exploreFilter (q, type), ExploreItem
backend/src/lib/ownedTable.ts        <table>_explore_idx (visibility, archived, created_at, id) on explorable tables
backend/drizzle/0019_*               those four indexes (CREATE INDEX only)
backend/src/resources/explore/       GET /api/explore (crudRoutes, list only): one query, each table through its own index (UNION ALL)
app/src/features/explore/            useExplore (address ↔ search, paging), ExploreCard (CardFace, readOnly)
app/src/pages/Explore/ExplorePage.tsx
app/src/components/layout/sidebar/ExploreLink.tsx
```

## Making another table explorable

Give it `share: true` and `explore: true` in `data.config.ts` and add it to `EXPLORABLE`; `npx drizzle-kit generate` writes its index. Its
card comes from its resource's `ui.card` (resources.config.ts).
