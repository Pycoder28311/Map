// Following people (docs/plans/40): one store for the whole app. The people I follow are read once (every page, they are few), so a
// Follow button anywhere and the privacy panel's invite picker know them without a read each; my followers are read a page at a time when
// the profile shows them. Each change is one request and updates every list shown, with no new read.
import type { Author, FollowCounts, FollowItem } from '@map/shared'
import { useEffect, useSyncExternalStore } from 'react'
import { followCounts, followsApi } from '../../lib/api/follows'

const PAGE = 50

type List = { items: FollowItem[]; cursor: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }
type State = { following: List; followers: List; counts: FollowCounts | null }

const empty = (): List => ({ items: [], cursor: null, status: 'idle', error: null })
let state: State = { following: empty(), followers: empty(), counts: null }
const listeners = new Set<() => void>()
const set = (next: Partial<State>) => {
  state = { ...state, ...next }
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const message = (e: unknown) => (e instanceof Error ? e.message : 'Could not load')

/** Reads a list's first page (`more`: its next one). The people I follow: every page, once */
async function load(direction: 'following' | 'followers', more = false) {
  const list = state[direction]
  if (list.status === 'loading') return
  set({ [direction]: { ...list, status: 'loading', error: null } })
  try {
    let items = more ? list.items : []
    let cursor = more ? list.cursor : null
    do {
      const page = await followsApi.list({ direction }, { limit: PAGE, cursor })
      items = [...items, ...page.items]
      cursor = page.nextCursor
    } while (direction === 'following' && cursor)
    set({ [direction]: { items, cursor, status: 'ready', error: null } })
  } catch (e) {
    set({ [direction]: { ...state[direction], status: 'error', error: message(e) } })
  }
}

async function loadCounts() {
  try {
    set({ counts: await followCounts() })
  } catch {
    // The tabs show no numbers
  }
}

const bump = (key: keyof FollowCounts, by: number) => (state.counts ? { counts: { ...state.counts, [key]: Math.max(0, state.counts[key] + by) } } : {})

/** Follow this person (nothing changes when I do already) */
export async function follow(person: Author) {
  if (state.following.items.some((f) => f.user.id === person.id)) return
  const made = await followsApi.create({ userId: person.id })
  const followsMe = state.followers.items.some((f) => f.user.id === person.id)
  set({
    following: { ...state.following, items: [{ id: made.id, user: person, since: made.since, mutual: followsMe }, ...state.following.items] },
    followers: { ...state.followers, items: state.followers.items.map((f) => (f.user.id === person.id ? { ...f, mutual: true } : f)) },
    ...bump('following', 1),
  })
}

/** Stop following this person (my pending invitations to them are cancelled by the server) */
export async function unfollow(personId: string) {
  const found = state.following.items.find((f) => f.user.id === personId)
  if (!found) return
  await followsApi.remove(found.id)
  set({
    following: { ...state.following, items: state.following.items.filter((f) => f.id !== found.id) },
    followers: { ...state.followers, items: state.followers.items.map((f) => (f.user.id === personId ? { ...f, mutual: false } : f)) },
    ...bump('following', -1),
  })
}

/** Take one of my followers away */
export async function removeFollower(followId: number) {
  await followsApi.remove(followId)
  const gone = state.followers.items.find((f) => f.id === followId)
  set({
    followers: { ...state.followers, items: state.followers.items.filter((f) => f.id !== followId) },
    following: { ...state.following, items: state.following.items.map((f) => (gone && f.user.id === gone.user.id ? { ...f, mutual: false } : f)) },
    ...bump('followers', -1),
  })
}

/** The people I follow (read once, the first time something asks) */
export function useFollowing() {
  const list = useSyncExternalStore(subscribe, () => state.following)
  useEffect(() => {
    if (state.following.status === 'idle') void load('following')
  }, [])
  return { ...list, reload: () => load('following') }
}

/** My followers, a page at a time (`more`) */
export function useFollowers() {
  const list = useSyncExternalStore(subscribe, () => state.followers)
  useEffect(() => {
    if (state.followers.status === 'idle') void load('followers')
  }, [])
  return { ...list, more: () => load('followers', true), reload: () => load('followers') }
}

/** How many follow me and how many I follow */
export function useFollowCounts() {
  const counts = useSyncExternalStore(subscribe, () => state.counts)
  useEffect(() => {
    if (state.counts === null) void loadCounts()
  }, [])
  return counts
}

/** Whether I follow this person */
export function useIsFollowing(personId: string) {
  return useSyncExternalStore(subscribe, () => state.following.items.some((f) => f.user.id === personId))
}

/** Tests: start again */
export const resetFollowStore = () => set({ following: empty(), followers: empty(), counts: null })
