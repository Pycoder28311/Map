import { simplify } from '../projects/strokeCodec'
import { LAYER_MAIN, type LineObject, type Point, type Style } from './types'

/** A line, ready for addObject, from the points the pointer went through (simplified; one point stays a dot) */
export function lineFromStroke(stroke: Point[], style: Style, tolerance?: number): Omit<LineObject, 'id'> {
  return { kind: 'line', layer: LAYER_MAIN, name: '', links: [], style, points: simplify(stroke, tolerance) }
}
