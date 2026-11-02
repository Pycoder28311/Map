import { describe, expect, it } from 'vitest'
import { setTextZoom, boundsOf, textBox } from './bounds'
import { screenWidth } from './render'
import { sizeFactor, zoomGrowth } from './zoomSize'
import { PIN_HEIGHT, PIN_WIDTH } from './pinIcons'
import { POINT_DEFAULT } from './pointLabels'
import { TEXT_DEFAULT } from './textDefaults'
import type { PointObject, TextObject } from './types'

const point: PointObject = { id: 1, layer: 1, kind: 'point', name: '', links: [], anchor: { x: 100, y: 100 }, ...POINT_DEFAULT }
const text: TextObject = { id: 2, layer: 1, kind: 'text', name: '', links: [], anchor: { x: 0, y: 0 }, text: 'Hi', ...TEXT_DEFAULT }

describe('zoomSize', () => {
  it('grows with the square root of the zoom, between half and three times, and is the size at zoom 1', () => {
    expect(zoomGrowth(1)).toBe(1)
    expect(zoomGrowth(4)).toBe(2)
    expect(zoomGrowth(0.01)).toBe(0.5)
    expect(zoomGrowth(100)).toBe(3)
    // A line's width follows the same rule
    expect(screenWidth(4, 4)).toBe(8)
  })

  it('a pin or a text looks that much bigger on the screen: the board size is smaller when zoomed in', () => {
    for (const scale of [0.25, 1, 4, 8]) expect(sizeFactor(scale) * scale).toBeCloseTo(zoomGrowth(scale))
    expect(sizeFactor(1)).toBe(1)
    expect(sizeFactor(4)).toBe(0.5)
  })

  it('the box of a pin and of a text follow the zoom (so they are hit where they are drawn)', () => {
    setTextZoom(1)
    const plain = textBox(text)
    expect(boundsOf(point)).toEqual({ x: 100 - PIN_WIDTH / 2, y: 100 - PIN_HEIGHT, w: PIN_WIDTH, h: PIN_HEIGHT })
    setTextZoom(4)
    expect(boundsOf(point)).toEqual({ x: 100 - PIN_WIDTH / 4, y: 100 - PIN_HEIGHT / 2, w: PIN_WIDTH / 2, h: PIN_HEIGHT / 2 })
    expect(textBox(text).w).toBeCloseTo(plain.w / 2)
    // Keeping its size on the screen is a stronger rule: 1 over the zoom
    expect(textBox({ ...text, fixedSize: true }).w).toBeCloseTo(plain.w / 4)
    setTextZoom(1)
  })
})
