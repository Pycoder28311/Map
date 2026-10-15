import { describe, expect, it } from 'vitest'
import { distinctStyles, fullStyle, STYLE_DEFAULTS, styleKey, styleOf } from './textStyles'
import { LAYER_MAIN, type Board, type TextObject } from './types'

const text = (id: number, extra: Partial<TextObject> = {}): TextObject => ({
  id,
  layer: LAYER_MAIN,
  name: '',
  links: [],
  kind: 'text',
  anchor: { x: id * 10, y: 0 },
  text: `text ${id}`,
  width: 0,
  rotation: 0,
  align: 'left',
  size: 24,
  color: '#111827',
  opacity: 100,
  ...extra,
})
const board = (...objects: TextObject[]): Board => ({ nextId: 50, objects })

describe('styleOf', () => {
  it('leaves out defaults and what has no effect', () => {
    expect(styleOf(text(1))).toEqual({})
    expect(styleOf(text(1, { strokeColor: '#ff0000', strokeOpacity: 50, boxColor: '#00ff00', underlineColor: '#0000ff' }))).toEqual({})
  })

  it('keeps what is set', () => {
    expect(styleOf(text(1, { size: 40, weight: 700, strokeWidth: 2, strokeColor: '#ff0000' }))).toEqual({ size: 40, weight: 700, strokeWidth: 2, strokeColor: '#ff0000' })
  })

  it('does not take where the text is, what it says or how it is turned', () => {
    expect(styleOf(text(1, { rotation: 30, width: 200, text: 'hello' }))).toEqual({})
  })

  it('counts null as nothing (the pen keeps its colours so)', () => {
    expect(styleOf({ underlineColor: null as unknown as undefined, underline: true })).toEqual({ underline: true })
  })
})

describe('fullStyle', () => {
  it('has every setting, the defaults for what is missing', () => {
    expect(fullStyle({ size: 40 })).toEqual({ ...STYLE_DEFAULTS, size: 40 })
  })
})

describe('distinctStyles', () => {
  it('lists each look once, the most used first, without the text itself', () => {
    const b = board(text(1, { size: 40 }), text(2, { size: 40 }), text(3, { size: 40 }), text(4, { weight: 700 }), text(5, { weight: 700 }), text(6, { italic: true }))
    const list = distinctStyles(b, 1, styleOf(text(1, { size: 40 })))
    expect(list.map((e) => e.style)).toEqual([{ weight: 700 }, { italic: true }])
    expect(list[0].count).toBe(2)
    expect(list[0].sample).toBe('text 4')
  })

  it('leaves out a look the current one already has, and non-texts', () => {
    const b = board(text(1), text(2), text(3, { size: 50 }))
    expect(distinctStyles(b, 1, styleOf(text(1))).map((e) => e.style)).toEqual([{ size: 50 }])
  })

  it('stops at the limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => text(i + 1, { size: 10 + i }))
    expect(distinctStyles(board(...many), null, {}, 5)).toHaveLength(5)
  })

  it('compares looks, not objects', () => {
    expect(styleKey(styleOf(text(1)))).toBe(styleKey(styleOf(text(2, { strokeColor: '#ff0000' }))))
  })
})
