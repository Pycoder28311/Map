import { describe, expect, it } from 'vitest'
import { BORDER_WIDTHS, FONT_SIZES, LETTER_GAPS, NORMAL_ROW_GAP, PADDINGS, ROW_GAPS } from './toolbarConfig'

describe('toolbarConfig', () => {
  it('lists every paragraph value once, in order, each with its tag', () => {
    for (const list of [PADDINGS, LETTER_GAPS, ROW_GAPS, BORDER_WIDTHS]) {
      const values = list.map((v) => v.value)
      expect(values).toEqual([...values].sort((a, b) => a - b))
      expect(new Set(values).size).toBe(values.length)
      expect(list.every((v) => v.tag !== '')).toBe(true)
    }
  })

  it('has the normal values in its lists', () => {
    expect(ROW_GAPS.some((v) => v.value === NORMAL_ROW_GAP)).toBe(true)
    expect(FONT_SIZES.common.some((z) => z.size === FONT_SIZES.normal)).toBe(true)
    expect(FONT_SIZES.common[0].size).toBe(FONT_SIZES.min)
    expect(FONT_SIZES.common.at(-1)?.size).toBe(FONT_SIZES.max)
  })
})
