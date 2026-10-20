// MOCK DATA tests: deleted together with projectsStore.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { canPlace, findMap, findObject } from './projects'
import {
  archiveObject,
  canLink,
  createMap,
  createBranch,
  createObjectOf,
  reorderChildren,
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

import { resetBoards } from '../features/board/boardStore'

beforeEach(() => {
  resetMockProjects()
  resetBoards()
})

describe('projectsStore', () => {
  it('derives projects with their children from the flat list', () => {
    expect(getProjects().map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
    expect(mapIds('p1')).toEqual(['m1', 'm2'])
    expect(getProjects()).toBe(getProjects()) // same snapshot, same array
  })

  it('holds projects, maps and object cards only: notes are on the server', () => {
    expect([...new Set(getObjects().map((o) => o.kind))].sort()).toEqual(['map', 'object', 'project'])
    for (const o of getObjects()) {
      expect(o).not.toHaveProperty('locked')
      expect(o).not.toHaveProperty('draggable')
      expect(o).not.toHaveProperty('likes')
      expect(o).not.toHaveProperty('text')
    }
  })

  it('creates projects, maps (as last child) and object cards', () => {
    const p = createProject('New')
    expect(getProjects().at(-1)).toMatchObject({ id: p, name: 'New', maps: [] })
    const m = createMap('p1', 'Third')!
    expect(mapIds('p1')).toEqual(['m1', 'm2', m])
    expect(order().indexOf(m)).toBe(order().indexOf('m2') + 1)
    expect(createMap('nope', 'x')).toBeUndefined()
    const card = createObjectOf('object', null, 'Lantern')!
    expect(findObject(card)).toMatchObject({ kind: 'object', parentId: null, name: 'Lantern' })
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
    moveObject('o2', { parentId: 'p3', beforeId: 'm5' })
    expect(mapIds('p3')).toEqual(['o2', 'm5', 'm1'])
    moveObject('m1', { parentId: null })
    expect(findObject('m1')?.parentId).toBeNull()
    expect(order().at(-1)).toBe('m1')
    // a project moves with its children
    moveObject('p3', { parentId: null, beforeId: 'p1' })
    expect(order().slice(0, 3)).toEqual(['p3', 'o2', 'm5'])
  })

  it('refuses a move into its own subtree', () => {
    const before = getObjects()
    moveObject('p1', { parentId: 'm1' })
    expect(getObjects()).toBe(before)
  })

  it('pins in pin order and unpins', () => {
    togglePin('m3')
    togglePin('o2')
    expect(getPins()).toEqual(['m3', 'o2'])
    togglePin('m3')
    expect(getPins()).toEqual(['o2'])
  })

  it('reorders pins (pinning when needed)', () => {
    togglePin('m3')
    togglePin('o2')
    reorderPinned('p1', 'o2')
    expect(getPins()).toEqual(['m3', 'p1', 'o2'])
    reorderPinned('m3', null)
    expect(getPins()).toEqual(['p1', 'o2', 'm3'])
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
    archiveObject('o2')
    emptyTrash()
    expect(getObjects().some((o) => ['p2', 'm3', 'm4', 'o1', 'o2'].includes(o.id))).toBe(false)
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

  it('links nothing while notes are on the server: the link code is dormant', () => {
    expect(canLink('5', 'm1')).toBe(false)
    expect(canLink('o2', 'm1')).toBe(false)
  })

  it('places objects only where they may go', () => {
    expect(canPlace('object', 'project')).toBe(true)
    expect(canPlace('map', null)).toBe(true)
    expect(canPlace('project', 'project')).toBe(false)
    expect(canPlace('map', 'map')).toBe(false)
    expect(canPlace('object', 'object')).toBe(false)
    expect(createObjectOf('map', 'o1', 'Nope')).toBeUndefined()
    moveObject('m1', { parentId: 'o1' })
    expect(findObject('m1')?.parentId).toBe('p1')
  })

  it('creates any kind first among its siblings when asked, made now', () => {
    const before = Date.now()
    const id = createObjectOf('object', 'p2', 'Map board', { first: true, description: 'At the trailhead' })!
    const children = getObjects().filter((o) => o.parentId === 'p2').map((o) => o.id)
    expect(children[0]).toBe(id)
    expect(findObject(id)).toMatchObject({ kind: 'object', description: 'At the trailhead', archived: false })
    expect(findObject(id)!.createdAt).toBeGreaterThanOrEqual(before)
    const top = createObjectOf('object', null, 'Drafts', { first: true })!
    expect(getObjects().filter((o) => o.parentId === null && o.kind !== 'project')[0].id).toBe(top)
  })

  it('puts a parent children in a given order', () => {
    reorderChildren('p2', ['o1', 'm3', 'm4', 'nope'])
    expect(getObjects().filter((o) => o.parentId === 'p2').map((o) => o.id)).toEqual(['o1', 'm3', 'm4'])
  })

  it('hides what is under an archived project', () => {
    archiveObject('p2')
    expect(findObject('o1')).toBeUndefined()
    restoreObject('p2')
    expect(findObject('o1')?.parentId).toBe('p2')
  })
})

describe('branches and copies of a map', () => {
  it('a branch is a copy next to the map, with its board, and both are marked', async () => {
    const { changeObjects, getBoard } = await import('../features/board/boardStore')
    changeObjects('m1', { add: [{ kind: 'point', name: 'A', links: [], anchor: { x: 1, y: 1 }, label: 'other', icon: 'pin', color: '#dc2626' }] })
    const id = createBranch('m1', 'Try 2')!
    expect(id).toBeTruthy()
    expect(mapIds('p1').slice(0, 2)).toEqual(['m1', id])
    expect(findObject(id)).toMatchObject({ name: 'Try 2', branchOf: 'm1' })
    expect(findObject('m1')?.branchOf).toBe('m1')
    expect(getBoard(id).objects).toHaveLength(1)
    changeObjects(id, { remove: [getBoard(id).objects[0].id] })
    expect(getBoard('m1').objects).toHaveLength(1)
  })
  it('a branch of a branch joins the same group; only maps branch', () => {
    const b = createBranch('m1', 'B')!
    const c = createBranch(b, 'C')!
    expect(findObject(c)?.branchOf).toBe('m1')
    expect(createBranch('p1', 'x')).toBeUndefined()
  })
  it('duplicating a map copies its board; deleting it forgets the board', async () => {
    const { changeObjects, getBoard } = await import('../features/board/boardStore')
    changeObjects('m1', { add: [{ kind: 'point', name: 'A', links: [], anchor: { x: 1, y: 1 }, label: 'other', icon: 'pin', color: '#dc2626' }] })
    duplicateObject('m1')
    const copy = getObjects().find((o) => o.name === `${findObject('m1')!.name} (copy)`)!
    expect(getBoard(copy.id).objects).toHaveLength(1)
    deleteObject(copy.id)
    expect(getBoard(copy.id).objects).toHaveLength(0)
  })
})
