# Buttons

Every button in the app is a Dark Fantasy UI button (`Workspace/Coding/Experiments/Dark Fantasy UI`). The design is in
`docs/plans/28-dark-fantasy-buttons.md`.

## Where things are

```
app/src/styles/buttons.css            THE look of every button (the same in every theme). Change a button here.
app/src/components/ui/buttons/
├── buttonStyles.ts                   LOOK: which button each variant is (one line each)
├── Button.tsx                        <button>
├── ButtonLink.tsx                    a link (`to` / `href`) that looks like Button
├── NavButton.tsx                     a navigation link; the current page keeps the hover look
├── IconButton.tsx                    square, only an icon (needs `label`)
├── SplitButton.tsx                   Venom in two pieces: an icon piece and a label piece (Add, Create)
├── ClosableButton.tsx                a button with an ✕ button beside it
├── PanelButton.tsx                   the big gold one: ONLY the floating Create button
├── ButtonLook.tsx                    looks like Button, isn't one (a dragged label)
├── ButtonContent.tsx                 (inside Button, ButtonLink, NavButton: icon + label, Stone's face)
└── buttons.test.ts                   fails when a button is made any other way
app/src/components/ui/overlays/ExtendMenu.tsx   a button that grows into its own menu (Shade or Venom split)
```

## Which one

| Variant | Button | For |
|---|---|---|
| `primary` | Venom (green) | the main action of a place (Save, Sign in, the modal's Create) |
| `create` | Venom | making something new; as `SplitButton` for Add / Create with an icon |
| `secondary` | Stone (grey block) | the other actions; buttons floating over a board or a picture |
| `ghost` | Shade (no background until hovered) | quiet actions, toolbars, navigation, menu triggers |
| `selected` | Shade, kept in its hover look | the chosen one of a group (or pass `aria-pressed`) |
| `text` | Underline | a text action in running text (Show more, Try again, Open) |

`round` (IconButton only, `.ui-btn-round`) makes a circle with a line and a shadow, for buttons floating over a border: the article's
Zoom / Messages / Notes on its body's left edge.

`size="sm"` is a smaller button for tight rows (board panels, row headers, chips). `size="lg"` is as tall as a text field (`--field-h`, 40px)
with a bigger icon and text: the navbar's Recent History button, level with the search field.

**LinkButton** (`LinkButton.tsx`, `.ui-btn-link` in `buttons.css`) is the simplest one: just small text that lightens when hovered; no
padding, background, brackets or underline. `to` makes it a link, otherwise it is a button. Used for the columns' "Show all". Its
look is not a `.ui-btn`, so the button settings don't apply to it.

**ButtonLook** is a button's look on something you can't press: the names on the Dashboard's cards (Stone, like the Recent History button).

**ExtendMenu** (a button that grows into its menu): open, it is dark grey (`--color-shade`). A `create` one (Venom split)
turns its + into an ✕ and its label into "None" (`openLabel`); its two pieces then become Shade buttons. **The hover of
Shade, of Sort by and of that open ✕ / None is one thing**: Shade's `--btn-hover-bg` (`--color-shade-hover`, a light
veil) and its brackets, in `buttons.css`. The menu items' hover uses the same colour.

```tsx
<Button variant="secondary" icon={LuShare2} onClick={share}>Share</Button>
<IconButton icon={LuX} label="Close" onClick={close} />
<SplitButton icon={<LuPlus />} iconPosition="right" onClick={add}>Note</SplitButton>
<ExtendMenu variant="create" label="Add" items={kinds} onSelect={create} splitIcon={(open) => (open ? <LuX /> : <LuPlus />)}>Add</ExtendMenu>
```

## Rules (buttons.test.ts checks them)

- **No `<button>` outside `components/ui/buttons/`.** The exceptions are things that are clicked but aren't buttons: list
  rows, options of a picker, swatches, tree icons, tiles, drag handles, menu items. They are listed in `ALLOWED` in the
  test, with how many each file has and why. A new one goes there too, with its reason.
- **No `ui-btn…` classes outside the buttons** (and ExtendMenu's box).
- **`PanelButton` only in `features/create/CreateFab.tsx`.**
- **No look in `className`** on Button, ButtonLink, NavButton, IconButton, SplitButton: no `bg-`, `text-[`, padding,
  `rounded`, `shadow`, `border`. Layout classes are fine (`ms-auto`, `w-full`, `justify-start`, `absolute`, `opacity-0`).
  A look that is needed in several places becomes a modifier in `buttons.css` (like `.ui-btn-sm`).

## Changing the look

- **One button** (e.g. Venom's green): its block in `buttons.css` (`.ui-btn-venom`). Each block starts with its settings
  (`--btn-bg`, `--btn-pad-x`, `--btn-hover-*` …); the defaults are in `.ui-btn`. Colours are the `--color-*` tokens at the
  top of the file.
- **Which button a variant is**: `LOOK` in `buttonStyles.ts` (e.g. `secondary: 'ui-btn-shade'`).
- **A new kind of button**: a new block in `buttons.css`, a new entry in `LOOK`.
- The pixel unit is `--px` (2px) at the top of `buttons.css`; every size is a multiple of it.

## Copying changes from Dark Fantasy UI

Section C of `buttons.css` is that project's `src/theme.css` section "C. BUTTONS", indented one level (it sits in
`@layer components`, so Tailwind's layout classes win over it). `buttons.css` only says how a button looks, never where
it sits in its parent: that is the call site's (`ms-auto`, `self-start`, `w-full`). After pasting a newer version, redo
the edits:

- `:hover:enabled` → `:hover:not(:disabled)` and `:active:enabled` → `:active:not(:disabled)` (so links work too);
- delete `margin` and `align-self` from `.ui-btn`, and every `--btn-margin`;
- Underline: the same padding above the text as below it; Stone: `padding: var(--btn-shadow-height) 0` (both marked
  `Map:`), so their text stays centred.

Sidebar rows (tree rows, Trash, Show more) are not buttons: they are `TreeRowLink` / `SIDEBAR_ROW` (layout) with the look
`ui-field-row` (`TREE_ROW_LOOK`), see below.

## Fields and sidebar rows (styles/fields.css)

The look of the text fields is Dark Fantasy UI's "1. Minimal input" (its `minimalInput` in `uiConfig.js`): a flat grey box,
a soft shadow, a lighter grey while typed in. Without its faint corner marks on the right side. It is in
`styles/fields.css`, the same in every theme and in light mode too (inside, the text roles are the dark mode's):

- `.ui-field`: the box of every input: `InputBox` (`components/ui/fields/InputBox.tsx`), used by `TextField`, `SearchInput` and the Dashboard's big input (`QuickCreate`). Its border is the rows' one (`--row-border-*`, below);
- `.ui-inset`: the same box and inner shadow without the shadow around it: the text part of the Dashboard's image cards (`cards/cardFaces.tsx`).
- `.ui-field-row`: the same look for clickable rows that aren't buttons: the sidebar's objects (`TreeItem`'s row), Trash,
  Show more. Hovered, or the current page, it takes the field's focus colour.

To change either, change the `--input-*` values at the top of `fields.css` (one change moves both). The faint black-leather look has four (the sidebar rows and the cards' text part have it and the inner shadow; the text fields are the same box without them): `--input-grain` (strength of the pebbled grain, 0 to 1), `--input-grain-size`, `--input-sheen` (soft diagonal light) and `--input-edge-light` (thin light on the top edge). The inner shadow (from every edge, more at the bottom) has its own four: `--input-inner-rgb` (colour), `--input-inner-bottom` and `--input-inner-sides` (strength, 0 to 1), `--input-inner-spread` (how far it spreads in). The rows and the input boxes share one border (drawn inside, so no size change): `--row-border-color` (and `--row-border-color-hover`, `--row-border-width`) in the same place; transparent until a colour is set.

## Stone's rocky border

Stone's face (`.ui-btn-stone-face`) is cut to a polygon with points a little in from a straight edge, so its border is rough, not straight
(`clip-path: var(--btn-rock)` in `buttons.css`). The polygon is made by `components/ui/buttons/rockEdge.ts` and set once in `main.tsx`; its
two numbers are there: `ROCK_POINTS` (how many points along the long sides) and `ROCK_INTENSITY` (how far in a point can be, px; 0 is straight).
Every Stone button has the same border. Its face has soft inner shadows (no light line on top, no dark band under it): `--stone-shade-sides`, `--stone-shade-bottom` (strength, 0 to 1) and `--stone-shade-spread` (px) at the top of the Map block of `.ui-btn-stone` in `buttons.css`, in the colour of the fields' inner shadow (`--input-inner-rgb`).

## Shade without brackets

`.ui-btn-plain` (`buttons.css`): Shade (or Venom) whose white corner brackets never slide out, hovered, current or chosen.
`IconButton` adds it to its Shade variants (`iconButtonClass`), so the icon-only buttons have the hover background only.

Copy new colours into the `:root` block at the top. Everything after "Map: additions" is this app's own: keep it.

## Check

```
npm run test --workspace app
npm run build --workspace app
```
