import { describe, expect, it } from 'vitest'
import { decode, encode, Reader, simplify, type Point } from './strokeCodec'

const pts = (...xy: [number, number][]): Point[] => xy.map(([x, y]) => ({ x, y }))

describe('simplify', () => {
  it('drops points on a straight line, keeps the ends', () => {
    expect(simplify(pts([0, 0], [5, 0], [10, 0], [20, 0]))).toEqual(pts([0, 0], [20, 0]))
  })

  it('keeps a corner', () => {
    expect(simplify(pts([0, 0], [10, 0], [10, 10]))).toEqual(pts([0, 0], [10, 0], [10, 10]))
  })

  it('rounds to whole numbers and leaves a dot alone', () => {
    expect(simplify(pts([1.4, 2.6]))).toEqual(pts([1, 3]))
  })

  it('handles a long stroke', () => {
    const long = Array.from({ length: 50000 }, (_, i) => ({ x: i % 1000, y: Math.round(Math.sin(i / 50) * 100) }))
    expect(simplify(long).length).toBeLessThan(long.length)
  })
})

describe('encode / decode', () => {
  it('round-trips, including big jumps and negatives', () => {
    const strokes = [pts([120, 80], [124, 83], [131, 85], [139, 84], [150, 90], [150, 100]), pts([5, 5]), pts([0, 0], [1500, 900], [-3, 2])]
    expect(decode(encode(strokes))).toEqual(strokes)
  })

  it('writes a big jump in 2 bytes and a small one in 1', () => {
    // stroke count, difference count, first x (0), first y (0), x difference 1500 (2 bytes), y difference 0
    expect(encode([pts([0, 0], [1500, 0])]).length).toBe(1 + 1 + 1 + 1 + 2 + 1)
    expect(encode([pts([0, 0], [-64, 63])]).length).toBe(1 + 1 + 1 + 1 + 1 + 1)
  })

  it('is the 15 bytes of the example for a small stroke (plus the stroke count)', () => {
    const stroke = pts([120, 80], [124, 83], [131, 85], [139, 84], [150, 90], [150, 100])
    expect(encode([stroke]).length).toBe(1 + 15)
  })
})

describe('Reader', () => {
  it('throws on a truncated file instead of looping', () => {
    const bytes = encode([pts([120, 80], [124, 83], [131, 85])])
    expect(() => decode(bytes.subarray(0, bytes.length - 1))).toThrow(RangeError)
    expect(() => new Reader(new Uint8Array([200])).int()).toThrow(RangeError)
  })

  it('throws on a count larger than the bytes left', () => {
    expect(() => decode(Uint8Array.from([100]))).toThrow(RangeError)
  })
})
