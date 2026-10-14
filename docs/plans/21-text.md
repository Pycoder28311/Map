# 21 — Text

**Goal:** the Text tool (disabled today) puts rich text on the map, Figma-style: click for text that grows as you type, drag for
a box that wraps; double-click or Enter edits it in place. Text can have **mixed styles inside it** (bold, italic, underline,
strike, colour, size), is rotated, resized and styled from the editor's right sidebar, and can be **connected** to a border,
point or line so it follows it. An area's name becomes a real text object linked to the area.

**Depends on:** 17a (objects, codec), 18 (box, `ObjectModal`, `useMouseTool`, links), 19 (sidebar, `pen.ts`, fields), 20 (areas:
`areaAt`, `labelPoint`, `AreaNameInput`, `border.name` painted as a label).
**Blocks:** 22 (the point modal reuses the rich-text editor built here), 23.

**Frontend only.** No backend, database or API.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | **Rich text with mixed styles:** a text object is a list of **runs** (`{ text, bold?, italic?, underline?, strike?, color?, size? }`). The board file stores the runs; the canvas paints them with its own layout. A plain text with no styling is stored exactly as before (`text` only) | User |
| D2 | **Editing uses TipTap** (`@tiptap/react` + `starter-kit`, underline, text-style, colour, a small font-size extension), wrapped in one reusable `RichTextEditor` that plan 22's point modal also uses (map.md: "tiptapeditor text"). The editor works on its own document; `richText.ts` converts runs ⇄ TipTap JSON (pure, tested). **Needs your OK to add the dependencies** (see Open items) | User (choice) + Default |
| D3 | **Area name = a real text object.** Text `isName: true` + `attach` = the area's id + a board link to it. Its plain text is kept in `border.name` in the **same change**, so the header name, search and links still work. Naming an area from the hover input (plan 20), from the area's modal, or with the Text tool inside it, all go through one pure function `nameArea`. Deleting the name text clears `border.name`. Areas named before this plan (no name text) keep painting `border.name` as a label until their name is edited; no automatic migration | User |
| D4 | **Connect = link + follow.** The modal's drop-down lists borders, points and lines ("None" first). Picking one adds the board link (so the forward-link icon opens it) and sets `attach`; whenever that object moves, resizes, rotates or flips, the text moves by the **displacement of the object's centre** in the same change (`follow.ts`, called from `applyChange`, so it is one undo step and it shows in gesture previews). Removing the object clears the attachment; unlinking or choosing "None" stops following | User |
| D5 | **Create like Figma (Text tool, key T):** a **click** on empty board starts a text with automatic width at that point and puts the cursor in it; a **drag** makes a box of that width that wraps; a click on an **existing text** edits it. Leaving it (click outside, Esc) commits it as **one undo step**; an **empty** text is discarded, nothing is added. In the Mouse tool: **double-click** a text, or **Enter** with one selected, edits it | User (map.md) |
| D6 | **Inside an unnamed area** the new text becomes the **area name** (D3): it is centred on the area's label point, and a notice at the bottom of the editor says "Used as the name of *Area*" (the same bar style as `LinkPickBar`). If the area already has a name, the text is an ordinary text. Only the first text created inside counts | User (map.md) |
| D7 | **Data:** `TextObject` = `anchor` (top-left of its box), `text` (plain text, always kept in step with the runs, for search and old readers), `runs?`, `width` (0 = automatic, else the wrap width), `rotation` (degrees), `align`, `size` (default font size), `color`, `opacity`, `attach?`, `isName?` | Default |
| D8 | **Layout** is ours (`textLayout.ts`, pure, with the text measurer injected so it is testable): words wrap at spaces, a word longer than the width breaks by character, `\n` is a new line, line height 1.25 × the biggest size on the line, alignment per object. The TipTap overlay copies the same rules in CSS (`white-space: pre-wrap; overflow-wrap: anywhere`, same font, line height and width) so a text does not jump when editing starts or ends | Default |
| D9 | **Sizes** of a text for hit-testing, bounds and the selection box come from its layout (replacing 18's placeholder 80×24); a rotated text's bounds are the rotated box's bounds | Default |
| D10 | **Transforms:** move = anchor; **rotate** adds to `rotation`; **resize** (the box's handle) changes the **width** (wrapping) when the text is selected alone, and scales `size` and every run's size with the box when it is part of a multi-selection or a group resize; flips do not mirror text (they move its anchor like a point); duplicate copies (offset 16) without `attach`/`isName` | Default |
| D11 | **Sidebar (right):** a selected text shows `ObjectModal` with the header (focus, name, forward link), the **text options** (`TextOptions`: bold, italic, underline, strike, colour, size, align, opacity — applying to the editor's selection while editing, to the whole text otherwise), the **Connect** drop-down and the link footer. With the Text tool and nothing selected the sidebar shows the **text pen** (default size, colour, align, opacity of the next text; held like 19's pen, not undoable) | Default |
| D12 | **Fonts:** one family (`system-ui, sans-serif`, like the area labels); no font picker in this plan | Default |
| D13 | **Selection box buttons for text:** resize, rotate, duplicate, ✕, link (bottom left); no flips, no split. `ObjectHeaderRow` keeps split and eraser disabled for text | Default (plan 18's table, extended) |
| D14 | **Colours panel** also lists a text's colour and run colours; recolouring changes them | Default |
| D15 | **Keys while editing** belong to the editor (Delete, Backspace, Ctrl+Z are text edits, TipTap's own undo inside the session); Esc commits and leaves; the board's shortcuts (tool keys, Delete of the selection) are ignored while typing, as `isTyping` already does | Default |

## 1 — Risks and blockers

1. **New dependency (TipTap).** `package.json` and the lockfile change; the packages and versions must be chosen when implementing
   (the plan cannot check npm). Needs your approval first (Open items). If you decline, D1's mixed styles need our own editor
   (a `contentEditable` with `execCommand` is deprecated and unreliable): not recommended.
2. **Canvas text vs. editor text must match.** Two layout engines (ours on the canvas, the browser's inside TipTap) will differ by
   a pixel here and there. D8 copies the rules; the overlay is positioned and scaled with the view's transform, and the canvas copy is
   hidden while editing. A small re-wrap on commit is possible for unusual text; test with long words, mixed sizes and CJK/emoji.
3. **`applyChange` gets a post-pass** (`follow.ts`) used by every gesture preview and commit. It must be cheap (only when the board has
   an attached text) and must not loop (a text attached to a text is ignored; a text's own move never moves its target).
4. **In-place editor over a transformed canvas.** The overlay is HTML over the canvas: position, scale (`view.scale`), rotation
   and the sidebar's width change must all track the view while editing (wheel zoom, pan). While editing, pan and zoom stay possible; the editor keeps focus.
5. **IME and touch.** Composition input and mobile keyboards depend on TipTap/ProseMirror; they are checked in the browser pass, not here.
6. **File format growth.** The text record gets optional trailing data after `x y text` (like 20's border extras); old files must read with defaults, and a text with no extras must have the old bytes.
7. **Area-name sync.** Two sources (`border.name` and the name text) can drift if code edits one alone. All writes go through `nameArea` / `textChange`; a pure test pins that they stay equal through rename, delete, undo.
8. **Uncommitted work** from 17a–20 sits in the working tree; this plan edits those files. Read them first.

## 2 — Approach

```
features/board/
  types.ts        TextObject (+ TextRun, TextAlign), runsOf(text)
  boardCodec.ts   text record: x y text [extras: flags, width, rotation, style, align, runs, attach]
  textRuns.ts     plainOf(runs), normaliseRuns (merge neighbours), applyMark(runs, from, to, mark), runsEqual            (pure)
  richText.ts     runsToDoc(runs) / docToRuns(doc): TipTap JSON ⇄ runs                                                  (pure)
  textLayout.ts   layoutText(text, measure) → lines, fragments, width, height; layoutOf(text) cached by object        (pure + measurer)
  measureText.ts  the canvas measurer (and the test-friendly fallback)
  follow.ts       followChanges(before, after): shifts attached texts, clears dead attachments and dead names            (pure)
  areaName.ts     nameArea(board, borderId, name) → Change, areaNameOf(board, borderId), textChange(board, text, patch) → Change (pure)
  drawText.ts     newText(anchor, width, pen), textFromClick / textFromDrag (pure)
  pen.ts          + textPen
  useTextTool.ts  the Text tool: click, drag, edit state, notices
  TextEditorOverlay.tsx   the in-place TipTap editor over the canvas
  TextOptions.tsx, TextPenPanel.tsx, ConnectField.tsx, Notice.tsx
components/ui/editors/RichTextEditor.tsx    the reusable TipTap wrapper (toolbar-less; marks and commands exposed), also for plan 22
```

```
Text tool click / drag ─▶ useTextTool ─▶ editing state {text draft | id}
   TextEditorOverlay (TipTap) ◀── runsToDoc ── object          docToRuns ──▶ textChange / nameArea ─▶ changeObjects (one step)
canvas: paintObject(text) ─▶ layoutOf(text) (cached) ─▶ fillText per fragment (+ underline / strike lines)
move / resize / rotate / flip target ─▶ applyChange ─▶ followChanges ─▶ attached text shifts (same change)
```

## 3 — Data and file format

- **`types.ts`:**
  ```ts
  export type TextRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean; strike?: boolean; color?: string; size?: number }
  export type TextAlign = 'left' | 'center' | 'right'
  export type TextObject = Base & {
    kind: 'text'; anchor: Point; text: string; runs?: TextRun[]
    width: number; rotation: number; align: TextAlign; size: number; color: string; opacity: number
    attach?: number; isName?: boolean
  }
  ```
  `runsOf(o)` = `o.runs ?? [{ text: o.text }]`. Invariant: `text === runs.map(r => r.text).join('')`. `testing.ts` gets a `text()` builder;
  literals in tests (`boardCodec.test.ts`, `selectionButtons.test.ts`) get the new required fields (`width: 0, rotation: 0, align: 'left', size: 24, color: '#111827', opacity: 100`).
- **`boardCodec.ts`:** the text record stays `x y text`, then — **only if any extra differs from the defaults** — `flags` (bit0 width, bit1 rotation, bit2 style
  (size, colour, opacity), bit3 align, bit4 runs, bit5 attach, bit6 isName) and the pieces; runs as `count` then per run `text`, `flags` (bold, italic,
  underline, strike, has colour, has size), `[colour]`, `[size]`. Reader: extras when `r.left > 0`, else defaults. Same `VERSION`; update the header comment.
- **`textRuns.ts` (pure):** `plainOf`, `normaliseRuns` (drops empty runs, merges neighbours with equal marks), `applyMark(runs, from, to, mark)` (for the sidebar when
  no editor is open: bold the whole text, colour a range), `scaleRuns(runs, factor)`, `runsEqual`. All preserve the plain-text invariant.
- **`richText.ts` (pure):** TipTap's JSON ⇄ runs. A document is paragraphs; paragraphs join with `\n`; marks `bold`, `italic`, `underline`, `strike`,
  `textStyle { color, fontSize }`. Round-trips for any runs (empty text, only newlines, adjacent equal marks merge).

## 4 — Layout, painting, geometry

- **`textLayout.ts`:** `layoutText(text, measure)` → `{ lines: { y, height, width, fragments: { text, x, run }[] }[], width, height }`. `width === 0` means no wrapping; alignment
  offsets each line inside `max(width, widest line)`. Underline and strike are lines drawn per fragment by `render.ts`. `layoutOf(o)` caches by object (`WeakMap`).
- **`measureText.ts`:** `measure(font, text)` uses a shared offscreen canvas context; where there is none (tests, SSR) it falls back to `0.55 × size × length` so geometry is testable.
- **`render.ts`:** `paintObject` gets the text case: rotate about the box centre, for each fragment set `font` (`italic bold {size}px system-ui`) and colour (run colour or the text's)
  with `opacity`, `fillText`, then underline / strike. `paintBoard` takes the id of the text being edited and skips it (D8) and the set of areas that have a name text (their
  `border.name` label is then not painted by plan 20's `paintLabel`).
- **`bounds.ts`:** a text's bounds are its layout's box rotated by `rotation` (`shapeCorners`); replaces `TEXT_SIZE`. **`hit.ts`:** `hitPart` for text = inside the rotated box (+ tolerance).
- **`transform.ts` / `operations.ts`:** the text case per D10 (`anchor`, `rotation`, `width` or `size` and runs' sizes); `resizeTo` for a single text only changes `width` (min 20).
- **`colours.ts`:** text colour and run colours listed and recoloured.
- **`follow.ts`:** `followChanges(before, after)`: for each text with `attach` whose target object exists in both boards with different bounds, shift the text's anchor by the
  change of the target's bounds centre (whole numbers); clear `attach` (and the board link) when the target is gone; when a removed object is a name text, set its area's `name` to `''`.
  Called at the end of `applyChange` (`changes.ts`) so one `changeObjects` step contains the follow-up.
- **`areaName.ts`:** `areaNameOf(board, borderId)` → the name text or null; `nameArea(board, borderId, name)` → a `Change` that sets `border.name` and creates (centred on `labelPoint`,
  `align: 'center'`, `isName`, `attach`, board link) or updates the name text (an empty name removes it); `textChange(board, text, patch)` → the update for a text that also updates
  the area's `name` when `text.isName` (D3).

## 5 — The Text tool and the editor

- **`tools.ts`:** text `enabled: true`. **`pen.ts`:** `textPen` (`size 24`, colour, `align 'left'`, `opacity 100`) with `useTextPen`, `setTextPen`; `resetPen` resets it.
- **`useTextTool.ts`:** `begin(at, keys)` on a press with the Text tool: hit-test texts first (edit that one), else remember the start; `move` makes the drag's width; `end`: a click makes
  a text with automatic width, a drag a box with that width (`drawText.ts`); inside an unnamed area (`areaAt`) it is the **area name** (D6, plan 20's `areaAt`). Holds `editing: { id: number | null; draft: TextObject | null }`
  and `notice: string | null`. `commit(runs)` builds the change (`addObject` for a new non-empty text, `textChange`/`nameArea` for an edited one) and clears `editing`; `cancel` discards.
- **`TextEditorOverlay.tsx`:** positioned at the text's screen position, `transform: scale(view.scale) rotate(r)` with `transform-origin: top left`, font size in board units; mounts TipTap through
  `RichTextEditor` with `runsToDoc(runs)`; autofocus at the end; commits on blur and Esc; the sidebar's `TextOptions` act on the editor's selection through a small imperative handle
  (`toggleBold()`, `setColor()`, …) the overlay registers while it is open.
- **`RichTextEditor.tsx`** (`components/ui/editors/`): the TipTap `useEditor` setup, the extension list (a prop, so plan 22 can add headings, lists and images), `value` as TipTap JSON, `onChange`,
  `onBlur`, `autoFocus`, and the imperative commands. No toolbar of its own.
- **`TextOptions.tsx`:** B / I / U / S buttons (pressed state follows the selection), colour, size (number field + a few presets), align, opacity; commits one undo step for a selected text when no editor is open.
  **`ConnectField.tsx`:** the drop-down of borders, points and lines (named or "Line 3"), "None" first (D4). **`TextPenPanel.tsx`:** the Text tool's sidebar. **`Notice.tsx`:** the bottom bar (from 18's `LinkPickBar` look) for D6.
- **`BoardEditor.tsx`:** the Text tool in the pointer routing (like `useDrawTool`), the editor overlay and notice, the hidden-while-editing id passed to `paintBoard`, the sidebar value for text (`'pen'` for the Text tool),
  Enter / double-click in the Mouse tool to edit (`useMouseTool.doubleClick` calls `onEditText`), cancel on tool change. `SelectionPanel.tsx`: the `text` case (`TextOptions`, `ConnectField`).
  `ObjectHeaderRow.tsx`: for an area-name text the name field edits the text (through `nameArea`).
- **Plan 20 adjustments:** `AreaNameInput`'s save and the border modal's name field call `nameArea` instead of only `updateObject(name)`; `render.ts` skips `paintLabel`'s name when a name text exists.

## Testing

Pure modules first (vitest, as in 17a–20), with a fake measurer (`0.5 × size` per character):
- `textRuns`: normalise (merge, drop empties), `applyMark` over ranges incl. the middle of a run, plain-text invariant after every operation, `scaleRuns`.
- `richText`: round trips (multi-paragraph, marks, colour and size, adjacent equal marks, empty, only newlines).
- `textLayout`: wrapping at spaces, a long word broken by character, `\n`, automatic width (no wrap), alignment offsets, mixed sizes on one line (line height = biggest), empty text; `layoutOf` returns the same layout for the same object.
- `boardCodec`: a text with every extra round-trips; a plain text has the old bytes; a hand-made old record loads with defaults; truncated extras throw.
- `follow` / `applyChange`: moving, resizing, rotating, flipping the target shifts the text by the centre's displacement; unrelated changes don't; a removed target clears `attach` and the link; a removed name text clears the area's name; one `changeObjects` = one history step; no change when the board has no attached text (same board reference).
- `areaName`: first naming creates a centred name text + sets `border.name`; renaming updates both; empty name removes the text; `textChange` on a name text keeps both equal; undo restores both.
- `drawText`: click vs drag, minimum width, the pen's defaults, area-name decision (unnamed → name, named → ordinary).
- `bounds` / `hit` / `transform` / `operations` / `colours` for text: rotated bounds, hit inside the rotated box, rotate adds, width resize, size scaling in multi-selection, run colours.
- `pen` (`textPen`), `selectionButtons` (text: resize, rotate, duplicate, remove, link).

**Not testable here — the browser pass** (the lists of 18–20 are still open): creating by click and by drag, editing in place at several zooms and rotations, the overlay lining up with the canvas copy, no jump on
commit, bold / italic / colour / size on a selection and on a whole text, align, rotate / resize / duplicate / link, the Connect follow while moving and resizing the target, area naming (all three ways) and the notice,
undo / redo of an edit session, IME and touch, light and dark themes. Say plainly in the hand-over what was not seen. Run `npx tsc -b`, `npx vitest run`, lint and `npm run build` at the end of each stage.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | **Ask to add TipTap** (see Open items) and pick versions; add the dependencies | `app/package.json`, `package-lock.json` |
| 2 | `TextObject` fields, `TextRun`, `runsOf`; `text()` builder; fix existing literals | `types.ts`, `testing.ts`, tests |
| 3 | `textRuns.ts` (+ tests) | `textRuns.ts` |
| 4 | Codec: optional text extras, old-record test, header comment | `boardCodec.ts`, `boardCodec.test.ts` |
| 5 | `textLayout.ts`, `measureText.ts` (+ tests) | those |
| 6 | Text in `bounds`, `hit`, `transform`, `operations`, `colours`, `selectionButtons` (+ tests) | those files |
| 7 | `follow.ts` and its call from `applyChange` (+ tests) | `follow.ts`, `changes.ts` |
| 8 | `areaName.ts` (+ tests) | `areaName.ts` |
| 9 | `richText.ts` (+ tests) | `richText.ts` |
| 10 | `drawText.ts`, `textPen` in `pen.ts`, enable the Text tool | `drawText.ts`, `pen.ts`, `tools.ts`, tests |
| 11 | `render.ts`: text painting, hidden-while-editing, no duplicate area label | `render.ts` |
| 12 | `RichTextEditor` (reusable) | `components/ui/editors/RichTextEditor.tsx` |
| 13 | `TextEditorOverlay` with the imperative handle | `TextEditorOverlay.tsx` |
| 14 | `useTextTool` (click, drag, edit, area-name decision, notice) | `useTextTool.ts` |
| 15 | `TextOptions`, `ConnectField`, `TextPenPanel`, `Notice` | those files |
| 16 | Wire the editor: routing, overlay, notice, sidebar, `SelectionPanel` text case, Enter / double-click to edit | `BoardEditor.tsx`, `SelectionPanel.tsx`, `useMouseTool.ts`, `ObjectHeaderRow.tsx` |
| 17 | Plan 20 adjustments: `AreaNameInput` and the border name field use `nameArea` | `AreaNameInput.tsx`, `BoardEditor.tsx`, `ObjectHeaderRow.tsx` |
| 18 | Check: tsc, tests, lint, build; hand-over with the browser pass list | — |

Files **not** touched: `strokeCodec.ts`, `compress.ts`, `boardStore.ts` (its API covers this), the workspace / sidebar code, anything under `backend/`.
`package.json` and the lockfile **do** change (task 1), only with your approval.

## Open items

- **Approve adding TipTap** (`@tiptap/react`, `@tiptap/pm`, `@tiptap/starter-kit`, the underline and text-style extensions): needed for D1/D2, and plan 22's point modal uses it too. If you would rather not add a dependency, say so and the plan falls back to single-style text.
- **No automatic migration** of area names written before this plan (D3 deviates from "migrate on load"): they keep painting from `border.name` until edited. Say if you want a one-time conversion instead.
- **Font choice** is left out (D12). Tell me if the text editor needs a font picker.
