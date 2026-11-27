# Pixel Board

A drawing board for the Map app's pixel art: buttons, book and map cards, frames, icons. Everything sits on **one grid of pixel units**:
the brush, every shape, every border and every letter land on whole units, never between them. Frontend only: no server, nothing is
sent anywhere. It works on phones and tablets as well as with a mouse.

## Assets (saved in this browser)

**Assets** (top left) is the library: every drawing, kept in this browser's local storage, with a small picture, its size and when it
changed. Open, copy or delete one, or make a new one of any size. The open drawing is saved a second after each change and before another
opens, so a reload brings everything back. It starts with the Map app's **article book card** (51 × 64 units, the app's own pixels, unit
for unit); "From the Map app" adds a fresh copy of it any time. **Open** (a `.pixel.json`) adds that file as a new asset.

## On a phone

The tools are a bar along the bottom (swipe it sideways for more), with the main colour and a ⚙ button at its end: they open a sheet over
the board with the tool's settings, the selected object and the colours. The drawing's own settings (name, size, background, grid, New,
Open) are under ⋯, and Download is **Save ▾** (with **Share both…** where the phone can share files).

- One finger draws; **two fingers** pinch to zoom and move the board (a stroke the first finger began is dropped, nothing is painted).
- The handles of a selected object are bigger for fingers.
- What Shift does with a mouse (squares, circles, straight lines, resizing that keeps proportions) is the **"like Shift"** switch in the
  tool's settings.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5174
npm test
npm run build      # a static site in dist/ (open dist/index.html through any static file server)
```

## Tools

| Key | Tool | |
|---|---|---|
| `V` | Select / move | click an object; drag it, or its 8 handles to resize in whole units (Shift: keep proportions); arrows move 1 unit (Shift: 10); Delete; Ctrl+D duplicate; `[` / `]` send back / bring forward |
| `B` | Brush | square or round, 1–16 units; Shift + click: a straight stroke from the last one |
| `E` | Eraser | the same, on the paint layer |
| `G` | Fill bucket | fills the area that looks the same colour (on the paint layer) |
| `I` | Eyedropper | or hold Alt with any tool |
| `R` | Rectangle | border colour (main), border thickness, fill (second colour); Shift: square |
| `U` | Stepped rectangle | corners cut in stairs, like the app's buttons and frames |
| `O` | Ellipse / circle | Shift: circle |
| `L` | Line | thickness in units; Shift: 0°, 45°, 90° |
| `T` | Text | built-in 5 × 7 pixel font; size 1×–4×, spacing, alignment, outline, shadow; type it in the Selection panel |

**Mirror** (in the Tool panel): left ↔ right and / or top ↔ bottom across the board's middle. With it on, the brush, the eraser, the fill and
new shapes and texts are drawn on the other side too. A selected object also has **Mirror copy ↔ / ↕**.

Other keys: Ctrl+Z / Ctrl+Shift+Z (or Ctrl+Y) undo / redo · `X` swap the two colours · `'` grid on / off · `+` / `-` zoom · `0` fit ·
Space + drag (or the middle button) pan · Ctrl + wheel zoom at the pointer · Esc deselect.

Shapes and texts stay **editable objects**. The brush, the eraser and the fill paint on the **paint layer**, which has a place in the order
like the objects (Paint layer button, then Back / Forward).

## Sending an asset to Claude

**Download → PNG + data file** gives `<name>.png` (each unit `scale × scale` pixels, transparent where nothing is) and `<name>.pixel.json`:

```json
{
  "format": "map-pixel-asset",
  "version": 1,
  "name": "book-card",
  "width": 64,
  "height": 96,
  "palette": { "a": "#140f0c", "b": "#6b1f1a" },
  "rows": ["....aaaa....", "..aabbbbaa.."],
  "drawing": { "…": "the whole drawing, so Open brings it back editable" }
}
```

Attach the `.pixel.json` (and the PNG, to look at) in the chat, and say where it goes in the Map app. `rows` has one character per unit
(`.` empty), the same form as the app's own hand-drawn sprites, so it becomes code exactly. A data file holds 62 colours at most.

The plan is in [PLAN.md](PLAN.md).
