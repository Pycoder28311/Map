import { describe, expect, it } from 'vitest'
import { addRecent, entryForLayout, entryForSavedLayout, MAX_RECENT, type RecentEntry } from './recentStore'

describe('entryForLayout', () => {
  it('keys one panel by itself and a combination by its URL', () => {
    expect(entryForLayout({ template: '1', panels: [{ type: 'note', id: 'n1' }] }, 5)).toEqual({
      key: 'note:n1',
      kind: 'panels',
      template: '1',
      panels: ['note:n1'],
      at: 5,
    })
    const both = entryForLayout({ template: '2-cols', panels: [{ type: 'map', id: 'm1' }, { type: 'notes' }] }, 6)!
    expect(both.key).toContain('/workspace?')
    expect(both).toMatchObject({ kind: 'panels', panels: ['map:m1', 'notes'] })
  })

  it('skips the Dashboard itself', () => {
    expect(entryForLayout({ template: '1', panels: [{ type: 'dashboard' }] }, 1)).toBeNull()
  })
})

describe('addRecent', () => {
  const entry = (key: string, at = 0): RecentEntry => ({ key, kind: 'panels', template: '1', panels: [key], at })

  it('puts the newest first and moves a repeated one to the top', () => {
    let list = addRecent([], entry('a'))
    list = addRecent(list, entry('b'))
    list = addRecent(list, entry('a', 9))
    expect(list.map((e) => e.key)).toEqual(['a', 'b'])
    expect(list[0].at).toBe(9)
  })

  it('keeps at most MAX_RECENT', () => {
    let list: RecentEntry[] = []
    for (let i = 0; i < MAX_RECENT + 5; i++) list = addRecent(list, entry(`k${i}`))
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0].key).toBe(`k${MAX_RECENT + 4}`)
  })

  it('keys saved layouts by their id', () => {
    expect(entryForSavedLayout('l1', 3)).toEqual({ key: 'layout:l1', kind: 'layout', layoutId: 'l1', at: 3 })
  })
})
