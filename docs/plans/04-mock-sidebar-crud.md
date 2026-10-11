# 04 — Mock sidebar CRUD, blurred modal, animated ☰

**Goal:** the sidebar's projects and maps can be created, renamed, duplicated, moved and deleted in the
UI, on in-memory mock data that resets on reload. All the data logic lives in **one mock file** that is
deleted later, when the real backend data arrives. The existing `Modal` gets a blurred backdrop and is
used for every dialog. The navbar's ☰ grows, loses the word "Menu", and turns into an ✕ (and back) as
the sidebar opens and closes.

**Depends on:** plan 03 (workspace panels, sidebar tree), already built. **Blocks:** nothing. Later,
the real projects/maps API replaces `mocks/projectsStore.ts`.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Scope: **projects and maps** only. Dashboard, the Projects root row and each project's Overview row are fixed: no rename, duplicate, move or delete | User |
| D2 | Create (+), Move to and Delete use the modal. **Rename happens in place**: the name turns into an input inside the row (double-click on the name, or the menu's Rename); Enter / clicking away saves, Esc cancels. *(Changed after implementation: was a rename modal)* | User |
| D3 | Data is in memory only (module state). Reload = back to the seed data in `mocks/projects.ts` | User |
| D4 | All mock CRUD code goes in **one new file**, `app/src/mocks/projectsStore.ts`. The UI calls only its exported functions and hook, so going to the real API means replacing that file (same function names, async later) | User |
| D5 | Upgrade the existing `components/ui/overlays/Modal.tsx` (native `<dialog>`, already centred, closes on Esc and on a backdrop click) and don't write a new one. Add a blurred backdrop and a short opening animation | User |
| D6 | Plan location: `docs/plans/04-mock-sidebar-crud.md` | User |
| D7 | Which actions each row gets. **Projects root:** `+` = new project, no ⋯ menu. **Project:** `+` = new map; menu: Rename, Duplicate, Delete. **Map:** no `+`; menu: Rename, Duplicate, Move to, Delete. Dashboard / Overview: no right icons | Default |
| D8 | The other menu items (Pin, Add note, Add in screen, Archive) stay as they are, as no-ops | Default |
| D9 | Projects have no "Move to" (they have only one possible parent). Maps move to another project, picked from a list in the modal | Default |
| D10 | Duplicate is instant, with no modal: "Name (copy)", placed right after the original. A duplicated project copies its maps (new ids) | Default |
| D11 | Delete asks for confirmation in the modal. Deleting a project deletes its maps too, and the modal says how many | Default |
| D12 | Names are trimmed, 1–100 characters. Save is disabled while the name is empty or unchanged. Enter submits | Default |
| D13 | New ids come from a counter (`p101`, `m101`, …), so they never clash with the seed ids | Default |
| D14 | Open panels / pages of a deleted item show their existing "Project not found." / "Map not found." text. They are not closed automatically | Default |
| D15 | A new map's project is **not** auto-expanded in the tree (TreeView keeps its own expanded state) | Default |
| D16 | Modal closing stays instant: only opening is animated, because the content unmounts on close | Default |
| D17 | ☰ stays where it is now, at the **left** of the navbar (the request said "top right", but it's the only ☰ and it sits on the left) | Default |
| D18 | ☰ icon: 24px (`size-6`), matching the "Map" text (`text-heading` = `text-lg`, 28px line). No text. The ✕ means "the sidebar is open": `sidebar.expanded` (pinned on wide screens, drawer open on narrow ones). A hover-peek of the rail doesn't count | Default |
| D19 | Animation length = `--sidebar-duration` (200ms), so the icon moves together with the sidebar. No animation under `prefers-reduced-motion` | Default |

## 1 — Risks

1. **Panel titles may lag after a rename.** `PANELS[type].title(id)` reads the store when the pane
   renders. Panes are memoised, so a pane header can keep the old name until its next render. Panel
   **content** and the sidebar update at once (they use the hook). This is fine for mock data. Note it
   for the real-data version.
2. **Double-click on a link row.** The first click navigates (or toggles a folder that has no page),
   the second opens the rename modal. For a project row, the two clicks toggle it twice, which leaves
   it as it was. Acceptable.
3. **Backdrop click while selecting text.** A text selection in the input that ends over the backdrop
   fires `click` on the `<dialog>` and would close it. Fix: close only when the press **and** the
   release both happen on the backdrop (§4).
4. **Focus on open.** `showModal()` focuses the first focusable element, which is the header's ✕, not the
   name field. React's `autoFocus` doesn't help here (§4).

## 2 — Architecture

```
mocks/projects.ts        seed data (PROJECTS) + findProject/findMap → read the store
mocks/projectsStore.ts   NEW, deletable: in-memory projects, subscribe, CRUD functions, useMockProjects()
        ▲  (only import of the data)
        │
mocks/sidebarTree.ts     buildSidebarTree(projects) → { nodes, items }   (was the const SIDEBAR_TREE)
        ▲
components/layout/sidebar/
  SidebarTree.tsx        useMockProjects() → tree; per-row + and ⋯ actions; double-click → rename
  SidebarDialogs.tsx     NEW: the 4 dialogs (rename, create, move, delete) on <Modal>
        ▲
components/ui/overlays/Modal.tsx   blurred backdrop, open animation, initial focus, safe backdrop click
```

Pages and panels that list projects (`DashboardPage`, `ProjectsPage`, `ProjectPanel`, `MapPanel`) switch
from the static `PROJECTS` / `findX` to `useMockProjects()`, so they re-render on changes.

## 3 — Mock store (`app/src/mocks/projectsStore.ts`, new)

The file starts with a header comment like the other mocks:
`// MOCK DATA: in-memory CRUD … replaced by API calls later; nothing is saved (reload = seed data).`

- State: `let projects: MockProject[] = structuredClone(PROJECTS)`, plus a `Set` of listeners.
  `set(next)` replaces the array (immutable updates, so `useSyncExternalStore` sees a new snapshot) and
  notifies the listeners.
- `getProjects()` and `useMockProjects()` (`useSyncExternalStore(subscribe, getProjects)`).
- Functions (each validates nothing beyond what D12 already checks in the UI, and is a no-op on an
  unknown id):

| Function | Does |
|---|---|
| `createProject(name)` | adds `{ id, name, description: '', maps: [] }` at the end, returns the id |
| `createMap(projectId, name)` | adds a map at the end of that project, returns the id |
| `renameProject(id, name)` / `renameMap(id, name)` | change `name` |
| `duplicateProject(id)` | copy after the original, "(copy)", maps copied with new ids |
| `duplicateMap(id)` | copy after the original, in the same project |
| `moveMap(id, toProjectId)` | remove from its project, append to the target |
| `deleteProject(id)` / `deleteMap(id)` | remove (a project with its maps) |

- `mocks/projects.ts`: `PROJECTS` stays as the seed data. `findProject` and `findMap` read
  `getProjects()` and not the constant, so `panels.ts` keeps working unchanged.

## 4 — Modal upgrade (`components/ui/overlays/Modal.tsx`)

- **Blur:** the backdrop becomes `backdrop:bg-overlay/30 backdrop:backdrop-blur-sm` (the dim keeps the
  dialog readable on light themes). The dialog stays centred (`m-auto`).
- **Opening animation:** fade + scale from 95% with Tailwind's `starting:` variant (`@starting-style`)
  on the dialog (`starting:open:opacity-0 starting:open:scale-95`, `transition-[opacity,scale]`), and
  a fade on `::backdrop`. Add `motion-reduce:transition-none`.
- **Safe outside click:** remember whether `pointerdown` happened on the dialog element itself, and
  close on `click` only if both the down and the click target are the backdrop (Risk 3).
- **Initial focus:** after `showModal()`, focus `dialog.querySelector('[data-autofocus]')` if there is
  one (Risk 4). The name inputs carry `data-autofocus`, and the input's text is selected.
- Usage comment updated. The API stays `open / onClose / title / children / footer / size`.

## 5 — Sidebar dialogs and actions

### `components/layout/sidebar/SidebarDialogs.tsx` (new)

One component that holds which dialog is open:

```ts
type SidebarItem = { kind: 'project' | 'map'; id: string; name: string }
type Dialog =
  | { kind: 'rename'; item: SidebarItem }
  | { kind: 'create'; parent: { kind: 'root' } | { kind: 'project'; id: string; name: string } }
  | { kind: 'move'; item: SidebarItem }        // maps only
  | { kind: 'delete'; item: SidebarItem }
```

It renders the right content inside `<Modal size="sm">`:

- **Rename / Create:** a `<form>` with the existing `TextField` (`data-autofocus`, value preselected for
  rename). Footer: Cancel (`secondary`) and Save / Create (`primary`, linked with `form="…"`, disabled
  per D12). Submit calls `renameX` / `createX` and closes. Titles: "Rename map", "New project",
  "New map in City parks".
- **Move to:** the other projects as a list of ghost `Button`s (folder icon + name). The current
  project is left out. A click calls `moveMap` and closes. If there is no other project: a short
  "No other project" text.
- **Delete:** "Delete "Parks overview"?" (for a project: "…and its 2 maps"). Footer: Cancel and
  Delete (`secondary` + `text-danger`).

### `mocks/sidebarTree.ts`

`SIDEBAR_TREE` becomes `buildSidebarTree(projects)`, which returns `{ nodes, items }`: the same nodes as
today, plus `items: Map<nodeId, SidebarItem>` for the project folders and map leaves. The UI uses it to
know what a row is, without parsing ids. Projects root / Dashboard / Overview are not in `items`, so
they stay fixed (D1).

### `components/layout/sidebar/SidebarTree.tsx`

- `const projects = useMockProjects()`, `useMemo(() => buildSidebarTree(projects))`.
- `icons.right(node)` builds the right icons from D7: the Projects root gets `+` (create project);
  a project gets `+` (create map) plus a menu with Rename / Duplicate / Delete and the placeholders;
  a map gets a menu with Rename / Duplicate / Move to / Delete and the placeholders. Every other row
  gets `[]`.
- Duplicate calls the store directly. The others open a dialog through `SidebarDialogs` state.
- Passes the new TreeView props (below) for double-click rename.

### Tree: double-click to rename (`TreeView`, `TreeItem`, `TreeLabel`)

The tree still knows nothing about projects:

- `TreeView` replaces `editableLabels?: boolean` with `onRename?: (node) => void` and
  `canRename?: (node) => boolean`. Both are passed down through `TreeItem`, like `icons`.
- `TreeLabel` takes `onDoubleClick?`. When it's set, the inner text span gets the `cursor-text` it
  already has and calls it with `preventDefault()` + `stopPropagation()`. Only renamable rows get the
  text cursor now (today every row has it).
- The `TODO: rename on click` comment in `SidebarTree.tsx` is removed.

## 6 — Animated ☰ ↔ ✕ (`Navbar.tsx` + new icon)

- New `components/ui/icons/MenuToggleIcon.tsx`: an SVG (24×24, `stroke="currentColor"`,
  `strokeWidth=2`, round caps, like Lucide) with three lines at y = 6, 12, 18 and an `open` prop.
  - open: the top line moves down 6 and rotates 45°, the bottom one moves up 6 and rotates −45°,
    the middle one shrinks to `scale-x-0` and fades out. Closed: the reverse, from the same
    transitions.
  - `[transform-box:fill-box] origin-center` per line (the same trick as `menuAnimation.ts`),
    `transition-[translate,rotate,scale,opacity] duration-(--sidebar-duration) ease-out
    motion-reduce:transition-none`. Full class strings for Tailwind.
- `Navbar.tsx`: the `Button` with "Menu" is replaced by a ghost icon-only button (the `iconButtonClass`
  look) holding `<MenuToggleIcon open={sidebar.expanded} className="size-6" />`. It keeps
  `aria-expanded` and `aria-controls="sidebar"`, and gets `aria-label={expanded ? 'Close menu' :
  'Open menu'}` plus a matching `title`. `IconButton` can't be reused as is: it renders a fixed 16px
  icon component with no props.

## Testing

- `npm run test --workspace app`: add `app/src/mocks/projectsStore.test.ts` (Vitest is already set up).
  It covers create / rename / duplicate (deep copy with new ids) / move / delete, and checks that no-ops
  on unknown ids leave the snapshot unchanged. It is deleted together with the store.
- `npm run build --workspace app` (type check).
- Manual, in `npm run dev`:
  - Every action from the ⋯ menus and both `+` buttons. Double-click rename on a map and on a project.
    Fixed rows have no actions and no text cursor.
  - Reload: everything is back to the seed data.
  - Open a map as a panel, rename it (the content updates), delete it ("Map not found.").
  - Modal: centred with a blurred backdrop. Closes on a backdrop click, on Esc and on ✕. Doesn't close
    when a text selection drag ends outside it. Enter submits. The name field is focused on open.
  - ☰ ↔ ✕ animates both ways, on wide (pin) and narrow (drawer) screens. Instant with reduced
    motion.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Mock store + tests; find helpers read it | `app/src/mocks/projectsStore.ts` (new), `app/src/mocks/projectsStore.test.ts` (new), `app/src/mocks/projects.ts` |
| 2 | Lists re-render from the store | `pages/Dashboard/DashboardPage.tsx`, `pages/Projects/ProjectsPage.tsx`, `features/projects/ProjectPanel.tsx`, `features/projects/MapPanel.tsx` |
| 3 | Modal: blur, open animation, initial focus, safe backdrop click | `components/ui/overlays/Modal.tsx` |
| 4 | Tree: per-node rename + double-click | `components/ui/tree/TreeView.tsx`, `TreeItem.tsx`, `TreeLabel.tsx` |
| 5 | `buildSidebarTree` + items map | `app/src/mocks/sidebarTree.ts` |
| 6 | Dialogs | `components/layout/sidebar/SidebarDialogs.tsx` (new) |
| 7 | Wire actions, `+`, menus, double-click | `components/layout/sidebar/SidebarTree.tsx` |
| 8 | ☰ ↔ ✕ icon and navbar button | `components/ui/icons/MenuToggleIcon.tsx` (new), `components/layout/Navbar.tsx` |
| 9 | Snippet that mentions `SIDEBAR_TREE` | `instructions/adding-a-panel.md` (one line) |
| 10 | Test, build, manual checks | — |

Files **not** touched: `backend/`, `packages/shared/`, `app/src/panels.ts`, `features/workspace/*`,
`TreeMenu.tsx` / `menuAnimation.ts`, Tauri config, `package.json` (no new dependencies).

**Deleting the mock later:** remove `projectsStore.ts` and its test. Point `useMockProjects` and the CRUD
calls in `SidebarTree.tsx`, `SidebarDialogs.tsx` and the four pages/panels at the real API hooks. The
modal, the dialogs' UI, the tree changes and the ☰ icon stay.

## Open items

- D2 reading: double-click opens the **rename modal** (not an inline text field in the row). Say so if
  you meant inline editing.
- D18 icon size (24px). Change it if you want it closer to 28px (the full line height of "Map").
