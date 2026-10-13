# 15 — Floating Create button and creation modal

**Goal:** a primary **Create** button floats at the bottom right of the page area, separate from the panes.
Clicked, it flips (over ~400ms) into a gray **✕ Cancel** button, and a modal pops out from behind it,
growing from its bottom right corner: a **path** on top (like a file explorer's address bar), a list of the
**five kinds** you can create, and the form for the chosen kind. In a project or folder, what you create
goes there automatically; the path lets you pick another place without leaving the current page.

**Depends on:** 14 (object kinds `object`/`folder`, `createObjectOf`, `canPlace`, the rows), 10 (note links),
11 (`QuickCreate`'s fields, for reference). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | The button floats at the **bottom right of the page area** (the content beside the sidebar), over the page, not inside any pane. The modal's bottom right corner sits **behind** the button, and the modal extends up and to the left | User |
| D2 | **Current place:** one page open (a project, folder, map or object page, also via `/workspace`) → that object is the current place. With **panes, or on the Dashboard / Notes pages**, nothing is current: the path starts empty ("No place") and you pick one from it | User |
| D3 | **One modal for all five kinds** (Object card, Article, Note, Map, Folder). Fields by kind: title for all; text for Note and Article; description for Object card; nothing more for Map and Folder. A **note is linked** to the chosen place. Every other kind is **created inside** the chosen place (by `canPlace`: an article in a project or folder; a map, object card or folder in a project) | User |
| D4 | **Folders become link targets:** notes can be linked to folders too (`isLinkTarget` gains `'folder'`: a link node on folder rows and cards, the linked list in the folder's panel) | User |
| D5 | The **path** shows the chosen place and its parents (`City parks › Guides`). Each part is clickable and opens a small menu of the **alternatives at that level** (other projects, or other items inside the part before it). Picking one replaces that part and cuts the parts after it. A trailing **›** menu adds a level deeper (a folder, map or object inside the last part). The first menu also has "Top level" (create at the top level; a note: no link). **Nothing navigates**: the page stays where it is | User |
| D6 | The button's two faces: front **Create** (primary: `bg-accent text-accent-fg`), back **✕ Cancel** (gray: `bg-fill-strong`). Clicking flips it around the vertical axis (`rotateY`, 400ms); clicking again (or Esc, or a successful create) flips it back and the modal shrinks back behind it | User |
| D7 | The modal has a **thick border** (3px, `border-line-strong`) and a **big shadow** (`--lift-shadow`, plus a wider one), rounded with `--card-radius`. It **pops out from behind the button**: `transform-origin: bottom right`, scale 0.2 → 1 and opacity 0 → 1 over ~280ms, below the button's z-index | User |
| D8 | The **kinds list** is a vertical list of five buttons on the modal's left (icon + name, the chosen one highlighted), the form on its right. The list order is the Create menus': Object card, Article, Note, Map, Folder. **Kinds that can't go in the chosen place are disabled** (e.g. a Map with no project chosen, anything but an article in a folder), with a tooltip saying why | Default |
| D9 | **Open by default on Note.** The kind and the draft (title, text, description) are kept while the modal is open (switching kinds keeps the title), and cleared on Cancel or after creating | Default |
| D10 | **Creating:** the **Create** button in the modal (primary; disabled while the title is empty) or Ctrl/⌘+Enter. The new object is made, a note is linked, the modal closes (the button flips back), and a small **toast near the button** says "Created Note in City parks" with an **Open** link (it never opens by itself). Maps, folders and object cards created in a project show at the start of its row (`first: true`, like the rows' Create) | Default |
| D11 | **Closing:** the flipped button, Esc, or a successful create. A click outside does **not** close it (you may need the page behind it) | Default |
| D12 | The button **stays in focus mode** (it's a floating action), and the page gets room at its bottom so the button never hides the last content (`pb-24` on the Dashboard's page and the panels' lists) | Default |
| D13 | Narrow windows: the modal is `min(34rem, 100vw − 2rem)` wide; below 36rem the kinds list becomes a row of icon buttons above the form | Default |

## 1 — Risks

1. **Three-dimensional flip and `backdrop` tricks.** Flipping needs `perspective` on the wrapper and
   `transform-style: preserve-3d` with `backface-visibility: hidden` on both faces. Both faces must be the
   same size (the button's width is fixed: `w-32`, so "Create" and "Cancel" fit without moving).
2. **Behind the button.** The modal and the button are siblings in one wrapper; the modal gets a lower
   z-index and its bottom right corner is placed at the button's centre, so the grow looks like it
   comes out of the button. If the button or the modal moved (a resized window), both follow the wrapper.
3. **The current place comes from the URL.** `useWorkspace().layout` is a 1-panel layout on an object's
   page and on `/workspace?panels=project:p1`, so one check covers both (`single` panel with an `id`
   that is a project, folder, map or object). Archived or missing objects are treated as "no place".
4. **Folders as link targets touch several screens** (D4): the sidebar's link nodes use `isLinkTarget`
   (automatic), but the folder card's link node is hard-coded to maps and objects (`CardShell`) and the
   folder panel has no linked list. Both change.

## 2 — Architecture

```
AppLayout › Frame › <div className="relative min-w-0 flex-1">   (the page area: main + ChromeShadow)
   ├─ <main>…page / panes…</main>
   └─ <CreateFab/>                                              absolute bottom-4 right-4, z above main
        ├─ CreateModal (when open)  ── CreatePath · KindList · CreateForm
        ├─ the button: two faces, flips (Create ⇄ ✕ Cancel)
        └─ CreatedToast

features/create/
  place.ts (+test)        pure: pathOf, choicesAt, eligibleFor, resolveCreate
  useCurrentPlace.ts      the current place from useWorkspace()
  CreateFab.tsx           the button + the modal's open state + the flip
  CreateModal.tsx         the modal: pops from behind the button; header path, kinds, form
  CreatePath.tsx          the address-bar-like path with menus
  createFromModal.ts      does it: createObjectOf + linkNote
```

## 3 — Place logic (`features/create/place.ts`, pure, tested)

```ts
type Kind = Exclude<ObjectKind, 'project'>                    // the five kinds
/** A place: object ids from the top (a project) down to the last (e.g. a folder); [] = no place / top level */
type Path = string[]

/** The path of an object: its parents from the top, then itself */
export function pathOf(objects: MockObject[], id: string): Path
/** Can `kind` go in (or, for a note, link to) this path's last object? [] = the top level */
export function eligibleFor(kind: Kind, last: MockObject | null): { ok: boolean; why?: string }
/** The menu of a path part: the alternatives at `index` (what could stand there), the current one excluded */
export function choicesAt(objects: MockObject[], path: Path, index: number, kind: Kind): MockObject[]
/** What creating does: a note → { parentId: null, linkTo }, others → { parentId, linkTo: null } */
export function resolveCreate(kind: Kind, path: Path): { parentId: string | null; linkTo: string | null }
```

- `choicesAt`: index 0 → the projects (and, for non-notes, nothing else: the top level is its own entry
  in the menu); index *i* > 0 → the containers/targets inside `path[i−1]`:
  folders, maps and object cards for a note (link targets); folders for an article's parent, and so on
  (filtered by `eligibleFor` of each).
- Notes: any **link target** can end the path (project, folder, map, object card).
- Others: the path must end on a place that takes the kind (`canPlace`): maps, object cards and folders
  end on a project; articles on a project or a folder; the top level for all but a map.

## 4 — The button and the flip (`CreateFab.tsx`)

- Wrapper: `absolute bottom-4 end-4 z-20 [perspective:600px]`, a fixed `h-10 w-32`.
- Two faces in an inner `relative size-full transition-transform duration-[400ms] [transform-style:preserve-3d]`
  that gets `[transform:rotateY(180deg)]` while open:
  - front: `Button`-looking primary `Create` (`LuPlus` + "Create");
  - back: `rotateY(180deg)`, `[backface-visibility:hidden]`, gray with `LuX` + "Cancel".
- Both are real `<button>`s; the hidden face is `inert` and `aria-hidden`, so keyboard and screen
  readers only see the visible one. `aria-expanded` and `aria-controls` point at the modal.
- Reduced motion: no flip, the faces swap instantly (`motion-reduce:duration-0`).
- The page gets room: `pb-24` on `DashboardPage`'s container and the panels' lists (D12).

## 5 — The modal (`CreateModal.tsx`, `CreatePath.tsx`)

- `absolute bottom-5 end-5 z-10` (under the button's `z-20`), `w-[min(34rem,calc(100vw-2rem))]`,
  `origin-bottom-right`, `rounded-(--card-radius) border-[3px] border-line-strong bg-surface`,
  `shadow-[var(--lift-shadow),0_24px_60px_rgb(0_0_0/0.25)]`. Its bottom right corner starts at the
  button's centre (`bottom-5 end-5` with the button 40px tall).
- Opening: `animate-create-pop` (new, `styles/animations.css`): `from { opacity: 0; scale: 0.2 }`, 280ms
  `cubic-bezier(0.2, 0.9, 0.3, 1.1)`. Closing: the reverse (a `data-closing` state for 200ms before it
  unmounts), so it shrinks back behind the button as the button flips back.
- Header, **path** (`CreatePath`): `LuHome`-style root button ("Top level" for non-notes, "No link" for a
  note) then each part as a button with its kind's icon and name, separated by `LuChevronRight`:
  - each part opens `Dropdown`'s menu (the existing popover menu) of `choicesAt(…)`; picking replaces
    the part and cuts what follows (D5);
  - a final faint **›** part opens the menu of what could go one level deeper (only when there is any);
  - the last part is the target, marked with a small dot ("goes here"); the line under the path says
    "Linked to <name>" (note) or "Created in <name>" (others).
- Body: the **kinds list** (D8) on the left, the **form** on the right (`CreateForm`):
  `TextField`-style title (autofocus), then by kind a textarea (note, article) or a description field
  (object card); a **Create** primary button and the hint "Ctrl+Enter".
- Esc closes and cancels (focus returns to the button). Opening focuses the title.

## 6 — Doing it (`createFromModal.ts`, store, folders as targets)

- `createFromModal(kind, path, fields)`:
  - `const { parentId, linkTo } = resolveCreate(kind, path)`;
  - `const id = createObjectOf(kind, parentId, title, { text, description, first: true })`;
  - a note with `linkTo`: `linkNote(id, linkTo)` (it already exists: `canLink` checks);
  - returns `{ id, placeName }` for the toast.
  The modal never navigates (D5); the toast's **Open** goes to the new object's page (`hrefFor`).
- `mocks/projectsStore.ts`: `isLinkTarget` gains `'folder'` (D4). `canLink` follows.
- `features/dashboard/cards/CardShell.tsx`: the link node for `isLinkTarget(object.kind)` (not just map and
  object); `features/objects/FolderPanel.tsx`: a `LinkedList` ("Linked notes") like the project panel.
- `components/layout/AppLayout.tsx`: `<CreateFab />` inside the page area's `relative` wrapper, after
  `<main>`. Hidden while Share mode is choosing? **No**: the overlay (z-29) dims it with everything else.

## Testing

- `npm test`:
  - `place.test.ts`: `pathOf` for a folder in a project; `eligibleFor` for every kind on each place
    (including "why" texts); `choicesAt` at each level for a note and for an article; `resolveCreate` for
    a note (parent null + link) and an article in a folder (parent = folder, no link);
  - store: `canLink` to a folder, linking a note to a folder, unlinking it.
- By hand (`npm run dev`, signed in):
  - the button sits at the bottom right over the page and panes, not inside any pane; the page scrolls
    behind it and its last content is reachable;
  - click: the button flips to gray ✕ Cancel and the modal grows out from behind it; click again (or
    Esc): both reverse;
  - on a project page the path starts with the project; on a folder page `City parks › Guides`; with panes or
    on the Dashboard it starts empty;
  - pick another place in the path: the page doesn't change; create a note: it's linked there (check
    the project's / folder's linked list) and a toast shows;
  - create an article inside a folder, a map in a project, an object card, a folder at the top level;
    a Map is disabled with no project chosen;
  - focus mode and narrow windows: the button stays, the modal fits.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Folders as link targets (+ store tests) | `mocks/projectsStore.ts`, `.test.ts`, `features/dashboard/cards/CardShell.tsx`, `features/objects/FolderPanel.tsx` |
| 2 | Place logic + tests | `features/create/place.ts`, `place.test.ts` |
| 3 | The current place from the page | `features/create/useCurrentPlace.ts` |
| 4 | Create from the modal | `features/create/createFromModal.ts` |
| 5 | Pop and flip animations | `styles/animations.css` |
| 6 | The path with its menus | `features/create/CreatePath.tsx` |
| 7 | The modal (kinds list, form) | `features/create/CreateModal.tsx` |
| 8 | The button, its flip, the toast | `features/create/CreateFab.tsx` |
| 9 | Mount it; leave room at the page's bottom | `components/layout/AppLayout.tsx`, `pages/Dashboard/DashboardPage.tsx` |

Files **not** touched: `backend/`, `packages/shared/`, routes, the navbar.

## Open items

- None blocking. D8–D13 are defaults; say if any should change.
