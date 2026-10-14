// The little example lines and shapes the modal's rows show (StyleSample paints them with the board's own renderer).
// Pure (samples.test.ts).
import { autoHandles } from './bezier'
import { LAYER_MAIN, type LineObject, type Point, type ShapeObject, type ShapeType, type Style } from './types'

const base = { id: 0, layer: LAYER_MAIN, name: '', links: [] as [] }

/** What the sample looks like on a row (the sample's own colour is the theme's text colour, never the line's) */
const SAMPLE = { thickness: 3, opacity: 100 }

/** A gently curved line across a `w` × `h` row, drawn with `style`'s type (map.md: "a little curved") */
export function typeSample(style: Style, w: number, h: number): LineObject {
  const points = [{ x: 8, y: h * 0.7 }, { x: w * 0.5, y: h * 0.3 }, { x: w - 8, y: h * 0.65 }].map(round)
  return { ...base, kind: 'line', style: { ...style, ...SAMPLE, way: 'rounded', amount: 0, arrow: { start: false, end: false, style: 0, size: 0 } }, points, handles: autoHandles(points) }
}

const round = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

/** The way's example: what that way makes of the same wobbly hand movement */
export function waySample(way: Style['way'], style: Style, w: number, h: number): LineObject {
  const wobble: Point[] = Array.from({ length: 12 }, (_, i) => ({ x: 8 + ((w - 16) * i) / 11, y: h / 2 + Math.sin(i * 1.3) * h * 0.28 }))
  const common = { ...base, kind: 'line' as const, style: { ...style, ...SAMPLE, type: 'solid' as const, way, arrow: { start: false, end: false, style: 0, size: 0 } } }
  switch (way) {
    case 'exact':
      return { ...common, style: { ...common.style, amount: style.way === 'exact' ? style.amount : 0 }, points: wobble.map(round) }
    case 'rounded': {
      const points = [wobble[0], wobble[3], wobble[7], wobble[11]].map(round)
      return { ...common, style: { ...common.style, amount: 0 }, points, handles: autoHandles(points) }
    }
    case 'straight':
      return { ...common, style: { ...common.style, amount: 0 }, points: [round(wobble[0]), round(wobble[11])] }
    case 'corners':
      return { ...common, style: { ...common.style, amount: 45 }, points: [wobble[0], wobble[3], wobble[6], wobble[9], wobble[11]].map(round) }
  }
}

/** One end of a line with its arrow: `side` says which end the arrow is at (map.md: "the current line edges with arrows") */
export function armSample(side: 'start' | 'end', style: Style, w: number, h: number): LineObject {
  return {
    ...base,
    kind: 'line',
    style: { ...style, ...SAMPLE, type: 'solid', way: 'straight', amount: 0, arrow: { start: side === 'start', end: side === 'end', style: style.arrow.style, size: Math.min(style.arrow.size || 12, h * 0.8) } },
    points: [{ x: 8, y: Math.round(h / 2) }, { x: w - 8, y: Math.round(h / 2) }],
  }
}

/** A line with only an arrow head of the given style, for the head grid */
export function headSample(headStyle: number, style: Style, w: number, h: number): LineObject {
  return armSample('end', { ...style, arrow: { ...style.arrow, style: headStyle, size: Math.round(h * 0.55) } }, w, h)
}

/** A shape on a button */
export function shapeSample(shape: ShapeType, w: number, h: number, param: number): ShapeObject {
  const pad = 6
  return { ...base, kind: 'shape', shape, box: { x: pad, y: pad, w: w - 2 * pad, h: h - 2 * pad }, rotation: 0, param, fill: null, style: { ...SAMPLE_STYLE, thickness: 2 } }
}

const SAMPLE_STYLE: Style = { color: '#000000', opacity: 100, thickness: 2, fixedWidth: false, type: 'solid', gap: 0, part: 0, arrow: { start: false, end: false, style: 0, size: 0 }, way: 'exact', amount: 0 }
