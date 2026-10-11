# 11 — Bar popouts that stick to edges, quick note input, Articles

**Goal:** two independent changes.
1. A `BarPopout` whose trigger sits near the **right window edge** or near the **sidebar** sticks to
   that edge too, not only to the top bar (Caelestia / Hyprland style): its side runs flush along the
   edge and a concave corner joins it to the edge below.
2. The Dashboard gets a wide **quick note input**. Clicking it lifts it with a subtle shadow and grows
   a **title** field on top, inside the same white card, separated by a thin gray line. A dropdown on
   the right chooses **Note** or **Article** (a new object kind that behaves exactly like a note).

**Depends on:** 05 (sidebar), 10 (links, Notes page). **Blocks:** nothing.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | The quick input goes at the top of **`DashboardPage`** (signed in, inside the navbar and sidebar), as in the user's main-page mockup: centered, with space above it, the Note/Article dropdown inside the input on its right. The mockup's other sections (Recent / Notes / Maps, Orphans, project grids) are not part of this plan. `HomePage` (`/`, the public landing page) stays unchanged | User (mockup) |
| D2 | **Article** is a new `ObjectKind` `'article'` that behaves **exactly like a note**: a leaf, created at the sidebar root, can be moved into a project, can be dragged onto link circles, and shows on the Notes page | User |
| D3 | Submit with a **Create** button and **Ctrl/⌘+Enter**. Enter adds a new line. After creating, the input clears and collapses | User |
| D4 | `MockObject` gets an optional **`text`**. The quick input saves it, and `NotePanel` / `ArticlePanel` show it instead of "Note text comes later." | User |
| D5 | **Stick rule:** a popout snaps flush to an edge when its side would end within **2 × `--popout-radius`** (32px) of it, or past it | User |
| D6 | **Sidebar edge:** the popout follows the sidebar's **current** right edge (pinned or rail width), measured each time it opens and while it is open. The peek and drawer overlays don't count, only the space the sidebar takes in the row | User |
| D7 | **Popup:** no backdrop. Click outside or Esc collapses it; the draft (title, text, kind) is kept until it is created | User |
| D8 | The dropdown **chooses the kind** (its button reads "Note ▾" / "Article ▾"). Create makes the chosen kind. Default: Note; the last choice is remembered for the session | Default |
| D9 | **ArrowUp** in the text moves to the title only when the caret is on the text's **first line**. ArrowDown in the title (or Enter in it) moves back to the text | Default |
| D10 | **Title size:** `text-body` while it is empty and not focused; `text-heading` while it is focused or has text, with a short font-size transition (none with reduced motion) | Default |
| D11 | An empty title is saved as "Untitled". Create is disabled while both title and text are empty | Default |
| D12 | Article icon: `LuFileText`. The panel type is `article` (draggable), using the same component as notes | Default |
| D13 | With no sidebar space (narrow screens: the sidebar takes 0px), the "sidebar edge" is the window's left edge, so popouts stick there the same way | Default |

## 1 — Risks

1. **The popout is CSS-only today** (`group-hover/popout`). Sticking needs measurements, so a small
   amount of JS is added. It measures on `pointerenter` / `focusin` of the group, so it never runs on
   every frame and the hover behaviour stays the same.
2. **Shadow on the stuck side.** The `drop-shadow` must not spill over the edge it's stuck to. On that
   side the clip box gets no padding, so the edge clips the shadow.
3. **`kind === 'note'` checks** are spread over several files (list in §4). Each one is replaced by
   one helper, so none of them is missed.

## 2 — Bar popouts sticking to edges

### How it looks

```
 normal                          stuck to the right edge          stuck to the sidebar
 ───bar──────────────────        ───bar───────────────────┐       ┌──────bar─────────────
    ╲_ ┌────────┐ _╱                    ╲_ ┌──────────────│       │──────────┐ _╱
       │        │                          │              │       │          │
       ╰────────╯                          ╰──────────╮   │       │   ╭──────╯
                                                      ╰╮  │       │  ╭╯   ← concave ear
                                                          │       │       along the edge
```

On the stuck side: the top ear goes away, the popout's bottom corner on that side is square, and a
new ear sits **below** the popout, joining its bottom edge to the vertical edge (a quarter circle cut
out of the bar colour, the same `radial-gradient` as today's ears, rotated).

### `components/ui/overlays/barPopoutEdges.ts` (new, pure, tested)

```ts
type Span = { left: number; right: number }   // viewport x
export type Stuck = { start: boolean; end: boolean }
/** Where the popout goes: its natural span, snapped to the bounds when within `snap` px of them */
export function stickToEdges(natural: Span, bounds: Span, snap: number): { span: Span; stuck: Stuck }
```

- `natural` comes from the current `align` (start / center / end) and the measured popout width.
- If `natural.right >= bounds.right - snap`, the span is shifted so `right = bounds.right` (`end` stuck).
  The same applies to the left side and `bounds.left` (`start` stuck).
- If it's wider than the bounds, both sides stick.

### `BarPopout.tsx` changes

- On `pointerenter` / `focusin` of the group wrapper: measure the trigger wrapper, the popout panel's
  width, and the bounds:
  - right: the bar's right edge (`closest('header')`, i.e. the window's right edge);
  - left: the right edge of the element marked `data-popout-edge="start"` (D6), else the bar's left.
- Store `{ offsetLeft, stuck }` in state. The clip box gets an inline `left` (px relative to the
  wrapper) instead of the `ALIGN` class when stuck.
- While open, a `ResizeObserver` on the sidebar box (and `resize` on window) re-measures, so the
  popout follows the sidebar's width when it changes (D6). It is removed when the popout closes.
- Stuck side: no horizontal padding on the clip box (Risk 2), no top ear, square bottom corner
  (`rounded-bl-none` / `rounded-br-none`), and a bottom ear `edgeEar('left' | 'right')`
  placed at `top-full` on that side. The clip box's bottom padding grows to `--popout-radius + 0.75rem`
  so that ear is not clipped.
- Props stay the same. `align` is still the starting point before snapping.

### `Sidebar.tsx`

- Its outer box (the one whose `width` is `space`) gets `data-popout-edge="start"`. That box has the
  pinned/rail width and ignores peek and drawer, which is what D6 needs.

## 3 — Quick note input (`features/notes/QuickCreate.tsx`, new)

### Structure

```
<div ref=root class="relative">                       collapsed           expanded
  <div card bg-surface rounded …>                     ┌──────────────┐   ┌──────────────────────┐
    [title row: grid-rows 0fr → 1fr]                  │ Take a note… ▾│   │ Title                │  ← grows in
       <input placeholder="Title">                    └──────────────┘   │──────────────────────│  ← gray line
    [gray line, only when expanded]                                      │ text…        Note ▾  │
    [text row]                                                           │              Create  │
       <textarea placeholder="Take a note…" auto-height>                 └──────────────────────┘
       <KindDropdown/>  (right)                                           lifted: subtle shadow
    [footer, only when expanded] <Button>Create</Button>
```

- One white parent (`bg-surface`, the card's radius). The title row is always rendered, inside a
  `grid` whose row animates `0fr → 1fr`, so the card seems to grow taller upward. When collapsed it is
  `inert`, so it never takes focus.
- The separator is a 1px `bg-border` line (or `Divider` with no label), faded in with the title.
- **Expanded** (`open` state): `relative z-30`, a subtle shadow (a new `--lift-shadow` token in
  `styles/tokens.css`, next to the chrome shadows), and `-translate-y-0.5`. Transition 200ms, none with
  reduced motion.
- Opens on `focusin` / click anywhere in the card. Closes on `pointerdown` outside `root` or Esc (D7).
  Focus stays where it was clicked; opening by clicking the text keeps the caret there.

### Keyboard

| Key | Where | Does |
|---|---|---|
| ArrowUp | text, caret on the first line (`!value.slice(0, selectionStart).includes('\n')`) | focus title, caret at its end |
| ArrowDown / Enter | title | focus text, caret at its start |
| Ctrl/⌘+Enter | anywhere inside | create (D3) |
| Esc | anywhere inside | collapse, blur, keep the draft |

### Title size (D10)

`const big = titleFocused || title.length > 0` → `text-heading font-semibold` else `text-body`, with
`transition-[font-size,line-height]`.

### Kind dropdown

- `components/ui/overlays/Dropdown.tsx` (new, small): a ghost button showing the current choice and a
  chevron, which opens a native `popover` menu (like `TreeMenu`: top layer, closes on outside click
  or Esc) with `menuitemradio` items. `TreeMenu` is tree-specific (dots animation, row anchoring), so
  it is not reused, but the dropdown uses its menu tokens (`--menu-radius`, `--menu-p`) so they look alike.
- Items: Note (`LuStickyNote`), Article (`LuFileText`), from `KIND_ICON`.

### Create

`create()`: `const name = title.trim() || 'Untitled'`, then `createNote(name, text)` or
`createArticle(name, text)`, then clear the draft and collapse. The new object appears at the
sidebar root at once (the store is shared).

### `DashboardPage.tsx`

`<QuickCreate />` goes first, above the header row: centered, full width of the page column
(`max-w-3xl`), with extra space above it (`pt-16`) like the mockup.

## 4 — Article kind and note text

| File | Change |
|---|---|
| `mocks/projects.ts` | `ObjectKind = 'project' \| 'map' \| 'note' \| 'article'`; `MockObject.text?: string`; `MockMap.kind` gains `'article'`. New `export const isNoteLike = (k: ObjectKind) => k === 'note' \|\| k === 'article'` |
| `mocks/projectsStore.ts` | `createNote(name, text?)`; new `createArticle(name, text?)` (root, `locked: true`); `getProjects` child cast uses the widened type; `canLink` uses `isNoteLike` for the source and excludes note-likes as targets |
| `mocks/sidebarTree.ts` | `KIND_ICON.article = LuFileText` |
| `features/links/linkNode.ts` (lines 17, 40) | `item.kind === 'note'` → `isNoteLike(item.kind)` |
| `components/layout/sidebar/SidebarTree.tsx:145` | no link circle on note-likes |
| `components/layout/sidebar/SidebarDialogs.tsx:145` | `KIND_NAME.article = 'article'` |
| `pages/Notes/NotesPage.tsx` | lists note-likes, each with its own icon and panel type |
| `panels.ts` | `article: { title, icon: LuFileText, component: lazy(() => import('./features/notes/NotePanel')), draggable: true }` |
| `features/notes/NotePanel.tsx` | icon from `KIND_ICON[note.kind]`; shows `note.text` (whitespace kept), or "No text yet." when it has none |
| `mocks/projectsStore.test.ts` | cases: `createArticle`, `canLink` with an article source / target |

The `note.text` field is mock-only for now. The backend's notes resource is not touched.

## Testing

- `npm test` (vitest): new `barPopoutEdges.test.ts` (no snap, snap right, snap left, within/beyond
  the threshold, wider than the bounds, sidebar width 0); the `projectsStore` cases above.
- By hand (`npm run dev`):
  - Updates popout (navbar right end) sticks to the right edge, with an ear down the edge, and no
    shadow past the window edge.
  - A temporary popout right after the "Map" link sticks to the sidebar when it is pinned, and to the
    rail when it is unpinned. Toggle ☰ while it is open and check it follows.
  - Quick input: click → lifts and the title grows in; ArrowUp from the first line goes to the
    title; the title grows when focused or filled; Ctrl+Enter creates a note, then an article, and
    both show at the sidebar root with their icons; an article can be dragged onto a link circle and
    shows on the Notes page; Esc / click outside collapse it and keep the draft.
  - Reduced motion: no slide or size transitions.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | `stickToEdges` + tests | `components/ui/overlays/barPopoutEdges.ts`, `.test.ts` |
| 2 | Measuring, stuck layout and edge ears in BarPopout | `components/ui/overlays/BarPopout.tsx` |
| 3 | Mark the sidebar's edge | `components/layout/sidebar/Sidebar.tsx` |
| 4 | `article` kind, `text`, `isNoteLike`, `createArticle` + tests | `mocks/projects.ts`, `mocks/projectsStore.ts`, `mocks/projectsStore.test.ts`, `mocks/sidebarTree.ts` |
| 5 | Replace `'note'` checks with `isNoteLike` | `features/links/linkNode.ts`, `SidebarTree.tsx`, `SidebarDialogs.tsx`, `pages/Notes/NotesPage.tsx` |
| 6 | Article panel; note text in the panel | `panels.ts`, `features/notes/NotePanel.tsx` |
| 7 | `Dropdown` | `components/ui/overlays/Dropdown.tsx` |
| 8 | `--lift-shadow` token | `styles/tokens.css` |
| 9 | `QuickCreate` (layout, open/close, keys, title size, create) | `features/notes/QuickCreate.tsx` |
| 10 | Put it on the Dashboard | `pages/Dashboard/DashboardPage.tsx` |

Files **not** touched: `pages/Home/HomePage.tsx`, everything in `backend/` and `packages/shared/`,
`routes/index.tsx`.

## Open items

- None blocking. D8–D13 are defaults; say if any should change.
