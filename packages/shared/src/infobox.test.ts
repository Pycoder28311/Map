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
        { id: 'b', label: 'Works', kind: 'list', items: ['Notes', 'Letters'], ordered: true },
        { id: 'c', label: 'About', kind: 'text', text: 'One\nTwo', bullets: true },
        { id: 'd', label: 'Personal life', kind: 'header' },
        { id: 'e', label: 'Died', kind: 'date', value: '1852-11-27' },
        { id: 'f', label: 'Active', kind: 'period', from: '1833-01-01', to: '' },
        { id: 'g', label: 'Website', kind: 'link', text: 'Papers', url: 'https://example.org/ada' },
        { id: 'h', label: 'Seen at', kind: 'image', image: null },
        { id: 'i', label: 'Birthplace', kind: 'coordinates', lat: '51.5', lng: '-0.12' },
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

  it('reads a list saved before bulleted lists existed (no `ordered`) as numbered', () => {
    const old = { ...EMPTY_INFOBOX, rows: [{ id: 'a', label: 'Works', kind: 'list', items: ['One'] }] }
    expect(infobox.parse(old).rows[0]).toMatchObject({ kind: 'list', ordered: true })
  })

  it('refuses a malformed day or degree, and a link that is not http, https or mailto', () => {
    const row = (extra: object) => ({ ...EMPTY_INFOBOX, rows: [{ id: 'a', label: 'x', ...extra }] })
    expect(infobox.safeParse(row({ kind: 'date', value: '5 March' })).success).toBe(false)
    expect(infobox.safeParse(row({ kind: 'coordinates', lat: 'north', lng: '' })).success).toBe(false)
    expect(infobox.safeParse(row({ kind: 'link', text: '', url: 'javascript:alert(1)' })).success).toBe(false)
    expect(infobox.safeParse(row({ kind: 'link', text: '', url: '//evil.test' })).success).toBe(false)
    expect(infobox.safeParse(row({ kind: 'link', text: '', url: 'mailto:a@b.c' })).success).toBe(true)
    expect(infobox.safeParse(row({ kind: 'link', text: '', url: '' })).success).toBe(true)
  })

  it('keeps only a picture the app stored', () => {
    const base = 'https://img.test/map/img/'
    setRichTextImageBase(base)
    const stored = `${base}0b8a1f2e-1234-4abc-8def-0123456789ab.png`
    expect(infobox.parse({ ...EMPTY_INFOBOX, image: stored }).image).toBe(stored)
    expect(infobox.parse({ ...EMPTY_INFOBOX, image: 'https://evil.test/x.png' }).image).toBeNull()
    // The same in an image row
    expect(infobox.parse({ ...EMPTY_INFOBOX, rows: [{ id: 'a', label: '', kind: 'image', image: 'https://evil.test/x.png' }] }).rows[0]).toMatchObject({ image: null })
  })
})
