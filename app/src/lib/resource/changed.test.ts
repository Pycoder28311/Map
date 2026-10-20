import { describe, expect, it } from 'vitest'
import { changedFields, sameValues, valuesOf } from './changed'

describe('changedFields', () => {
  it('keeps only the fields that differ', () => {
    expect(changedFields({ title: 'b', content: '<p>x</p>' }, { title: 'a', content: '<p>x</p>' })).toEqual({ title: 'b' })
  })
  it('is empty when nothing changed', () => {
    expect(changedFields({ title: 'a' }, { title: 'a' })).toEqual({})
  })
  it('sends a field emptied', () => {
    expect(changedFields({ title: '', content: 'x' }, { title: 'a', content: 'x' })).toEqual({ title: '' })
  })
  it('sends a field the saved values do not have', () => {
    expect(changedFields({ title: 'a', extra: 'x' }, { title: 'a' })).toEqual({ extra: 'x' })
  })
})

describe('sameValues', () => {
  it('compares field by field, a missing field being empty', () => {
    expect(sameValues({ a: '1' }, { a: '1' })).toBe(true)
    expect(sameValues({ a: '1' }, { a: '2' })).toBe(false)
    expect(sameValues({ a: '' }, {})).toBe(true)
    expect(sameValues({ a: '1', b: '' }, { a: '1' })).toBe(true)
  })
})

describe('valuesOf', () => {
  const resource = { ui: { fields: [{ name: 'title' }, { name: 'content' }, { name: 'extra' }] } }
  it('takes the resource\'s fields from the item as text, a missing one empty', () => {
    expect(valuesOf(resource, { id: 1, title: 'a', content: '<p>b</p>', other: 'x' })).toEqual({ title: 'a', content: '<p>b</p>', extra: '' })
    expect(valuesOf(resource, { title: null, content: 5 })).toEqual({ title: '', content: '5', extra: '' })
  })
})
