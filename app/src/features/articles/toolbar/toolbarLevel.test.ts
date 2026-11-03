import { describe, expect, it } from 'vitest'
import { LEVEL_WIDTHS, toolbarLevel } from './toolbarLevel'

describe('toolbarLevel', () => {
  it('steps down as the bar narrows', () => {
    expect(toolbarLevel(1400)).toBe(0)
    expect(toolbarLevel(LEVEL_WIDTHS.full)).toBe(0)
    expect(toolbarLevel(LEVEL_WIDTHS.full - 1)).toBe(1)
    expect(toolbarLevel(LEVEL_WIDTHS.one)).toBe(1)
    expect(toolbarLevel(LEVEL_WIDTHS.one - 1)).toBe(2)
    expect(toolbarLevel(LEVEL_WIDTHS.two)).toBe(2)
    expect(toolbarLevel(LEVEL_WIDTHS.two - 1)).toBe(3)
    expect(toolbarLevel(0)).toBe(3)
  })
})
