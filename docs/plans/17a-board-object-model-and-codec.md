# 17a — Board object model, codec and store (no new UI)

**Goal:** one model for everything drawn on a map: a **board** of typed objects (`line`, `border`, `shape`, plus
minimal `text` and `point`, with `image` reserved). Lines and borders keep **exactly today's geometry and
storage** (simplified whole-number points, delta + zigzag varints, brotli) and gain a header with id, name, layer,
links and **all the style fields from `docs/ideas/map.md`**. A versioned binary codec reads and writes the board, an
in-memory store holds one board per map, and `MapPanel`'s pencil now makes `line` objects. Nothing looks different.

**Depends on:** `strokeCodec.ts` / `compress.ts` (reused), the mock-store pattern of `mocks/projectsStore.ts`.
**Blocks:** 17b (editor shell), 18 (selection box), 19 (lines and shapes), 20 (borders), 21 (text), 22 (points),
23 (map-level features). Every later plan builds on the types and the codec defined here.

**Frontend only.** No backend, database, API or `packages/shared` change. The store is in memory, like every
other mock; swapping it for the API later does not touch the model or the codec.

## 0 — Decisions

| # | Decision | Source |
|---|---|---|
| D1 | `line` and `border` are **separate kinds** that share one path record and one style record; a border is a closed path, a line an open one | User |
| D2 | `shape` is its own kind, stored as **parameters** (type, box, rotation), not as a path | User |
| D3 | `image` (board background, much later) only gets a **reserved kind number** and the locked background layer; no type, no codec yet | User |
| D4 | Scope: **minimal rewire**: `MapPanel`'s pencil creates `line` objects in the new store; its own `drawings` map is removed. Same look and behaviour | User |
| D5 | **In memory only**, per page load, same as the other mocks. No localStorage | User |
| D6 | `line`, `border`, `shape`: types and codec complete. `text`, `point`: types plus a **minimal record** (id, anchor, name/text) that plans 21 and 22 extend with a version bump | User |
| D7 | The style record carries **every field of map.md** now (colour, opacity, thickness, same-width-on-zoom, line type with gap/part, arrows, drawing way with softness / corner degrees), so plans 19 and 20 only add UI | User |
| D8 | New code lives in **`app/src/features/board/`**. `features/projects/strokeCodec.ts` keeps `simplify`, `Point` and the path encoding; `MapPanel` stays where it is | Default |
| D9 | Ids are **small integers per map** (`nextId` is in the file header). Links to sidebar objects are the sidebar's string ids, links to other board objects are integers | Default |
| D10 | **No stored transform** on lines and borders: rotating, flipping or resizing (plan 18) rewrites their points, like today's strokes. Only `shape` stores a rotation | Default |
| D11 | **Layers:** `layer` is a number on every object. `0` = background (locked, will hold `image`), `1` = the drawing layer (default). Draw order = layer, then position in the list (later = on top) | Default |
| D12 | Every record in the file is `[kind][byte length][body]`, so a reader **skips kinds it does not know** (older app, newer file, or the reserved `image`) | Default |
| D13 | File format version byte is `1`. An unknown version throws `UnsupportedBoardVersion`, a truncated file throws `RangeError`; neither loops or returns garbage | Default |
| D14 | **No file migration.** Nothing was ever saved (`toFile` is only used by its test), so there is no old file to read. The old `encode` / `decode` stay as the path codec's tested core | Default |
| D15 | The store is **immutable** (every change makes a new board object), so undo/redo in 17b can keep snapshots | Default |

## 1 — Risks

1. **`Reader.int()` has no bounds check.** On a truncated or corrupt file it reads `undefined`, `undefined < 128`
   is false, and the loop never ends. Fine for today's own output, not for a real file format. This plan adds a
   bound check (throws `RangeError`) and a sanity limit on counts (a count larger than the bytes left is an error).
2. **The path code is shared.** Moving it out of `encode` / `decode` must not change a byte. The three existing
   tests in `strokeCodec.test.ts` (round trip, 1-vs-2-byte jumps, the 15-byte example) are the guard; they stay
   unchanged and must pass.
3. **`MapPanel.tsx` has uncommitted edits** in the working tree (git status). The rewire is a small edit to the
   same file; read the current version first and keep its other changes.
4. **Style fields for later UI.** If plans 19/20 need a field not listed here, it is a version bump (`2`) with a
   reader for `1`. Listing every map.md field now is how this plan makes that unlikely.
5. **Border "shape" mode** (draw a shape, it becomes a border) needs no field: the result is a closed path.

## 2 — Approach

```
features/projects/strokeCodec.ts   export Writer, Reader (+ str(), bounds checks); writePath / readPath extracted
                                   from encode / decode; encode / decode now call them (bytes unchanged)
features/board/
  types.ts          Board, BoardObject (union), Style, Link, Handle, LAYER_*, KIND numbers
  style.ts (+test)  DEFAULT_STYLE, PENCIL_STYLE, writeStyle / readStyle
  boardCodec.ts (+test)   encodeBoard / decodeBoard (bytes, before brotli)
  layers.ts (+test)       drawOrder(board), isBackground
  boardStore.ts (+test)   per-map boards: get / use / add / update / remove / move; resetBoards (tests)
  paths.ts (+test)        lineFromStroke(points, style): simplify + make a `line` draft
features/projects/compress.ts      boardToFile(board) / boardFromFile(blob), brotli as today
features/projects/MapPanel.tsx     pencil → addObject('line'); paints the board's lines and borders
```

```
pointer up → simplify (as today) → addObject(mapId, line draft) → boardStore (immutable) → useBoard → repaint
                                                         save later: encodeBoard → brotli → file
```

## 3 — Types (`features/board/types.ts`)

```ts
type Layer = number                       // LAYER_BACKGROUND = 0, LAYER_MAIN = 1
type Link = { to: 'sidebar'; id: string } | { to: 'board'; id: number }

type Style = {
  color: string                           // '#rrggbb'
  opacity: number                         // 0–100
  thickness: number                       // whole board units
  fixedWidth: boolean                     // "same width as I zoom"
  type: 'solid' | 'dashed' | 'double' | 'diagonal'
  gap: number; part: number               // dashed, diagonal (gap only for double); ignored for solid
  arrow: { start: boolean; end: boolean; style: number; size: number }
  way: 'exact' | 'rounded' | 'straight' | 'corners'   // map.md's "drawing way"
  amount: number                          // exact: softness 0–100; corners: degrees; others: 0
}

type Handle = { inX: number; inY: number; outX: number; outY: number }   // offsets from the point (Figma vectors)
type Path = { points: Point[]; handles?: Handle[] }                      // handles: same length as points

type Base = { id: number; layer: Layer; name: string; links: Link[] }
type LineObject   = Base & { kind: 'line';   style: Style } & Path
type BorderObject = Base & { kind: 'border'; style: Style } & Path       // always closed
type ShapeObject  = Base & { kind: 'shape';  style: Style; shape: ShapeType; box: { x, y, w, h: number }
                             rotation: number; param: number; fill: { color: string; opacity: number } | null }
type TextObject   = Base & { kind: 'text';  anchor: Point; text: string }          // minimal (plan 21)
type PointObject  = Base & { kind: 'point'; anchor: Point }                        // minimal (plan 22)
type BoardObject = LineObject | BorderObject | ShapeObject | TextObject | PointObject
type Board = { nextId: number; objects: BoardObject[] }
```

`ShapeType` is a string union of the first set (`rect`, `roundRect`, `ellipse`, `triangle`, `rightTriangle`,
`diamond`, `pentagon`, `hexagon`, `star`, `arrow`, `heart`); its byte value is the index in a `SHAPE_TYPES` array,
so plan 19 can append more without a version bump. `param` is the shape's one number (corner radius, star points).
Reserved kind numbers: `line 1, border 2, shape 3, text 4, point 5, image 6 (reserved)`.

## 4 — File format (`features/board/boardCodec.ts`)

```
file     := version(1) nextId count record*           (all numbers: zigzag varint, as strokeCodec)
record   := kind  byteLength  body
body     := id layer name(str) linkCount link*  <kind part>
link     := 0 id(str) | 1 id(int)
line/border part := style path
path     := flags(bit0 = has handles) pointCount-1 firstX firstY xDeltas yDeltas [handles]
            (the existing strokeCodec layout; a single point has 0 deltas; handles: 4 varints per point)
style    := flags(bit0 fixedWidth, bit1 arrow start, bit2 arrow end) r g b opacity thickness
            type [gap part | gap]  [arrowStyle arrowSize]  way [amount]
shape part := style shapeType x y w h rotation param fillFlag [r g b opacity]
text part  := x y text(str)        point part := x y
```

- `str` = byte length varint + UTF-8 (new `Writer.str` / `Reader.str` using `TextEncoder` / `TextDecoder`).
- Optional parts (`gap/part`, arrow fields, `amount`, handles, fill) are written only when they apply, so a
  plain pencil line costs the old path size plus about 15 bytes of header.
- `decodeBoard` reads `byteLength` first and parses each body from its own slice: an unknown kind is skipped, and
  a body that over- or under-reads is an error, not silent corruption.
- `strokeCodec.ts`: `Writer` / `Reader` exported; `Reader.int()` throws `RangeError('Unexpected end of data')` past
  the end; `writePath(w, points)` / `readPath(r)` hold the current per-stroke code; `encode` / `decode` call them.
- `compress.ts`: `boardToFile(board): Promise<Blob>` and `boardFromFile(blob): Promise<Board>` (brotli quality 11
  as today; reading uses `brotli.decompress`, which the test already does). `toFile(strokes)` is replaced by
  `boardToFile`; only its test used it.

## 5 — Style and layers

- `style.ts`: `DEFAULT_STYLE` (`#1f2937`, opacity 100, thickness 3, `fixedWidth` false, `solid`, no arrows,
  `exact`, amount 0) and `PENCIL_STYLE = DEFAULT_STYLE` (today's `PENCIL = { color: '#1f2937', width: 3 }`).
  `writeStyle(w, style)` / `readStyle(r)`. `exact` with amount 0 is today's rendering.
- `layers.ts`: `LAYER_BACKGROUND`, `LAYER_MAIN`, `drawOrder(board)` (stable sort by layer, keeps list order inside
  a layer), `canSelect(object)` (false on the background layer, used by plan 18).

## 6 — Store (`features/board/boardStore.ts`)

Same `useSyncExternalStore` pattern as `projectsStore.ts` / `selectStore.ts`; header comment says MOCK, in memory,
replaced by API calls later.

| Function | Does |
|---|---|
| `getBoard(mapId)` | the board, or one shared frozen empty board (stable reference, so the hook never loops) |
| `useBoard(mapId)` | hook over `getBoard` |
| `addObject(mapId, draft, at?)` | takes the object without `id`, assigns `nextId++`, default layer `LAYER_MAIN`, appends (or inserts at `at`); returns the id |
| `updateObject(mapId, id, patch)` | merges a patch of the object's own fields (not `id` / `kind`); unknown id → no-op |
| `removeObject(mapId, id)` | removes it and any `links` of other objects that pointed to it |
| `moveObject(mapId, id, toIndex)` | z-order inside the list |
| `resetBoards()` | tests only |

All return new arrays/objects; listeners are told once per change. Objects can only join layer `0` if they are
`image` (not in the union yet, so nothing can today): enforced by a one-line check that plan "images" removes.

## 7 — `MapPanel` rewire (`features/projects/MapPanel.tsx`)

- Remove the module-level `drawings` map and the `PENCIL` constant. Keep `WIDTH`, `HEIGHT`, `TOLERANCE`.
- `onDown` / `onMove` still grow `stroke.current` and draw each segment live (unchanged).
- `endStroke`: `addObject(mapId, lineFromStroke(stroke.current, PENCIL_STYLE))` where `lineFromStroke` calls
  `simplify(points, TOLERANCE)`. The store notification repaints (`useBoard(mapId)` in the effect's deps), so the
  jagged live stroke is replaced by the simplified one, as today.
- `drawStroke(ctx, points, style)`: colour, `globalAlpha = opacity/100`, `lineWidth = thickness`. `paint` loops
  `drawOrder(board)` and draws `line` and `border` paths (border closed); other kinds are skipped until their plans.
  Only `solid` + `exact` is rendered here; the other types and ways are 19's and 20's.
- `lineFromStroke` is in `board/paths.ts` (pure, tested), not in the component.

## Testing

Unit tests, vitest (`npm test` in `app/`), same style as `strokeCodec.test.ts`. No network, no backend.

- **strokeCodec (existing, unchanged):** all three tests still pass after extracting `writePath` / `readPath`.
  New: `Reader` throws `RangeError` on a truncated file and on a count larger than the bytes left.
- **style:** round trip of every `type`, `way`, arrow combination, both `fixedWidth` values; optional parts absent
  for `solid` / no arrows; defaults.
- **boardCodec:** round trip each kind (line, border, shape with and without fill, text, point); negatives and big
  jumps; handles on and off; non-ASCII `name` and `text`; both link kinds; empty board; `nextId` kept.
  A record of unknown kind (built by hand) is skipped and the others still decode; a wrong version throws
  `UnsupportedBoardVersion`; a truncated board throws. **Size:** the 6-point example from `strokeCodec.test.ts` as
  a default `line` is at most `16 + 20` bytes before brotli.
- **layers:** `drawOrder` is by layer, then list order; stable; `canSelect` false on the background layer.
- **boardStore:** add (ids increase, layer default), update (merge, unknown id no-op, `id` / `kind` ignored),
  remove (also drops links to it), move, per-map isolation, listeners notified once per change, an old snapshot is
  not mutated, `getBoard` of a new map returns the same empty board each time.
- **paths:** `lineFromStroke` simplifies, keeps ends, one point stays one point (a dot).
- **compress:** `boardToFile` then `boardFromFile` returns an equal board.
- **Manual (`npm run dev` in `app/`):** open a map, draw a few strokes (same look, width and colour as before),
  leave the map and come back (strokes are still there), reload (they are gone, as today). `npm run build` and
  `npm run lint` pass.
- Limits: nothing external is called; brotli-wasm runs in the Node test as in `compress.test.ts`.

## Task list

| # | Task | Files |
|---|---|---|
| 1 | Export `Writer` / `Reader`, add `str()` and bounds checks; extract `writePath` / `readPath`; existing tests stay green; add truncation tests | `features/projects/strokeCodec.ts`, `strokeCodec.test.ts` |
| 2 | Types and constants | `features/board/types.ts` |
| 3 | Style defaults, `writeStyle` / `readStyle` + test | `features/board/style.ts`, `style.test.ts` |
| 4 | Layers helpers + test | `features/board/layers.ts`, `layers.test.ts` |
| 5 | `encodeBoard` / `decodeBoard` (all kinds, skipping, version) + test | `features/board/boardCodec.ts`, `boardCodec.test.ts` |
| 6 | `lineFromStroke` + test | `features/board/paths.ts`, `paths.test.ts` |
| 7 | Board store + test | `features/board/boardStore.ts`, `boardStore.test.ts` |
| 8 | `boardToFile` / `boardFromFile`; update its test | `features/projects/compress.ts`, `compress.test.ts` |
| 9 | Rewire `MapPanel` to the store (read its uncommitted version first) | `features/projects/MapPanel.tsx` |
| 10 | Manual pass, `npm test`, `npm run lint`, `npm run build` | — |

Files **not** touched: `backend/`, `packages/shared/`, `app/src-tauri/`, `mocks/` (the board store is its own),
`routes/`, `panels.ts`, the sidebar, the dashboard and its cards, `src/styles/*`, `package.json` (no new packages).

## Open items

- None blocking. For later plans: whether text/point content lives in the board file or in the sidebar's notes
  (plans 21 and 22 decide; the `links` field and the version byte allow either).
