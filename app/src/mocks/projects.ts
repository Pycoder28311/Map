// MOCK DATA: fake maps and object cards in the shape the backend will return them. (Notes and projects are not here: they come
// from the server, resources/notes and resources/projects.)
// Replaced by API calls later; components only use the types and the find helpers.
import { getObjects } from './projectsStore'

export type ObjectKind = 'map' | 'object'

/** Each kind's name, as shown in menus and on cards */
export const KIND_LABEL: Record<ObjectKind, string> = {
  map: 'Map',
  object: 'Object card',
}

/**
 * Whether something is a note that can be linked to maps. Never, for now: notes come from the server and there is no link
 * route (plan 25, D5), so all the link code (features/links, link nodes, link picking) stays in place but dormant behind this.
 */
export const isNoteLike = (_kind?: string) => false

/**
 * One sidebar object (a map or an object card). All of them live in one flat list, in the order they are shown: moving one is
 * a change of its place in the list (like the Zen sidebar).
 */
export type MockObject = {
  id: string
  kind: ObjectKind
  name: string
  /** In the trash (hidden, restorable) */
  archived: boolean
  description?: string
  /** A map that is a branch (or has branches): the id of its branch group, the first map of it */
  branchOf?: string
  /** When it was made (ms since 1970): Sort by Newest / Oldest */
  createdAt: number
}

/** The seed: what the mock store (projectsStore.ts) starts from on every reload */
const SEED: { id: string; kind: ObjectKind; name: string; description?: string }[] = [
  { id: 'm1', kind: 'map', name: 'Parks overview' },
  { id: 'm2', kind: 'map', name: 'Playgrounds' },
  { id: 'm3', kind: 'map', name: 'North routes' },
  { id: 'm4', kind: 'map', name: 'South routes' },
  { id: 'm5', kind: 'map', name: 'Offices' },
  { id: 'o1', kind: 'object', name: 'Base camp', description: 'Where every route starts: parking, water and a hut.' },
  { id: 'o2', kind: 'object', name: 'Compass', description: 'The old brass one from the drawer.' },
]

// Seed dates: one day apart, the first on 1 Sep 2026
const DAY = 24 * 60 * 60 * 1000
export const SEED_OBJECTS: MockObject[] = SEED.map((o, i) => ({ ...o, archived: false, createdAt: Date.UTC(2026, 8, 1) + i * DAY }))

/** Any visible object (not archived) */
export const findObject = (id?: string) => getObjects().find((o) => o.id === id && !o.archived)

/** A visible map */
export const findMap = (id?: string) => {
  const object = findObject(id)
  return object?.kind === 'map' ? object : undefined
}
