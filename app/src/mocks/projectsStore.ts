// MOCK DATA: in-memory create / rename / duplicate / move / pin / archive / delete of the mock
// sidebar objects (projects, maps, notes). Nothing is saved: a reload starts again from the seed data.
// Replaced by API calls later (same function names, async then); the UI only uses what's exported here.
import { useSyncExternalStore } from 'react'
import { isNoteLike, SEED_OBJECTS, type MockMap, type MockObject, type MockProject } from './projects'

type State = {
  /** Flat, in document order (a project, then its children) */
  objects: MockObject[]
  /** Pinned object ids, in pin order */
  pins: string[]
  /** Notes linked to projects / maps (many-to-many; nothing moves) */
  links: Link[]
}

/** A note linked to a project or map */
export type Link = { noteId: string; targetId: string }

// Copied from the seed on first use (not at import: projects.ts imports this file too)
let state: State | null = null
const listeners = new Set<() => void>()

// New ids never clash with the seed's (p1…, m1…, n1…)
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

/* ─────────────── Tree helpers (flat list, like the Zen sidebar's) ─────────────── */

/** Every id in an object's subtree, itself included */
export function subtreeIds(objects: MockObject[], id: string) {
  const ids = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const o of objects) {
      if (o.parentId && ids.has(o.parentId) && !ids.has(o.id)) {
        ids.add(o.id)
        grew = true
      }
    }
  }
  return ids
}

/** Archived, or under an archived object */
export function isHidden(objects: MockObject[], object: MockObject) {
  for (let o: MockObject | undefined = object; o; o = objects.find((p) => p.id === o!.parentId)) {
    if (o.archived) return true
  }
  return false
}

// Index just past a parent's last descendant (where a new last child goes)
function endOfSubtree(objects: MockObject[], parentId: string) {
  const ids = subtreeIds(objects, parentId)
  let last = objects.findIndex((o) => o.id === parentId)
  for (let i = last + 1; i < objects.length && ids.has(objects[i].id); i++) last = i
  return last + 1
}

/* ─────────────── Hooks ─────────────── */

/** All objects; re-renders on every change */
export const useMockObjects = () => useSyncExternalStore(subscribe, getObjects)
export const usePins = () => useSyncExternalStore(subscribe, getPins)
export const useLinks = () => useSyncExternalStore(subscribe, getLinks)

// Projects with their children, derived once per change
let derived: { from: MockObject[]; projects: MockProject[] } | null = null

/** The visible projects with their visible children (the shape pages and panels use) */
export function getProjects(): MockProject[] {
  const objects = getObjects()
  if (derived?.from === objects) return derived.projects
  const visible = objects.filter((o) => !isHidden(objects, o))
  const projects = visible
    .filter((o) => o.kind === 'project')
    .map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? '',
      maps: visible
        .filter((o) => o.parentId === p.id && o.kind !== 'project')
        .map((o) => ({ id: o.id, name: o.name, kind: o.kind as MockMap['kind'] })),
    }))
  derived = { from: objects, projects }
  return projects
}

/** The visible projects; re-renders on every change */
export const useMockProjects = () => useSyncExternalStore(subscribe, getProjects)

/* ─────────────── Changes ─────────────── */

const has = (id: string) => getObjects().some((o) => o.id === id)

function add(object: MockObject) {
  const objects = getObjects()
  const at = object.parentId ? endOfSubtree(objects, object.parentId) : objects.length
  set({ objects: [...objects.slice(0, at), object, ...objects.slice(at)] })
  return object.id
}

const fresh = { draggable: true, archived: false }

export const createProject = (name: string) =>
  add({ ...fresh, id: newId('project'), kind: 'project', name, description: '', parentId: null, locked: false })

export function createMap(projectId: string, name: string) {
  if (!has(projectId)) return undefined
  return add({ ...fresh, id: newId('map'), kind: 'map', name, parentId: projectId, locked: true })
}

export const createNote = (name: string, text?: string) =>
  add({ ...fresh, id: newId('note'), kind: 'note', name, text, parentId: null, locked: true })

export const createArticle = (name: string, text?: string) =>
  add({ ...fresh, id: newId('article'), kind: 'article', name, text, parentId: null, locked: true })

export function renameObject(id: string, name: string) {
  if (!has(id)) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, name } : o)) })
}

/** A copy of the object and everything under it (new ids) right after it; the copy is named "(copy)" */
export function duplicateObject(id: string) {
  const objects = getObjects()
  const object = objects.find((o) => o.id === id)
  if (!object) return
  const ids = subtreeIds(objects, id)
  const newIds = new Map([...ids].map((old) => [old, newId(objects.find((o) => o.id === old)!.kind)]))
  const copies = objects
    .filter((o) => ids.has(o.id))
    .map((o) => ({
      ...o,
      id: newIds.get(o.id)!,
      name: o.id === id ? `${o.name} (copy)` : o.name,
      parentId: o.id === id ? o.parentId : newIds.get(o.parentId!)!,
    }))
  const at = endOfSubtree(objects, id)
  set({ objects: [...objects.slice(0, at), ...copies, ...objects.slice(at)] })
}

/**
 * Moves an object (with everything under it) to a new parent (null: top level), just before
 * `beforeId` if given (a sibling there), else at the end of that parent's children
 */
export function moveObject(id: string, to: { parentId: string | null; beforeId?: string | null }) {
  const objects = getObjects()
  if (!has(id) || (to.parentId && !has(to.parentId))) return
  const ids = subtreeIds(objects, id)
  if (to.parentId && ids.has(to.parentId)) return // not into itself
  if (to.beforeId && ids.has(to.beforeId)) return
  const moved = objects.filter((o) => ids.has(o.id)).map((o) => (o.id === id ? { ...o, parentId: to.parentId } : o))
  const rest = objects.filter((o) => !ids.has(o.id))
  let at = to.beforeId ? rest.findIndex((o) => o.id === to.beforeId) : -1
  if (at === -1) at = to.parentId ? endOfSubtree(rest, to.parentId) : rest.length
  set({ objects: [...rest.slice(0, at), ...moved, ...rest.slice(at)] })
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

/** Into the trash: hidden with everything under it, restorable */
export function archiveObject(id: string) {
  const object = getObjects().find((o) => o.id === id)
  if (!object || object.archived) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, archived: true } : o)) })
}

/** Out of the trash, back where it was (a project with its children) */
export function restoreObject(id: string) {
  const object = getObjects().find((o) => o.id === id)
  if (!object?.archived) return
  set({ objects: getObjects().map((o) => (o.id === id ? { ...o, archived: false } : o)) })
}

/** What's in the trash (the archived objects themselves, not what's under them) */
export const getArchived = () => getObjects().filter((o) => o.archived)

/** Deletes everything in the trash */
export function emptyTrash() {
  const objects = getObjects()
  const ids = new Set(getArchived().flatMap((o) => [...subtreeIds(objects, o.id)]))
  if (ids.size === 0) return
  set({ objects: objects.filter((o) => !ids.has(o.id)), pins: getPins().filter((p) => !ids.has(p)), links: withoutLinksOf(ids) })
}

/** Deletes an object and everything under it (and their pins) */
export function deleteObject(id: string) {
  const objects = getObjects()
  if (!has(id)) return
  const ids = subtreeIds(objects, id)
  set({ objects: objects.filter((o) => !ids.has(o.id)), pins: getPins().filter((p) => !ids.has(p)), links: withoutLinksOf(ids) })
}

/* ─────────────── Links ─────────────── */

const visibleById = (id: string) => {
  const objects = getObjects()
  const object = objects.find((o) => o.id === id)
  return object && !isHidden(objects, object) ? object : undefined
}

/** Whether a note may be linked to a target: a visible note or article, a visible project or map, not linked yet */
export function canLink(noteId: string, targetId: string) {
  const note = visibleById(noteId)
  const target = visibleById(targetId)
  if (!isNoteLike(note?.kind) || !target || isNoteLike(target.kind)) return false
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
