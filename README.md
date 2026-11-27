# Pixel Board

A drawing board for the Map app's pixel art: buttons, book and map cards, frames, icons. Everything sits on **one grid of pixel units**:
the brush, every shape, every border and every letter land on whole units, never between them. Frontend only: no server, nothing is
sent anywhere; the drawing is kept in this browser.

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
