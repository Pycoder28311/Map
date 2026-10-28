import { afterEach, describe, expect, it, vi } from 'vitest'
import { localStore } from './localStore'

/** A localStorage in memory, or one that throws */
function fakeStorage(broken = false) {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => {
      if (broken) throw new Error('blocked')
      return data.get(k) ?? null
    },
    setItem: (k: string, v: string) => {
      if (broken) throw new Error('blocked')
      data.set(k, v)
    },
  })
  return data
}

afterEach(() => vi.unstubAllGlobals())

describe('localStore', () => {
  const numbers = (raw: unknown) => (Array.isArray(raw) ? raw.filter((n) => typeof n === 'number') : [])

  it('starts with the start value, keeps what is set, tells the listeners', () => {
    const data = fakeStorage()
    const store = localStore<number[]>('k', [], numbers)
    expect(store.get()).toEqual([])
    const listener = vi.fn()
    store.subscribe(listener)
    store.set([1, 2])
    expect(listener).toHaveBeenCalledOnce()
    expect(JSON.parse(data.get('k')!)).toEqual([1, 2])
  })

  it('reads what was kept, made the right shape', () => {
    const data = fakeStorage()
    data.set('k', JSON.stringify([1, 'x', 3]))
    expect(localStore<number[]>('k', [], numbers).get()).toEqual([1, 3])
    data.set('j', '{not json')
    expect(localStore<number[]>('j', [7], numbers).get()).toEqual([7])
  })

  it('works on with storage blocked', () => {
    fakeStorage(true)
    const store = localStore<number[]>('k', [], numbers)
    expect(store.get()).toEqual([])
    store.set([4])
    expect(store.get()).toEqual([4])
  })
})
