import { describe, expect, it } from 'vitest'
import { cleanHtml, htmlToPlain, toHtml } from './noteHtml'

describe('toHtml', () => {
  it('turns plain text into one paragraph per line, escaped', () => {
    expect(toHtml('a\nb <i>')).toBe('<p>a</p><p>b &lt;i&gt;</p>')
  })
  it('keeps HTML as it is', () => {
    expect(toHtml('<p>x</p>')).toBe('<p>x</p>')
  })
  it('gives nothing for no text', () => {
    expect(toHtml(undefined)).toBe('')
    expect(toHtml('')).toBe('')
  })
})

describe('htmlToPlain', () => {
  it('gives a line per paragraph and list item', () => {
    expect(htmlToPlain('<p>one</p><ul><li><p>two</p></li></ul><p>a &amp; b</p>')).toBe('one\ntwo\na & b')
  })
  it('turns line breaks into new lines', () => {
    expect(htmlToPlain('<p>a<br>b</p>')).toBe('a\nb')
  })
  it('leaves plain text alone', () => {
    expect(htmlToPlain('a < b\nc')).toBe('a < b\nc')
  })
})

describe('cleanHtml', () => {
  it('empties HTML without words', () => {
    expect(cleanHtml('<p></p>')).toBe('')
  })
  it('keeps HTML with words', () => {
    expect(cleanHtml('<p>hi</p>')).toBe('<p>hi</p>')
  })
})
