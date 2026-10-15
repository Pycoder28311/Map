import { POINT_DEFAULT } from './pointLabels'
import { describe, expect, it } from 'vitest'
import { buttonCentre, buttonsFor } from './selectionButtons'
import { border as border_, line, pts, shape, text } from './testing'
import type { PointObject } from './types'

const actions = (objects: Parameters<typeof buttonsFor>[0]) => buttonsFor(objects).map((b) => b.action).sort()

describe('buttonsFor', () => {
  it('gives a line the full set', () => {
    expect(actions([line(1, pts([0, 0]))])).toEqual(['duplicate', 'flipH', 'flipV', 'link', 'remove', 'resize', 'split'])
  })

  it('gives a border no flips and no duplicate, and puts its link above the top-right button', () => {
    const border = border_(1, pts([0, 0]))
    expect(actions([border])).toEqual(['description', 'link', 'remove', 'resize', 'split'])
    expect(buttonsFor([border]).find((b) => b.action === 'link')!.corner).toBe('tru')
  })

  it('gives several objects no split and no link', () => {
    expect(actions([line(1, pts([0, 0])), shape(2)])).toEqual(['duplicate', 'flipH', 'flipV', 'remove', 'resize'])
  })

  it('gives a shape no split, and a point only the basics', () => {
    expect(actions([shape(1)])).not.toContain('split')
    const point: PointObject = { id: 1, kind: 'point', layer: 1, name: '', links: [], anchor: { x: 0, y: 0 }, ...POINT_DEFAULT }
    expect(actions([point])).toEqual(['duplicate', 'link', 'remove'])
  })

  it('has nothing for nothing', () => {
    expect(buttonsFor([])).toEqual([])
  })

  it('never puts two buttons on the same spot', () => {
    for (const objects of [[line(1, pts([0, 0]))], [line(1, pts([0, 0])), shape(2)]]) {
      const spots = buttonsFor(objects).map((b) => JSON.stringify(buttonCentre(b.corner, b.order, 100, 60)))
      expect(new Set(spots).size).toBe(spots.length)
    }
  })
})

describe('text buttons', () => {
  it('can resize and turn, copy, remove and link, but not flip or split', () => {
    expect(actions([text(1)])).toEqual(['duplicate', 'link', 'remove', 'resize'])
  })
})
