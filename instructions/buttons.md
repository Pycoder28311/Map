# Buttons

Every button in the app is a Dark Fantasy UI button (`Workspace/Coding/Experiments/Dark Fantasy UI`). The design is in
`docs/plans/28-dark-fantasy-buttons.md`.

## Where things are

```
app/src/styles/buttons.css            THE look of every button (the same in every theme). Change a button here.
app/src/components/ui/buttons/
├── buttonStyles.ts                   LOOK (the text buttons' styles), TONE (primary's colours), ICON_LOOK (icon-only buttons)
├── Button.tsx                        <button>
├── ButtonLink.tsx                    a link (`to` / `href`) that looks like Button
├── NavButton.tsx                     a navigation link; the current page keeps the hover look
├── IconButton.tsx                    square, only an icon (needs `label`); its looks are unchanged
├── LinkButton.tsx                    Link: small text that lightens when hovered
├── ClosableButton.tsx                a button with an ✕ button beside it
├── PanelFrame.tsx                    the big gold square: ONLY the floating Create button, which grows into the Create modal
├── ButtonLook.tsx                    looks like Button, isn't one (the Dashboard cards' names, a dragged label)
├── ButtonContent.tsx                 (inside Button, ButtonLink, NavButton: icon, label, icon on the right)
└── buttons.test.ts                   fails when a button is made any other way
app/src/components/ui/overlays/ExtendMenu.tsx   a primary button that grows into its own menu (Sort by, Add +)
```

## Which one (buttons with text)

There are **five styles**, nothing else: no modifiers, no sixth style. Each is defined **once**, in section C of `styles/buttons.css`
(the file's header lists its sections). A new look for a text button is a change to one of these five. `buttons.test.ts` checks this:
`ButtonVariant` is exactly primary / secondary / underline / leather, and section C names only those classes, Link, the tones and the sizes.

| Style | How | For |
|---|---|---|
| **Primary** | `<Button>` (`variant="primary"`, the default) | every framed button: the Cancel-like frame and panel, bone label in the pixel font, no diamonds |
| **Secondary** | `variant="secondary"` | bold white pixel text only; hovered (or chosen) the frame comes **out of the screen**: Primary's frame with a plain panel, lifted, a black edge under it; pressed, it goes back in. The **Sort by** buttons |
| **Underline** | `variant="underline"` | quiet actions: toolbars, menu rows, tabs and chips not chosen, Show more, Try again |
| **Leather** | `variant="leather"` | the leather buttons (as before) |
| **Link** | `<LinkButton>` | small text that lightens when hovered (the columns' "Show all") |

Primary has three **tones** (`tone`, only on primary):

| Tone | Look | For |
|---|---|---|
| `green` (default) | the gray panel with a soft teal glow inside (the old Venom's) | the main action (Save, Sign in, Create, Add +), and the **chosen** one of a group |
| `gray` | the plain gray panel | the other actions (Cancel, Share), the cards' names (`ButtonLook`'s default) |
| `red` | a red panel | Delete, Sign out |

A chosen / not chosen pair: `variant={on ? 'primary' : 'underline'}` (a tab, a filter chip), or `tone={on ? 'green' : 'gray'}`
when both should be framed.

**Icons on either side:** `icon` (before the label) and `iconRight` (after it), on Button, ButtonLink, NavButton and ButtonLook.

**Sizes** (all styles): `size="xs" | "sm" | "md" (default) | "lg"`.

**Icon-only buttons** (`IconButton`) keep their own looks: `ghost`, `selected`, `secondary`, `primary`, `text`, and `round`.

**ExtendMenu** (a button that grows into its menu): `variant="ghost"` is a Secondary ("Sort by"); `variant="create"` a green
one with its icon on the right ("Add +", the + turning into an ✕ and its label into "None" while open). Open, the box is dark grey.

```tsx
<Button onClick={save}>Save</Button>
<Button tone="gray" icon={LuShare2} onClick={share}>Share</Button>
<Button iconRight={LuPlus} onClick={add}>Note</Button>
<Button tone="red" icon={LuTrash2} onClick={remove}>Delete</Button>
<Button variant="secondary" iconRight={LuChevronDown}>Sort by</Button>
<Button variant="underline" size="sm" onClick={more}>Show more</Button>
<IconButton icon={LuX} label="Close" onClick={close} />
<ExtendMenu variant="create" label="Add" items={kinds} onSelect={create}>Add</ExtendMenu>
```

## Rules (buttons.test.ts checks them)

- **No `<button>` outside `components/ui/buttons/`.** The exceptions are things that are clicked but aren't buttons: list
  rows, options of a picker, swatches, tree icons, tiles, drag handles, menu items. They are listed in `ALLOWED` in the
  test, with how many each file has and why. A new one goes there too, with its reason.
- **No `ui-btn…` classes outside the buttons** (and ExtendMenu's box).
- **`PanelFrame` only in `features/create/CreateFab.tsx`.**
- **No look in `className`** on Button, ButtonLink, NavButton, IconButton: no `bg-`, `text-[`, padding,
  `rounded`, `shadow`, `border`. Layout classes are fine (`ms-auto`, `w-full`, `justify-start`, `absolute`, `opacity-0`).
  A look that is needed in several places becomes a modifier in `buttons.css` (like `.ui-btn-sm`).

## Changing the look

- **One button** (e.g. Venom's green): its block in `buttons.css` (`.ui-btn-venom`). Each block starts with its settings
  (`--btn-bg`, `--btn-pad-x`, `--btn-hover-*` …); the defaults are in `.ui-btn`. Colours are the `--color-*` tokens at the
  top of the file.
- **Which style a variant is**: `LOOK` in `buttonStyles.ts` (primary is `.ui-btn-shade`); a tone is `TONE` (`.ui-tone-green`, `.ui-tone-red`).
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

- `.ui-inset`: the same box and inner shadow without the shadow around it (no longer used by the Dashboard cards: an article card is now a pixel-art book, `cards/book.ts` and `cards/BookArt.tsx`).
- `.ui-inset`: the same box and inner shadow without the shadow around it: the text part of the Dashboard's image cards (`cards/cardFaces.tsx`).
- `.ui-field-row`: the same look for clickable rows that aren't buttons: the sidebar's objects (`TreeItem`'s row), Trash,
  Show more. Hovered, or the current page, it takes the field's focus colour.

To change either, change the `--input-*` values at the top of `fields.css` (one change moves both). The faint black-leather look has four (the sidebar rows and the cards' text part have it and the inner shadow; the text fields are the same box without them): `--input-grain` (strength of the pebbled grain, 0 to 1), `--input-grain-size`, `--input-sheen` (soft diagonal light) and `--input-edge-light` (thin light on the top edge). The inner shadow (from every edge, more at the bottom) has its own four: `--input-inner-rgb` (colour), `--input-inner-bottom` and `--input-inner-sides` (strength, 0 to 1), `--input-inner-spread` (how far it spreads in). The rows and the input boxes share one border (drawn inside, so no size change): `--row-border-color` (and `--row-border-color-hover`, `--row-border-width`) in the same place; transparent until a colour is set.

## Stone's rocky border (icon-only buttons: IconButton `secondary`)

Stone's face (`.ui-btn-stone-face`) is cut to a polygon with points a little in from a straight edge, so its border is rough, not straight
(`clip-path: var(--btn-rock)` in `buttons.css`). The polygon is made by `components/ui/buttons/rockEdge.ts` and set once in `main.tsx`; its
two numbers are there: `ROCK_POINTS` (how many points along the long sides) and `ROCK_INTENSITY` (how far in a point can be, px; 0 is straight).
While a Venom icon button (IconButton `primary`) is held it has no inner shadow, only one flat, darker colour (`--btn-press-bg`).

Every Stone button has the same border. Its face has soft inner shadows (no light line on top, no dark band under it): `--stone-shade-sides`, `--stone-shade-bottom` (strength, 0 to 1) and `--stone-shade-spread` (px) at the top of the Map block of `.ui-btn-stone` in `buttons.css`, in the colour of the fields' inner shadow (`--input-inner-rgb`).

## Shade without brackets

`.ui-btn-plain` (`buttons.css`): Shade whose white corner brackets never slide out, hovered, current or chosen. Only
`IconButton` uses it (not a prop of Button any more): it adds it to its Shade variants (`iconButtonClass`), so the icon-only buttons have the hover background only.

Copy new colours into the `:root` block at the top. Everything after "Map: additions" is this app's own: keep it.

## Check

```
npm run test --workspace app
npm run build --workspace app
```
