// MOCK DATA tests: deleted together with projectsStore.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { findMap, findObject } from './projects'
import {
  archiveObject,
  canLink,
  createBranch,
  createObjectOf,
  deleteObject,
  duplicateObject,
  emptyTrash,
  getArchived,
  getObjects,
  getPins,
  moveObject,
  renameObject,
  reorderObjects,
  reorderPinned,
  resetMockProjects,
  restoreObject,
  togglePin,
} from './projectsStore'

const order = () => getObjects().map((o) => o.id)

import { resetBoards } from '../features/board/boardStore'

beforeEach(() => {
  resetMockProjects()
  resetBoards()
})

describe('projectsStore', () => {
  it('holds maps and object cards only: projects and notes are on the server', () => {
    expect([...new Set(getObjects().map((o) => o.kind))].sort()).toEqual(['map', 'object'])
    for (const o of getObjects()) {
      expect(o).not.toHaveProperty('parentId')
      expect(o).not.toHaveProperty('locked')
      expect(o).not.toHaveProperty('likes')
    }
  })

  it('creates maps and object cards, last by default', () => {
    const m = createObjectOf('map', 'Third')
    expect(order().at(-1)).toBe(m)
    expect(findMap(m)).toMatchObject({ kind: 'map', name: 'Third' })
    const card = createObjectOf('object', 'Lantern')
    expect(findObject(card)).toMatchObject({ kind: 'object', name: 'Lantern' })
    expect(order().at(-1)).toBe(card)
  })

  it('creates first when asked, made now', () => {
    const before = Date.now()
    const id = createObjectOf('object', 'Map board', { first: true, description: 'At the trailhead' })
    expect(order()[0]).toBe(id)
    expect(findObject(id)).toMatchObject({ kind: 'object', description: 'At the trailhead', archived: false })
    expect(findObject(id)!.createdAt).toBeGreaterThanOrEqual(before)
  })

  it('renames', () => {
    renameObject('m3', 'North')
    expect(findMap('m3')?.name).toBe('North')
  })

  it('duplicates an object after the original, with a new id', () => {
    duplicateObject('m1')
    expect(getObjects().slice(0, 3).map((o) => o.name)).toEqual(['Parks overview', 'Parks overview (copy)', 'Playgrounds'])
    expect(new Set(order()).size).toBe(order().length)
  })

  it('moves before another object, or to the end', () => {
    moveObject('o2', { beforeId: 'm1' })
    expect(order().slice(0, 2)).toEqual(['o2', 'm1'])
    moveObject('o2', { beforeId: null })
    expect(order().at(-1)).toBe('o2')
    const before = getObjects()
    moveObject('m1', { beforeId: 'm1' })
    expect(getObjects()).toBe(before)
  })

  it('puts some objects in a given order, in the places they hold', () => {
    reorderObjects(['m3', 'o1', 'm1', 'nope'])
    expect(order()).toEqual(['m3', 'm2', 'o1', 'm4', 'm5', 'm1', 'o2'])
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
    reorderPinned('m1', 'o2')
    expect(getPins()).toEqual(['m3', 'm1', 'o2'])
    reorderPinned('m3', null)
    expect(getPins()).toEqual(['m1', 'o2', 'm3'])
  })

  it('archives (hiding it) and restores', () => {
    archiveObject('m1')
    expect(findObject('m1')).toBeUndefined()
    expect(getArchived().map((o) => o.id)).toEqual(['m1'])
    restoreObject('m1')
    expect(findMap('m1')).toBeDefined()
    expect(getArchived()).toEqual([])
  })

  it('empties the trash for good', () => {
    archiveObject('m3')
    archiveObject('o2')
    emptyTrash()
    expect(getObjects().some((o) => ['m3', 'o2'].includes(o.id))).toBe(false)
    expect(getArchived()).toEqual([])
  })

  it('deletes with its pin', () => {
    togglePin('m1')
    deleteObject('m1')
    expect(findObject('m1')).toBeUndefined()
    expect(getPins()).toEqual([])
  })

  it('leaves the snapshot unchanged for unknown ids', () => {
    const before = getObjects()
    renameObject('nope', 'x')
    duplicateObject('nope')
    moveObject('nope', {})
    deleteObject('nope')
    expect(getObjects()).toBe(before)
  })

  it('links nothing while notes are on the server: the link code is dormant', () => {
    expect(canLink('5', 'm1')).toBe(false)
    expect(canLink('o2', 'm1')).toBe(false)
  })
})

describe('branches and copies of a map', () => {
  it('a branch is a copy next to the map, with its board, and both are marked', async () => {
    const { changeObjects, getBoard } = await import('../features/board/boardStore')
    changeObjects('m1', { add: [{ kind: 'point', name: 'A', links: [], anchor: { x: 1, y: 1 }, label: 'other', icon: 'pin', color: '#dc2626' }] })
    const id = createBranch('m1', 'Try 2')!
    expect(id).toBeTruthy()
    expect(order().slice(0, 2)).toEqual(['m1', id])
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
    expect(createBranch('o1', 'x')).toBeUndefined()
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
