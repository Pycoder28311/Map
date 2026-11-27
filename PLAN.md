# Pixel Board — a drawing board for the Map app's pixel assets

**Goal:** a small, frontend-only drawing app for making the pixel art of the Map app (the Dark Fantasy buttons, the book and map cards,
the desk props, frames, icons). Everything on the board lives on **one grid of pixel units**: the brush, every shape, every border and
every letter of text land on whole units, never between them. **Download** gives a PNG to look at and a data file with the exact grid, which
is sent to Claude and turned into the app's code with no guessing.

**Branch:** `pixel-board`. It starts empty and holds **only this app**: nothing from the Map app, no backend, no shared code. It is never
merged into `main`.

**Not in this plan:** accounts, a server, sharing between people, animation, importing pictures to trace, a layers panel.

**Status:** built (see README.md). Changes from the plan while building: items hold their colours as `#rrggbb` and the palette letters are
made only in the data file (so there is no palette to manage while drawing); **mirror drawing** added (U10).

## 0 — Decisions

### Confirmed by the user

| # | Decision |
|---|---|
| U1 | Its own branch, with only this app in it; frontend only |
| U2 | **One pixel unit for everything.** The board's size is set in units (e.g. 64 × 96); everything snaps to whole units. Zoom only changes how big it looks on screen |
| U3 | **Brush:** square and round, size 1 to 16 units |
| U4 | **Shapes:** rectangle, stepped (rounded) rectangle, ellipse / circle, line. Each has a **border colour**, a **border thickness** (in units) and an **inner (fill) colour**; a line has a colour and a thickness |
| U5 | **Text tool** with a **built-in pixel font** (letters made of units), with settings |
| U6 | Shapes and text **stay editable objects**: click to select, drag handles to **resize in whole units**, move, change their settings any time |
| U7 | **Download:** a **PNG** and a **data file** (JSON) |
| U8 | Also: **eraser**, **fill bucket**, **eyedropper**, **undo / redo**, **save in the browser** (and open a saved data file again) |
| U9 | No layers panel |
| U10 | **Mirror:** left ↔ right and / or top ↔ bottom across the board's middle, for the brush, the eraser, the fill and new shapes and texts; a selected object has Mirror copy ↔ / ↕ |

### Defaults chosen in this plan (override any of them)

| # | Default | Why |
|---|---|---|
| P1 | **Stack:** Vite + React + TypeScript, Vitest for tests, plain CSS. No UI library | The same tools as the Map app, nothing heavier |
| P2 | Default board **64 × 64 units**, any size **1 to 512** per side, changeable later (grow or crop from a chosen corner) | Big enough for a book card at full detail |
| P3 | **Export scale:** each unit becomes **4 × 4 real pixels** in the PNG by default (1 to 16 allowed). The data file is always one entry per unit | The PNG is for looking at; the data file is the truth (see §5) |
| P4 | The brush paints on **one paint layer**. It has a place in the stacking order like the objects (it starts at the bottom); **Bring forward / Send back** (`]` / `[`) moves the selected item, the paint layer included. No layers panel (U9) | Order without a panel |
| P5 | **Fill bucket** and **eyedropper** read **what is seen** (everything flattened); the bucket writes into the paint layer. The **eraser** erases the paint layer only; objects are removed by selecting them and pressing Delete | Clear rules: objects are never cut into pixels by accident |
| P6 | A **palette** of up to **62 colours** (one letter or digit each: `a`–`z`, `A`–`Z`, `0`–`9`; `.` is empty). New colours join it as they are used; an unused one can be removed | The data file writes one character per unit, like the app's sprites (`deskProps.ts`) |
| P7 | **Transparent background** by default (shown as a checkerboard); a background colour can be set | Most assets sit on something else in the app |
| P8 | **Undo / redo:** every finished action (a stroke, a move, a resize, a setting changed) is one step; up to **200** steps; Ctrl+Z, Ctrl+Shift+Z (Ctrl+Y too) | |
| P9 | **Saved in the browser** (localStorage) a second after each change; one drawing at a time, plus **Open file** for a data file and **New** (asks first) | Simple and enough for one person |
| P10 | **Pixel font:** a 5 × 7 font drawn in code (A–Z, a–z, 0–9, common punctuation, accented Latin letters later). Text settings: **size** (1×, 2×, 3×, 4×: each font pixel becomes that many units), **colour**, **letter spacing** and **line spacing** (units), **alignment**, optional **outline** (1 unit, its own colour) and **shadow** (offset in units, its own colour). Multi-line: Enter | Every letter lands on the grid at every size |
| P11 | Board colours: the dark look of the Map app (dark grey panels, light text), no theme switch | It is used next to the app |

## 1 — Risks

1. **"Same pixel unit everywhere" must hold by construction, not by care.** Every position, size, thickness and font pixel is an
   **integer number of units** in the data; screen pixels exist only when drawing (§4). Tests check that no stored value is ever fractional.
2. **The PNG's scale is not the app's unit.** The app draws its art with its own unit (2px for buttons, 3.75px for the Dashboard cards).
   Claude builds from the data file, so it does not matter what scale the PNG was saved at.
3. **Two downloads from one click:** a browser may ask once to allow several downloads. A choice in the Download menu gives one file at a time
   too (§5).
4. **Large boards** (512 × 512 = 262 144 units): flattening and drawing must stay fast. Each object is drawn into the grid only when it
   changes (cached), and only the changed area is drawn again on screen.

## 2 — Layout

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Pixel Board   [New] [Open] [Undo] [Redo]     name: book-card    64 × 96 units   [Download ▾] │  top bar
├────┬───────────────────────────────────────────────────────────────────┬─────────────────┤
│ ▢  │                                                                   │ Tool settings    │
│ ✎  │              the board: a grid of units, zoomable,                │ (brush size and  │
│ ⌫  │              with its grid lines; nothing can be                  │  shape, border,  │
│ ◍  │              drawn outside it                                     │  fill, text …)   │
│ ⊙  │                                                                   │──────────────────│
│ ▭  │                                                                   │ Selection        │
│ ▢̃  │                                                                   │ (x, y, w, h in   │
│ ◯  │                                                                   │  units; order)   │
│ ╱  │                                                                   │──────────────────│
│ T  │                                                                   │ Palette          │
├────┴───────────────────────────────────────────────────────────────────┴─────────────────┤
│ x 12  y 40 (units)   zoom 800%   grid on   2 objects                                       │  status bar
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Left:** the tools, each with its key: Select / move `V`, Brush `B`, Eraser `E`, Fill `G`, Eyedropper `I`, Rectangle `R`, Stepped rectangle
  `U`, Ellipse `O`, Line `L`, Text `T`. Space held: pan. Ctrl + wheel or `+` / `-`: zoom (whole steps only: 100%, 200% … 6400% of one
  unit = one screen pixel, so every unit is the same size on screen too). `0`: fit the board.
- **Right:** the tool's settings, then the selected object's numbers (all in units, editable), then the palette (two swatches: the
  **main** colour and the **second** colour; swap with `X`).
- The grid lines show from 400% zoom up (toggle with `'`). The board's outside is dark and can't be drawn on.

## 3 — The drawing as data (`src/model/`)

```ts
type Unit = number                       // always an integer, ≥ 0

type Drawing = {
  version: 1
  name: string
  width: Unit; height: Unit              // the board, in units
  exportScale: number                    // real pixels per unit in the PNG (integer)
  background: ColorKey | null            // null: transparent
  palette: Record<ColorKey, string>      // 'a' → '#140f0c' …  (P6)
  items: Item[]                          // bottom to top; the paint layer is one of them (P4)
}

type Item =
  | { kind: 'paint'; id: string; cells: (ColorKey | null)[] }          // width × height, row by row
  | { kind: 'rect'; id; x; y; w; h; border: Border; fill: ColorKey | null; steps: Unit }   // steps 0: square corners (U4)
  | { kind: 'ellipse'; id; x; y; w; h; border: Border; fill: ColorKey | null }
  | { kind: 'line'; id; x1; y1; x2; y2; thickness: Unit; color: ColorKey }
  | { kind: 'text'; id; x; y; text: string; size: 1 | 2 | 3 | 4; color: ColorKey; letterSpacing: Unit; lineSpacing: Unit;
      align: 'left' | 'center' | 'right'; outline: ColorKey | null; shadow: { color: ColorKey; dx: Unit; dy: Unit } | null }

type Border = { color: ColorKey; thickness: Unit }       // thickness 0: no border
```

- **One rule:** every `Unit` field is an integer. Every edit goes through one `normalize()` that rounds and clamps (to the board, to a
  minimum size of 1 unit, a border no thicker than half the shape), so no fractional value can enter the data. Tested.
- `src/model/raster/`: **pure functions** that turn each item into the units it covers, with their colours (a map of `index → ColorKey`):
  - rectangle: the border band `thickness` units wide, the fill inside;
  - stepped rectangle: each corner cut in a staircase `steps` units deep (one step per unit, like the app's buttons and frames), the border
    following the stairs;
  - ellipse: the midpoint ellipse algorithm inside its box (`w × h`, so circles and ovals), the border as the ring between the outer
    ellipse and one `thickness` units smaller;
  - line: Bresenham between the two ends, each point stamped with a square `thickness` units wide;
  - text: each letter's 5 × 7 pattern, each font pixel `size × size` units; then the outline (the units round the letters) and the shadow.
  - `flatten(drawing)`: every item's units, bottom to top, into one grid; `null` lets the one below show.
- Each item's units are cached by the item's content (a changed item is drawn again; the others are not).

## 4 — Drawing on screen (`src/board/`)

- One `<canvas>` the size of the visible area; image smoothing off. A unit is drawn as a `zoom × zoom` square of screen pixels at
  whole-pixel positions only (`zoom` is an integer), so every unit looks the same.
- Layers of the canvas: checkerboard or background → the flattened drawing → grid lines → the selection's frame and its 8 handles.
- **Pointer → unit:** `floor((pointer − boardOrigin) / zoom)`, clamped to the board. Every tool works in units; a drag between two pointer
  events fills the units between them (no gaps in a fast stroke).
- **Tools:**
  - **Brush / eraser:** square or round stamp, 1–16 units (U3), on the paint layer. Shift + click: a straight stroke from the last point.
  - **Fill:** flood fill (4 neighbours) of the area of one colour as seen, written into the paint layer (P5).
  - **Eyedropper:** the seen colour becomes the main colour (Alt held with any tool does the same).
  - **Shapes:** drag from corner to corner in units; Shift: square / circle / 45° line. The new shape takes the settings on the right
    and is selected.
  - **Text:** click to place, type; Enter: new line; Esc or a click outside ends. Double-click a text object to type in it again.
  - **Select / move:** click an object (the topmost under the pointer) to select it; drag to move (whole units); its **8 handles** resize it
    in whole units (Shift: keeps its proportions); arrows move 1 unit (Shift: 10). Delete removes; Ctrl+D duplicates (1 unit down-right);
    `]` / `[` bring forward / send back. A **text** object resizes by its **size** (the handles step 1× → 2× → 3× → 4×), so its letters stay on the
    grid. The right panel shows and edits x, y, w, h (or the line's ends), border, fill, steps and the text settings.

## 5 — Download (`src/export/`)

**Download** (top right) gives, by default, two files named after the drawing:

1. **`<name>.png`:** the flattened drawing, each unit `exportScale × exportScale` pixels (P3), transparent where nothing is.
2. **`<name>.pixel.json`:** the data file to send to Claude:

```json
{
  "format": "map-pixel-asset",
  "version": 1,
  "name": "book-card",
  "width": 64,
  "height": 96,
  "palette": { "k": "#140f0c", "a": "#6b3a1e", "b": "#b8382b" },
  "rows": [
    "....kkkkkkkk....",
    "...kaaaaaaaak..."
  ],
  "drawing": { "…": "the full Drawing (§3), so it opens again with its objects editable" }
}
```

- `rows`: one string per row, one character per unit (`.` empty), the same form as the app's hand-drawn sprites
  (`app/src/features/dashboard/deskProps.ts`, `components/ui/pixelart/sprites.ts`). This is what Claude builds from.
- The Download menu also offers **PNG only**, **Data file only**, and the PNG's scale (1–16).
- **Open** reads a `.pixel.json` back (its `drawing`), with every object editable again.

## 6 — Saving and history (`src/store/`)

- One store (`useSyncExternalStore`): the drawing, the tool and its settings, the selection, the zoom, and the history (past / future
  drawings, 200 at most, P8). Each finished action pushes one step; a stroke is one step however long.
- Saved to localStorage (`pixel-board:drawing`) a second after the last change, and read at start (P9). If the saved one can't be read, it
  starts empty and says so.

## 7 — Files

```
pixel-board (branch root)
├── PLAN.md                 this plan
├── README.md               what it is, how to run it, how to send an asset to Claude
├── package.json, vite.config.ts, tsconfig.json, index.html
└── src/
    ├── main.tsx, App.tsx, styles.css
    ├── model/              types.ts, normalize.ts, palette.ts, raster/{rect,stepped,ellipse,line,text,paint,flatten}.ts, font5x7.ts (+ tests)
    ├── board/              Board.tsx (canvas), view.ts (zoom, pan, pointer → unit), tools/{brush,eraser,fill,eyedropper,shape,text,select}.ts
    ├── panels/             Toolbar.tsx, TopBar.tsx, ToolSettings.tsx, SelectionPanel.tsx, Palette.tsx, StatusBar.tsx
    ├── store/              store.ts, history.ts, persist.ts
    └── export/             png.ts, dataFile.ts, open.ts (+ tests)
```

## 8 — Tests (Vitest, no browser needed for the model)

- `normalize`: no fractional or negative value survives; shapes stay inside the board and at least 1 unit; borders no thicker than half.
- Each raster: exact unit maps for small cases (a 5 × 3 rectangle with a 1-unit border; a stepped rectangle with 2 steps; a 7 × 7 circle;
  a diagonal line 2 units thick; "Hi" at 2× with an outline).
- `flatten`: order, transparency, the paint layer between objects.
- Fill, eyedropper, eraser on small boards.
- Export: `rows` and `palette` from a drawing; the PNG's size is `width × exportScale` by `height × exportScale`; a data file opens back
  to the same drawing.
- History: undo / redo of a stroke, a move, a resize, a setting.

## 9 — How to run it (README)

```
npm install
npm run dev        # http://localhost:5173
npm test
npm run build      # a static site in dist/ (can be put on any static host later)
```

**Sending an asset to Claude:** Download (both files), then attach the `.pixel.json` (and the PNG, to look at) in the chat with where it goes in
the Map app ("this is the book card's frame").

## Task list

| # | Task |
|---|---|
| 1 | Empty branch `pixel-board`; Vite + React + TS + Vitest; README |
| 2 | Model: types, `normalize`, palette + tests |
| 3 | Rasters: rectangle, stepped rectangle, ellipse, line, paint, `flatten` + tests |
| 4 | Pixel font 5 × 7 and the text raster (size, spacing, alignment, outline, shadow) + tests |
| 5 | Store, history (undo / redo), saving in the browser |
| 6 | Board canvas: zoom in whole steps, pan, grid lines, pointer → unit |
| 7 | Tools: brush (square / round, 1–16), eraser, fill, eyedropper |
| 8 | Tools: the four shapes; select, move, 8-handle resize, order, delete, duplicate |
| 9 | Text tool: place, type, edit; its settings |
| 10 | Panels: top bar, toolbar, tool settings, selection numbers, palette, status bar |
| 11 | Download (PNG + data file, the menu's choices), Open, New |
| 12 | All checks; screenshots of a stepped-rectangle button and a book card drawn with it |

## Open items

1. P1–P11 are defaults: say which to change.
2. Should it later be put online (a static site) so it can be opened without running it? Not in this plan.
3. ~~Mirror option~~: added (U10).
