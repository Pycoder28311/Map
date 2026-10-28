// Which notes are connected to which article (docs/plans/32): note ids by article id, on this device until the server keeps it. The
// notes themselves are the real ones (read, edited, made and deleted through their API); only the connection is here.
import { localStore, useLocalStore } from '../../../lib/localStore'

type Connections = Record<string, string[]>

const check = (raw: unknown): Connections => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Connections = {}
  for (const [article, ids] of Object.entries(raw)) if (Array.isArray(ids)) out[article] = ids.filter((id): id is string => typeof id === 'string')
  return out
}

export const articleNotesStore = localStore<Connections>('map:article-notes', {}, check)

const NONE: string[] = []

export function connectNote(articleId: string, noteId: string, connected: boolean) {
  const all = articleNotesStore.get()
  const ids = (all[articleId] ?? []).filter((id) => id !== noteId)
  articleNotesStore.set({ ...all, [articleId]: connected ? [noteId, ...ids] : ids })
}

/** The notes connected to the article (newest connection first), and the ways to change them */
export function useArticleNotes(articleId: string) {
  const ids = useLocalStore(articleNotesStore, (all) => all[articleId] ?? NONE)
  return {
    ids,
    connect: (noteId: string) => connectNote(articleId, noteId, true),
    disconnect: (noteId: string) => connectNote(articleId, noteId, false),
  }
}
