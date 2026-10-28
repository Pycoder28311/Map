// The user's saved list (Save, docs/plans/32): the panel keys of what they saved (`article:5`), newest first. On this device until the
// server keeps it; only this file changes then.
import { localStore, useLocalStore } from '../../../lib/localStore'

export type Saved = { key: string; savedAt: string }

const isSaved = (x: unknown): x is Saved => !!x && typeof (x as Saved).key === 'string' && typeof (x as Saved).savedAt === 'string'

export const savedStore = localStore<Saved[]>('map:saved', [], (raw) => (Array.isArray(raw) ? raw.filter(isSaved) : []))

export function setSaved(key: string, saved: boolean) {
  const list = savedStore.get().filter((s) => s.key !== key)
  savedStore.set(saved ? [{ key, savedAt: new Date().toISOString() }, ...list] : list)
}

/** Whether this is saved, and the switch */
export function useSaved(key: string): [boolean, (saved: boolean) => void] {
  const saved = useLocalStore(savedStore, (list) => list.some((s) => s.key === key))
  return [saved, (next) => setSaved(key, next)]
}

/** Everything saved, newest first */
export const useSavedList = () => useLocalStore(savedStore, (list) => list)
