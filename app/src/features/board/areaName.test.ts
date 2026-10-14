import { describe, expect, it } from 'vitest'
import { areaNameOf, nameArea, textChange } from './areaName'
import { applyChange } from './changes'
import { border, boardOf, pts, text } from './testing'
import type { TextObject } from './types'

const square = pts([0, 0], [200, 0], [200, 200], [0, 200])
const area = () => border(1, square)

describe('nameArea', () => {
  it('names an area with a centred text attached to it, and sets its name', () => {
    const b = applyChange(boardOf(area()), nameArea(boardOf(area()), 1, '  Attica ')).board
    const t = areaNameOf(b, 1)!
    expect(t.text).toBe('Attica')
    expect(t.isName).toBe(true)
    expect(t.attach).toBe(1)
    expect(t.links).toEqual([{ to: 'board', id: 1 }])
    expect(b.objects.find((o) => o.id === 1)!.name).toBe('Attica')
    // Centred: its box is round the middle of the square
    const centre = t.anchor.x + 0
    expect(centre).toBeGreaterThan(20)
    expect(centre).toBeLessThan(180)
  })

  it('renaming changes both, and keeps the one text', () => {
    const named = applyChange(boardOf(area()), nameArea(boardOf(area()), 1, 'Attica')).board
    const renamed = applyChange(named, nameArea(named, 1, 'Crete')).board
    expect(renamed.objects.filter((o) => o.kind === 'text')).toHaveLength(1)
    expect(areaNameOf(renamed, 1)!.text).toBe('Crete')
    expect(renamed.objects.find((o) => o.id === 1)!.name).toBe('Crete')
  })

  it('an empty name removes the text and the name', () => {
    const named = applyChange(boardOf(area()), nameArea(boardOf(area()), 1, 'Attica')).board
    const cleared = applyChange(named, nameArea(named, 1, '')).board
    expect(areaNameOf(cleared, 1)).toBeNull()
    expect(cleared.objects.find((o) => o.id === 1)!.name).toBe('')
  })

  it('is no change for something that is not an area', () => {
    expect(nameArea(boardOf(text(1)), 1, 'x')).toEqual({})
  })
})

describe('textChange', () => {
  const named = () => applyChange(boardOf(area()), nameArea(boardOf(area()), 1, 'Attica')).board

  it('keeps the area name in step with its text', () => {
    const b = named()
    const t = areaNameOf(b, 1) as TextObject
    const out = applyChange(b, textChange(t, { text: 'Athens' })).board
    expect(out.objects.find((o) => o.id === 1)!.name).toBe('Athens')
  })

  it('removes an emptied name text and the name', () => {
    const b = named()
    const t = areaNameOf(b, 1) as TextObject
    const out = applyChange(b, textChange(t, { text: '  ' })).board
    expect(areaNameOf(out, 1)).toBeNull()
    expect(out.objects.find((o) => o.id === 1)!.name).toBe('')
  })

  it('leaves an ordinary text alone, and a name text whose words did not change', () => {
    const plain = text(5)
    expect(textChange(plain, { rotation: 20 })).toEqual({ update: [{ id: 5, patch: { rotation: 20 } }] })
    const b = named()
    const t = areaNameOf(b, 1) as TextObject
    expect(textChange(t, { color: '#ff0000' }).update).toHaveLength(1)
  })

  it('undoing both is one change (they are one Change)', () => {
    const b = named()
    const t = areaNameOf(b, 1) as TextObject
    const change = textChange(t, { text: 'Athens' })
    expect(change.update).toHaveLength(2)
  })
})
