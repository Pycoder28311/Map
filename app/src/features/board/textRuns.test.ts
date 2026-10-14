import { describe, expect, it } from 'vitest'
import { applyMark, normaliseRuns, plainOf, runsEqual, scaleRuns, textFields } from './textRuns'

describe('normaliseRuns', () => {
  it('drops empty runs and joins neighbours that look the same', () => {
    expect(normaliseRuns([{ text: 'a' }, { text: '' }, { text: 'b' }, { text: 'c', bold: true }, { text: 'd', bold: true }])).toEqual([{ text: 'ab' }, { text: 'cd', bold: true }])
  })

  it('treats a false mark as no mark', () => {
    expect(normaliseRuns([{ text: 'a', bold: false }, { text: 'b' }])).toHaveLength(1)
  })
})

describe('applyMark', () => {
  const base = [{ text: 'Hello world' }]

  it('marks the middle of a run, splitting it', () => {
    const out = applyMark(base, 2, 7, { bold: true })
    expect(out).toEqual([{ text: 'He' }, { text: 'llo w', bold: true }, { text: 'orld' }])
    expect(plainOf(out)).toBe('Hello world')
  })

  it('marks across runs and joins the result', () => {
    const out = applyMark([{ text: 'ab', bold: true }, { text: 'cd' }], 0, 4, { bold: true })
    expect(out).toEqual([{ text: 'abcd', bold: true }])
  })

  it('takes a mark off', () => {
    expect(applyMark([{ text: 'abc', bold: true }], 1, 2, { bold: false })).toEqual([{ text: 'a', bold: true }, { text: 'b' }, { text: 'c', bold: true }])
  })

  it('sets a colour and a size', () => {
    expect(applyMark(base, 0, 5, { color: '#ff0000', size: 40 })[0]).toEqual({ text: 'Hello', color: '#ff0000', size: 40 })
  })

  it('does nothing outside the text or for an empty range', () => {
    expect(applyMark(base, 20, 30, { bold: true })).toEqual(base)
    expect(applyMark(base, 3, 3, { bold: true })).toEqual(base)
  })
})

describe('scaleRuns / textFields / runsEqual', () => {
  it('scales only sized runs', () => {
    expect(scaleRuns([{ text: 'a', size: 20 }, { text: 'b' }], 1.5)).toEqual([{ text: 'a', size: 30 }, { text: 'b' }])
  })

  it('leaves out runs when nothing is marked, keeps them when something is', () => {
    expect(textFields([{ text: 'a' }, { text: 'b' }])).toEqual({ text: 'ab', runs: undefined })
    expect(textFields([{ text: 'a' }, { text: 'b', italic: true }])).toEqual({ text: 'ab', runs: [{ text: 'a' }, { text: 'b', italic: true }] })
  })

  it('compares what is read and how it looks', () => {
    expect(runsEqual([{ text: 'a' }, { text: 'b' }], [{ text: 'ab' }])).toBe(true)
    expect(runsEqual([{ text: 'ab' }], [{ text: 'ab', bold: true }])).toBe(false)
  })
})
