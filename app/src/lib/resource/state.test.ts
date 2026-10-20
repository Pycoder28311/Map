import { describe, expect, it } from 'vitest'
import { ApiError } from '../api/client'
import { isAbout } from './changes'
import { initialItem, initialList, itemReducer, listReducer, type ItemState, type ListState } from './state'

const page = (items: number[], nextCursor: string | null = null) => ({ items, nextCursor })
const run = <S, A>(reducer: (s: S, a: A) => S, start: S, actions: A[]) => actions.reduce(reducer, start)

describe('listReducer', () => {
  it('shows loading until the first answer, then the items', () => {
    let s: ListState<number> = initialList()
    s = listReducer(s, { type: 'load', request: 1 })
    expect(s).toMatchObject({ status: 'loading', items: [] })
    s = listReducer(s, { type: 'loaded', request: 1, page: page([1, 2], 'c1'), append: false })
    expect(s).toMatchObject({ status: 'ready', items: [1, 2], nextCursor: 'c1', loaded: true })
  })

  it('appends the next page', () => {
    const s = run(listReducer<number>, initialList<number>(), [
      { type: 'load', request: 1 },
      { type: 'loaded', request: 1, page: page([1, 2], 'c1'), append: false },
      { type: 'more', request: 2 },
      { type: 'loaded', request: 2, page: page([3], null), append: true },
    ])
    expect(s).toMatchObject({ items: [1, 2, 3], nextCursor: null, loadingMore: false })
  })

  it('keeps the old items while loading again, and replaces them when the answer comes', () => {
    let s = run(listReducer<number>, initialList<number>(), [
      { type: 'load', request: 1 },
      { type: 'loaded', request: 1, page: page([1, 2]), append: false },
      { type: 'load', request: 2 },
    ])
    expect(s).toMatchObject({ status: 'ready', refreshing: true, items: [1, 2] })
    s = listReducer(s, { type: 'loaded', request: 2, page: page([9]), append: false })
    expect(s).toMatchObject({ items: [9], refreshing: false })
  })

  it('ignores an answer of an older request', () => {
    const s = run(listReducer<number>, initialList<number>(), [
      { type: 'load', request: 1 },
      { type: 'load', request: 2 },
      { type: 'loaded', request: 1, page: page([1]), append: false },
    ])
    expect(s).toMatchObject({ items: [], loaded: false, status: 'loading' })
  })

  it('an error on the first load is an error; later it only says what went wrong', () => {
    const failure = new ApiError(500, 'INTERNAL', 'x')
    let s = run(listReducer<number>, initialList<number>(), [{ type: 'load', request: 1 }, { type: 'failed', request: 1, error: failure }])
    expect(s).toMatchObject({ status: 'error', error: failure })
    s = run(listReducer<number>, initialList<number>(), [
      { type: 'load', request: 1 },
      { type: 'loaded', request: 1, page: page([1]), append: false },
      { type: 'load', request: 2 },
      { type: 'failed', request: 2, error: failure },
    ])
    expect(s).toMatchObject({ status: 'ready', items: [1], error: failure, refreshing: false })
  })
})

describe('itemReducer', () => {
  it('loads an item', () => {
    const s = run(itemReducer<string>, initialItem<string>(), [{ type: 'load', request: 1 }, { type: 'loaded', request: 1, item: 'a' }])
    expect(s).toMatchObject({ status: 'ready', item: 'a' })
  })

  it('knows a 404 as not found', () => {
    const s = run(itemReducer<string>, initialItem<string>(), [
      { type: 'load', request: 1 },
      { type: 'failed', request: 1, error: new ApiError(404, 'NOT_FOUND', 'x') },
    ])
    expect(s.status).toBe('notFound')
  })

  it('takes the version of a write at any time, and a deletion', () => {
    let s: ItemState<string> = initialItem()
    s = itemReducer(s, { type: 'set', item: 'b' })
    expect(s).toMatchObject({ status: 'ready', item: 'b' })
    s = itemReducer(s, { type: 'gone' })
    expect(s).toMatchObject({ status: 'notFound', item: null })
  })

  it('ignores an older answer', () => {
    const s = run(itemReducer<string>, initialItem<string>(), [
      { type: 'load', request: 1 },
      { type: 'load', request: 2 },
      { type: 'loaded', request: 1, item: 'old' },
    ])
    expect(s.item).toBeNull()
  })
})

describe('isAbout', () => {
  it('matches the item of the event or the removed id, numbers and strings alike', () => {
    expect(isAbout({ name: 'notes', item: { id: 5 } }, '5')).toBe(true)
    expect(isAbout({ name: 'notes', removedId: '5' }, 5)).toBe(true)
    expect(isAbout({ name: 'notes', item: { id: 6 } }, 5)).toBe(false)
    expect(isAbout({ name: 'notes' }, 5)).toBe(false)
  })
})
