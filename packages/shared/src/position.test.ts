import { generateNKeysBetween } from 'fractional-indexing'
import { describe, expect, it } from 'vitest'
import { comparePositions, integerKey, isPosition, positionAfter, positionBefore, positionBetween, positionField, positionsBetween } from './position'

describe('position keys', () => {
  it('makes a key between two, after the last and before the first', () => {
    const between = positionBetween('a0', 'a1')!
    expect(comparePositions('a0', between)).toBeLessThan(0)
    expect(comparePositions(between, 'a1')).toBeLessThan(0)
    expect(positionAfter('a5')).toBe('a6')
    expect(positionAfter(null)).toBe('a0')
    expect(comparePositions(positionBefore('a0'), 'a0')).toBeLessThan(0)
  })

  it('always finds room: many moves into the same gap keep the order', () => {
    let low = 'a0'
    const high = 'a1'
    for (let i = 0; i < 200; i++) {
      const next = positionBetween(low, high)!
      expect(comparePositions(low, next)).toBeLessThan(0)
      expect(comparePositions(next, high)).toBeLessThan(0)
      low = next
    }
    expect(low.length).toBeLessThan(64)
  })

  it('has no key between equal or reversed neighbours', () => {
    expect(positionBetween('a1', 'a1')).toBeNull()
    expect(positionBetween('a2', 'a1')).toBeNull()
    expect(positionsBetween('a1', 'a1', 2)).toBeNull()
    expect(positionsBetween('a0', 'a1', 3)).toHaveLength(3)
  })

  it('checks keys', () => {
    expect(isPosition('a0')).toBe(true)
    expect(isPosition('a0V')).toBe(true)
    expect(isPosition('')).toBe(false)
    expect(isPosition('0')).toBe(false)
    expect(isPosition('a0-')).toBe(false)
    expect(isPosition('a'.repeat(65))).toBe(false)
    expect(isPosition(5)).toBe(false)
    expect(positionField.safeParse('a1').success).toBe(true)
    expect(positionField.safeParse(1).success).toBe(false)
  })

  it('orders by code units, like SQLite (digits < upper case < lower case)', () => {
    expect(['a1', 'aZ', 'a9', 'aa', 'b00'].sort(comparePositions)).toEqual(['a1', 'a9', 'aZ', 'aa', 'b00'])
  })

  it('numbers a list the same way as the library (the migration uses this formula)', () => {
    const keys = generateNKeysBetween(null, null, 10_000)
    keys.forEach((key, n) => expect(integerKey(n)).toBe(key))
  })
})
