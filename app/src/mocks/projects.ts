// MOCK DATA: fake projects, maps and object cards in the shape the backend will return them. (Notes are not here: they come
// from the server, resources/notes.)
// Replaced by API calls later; components only use the types and the find helpers.
import { getObjects, getProjects, isHidden } from './projectsStore'

export type ObjectKind = 'project' | 'map' | 'object'

/**
 * Whether an object of `kind` may sit in `parent` (null: the top level):
 * - a project only at the top level
 * - a map or an object card at the top level or in a project
 */
export function canPlace(kind: ObjectKind, parent: ObjectKind | null): boolean {
  if (parent === null) return true
  if (kind === 'project') return false
  // Nothing goes into a map or an object card
  return parent === 'project'
}

/** Each kind's name, as shown in menus and on cards */
export const KIND_LABEL: Record<ObjectKind, string> = {
  project: 'Project',
  map: 'Map',
  object: 'Object card',
}

/**
 * Whether something is a note that can be linked to projects and maps. Never, for now: notes come from the server and there is no link
 * route (plan 25, D5), so all the link code (features/links, link nodes, link picking) stays in place but dormant behind this.
 */
export const isNoteLike = (_kind?: string) => false

/**
 * One sidebar object. All of them live in one flat list in document order (a project, then its
 * children), each naming its parent: moving one is a single field change (like the Zen sidebar).
 */
export type MockObject = {
  id: string
  kind: ObjectKind
  name: string
  /** null: top level (projects, and the Objects section's objects) */
  parentId: string | null
  /** In the trash (hidden with everything under it, restorable) */
  archived: boolean
  description?: string
  /** A map that is a branch (or has branches): the id of its branch group, the first map of it */
  branchOf?: string
  /** When it was made (ms since 1970): Sort by Newest / Oldest */
  createdAt: number
}

/** A project's child (a map or an object card) */
export type MockMap = { id: string; name: string; kind: Exclude<ObjectKind, 'project'> }
/** A project with its (not archived) children: derived from the flat list */
export type MockProject = { id: string; name: string; description: string; maps: MockMap[] }

/** The seed: what the mock store (projectsStore.ts) starts from on every reload */
export const PROJECTS: { id: string; name: string; description: string; maps: { id: string; name: string }[] }[] = [
  {
    id: 'p1',
    name: 'City parks',
    description: 'Green spaces and playgrounds across the city.',
    maps: [
      { id: 'm1', name: 'Parks overview' },
      { id: 'm2', name: 'Playgrounds' },
    ],
  },
  {
    id: 'p2',
    name: 'Hiking trails',
    description: 'Mountain routes with difficulty and length.',
    maps: [
      { id: 'm3', name: 'North routes' },
      { id: 'm4', name: 'South routes' },
    ],
  },
  {
    id: 'p3',
    name: 'Office locations',
    description: 'Where the team works.',
    maps: [{ id: 'm5', name: 'Offices' }],
  },
]

/** More seed objects, so every kind of card shows up: in Hiking trails and at the top level */
const EXTRAS: { id: string; kind: ObjectKind; name: string; parentId: string | null; description?: string }[] = [
  { id: 'o1', kind: 'object', name: 'Base camp', parentId: 'p2', description: 'Where every route starts: parking, water and a hut.' },
  { id: 'o2', kind: 'object', name: 'Compass', parentId: null, description: 'The old brass one from the drawer.' },
]

const base = { archived: false }
// Seed dates: one day apart, the first on 1 Sep 2026
const DAY = 24 * 60 * 60 * 1000
let seedIndex = 0
const stamp = () => ({ createdAt: Date.UTC(2026, 8, 1) + seedIndex++ * DAY })

/** The seed as one flat list: each project followed by its children, then the top-level objects */
export const SEED_OBJECTS: MockObject[] = [
  ...PROJECTS.flatMap((p): MockObject[] => [
    { ...base, ...stamp(), id: p.id, kind: 'project', name: p.name, description: p.description, parentId: null },
    ...p.maps.map((m): MockObject => ({ ...base, ...stamp(), id: m.id, kind: 'map', name: m.name, parentId: p.id })),
    ...EXTRAS.filter((e) => e.parentId === p.id).map((e): MockObject => ({ ...base, ...stamp(), ...e })),
  ]),
  ...EXTRAS.filter((e) => e.parentId === null).map((e): MockObject => ({ ...base, ...stamp(), ...e })),
]

// Read the store, so they see created / renamed / moved items
export const findProject = (id?: string) => getProjects().find((p) => p.id === id)

/** A map (or any non-project object), with its project if it has one */
export const findMap = (id?: string) => {
  const object = findObject(id)
  if (!object || object.kind === 'project') return undefined
  return { ...object, project: findProject(object.parentId ?? undefined) }
}

/** Any visible object (not archived, nor under an archived one, at any depth) */
export const findObject = (id?: string) => {
  const objects = getObjects()
  const object = objects.find((o) => o.id === id)
  return object && !isHidden(objects, object) ? object : undefined
}
