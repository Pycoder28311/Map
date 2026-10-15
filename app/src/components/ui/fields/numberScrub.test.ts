import { describe, expect, it } from 'vitest'
import { scrubbedValue } from './numberScrub'

describe('scrubbedValue', () => {
  it('moves a step for every few pixels, both ways', () => {
    expect(scrubbedValue(10, 0, 1, 0, 100)).toBe(10)
    expect(scrubbedValue(10, 10, 1, 0, 100)).toBe(12)
    expect(scrubbedValue(10, -10, 1, 0, 100)).toBe(8)
  })

  it('does not turn a part of a step into one', () => {
    expect(scrubbedValue(10, 4, 1, 0, 100)).toBe(10)
    expect(scrubbedValue(10, -4, 1, 0, 100)).toBe(10)
  })

  it('stays inside the limits', () => {
    expect(scrubbedValue(95, 500, 1, 0, 100)).toBe(100)
    expect(scrubbedValue(5, -500, 1, 0, 100)).toBe(0)
    expect(scrubbedValue(0, -50, 1, -10, 100)).toBe(-10)
  })

  it('keeps to the input step: whole steps, a bigger one is slower', () => {
    expect(scrubbedValue(400, 24, 100, 100, 900)).toBe(600)
    expect(scrubbedValue(0.5, 10, 0.1, 0, 1)).toBeCloseTo(0.7)
  })
})
