// The article's messages this tab has read (docs/plans/34): a message is read from the server only when its words are clicked (or its
// form opens on it), once; two clicks at the same time are one request. Writes put the server's answer in, so nothing reads again. An
// article page forgets its messages when it closes, so opening it again reads them fresh.
import type { Message, MessageUpdate } from '@map/shared'
import { useEffect, useSyncExternalStore } from 'react'
import { ApiError } from '../../../lib/api/client'
import { importMessages, messagesApi } from '../../../lib/api/messages'

export type MessageState =
  | { status: 'loading' }
  | { status: 'ready'; message: Message }
  /** Deleted, or not readable by this user */
  | { status: 'gone' }
  | { status: 'error'; error: string }

const IDLE: MessageState = { status: 'loading' }

const states = new Map<number, MessageState>()
const listeners = new Set<() => void>()
// Which article each message is of (to forget an article's messages when its page closes)
const articleOf = new Map<number, number>()
// Bumped on every change, for what follows all the messages (the side list's titles)
let revision = 0

function set(id: number, state: MessageState) {
  states.set(id, state)
  if (state.status === 'ready') articleOf.set(id, state.message.articleId)
  revision++
  listeners.forEach((listener) => listener())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** What is known of a message, without reading it */
export const peekMessage = (id: number): MessageState | undefined => states.get(id)

/** Reads a message unless it is known or being read (`force`: read it again, after a failure) */
export function loadMessage(id: number, force = false) {
  const known = states.get(id)
  if (known && (known.status === 'loading' || !force)) return
  set(id, { status: 'loading' })
  messagesApi.get(id).then(
    (message) => set(id, { status: 'ready', message }),
    (error: unknown) =>
      set(id, error instanceof ApiError && (error.status === 404 || error.status === 403) ? { status: 'gone' } : { status: 'error', error: error instanceof Error ? error.message : 'Could not load it' }),
  )
}

/** One message, read when `load` is true and it is not known yet (null: none) */
export function useMessage(id: number | null, load = true): MessageState | null {
  const state = useSyncExternalStore(subscribe, () => (id === null ? null : (states.get(id) ?? (load ? IDLE : null))))
  useEffect(() => {
    if (id !== null && load) loadMessage(id)
  }, [id, load])
  return state
}

/** Changes whenever a message is read or written (the side list reads titles of the known ones) */
export const useMessagesRevision = () => useSyncExternalStore(subscribe, () => revision)

/** Writes a new message of an article; it is known at once */
export async function createMessage(articleId: number, title: string, content: string): Promise<Message> {
  const message = await messagesApi.create({ articleId, title, content })
  set(message.id, { status: 'ready', message })
  return message
}

/** Changes a message's text, or its Done */
export async function updateMessage(id: number, patch: MessageUpdate): Promise<Message> {
  const message = await messagesApi.update(id, patch)
  set(id, { status: 'ready', message })
  return message
}

/** Deletes a message (a 404 means it was gone already: the same end) */
export async function removeMessage(id: number): Promise<void> {
  try {
    await messagesApi.remove(id)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  set(id, { status: 'gone' })
}

/** Makes an article's old messages rows, in this order (at most MESSAGE_IMPORT_MAX at once); they are known at once */
export async function importOldMessages(articleId: number, items: { title: string; content: string }[]): Promise<Message[]> {
  const made = await importMessages({ articleId, items })
  made.forEach((message) => set(message.id, { status: 'ready', message }))
  return made
}

/** A message read in a list ("Not in the text"): known from now on */
export const rememberMessage = (message: Message) => set(message.id, { status: 'ready', message })

/** Forgets what was read of an article's messages (its page closed) */
export function forgetArticleMessages(articleId: number) {
  let changed = false
  for (const [id, article] of articleOf) {
    if (article !== articleId) continue
    states.delete(id)
    articleOf.delete(id)
    changed = true
  }
  if (changed) {
    revision++
    listeners.forEach((listener) => listener())
  }
}
