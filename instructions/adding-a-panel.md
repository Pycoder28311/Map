# Adding a panel (workspace split view)

Any content can be shown as a **panel**: next to the current page or other panels in the workspace
(`/workspace`), up to 4 at a time, resizable by edges and corners. This file shows how to make
something a panel. The design is in `docs/plans/03-workspace-panels.md`.

## How it fits together

```
app/src/
├── panels.ts                      PROJECT: the registry, one entry per kind of panel
├── features/workspace/            ENGINE: knows nothing about projects, maps or pages
│   ├── layout.ts (+ .test.ts)     2×2 grid templates, add/remove/move/swap/keepOnly, URL (pure, tested)
│   ├── useWorkspace.ts            the current layout (URL or current page) + actions
│   ├── WorkspaceProvider.tsx      registry + drag & drop context (in AppLayout)
│   ├── Workspace.tsx              the /workspace page: 1 panel = PanelPage, 2+ = Panes in a rounded frame
│   ├── PanelPage.tsx, Pane.tsx    a panel alone (like a normal page) / combined (PaneIsland: Detach, Full page)
│   ├── PaneIsland.tsx             a pane's floating actions: grip (drag onto another pane), Detach, Full page
│   ├── paneFlip.ts                panes glide to their new places when the layout changes
│   ├── workspaceDrag.ts           the drag in progress (context) + drop zone ids (new panels)
│   ├── usePaneRearrange.ts        dragging a pane: the panes shown as if dropped there (URL changes on drop)
│   ├── dropTarget.ts (+ .test.ts) where a dragged pane lands, from the pointer (pure geometry)
│   ├── PanelContent.tsx           the panel's own component, lazy + memo (used by both)
│   ├── paneStyles.ts              the panes' look: radius, gap, inset, border, frame corners
│   ├── ResizeHandles.tsx, split.ts  edge and corner resizing, sizes in localStorage
│   ├── SwapButtons.tsx            a button in the middle of each border: the two panels trade places
│   ├── DropZones.tsx, PageDropZones.tsx  where drags can land
│   ├── OpenAsPanelButton.tsx      the one-button API for any element
│   └── PanelDragLink.tsx          a draggable sidebar link
└── mocks/                         fake data until the backend has it
```

URL of a combination: `/workspace?layout=3-left&panels=dashboard,project:p1,map:m1`. A single panel
with a page of its own (e.g. the dashboard) uses that page's URL instead.

## Make something a panel: 2 steps

### 1. Register the kind of panel once, in `app/src/panels.ts`

```ts
note: {
  title: (id) => findNote(id)?.title ?? 'Note',
  icon: LuStickyNote,
  component: lazy(() => import('./features/notes/NotePanel')),  // gets { id }
  draggable: true,            // may be combined with other panels
  // route: (id) => `/notes/${id}`, matchRoute: '/notes/:id',   // only if it also has its own page
},
```

- `component` receives `{ id }` and renders **no `<main>`** (AppLayout has the only one).
- `lazy()` loads the panel's code only when it's first shown.
- `draggable: false` = can be opened, but never combined with others.

### 2. Put the button next to the element, anywhere

```tsx
<OpenAsPanelButton panel={{ type: 'note', id: note.id }} />
```

That's all: clicking it opens the panel beside the current page (or alone if they can't be
combined). It's disabled when the panel is already open or 4 are open.

## Sidebar items (drag & drop)

A tree leaf becomes draggable with `panel` + `draggable` (`app/src/mocks/sidebarTree.ts`, later built
from backend data):

```ts
{ id: 'note-n1', label: 'Shopping list', icon: LuStickyNote, panel: { type: 'note', id: 'n1' }, draggable: true }
```

Click = go there; drag (6 px or more) onto the current page or a panel = combine. Keyboard: focus the
item, Space to pick up, arrows to move, Space to drop.

## Rules

- **Both sides must be draggable** (the dragged item and the target panel) to combine.
- **Max 4 panels**; an open panel can't be added again.
- **Panel content must stay cheap to re-render**: it's memoised in `Pane`, and resizing only changes
  CSS variables, so it never re-renders while dragging a line or corner.
- **No requests** come from changing combinations: only from what each panel loads itself.

## Check

```
npm run test --workspace app      # layout rules
npm run build --workspace app
```
