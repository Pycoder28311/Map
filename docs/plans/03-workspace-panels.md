# 03 — Workspace panels (split view, like Zen's split tabs / Hyprland tiling)

**Goal:** pages and other content become **panels** that can be shown side by side in a workspace of up
to 4. A sidebar item marked `draggable` can be dragged onto the current page or an open panel; any
other element anywhere in the app becomes a panel source with **one button** (`OpenAsPanelButton`).
Panels are resized by their edges **and corners** (the others adjust), each panel has **Detach** and
**Full page** buttons, and the combination lives in the URL (`/workspace?…`), so refresh, links and
"back" work. Everything is frontend; data comes from `app/src/mocks/` until the backend has it.

**Depends on:** the current uncommitted frontend work (theme, `NavButton`, layout, tree view) being
committed first. **Blocks:** real project/map pages fed by the backend (they plug into the registry).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | Any element becomes a panel through a **registry**: each panel *type* is registered once (`panels.ts`: component, title, icon, `draggable`, optional route). Elements reference panels as `{ type, id? }`, which fits in the URL | User |
| D2 | **Detach** removes the panel from the combination; the others re-tile. One panel left → its own page (if it has a route) | User |
| D3 | URL: 2+ panels → `/workspace?layout=…&panels=…`. 1 panel → its own route if it has one, else `/workspace` with one panel | User |
| D4 | The one-button API (`OpenAsPanelButton`) is **click only**: opens the panel next to the current page at the next free position. **Drag** exists only for sidebar items with `draggable: true` | User |
| D5 | Max **4** panels; at 4, open buttons are disabled and drop zones hidden | User |
| D6 | An already-open panel can't be dragged again (sidebar item disabled while open); its open button shows it's open | User |
| D7 | **Full page**: keeps only this panel → its route, or `/workspace` with one panel | User |
| D8 | Desktop screens first; on narrow screens (< `lg`) panels stack vertically, no resizing | User |
| D9 | Resizing from edges **and corners**; the others adjust | User |
| D10 | Layout model = **2×2 grid with templates** (not a split tree): one vertical line `x`, one horizontal line `y`. Only this model has a single corner point that moves both lines and makes every panel adjust | Default (follows D9) |
| D11 | Combining only when **both** sides are draggable: the dragged item and the target (current page or open panel) must have `draggable: true` in the registry | User (earlier) |
| D12 | Drag & drop with **`@dnd-kit/core`** (pointer, keyboard and touch; HTML5 drag & drop has no keyboard support and quirks in Tauri's WebKitGTK) | Default |
| D13 | Resize handles are our own small component (pointer events). `react-resizable-panels` is 1-D and can't do corners | Default (follows D9) |
| D14 | Panel sizes (`x`, `y`) in `localStorage`, not in the URL (they change on every mouse move; the URL keeps only which panels and where) | Default |
| D15 | URL changes are client-side (`navigate` / `setSearchParams` with `replace` for resizes and detaches): **no requests, no reload** | Default |
| D16 | **Vitest** added to `app` to test the pure layout logic (`layout.ts`); UI checked manually | Default |
| D17 | Panel content never renders `<main>`: `AppLayout` provides the one `<main>`; pages and panels use `<div>`/`<section>` | Default |
| D18 | Plan location `docs/plans/03-workspace-panels.md` | Default |

## 1 — Risks and blockers

1. **Uncommitted work.** The theme, `NavButton`, `AppContext` rename, navbar/sidebar and tree view are
   not committed. Commit them first, so this feature starts from a known state.
2. **Click vs drag on sidebar items.** A draggable item is also a link. dnd-kit's activation distance
   (6 px) keeps a click a click; verify in Firefox and in the Tauri window (WebKitGTK).
3. **Corner semantics with 3 panels.** In the "one big + two stacked" templates, the corner sits on a
   T-junction: it moves `x` for all panels and `y` only for the stacked side. Expected, but worth a look.
4. **Invalid URLs** (hand-edited, old links, unknown type, 5 panels) must fall back safely: drop unknown
   entries, cap at 4, and redirect to `/dashboard` when nothing valid is left.
5. **Heavy panels** (a map later) must not re-render while resizing: content is memoised and resizing
   only changes CSS variables (§5). Keep that rule when adding panels.
6. **New dependencies:** `@dnd-kit/core` (runtime) and `vitest` (dev). Versions checked at install time.

## 2 — Architecture

```
AppLayout (Navbar, Sidebar, <main>)
└── WorkspaceDnd (DndContext: sidebar drags ↔ drop zones)
    ├── Sidebar → TreeView → TreeItem ──(draggable: true)──► useDraggable({ panel })
    └── <main>
        ├── normal page route (e.g. /dashboard) ── if it's a draggable panel → DropZones over it
        └── /workspace ── Workspace (CSS grid 2×2, template, --split-x/--split-y)
                          ├── Pane a │ Pane b      Pane = header (icon, title, Detach, Full page)
                          ├── Pane c │ Pane d             + memo(content from registry) + DropZones
                          └── ResizeHandles (vertical line, horizontal line, corner)

any element ──► <OpenAsPanelButton panel={{ type, id }} />  ─┐
sidebar drop ──► onDragEnd(target slot + edge)              ─┼─► useWorkspace()
Pane buttons ──► detach(slot) / fullPage(slot)              ─┘      │ pure functions (layout.ts)
                                                                    ▼
                                         URL /workspace?layout=…&panels=…   (+ x, y in localStorage)
```

`useWorkspace()` sees **one model** in both places: on `/workspace` it parses the URL; on a normal page
that is a registered panel it treats the page as a 1-panel layout. So "drop onto the current page" and
"drop onto a panel" are the same operation.

## 3 — Panel registry (the reusable part)

**`app/src/features/workspace/panels.ts`**

```ts
export type PanelType = 'dashboard' | 'projects' | 'project' | 'map'
export type PanelRef = { type: PanelType; id?: string }

export type PanelDefinition = {
  title: (id?: string) => string
  icon: ButtonIcon                        // components/ui/IconSlot
  component: ComponentType<{ id?: string }>
  draggable: boolean                      // may be combined with others (D11)
  route?: (id?: string) => string         // its own page, if any (Full page, 1-panel URL)
  matchRoute?: string                     // route pattern, to treat the current page as a panel
}

export const PANELS: Record<PanelType, PanelDefinition> = { … }
```

Entries:
| Type | Component | Route | draggable |
|---|---|---|---|
| `dashboard` | `DashboardPage` content | `/dashboard` | yes |
| `projects` | `ProjectsPage` content | `/projects` | yes |
| `project` | new `features/projects/ProjectPanel.tsx` (mock project + its maps) | — | yes |
| `map` | new `features/projects/MapPanel.tsx` (mock map placeholder) | — | yes |

**Making something a panel = 2 steps:** register its type once (one entry), then put
`<OpenAsPanelButton panel={{ type, id }} />` next to it, anywhere. Documented in
`instructions/adding-a-panel.md`.

**Mocks:** `app/src/mocks/projects.ts` with fake rows in the shape the backend will return
(`{ id, name, maps: [{ id, name }] }`); `mocks/sidebarTree.ts` gets `panel` refs and `draggable` flags.

## 4 — Layout model and URL (pure, tested)

**`app/src/features/workspace/layout.ts`** — no React:

```ts
export type Slot = 'a' | 'b' | 'c' | 'd'
export type Template = '1' | '2-cols' | '2-rows' | '3-left' | '3-right' | '3-top' | '3-bottom' | '4'
export type WorkspaceLayout = { template: Template; panels: PanelRef[] }   // panels[0] = slot a, …
export type Edge = 'left' | 'right' | 'top' | 'bottom'
```

| Template | grid-template-areas | Lines |
|---|---|---|
| `1` | `"a a" "a a"` | — |
| `2-cols` / `2-rows` | `"a b" "a b"` / `"a a" "b b"` | x / y |
| `3-left` (big left) | `"a b" "a c"` | x, y (corner on a T) |
| `3-right`, `3-top`, `3-bottom` | mirrored | x, y |
| `4` | `"a b" "c d"` | x, y (corner on a cross) |

Functions:
- `addPanel(layout, panel, target?: { slot, edge })` — drop: split the target slot on that edge, using a
  transition table (1→2, 2→3, 3→4). No target (button click, D4): next free position
  (1 → right; 2 → split the last panel downward; 3 → fill the 4th cell).
- `removePanel(layout, slot)` — Detach: the remaining panels keep their order in the template for
  `n - 1` panels.
- `keepOnly(layout, slot)` — Full page.
- `hasPanel(layout, panel)`, `canAdd(layout)` (`< 4`).
- `toSearchParams(layout)` / `fromSearchParams(params)` — `?layout=3-left&panels=dashboard,project:1,map:7`;
  invalid entries dropped, max 4, wrong template replaced by the default for the count (risk 4).

**Tests** (`layout.test.ts`, Vitest): every transition 1→4, every removal 4→1, keepOnly, URL round trip,
invalid URLs, no duplicates, cap at 4.

## 5 — Workspace UI

- **`features/workspace/useWorkspace.ts`**: current layout (URL on `/workspace`, or the current route as
  a 1-panel layout via `matchRoute`, or `null`); `open(panel)`, `drop(panel, slot, edge)`,
  `detach(slot)`, `fullPage(slot)`, `isOpen(panel)`, `canAdd`. It turns layouts into navigation:
  2+ panels → `/workspace?…`; 1 panel with a route → that route (D3).
- **`Workspace.tsx`** (route `/workspace`, inside `RequireAuth` + `AppLayout`): CSS grid 2×2,
  `grid-template-areas` from the template, columns/rows from `--split-x` / `--split-y`; below `lg`:
  one column, stacked (D8).
- **`Pane.tsx`**: as shown in the discussion: header with `IconSlot`, title, `IconButton` Detach
  (`LuUnlink`) and Full page (`LuMaximize2`) when more than one panel; content through
  `memo(PanelContent)`; `DropZones` for its slot.
- **`ResizeHandles.tsx`**: vertical line (x), horizontal line (y) and corner (both), only where the
  template has them. Pointer capture; while dragging only the grid's CSS variables change (no React
  re-render); on release: save to `localStorage` (`workspace:split`). Clamp 20 %–80 %. Keyboard: handles
  are focusable, arrow keys move 5 %; double-click resets to 50 %.
- **`DropZones.tsx`**: four edge areas (`useDroppable`, id `slot:edge`) with a preview of where the panel
  will go; shown only while a draggable item is dragged, the target is draggable and `canAdd` (D5, D11).
- **`WorkspaceDnd.tsx`**: `DndContext` (pointer sensor, activation distance 6 px; keyboard sensor) in
  `AppLayout`, so sidebar items and drop zones share it; `onDragEnd` → `drop()`.
- **`components/ui/IconButton.tsx`** (new): square ghost button with only an icon; `label` required
  (`aria-label` + `title`). Uses `buttonClass`.
- **`OpenAsPanelButton.tsx`** (in `features/workspace/`): `IconButton` (`LuSquareSplitHorizontal`) →
  `open(panel)`; disabled with a reason when already open (D6) or at 4 (D5).

## 6 — Changes to existing files

| File | Change |
|---|---|
| `components/ui/tree/types.ts` | `TreeNode` + `panel?: PanelRef`, `draggable?: boolean` |
| `components/ui/tree/TreeItem.tsx` | leaves with `draggable` + `panel` use `useDraggable`; disabled while open (D6) or at 4 |
| `components/layout/AppLayout.tsx` | wrap in `WorkspaceDnd`; `<main>` around `Outlet` with `DropZones` for the current page (D17) |
| `routes/index.tsx` | `/workspace` route inside `RequireAuth` + `AppLayout` |
| `pages/Dashboard/DashboardPage.tsx`, `pages/Projects/ProjectsPage.tsx` | root `<main>` → `<div>` (D17); dashboard lists `mocks/projects.ts` as `Card`s, each with `OpenAsPanelButton` (the "random element" example) |
| `mocks/sidebarTree.ts` | `panel` + `draggable` on items |
| `app/package.json` | `@dnd-kit/core`; dev: `vitest`, script `"test": "vitest run"` |

New files: `features/workspace/{panels.ts, layout.ts, layout.test.ts, useWorkspace.ts, Workspace.tsx,
Pane.tsx, ResizeHandles.tsx, DropZones.tsx, WorkspaceDnd.tsx, OpenAsPanelButton.tsx}`,
`features/projects/{ProjectPanel.tsx, MapPanel.tsx}`, `components/ui/IconButton.tsx`,
`mocks/projects.ts`, `instructions/adding-a-panel.md`.

## Testing

Automatic:
- `npm run test --workspace app` (layout logic, §4); `npm run build --workspace app`; `npx oxlint app/src`.

Manual, website (`npm run dev --workspace app`) and desktop (`npm run tauri dev`):
- Click an item in the sidebar → navigates (no accidental drag).
- Drag "Projects" from the sidebar onto `/dashboard` → `/workspace?layout=2-cols&panels=dashboard,projects`.
- Drop on each edge of a panel → panel splits on that side; up to 4; 5th drop impossible (zones hidden).
- Dragging an already-open item is impossible; a non-draggable target shows no zones.
- Dashboard card "Open as panel" → opens beside; disabled when open or at 4.
- Resize by each line and by the corner; others adjust; refresh keeps panels (URL) and sizes (storage).
- Keyboard: Tab to a handle, arrows resize; dnd-kit keyboard drag from the sidebar.
- Detach from 3 → 2 → 1 (lands on the panel's own route); Full page from 4 → 1.
- Back button walks through combinations; hand-edited invalid URL falls back (risk 4).
- Narrow window (< lg): panels stacked, no handles.
- Network tab: changing combinations makes **no** requests (D15).

## Task list

| # | Task | Files |
|---|---|---|
| 1 | **User:** commit the current frontend work | — |
| 2 | Install `@dnd-kit/core`, `vitest`; `test` script | `app/package.json`, `package-lock.json` |
| 3 | Layout model, URL parse/serialize + tests | `features/workspace/layout.ts`, `layout.test.ts` |
| 4 | Mock data; registry; project/map panels; pages without `<main>` | `mocks/projects.ts`, `features/workspace/panels.ts`, `features/projects/*`, `pages/Dashboard/*`, `pages/Projects/*` |
| 5 | `useWorkspace` (URL ↔ layout, current page as panel, actions) | `features/workspace/useWorkspace.ts` |
| 6 | `IconButton`, `Pane`, `Workspace` grid, `/workspace` route, `<main>` in `AppLayout` | `components/ui/IconButton.tsx`, `features/workspace/{Pane,Workspace}.tsx`, `routes/index.tsx`, `components/layout/AppLayout.tsx` |
| 7 | Resize handles (edges + corner, keyboard, storage) | `features/workspace/ResizeHandles.tsx` |
| 8 | `OpenAsPanelButton`; dashboard cards from mocks | `features/workspace/OpenAsPanelButton.tsx`, `pages/Dashboard/DashboardPage.tsx` |
| 9 | Drag & drop: `WorkspaceDnd`, draggable tree items, `DropZones` on panes and the current page | `features/workspace/{WorkspaceDnd,DropZones}.tsx`, `components/ui/tree/*`, `mocks/sidebarTree.ts`, `components/layout/AppLayout.tsx` |
| 10 | Docs: how to make anything a panel | `instructions/adding-a-panel.md` |
| 11 | Manual tests (Testing list), website + desktop | — |

Files **not** touched: `backend/**`, `packages/shared/**`, auth pages and `lib/auth-client.ts`,
`app/src-tauri/**`, the theme files (`styles/*`, `buttonStyles.ts`) except reading them.

## Open items

1. **Panel titles for real data:** mocks give names now; with the backend, `title(id)` needs the
   loaded name (e.g. from a data cache). Decide when the API exists.
2. **Same panel twice** is prevented (D6). If you ever want two views of one map, `PanelRef` needs an
   instance id; not planned.
3. **Desktop windows:** Detach could later open a separate Tauri window instead of only removing the
   panel (D2 keeps it simple).
