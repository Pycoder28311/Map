import { describe, expect, it } from 'vitest'
import { itemsToText, splitItems, textToItems } from './checklist'

describe('checklist', () => {
  it('splits text into items, skipping blank lines', () => {
    const items = textToItems('Bread\n\n  Milk \n')
    expect(items.map((i) => i.text)).toEqual(['Bread', 'Milk'])
    expect(items.every((i) => !i.done)).toBe(true)
    expect(new Set(items.map((i) => i.id)).size).toBe(2)
  })

  it('joins items into lines, skipping blank ones', () => {
    expect(itemsToText([{ id: 'a', text: 'Bread', done: true }, { id: 'b', text: ' ', done: false }, { id: 'c', text: 'Milk', done: false }])).toBe('Bread\nMilk')
  })

  it('puts the ticked items apart', () => {
    const { open, done } = splitItems([
      { id: 'a', text: 'a', done: true },
      { id: 'b', text: 'b', done: false },
    ])
    expect(open.map((i) => i.id)).toEqual(['b'])
    expect(done.map((i) => i.id)).toEqual(['a'])
  })
})
