import { describe, expect, it } from 'vitest'
import { hexToHsv, hexToRgb, hsvToHex, parseHex, rgbToHex, rgbToHsv, hsvToRgb } from './colour'

describe('parseHex', () => {
  it('takes three or six digits, with or without #', () => {
    expect(parseHex('#FF8800')).toBe('#ff8800')
    expect(parseHex('f80')).toBe('#ff8800')
    expect(parseHex(' #abc ')).toBe('#aabbcc')
  })

  it('refuses anything else', () => {
    for (const bad of ['', '#12', '#12345', 'gggggg', '#1234567', 'red']) expect(parseHex(bad)).toBeNull()
  })
})

describe('rgb', () => {
  it('goes to hex and back, clamping what is out of range', () => {
    expect(rgbToHex({ r: 255, g: 136, b: 0 })).toBe('#ff8800')
    expect(hexToRgb('#ff8800')).toEqual({ r: 255, g: 136, b: 0 })
    expect(rgbToHex({ r: 300, g: -5, b: 12.6 })).toBe('#ff000d')
  })
})

describe('hsv', () => {
  it('knows the primaries', () => {
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 })
    expect(rgbToHsv({ r: 0, g: 255, b: 0 }).h).toBe(120)
    expect(rgbToHsv({ r: 0, g: 0, b: 255 }).h).toBe(240)
    expect(rgbToHsv({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, v: 0 })
    expect(rgbToHsv({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, v: 1 })
  })

  it('round-trips colours', () => {
    for (const hex of ['#ff8800', '#123456', '#abcdef', '#808080', '#000001']) expect(hsvToHex(hexToHsv(hex))).toBe(hex)
    expect(hsvToRgb({ h: 60, s: 1, v: 1 })).toEqual({ r: 255, g: 255, b: 0 })
  })
})
