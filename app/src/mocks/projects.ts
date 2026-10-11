// MOCK DATA: fake projects, maps and notes in the shape the backend will return them.
// Replaced by API calls later; components only use the types and the find helpers.
import { getObjects, getProjects } from './projectsStore'

export type ObjectKind = 'project' | 'map' | 'note'

/**
 * One sidebar object. All of them live in one flat list in document order (a project, then its
 * children), each naming its parent: moving one is a single field change (like the Zen sidebar).
 */
export type MockObject = {
  id: string
  kind: ObjectKind
  name: string
  /** null: top level (projects, and the Notes section's objects) */
  parentId: string | null
  /** Can be picked up and dragged (in the sidebar and onto panes) */
  draggable: boolean
  /** Never takes a drop into it */
  locked: boolean
  /** In the trash (hidden with everything under it, restorable) */
  archived: boolean
  description?: string
}

/** A project's child (a map, or a note moved into it) */
export type MockMap = { id: string; name: string; kind: 'map' | 'note' }
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

/** Notes: objects without a parent (the sidebar's Notes section) */
export const NOTES = [
  { id: 'n1', name: 'Shopping list' },
  { id: 'n2', name: 'Ideas' },
  { id: 'n3', name: 'Meeting notes' },
  { id: 'n4', name: 'Todo' },
]

const base = { draggable: true, archived: false }

/** The seed as one flat list: each project followed by its maps, then the notes */
export const SEED_OBJECTS: MockObject[] = [
  ...PROJECTS.flatMap((p): MockObject[] => [
    { ...base, id: p.id, kind: 'project', name: p.name, description: p.description, parentId: null, locked: false },
    ...p.maps.map((m): MockObject => ({ ...base, id: m.id, kind: 'map', name: m.name, parentId: p.id, locked: true })),
  ]),
  ...NOTES.map((n): MockObject => ({ ...base, id: n.id, kind: 'note', name: n.name, parentId: null, locked: true })),
]

// Read the store, so they see created / renamed / moved items
export const findProject = (id?: string) => getProjects().find((p) => p.id === id)

/** A map (or any non-project object), with its project if it has one */
export const findMap = (id?: string) => {
  const object = findObject(id)
  if (!object || object.kind === 'project') return undefined
  return { ...object, project: findProject(object.parentId ?? undefined) }
}

/** Any visible object (not archived, nor under an archived one) */
export const findObject = (id?: string) => {
  const objects = getObjects()
  const object = objects.find((o) => o.id === id)
  if (!object || object.archived) return undefined
  const parent = object.parentId ? objects.find((o) => o.id === object.parentId) : undefined
  return parent?.archived ? undefined : object
}
