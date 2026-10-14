import { describe, expect, it } from 'vitest'
import { descriptionDoc, descriptionPlain, descriptionText } from './pointText'

const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }] }

describe('point descriptions', () => {
  it('keeps a document with words and drops an empty one', () => {
    expect(descriptionText(doc)).toBe(JSON.stringify(doc))
    expect(descriptionText({ type: 'doc', content: [{ type: 'paragraph' }] })).toBe('')
    expect(descriptionText({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '  ' }] }] })).toBe('')
  })
  it('reads back what was kept, and survives damaged text', () => {
    expect(descriptionDoc(descriptionText(doc))).toEqual(doc)
    expect(descriptionDoc('')).toMatchObject({ type: 'doc' })
    expect(descriptionDoc('{oops')).toMatchObject({ type: 'doc' })
    expect(descriptionDoc('{"type":"x"}')).toMatchObject({ type: 'doc' })
  })
  it('gives the plain words', () => {
    expect(descriptionPlain(JSON.stringify(doc))).toBe('Hello')
    expect(descriptionPlain(undefined)).toBe('')
  })
})
