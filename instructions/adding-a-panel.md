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
└── resources/                     the tables (resources.config.ts): each one's item panel and list page come from it
```

URL of a combination: `/workspace?layout=3-left&panels=dashboard,project:p1,map:m1`. A single panel
with a page of its own (e.g. the dashboard) uses that page's URL instead.

## Make something a panel: 2 steps

### 1. Register the kind of panel once, in `app/src/panels.ts`

```ts
object: {
  title: (id) => findObject(id)?.name ?? 'Object',
  icon: LuBox,
  component: lazy(() => import('./features/objects/ObjectPanel')),  // gets { id }
  draggable: true,            // may be combined with other panels
  // route: (id) => `/objects/${id}`, matchRoute: '/objects/:id',   // only if it also has its own page
},
```

- `component` receives `{ id }` and renders **no `<main>`** (AppLayout has the only one).
- `lazy()` loads the panel's code only when it's first shown.
- `draggable: false` = can be opened, but never combined with others.
- `fill: true` = the panel gets the whole area at a definite height (no page padding, no scrolling), for
  content that sizes itself to it, like the map editor. Leave it out for normal pages and lists.

### 2. Put the button next to the element, anywhere

```tsx
<OpenAsPanelButton panel={{ type: 'object', id: object.id }} />
```

(A table, like the notes or the maps, is registered as a panel by its resource instead: `app/src/resources/registry.ts`
→ `resourcePanels()` and `resourcePages()`, see `data-config.md`.)

That's all: clicking it opens the panel beside the current page (or alone if they can't be
combined). It's disabled when the panel is already open or 4 are open.

## Sidebar items (drag & drop)

A tree leaf becomes draggable with `panel` + `draggable`. The sidebar's rows are a resource's items (`ResourceRows`, from its list
in the store): every item can be picked up and none takes a drop into it (they come in the server's order):

```ts
{ id: 'map-2', label: 'Parks overview', icon: LuMap, panel: { type: 'map', id: '2' }, draggable: true, locked: true }
```

`draggable: false` (e.g. Dashboard) can't be picked up at all; `locked: true` never takes a drop into it.

Click = go there; drag (6 px or more) onto the current page or a panel = combine. Keyboard: focus the
item, Space to pick up, arrows to move, Space to drop.

## Dragging objects from anywhere (features/drag)

Any element can drag a sidebar object, and any area can take drops or change how a dragged object
looks. Three hooks, all on the app's one drag context:

```tsx
// 1. Drag an object (a list row, a card…): spread listeners/attributes, set the ref
const drag = useObjectDrag({ id: 'my-list:n1', label: note.name, panel: { type: 'note', id: 'n1' },
  object: { objectId: 'n1', kind: 'note', icon: LuStickyNote, source: 'pane' } })
// Or just use <ObjectRow …/> (features/objects/ObjectRow.tsx), a draggable row with a link count

// 2. How a dragged object looks over this area (the floating copy switches to it)
useDragSurface('my-list', listRef, (item) => <ObjectRowLook label={item.label} icon={item.icon} />)

// 3. A drop target: a droppable with data { zone, priority }, and the zone's handler registered once
useDropZone('link', linkZone)   // features/links/linkNode.ts; 'row' and 'trash': the sidebar's
<DropIcon {...linkNodeFor(objectId, 'my-list', name)} size="small" />  // a link node for a note
```

- **Zones:** `row` (sidebar move/pin), `trash` (archive), `link` (link a note). Pane edges stay with
  the workspace.
- **Priority:** when several droppables are under the pointer, the highest `data.priority` wins
  (link nodes 3, rows / cards / the trash 2, pane edges 1).
- **Falling into an icon:** mark the icon with `data-drop-icon={key}` and call `fallInto(float, key)`
  in the zone's drop (components/ui/drop/fallInto.ts).
- **The floating copy** (DragFloat) keeps the pointer where the object was grabbed and takes the look
  of the surface under it; anywhere else it's a pill.

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
