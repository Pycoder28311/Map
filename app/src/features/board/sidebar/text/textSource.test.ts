import { describe, expect, it } from 'vitest'
import { textValueOf } from './textSource'
import type { TextObject } from '../../types'

const base = { id: 1, kind: 'text', links: [], anchor: { x: 0, y: 0 }, text: 'Hi', width: 0, rotation: 15, align: 'left', size: 24, color: '#111827', opacity: 100 } as unknown as TextObject

describe('textValueOf', () => {
  it('fills in what a text leaves out', () => {
    const v = textValueOf(base)
    expect(v).toMatchObject({ font: 0, weight: 400, italic: false, underlineColor: null, strokeColor: '#000000', strokeOpacity: 100, boxShape: 'square', boxColor: null, fixedSize: false, rotation: 15 })
  })
  it('keeps what a text sets', () => {
    const v = textValueOf({ ...base, weight: 700, underline: true, underlineColor: '#ff0000', boxed: true, boxShape: 'corners' })
    expect(v).toMatchObject({ weight: 700, underline: true, underlineColor: '#ff0000', boxed: true, boxShape: 'corners' })
  })
})
