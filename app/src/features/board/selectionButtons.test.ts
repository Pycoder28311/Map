import { POINT_DEFAULT } from './pointLabels'
import { describe, expect, it } from 'vitest'
import { buttonCentre, buttonsFor, handlePlace, handlesFor, sidebarButtonsFor } from './selectionButtons'
import { border, line, pts, shape, text } from './testing'
import type { PointObject } from './types'

const point: PointObject = { id: 1, kind: 'point', layer: 1, name: '', links: [], anchor: { x: 0, y: 0 }, ...POINT_DEFAULT }
const one = [line(1, pts([0, 0])), border(1, pts([0, 0])), shape(1), text(1), point]
const several = [line(1, pts([0, 0])), shape(2)]
const floating = (objects: Parameters<typeof buttonsFor>[0]) => buttonsFor(objects).map((b) => b.action).sort()
const inSidebar = (objects: Parameters<typeof sidebarButtonsFor>[0]) => sidebarButtonsFor(objects).map((b) => b.action)

describe('buttonsFor', () => {
  it('floats only Link and Remove on one object, Link always at the bottom left', () => {
    for (const o of one) {
      expect(floating([o])).toEqual(['link', 'remove'])
      expect(buttonsFor([o]).find((b) => b.action === 'link')!.corner).toBe('bl')
    }
  })

  it('floats only Remove on several objects', () => {
    expect(floating(several)).toEqual(['remove'])
  })

  it('has nothing for nothing', () => {
    expect(buttonsFor([])).toEqual([])
  })

  it('never puts two buttons on the same spot', () => {
    const spots = buttonsFor([line(1, pts([0, 0]))]).map((b) => JSON.stringify(buttonCentre(b.corner, 100, 60)))
    expect(new Set(spots).size).toBe(spots.length)
  })
})

describe('sidebarButtonsFor', () => {
  it('gives each kind what it can do', () => {
    expect(inSidebar([line(1, pts([0, 0]))])).toEqual(['flipH', 'flipV', 'split', 'duplicate'])
    expect(inSidebar([border(1, pts([0, 0]))])).toEqual(['split'])
    expect(inSidebar([shape(1)])).toEqual(['flipH', 'flipV', 'duplicate'])
    expect(inSidebar([text(1)])).toEqual(['duplicate'])
    expect(inSidebar([point])).toEqual(['duplicate'])
  })

  it('gives several objects no split', () => {
    expect(inSidebar(several)).toEqual(['flipH', 'flipV', 'duplicate'])
  })

  it('has nothing for nothing', () => {
    expect(sidebarButtonsFor([])).toEqual([])
  })
})

describe('handlesFor', () => {
  it('gives a line, a border, a shape and several objects four corners and four edges', () => {
    for (const objects of [[line(1, pts([0, 0]))], [border(1, pts([0, 0]))], [shape(1)], several]) expect(handlesFor(objects)).toHaveLength(8)
  })

  it('gives a pin alone none, and a text alone no top or bottom edge', () => {
    expect(handlesFor([point])).toEqual([])
    expect(handlesFor([text(1)])).toEqual(['tl', 'tr', 'bl', 'br', 'l', 'r'])
  })

  it('puts them at the corners and the middles of the edges', () => {
    expect(handlePlace('tl')).toEqual({ x: 0, y: 0 })
    expect(handlePlace('br')).toEqual({ x: 1, y: 1 })
    expect(handlePlace('t')).toEqual({ x: 0.5, y: 0 })
    expect(handlePlace('l')).toEqual({ x: 0, y: 0.5 })
  })
})
