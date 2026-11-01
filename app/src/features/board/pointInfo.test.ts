import { infobox } from '@map/shared'
import { describe, expect, it } from 'vitest'
import { defaultInfobox, infoboxOf } from './pointInfo'
import { LABELS } from './pointLabels'
import { POINT_LABELS } from './types'

describe('pointInfo', () => {
  it('every type starts with its own rows, valid in an article\'s Info box, the same on every call', () => {
    for (const label of POINT_LABELS) {
      const box = defaultInfobox(label)
      expect(box.rows.length).toBeGreaterThan(0)
      expect(infobox.safeParse(box).success).toBe(true)
      expect(defaultInfobox(label)).toEqual(box)
    }
    expect(defaultInfobox('city').rows.map((r) => r.label)).toEqual(['Population', 'Country', 'Founded'])
    expect(defaultInfobox('store').rows.map((r) => r.label)).not.toEqual(defaultInfobox('city').rows.map((r) => r.label))
  })

  it('a point shows its own box once it was changed, else its type\'s', () => {
    const own = { ...defaultInfobox('city'), rows: [] }
    expect(infoboxOf({ label: 'store', infobox: undefined })).toEqual(defaultInfobox('store'))
    expect(infoboxOf({ label: 'store', infobox: own })).toBe(own)
  })

  it('the types are the labels the form offers', () => {
    expect(LABELS.map((l) => l.id)).toEqual([...POINT_LABELS])
  })
})
