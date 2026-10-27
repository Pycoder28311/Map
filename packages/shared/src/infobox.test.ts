import { afterEach, describe, expect, it } from 'vitest'
import { EMPTY_INFOBOX, infobox } from './infobox'
import { setRichTextImageBase } from './rich-text-policy'

describe('infobox', () => {
  afterEach(() => setRichTextImageBase(null))

  it('takes every kind of row', () => {
    const box = {
      image: null,
      name: 'Ada',
      rows: [
        { id: 'a', label: 'Born', kind: 'value', value: '1815' },
        { id: 'b', label: 'Works', kind: 'list', items: ['Notes', 'Letters'] },
        { id: 'c', label: 'About', kind: 'text', text: 'One\nTwo', bullets: true },
      ],
    }
    expect(infobox.parse(box)).toEqual(box)
    expect(infobox.parse(EMPTY_INFOBOX)).toEqual(EMPTY_INFOBOX)
  })

  it('refuses an unknown kind, a missing field or too long a text', () => {
    expect(infobox.safeParse({ ...EMPTY_INFOBOX, rows: [{ id: 'a', label: 'x', kind: 'html', value: '' }] }).success).toBe(false)
    expect(infobox.safeParse({ image: null, rows: [] }).success).toBe(false)
    expect(infobox.safeParse({ ...EMPTY_INFOBOX, name: 'x'.repeat(201) }).success).toBe(false)
  })

  it('keeps only a picture the app stored', () => {
    const base = 'https://img.test/map/img/'
    setRichTextImageBase(base)
    const stored = `${base}0b8a1f2e-1234-4abc-8def-0123456789ab.png`
    expect(infobox.parse({ ...EMPTY_INFOBOX, image: stored }).image).toBe(stored)
    expect(infobox.parse({ ...EMPTY_INFOBOX, image: 'https://evil.test/x.png' }).image).toBeNull()
  })
})
