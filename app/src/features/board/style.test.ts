import { describe, expect, it } from 'vitest'
import { Reader, Writer } from '../projects/strokeCodec'
import { DEFAULT_STYLE, readStyle, softnessOf, writeStyle } from './style'
import { DRAWING_WAYS, LINE_TYPES, type Style } from './types'

const roundTrip = (s: Style) => {
  const w = new Writer()
  writeStyle(w, s)
  const r = new Reader(Uint8Array.from(w.bytes))
  const back = readStyle(r)
  expect(r.left).toBe(0)
  return { back, size: w.bytes.length }
}

describe('style', () => {
  it('round-trips every line type and drawing way', () => {
    for (const type of LINE_TYPES)
      for (const way of DRAWING_WAYS) {
        const s: Style = {
          ...DEFAULT_STYLE,
          color: '#0a1b2c',
          opacity: 40,
          thickness: 9,
          type,
          gap: type === 'solid' ? 0 : 6,
          part: type === 'dashed' || type === 'diagonal' ? 12 : 0,
          way,
          amount: way === 'exact' || way === 'corners' ? 35 : 0,
        }
        expect(roundTrip(s).back).toEqual(s)
      }
  })

  it('round-trips the arrows and the zoom flag', () => {
    for (const [start, end] of [[true, false], [false, true], [true, true]]) {
      const s: Style = { ...DEFAULT_STYLE, fixedWidth: true, arrow: { start, end, style: 3, size: 14 } }
      expect(roundTrip(s).back).toEqual(s)
    }
  })

  it('round-trips the stroke and the shadow', () => {
    const s: Style = { ...DEFAULT_STYLE, stroke: { color: '#ff0000', width: 4, opacity: 60 }, shadow: { color: '#112233', blur: 8, distance: 5 } }
    expect(roundTrip(s).back).toEqual(s)
    expect(roundTrip({ ...DEFAULT_STYLE, shadow: s.shadow }).back).toEqual({ ...DEFAULT_STYLE, shadow: s.shadow })
    expect(roundTrip({ ...DEFAULT_STYLE, stroke: s.stroke }).back).toEqual({ ...DEFAULT_STYLE, stroke: s.stroke })
  })

  it('round-trips a road texture', () => {
    const s: Style = { ...DEFAULT_STYLE, road: 3 }
    expect(roundTrip(s).back).toEqual(s)
  })

  it('round-trips the softness, and reads an exact line\'s old amount as its softness', () => {
    const s: Style = { ...DEFAULT_STYLE, softness: 40 }
    expect(roundTrip(s).back).toEqual(s)
    expect(softnessOf(s)).toBe(40)
    expect(softnessOf({ ...DEFAULT_STYLE, amount: 35 })).toBe(35)
    expect(softnessOf({ ...DEFAULT_STYLE, way: 'straight', amount: 0 })).toBe(0)
    expect(softnessOf({ ...DEFAULT_STYLE, way: 'corners', amount: 45 })).toBe(0)
  })

  it('writes only what applies', () => {
    // flags, 3 colour bytes, opacity, thickness, type, way, amount
    expect(roundTrip(DEFAULT_STYLE).size).toBe(1 + 3 + 1 + 1 + 1 + 1 + 1)
    expect(roundTrip({ ...DEFAULT_STYLE, way: 'straight' }).size).toBe(1 + 3 + 1 + 1 + 1 + 1)
  })

  it('ignores the fields that do not apply', () => {
    expect(roundTrip({ ...DEFAULT_STYLE, gap: 5, part: 5, arrow: { start: false, end: false, style: 2, size: 9 } }).back).toEqual(DEFAULT_STYLE)
  })
})
