import { describe, expect, it } from 'vitest'
import { FONTS, stackOf } from './fonts'
import { fontOf } from './textLayout'

describe('fonts', () => {
  it('falls back to the first font for none or an unknown one', () => {
    expect(stackOf(undefined)).toBe(FONTS[0].stack)
    expect(stackOf(999)).toBe(FONTS[0].stack)
    expect(stackOf(1)).toBe(FONTS[1].stack)
  })

  it('has every name once', () => {
    expect(new Set(FONTS.map((f) => f.name)).size).toBe(FONTS.length)
  })

  it('builds the CSS font: italic, weight (a bold mark is at least 700), size, family', () => {
    expect(fontOf({ weight: 300, family: 'Georgia' }, 20)).toBe('300 20px Georgia')
    expect(fontOf({ bold: true, weight: 300 }, 20)).toContain('700 20px')
    expect(fontOf({ bold: true, weight: 900, italic: true }, 20)).toMatch(/^italic 900 20px/)
    expect(fontOf({}, 20)).toBe(`400 20px ${FONTS[0].stack}`)
  })
})
