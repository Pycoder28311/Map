import { useEffect, useSyncExternalStore } from 'react'
import { authClient } from '../../lib/auth-client'
import { STARTERS, type Starter, type StarterKey } from './starterItems'

/**
 * Which starter cards a user still has, on this device (localStorage, per user): `on` is decided once, the first time the Dashboard
 * has read the user's lists (on only when they had nothing at all), and `gone` lists the ones deleted or made since. A deleted one never
 * comes back; a made one is a real item from then on.
 */
type Saved = { on: boolean; gone: StarterKey[] }

const storageKey = (userId: string) => `map:starters:${userId}`
const listeners = new Set<() => void>()
// The value read for each user (useSyncExternalStore needs the same object back while nothing changed)
const cache = new Map<string, Saved | null>()

function read(userId: string): Saved | null {
  if (cache.has(userId)) return cache.get(userId)!
  let saved: Saved | null = null
  try {
    const text = localStorage.getItem(storageKey(userId))
    if (text) saved = JSON.parse(text) as Saved
  } catch {
    // No storage (a private window): the starters are decided again on every visit
  }
  cache.set(userId, saved)
  return saved
}

function write(userId: string, saved: Saved) {
  cache.set(userId, saved)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(saved))
  } catch {
    // Kept for this visit only
  }
  for (const listener of listeners) listener()
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The starter is gone for good: deleted from its card, or made into a real item */
export function dropStarter(userId: string, key: StarterKey) {
  const saved = read(userId) ?? { on: true, gone: [] }
  if (!saved.gone.includes(key)) write(userId, { ...saved, gone: [...saved.gone, key] })
}

/**
 * The starters to show in the Orphans row. `ready`: the user's lists are read; `empty`: they hold nothing. The first time both are known,
 * the starters are turned on (nothing there) or off for good
 */
export function useStarters(ready: boolean, empty: boolean): Starter[] {
  const { data: session } = authClient.useSession()
  const userId = session?.user.id
  const saved = useSyncExternalStore(subscribe, () => (userId ? read(userId) : null))
  useEffect(() => {
    if (userId && ready && read(userId) === null) write(userId, { on: empty, gone: [] })
  }, [userId, ready, empty])
  if (!saved?.on) return []
  return STARTERS.filter((s) => !saved.gone.includes(s.key))
}
