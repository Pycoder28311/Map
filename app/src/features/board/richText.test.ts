import { describe, expect, it } from 'vitest'
import { docToRuns, runsToDoc } from './richText'
import { normaliseRuns } from './textRuns'
import type { TextRun } from './types'

const roundTrip = (runs: TextRun[]) => docToRuns(runsToDoc(runs))

describe('richText', () => {
  it('round-trips marks, colour and size', () => {
    const runs: TextRun[] = [{ text: 'Hello ', bold: true }, { text: 'big', italic: true, underline: true, strike: true, color: '#ff0000', size: 40 }, { text: ' world' }]
    expect(roundTrip(runs)).toEqual(runs)
  })

  it('a new line is a paragraph, and back', () => {
    const doc = runsToDoc([{ text: 'a\nb' }])
    expect(doc.content).toHaveLength(2)
    expect(roundTrip([{ text: 'a\n\nb' }])).toEqual([{ text: 'a\n\nb' }])
  })

  it('an empty text is one empty paragraph', () => {
    expect(runsToDoc([])).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
    expect(docToRuns(runsToDoc([]))).toEqual([])
  })

  it('only new lines', () => {
    expect(roundTrip([{ text: '\n\n' }])).toEqual([{ text: '\n\n' }])
  })

  it('joins neighbours that look the same, like the runs do', () => {
    const runs: TextRun[] = [{ text: 'a', bold: true }, { text: 'b', bold: true }]
    expect(roundTrip(runs)).toEqual(normaliseRuns(runs))
  })

  it('reads a font size given as text, and a hard break', () => {
    const runs = docToRuns({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'textStyle', attrs: { fontSize: '18px' } }] }, { type: 'hardBreak' }, { type: 'text', text: 'y' }] }] })
    expect(runs).toEqual([{ text: 'x', size: 18 }, { text: '\ny' }])
  })
})
