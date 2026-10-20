// When a note being edited is saved, and what is kept on this device meanwhile. Pure (autosave.test.ts); useAutosave.ts runs it.
//
// - after IDLE_MS without a change, or MAX_WAIT_MS after the first unsaved change (so continuous typing is still sent),
// - when the page is hidden or closed: sent at once (`keepalive`) if the body is small enough, else the draft stays,
// - every change is also kept as a draft in localStorage; it is removed only after the server answered 2xx,
// - on opening, a found draft is applied (the server's version did not change since) or the user chooses (it did).

export const IDLE_MS = 5_000
export const MAX_WAIT_MS = 30_000
/** The most a `keepalive` fetch may send is 64 KB; stay under it */
export const KEEPALIVE_LIMIT = 60_000

export type Timing = {
  /** There are changes not yet sent */
  dirty: boolean
  saving: boolean
  /** When the first unsaved change was made / the last one (ms) */
  firstChange: number
  lastChange: number
}

/** When the next save is due (ms), or null when nothing is waiting to be saved (or a save is running: it schedules the next one when done) */
export function dueAt(t: Timing, idleMs = IDLE_MS, maxWaitMs = MAX_WAIT_MS): number | null {
  if (!t.dirty || t.saving) return null
  return Math.min(t.lastChange + idleMs, t.firstChange + maxWaitMs)
}

/** How long to wait before trying again after the `attempt`-th failure (0-based): 5 s, 10 s, 20 s… at most a minute */
export const retryDelay = (attempt: number) => Math.min(60_000, 5_000 * 2 ** attempt)

/** Whether a body is small enough for a `keepalive` request */
export const fitsKeepalive = (body: string) => new TextEncoder().encode(body).length <= KEEPALIVE_LIMIT

/* ─────────────── Drafts (localStorage) ─────────────── */

/** The part of localStorage used here (a Map-backed one in the tests) */
export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

export type Draft<V> = {
  /** The form values the user had */
  values: V
  /** The server's `updatedAt` of the item when the draft's first change was made: what the draft is a change of */
  baseUpdatedAt: string
  savedAt: number
}

const PREFIX = 'map:draft:'
export const draftKey = (userId: string, resource: string, id: number | string) => `${PREFIX}${userId}:${resource}:${id}`

/** localStorage, or undefined where it is not there or blocked (private windows, blocked site data) */
export function browserStorage(): DraftStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
}

export function readDraft<V>(storage: DraftStorage | undefined, key: string): Draft<V> | null {
  try {
    const raw = storage?.getItem(key)
    if (!raw) return null
    const draft = JSON.parse(raw) as Draft<V>
    return draft && typeof draft.baseUpdatedAt === 'string' && draft.values !== undefined ? draft : null
  } catch {
    return null
  }
}

export function writeDraft<V>(storage: DraftStorage | undefined, key: string, draft: Draft<V>): void {
  try {
    storage?.setItem(key, JSON.stringify(draft))
  } catch {
    // Full or blocked: the draft is only a safety net
  }
}

export function clearDraft(storage: DraftStorage | undefined, key: string): void {
  try {
    storage?.removeItem(key)
  } catch {
    // ignore
  }
}

/** Removes every draft of this user (on sign out: the next person on this device must not find them) */
export function clearUserDrafts(storage: DraftStorage | undefined, userId: string): void {
  try {
    if (!storage) return
    const mine = `${PREFIX}${userId}:`
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key?.startsWith(mine)) keys.push(key)
    }
    keys.forEach((key) => storage.removeItem(key))
  } catch {
    // ignore
  }
}

/**
 * What to do with a draft found when an item is opened:
 * - none: no draft, or it holds nothing new (it equals what the server has): the draft is dropped
 * - apply: the draft is a change of the server's current version: use it and save it
 * - conflict: the item changed on the server since: the user chooses
 */
export type OpenDecision = 'none' | 'apply' | 'conflict'

export function decideOnOpen<V>(draft: Draft<V> | null, server: { updatedAt: string; values: V }, same: (a: V, b: V) => boolean): OpenDecision {
  if (!draft || same(draft.values, server.values)) return 'none'
  return draft.baseUpdatedAt === server.updatedAt ? 'apply' : 'conflict'
}
