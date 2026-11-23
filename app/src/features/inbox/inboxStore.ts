// The inbox (docs/plans/40): the invitations sent to me. One store for the navbar's popout and the /inbox page: the badge's count is read
// once when the app opens (and after each answer it goes down, with no read); the pending ones and the answered ones are read a page at a
// time when they are shown.
import type { InvitationItem } from '@map/shared'
import { useEffect, useSyncExternalStore } from 'react'
import { invitationsApi, pendingInvitations } from '../../lib/api/invitations'

const PAGE = 20

type List = { items: InvitationItem[]; cursor: string | null; status: 'idle' | 'loading' | 'ready' | 'error'; error: string | null }
type State = { count: number | null; pending: List; answered: List }

const empty = (): List => ({ items: [], cursor: null, status: 'idle', error: null })
let state: State = { count: null, pending: empty(), answered: empty() }
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

/** Whatever else shows what I am on (the sidebar's Shared with me, my profile's Collaborations) reads again after an Accept */
const acceptedListeners = new Set<() => void>()
export const onAccepted = (listener: () => void) => {
  acceptedListeners.add(listener)
  return () => {
    acceptedListeners.delete(listener)
  }
}

async function loadCount() {
  try {
    set({ count: (await pendingInvitations()).count })
  } catch {
    // No badge
  }
}

/** The pending ones (all pages: they are few) or the answered ones, a page at a time (`more`) */
async function load(which: 'pending' | 'answered', more = false) {
  const list = state[which]
  if (list.status === 'loading') return
  set({ [which]: { ...list, status: 'loading', error: null } })
  try {
    let items = more ? list.items : []
    let cursor = more ? list.cursor : null
    do {
      const page = await invitationsApi.list({ box: 'inbox', status: which === 'pending' ? 'pending' : undefined }, { limit: PAGE, cursor })
      items = [...items, ...(which === 'answered' ? page.items.filter((i) => i.status !== 'pending') : page.items)]
      cursor = page.nextCursor
    } while (which === 'pending' && cursor)
    set({ [which]: { items, cursor, status: 'ready', error: null }, ...(which === 'pending' ? { count: items.length } : {}) })
  } catch (e) {
    set({ [which]: { ...state[which], status: 'error', error: e instanceof Error ? e.message : 'Could not load' } })
  }
}

/**
 * Answers one invitation: it leaves the pending ones, goes first in the answered ones, and the badge goes down. An item that went to the
 * Trash or is gone (410) also leaves the list: the error says so
 */
export async function answer(invitation: InvitationItem, status: 'accepted' | 'declined') {
  const drop = () =>
    set({
      pending: { ...state.pending, items: state.pending.items.filter((i) => i.id !== invitation.id) },
      count: Math.max(0, (state.count ?? 1) - 1),
    })
  try {
    const answered = await invitationsApi.update(invitation.id, { status })
    drop()
    if (state.answered.status !== 'idle') set({ answered: { ...state.answered, items: [answered, ...state.answered.items] } })
    if (status === 'accepted') acceptedListeners.forEach((listener) => listener())
  } catch (e) {
    if ((e as { status?: number }).status === 410 || (e as { status?: number }).status === 404) drop()
    throw e
  }
}

/** The badge: how many invitations wait for me (read once) */
export function usePendingCount() {
  const count = useSyncExternalStore(subscribe, () => state.count)
  useEffect(() => {
    if (state.count === null) void loadCount()
  }, [])
  return count ?? 0
}

/** The invitations waiting for me (read the first time they are shown; `reload` reads them again) */
export function usePending() {
  const list = useSyncExternalStore(subscribe, () => state.pending)
  useEffect(() => {
    if (state.pending.status === 'idle') void load('pending')
  }, [])
  return { ...list, reload: () => load('pending') }
}

/** The ones I answered, newest first, a page at a time */
export function useAnswered() {
  const list = useSyncExternalStore(subscribe, () => state.answered)
  useEffect(() => {
    if (state.answered.status === 'idle') void load('answered')
  }, [])
  return { ...list, more: () => load('answered', true) }
}
