import { describe, expect, it } from 'vitest'
import type { InfoRow } from '@map/shared'
import { changeKind, emptyRow, exampleRow, insertRow, moveRow, normalizeAddress, normalizeDegree, removeRow, typeOf } from './infoRows'

const value = (id: string, v = ''): InfoRow => ({ id, label: id, kind: 'value', value: v })
const ids = (rows: InfoRow[]) => rows.map((r) => r.id)

describe('info rows', () => {
  it('makes an empty row of each type', () => {
    expect(emptyRow('value', 'a')).toEqual({ id: 'a', label: '', kind: 'value', value: '' })
    expect(emptyRow('list', 'a')).toEqual({ id: 'a', label: '', kind: 'list', items: [''], ordered: true })
    expect(emptyRow('bullets', 'a')).toEqual({ id: 'a', label: '', kind: 'list', items: [''], ordered: false })
    expect(emptyRow('text', 'a')).toEqual({ id: 'a', label: '', kind: 'text', text: '', bullets: false })
    expect(emptyRow('period', 'a')).toMatchObject({ kind: 'period', from: '', to: '' })
    expect(emptyRow('link', 'a')).toMatchObject({ kind: 'link', text: '', url: '' })
    expect(emptyRow('image', 'a')).toMatchObject({ kind: 'image', image: null })
    expect(emptyRow('coordinates', 'a')).toMatchObject({ kind: 'coordinates', lat: '', lng: '' })
  })

  it('names the type of a row, a bulleted list apart from a numbered one', () => {
    expect(typeOf(emptyRow('list'))).toBe('list')
    expect(typeOf(emptyRow('bullets'))).toBe('bullets')
    expect(typeOf(emptyRow('date'))).toBe('date')
  })

  it('inserts, removes and moves rows', () => {
    const rows = [value('a'), value('b')]
    expect(ids(insertRow(rows, 1, value('x')))).toEqual(['a', 'x', 'b'])
    expect(ids(insertRow(rows, 9, value('x')))).toEqual(['a', 'b', 'x'])
    expect(ids(removeRow(rows, 'a'))).toEqual(['b'])
    expect(ids(moveRow(rows, 'b', -1))).toEqual(['b', 'a'])
    expect(moveRow(rows, 'a', -1)).toBe(rows)
    expect(moveRow(rows, 'b', 1)).toBe(rows)
  })

  it('changes type keeping the label and the words', () => {
    const list: InfoRow = { id: 'l', label: 'Works', kind: 'list', items: ['One', '', 'Two'], ordered: true }
    expect(changeKind(list, 'text')).toEqual({ id: 'l', label: 'Works', kind: 'text', text: 'One\nTwo', bullets: false })
    expect(changeKind(list, 'bullets')).toEqual({ ...list, items: ['One', 'Two'], ordered: false })
    expect(changeKind(list, 'value')).toEqual({ id: 'l', label: 'Works', kind: 'value', value: 'One' })
    expect(changeKind(changeKind(list, 'bullets'), 'text')).toMatchObject({ bullets: true })
    expect(changeKind(value('v', '1815'), 'list')).toEqual({ id: 'v', label: 'v', kind: 'list', items: ['1815'], ordered: true })
    expect(changeKind(value('v'), 'list')).toEqual({ id: 'v', label: 'v', kind: 'list', items: [''], ordered: true })
    expect(changeKind(list, list.kind === 'list' ? 'list' : 'value')).toBe(list)
  })

  it('keeps a date, an address or a degree only where it is one', () => {
    expect(changeKind(value('v', '1852-11-27'), 'date')).toMatchObject({ kind: 'date', value: '1852-11-27' })
    expect(changeKind(value('v', '27 November'), 'date')).toMatchObject({ kind: 'date', value: '' })
    expect(changeKind(value('v', 'https://example.org'), 'link')).toMatchObject({ kind: 'link', text: '', url: 'https://example.org' })
    expect(changeKind({ id: 'p', label: 'x', kind: 'period', from: '1833-01-01', to: '1852-11-27' }, 'date')).toMatchObject({ value: '1833-01-01' })
    expect(changeKind({ id: 'c', label: 'x', kind: 'coordinates', lat: '51.5', lng: '-0.12' }, 'value')).toMatchObject({ value: '51.5' })
    expect(changeKind(value('v', '51.5'), 'coordinates')).toMatchObject({ lat: '51.5', lng: '' })
  })
})

describe('what is typed in a link or a degree', () => {
  it('takes an address as the server will: none, http, https or mailto, a bare domain getting https', () => {
    expect(normalizeAddress('')).toBe('')
    expect(normalizeAddress('  https://example.org/a ')).toBe('https://example.org/a')
    expect(normalizeAddress('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(normalizeAddress('example.org/page')).toBe('https://example.org/page')
    expect(normalizeAddress('exam')).toBeNull()
    expect(normalizeAddress('javascript:alert(1)')).toBeNull()
    expect(normalizeAddress('https://a b.c')).toBeNull()
    expect(normalizeAddress(`https://a.b/${'x'.repeat(500)}`)).toBeNull()
  })

  it('takes a degree as the server will, a half-typed one (a lone minus, a trailing dot) waiting', () => {
    expect(normalizeDegree('')).toBe('')
    expect(normalizeDegree('51.5')).toBe('51.5')
    expect(normalizeDegree('-0.12')).toBe('-0.12')
    expect(normalizeDegree('12.')).toBe('12')
    expect(normalizeDegree('-')).toBeNull()
    expect(normalizeDegree('north')).toBeNull()
    expect(normalizeDegree('1234')).toBeNull()
  })
})

describe('exampleRow', () => {
  it('is a row of the type asked, with words in it', () => {
    for (const type of ['value', 'date', 'period', 'link', 'list', 'bullets', 'text', 'image', 'coordinates'] as const) {
      const row = exampleRow(type)
      expect(typeOf(row)).toBe(type)
      expect(row.label).not.toBe('')
    }
  })
})
