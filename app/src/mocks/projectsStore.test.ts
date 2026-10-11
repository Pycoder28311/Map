// MOCK DATA tests: deleted together with projectsStore.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { findMap, findObject } from './projects'
import {
  archiveObject,
  createMap,
  createNote,
  createProject,
  deleteObject,
  duplicateObject,
  emptyTrash,
  getArchived,
  getObjects,
  getPins,
  getProjects,
  moveObject,
  renameObject,
  reorderPinned,
  resetMockProjects,
  restoreObject,
  togglePin,
} from './projectsStore'

const project = (id: string) => getProjects().find((p) => p.id === id)!
const mapIds = (projectId: string) => project(projectId).maps.map((m) => m.id)
const order = () => getObjects().map((o) => o.id)

beforeEach(resetMockProjects)

describe('projectsStore', () => {
  it('derives projects with their children from the flat list', () => {
    expect(getProjects().map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect(mapIds('p1')).toEqual(['m1', 'm2'])
    expect(getProjects()).toBe(getProjects()) // same snapshot, same array
  })

  it('creates projects, maps (as last child) and notes', () => {
    const p = createProject('New')
    expect(getProjects().at(-1)).toMatchObject({ id: p, name: 'New', maps: [] })
    const m = createMap('p1', 'Third')!
    expect(mapIds('p1')).toEqual(['m1', 'm2', m])
    expect(order().indexOf(m)).toBe(order().indexOf('m2') + 1)
    expect(createMap('nope', 'x')).toBeUndefined()
    const n = createNote('Groceries')
    expect(findObject(n)).toMatchObject({ kind: 'note', parentId: null, locked: true, draggable: true })
  })

  it('renames', () => {
    renameObject('p1', 'Parks')
    renameObject('m3', 'North')
    expect(project('p1').name).toBe('Parks')
    expect(findMap('m3')?.name).toBe('North')
  })

  it('duplicates a project after its subtree, with copied children', () => {
    duplicateObject('p1')
    const copy = getProjects()[1]
    expect(copy.name).toBe('City parks (copy)')
    expect(copy.maps.map((m) => m.name)).toEqual(['Parks overview', 'Playgrounds'])
    expect(copy.maps.some((m) => mapIds('p1').includes(m.id))).toBe(false)
  })

  it('duplicates a map after the original', () => {
    duplicateObject('m1')
    expect(project('p1').maps.map((m) => m.name)).toEqual(['Parks overview', 'Parks overview (copy)', 'Playgrounds'])
  })

  it('moves into a project, before a sibling, and to the top level', () => {
    moveObject('m1', { parentId: 'p3' })
    expect(mapIds('p1')).toEqual(['m2'])
    expect(mapIds('p3')).toEqual(['m5', 'm1'])
    moveObject('n1', { parentId: 'p3', beforeId: 'm5' })
    expect(mapIds('p3')).toEqual(['n1', 'm5', 'm1'])
    moveObject('m1', { parentId: null })
    expect(findObject('m1')?.parentId).toBeNull()
    expect(order().at(-1)).toBe('m1')
    // a project moves with its children
    moveObject('p3', { parentId: null, beforeId: 'p1' })
    expect(order().slice(0, 3)).toEqual(['p3', 'n1', 'm5'])
  })

  it('refuses a move into its own subtree', () => {
    const before = getObjects()
    moveObject('p1', { parentId: 'm1' })
    expect(getObjects()).toBe(before)
  })

  it('pins in pin order and unpins', () => {
    togglePin('m3')
    togglePin('n2')
    expect(getPins()).toEqual(['m3', 'n2'])
    togglePin('m3')
    expect(getPins()).toEqual(['n2'])
  })

  it('reorders pins (pinning when needed)', () => {
    togglePin('m3')
    togglePin('n2')
    reorderPinned('p1', 'n2')
    expect(getPins()).toEqual(['m3', 'p1', 'n2'])
    reorderPinned('m3', null)
    expect(getPins()).toEqual(['p1', 'n2', 'm3'])
  })

  it('archives (hiding the subtree) and restores', () => {
    archiveObject('p1')
    expect(getProjects().map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(findObject('m1')).toBeUndefined()
    expect(getArchived().map((o) => o.id)).toEqual(['p1'])
    restoreObject('p1')
    expect(mapIds('p1')).toEqual(['m1', 'm2'])
    expect(getArchived()).toEqual([])
  })

  it('empties the trash for good', () => {
    archiveObject('p2')
    archiveObject('n1')
    emptyTrash()
    expect(getObjects().some((o) => ['p2', 'm3', 'm4', 'n1'].includes(o.id))).toBe(false)
    expect(getArchived()).toEqual([])
  })

  it('deletes with the subtree and its pins', () => {
    togglePin('m1')
    deleteObject('p1')
    expect(getProjects().map((p) => p.id)).toEqual(['p2', 'p3'])
    expect(findObject('m1')).toBeUndefined()
    expect(getPins()).toEqual([])
  })

  it('leaves the snapshot unchanged for unknown ids', () => {
    const before = getObjects()
    renameObject('nope', 'x')
    duplicateObject('nope')
    moveObject('nope', { parentId: null })
    moveObject('m1', { parentId: 'nope' })
    deleteObject('nope')
    expect(getObjects()).toBe(before)
  })
})
