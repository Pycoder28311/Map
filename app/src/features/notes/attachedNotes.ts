// Notes attached to one thing (docs/plans/38): a map (or a node of it) or an article. The note keeps it (attachedType / attachedId /
// attachedNode); one list per page reads a thing's notes once, and attaching, moving or detaching is one update of the note, which
// the lists on screen follow without reading again. Deleting the thing never changes its notes.
import { PAGE_SIZE_MAX } from '@map/shared'
import { useEffect } from 'react'
import { localStore } from '../../lib/localStore'
import { actionsOf, useResourceList } from '../../lib/resource/hooks'
import { resourceByName } from '../../resources/registry'

export type Note = Record<string, unknown> & { id: number | string; attachedType?: string | null; attachedId?: number | null; attachedNode?: number | null }

/** What a note is attached to: a map (with `node`: one of its nodes) or an article */
export type AttachTarget = { type: 'map'; id: number; node?: number | null } | { type: 'article'; id: number }

export const notesResource = () => resourceByName('notes')!

/** The note's fields that say it is attached to `target` (null: to nothing) */
export const attachFields = (target: AttachTarget | null) =>
  target
    ? { attachedType: target.type, attachedId: target.id, attachedNode: target.type === 'map' ? (target.node ?? null) : null }
    : { attachedType: null, attachedId: null, attachedNode: null }

/** Whether the note is attached to exactly this (a map's own notes have no node) */
export const isAttachedTo = (note: Note, target: AttachTarget) => {
  const fields = attachFields(target)
  return note.attachedType === fields.attachedType && note.attachedId === fields.attachedId && (note.attachedNode ?? null) === fields.attachedNode
}

/** Attaches the note to `target` (it leaves wherever it was: one thing at a time), or to nothing */
export const attachNote = (noteId: number | string, target: AttachTarget | null) => actionsOf(notesResource()).update(noteId, attachFields(target) as never)

/** The notes attached to a map (its own and every node's) or to an article: one request, when `enabled` */
export function useAttachedNotes(target: { type: 'map' | 'article'; id: number }, enabled = true) {
  return useResourceList(notesResource(), { filter: { attachedType: target.type, attachedId: target.id }, limit: PAGE_SIZE_MAX, enabled })
}

/** The notes of each node of a map (key: the node's id; the map's own under `null`) */
export function byNode(notes: Note[]): Map<number | null, Note[]> {
  const groups = new Map<number | null, Note[]>()
  for (const note of notes) {
    const node = note.attachedNode ?? null
    groups.set(node, [...(groups.get(node) ?? []), note])
  }
  return groups
}

/* ─────────────── Before the server kept them: connections on this device, moved once ─────────────── */

type Connections = Record<string, string[]>
const check = (raw: unknown): Connections => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Connections = {}
  for (const [owner, ids] of Object.entries(raw)) if (Array.isArray(ids)) out[owner] = ids.filter((id): id is string => typeof id === 'string')
  return out
}
// The keys the article's and the map's Notes used on this device (docs/plans/32 and the map's Notes button)
const LOCAL = { article: localStore<Connections>('map:article-notes', {}, check), map: localStore<Connections>('map:map-notes', {}, check) }

/** Notes this device connected to an article or a map before the server kept it: each attached there now (one update each), then forgotten here */
export async function moveLocalNotes(type: 'article' | 'map', id: number) {
  const store = LOCAL[type]
  const all = store.get()
  const ids = all[String(id)]
  if (!ids?.length) return
  const rest = { ...all }
  delete rest[String(id)]
  store.set(rest)
  // A note deleted since, or someone else's, just fails: nothing to move
  await Promise.allSettled(ids.map((noteId) => attachNote(noteId, type === 'map' ? { type, id, node: null } : { type, id })))
}

/** Runs moveLocalNotes once when the page of that article or map opens */
export function useMoveLocalNotes(type: 'article' | 'map', id: number) {
  useEffect(() => {
    void moveLocalNotes(type, id)
  }, [type, id])
}
