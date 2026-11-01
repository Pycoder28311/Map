import { infobox } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { defaultObjectInfobox, objectInfoboxOf, OBJECT_TYPES, typeOfObject } from './infoTypes'
import { DEFAULT_STYLE } from './style'
import type { BoardObject } from './types'

const line: BoardObject = { id: 1, layer: 1, kind: 'line', name: '', links: [], style: DEFAULT_STYLE, points: [{ x: 0, y: 0 }] }

describe('infoTypes', () => {
  it('every type of every kind starts with rows an article\'s Info box accepts, the same on every call', () => {
    for (const types of Object.values(OBJECT_TYPES)) {
      expect(new Set(types.map((t) => t.id)).size).toBe(types.length)
      // (None, the first, has no rows)
      expect(types[0]).toMatchObject({ id: 'none', rows: [] })
      for (const t of types.slice(1)) expect(t.rows.length).toBeGreaterThan(0)
    }
    const box = defaultObjectInfobox({ ...line, articleType: 'road' })
    expect(infobox.safeParse(box).success).toBe(true)
    expect(defaultObjectInfobox({ ...line, articleType: 'road' })).toEqual(box)
  })

  it('an object has no type until one is picked (None, with no rows), and shows its own box once it was changed', () => {
    expect(typeOfObject(line).id).toBe('none')
    expect(defaultObjectInfobox(line).rows).toEqual([])
    expect(typeOfObject({ ...line, articleType: 'river' }).id).toBe('river')
    expect(typeOfObject({ ...line, articleType: 'gone' }).id).toBe('none')
    const own = { ...defaultObjectInfobox({ ...line, articleType: 'road' }), rows: [] }
    expect(objectInfoboxOf({ ...line, infobox: own })).toBe(own)
    expect(objectInfoboxOf({ ...line, articleType: 'road' })).toEqual(defaultObjectInfobox({ ...line, articleType: 'road' }))
  })
})
