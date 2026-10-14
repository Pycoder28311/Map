// Linking a board object to sidebar notes: while it is on, the sidebar's note rows show a link icon that links / unlinks
// the object. A tiny store (like features/select) so the editor and the sidebar, far apart in the tree, share it.
import { useSyncExternalStore } from 'react'
import { getBoard, updateObject } from '../board/boardStore'

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
