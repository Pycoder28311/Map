import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearSelection, getSelection, resetSelection, select, subscribeSelection, toggleSelected } from './selection'

beforeEach(resetSelection)

describe('selection', () => {
  it('selects, toggles and clears per map', () => {
    select('m1', [1, 2])
    toggleSelected('m1', 2)
    toggleSelected('m1', 3)
    expect([...getSelection('m1')]).toEqual([1, 3])
    expect(getSelection('m2').size).toBe(0)
    clearSelection('m1')
    expect(getSelection('m1').size).toBe(0)
  })

  it('tells nobody when nothing changed, and gives the same empty set', () => {
    const listener = vi.fn()
    subscribeSelection(listener)
    clearSelection('m1')
    select('m1', [1])
    select('m1', [1])
    expect(listener).toHaveBeenCalledTimes(1)
    clearSelection('m1')
    expect(getSelection('m1')).toBe(getSelection('other'))
  })
})
