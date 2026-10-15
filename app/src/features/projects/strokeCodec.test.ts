import { describe, expect, it } from 'vitest'
import { decode, encode, Reader, simplify, thin, type Point } from './strokeCodec'

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

describe('thin', () => {
  const wave: Point[] = Array.from({ length: 60 }, (_, i) => ({ x: i * 5, y: Math.round(Math.sin(i / 4) * 30 + (i % 3)) }))

  it('keeps the ends, drops points on a straight stretch and keeps the corners', () => {
    expect(thin(pts([0, 0], [5, 0], [10, 0], [20, 0]))).toEqual(pts([0, 0], [20, 0]))
    expect(thin(pts([0, 0], [50, 0], [100, 0], [100, 50], [100, 100]))).toEqual(pts([0, 0], [100, 0], [100, 100]))
    expect(thin(pts([1.4, 2.6]))).toEqual(pts([1, 3]))
  })

  it('never changes what it kept as the stroke grows: a live line is the saved line', () => {
    let kept = thin(wave.slice(0, 2), 2)
    for (let n = 3; n <= wave.length; n++) {
      const next = thin(wave.slice(0, n), 2)
      // Everything but the last point of the shorter one is still there, in place
      expect(next.slice(0, kept.length - 1)).toEqual(kept.slice(0, -1))
      kept = next
    }
    expect(kept.at(-1)).toEqual(wave.at(-1))
  })

  it('stays within about the tolerance of the stroke', () => {
    expect(thin(wave, 2).length).toBeLessThan(wave.length)
  })
})
