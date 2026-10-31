// The comments below an article (docs/plans/37) this page has read: one level at a time, when asked for. The top comments when the
// section scrolls into view, a comment's replies when its "Show replies" is pressed, 20 a page. Writes put the server's answer in, so
// nothing is read again. One store per article page (useCommentsStore): closed, it is forgotten.
import { COMMENTS_PAGE, type Comment, type CommentInput, type CommentUpdate } from '@map/shared'
import { useState, useSyncExternalStore } from 'react'
import { ApiError } from '../../../lib/api/client'
import { commentsApi } from '../../../lib/api/comments'
import type { ResourceApi } from '../../../lib/api/resource'

/** One level of comments: the top ones (newest first) or a comment's replies (oldest first) */
export type Thread = {
  ids: number[]
  /** The next page's cursor (null: none, or not read yet) */
  cursor: string | null
  /** Its first page was read */
  loaded: boolean
  loading: boolean
  error: string | null
}

export type CommentsState = {
  comments: Record<number, Comment>
  top: Thread
  /** By the id of the comment they answer */
  replies: Record<number, Thread>
  /** The comments whose replies are shown */
  open: Record<number, boolean>
  /** The article can no longer be read (a 404): the section closes */
  gone: boolean
}

type Api = ResourceApi<Comment, Comment, CommentInput, CommentUpdate, { articleId: number; parentId?: number }>

export const EMPTY_THREAD: Thread = { ids: [], cursor: null, loaded: false, loading: false, error: null }

/** Ids grow with time: the top comments newest first, replies oldest first, whatever order they were read or written in */
const sorted = (ids: number[], top: boolean) => [...new Set(ids)].sort((a, b) => (top ? b - a : a - b))

const message = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong')

export function createCommentsStore(articleId: number, api: Api = commentsApi) {
  let state: CommentsState = { comments: {}, top: EMPTY_THREAD, replies: {}, open: {}, gone: false }
  const listeners = new Set<() => void>()
  // What is being written in the modal, by what it answers ('new', 'reply:12', 'edit:12'): kept while it is closed
  const drafts = new Map<string, string>()

  const set = (next: CommentsState) => {
    state = next
    listeners.forEach((listener) => listener())
  }
  const threadOf = (parentId: number | null) => (parentId === null ? state.top : (state.replies[parentId] ?? EMPTY_THREAD))
  const withThread = (s: CommentsState, parentId: number | null, thread: Thread): CommentsState =>
    parentId === null ? { ...s, top: thread } : { ...s, replies: { ...s.replies, [parentId]: thread } }

  /** Reads the next page of a level (its first, when not read yet); nothing when it is being read or has no more */
  async function load(parentId: number | null) {
    const thread = threadOf(parentId)
    if (thread.loading || (thread.loaded && !thread.cursor) || state.gone) return
    set(withThread(state, parentId, { ...thread, loading: true, error: null }))
    try {
      const page = await api.list(parentId === null ? { articleId } : { articleId, parentId }, { cursor: thread.cursor, limit: COMMENTS_PAGE })
      const current = threadOf(parentId)
      const comments = { ...state.comments, ...Object.fromEntries(page.items.map((c) => [c.id, c])) }
      const ids = sorted([...current.ids, ...page.items.map((c) => c.id)], parentId === null)
      set(withThread({ ...state, comments }, parentId, { ids, cursor: page.nextCursor, loaded: true, loading: false, error: null }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) set({ ...state, gone: true })
      else set(withThread(state, parentId, { ...threadOf(parentId), loading: false, error: message(error) }))
    }
  }

  /** Every comment under one, all levels (what goes with it when it is deleted) */
  function under(id: number): number[] {
    const children = state.replies[id]?.ids ?? []
    return children.flatMap((child) => [child, ...under(child)])
  }

  return {
    get: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    draft: (key: string) => drafts.get(key) ?? '',
    setDraft(key: string, text: string) {
      if (text) drafts.set(key, text)
      else drafts.delete(key)
    },
    /** The top comments: their first page (the section came into view), or the next ("Show more") */
    loadTop: () => load(null),
    /** A comment's replies: the next page */
    loadReplies: (parentId: number) => load(parentId),
    /** Shows or hides a comment's replies; shown the first time, their first page is read */
    toggle(id: number) {
      const open = !state.open[id]
      set({ ...state, open: { ...state.open, [id]: open } })
      if (open && !threadOf(id).loaded && (state.comments[id]?.replyCount ?? 0) > 0) void load(id)
    },
    /** Writes a comment, or a reply to `parent`: a top one goes first, a reply last under the comment it went under (shown) */
    async post(content: string, parent?: Comment): Promise<Comment> {
      const made = await api.create({ articleId, content, ...(parent ? { parentId: parent.id } : {}) })
      const comments = { ...state.comments, [made.id]: made }
      if (made.parentId === null) {
        set({ ...state, comments, top: { ...state.top, ids: sorted([made.id, ...state.top.ids], true) } })
        return made
      }
      // (a reply to the last level went under that comment's parent)
      const under = made.parentId
      const before = comments[under]?.replyCount ?? 0
      if (comments[under]) comments[under] = { ...comments[under], replyCount: before + 1 }
      const thread = threadOf(under)
      // Its only reply: the list is known without reading it. Others not read yet: they are read now, with it
      const known = thread.loaded || before === 0
      const next = { ...state, comments, open: { ...state.open, [under]: true } }
      set(known ? withThread(next, under, { ...thread, ids: sorted([...thread.ids, made.id], false), loaded: true }) : next)
      if (!known) void load(under)
      return made
    },
    /** Changes a comment's text (its author) */
    async edit(id: number, content: string): Promise<Comment> {
      const changed = await api.update(id, { content })
      set({ ...state, comments: { ...state.comments, [id]: changed } })
      return changed
    },
    /** Deletes a comment and everything under it (a 404 means it was gone already: the same end); its parent has one reply less */
    async remove(comment: Comment) {
      try {
        await api.remove(comment.id)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) throw error
      }
      const gone = [comment.id, ...under(comment.id)]
      const comments = { ...state.comments }
      const replies = { ...state.replies }
      const open = { ...state.open }
      for (const id of gone) {
        delete comments[id]
        delete replies[id]
        delete open[id]
      }
      const parent = comment.parentId
      if (parent !== null && comments[parent]) comments[parent] = { ...comments[parent], replyCount: Math.max(0, comments[parent].replyCount - 1) }
      const thread = threadOf(parent)
      set(withThread({ ...state, comments, replies, open }, parent, { ...thread, ids: thread.ids.filter((id) => id !== comment.id) }))
    },
  }
}

export type CommentsStore = ReturnType<typeof createCommentsStore>

/** The comments store of an article page (made once), and what it holds now */
export function useCommentsStore(articleId: number): [CommentsStore, CommentsState] {
  const [store] = useState(() => createCommentsStore(articleId))
  return [store, useSyncExternalStore(store.subscribe, store.get)]
}
