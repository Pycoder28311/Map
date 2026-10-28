// A value kept on this device (localStorage) that screens can watch: the mock stores that stand in for the server until it has
// what they hold (saved articles, notes connected to an article). Reading broken or blocked storage gives the start value.
import { useSyncExternalStore } from 'react'

export type LocalStore<T> = {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

/** A store of one JSON value under `key`; `check` makes what was read the right shape (or answers the start value) */
export function localStore<T>(key: string, start: T, check: (raw: unknown) => T): LocalStore<T> {
  const listeners = new Set<() => void>()
  let value: T | undefined
  const get = () => {
    if (value === undefined) {
      try {
        const raw = localStorage.getItem(key)
        value = raw === null ? start : check(JSON.parse(raw))
      } catch {
        value = start
      }
    }
    return value
  }
  return {
    get,
    set: (next) => {
      value = next
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // Not kept: it is back to what it was on reload
      }
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/** The store's value (a part of it: `select`), followed */
export function useLocalStore<T, S>(store: LocalStore<T>, select: (value: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => select(store.get()))
}
