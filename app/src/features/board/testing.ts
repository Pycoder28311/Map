// Small builders for the board tests
import { POINT_DEFAULT } from './pointLabels'
import { DEFAULT_STYLE } from './style'
import { TEXT_DEFAULT } from './textDefaults'
import { LAYER_MAIN, type Board, type BoardObject, type BorderObject, type LineObject, type Point, type PointObject, type ShapeObject, type TextObject } from './types'

export const pts = (...xy: [number, number][]): Point[] => xy.map(([x, y]) => ({ x, y }))

export const line = (id: number, points: Point[], extra: Partial<LineObject> = {}): LineObject => ({
  id, kind: 'line', layer: LAYER_MAIN, name: '', links: [], style: DEFAULT_STYLE, points, ...extra,
})

export const border = (id: number, points: Point[], extra: Partial<BorderObject> = {}): BorderObject => ({
  id, kind: 'border', layer: LAYER_MAIN, name: '', links: [], style: DEFAULT_STYLE, fill: null, description: '', points, ...extra,
})

export const shape = (id: number, extra: Partial<ShapeObject> = {}): ShapeObject => ({
  id, kind: 'shape', layer: LAYER_MAIN, name: '', links: [], style: DEFAULT_STYLE, shape: 'rect',
  box: { x: 0, y: 0, w: 100, h: 50 }, rotation: 0, param: 0, fill: null, ...extra,
})

export const text = (id: number, extra: Partial<TextObject> = {}): TextObject => ({
  id, kind: 'text', layer: LAYER_MAIN, name: '', links: [], anchor: { x: 0, y: 0 }, text: 'Hello', ...TEXT_DEFAULT, ...extra,
})

export const boardOf = (...objects: BoardObject[]): Board => ({ nextId: Math.max(0, ...objects.map((o) => o.id)) + 1, objects })

export const point = (id: number, extra: Partial<PointObject> = {}): PointObject => ({
  id, kind: 'point', layer: LAYER_MAIN, name: '', links: [], anchor: { x: 0, y: 0 }, ...POINT_DEFAULT, ...extra,
})
