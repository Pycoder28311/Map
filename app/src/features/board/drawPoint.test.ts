import { describe, expect, it } from 'vitest'
import { labelPatch, newPoint } from './drawPoint'
import { defaultsOf, LABELS } from './pointLabels'
import { boundsOf } from './bounds'
import { hitObject } from './hit'
import { point } from './testing'
import { PIN_ICON_PATHS } from './pinIcons'
import { PIN_ICONS } from './types'
import { applyChange } from './changes'
import { moveBy } from './operations'

describe('points', () => {
  it('makes a pin with the pen and rounds the tip', () => {
    expect(newPoint({ x: 1.4, y: 2.6 }, { label: 'city', icon: 'city', color: '#2563eb' })).toMatchObject({ kind: 'point', anchor: { x: 1, y: 3 }, label: 'city', icon: 'city' })
  })
  it('a new label brings its own icon and colour unless they were set by hand', () => {
    expect(labelPatch(point(1, { label: 'other', icon: 'pin', color: '#dc2626' }), 'city')).toEqual({ label: 'city', icon: 'city', color: '#2563eb' })
    expect(labelPatch(point(1, { label: 'other', icon: 'star', color: '#000000' }), 'city')).toEqual({ label: 'city' })
  })
  it('every label has an icon that exists', () => {
    for (const l of LABELS) expect(PIN_ICONS).toContain(defaultsOf(l.id).icon)
    for (const i of PIN_ICONS) expect(PIN_ICON_PATHS[i].path.length).toBeGreaterThan(5)
  })
  it('stands on its tip: bounds and hit are above the anchor', () => {
    const p = point(1, { anchor: { x: 100, y: 100 } })
    expect(boundsOf(p)).toEqual({ x: 86, y: 64, w: 28, h: 36 })
    expect(hitObject(p, { x: 100, y: 80 }, 0)).toBe(true)
    expect(hitObject(p, { x: 100, y: 110 }, 0)).toBe(false)
  })
  it('moves with the others and keeps its looks', () => {
    const p = point(1, { anchor: { x: 5, y: 5 }, banner: 'img1', description: '{}' })
    const { board } = applyChange({ nextId: 2, objects: [p] }, moveBy([p], 3, 4))
    expect(board.objects[0]).toMatchObject({ anchor: { x: 8, y: 9 }, banner: 'img1', description: '{}' })
  })
})
