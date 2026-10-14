// MOCK DATA: fake projects, maps and notes in the shape the backend will return them.
// Replaced by API calls later; components only use the types and the find helpers.
import { getObjects, getProjects, isHidden } from './projectsStore'

export type ObjectKind = 'project' | 'map' | 'note' | 'article' | 'object' | 'folder'

/**
 * Whether an object of `kind` may sit in `parent` (null: the top level):
 * - a project only at the top level; a folder at the top level or in a project
 * - an article anywhere: the top level, a project or a folder (folders hold articles only)
 * - a map, a note or an object card at the top level or in a project
 */
export function canPlace(kind: ObjectKind, parent: ObjectKind | null): boolean {
  if (parent === null) return true
  if (kind === 'project') return false
  if (parent === 'folder') return kind === 'article'
  // Nothing goes into a map, note, article or object card
  return parent === 'project'
}

/** Each kind's name, as shown in menus and on cards */
export const KIND_LABEL: Record<ObjectKind, string> = {
  project: 'Project',
  map: 'Map',
  note: 'Note',
  article: 'Article',
  object: 'Object card',
  folder: 'Folder',
}

/** Notes and articles: leaves that can be linked to projects and maps (they behave the same) */
export const isNoteLike = (kind?: string) => kind === 'note' || kind === 'article'

/**
 * One sidebar object. All of them live in one flat list in document order (a project, then its
 * children), each naming its parent: moving one is a single field change (like the Zen sidebar).
 */
/** One line of a checklist note */
export type ChecklistItem = { id: string; text: string; done: boolean }

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
  /** A note's or article's text */
  text?: string
  /** A note in checklist mode: its items (an empty list is an empty checklist); undefined: plain text */
  items?: ChecklistItem[]
  /** A map that is a branch (or has branches): the id of its branch group, the first map of it */
  branchOf?: string
  /** When it was made (ms since 1970): Sort by Newest / Oldest */
  createdAt: number
  /** How many liked it (mock), and whether the user did */
  likes: number
  liked?: boolean
}

/** A project's child (a map, note, article, object card or folder) */
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

const SHOPPING: ChecklistItem[] = [
  { id: 'i1', text: 'Bread', done: false },
  { id: 'i2', text: 'Milk', done: true },
  { id: 'i3', text: 'Coffee', done: false },
]

/** Notes: objects without a parent (the sidebar's Notes section) */
export const NOTES = [
  { id: 'n1', name: 'Shopping list' },
  { id: 'n2', name: 'Ideas' },
  { id: 'n3', name: 'Meeting notes' },
  { id: 'n4', name: 'Todo' },
]

/** More seed objects, so every kind of card shows up: in Hiking trails and at the top level */
const EXTRAS: { id: string; kind: ObjectKind; name: string; parentId: string | null; description?: string; text?: string }[] = [
  { id: 'o1', kind: 'object', name: 'Base camp', parentId: 'p2', description: 'Where every route starts: parking, water and a hut.' },
  { id: 'f1', kind: 'folder', name: 'Guides', parentId: 'p2' },
  { id: 'a1', kind: 'article', name: 'Choosing boots', parentId: 'f1', text: 'Stiff soles for rock, soft for forest paths.' },
  { id: 'a2', kind: 'article', name: 'Reading the weather', parentId: 'f1', text: 'Clouds building after noon mean turning back.' },
  { id: 'a3', kind: 'article', name: 'Trail markings', parentId: 'f1', text: 'Red and white means the main route.' },
  { id: 'a4', kind: 'article', name: 'First aid kit', parentId: 'f1', text: 'Plasters, a bandage, a foil blanket.' },
  { id: 'a5', kind: 'article', name: 'Night hiking', parentId: 'f1', text: 'A head torch and a spare battery.' },
  { id: 'o2', kind: 'object', name: 'Compass', parentId: null, description: 'The old brass one from the drawer.' },
  { id: 'a6', kind: 'article', name: 'Packing tips', parentId: null, text: 'Heavy things close to the back.' },
]

const base = { draggable: true, archived: false }
// Seed dates: one day apart, the first on 1 Sep 2026; likes: a spread of counts
const DAY = 24 * 60 * 60 * 1000
let seedIndex = 0
const stamp = () => {
  const i = seedIndex++
  return { createdAt: Date.UTC(2026, 8, 1) + i * DAY, likes: (i * 7) % 23 }
}
// Containers take drops into them; the rest never do
const lockedFor = (kind: ObjectKind) => kind !== 'project' && kind !== 'folder'

/** The seed as one flat list: each project followed by its children, then the top-level objects */
export const SEED_OBJECTS: MockObject[] = [
  ...PROJECTS.flatMap((p): MockObject[] => [
    { ...base, ...stamp(), id: p.id, kind: 'project', name: p.name, description: p.description, parentId: null, locked: false },
    ...p.maps.map((m): MockObject => ({ ...base, ...stamp(), id: m.id, kind: 'map', name: m.name, parentId: p.id, locked: true })),
    ...EXTRAS.filter((e) => e.parentId === p.id).flatMap((e): MockObject[] => [
      { ...base, ...stamp(), ...e, locked: lockedFor(e.kind) },
      ...EXTRAS.filter((c) => c.parentId === e.id).map((c): MockObject => ({ ...base, ...stamp(), ...c, locked: lockedFor(c.kind) })),
    ]),
  ]),
  ...NOTES.map((n): MockObject => ({ ...base, ...stamp(), id: n.id, kind: 'note', name: n.name, parentId: null, locked: true, ...(n.id === 'n1' ? { items: SHOPPING } : {}) })),
  ...EXTRAS.filter((e) => e.parentId === null).map((e): MockObject => ({ ...base, ...stamp(), ...e, locked: lockedFor(e.kind) })),
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
