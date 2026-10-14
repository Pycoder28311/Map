import { describe, expect, it } from 'vitest'
import { LINE_HEIGHT, layoutOf, layoutText, type Measure } from './textLayout'
import { text } from './testing'

// Every character is half its font size wide, so widths are easy to read
const measure: Measure = (font, t) => t.length * (Number(/(\d+)px/.exec(font)![1]) / 2)
const lay = (runs: { text: string; size?: number; bold?: boolean }[], width = 0, align: 'left' | 'center' | 'right' = 'left', size = 10) => layoutText({ runs, width, size, align }, measure)
const words = (l: ReturnType<typeof lay>) => l.lines.map((line) => line.fragments.map((f) => f.text).join(''))

describe('layoutText', () => {
  it('keeps one line when it does not wrap', () => {
    const l = lay([{ text: 'hello big world' }])
    expect(words(l)).toEqual(['hello big world'])
    expect(l.width).toBe(75)
    expect(l.height).toBe(10 * LINE_HEIGHT)
  })

  it('wraps at spaces', () => {
    expect(words(lay([{ text: 'one two three four' }], 40))).toEqual(['one two ', 'three ', 'four'])
  })

  it('breaks a word longer than the width by character', () => {
    const l = lay([{ text: 'abcdefghij' }], 20)
    expect(words(l)).toEqual(['abcd', 'efgh', 'ij'])
  })

  it('a new line is a new line, an empty one counts', () => {
    expect(words(lay([{ text: 'a\n\nb' }]))).toEqual(['a', '', 'b'])
  })

  it('a line is as tall as its biggest size', () => {
    const l = lay([{ text: 'ab ' }, { text: 'big', size: 40 }])
    expect(l.lines[0].height).toBe(40 * LINE_HEIGHT)
  })

  it('aligns every line inside the box', () => {
    const left = lay([{ text: 'aaaa bb' }], 60, 'left')
    const centre = lay([{ text: 'aaaa bb' }], 60, 'center')
    const right = lay([{ text: 'aaaa bb' }], 60, 'right')
    expect(left.lines[0].fragments[0].x).toBe(0)
    expect(centre.lines[0].fragments[0].x).toBe((60 - 35) / 2)
    expect(right.lines[0].fragments[0].x).toBe(60 - 35)
  })

  it('joins neighbouring tokens of one run, not of two', () => {
    const l = lay([{ text: 'ab cd' }, { text: ' ef', bold: true }])
    expect(l.lines[0].fragments.map((f) => f.text)).toEqual(['ab cd', ' ef'])
  })

  it('an empty text is one empty line of the default size', () => {
    const l = lay([])
    expect(l.lines).toHaveLength(1)
    expect(l.height).toBe(10 * LINE_HEIGHT)
    expect(l.width).toBe(0)
  })
})

describe('layoutOf', () => {
  it('is worked out once per object', () => {
    const t = text(1)
    expect(layoutOf(t, measure)).toBe(layoutOf(t, measure))
  })
})
