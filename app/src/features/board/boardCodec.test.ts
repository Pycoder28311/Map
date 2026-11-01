import { POINT_DEFAULT } from './pointLabels'
import { describe, expect, it } from 'vitest'
import { Writer, encode } from '../projects/strokeCodec'
import { decodeBoard, encodeBoard, UnsupportedBoardVersion } from './boardCodec'
import { DEFAULT_STYLE } from './style'
import { TEXT_DEFAULT } from './textDefaults'
import { LAYER_MAIN, type Board, type BoardObject, type Style } from './types'

const base = { layer: LAYER_MAIN, name: '', links: [] }
const pts = (...xy: [number, number][]) => xy.map(([x, y]) => ({ x, y }))
const roundTrip = (board: Board) => decodeBoard(encodeBoard(board))

const fancy: Style = { ...DEFAULT_STYLE, color: '#ff8800', opacity: 60, type: 'dashed', gap: 8, part: 14, arrow: { start: false, end: true, style: 2, size: 12 }, way: 'corners', amount: 45 }

describe('encodeBoard / decodeBoard', () => {
  it('round-trips an empty board and keeps nextId', () => {
    expect(roundTrip({ nextId: 1, objects: [] })).toEqual({ nextId: 1, objects: [] })
    expect(roundTrip({ nextId: 40, objects: [] }).nextId).toBe(40)
  })

  it('round-trips every kind', () => {
    const objects: BoardObject[] = [
      { ...base, id: 1, kind: 'line', style: fancy, points: pts([120, 80], [124, 83], [-131, 85], [1500, 900]) },
      { ...base, id: 2, kind: 'border', name: 'Ελλάδα', style: DEFAULT_STYLE, fill: null, description: '', points: pts([0, 0], [100, 0], [100, 100]) },
      { ...base, id: 3, kind: 'shape', style: DEFAULT_STYLE, shape: 'star', box: { x: -5, y: 10, w: 300, h: 200 }, rotation: 45, param: 5, fill: { color: '#112233', opacity: 30 } },
      { ...base, id: 4, kind: 'shape', style: DEFAULT_STYLE, shape: 'rect', box: { x: 0, y: 0, w: 1, h: 1 }, rotation: 0, param: 0, fill: null },
      { ...base, id: 5, kind: 'text', anchor: { x: 7, y: -8 }, text: 'Hello ☃ κόσμε', ...TEXT_DEFAULT },
      { ...base, id: 6, kind: 'point', anchor: { x: 700, y: 400 }, ...POINT_DEFAULT },
    ]
    expect(roundTrip({ nextId: 7, objects })).toEqual({ nextId: 7, objects })
  })

  it('keeps handles, layers and both kinds of links', () => {
    const line: BoardObject = {
      ...base,
      id: 2,
      layer: 3,
      kind: 'line',
      style: DEFAULT_STYLE,
      points: pts([0, 0], [50, 40]),
      handles: [{ inX: -5, inY: 0, outX: 5, outY: 0 }, { inX: -3, inY: 2, outX: 9, outY: -9 }],
      links: [{ to: 'sidebar', id: 'n101' }, { to: 'board', id: 1 }],
    }
    expect(roundTrip({ nextId: 3, objects: [line] }).objects).toEqual([line])
  })

  it('skips a kind it does not know, and the others still read', () => {
    const w = new Writer()
    w.byte(2)
    w.int(3)
    w.int(0)
    w.int(2)
    // an image (reserved kind 6) with a body of 4 bytes
    w.byte(6)
    w.int(4)
    w.raw([1, 2, 3, 4])
    const point: BoardObject = { ...base, id: 2, kind: 'point', anchor: { x: 1, y: 2 }, ...POINT_DEFAULT }
    const known = encodeBoard({ nextId: 3, objects: [point] })
    // the point's record: after version, nextId, the header's extras length, count
    w.raw(known.subarray(4))
    expect(decodeBoard(Uint8Array.from(w.bytes))).toEqual({ nextId: 3, objects: [point] })
  })

  it('round-trips a point with every field, and a plain point keeps the old bytes', () => {
    const full: BoardObject = { ...base, id: 1, kind: 'point', anchor: { x: -5, y: 9 }, label: 'nature', icon: 'water', color: '#0284c7', description: '{"type":"doc"}' }
    expect(roundTrip({ nextId: 2, objects: [full] }).objects[0]).toEqual(full)
    const plain: BoardObject = { ...base, id: 1, kind: 'point', anchor: { x: 1, y: 2 }, ...POINT_DEFAULT }
    const a = encodeBoard({ nextId: 2, objects: [plain] })
    const b = encodeBoard({ nextId: 2, objects: [{ ...plain, label: 'city' }] })
    expect(b.length).toBe(a.length + 2)
    expect(roundTrip({ nextId: 2, objects: [plain] }).objects[0]).toEqual(plain)
  })

  it('keeps a point\'s info box (the article\'s own kind of rows); a damaged one is left out', () => {
    const plain: BoardObject = { ...base, id: 1, kind: 'point', anchor: { x: 1, y: 2 }, ...POINT_DEFAULT }
    const box = { image: null, banner: null, name: '', rows: [{ id: 'a', label: 'Population', kind: 'value' as const, value: '1M' }] }
    const withBox: BoardObject = { ...plain, label: 'city', infobox: box }
    expect(roundTrip({ nextId: 2, objects: [withBox] }).objects[0]).toEqual(withBox)
    // A point without one keeps the bytes it had
    expect(encodeBoard({ nextId: 2, objects: [plain] }).length).toBeLessThan(encodeBoard({ nextId: 2, objects: [withBox] }).length)
    const damaged = { ...plain, infobox: { rows: 'x' } as never }
    expect(roundTrip({ nextId: 2, objects: [damaged] }).objects[0]).toEqual(plain)
  })

  it('version 2: keeps locked, hidden and what a node is (ref); skips header extras it does not know (docs/plans/38)', () => {
    const point: BoardObject = { ...base, id: 1, kind: 'point', anchor: { x: 1, y: 2 }, ...POINT_DEFAULT, locked: true, hidden: true, ref: { type: 'objectCards', id: 42 } }
    expect(roundTrip({ nextId: 2, objects: [point] }).objects[0]).toEqual(point)
    const bytes = encodeBoard({ nextId: 2, objects: [point] })
    const w = new Writer()
    w.byte(2)
    w.int(2)
    // three bytes of a header field to come
    w.int(3)
    w.raw([7, 7, 7])
    w.raw(bytes.subarray(3))
    expect(decodeBoard(Uint8Array.from(w.bytes)).objects).toEqual([point])
  })

  it('still reads a version 1 file (no node flags)', () => {
    const body = new Writer()
    body.int(4)
    body.int(1)
    body.str('Old')
    body.int(0)
    body.int(10)
    body.int(-20)
    const w = new Writer()
    w.byte(1)
    w.int(5)
    w.int(1)
    w.byte(5)
    w.int(body.bytes.length)
    w.raw(body.bytes)
    expect(decodeBoard(Uint8Array.from(w.bytes))).toEqual({ nextId: 5, objects: [{ id: 4, layer: 1, name: 'Old', links: [], kind: 'point', anchor: { x: 10, y: -20 }, ...POINT_DEFAULT }] })
  })

  it('throws on another version and on truncated files', () => {
    expect(() => decodeBoard(Uint8Array.from([9, 1, 0]))).toThrow(UnsupportedBoardVersion)
    const bytes = encodeBoard({ nextId: 2, objects: [{ ...base, id: 1, kind: 'line', style: fancy, points: pts([0, 0], [9, 9]) }] })
    for (let n = 0; n < bytes.length; n++) expect(() => decodeBoard(bytes.subarray(0, n))).toThrow()
  })

  it('is a few bytes more than the plain stroke', () => {
    const stroke = pts([120, 80], [124, 83], [131, 85], [139, 84], [150, 90], [150, 100])
    const line: BoardObject = { ...base, id: 1, kind: 'line', style: DEFAULT_STYLE, points: stroke }
    expect(encodeBoard({ nextId: 2, objects: [line] }).length).toBeLessThanOrEqual(encode([stroke]).length + 22)
  })
})

describe('areas (borders with extras)', () => {
  const plain: BoardObject = { ...base, id: 1, kind: 'border', style: DEFAULT_STYLE, fill: null, description: '', points: pts([0, 0], [100, 0], [100, 100]) }

  it('round-trips a fill with a texture and a picture', () => {
    const area: BoardObject = { ...plain, fill: { color: '#336699', opacity: 40, texture: 3, image: 'img7' } }
    expect(decodeBoard(encodeBoard({ nextId: 2, objects: [area] })).objects[0]).toEqual(area)
  })

  it('round-trips a fill, a description and colour runs', () => {
    const area: BoardObject = { ...plain, name: 'Αττική', fill: { color: '#336699', opacity: 25 }, description: 'The region ☀', edges: [{ from: 0, color: '#ff0000' }, { from: 2, color: '#00ff00' }] }
    expect(roundTrip({ nextId: 2, objects: [area] }).objects).toEqual([area])
  })

  it('a border with no extras takes no more bytes than before areas', () => {
    const withFill = encodeBoard({ nextId: 2, objects: [{ ...plain, fill: { color: '#336699', opacity: 25 } }] })
    const without = encodeBoard({ nextId: 2, objects: [plain] })
    expect(withFill.length).toBe(without.length + 1 + 4)
    expect(roundTrip({ nextId: 2, objects: [plain] }).objects).toEqual([plain])
  })

  it('reads a border record that ends after its path (an old file)', () => {
    // The plain border's bytes are exactly that
    expect(decodeBoard(encodeBoard({ nextId: 2, objects: [plain] })).objects[0]).toMatchObject({ fill: null, description: '' })
  })

  it('throws on a truncated extra', () => {
    const bytes = encodeBoard({ nextId: 2, objects: [{ ...plain, description: 'abc' }] })
    expect(() => decodeBoard(bytes.subarray(0, bytes.length - 1))).toThrow(RangeError)
  })
})

describe('text extras', () => {
  const plain: BoardObject = { ...base, id: 1, kind: 'text', anchor: { x: 10, y: 20 }, text: 'Hello', ...TEXT_DEFAULT }

  it('a plain text takes no more bytes than before text had a style', () => {
    const bytes = encodeBoard({ nextId: 2, objects: [plain] })
    // header 4, kind 1, length 1, id 1, layer 1, name 1, links 1, node flags 1, x 1, y 1, text 1 + 5
    expect(bytes.length).toBe(4 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 1 + 5)
    expect(roundTrip({ nextId: 2, objects: [plain] }).objects).toEqual([plain])
  })

  it('round-trips every extra, with the plain text made again from the runs', () => {
    const rich: BoardObject = {
      ...plain,
      text: 'Hello world',
      runs: [{ text: 'Hello ', bold: true }, { text: 'world', italic: true, underline: true, strike: true, color: '#ff0000', size: 40 }],
      width: 200,
      rotation: 30,
      align: 'center',
      size: 30,
      color: '#112233',
      opacity: 60,
      attach: 7,
      isName: true,
      fixedSize: true,
      font: 3,
      weight: 600,
      italic: true,
      underline: true,
      strike: true,
      oblique: true,
      underlineColor: '#ff0000',
      strikeColor: '#00aa00',
      strokeColor: '#112233',
      strokeWidth: 3,
      strokeOpacity: 60,
      shadowColor: '#445566',
      shadowBlur: 4,
      shadowDistance: 2,
      shadowY: -3,
      curve: -40,
      spacing: 2,
      boxed: true,
      boxShape: 'corners',
      lineGap: 5,
      boxColor: '#0000ff',
    }
    expect(roundTrip({ nextId: 2, objects: [rich] }).objects).toEqual([rich])
  })

  it('throws on a truncated extra', () => {
    const bytes = encodeBoard({ nextId: 2, objects: [{ ...plain, rotation: 30, width: 100 }] })
    expect(() => decodeBoard(bytes.subarray(0, bytes.length - 1))).toThrow(RangeError)
  })
})
