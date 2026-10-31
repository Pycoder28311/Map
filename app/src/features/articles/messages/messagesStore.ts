// The article's messages this tab has read (docs/plans/34): a message is read from the server only when its words are clicked (or its
// form opens on it), once; two clicks at the same time are one request. Writes put the server's answer in, so nothing reads again. An
// article page forgets its messages when it closes, so opening it again reads them fresh. A message's newest replies come with it
// (docs/plans/37); the earlier ones are read when asked for, and the reply writes put the server's answer into the message.
import { MESSAGE_REPLIES_PAGE, type Message, type MessageReply, type MessageUpdate } from '@map/shared'
import { useEffect, useSyncExternalStore } from 'react'
import { ApiError } from '../../../lib/api/client'
import { importMessages, messageRepliesApi, messagesApi } from '../../../lib/api/messages'

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

// Messages known from a list, without their replies, being read again for them
const completing = new Set<number>()

/**
 * Reads a message unless it is known or being read (`force`: read it again, after a failure). One known only from a list ("Not in the
 * text": no replies) is read once more for its replies, shown as it is meanwhile
 */
export function loadMessage(id: number, force = false) {
  const known = states.get(id)
  const partial = known?.status === 'ready' && !known.message.replies
  if (partial ? completing.has(id) : known && (known.status === 'loading' || !force)) return
  if (partial) completing.add(id)
  else set(id, { status: 'loading' })
  messagesApi
    .get(id)
    .then(
      (message) => set(id, { status: 'ready', message }),
      (error: unknown) =>
        set(id, error instanceof ApiError && (error.status === 404 || error.status === 403) ? { status: 'gone' } : { status: 'error', error: error instanceof Error ? error.message : 'Could not load it' }),
    )
    .finally(() => completing.delete(id))
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
  // (a new message has no replies: opening it reads nothing)
  const message: Message = { ...(await messagesApi.create({ articleId, title, content })), replies: [], repliesCursor: null }
  set(message.id, { status: 'ready', message })
  return message
}

/** A known message with its replies as they are now (an answer without replies keeps the ones read) */
function withReplies(message: Message): Message {
  const known = states.get(message.id)
  if (message.replies || known?.status !== 'ready') return message
  return { ...message, replies: known.message.replies, repliesCursor: known.message.repliesCursor }
}

/** Changes a message's text, or its Done */
export async function updateMessage(id: number, patch: MessageUpdate): Promise<Message> {
  const message = withReplies(await messagesApi.update(id, patch))
  set(id, { status: 'ready', message })
  return message
}

/** Changes a known message's replies (nothing when it is not known any more) */
function changeReplies(messageId: number, change: (replies: MessageReply[], cursor: string | null) => { replies: MessageReply[]; cursor?: string | null }) {
  const known = states.get(messageId)
  if (known?.status !== 'ready') return
  const { replies, cursor } = change(known.message.replies ?? [], known.message.repliesCursor ?? null)
  set(messageId, { status: 'ready', message: { ...known.message, replies, repliesCursor: cursor === undefined ? (known.message.repliesCursor ?? null) : cursor } })
}

/** Writes a reply under a message (the article's editors); it goes first (the replies are newest first) */
export async function addReply(messageId: number, content: string): Promise<MessageReply> {
  const reply = await messageRepliesApi.create({ messageId, content })
  changeReplies(messageId, (replies) => ({ replies: [reply, ...replies.filter((r) => r.id !== reply.id)] }))
  return reply
}

/** Changes a reply's text (its author) */
export async function updateReply(messageId: number, id: number, content: string): Promise<MessageReply> {
  const reply = await messageRepliesApi.update(id, { content })
  changeReplies(messageId, (replies) => ({ replies: replies.map((r) => (r.id === id ? reply : r)) }))
  return reply
}

/** Deletes a reply (a 404 means it was gone already: the same end) */
export async function removeReply(messageId: number, id: number): Promise<void> {
  try {
    await messageRepliesApi.remove(id)
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error
  }
  changeReplies(messageId, (replies) => ({ replies: replies.filter((r) => r.id !== id) }))
}

/** Reads the next page of a message's earlier replies (after the ones it came with) */
export async function loadEarlierReplies(messageId: number): Promise<void> {
  const known = states.get(messageId)
  const cursor = known?.status === 'ready' ? known.message.repliesCursor : null
  if (!cursor) return
  const page = await messageRepliesApi.list({ messageId }, { cursor, limit: MESSAGE_REPLIES_PAGE })
  changeReplies(messageId, (replies) => {
    const seen = new Set(replies.map((r) => r.id))
    return { replies: [...replies, ...page.items.filter((r) => !seen.has(r.id))], cursor: page.nextCursor }
  })
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
  const made = (await importMessages({ articleId, items })).map((message): Message => ({ ...message, replies: [], repliesCursor: null }))
  made.forEach((message) => set(message.id, { status: 'ready', message }))
  return made
}

/** A message read in a list ("Not in the text"): known from now on */
export const rememberMessage = (message: Message) => set(message.id, { status: 'ready', message: withReplies(message) })

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
