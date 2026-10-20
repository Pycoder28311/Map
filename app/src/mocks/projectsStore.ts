// MOCK DATA: in-memory create / rename / duplicate / move / pin / archive / delete of the mock
// sidebar objects (maps, object cards). Nothing is saved: a reload starts again from the seed data.
// Replaced by API calls later (same function names, async then); the UI only uses what's exported here.
import { useSyncExternalStore } from 'react'
import { copyBoard, dropBoard } from '../features/board/boardStore'
import { isNoteLike, SEED_OBJECTS, type MockObject, type ObjectKind } from './projects'

type State = {
  /** Flat, in the order they are shown */
  objects: MockObject[]
  /** Pinned object ids, in pin order */
  pins: string[]
  /** Notes linked to maps / object cards (many-to-many; nothing moves) */
  links: Link[]
}

/** A note linked to a map or object card */
export type Link = { noteId: string; targetId: string }

// Copied from the seed on first use (not at import: projects.ts imports this file too)
let state: State | null = null
const listeners = new Set<() => void>()

// New ids never clash with the seed's (m1…, o1…)
let nextId = 101
const newId = (kind: MockObject['kind']) => `${kind[0]}${nextId++}`

const seed = (): State => ({ objects: structuredClone(SEED_OBJECTS), pins: [], links: [] })
const getState = () => (state ??= seed())

function set(next: Partial<State>) {
  state = { ...getState(), ...next }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** All objects, archived ones included (a new array after every change) */
export const getObjects = () => getState().objects
export const getPins = () => getState().pins
export const getLinks = () => getState().links

/** Archived (hidden from every list, restorable) */
export const isHidden = (object: MockObject) => object.archived

/* ─────────────── Hooks ─────────────── */

/** All objects; re-renders on every change */
export const useMockObjects = () => useSyncExternalStore(subscribe, getObjects)
export const usePins = () => useSyncExternalStore(subscribe, getPins)
export const useLinks = () => useSyncExternalStore(subscribe, getLinks)

/* ─────────────── Changes ─────────────── */

const has = (id: string) => getObjects().some((o) => o.id === id)

// A new object: made now
const fresh = () => ({ archived: false, createdAt: Date.now() })

/** A new object of any kind: last in the list, or with `first` before the others (e.g. created from a Dashboard row). Returns its id. */
export function createObjectOf(kind: ObjectKind, name: string, { description, first = false }: { description?: string; first?: boolean } = {}) {
  const object: MockObject = { ...fresh(), id: newId(kind), kind, name, description }
  const objects = getObjects()
  set({ objects: first ? [object, ...objects] : [...objects, object] })
  return object.id
}

export function renameObject(id: string, name: string) {
  if (!has(id)) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, name } : o)) })
}

/** A copy of the object right after it, named "(copy)" (new id) */
export function duplicateObject(id: string) {
  const objects = getObjects()
  const at = objects.findIndex((o) => o.id === id)
  if (at === -1) return
  const object = objects[at]
  const copy: MockObject = { ...object, id: newId(object.kind), name: `${object.name} (copy)`, ...fresh() }
  set({ objects: [...objects.slice(0, at + 1), copy, ...objects.slice(at + 1)] })
  // A copied map opens with what is drawn on the original
  if (object.kind === 'map') copyBoard(object.id, copy.id)
}

/** The next object after `id` */
const nextSibling = (id: string) => {
  const objects = getObjects()
  return objects[objects.findIndex((o) => o.id === id) + 1]
}

/**
 * A branch of a map, like a branch of a chat: a copy of it, with everything drawn on it, next to it. They keep to one
 * branch group (`branchOf`). Returns the new map's id (undefined for anything that is not a visible map).
 */
export function createBranch(mapId: string, name: string) {
  const map = getObjects().find((o) => o.id === mapId)
  if (!map || map.kind !== 'map' || map.archived) return undefined
  const root = map.branchOf ?? map.id
  const before = nextSibling(mapId)
  const id = createObjectOf('map', name)
  if (before) moveObject(id, { beforeId: before.id })
  set({ objects: getObjects().map((o) => (o.id === id || o.id === mapId ? { ...o, branchOf: root } : o)) })
  copyBoard(mapId, id)
  return id
}

/** Moves an object just before `beforeId` if given, else to the end of the list */
export function moveObject(id: string, to: { beforeId?: string | null }) {
  const objects = getObjects()
  const object = objects.find((o) => o.id === id)
  if (!object || to.beforeId === id) return
  const rest = objects.filter((o) => o.id !== id)
  const at = to.beforeId ? rest.findIndex((o) => o.id === to.beforeId) : -1
  set({ objects: at === -1 ? [...rest, object] : [...rest.slice(0, at), object, ...rest.slice(at)] })
}

/**
 * Puts these objects in this order, in the places they hold now (the others stay where they are): e.g. a sorted Dashboard row made
 * its manual order, a presenter's reordered maps, or an undo
 */
export function reorderObjects(ids: string[]) {
  const objects = getObjects()
  const byId = new Map(objects.map((o) => [o.id, o]))
  const known = ids.filter((id) => byId.has(id))
  const slots = objects.flatMap((o, i) => (known.includes(o.id) ? [i] : []))
  const next = [...objects]
  slots.forEach((slot, i) => (next[slot] = byId.get(known[i])!))
  set({ objects: next })
}

export function togglePin(id: string) {
  if (!has(id)) return
  const pins = getPins()
  set({ pins: pins.includes(id) ? pins.filter((p) => p !== id) : [...pins, id] })
}

/** Pins it (if it isn't yet) just before `beforeId` among the pins, or last */
export function reorderPinned(id: string, beforeId: string | null) {
  if (!has(id) || id === beforeId) return
  const pins = getPins().filter((p) => p !== id)
  const at = beforeId ? pins.indexOf(beforeId) : -1
  set({ pins: at === -1 ? [...pins, id] : [...pins.slice(0, at), id, ...pins.slice(at)] })
}

/** Into the trash: hidden, restorable */
export function archiveObject(id: string) {
  const object = getObjects().find((o) => o.id === id)
  if (!object || object.archived) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, archived: true } : o)) })
}

/** Out of the trash, back where it was */
export function restoreObject(id: string) {
  const object = getObjects().find((o) => o.id === id)
  if (!object?.archived) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, archived: false } : o)) })
}

/** What's in the trash */
export const getArchived = () => getObjects().filter((o) => o.archived)

/** Deletes everything in the trash */
export function emptyTrash() {
  const ids = new Set(getArchived().map((o) => o.id))
  if (ids.size === 0) return
  ids.forEach(dropBoard)
  set({ objects: getObjects().filter((o) => !ids.has(o.id)), pins: getPins().filter((p) => !ids.has(p)), links: withoutLinksOf(ids) })
}

/** Deletes an object (and its pin) */
export function deleteObject(id: string) {
  if (!has(id)) return
  const ids = new Set([id])
  dropBoard(id)
  set({ objects: getObjects().filter((o) => o.id !== id), pins: getPins().filter((p) => p !== id), links: withoutLinksOf(ids) })
}

/* ─────────────── Links ─────────────── */

const visibleById = (id: string) => {
  const object = getObjects().find((o) => o.id === id)
  return object && !isHidden(object) ? object : undefined
}

/** What notes can be linked to */
export const isLinkTarget = (kind?: string) => kind === 'map' || kind === 'object'

/** Whether a note may be linked to a target (dormant: notes are on the server now and have no link route, so this is never true) */
export function canLink(noteId: string, targetId: string) {
  const note = visibleById(noteId)
  const target = visibleById(targetId)
  if (!isNoteLike(note?.kind) || !target || !isLinkTarget(target.kind)) return false
  return !getLinks().some((l) => l.noteId === noteId && l.targetId === targetId)
}

export function linkNote(noteId: string, targetId: string) {
  if (canLink(noteId, targetId)) set({ links: [...getLinks(), { noteId, targetId }] })
}

export function unlinkNote(noteId: string, targetId: string) {
  const links = getLinks()
  if (links.some((l) => l.noteId === noteId && l.targetId === targetId)) {
    set({ links: links.filter((l) => !(l.noteId === noteId && l.targetId === targetId)) })
  }
}

/** The visible objects linked to one: the notes linked to a target, or the targets of a note */
export function linksOf(id: string) {
  return getLinks()
    .flatMap((l) => (l.noteId === id ? [l.targetId] : l.targetId === id ? [l.noteId] : []))
    .map(visibleById)
    .filter((o): o is MockObject => o !== undefined)
}

/** The links left once these objects are gone */
const withoutLinksOf = (ids: Set<string>) => getLinks().filter((l) => !ids.has(l.noteId) && !ids.has(l.targetId))

/** Tests only: back to the seed data */
export function resetMockProjects() {
  state = seed()
  listeners.forEach((listener) => listener())
}
