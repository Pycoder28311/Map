// MOCK DATA tests: deleted together with projectsStore.ts
import { beforeEach, describe, expect, it } from 'vitest'
import { canPlace, findMap, findObject } from './projects'
import {
  archiveObject,
  canLink,
  linkNote,
  linksOf,
  unlinkNote,
  createMap,
  createBranch,
  createArticle,
  createObjectOf,
  reorderChildren,
  toggleLike,
  updateNote,
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

  it('links notes to projects and maps only, once', () => {
    linkNote('n1', 'm1')
    linkNote('n1', 'p2')
    linkNote('n1', 'm1') // again: nothing
    linkNote('n1', 'n2') // note to note: not allowed
    linkNote('m1', 'p2') // only notes are linked
    expect(linksOf('n1').map((o) => o.id)).toEqual(['m1', 'p2'])
    expect(linksOf('m1').map((o) => o.id)).toEqual(['n1'])
    expect(canLink('n1', 'm1')).toBe(false)
    unlinkNote('n1', 'p2')
    expect(linksOf('n1').map((o) => o.id)).toEqual(['m1'])
  })

  it('creates notes and articles at the top level, with their text', () => {
    const note = createNote('Quick', 'Some text')
    const article = createArticle('Essay', 'Long text')
    expect(findObject(note)).toMatchObject({ kind: 'note', name: 'Quick', text: 'Some text', parentId: null })
    expect(findObject(article)).toMatchObject({ kind: 'article', name: 'Essay', text: 'Long text', parentId: null })
    expect(order().slice(-2)).toEqual([note, article])
  })

  it('places objects only where they may go', () => {
    expect(canPlace('article', 'folder')).toBe(true)
    expect(canPlace('note', 'folder')).toBe(false)
    expect(canPlace('folder', 'folder')).toBe(false)
    expect(canPlace('folder', 'project')).toBe(true)
    expect(canPlace('project', 'project')).toBe(false)
    expect(canPlace('note', 'map')).toBe(false)
    expect(createObjectOf('note', 'f1', 'Nope')).toBeUndefined()
    moveObject('n1', { parentId: 'f1' })
    expect(findObject('n1')?.parentId).toBeNull()
    moveObject('a6', { parentId: 'f1' })
    expect(findObject('a6')?.parentId).toBe('f1')
  })

  it('creates any kind first among its siblings when asked, made now with no likes', () => {
    const id = createObjectOf('object', 'p2', 'Map board', { first: true, description: 'At the trailhead' })!
    const children = getObjects().filter((o) => o.parentId === 'p2').map((o) => o.id)
    expect(children[0]).toBe(id)
    expect(findObject(id)).toMatchObject({ kind: 'object', likes: 0, description: 'At the trailhead', locked: true })
    const folder = createObjectOf('folder', null, 'Drafts', { first: true })!
    expect(getObjects().filter((o) => o.parentId === null && o.kind !== 'project')[0].id).toBe(folder)
    expect(findObject(folder)?.locked).toBe(false)
  })

  it('puts a parent children in a given order', () => {
    reorderChildren('p2', ['f1', 'm3', 'o1', 'm4', 'n1'])
    expect(getObjects().filter((o) => o.parentId === 'p2').map((o) => o.id)).toEqual(['f1', 'm3', 'o1', 'm4'])
    // A folder keeps its articles under it
    expect(getObjects().filter((o) => o.parentId === 'f1')).toHaveLength(5)
  })

  it('links notes to folders, and unlinks them', () => {
    expect(canLink('n1', 'f1')).toBe(true)
    linkNote('n1', 'f1')
    expect(linksOf('f1').map((o) => o.id)).toEqual(['n1'])
    expect(linksOf('n1').map((o) => o.id)).toContain('f1')
    expect(canLink('n1', 'f1')).toBe(false)
    unlinkNote('n1', 'f1')
    expect(linksOf('f1')).toEqual([])
  })

  it('likes and unlikes', () => {
    const before = findObject('n1')!.likes
    toggleLike('n1')
    expect(findObject('n1')).toMatchObject({ liked: true, likes: before + 1 })
    toggleLike('n1')
    expect(findObject('n1')).toMatchObject({ liked: false, likes: before })
  })

  it('hides what is under an archived project, folders included', () => {
    archiveObject('p2')
    expect(findObject('a1')).toBeUndefined()
    restoreObject('p2')
    expect(findObject('a1')?.parentId).toBe('f1')
  })

  it('links articles like notes, never to a note or an article', () => {
    const article = createArticle('Essay')
    expect(canLink(article, 'm1')).toBe(true)
    expect(canLink(article, 'n1')).toBe(false)
    expect(canLink('n1', article)).toBe(false)
    linkNote(article, 'p1')
    expect(linksOf('p1').map((o) => o.id)).toEqual([article])
  })

  it('hides links of archived objects, and drops those of deleted ones', () => {
    linkNote('n1', 'm1')
    linkNote('n2', 'm3')
    archiveObject('p1')
    expect(linksOf('n1')).toEqual([])
    restoreObject('p1')
    expect(linksOf('n1').map((o) => o.id)).toEqual(['m1'])
    deleteObject('p2')
    expect(linksOf('n2')).toEqual([])
  })
})

describe('updateNote', () => {
  beforeEach(() => resetMockProjects())

  it('merges the fields given', () => {
    updateNote('n2', { text: 'Hello', items: [{ id: 'x', text: 'a', done: false }] })
    const note = findObject('n2')!
    expect(note.text).toBe('Hello')
    expect(note.items).toHaveLength(1)
    expect(note.name).toBe('Ideas')
  })

  it('ignores an unknown id', () => {
    expect(() => updateNote('nope', { text: 'x' })).not.toThrow()
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
