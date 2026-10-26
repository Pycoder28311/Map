# 28 — Dark Fantasy buttons

**Goal:** every button in the app is one of the Dark Fantasy UI buttons (`Workspace/Coding/Experiments/Dark Fantasy UI`):
Venom, Venom split, Stone, Shade, Underline, and Panel. Panel is the big one and is used only for the floating Create
button. The look of all buttons lives in **one CSS file** (`styles/buttons.css`) and the markup in **one folder**
(`components/ui/buttons/`). To change a button you edit only those. A test fails when someone adds a `<button>` somewhere
else, so new buttons have to use the shared components. The ExtendMenu effect (a button that grows into its own menu)
stays: its Create variant becomes a Venom split button, and its ghost variant becomes Shade.
**Depends on:** 15 (CreateFab), the dashboard rows (RowHeader with ExtendMenu).
**Blocks:** a later plan that does the same for the other elements (Frame, Tile, Paper, Banner, Navbar, inputs, rows).

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Mapping:** `primary` → Venom, `create` → Venom, `secondary` → Stone, `ghost` → Shade, quiet text buttons (`TEXT_BUTTON`, "Show more", "Change") → Underline. The mapping lives in **one object** in `buttonStyles.ts`, so a variant can switch to another look by changing one line | User |
| D2 | **Panel is used only by the floating Create button** (`features/create/CreateFab.tsx`). A test makes sure nothing else imports it (§7) | User |
| D3 | **One look for all themes.** `base`, `arcane` and `pixel` no longer style buttons. Every button value lives in `styles/buttons.css` | User |
| D4 | **ExtendMenu stays.** Its `create` variant: closed, it is a **Venom split button** (icon piece + label piece). Open, it grows into one Venom-coloured box (face, bevels, brackets at the grown box's corners) holding the options. Its `ghost` variant ("Sort by", QuickCreate's "Kind") takes the Shade look the same way | User |
| D5 | **Scope: every button**, including the ~66 raw `<button>`s outside `components/ui/buttons/`. **Not buttons** for this plan: list rows, menu items, pickers, swatches, tree icons and invisible hit areas (`LIST_ITEM`, `PICK_ROW`, `pickClass`, `TREE_ROW_LOOK`, `Dropdown`'s and `ExtendMenu`'s option items, `TreeMenu`, colour and shape grids). They go on the test's allowlist, each with a reason, for the elements plan | User |
| D6 | **Dark look only.** The buttons look as they do in Dark Fantasy UI in both light and dark mode. Light mode contrast (Shade and Underline text) is left for the elements plan | User |
| D7 | **Class names and settings are copied as-is** from Dark Fantasy's `theme.css` §C (`.ui-btn`, `.ui-btn-venom`, `--btn-pad-x`, `--_bg` …), so later changes can be copied between the projects line by line. Only what the Map needs is **added** (§3), and each addition is marked `/* Map: */` | Default |
| D8 | **The call sites keep their API:** `<Button variant="secondary">`, `ButtonLink`, `NavButton`, `IconButton` keep their props. The 61 `<Button>` and 49 `<IconButton>` uses don't change. Only their output changes | Default |
| D9 | **States the Dark Fantasy buttons don't have** are added in `buttons.css`: a keyboard focus ring (`:focus-visible`), the **current page** (`NavButton`, `aria-current="page"`) and the **selected** variant (`aria-pressed="true"`) show the hover look permanently (brackets out for Venom and Shade, underline drawn for Underline, the hover face for Stone) | Default |
| D10 | **`--px` = 2px** (Dark Fantasy's `PIXEL` in `uiConfig.js`), set once at the top of `buttons.css` | Default |
| D11 | **No outer margin, and no `align-self`:** Dark Fantasy's `.ui-btn` has `margin: var(--btn-margin)` and `align-self: center`, which would shift every button in the Map's flex rows. `buttons.css` sets `--btn-margin: 0` and `align-self: auto` (a `/* Map: */` override) | Default |
| D12 | **Panel's font** (Jacquard 24) is **bundled** with `@fontsource/jacquard-24`, like Inter. The CSP (`app/public/_headers`, `font-src 'self' data:`) blocks Google Fonts. If the package doesn't exist, the woff2 goes in `app/src/assets/fonts/` with an `@font-face` in `buttons.css` | Default |
| D13 | **Square icon buttons** (`IconButton`, the X of `ClosableButton`, Dropdown's ⋯ trigger) get a `.ui-btn-square` modifier: equal padding, icon centred, on Shade by default (Venom/Stone when their variant says so) | Default |
| D14 | **The Create FAB's back face (✕ Cancel)** is a Panel button in stone colours (`.ui-btn-panel-muted`: the same shape, grey instead of gold and crypt), so both faces have the same size and the flip still works | Default |
| D15 | **Plan location:** `docs/plans/28-dark-fantasy-buttons.md`, plus a short how-to in `instructions/buttons.md` | Default |

## 1 — Risks

1. **Name clash on `--btn-*`.** The Map already has `--btn-radius`, `--btn-icon-size`, `--btn-px`, `--btn-close-p`,
   `--btn-close-radius`, `--btn-gap` in `styles/tokens.css`, used about 120 times, and many of those uses aren't buttons
   (fields, menus, tree rows, `Dropdown`, `ExtendMenu`). Dark Fantasy sets `--btn-radius`, `--btn-icon-size` … on `.ui-btn`
   itself, so they only change inside a button. That is fine for buttons, but the **old tokens must stay** for the non-button
   uses. Task 2 sorts every old `--btn-*` token into one of two groups:
   - only used by buttons: deleted from `tokens.css`, `themes/arcane.css` and `themes/pixel.css`;
   - used elsewhere: kept, left for the elements plan.
2. **Panel's `:active` transform vs the flip.** `.ui-btn-panel:active` sets `transform: translate(…)`, and the back face uses
   `transform: rotateY(180deg)`. On the same element, pressing would cancel the rotation. Each face is therefore a
   wrapper `<span>` that carries the rotation and `backface-visibility`, with the Panel button inside it.
3. **Sizes change.** Venom and Shade are taller and wider than today's pills (`--bracket-btn-pad-x` = 14px, `--btn-pad-y` = 7px),
   and Panel is much bigger (28.8px font, 32px × 12px padding). Tight rows can overflow: the Dashboard row header, pane
   islands, the board sidebar sections and the navbar. Check them in task 9. If a place needs a smaller button, add a
   `.ui-btn-sm` modifier in `buttons.css` rather than per-call classes.
4. **Bracket backgrounds replace `background`.** Venom and Shade draw their brackets as `background` layers. Any
   call site that adds a Tailwind `bg-*` to a button would wipe them out. The test in §7 forbids `bg-` in a button's
   `className`.
5. **Raw `<button>`s that are really rows or options.** If something is classified wrongly, a picker could turn into big
   green buttons. Task 7 classifies each one by reading it, using the rule in §6.

## 2 — Architecture

```
styles/buttons.css            THE look: Dark Fantasy theme.css §C copied + Map additions (/* Map: */)
                              tokens (venom / stone / shade / gold colours, --px, --icon-gap, --font-display) at the top
index.css                     @import "./styles/buttons.css" (after the themes)

components/ui/buttons/
  buttonStyles.ts             LOOK = { primary: 'ui-btn-venom', create: 'ui-btn-venom', secondary: 'ui-btn-stone',
                                       ghost: 'ui-btn-shade', text: 'ui-btn-underline', selected: 'ui-btn-shade' }
                              buttonClass(variant, extra), iconButtonClass(variant, extra)
  ButtonContent.tsx           shared inner markup: the icon (ui-btn-icon) + label; Stone's face span
  Button.tsx                  <button>                 (same props as today)
  ButtonLink.tsx              <Link> / <a>             (same props)
  NavButton.tsx               <NavLink>                (same props, aria-current → active look)
  IconButton.tsx              square: ui-btn-square    (same props)
  ClosableButton.tsx          Shade row + square X
  SplitButton.tsx             NEW: Venom split (icon + label pieces; iconPosition)
  PanelButton.tsx             NEW: only for CreateFab (`muted` prop → the grey back face)

components/ui/overlays/
  ExtendMenu.tsx              LOOK colours move to buttons.css (.ui-extend + .ui-btn-venom / .ui-btn-shade)
  Dropdown.tsx                its triggers use buttonClass('ghost') / iconButtonClass('ghost'); the menu stays
```

Changing a button = `buttons.css` (look) or one file in `components/ui/buttons/` (markup). Changing which look a variant
has = one line in `LOOK`.

## 3 — `styles/buttons.css`

- **Top: the tokens** the buttons use, copied from Dark Fantasy's `@theme`: `--color-venom*`, `--color-stone*`,
  `--color-shade-hover`, `--color-gold*`, `--color-crypt-*`, `--color-void`, `--color-bone*`, `--font-display`. They go in a
  `:root` block, not `@theme`, so they don't create Tailwind utilities like `bg-venom` that would let call sites colour buttons
  themselves. Also `--px: 2px`, `--px-neg`, `--icon-gap`.
- **Then §C as-is:** `.ui-btn`, `.ui-btn-icon`, `.ui-btn-panel`, the bracket block, `.ui-btn-venom`, `.ui-btn-venom-split`,
  `.ui-btn-stone` + `-face`, `.ui-btn-shade`, `.ui-btn-underline`.
- **Map additions** (`/* Map: */`):
  - `.ui-btn { --btn-margin: 0; align-self: auto; display: inline-flex; align-items: center; }`: so the icon and text line up
    (Dark Fantasy relies on inline layout and `vertical-align`);
  - `.ui-btn:focus-visible`: a 2px outline in `--color-bone`, offset 2px;
  - current / selected (D9): `.ui-btn-venom:is([aria-current=page],[aria-pressed=true])` and the same for Shade take the
    `:hover:enabled` values (brackets out); Underline: `--_ul-w: 100%`; Stone: `--_bg: var(--btn-hover-bg)`;
  - `.ui-btn-square` (D13): `--btn-pad-x: var(--btn-pad-y)`, `aspect-ratio: 1`, `justify-content: center`; the icon loses its
    edge margins;
  - `.ui-btn-panel-muted` (D14): Panel's `--btn-*` colour settings set to the stone colours, nothing else;
  - `.ui-btn` works on `<a>` too: `:hover:enabled` doesn't match links, so each rule `X:hover:enabled` becomes
    `X:is(:hover:enabled, a:hover)`, and the same for `:active`. This is the one edit to the copied rules; it is listed in
    `instructions/buttons.md` so it is redone when copying again;
  - ExtendMenu (§5): `.ui-extend[data-open=true]` takes the button's `--_bg`, bevel and brackets on the grown box;
    `.ui-extend-item:hover` uses `--btn-hover-bg`.
- **Removed elsewhere:** the button lines of `themes/arcane.css` (`--btn-border-*`, `--btn-primary-shadow`, `--btn-create-shadow`,
  `--btn-raised-*`, `--btn-corners`, `--btn-*-hover-bg`, the hover/active insets), the same in `themes/pixel.css`, and in
  `tokens.css` the ones only buttons use (Risk 1). `features/create/buttonLook.ts` (`RAISED`) is deleted.

## 4 — Components

- **`buttonStyles.ts`**: rewritten around `LOOK` (D1). `ButtonVariant` stays `primary | secondary | ghost | selected | create`
  and gains `text`. `buttonClass(variant, extra, active)` returns `ui-btn ${LOOK[variant]} ${extra}`. The old Tailwind
  strings (`VARIANTS`, `ACTIVE`, `BASE`, `ICON_BASE`, `FOCUS_RING`) are deleted, and so are `TEXT_BUTTON` and `PILL_BUTTON`
  (their uses become `<Button variant="text">` or Shade). `LIST_ITEM`, `PICK_ROW`, `pickClass`, `SELECTED`/`UNSELECTED` and
  `TREE_ROW_LOOK` stay unchanged (D5) and move to a new `components/ui/rowStyles.ts`, since they are not buttons.
  `ICON_HOVER` (the small X in rows) becomes `ClosableButton`'s square X.
- **`ButtonContent.tsx`**: the icon via `IconSlot` with `className="ui-btn-icon"`, so the icon animations (`iconAnimation`)
  keep working, then the children. For `secondary` (Stone) everything is wrapped in `<span className="ui-btn-stone-face">`.
  Button, ButtonLink and NavButton all render it, so the three can't drift apart.
- **`NavButton`**: `active ?? isActive` → `aria-current="page"` (the CSS does the look), with no class switching.
- **`IconButton`**: `ui-btn ui-btn-square ${LOOK[variant]}`. `hoverEffect`/`clickEffect` (icon effects) stay.
- **`SplitButton`** (new): Dark Fantasy's `VenomSplitButton` in TS: `icon`, `iconPosition`, children. It is used by RowHeader's
  single-kind create button and inside ExtendMenu's `create` variant.
- **`PanelButton`** (new): `<button className="ui-btn ui-btn-panel">`; `muted` adds `ui-btn-panel-muted`.

## 5 — ExtendMenu with Venom

- `LOOK` in `ExtendMenu.tsx` loses its colour classes and becomes the button class only:
  `create: 'ui-btn-venom'`, `ghost: 'ui-btn-shade'`. The grown box gets `ui-btn ${look} ui-extend` and `data-open`.
  Measuring, growing, the `direction` prop and the options keep working exactly as now.
- **Closed** (`create`): the content is a `SplitButton`-shaped pair of pieces (the `LuPlus` icon piece + "Add"). The pieces'
  classes are `.ui-btn-venom-split-icon` / `-label`, so the split CSS draws them. `padded={false}` stays.
- **Open:** the box is one Venom face (`.ui-extend[data-open=true]`: `background: brackets, inner shadow, var(--_bg)` on the
  whole box, bevels as `box-shadow`). Because the brackets are background layers on the box, they move out to the grown
  corners as it grows, just as `corner-marks` do today. The X replaces the + in the icon piece (RowHeader's `(open) =>`
  children). The options use `.ui-extend-item` (hover = `--btn-hover-bg`).
- **ghost** ("Sort by", QuickCreate "Kind"): the same, on Shade (transparent, then the dark fill and brackets on hover/open).
- `corner-marks` / `corner-marks-hover` are no longer used by ExtendMenu (they stay in `styles/cornerMarks.css` for others).

## 6 — Raw `<button>`s (46 files, 66 uses)

Rule for each one:
- **A button** = something you click to *do* an action, and it looks like a button (zoom, layers, share, trash, swap,
  presenter controls, navbar actions, search actions, Create in the modal, Dropdown triggers, SidebarSection header actions).
  It becomes `Button` / `IconButton` / `SplitButton` with the right variant. Its own colour and padding classes are removed.
- **Not a button** (D5) = a row, an option of a picker, a swatch, a thumbnail, a tree twisty, a drag handle, or an invisible hit
  area (ShapeGrid, OptionRowPicker, PinPicker, MapPicker, ColourPicker/ColourField, ValueBar, LayoutThumb, TreeMenu, TreeIcon,
  TreeRowIcon, ListRows' rows, SelectionList, TextStylesSection, the border/line sidebar pickers, ExtendMenu's and Dropdown's
  items). It stays and goes on the allowlist with a reason.

Files with both kinds (e.g. `RowHeader`: the rename pencil is an IconButton, the single create button a SplitButton) are split
per element. The final classification is a table at the end of this plan, filled in during task 7.

## 7 — Keeping it that way (`components/ui/buttons/buttons.test.ts`)

A vitest that reads `app/src/**/*.tsx` as text (no rendering) and fails when:
1. `<button` appears outside `components/ui/buttons/` and outside `ALLOWED` (a map `file → reason`, D5);
2. a `ui-btn` class string appears outside `components/ui/buttons/`, `ExtendMenu.tsx` and `Dropdown.tsx`;
3. `PanelButton` is imported anywhere but `features/create/CreateFab.tsx` (D2);
4. a `<Button`, `<ButtonLink`, `<NavButton` or `<IconButton` has a `className` containing `bg-`, `text-[`, `px-`, `py-`,
   `rounded` or `shadow` (the look belongs in `buttons.css`; layout classes such as `ms-auto`, `w-full` and `shrink-0` are fine).

The error message says which component to use, and points to `instructions/buttons.md`.

## 8 — The floating Create button

- `CreateFab.tsx`: the front face is `<PanelButton><LuPlus className="ui-btn-icon" />Create</PanelButton>`, the back face is
  `<PanelButton muted><LuX …/>Cancel</PanelButton>`. Each sits in a face `<span>` that carries `absolute inset-0`,
  `[backface-visibility:hidden]`, and the back one `[transform:rotateY(180deg)]` (Risk 2). `PixelSquare`, `FACE` and the
  `--pixel-face` classes are removed from it.
- The wrapper's fixed `h-11 w-36` becomes Panel's size: measure "Create" in Jacquard 24 at 28.8px and set the width so
  "Cancel" fits too (about `w-52 h-16`). Then check the modal's corner (`bottom-5 end-5`) still starts behind the button's
  centre, and that `pb-24` still leaves room (it may need `pb-28`).
- `CreateModal`'s own Create button: `<Button variant="primary">` (Venom). Its `RAISED` look is gone.
- Font: `npm i @fontsource/jacquard-24 --workspace app`, imported in `main.tsx` next to Inter (D12).

## Testing

- `npm run test --workspace app`: the new `buttons.test.ts` and the existing tests.
- `npx tsc -b` in `app/` and `npm run build --workspace app`.
- By eye (`npm run dev --workspace app`), in dark and light mode and in the `base`, `arcane` and `pixel` themes (all should
  look the same): navbar, sidebar (Trash, Show more), Dashboard rows ("Sort by" growing as Shade, "Add" as a Venom split
  growing into the Venom menu, both `direction`s), the Create FAB (flip both ways, press on each face, the modal coming from
  behind it), pane islands, board sidebar sections, zoom controls, presenter, share and search panels, a disabled button,
  keyboard focus, the current page in the navbar, a `selected` button.
- Compare a Venom, Stone, Shade, Underline and Panel button side by side with Dark Fantasy UI's preview page
  (`npm run dev` there): same pixels at the same zoom.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Bundle Jacquard 24 | `app/package.json`, `main.tsx` |
| 2 | Sort every old `--btn-*` token into "buttons only" (delete) or "used elsewhere" (keep), and list them here | `styles/tokens.css`, `styles/themes/arcane.css`, `styles/themes/pixel.css` |
| 3 | `buttons.css`: copy §C and the tokens, add the `/* Map: */` parts, import it | `styles/buttons.css`, `index.css` |
| 4 | `buttonStyles.ts` (`LOOK`), `ButtonContent`, then Button, ButtonLink, NavButton, IconButton, ClosableButton; move the row styles to `rowStyles.ts` | `components/ui/buttons/*`, `components/ui/rowStyles.ts` + its importers |
| 5 | `SplitButton`, `PanelButton` | `components/ui/buttons/` |
| 6 | ExtendMenu with Venom/Shade; RowHeader's create buttons; Dropdown's triggers | `ExtendMenu.tsx`, `RowHeader.tsx`, `Dropdown.tsx`, `QuickCreate.tsx` |
| 7 | Classify and convert the raw `<button>`s (§6); fill in the table below | the 46 files |
| 8 | CreateFab with Panel; CreateModal's Create; delete `buttonLook.ts` | `features/create/*` |
| 9 | Fix overflowing places found by eye (`.ui-btn-sm` if needed) | `buttons.css` + call sites |
| 10 | `buttons.test.ts` (§7) | `components/ui/buttons/buttons.test.ts` |
| 11 | `instructions/buttons.md`: which component for what, where the look is, adding a variant, how to copy changes from Dark Fantasy UI (and the `:is(:hover:enabled, a:hover)` edit) | `instructions/buttons.md` |

Files **not** touched: the Dark Fantasy UI project (only read), the other elements (Card, fields, Modal, Callout, tree rows,
menus' items), `styles/cornerMarks.css`, `backend/`, `packages/`, `app/public/_headers`.

## Raw `<button>` classification (filled in during task 7)

| File | Element | Button → component / Not a button → reason |
|---|---|---|
| `layouts/LayoutsSection`, `dashboard/ResourceColumn`, `layout/sidebar/ResourceRows` | Could not load. Try again | `Button variant="text"` |
| `dashboard/DashboardSections`, `objects/ListRows`, `board/ShapeGrid`, `share/ShareOptions` | Load more, Show all / less, Choose another | `Button variant="text"` |
| `create/CreateFab` | the toast's Open | `Button variant="text"` |
| `create/CreateFab` | Create / ✕ Cancel | `PanelButton` (`muted` for Cancel) |
| `create/CreateModal` | the kinds (tabs) | `Button variant="ghost" size="sm"` + `aria-pressed` |
| `create/CreateModal` | Create | `Button variant="primary"` |
| `dashboard/RowHeader` | Add (one kind) | `SplitButton` |
| `dashboard/RowHeader` | ✎ Rename | `IconButton size="sm"` |
| `dashboard/RowHeader` | the row's title | not a button: a heading that opens its project |
| `focus/ZoomButton` | Focus / Leave focus | `IconButton` (Leave focus: `secondary`, it floats over the page) |
| `layout/Navbar` | ☰ | `IconButton` with `MenuToggleIcon` as its child |
| `recent/RecentHistory` | Recent History | `Button variant="secondary"` |
| `search/SearchPanel` | Open / Close Filters | `Button size="sm"`, `ghost` / `selected` |
| `search/SearchPanel` | a filter chip (remove) | `Button variant="secondary" size="sm"` |
| `search/SearchPanel` | Include / Exclude, a result row, its drag handle | not buttons: a segmented choice, a row, a drag handle |
| `workspace/SwapButtons` | swap (drag to resize) | `IconButton variant="secondary" size="sm"` |
| `layouts/LayoutThumb` | a tile's actions | `IconButton variant="secondary" size="sm"` |
| `layouts/LayoutThumb` | the tile | not a button: a tile |
| `board/ZoomControls` | 100% (fit) | `Button variant="ghost" size="sm"` |
| `board/PointLinks` | a link | `Button variant="secondary" size="sm"` |
| `ui/overlays/Dropdown` | the triggers | `Button` / `IconButton`, `ghost` `sm` |
| `ui/overlays/ExtendMenu` | the button | `Button variant="ghost"` / `SplitButton` |
| `layout/sidebar/TrashBin` | Trash | not a button: a sidebar row among the rows (its look is now its own, from the old ghost one) |
| `ui/Divider`, `ui/tree/*` | row icons, ⋯ | not buttons: tree icons |
| `ui/fields/*` | swatches, a field's reset icon, list options | not buttons: parts of fields |
| `ui/overlays/Dropdown`, `ExtendMenu`, `ui/tree/TreeMenu` | menu items | not buttons: menu items |
| `board/*` sidebar sections, `PinPicker`, `ShapeGrid`, `OptionRowPicker`, `PointToolButton` | options, tabs, a select | not buttons: pickers |
| `board/BranchesPopout`, `ForwardLink`, `LayersButton`, `MapPicker`, `SelectionList`, `TextStylesSection` | list rows (and MapPicker's title) | not buttons: rows |
| `board/presenter/Presenter` | style choice, slide thumbnails | not buttons: a segmented choice, thumbnails |
| `board/sidebar/point/PointBannerSection`, `border/BorderCountySection` | upload | not buttons: upload areas |
| `dashboard/DashboardColumns` | grip | not a button: a drag handle |

Also changed: `IconButton`s that had a look of their own (`BoardEditor`, `SelectionBox`, `Presenter`, `TextFontSection`,
`SidebarSection`) lost it for `size="sm"` / `variant="secondary"`; drag labels (`DragFloat`, `WorkspaceProvider`) use the
new `ButtonLook`.

**Done differently from the plan:** the link fix is `:hover:not(:disabled)` / `:active:not(:disabled)` (simpler than
`:is(:hover:enabled, a:hover)`); a `size` prop (`'md' | 'sm'`) on the components instead of a class at call sites; the
row styles' `FOCUS_RING` moved to `rowStyles.ts` too; `buttons.css` sits in `@layer components` so Tailwind's layout
classes win over it; the other buttons use the app's font (Inter), only Panel uses Jacquard 24.

## Open items

- Light mode contrast of Shade and Underline (D6): for the elements plan.
- Do the themes still make sense once buttons ignore them? (`arcane` and `pixel` mostly restyle buttons and corners.) For the
  elements plan.
