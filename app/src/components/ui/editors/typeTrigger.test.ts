import { describe, expect, it } from 'vitest'
import { opensAt, queryOf } from './typeTrigger'

describe('typing a menu character', () => {
  it('opens at the start of a row or after a space only', () => {
    expect(opensAt('')).toBe(true)
    expect(opensAt('Some words ')).toBe(true)
    // A date or a path stays a slash
    expect(opensAt('1')).toBe(false)
    expect(opensAt('and/')).toBe(false)
  })

  it('keeps the words typed after it as the query until a space', () => {
    expect(queryOf('')).toBe('')
    expect(queryOf('card')).toBe('card')
    expect(queryOf('two col')).toBeNull()
    expect(queryOf('x'.repeat(41))).toBeNull()
  })
})
