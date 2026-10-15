# 24 — Sidebar sections

**Goal:** every right-sidebar of the map editor (the selected object's, the tool pen's, the multi-selection's) is one small
component that gets its object (or pen values) as an argument and is made of **one component per section**. The big
`*Options` files and the copy between `TextPenPanel` and `TextOptions` go away. Nothing changes for the user.
**Depends on:** 18 (`ObjectModal`, `SelectionPanel`), 19–22 (the Options, pen panels, text fields).
**Blocks:** nothing. New object kinds (23) get easier: add a sidebar and its sections.

**Frontend only, refactor only.** Same UI, same undo steps, same previews.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Scope: all right sidebars.** Selected point, line, border, shape, text; the Line, Border, Text and Point pen panels; the multi-select `ColoursPanel` | User |
| D2 | **Sections are pure and shared.** A section takes `value` + `onChange` and nothing else (no store, no `mapId` unless it really needs one, like the style list). The pen panel and the object panel render the **same** section; only the source of the value differs | User |
| D3 | **A sidebar gets the object as a prop** and builds one `apply(patch, commit)` for it (today's `apply` in `SelectionPanel.tsx`: `commit` false previews, true is one undo step via `updateObject`). Sections never call `boardStore` themselves | User |
| D4 | **No behaviour change.** Same markup and classes, same undo steps, existing tests keep passing, nothing added to them except tests for the new adapters | User |
| D5 | **File layout:** `features/board/sidebar/` with one folder per kind (`point/`, `line/`, `border/`, `shape/`, `text/`, `selection/`) and `common/` for what is shared (`SidePanel`, `ObjectModal` frame, `TextSection`, links). Each kind has `XSidebar.tsx` (selected object) and, if it has a pen, `XPenSidebar.tsx` | Default |
| D6 | **Naming:** `*Sidebar` replaces `*Modal`, `*Options` and `*PenPanel`; sections are named for what they show (`TextSizeSection`, `LineArrowsSection`…). `SidePanel.tsx` keeps its name (the shell) | Default |
| D7 | **Move with `git mv`**, so history follows the files | Default |
| D8 | **Small steps:** one kind per task, tests and typecheck after each, so every step can be committed alone | Default |

## 1 — Risks

- **The working tree already has many uncommitted changes** in exactly these files (`SelectionPanel`, `TextOptions`,
  `TextPenPanel`, `FontFields`, `ObjectModal`, `BoardEditor`, the new `Text*Fields`…). Commit or stash that work **before**
  task 1, or the refactor's moves will be mixed into it.
- **Text is the hard one:** `TextOptions` mixes the TipTap editor's current marks/colour/size (`useEditorState`) with the
  object's values. That logic must move into an adapter, not into the sections (see 3.3).
- **Slider previews:** the `commit=false` path (`onPreview` → `StylePreview`) must still reach the board while a slider is
  held. Sections keep the `(patch, commit)` signature so this survives.
- `TextSection` keeps open/closed state in a module-level store shared by the pen panel and the object panel (`map.textSections.v2`).
  Moving the file must not change the key or the section ids.

## 2 — Approach

```
BoardEditor
 ├─ SelectionPanel (router: 0 → none, >1 → SelectionColoursSidebar, 1 → by object.kind)
 │    └─ PointSidebar / LineSidebar / BorderSidebar / ShapeSidebar / TextSidebar   props: { object, apply, ...context }
 │          └─ ObjectModal frame (header row, links) ─ the kind's sections: props { value, onChange }
 └─ pen sidebars (Line/Border/Text/Point)   props: none → read usePen() once, pass { value, onChange } down
                                               └─ the SAME sections
```

- `SelectionPanel` stays the one router, but shrinks to: build `apply`, pick the sidebar by `object.kind`, pass `object`.
  The inline `header` and `onConnect` of the text move into `TextSidebar`.
- Every kind's sidebar is `<ObjectModal …>` + its sections in order. Section order and spacing stay as today.
- A section's `value` is a **slice type** (for example `LineStyleValue = Style`, `TextSizeValue = { size; fixedSize }`), and
  the pen store and the object already have these fields with the same names, so the pen sidebar passes `pen` and the object
  sidebar passes `object` directly (D2).

## 3 — Details per kind

### 3.1 Frame and common
- `ObjectModal.tsx` → `sidebar/common/ObjectFrame.tsx`: header row, `top`/`leading`/`children`, links section. The links block
  (list of links, `LinkObjectsButton`) becomes its own `ObjectLinksSection` it renders.
- `SidePanel.tsx`, `TextSection.tsx` (rename `SidebarSection.tsx`; same store key, same ids) and `ObjectHeaderRow.tsx` move to `common/`.

### 3.2 Point (`PointModal.tsx`, `PointPenPanel.tsx`)
Sections: `PointBannerSection`, `PointPinSection` (the pin button + `PinPicker`), `PointLabelSection` (the `<select>`, used by
both the modal and the pen), `PointDescriptionSection` (the `Format` bar + `RichTextEditor`; `PointDescription.tsx` already
exists, check it first and reuse), `PointLinksSection` (`PointLinks`).

### 3.3 Text (`TextOptions.tsx`, `TextPenPanel.tsx`, `FontFields.tsx`, `Text*Fields.tsx`, `TextHeader.tsx`, `TextStyleList.tsx`)
- Sections: `TextHeaderSection` (what it says, Focus, Connect; object only), `TextSizeSection`, `TextFontSection`,
  `TextFillSection`, `TextEffectsSection`, `TextStylesSection` (the style list).
- `FontFields.tsx` (189 lines, 20+ props) is split along the groups it already has into sub-components inside
  `TextFontSection`: family and weight, bold/italic/underline/strike with their line colours, spacing, box frame, alignment,
  line gap, rotation. They take the flat `TextValue` and `onChange(patch, commit)`, not one prop per field.
- **One adapter per source, same shape**, so the sections do not care:
  `useTextSource(mapId, text)` (object: TipTap marks, whole-text vs selection logic, run patches, today's `toggle`,
  `toggleMark`, `toggleBold`, `setColor`, `setSize`) and `usePenTextSource()` (pen: `setTextPen`). Both return
  `{ value, onChange, toggleBold, toggleMark, setColor, setSize }`. Sections read only that.
- The `KEEP_EDITING` wrapper attribute stays on the text sidebar's root.
- `TextPenPanel.tsx` shrinks to the title, the hint and the same sections fed by `usePenTextSource()`.

### 3.4 Line, shape, border (`LineOptions.tsx`, `ShapeOptions.tsx`, `ShapeFields.tsx`, `BorderOptions.tsx`, `FillFields.tsx`, `PenPanel.tsx`, `BorderPenPanel.tsx`)
- `LineOptions` is one file with the type, gap/part, arrows, drawing way (+ the pen's Shape entry): split into
  `LineTypeSection`, `LineArrowsSection`, `LineWaySection` (exact groups fixed in task 1). The pen-only props
  (`onShape`, `shapeActive`, `onLine`, `afterWays`) stop being optional props of one big component: the pen sidebar composes
  `LineWaySection` with the shape grid itself.
- Shape sidebar = `ShapeFields` section + the same line sections (`kind="shape"` hides arrows and the drawing way: keep as a prop).
- Border: `BorderOutlineSection`, `BorderFillSection` (`FillFields`), `BorderDescriptionSection` (the `DescriptionBox`),
  `BorderShapeSection` (pen only, replaces `withShape`).

### 3.5 Selection of several (`ColoursPanel.tsx`)
`SelectionColoursSidebar` (the shell) + `ColourRow` into its own file as the `ColourRow` section. Already close to the target.

## Testing
- Before task 1: `npm test` and the typecheck pass (baseline), and the app is clicked through once for each kind.
- After every task: the unit tests (`boardCodec`, `operations`, `selectionButtons`, `textLayout`, `drawText`…) still pass; the
  typecheck and lint pass.
- New small tests: the text adapters (`useTextSource` marks with and without an editor, pen source), as plain functions if
  the logic is pulled out of the hooks.
- By hand per kind: open the sidebar for a selected object and for the tool; change every control; check the live preview on
  a held slider, one undo step per change, and that the text sections stay open or closed across the two sidebars.

## Task list
| # | Task | Files |
|---|---|---|
| 0 | Commit or stash the current work; record the baseline (tests, typecheck) | none |
| 1 | Inventory: list each Options file's groups and props; fix section names; create `sidebar/` folders | `LineOptions`, `BorderOptions`, `ShapeOptions`, `FontFields` (read) |
| 2 | Move the shell and common pieces (`SidePanel`, `ObjectModal`→`ObjectFrame`, `TextSection`→`SidebarSection`, `ObjectHeaderRow`); extract `ObjectLinksSection`; fix imports | `common/*`, importers |
| 3 | Make `SelectionPanel` a pure router: `apply` built there, one sidebar per kind, text header moved out | `SelectionPanel.tsx` |
| 4 | Selection of several: `SelectionColoursSidebar` + `ColourRow` | `ColoursPanel.tsx` |
| 5 | Point: sidebar + 5 sections; pen sidebar reuses label and pin sections | `PointModal`, `PointPenPanel`, `PointDescription` |
| 6 | Line: 3 sections; `LineSidebar`, `LinePenSidebar` | `LineOptions`, `PenPanel` |
| 7 | Shape: `ShapeSidebar` from `ShapeFields` + line sections | `ShapeOptions`, `ShapeFields` |
| 8 | Border: 4 sections; `BorderSidebar`, `BorderPenSidebar` | `BorderOptions`, `FillFields`, `BorderPenPanel` |
| 9 | Text adapters (`useTextSource`, `usePenTextSource`) with tests | `TextOptions`, `TextPenPanel` |
| 10 | Text sections: split `FontFields`, wrap Size/Fill/Effects/Styles/Header; `TextSidebar`, `TextPenSidebar` | `FontFields`, `Text*Fields`, `TextHeader`, `TextStyleList` |
| 11 | `BoardEditor` imports; delete the old files; full test, typecheck, lint, manual pass | `BoardEditor.tsx` |

Files **not** touched: `boardStore.ts`, `changes.ts`, `operations.ts`, `pen.ts` (stores, patches and codec stay as they are),
`boardCodec.ts`, the canvas files (`render.ts`, `draw*.ts`, `textLayout.ts`), backend, `app/src/components/ui/*`, `panels.ts`.

## Open items
- Task 0: do you want to commit the current changes first (they touch the same files)?
- Do you want the folders under `features/board/sidebar/` (D5), or the files kept flat in `features/board/`? Default is folders.
