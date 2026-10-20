import { describe, expect, it } from 'vitest'
import { htmlToPlain, previewOf } from './plain-text'

describe('htmlToPlain', () => {
  it('gives a line per paragraph and list item', () => {
    expect(htmlToPlain('<p>one</p><ul><li><p>two</p></li></ul><p>a &amp; b</p>')).toBe('one\ntwo\na & b')
  })
  it('leaves plain text alone', () => {
    expect(htmlToPlain('a < b\nc')).toBe('a < b\nc')
  })
})

describe('previewOf', () => {
  it('is the words of the text on one line', () => {
    expect(previewOf('<h2>Title</h2><p>First <strong>line</strong></p><p>second  line</p>')).toBe('Title First line second line')
  })
  it('is empty for no text, an empty paragraph or only a picture', () => {
    expect(previewOf(undefined)).toBe('')
    expect(previewOf('')).toBe('')
    expect(previewOf('<p></p>')).toBe('')
    expect(previewOf('<p><img src="https://x/y.png"></p>')).toBe('')
  })
  it('keeps a short text whole, without an ellipsis', () => {
    expect(previewOf('<p>short</p>')).toBe('short')
    expect(previewOf('a'.repeat(150))).toBe('a'.repeat(150))
  })
  it('cuts a long text at a whole word and adds an ellipsis', () => {
    const text = `<p>${'word '.repeat(100)}</p>`
    const preview = previewOf(text, 20)
    expect(preview).toBe('word word word word…')
    expect(preview.length).toBeLessThanOrEqual(21)
  })
  it('cuts mid-word only when one word is longer than the preview', () => {
    expect(previewOf(`<p>${'x'.repeat(500)}</p>`, 10)).toBe(`${'x'.repeat(10)}…`)
  })
  it('never cuts an emoji in half', () => {
    const preview = previewOf(`<p>${'😀'.repeat(300)}</p>`, 10)
    expect(preview).toBe(`${'😀'.repeat(10)}…`)
  })
  it('works on plain text (older notes)', () => {
    expect(previewOf('line one\nline two')).toBe('line one line two')
  })
  it('decodes entities: it is plain text, to be shown as text', () => {
    expect(previewOf('<p>a &lt;b&gt; &amp; c</p>')).toBe('a <b> & c')
  })
  it('is fast enough for the biggest text', () => {
    const big = `<p>${'Some <strong>bold</strong> words. '.repeat(4000)}</p>`
    const start = Date.now()
    previewOf(big)
    expect(Date.now() - start).toBeLessThan(50)
  })
})
