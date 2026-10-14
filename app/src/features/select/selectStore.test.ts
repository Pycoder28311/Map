import { afterEach, describe, expect, it } from 'vitest'
import { clearSelected, getSelected, toggleSelected } from './selectStore'

afterEach(clearSelected)

describe('selectStore', () => {
  it('toggles an id on and off', () => {
    toggleSelected('m1')
    expect(getSelected().has('m1')).toBe(true)
    toggleSelected('m1')
    expect(getSelected().has('m1')).toBe(false)
  })

  it('clears everything', () => {
    toggleSelected('m1')
    toggleSelected('m2')
    clearSelected()
    expect(getSelected().size).toBe(0)
  })
})
