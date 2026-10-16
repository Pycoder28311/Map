import { describe, expect, it } from 'vitest'
import { ROADS, roadLayerColour, shade } from './roadTextures'

describe('shade', () => {
  it('mixes toward black and white', () => {
    expect(shade('#808080', -1)).toBe('#000000')
    expect(shade('#808080', 1)).toBe('#ffffff')
    expect(shade('#ff0000', 0)).toBe('#ff0000')
  })
})

describe('roads', () => {
  it('starts with none and every layer fits in the line', () => {
    expect(ROADS[0].layers).toEqual([])
    for (const road of ROADS) for (const layer of road.layers) expect(layer.width).toBeLessThanOrEqual(1)
  })
  it('colours a layer from the line, a shade of it or its own', () => {
    expect(roadLayerColour({ width: 1, color: 'line' }, '#336699')).toBe('#336699')
    expect(roadLayerColour({ width: 1, color: '#fff000' }, '#336699')).toBe('#fff000')
    expect(roadLayerColour({ width: 1, color: { shade: -1 } }, '#336699')).toBe('#000000')
  })
})
