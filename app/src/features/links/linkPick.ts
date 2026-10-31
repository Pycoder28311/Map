// Linking a board object to sidebar items: while it is on, the sidebar stays open so its rows can be picked. A tiny store (like
// features/select) so the editor and the sidebar, far apart in the tree, share it. Other items are links in the map's file; a note
// is attached to the node instead (one thing at a time, kept by the note: docs/plans/38).
import { useSyncExternalStore } from 'react'
import { getBoard, updateObject } from '../board/boardStore'
import { attachNote, isAttachedTo, type Note } from '../notes/attachedNotes'

export type LinkPick = { mapId: string; objectId: number }

let target: LinkPick | null = null
const listeners = new Set<() => void>()

function set(next: LinkPick | null) {
  target = next
  listeners.forEach((listener) => listener())
}

export function subscribeLinkPick(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const getLinkPick = () => target
export const useLinkPick = () => useSyncExternalStore(subscribeLinkPick, getLinkPick)

/** Starts picking for this object (replacing any other) */
export function startLinkPick(next: LinkPick) {
  if (!target || target.mapId !== next.mapId || target.objectId !== next.objectId) set({ ...next })
}

export function stopLinkPick() {
  if (target) set(null)
}

/** Whether the object is linked to the sidebar object */
export function isLinked(mapId: string, objectId: number, id: string) {
  return !!getBoard(mapId).objects.find((o) => o.id === objectId)?.links.some((l) => l.to === 'sidebar' && l.id === id)
}

/** Links the board object to the sidebar object, or removes that link if it was there. One undo step */
export function toggleSidebarLink(mapId: string, objectId: number, id: string) {
  const object = getBoard(mapId).objects.find((o) => o.id === objectId)
  if (!object) return
  const linked = object.links.some((l) => l.to === 'sidebar' && l.id === id)
  updateObject(mapId, objectId, {
    links: linked ? object.links.filter((l) => !(l.to === 'sidebar' && l.id === id)) : [...object.links, { to: 'sidebar', id }],
  })
}

/* ─────────────── Notes (docs/plans/38): a note is attached to the node itself, not linked in the file ─────────────── */

/** Whether the note is attached to this node of the map */
export const isNoteLinked = (mapId: string, objectId: number, note: Note) => isAttachedTo(note, { type: 'map', id: Number(mapId), node: objectId })

/** Attaches the note to the node (it leaves wherever it was: one thing at a time), or detaches it when it was this node's. One update of the note, not an undo step of the map */
export function toggleNoteLink(mapId: string, objectId: number, note: Note) {
  return attachNote(note.id, isNoteLinked(mapId, objectId, note) ? null : { type: 'map', id: Number(mapId), node: objectId })
}
