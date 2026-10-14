import { describe, expect, it } from 'vitest'
import { applyChange } from './changes'
import { coloursOf, countOf, recolour } from './colours'
import { DEFAULT_STYLE } from './style'
import { border, boardOf, line, pts, shape, text } from './testing'

const red = { ...DEFAULT_STYLE, color: '#FF0000' }
const blue = { ...DEFAULT_STYLE, color: '#0000ff' }

describe('colours', () => {
  const objects = [line(1, pts([0, 0]), { style: red }), line(2, pts([0, 0]), { style: { ...red, color: '#ff0000' } }), shape(3, { style: blue, fill: { color: '#00FF00', opacity: 50 } })]

  it('lists each colour once, lower case, first seen first', () => {
    expect(coloursOf(objects)).toEqual(['#ff0000', '#0000ff', '#00ff00'])
    expect(countOf(objects, '#FF0000')).toBe(2)
  })

  it('changes only the objects that use it', () => {
    const { board } = applyChange(boardOf(...objects), recolour(objects, '#ff0000', '#123456'))
    expect(board.objects.map((o) => (o.kind === 'line' ? o.style.color : o.kind === 'shape' ? o.style.color : ''))).toEqual(['#123456', '#123456', '#0000ff'])
    expect(recolour(objects, '#00ff00', '#abcdef').update).toHaveLength(1)
  })
})

describe('areas', () => {
  const area = border(1, pts([0, 0], [10, 0], [10, 10]), { fill: { color: '#112233', opacity: 20 }, edges: [{ from: 1, color: '#445566' }] })

  it('lists stroke, fill and edge colours', () => {
    expect(coloursOf([area])).toEqual([area.style.color.toLowerCase(), '#112233', '#445566'])
  })

  it('recolours the fill and the edges', () => {
    const change = recolour([area], '#445566', '#abcdef')
    expect(change.update![0].patch.edges).toEqual([{ from: 1, color: '#abcdef' }])
    expect(recolour([area], '#112233', '#000000').update![0].patch.fill).toEqual({ color: '#000000', opacity: 20 })
  })
})

describe('text', () => {
  const t = text(1, { color: '#112233', runs: [{ text: 'a', color: '#445566' }, { text: 'b' }] })

  it('lists its colour and its runs', () => {
    expect(coloursOf([t])).toEqual(['#112233', '#445566'])
  })

  it('recolours both', () => {
    expect(recolour([t], '#445566', '#abcdef').update![0].patch.runs).toEqual([{ text: 'a', color: '#abcdef' }, { text: 'b' }])
    expect(recolour([t], '#112233', '#000000').update![0].patch.color).toBe('#000000')
  })
})
