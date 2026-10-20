# 25 — Notes on the server (frontend) and the resource registry

**Goal:** the frontend creates, reads, updates, trashes and deletes **notes through the backend API** (`/api/notes`) instead of the
mock store, and does it with code any later table can reuse: a typed API layer, data hooks, a **resource definition + registry**, and
generic list / form / field components. The Trash, the navbar search and Recent read the registry, so a new table appears in them by
adding one definition. Notes stop being a kind of mock object; `locked`, `draggable`, `likes`, the `article` and `folder` kinds and the
checklist mode are removed from the frontend. **No table, migration or schema change.**
**Depends on:** the backend as built in this session (`notes` table with `title`, `content`, `preview`, `archived`, `pinned`,
`position`; `GET/POST/PATCH/DELETE /api/notes`; the `richText` contract), 03 (panel registry), 04–06 (mock sidebar, trash), 12–14
(dashboard), 15–16 (create button, note modal).
**Blocks:** a later cache plan (the hooks are its seam), the `articles` table (it will be the second resource), image upload in notes.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **No table changes.** No migration, no edit of `backend/src/db/schema.ts`, no change of the notes contract (`packages/shared/src/notes.ts`) | User |
| D2 | **Removed from the frontend:** the fields `locked`, `draggable`, `likes`, `liked`; the kinds `article` and `folder` (a folder only holds articles); the checklist mode (`items`, `ChecklistEditor`, `checklist.ts`). Articles come back later as their own table; **no `articles` table now** | User |
| D3 | **The checklist is part of the note's HTML**: Tiptap `TaskList` + `TaskItem` in the editor. The shared sanitizer must keep that markup (§3.1) | User |
| D4 | **No cache system.** The hooks fetch when a component mounts and keep nothing else. The hook API is the seam where the cache plan plugs in later | User |
| D5 | **Nothing about linking notes in the backend.** In the frontend the note-linking UI is switched off for notes (§3.2): no `AddNoteForm`, no "Add note", no "Linked to", no link badges. The generic link plumbing (`features/links`) stays in place, dormant | User |
| D6 | **`archived: true` = in the Trash and nowhere else**: not in the sidebar, the Dashboard, Recent, the navbar search, the Notes page, nor a pane (a pane opened on a trashed note says so, with Restore) | User |
| D7 | **Dev against the live Worker** (the Vite proxy as it is today). Therefore the production database needs migrations `0001`–`0004` and the Worker needs a deploy **before** the frontend can work (§1). Dev edits are production data | User |
| D8 | **Top-level mock objects** (maps and object cards without a project) that the sidebar's "Notes" section showed move to a new mock-only section **"Objects"**; "Notes" shows only server notes | User |
| D9 | **Search is client-side, over title + preview** of the user's non-archived notes (no new backend filter) | User |
| D10 | **Pin = the server's `pinned` field.** Pinned notes come first in the "Notes" section (the server's order: `pinned DESC, position, id`), with a pin icon. The sidebar's "Pinned" section keeps showing the mock pins only | User |
| D11 | **Autosave as designed earlier in this conversation:** save after 5 s without a change, at most every 30 s of continuous typing, a local draft kept in `localStorage` (per user and note), a send when the page is hidden/closed (`fetch` with `keepalive`), the draft removed only after a 2xx | User |
| D12 | **A panel on a note:** type `note`, id = the server id as a string (`note:5` in URLs, layouts and Recent). `PanelRef.id` is already a string | Default |
| D13 | **Panel titles of resources are generic** ("Note") wherever `PanelDefinition.title` is read synchronously (pane header, saved layouts, Trash layout labels). The note's own title shows inside `NotePanel`. The real titles come with the cache plan | Default |
| D14 | **A note with an empty title** shows as "Untitled note" (the server allows `title: ''`) | Default |
| D15 | **Where the registry lives:** `app/src/resources/` (definitions + registry), `app/src/lib/api/` (HTTP), `app/src/lib/resource/` (hooks, autosave), `app/src/components/ui/resource/` (generic components) | Default |
| D16 | **Several components showing notes fetch separately** (no sharing without a cache). A tiny change bus refetches every mounted list/item after a write, so screens agree. It stores no data | Default |
| D17 | **Pure logic is tested in Node** (vitest; there is no component-testing library in `app/`): the HTTP client, the hook state reducers, the autosave machine, search, the registry. The screens are checked by hand (§ Testing) | Default |
| D18 | **Last write wins** on the server (no `expectedUpdatedAt` / 409). The only conflict check is when a local draft is found on open (§5.4) | Default |
| D19 | **Language of this plan:** English, like plans 01–24 | Default |

## 1 — Risks and blockers

- **Blocker — the live database and Worker are behind.** Migrations `0001`–`0004` (notes columns, `preview`, list index) and the new
  Worker code are not on the live service: `wrangler d1 migrations apply map-db --remote` failed with Cloudflare error 7403 earlier
  (OAuth token / account). Until that is fixed and `npm run deploy` is done, every `/api/notes` call from the frontend fails or
  hits the old schema. **Do the user's steps first:** fix the login (or use an API token with D1 Edit), apply the migrations remotely,
  run `npm run backfill:previews -- --remote`, deploy the Worker. No task below can be verified before that.
- **Dev edits production data** (D7): the Vite proxy sends `/api` to `https://map.kopotitore.workers.dev`. Test with a throwaway
  account, not with real notes.
- **Rate limit:** `API_GENERAL` allows 120 requests per minute per IP. Without a cache, one Dashboard load fetches the notes list
  several times (sidebar, column, row, Trash count). It fits, but the limit is the reason the cache plan comes next.
- **The note HTML must survive the server's sanitizer.** Today it drops `data-*`, `label`, `input`, `div`, which is exactly what
  Tiptap's task list writes. Without task 1 a checklist is silently lost on the first save (§3.1).
- **Wide refactor surface.** Notes are a *kind of mock object* in about 25 files (sidebar, dashboard rows and cards, Recent,
  search, create flows, drag and drop, trash). Each phase below ends with a compiling app and green tests; do not start the next
  phase on a red build.
- **Existing tests build mock objects with `locked`, `draggable`, `likes`** (`search.test.ts`, `rows.test.ts`, `place.test.ts`,
  `projectsStore.test.ts`, `createFromModal.test.ts`, `linkPick.test.ts`, `treeDrop.test.ts`, `columns.test.ts`…). They change with
  phase A, not after.
- **Async replaces sync.** The mock store answers instantly; the API does not. Every flow that did `createNote(...)` then used the
  result (the Create modal's toast, `QuickCreate`, the Dashboard's pending card) needs a pending / error state.
- **Working tree:** clean except the unrelated `docs/ideas/textupdate.md`. Commit this plan alone; start phase A from a clean tree.

## 2 — Architecture

```
app/src/
├── lib/api/
│   ├── client.ts            request(): base URL, cookie (web) or bearer (desktop), JSON, ApiError, 401 hook
│   └── resource.ts          createResourceApi<…>(path): list / get / create / update / remove (types from @map/shared)
├── lib/resource/
│   ├── hooks.ts             useResourceList / useResourceItem / useResourceActions (no cache)
│   ├── state.ts             pure reducers behind the hooks (tested)
│   ├── changes.ts           the change bus: notifyChanged(name), subscribe
│   ├── autosave.ts          pure machine: when to save, what to do on hide, drafts (tested)
│   └── useAutosave.ts       the hook over it + localStorage drafts
├── resources/
│   ├── types.ts             ResourceDefinition, FieldDef, Surfaces
│   ├── registry.ts          RESOURCES = [notesResource]   ← the only list a new table is added to
│   ├── widgets.ts           FIELD_WIDGETS: 'text' → TextField, 'richText' → RichTextField
│   └── notes/
│       ├── notes.resource.ts   the notes definition (api, label, icon, fields, row, surfaces)
│       └── NotePanel.tsx, NoteEditor.tsx   (moved from features/notes, rewritten on the hooks)
└── components/ui/resource/
    ├── ResourceList.tsx     loading / empty / error / "load more" around a list
    ├── ResourceRow.tsx      a row: icon, title, preview, pin mark, drag, ⋯ menu
    ├── ResourceForm.tsx     a draft form built from `ui.fields`, with SaveStatus
    ├── FieldRenderer.tsx    one field → its widget
    ├── SaveStatus.tsx       saving… / saved / failed / offline
    └── ResourceDeleteDialog.tsx   "Delete for good?" for any resource
```

Data flow: **component → `useResource*` hook → `resource.api` → `request()` → `/api/…`**. After a write the hook calls
`notifyChanged('notes')`; every mounted list/item of that resource refetches. A hook's result for the same item is also set straight
from the write's response (the server's note, with the cleaned `content` and the new `preview`).

**A resource definition** (the one file per table; typed from `@map/shared`):

```ts
export const notesResource: ResourceDefinition<Note, NoteListItem, NoteInput, NoteUpdate> = {
  name: 'notes',
  panelType: 'note',
  api: createResourceApi('/api/notes'),
  config: notesConfig,                       // order flags, list filters (shared)
  ui: {
    label: 'Note', plural: 'Notes', icon: LuStickyNote, untitled: 'Untitled note',
    fields: [
      { name: 'title',   widget: 'text',     placeholder: 'Title' },
      { name: 'content', widget: 'richText', placeholder: 'Take a note…' },
    ],
    row: { title: 'title', subtitle: 'preview' },
  },
  surfaces: { sidebar: { limit: 5 }, page: '/notes', panel: true, search: true, recent: true, trash: true, dashboard: true },
}
```

`ui.fields[].name` is typed as `keyof Note`, so removing a field in the contract fails the build where it is still listed.

**Trash rule, enforced once:** `useResourceList(resource, { trashed })` sends `archived=false` unless the caller passes
`trashed: true`. Only the Trash modal and the Trash count pass it. Sidebar, Dashboard, Notes page, search and Recent cannot
forget the rule because they never write the filter themselves.

## 3 — Details per area

### 3.1 Shared / backend code the frontend needs (no table)

- `packages/shared/src/sanitize-html.ts`: keep Tiptap's task-list markup, and nothing wider:
  `ul[data-type="taskList"]`; `li[data-type="taskItem"][data-checked="true|false"]`; inside such an `li` exactly
  `label > input[type=checkbox][checked] + span` and `div` (the item's paragraph). Any other `data-*`, any other `input`, any `label`
  or `div` elsewhere is still dropped (a stack check: the parent must be the task item / its label). Verified shape of Tiptap's
  output: `@tiptap/extension-list` `TaskItem.renderHTML`.
- `previewOf` already ignores the markup (no text in `label`/`input`); add a test with a checklist.
- `app/package.json`: add `@tiptap/extension-list` (already installed through StarterKit) so `TaskList`/`TaskItem` are imported
  directly.

### 3.2 Phase A — Clean the frontend, notes out of the mock store

**Mock model (`mocks/projects.ts`, `mocks/projectsStore.ts`):**
- `ObjectKind = 'project' | 'map' | 'object'`. `MockObject` loses `locked`, `draggable`, `likes`, `liked`, `text`, `items`.
  `ChecklistItem`, `NOTES`, `EXTRAS` articles/folders, `lockedFor`, `base.draggable`, the `stamp()` likes, `KIND_LABEL` entries,
  `canPlace` rules for notes/articles/folders go. Seed: the projects, maps, and the two object cards (`o1`, `o2`).
- The behaviour the removed fields carried now comes from the kind: only a **project** takes a drop into it; every object is
  draggable; the Dashboard / Overview rows stay non-draggable because their `TreeNode`s say so (`TreeNode.draggable/locked`
  stay, they are the tree component's own API).
- `projectsStore.ts`: remove `createNote`, `createArticle`, `updateNote`, `toggleLike`, `emptyTrash`'s note handling; `duplicateObject`
  and `moveObject` lose their note/folder branches.
- `isNoteLike(kind: string)` stays for the drag/link code but is now true only for the resource kind `'note'` (a drag item from a
  server note), not for mock objects.

**Removing articles and folders:** `ArticleCard`, `FolderCard`, `folderDropKey`, `FolderPanel`, the `article`/`folder` entries in
`panels.ts`, `KIND_ICON`, the folder logic in `treeDrop.ts`, `useRowDrop.ts`, `DashboardSections.tsx` (`folderId`, `ROOT_KINDS`,
`PROJECT_KINDS`), `place.ts` (`CREATE_KINDS`, folder/article rules), `CreateModal.tsx` tabs, `ObjectDialogs.tsx`, `AddNoteForm.tsx`
(article tab), the search filter kinds.

**Removing likes:** the like button in `ObjectPanel.tsx`; the `'liked'` sort in `dashboard/rows.ts` (`CardSort`, `SORT_LABEL`) and the
sort menu entry in `RowHeader`.

**Removing the checklist:** `features/notes/ChecklistEditor.tsx`, `checklist.ts`, `checklist.test.ts`; the toggle in the note editor.
The editor gets the task-list buttons instead (§3.5).

**Switching note-linking off (D5), entry points only:** `AddNoteForm` and its use in `ObjectLinksSection` (the section shows the
object's existing links only; the `action === undefined` default becomes "nothing"); the "Add note" item in `useObjectActions`;
`LinkedList` in `NotePanel`, `ProjectPanel`, `ObjectPanel`; note creation with `linkTo` in `createFromModal`; the path picker in the
Create modal for notes. `features/links/*`, `LinkPickBar` and the board's link list for non-note targets stay untouched; they only
ever receive ids of mock objects now, so a server note can never become a link target.

**Sidebar (`mocks/sidebarTree.ts`, `SidebarTree.tsx`, `SidebarNotes.tsx`):** `buildSidebarSections` returns `objects` (the top-level
non-project mock objects) where it returned `notes`. `SidebarNotes` is reused unchanged for the **"Objects"** section (label,
`aria-label`, `NOTES_END` drop id renamed); a new notes section component is added in phase E.

### 3.3 Phase B — API layer and hooks (no cache)

`lib/api/client.ts`
- `request<T>(path, init)`: base `''` (same origin) on the web, `SITE_URL` on desktop; `credentials: 'include'` on the web;
  `Authorization: Bearer <token from session-token.ts>` on desktop (the rule `lib/auth-client.ts` already follows).
- JSON in and out; `204` → `undefined`. A non-2xx answer becomes `ApiError { status, code, message, details }` from the API's
  `{ code, message, details }` body; a network failure becomes `ApiError` with `status: 0`.
- `401`: call a registered `onUnauthorized` (set once by `AppProvider`; it goes to `/sign-in`). No retry loops.
- Never logs request bodies.

`lib/api/resource.ts` — `createResourceApi<TItem, TListItem, TInput, TUpdate, TFilter>(path)`:
`list(filter, { limit, cursor })` → `Page<TListItem>`, `get(id)`, `create(input)`, `update(id, patch)`, `remove(id)`. The query string
is built from the filter and page (`?archived=true&limit=30&cursor=…`).

`lib/resource/hooks.ts` (state transitions in `state.ts`, pure and tested):
- `useResourceList(resource, { trashed?, limit? })` → `{ items, status, error, hasMore, loadMore, refresh }`. Aborts on unmount,
  ignores out-of-order answers, refetches on the change bus.
- `useResourceItem(resource, id)` → `{ item, status, error, notFound, refresh }`.
- `useResourceActions(resource)` → `{ create, update, remove, trash, restore }` (async; `trash` = `update({archived:true})`,
  `restore` = `update({archived:false})`); each notifies the bus and returns the server's answer.
- Default page size: `PAGE_SIZE_DEFAULT` (20); the sidebar asks `limit` = its `sidebar.limit + 1`; the search index asks 100 per page.

### 3.4 Phase C — Resource definition and registry

`resources/types.ts` (the type above, plus `Surfaces`), `resources/widgets.ts` (the widget table; a new field type = one entry),
`resources/notes/notes.resource.ts`, `resources/registry.ts` (`RESOURCES`, `resourceByPanelType(type)`, `resourceByName(name)`).
`panels.ts`: the `note` entry is generated from the registry (`resourcePanels(RESOURCES)`), `article` and `folder` are gone;
`title: () => resource.ui.label` (D13); `component` lazy `NotePanel`.

### 3.5 Phase D — Generic screens and widgets

- `ResourceList`, `ResourceRow` (draggable like `ObjectRow`: `useObjectDrag` with `object.kind = resource.panelType`, so it still
  drops onto pane edges and the Trash; no link behaviour), `ResourceForm` + `FieldRenderer` + `SaveStatus`, `ResourceDeleteDialog`.
- Row actions from the definition (`useResourceActions` menu groups): Rename (inline title edit), Pin / Unpin, Duplicate (get + create),
  Add in screen, **Move to Trash**; in the Trash: Restore, **Delete for good**. "Move to" and "Add note" do not exist for notes.
- The note editor (`NoteEditor`, used by the modal, the panel and the Dashboard card) = borderless title input + `RichTextField`
  with the toolbar and two new buttons: bullet/numbered stay, **task list** added (`TaskList`, `TaskItem` extensions added to
  `RichTextEditor` for non-plain editors). Saves through `useAutosave`.
- `useAutosave` per D11: `autosave.ts` is a pure machine (events `change`, `idle`, `maxWait`, `hide`, `saved`, `failed`, `open` →
  effects `save`, `writeDraft`, `clearDraft`, `askConflict`). Drafts: `localStorage` key `map:draft:<userId>:<resource>:<id>`
  (value, `baseUpdatedAt`); every storage call is in try/catch (private mode). On open, a draft whose `baseUpdatedAt` equals the
  server's `updatedAt` is applied and saved; otherwise a dialog offers "Keep my changes" / "Use the server's version". Only the
  fields that changed are sent, and `content` only when it changed. `visibilitychange` (hidden) and `pagehide` try `fetch` with
  `keepalive: true` (64 KB limit); a larger body stays as the draft. Logout clears this user's drafts.

### 3.6 Phase E — Notes on the registry

| Screen | Change |
|---|---|
| Sidebar "Notes" (`SidebarTree.tsx`) | new `ResourceSidebarSection` (replaces the notes half of `SidebarNotes`): `useResourceList(notes)`, rows as `TreeNode`s (`panel: { type:'note', id }`, pin icon on pinned, menu from `useResourceActions`, in-place rename → `update({title})`), "Show more", `+` opens the create dialog |
| `NotesPage.tsx` | `ResourceList` of notes; the "drag onto a project to link" sentence is removed |
| `NotePanel.tsx` | `useResourceItem`; archived → "This note is in the Trash" + Restore; 404 → "Not found" |
| `NoteModal.tsx` | the editor inside the modal, opened by id from the Dashboard card |
| `QuickCreate.tsx` | single kind: the Note/Article menu goes; Create → `create({ title, content })`, pending + error state, the draft stays on failure |
| `CreateModal.tsx`, `place.ts`, `createFromModal.ts` | tabs: Note, Object, Map; a note has no path and no link; `createFromModal` becomes async (returns a Promise; the modal shows saving / error) |
| `ObjectDialogs.tsx` | the "New note" name dialog calls the API; delete dialog for notes → `ResourceDeleteDialog` |
| Dashboard: Notes column (`ColumnBodies.tsx`), Notes row (`DashboardSections.tsx`), `NoteCard` (`Cards.tsx`) | server notes via the hook; the card shows `preview`; `Card`'s `object` type is widened so a row can hold notes or mock objects; the row's sort offers Newest / Oldest only; **no drag between rows for notes** (as today) |
| `useObjectActions.tsx` | for kind `note`, `menuOf` delegates to the resource's menu groups |
| `panels.ts`, `LayoutsSection.tsx`, `layoutsStore.ts` | `exists(panel)` is `true` for resource panel types (the panel itself shows "Not found") |

New note position: the request sends no `position` (the server default `0`; ties order by `id`, so a new note is last among
unpinned). See Open items.

### 3.7 Phase F — Trash, search and Recent read the registry

- **Trash (`TrashBin.tsx`, `TrashModal.tsx`):** the count adds, per resource with `surfaces.trash`, `useResourceList(resource,
  { trashed: true, limit: 100 })`'s length ("99+" past the page). The modal gets one section per such resource (restore / delete for
  good with confirmation) next to the mock objects and layouts. **Empty trash** deletes the server items one by one (no bulk endpoint),
  stops at the first failure and reports it. Dropping a note row on the bin calls `resource.trash(id)` (`sidebarDropState.ts`'s
  `archiveWithEffect` branches on the dragged kind).
- **Search (`search.ts`, `NavSearch.tsx`, `SearchPanel.tsx`):** while the search is open it loads each searchable resource's
  non-archived list (pages of 100, at most 5 pages) and filters on `fold(title + preview)` with the existing word logic
  (`searchItems`), merged with `searchObjects` for the mock objects; best match first, as today. `SearchFilters.types` becomes a
  string union of mock kinds + resource kinds (the "Note" chip stays); an active **project filter hides notes** (they have no
  project). The result row for a note shows `preview` as its hint. A note in the Trash can never appear (the list is `archived=false`).
- **Recent (`RecentList.tsx`, `recentStore.ts`):** a one-panel entry whose type belongs to a resource renders
  `ResourceRecentRow`: `useResourceItem`, the note's title, an empty render while loading, and on `notFound` or `archived` it removes
  the entry (`removeRecent(key)`). Entries are unchanged (`note:5`).

## Testing

Vitest in Node (D17). Gates after every phase: `npx tsc -b`, `npx vitest run`, `npx oxlint`, `npx vite build` in `app/`.

| Area | Tests |
|---|---|
| `lib/api/client.ts` | with a fake `fetch`: base URL web vs desktop, bearer header, error body → `ApiError`, `204`, network failure, `401` calls the hook |
| `createResourceApi` | the exact URLs and query strings for list / get / create / update / remove, with `archived`, `limit`, `cursor` |
| `lib/resource/state.ts` | reducer cases: first page, load more, out-of-order answer ignored, refetch, mutation answer applied |
| `autosave.ts` | idle 5 s, max-wait 30 s, hide with a small and a large body, failed save keeps the draft, success clears it, draft conflict on open |
| Registry | every definition has a unique `name` and `panelType`; `ui.fields` names exist in the contract's keys; widgets cover every `widget` used |
| Search | `searchItems`: words, accents, best-match order, project filter excludes notes, nothing for an empty query; the mock `searchObjects` tests updated (no `locked`/`draggable`/`likes`) |
| Trash rule | `useResourceList`'s request builder sends `archived=false` by default and `true` only for `trashed: true` |
| Sanitizer (`packages/shared`) | a real Tiptap task list passes unchanged; a stray `input`, `label`, `div`, `data-type` or `onclick` is dropped; `previewOf` of a checklist |
| Updated old tests | `projectsStore`, `rows`, `place`, `createFromModal`, `linkPick`, `treeDrop`, `columns`, `search` — fixtures without the removed fields and kinds |

By hand against the live Worker (throwaway account), after the blocker is cleared: sign in; create a note from the Dashboard
card, the Create modal and the sidebar `+`; type, pause 5 s, reload (saved); type and close the tab at once, reopen (draft sent);
make a checklist, tick an item, reload (kept); pin / unpin (order changes in the sidebar and the page); rename in place; open as a
pane; move to Trash (gone from sidebar, Dashboard, search, Recent; present in the Trash with the count); restore; delete for good;
empty the Trash; search by title and by the start of the text; open Recent after deleting from another tab; sign out and in as
another user (no leftovers from the first); desktop build: the bearer token path.

Limits: no component tests (D17); the live Worker is the only integration target (D7), so a failing run can be the backend's; keep
the throwaway account's data small.

## Task list

| # | Task | Files |
|---|---|---|
| **0** | **User:** fix the Cloudflare login, apply migrations `0001`–`0004` remotely, run the previews backfill, deploy the Worker | `backend/` (commands only) |
| 1 | Sanitizer keeps the task-list markup + tests (incl. `previewOf`) | `packages/shared/src/sanitize-html.ts`, `sanitize-html.test.ts`, `plain-text.test.ts` |
| **A** | **Clean the frontend** | |
| 2 | Mock model: kinds, fields, seeds, `canPlace`, `KIND_LABEL`; store functions; fix `projectsStore.test.ts` | `mocks/projects.ts`, `mocks/projectsStore.ts`, `mocks/projectsStore.test.ts` |
| 3 | Remove articles and folders everywhere (cards, panels, create tabs, drop rules, search kinds, dialogs) | `features/dashboard/cards/Cards.tsx`, `CardShell.tsx`, `features/objects/FolderPanel.tsx`, `panels.ts`, `features/create/place.ts` (+ test), `CreateModal.tsx`, `features/objects/ObjectDialogs.tsx`, `components/layout/sidebar/treeDrop.ts` (+ test), `features/dashboard/useRowDrop.ts`, `DashboardSections.tsx`, `features/search/search.ts` (+ test) |
| 4 | Remove likes and the "Most liked" sort | `features/objects/ObjectPanel.tsx`, `features/dashboard/rows.ts` (+ test), `RowHeader.tsx` |
| 5 | Remove the checklist mode | `features/notes/ChecklistEditor.tsx`, `checklist.ts`, `checklist.test.ts`, `NoteModal.tsx` |
| 6 | Switch note-linking off at its entry points | `features/board/sidebar/common/AddNoteForm.tsx` (delete), `ObjectLinksSection.tsx`, `features/objects/useObjectActions.tsx`, `features/links/LinkedList.tsx` uses in `NotePanel.tsx`, `features/projects/ProjectPanel.tsx`, `ObjectPanel.tsx`, `features/create/createFromModal.ts` (+ test) |
| 7 | Derive tree `locked`/`draggable` from the kind; sidebar "Notes" → "Objects" (mock) | `mocks/sidebarTree.ts`, `components/layout/sidebar/SidebarTree.tsx`, `SidebarNotes.tsx`, `Sidebar.tsx`, `features/dashboard/cards/*`, `LayoutThumb.tsx` |
| 8 | Update the other old tests; gates green; commit | `features/dashboard/columns.test.ts`, `features/links/linkPick.test.ts`, `features/share/shareLinks.test.ts`, … |
| **B** | **API and hooks** | |
| 9 | `request()` + `ApiError` + tests | `lib/api/client.ts`, `client.test.ts` |
| 10 | `createResourceApi` + tests | `lib/api/resource.ts`, `resource.test.ts` |
| 11 | State reducers, change bus, hooks + tests | `lib/resource/state.ts`, `changes.ts`, `hooks.ts`, `state.test.ts` |
| 12 | `onUnauthorized` wired in `AppProvider` | `context/AppContext.tsx` |
| **C** | **Definition and registry** | |
| 13 | Types, widgets table, notes definition, registry, `resourcePanels` | `resources/types.ts`, `widgets.ts`, `notes/notes.resource.ts`, `registry.ts`, `registry.test.ts`, `panels.ts` |
| **D** | **Generic screens and widgets** | |
| 14 | `ResourceList`, `ResourceRow`, `SaveStatus`, `ResourceDeleteDialog` | `components/ui/resource/*` |
| 15 | `FieldRenderer` + `ResourceForm` | `components/ui/resource/FieldRenderer.tsx`, `ResourceForm.tsx` |
| 16 | Task list in the editor (extensions + toolbar button) | `components/ui/editors/RichTextEditor.tsx`, `RichTextToolbar.tsx`, `app/package.json` |
| 17 | Autosave machine + hook + tests | `lib/resource/autosave.ts`, `autosave.test.ts`, `useAutosave.ts` |
| 18 | `useResourceActions` menu groups (pin, rename, duplicate, panel, trash, restore, delete) | `lib/resource/actions.tsx` |
| **E** | **Notes on the registry** | |
| 19 | `NoteEditor` + `NotePanel` on the hooks (archived / not found states) | `resources/notes/NoteEditor.tsx`, `NotePanel.tsx` (moved), `NoteModal.tsx` |
| 20 | Sidebar Notes section | `components/layout/sidebar/ResourceSidebarSection.tsx`, `SidebarTree.tsx` |
| 21 | Notes page | `pages/Notes/NotesPage.tsx` |
| 22 | `QuickCreate` | `features/notes/QuickCreate.tsx` |
| 23 | Create modal and `createFromModal` (async) | `features/create/CreateModal.tsx`, `place.ts`, `createFromModal.ts` (+ tests), `ObjectDialogs.tsx` |
| 24 | Dashboard: Notes column, Notes row, `NoteCard`; `Card` object type widened | `features/dashboard/ColumnBodies.tsx`, `DashboardSections.tsx`, `cards/Cards.tsx`, `cards/CardShell.tsx` |
| 25 | `useObjectActions` delegates for notes; `exists()` for resource panels | `features/objects/useObjectActions.tsx`, `features/layouts/LayoutsSection.tsx` |
| **F** | **Trash, search, Recent** | |
| 26 | Trash count + modal sections; drop on the bin archives a note | `components/layout/sidebar/TrashBin.tsx`, `TrashModal.tsx`, `sidebarDropState.ts` |
| 27 | Search over resources (`searchItems`, filters, hints) + tests | `features/search/search.ts`, `search.test.ts`, `NavSearch.tsx`, `SearchPanel.tsx` |
| 28 | Recent rows for resources, pruning gone entries | `features/recent/RecentList.tsx`, `ResourceRecentRow.tsx` |
| 29 | Docs: `instructions/adding-a-resource.md` gets a "frontend" part (how to add a table to the registry); remove the notes mentions from `adding-a-panel.md` | `instructions/*` |
| 30 | Full by-hand pass (Testing), gates green | — |

Files **not** touched: `backend/src/db/schema.ts`, `backend/drizzle/*` (no migration), `packages/shared/src/notes.ts` (the notes
contract), `backend/src/resources/notes/*`, anything about a link route, `app/src/features/board/*` except the `AddNoteForm` removal
(task 6), `features/workspace/*` (the panel engine), `components/ui/tree/*` (the tree component).

## Open items

1. **Where does a new note appear?** With no `position` sent, a new note is the **last** of the unpinned notes (id order), so the
   sidebar's first five rows hide it behind "Show more". Options for a follow-up: place new notes first (needs a `positionBetween`
   helper in `shared` and a free slot at the top) or add drag-reorder in the sidebar. Not decided; this plan keeps "last".
2. **Real titles in panes, layouts and Recent** wait for the cache plan (D13).
3. **Conflict detection on the server** (`expectedUpdatedAt`, 409) is not included (D18).
4. **Image upload inside notes** (the editor already supports an `onUploadImage` prop and the images API exists) is not in this plan.
5. **Share (`features/share`)**: it reads `data-share-id` from rows. Check at task 20 whether sharing a server note makes sense;
   until then the attribute stays on note rows, unused.
6. **Who runs task 0**, and whether the Worker's `CORS`/`WEB_ORIGINS` already list the dev origins `http://127.0.0.1:5173` and
   `http://localhost:5173` (they do in `wrangler.jsonc` today; recheck after any deploy).
